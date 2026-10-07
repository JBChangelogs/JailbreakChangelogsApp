// Runs in an Electron utilityProcess so OCR never blocks the main process.
// PP-OCR (det + rec) on onnxruntime-node. Input is a BGRA bitmap from nativeImage.
import { readFileSync } from 'fs'
import type { InferenceSession as Session, Tensor as TensorType } from 'onnxruntime-node'
import type { OcrDetection } from '../shared/tradeScan'

// PP-OCR defaults; retune alongside SCAN_TUNING.
const OCR_TUNING = {
  detMaxSide: 960,
  detBinaryThreshold: 0.3,
  detBoxThreshold: 0.6,
  detUnclipRatio: 1.5,
  detMinSide: 3,
  recHeight: 48,
  recMaxWidth: 1920
}

const DET_MEAN = [0.485, 0.456, 0.406]
const DET_STD = [0.229, 0.224, 0.225]
const REC_MEAN = [0.5, 0.5, 0.5]
const REC_STD = [0.5, 0.5, 0.5]

export type WorkerRequest =
  | { type: 'init'; detPath: string; recPath: string; dictPath: string; providers: string[] }
  | { type: 'scan'; id: number; width: number; height: number; pixels: Uint8Array }

export type WorkerResponse =
  | { type: 'ready'; provider: string }
  | { type: 'init-error'; message: string }
  | { type: 'result'; id: number; detections: OcrDetection[]; ms: Record<string, number> }
  | { type: 'scan-error'; id: number; message: string }

let ort: typeof import('onnxruntime-node')
let det: Session
let rec: Session
let dict: string[] = []

const port = process.parentPort
const reply = (message: WorkerResponse): void => port.postMessage(message)

interface Crop {
  x: number
  y: number
  w: number
  h: number
}

// Bilinear-resample a BGRA crop into a normalised CHW float tensor, channels in B,G,R order (as PP-OCR expects).
function toTensor(
  pixels: Uint8Array,
  srcW: number,
  crop: Crop,
  outW: number,
  outH: number,
  mean: number[],
  std: number[]
): TensorType {
  const data = new Float32Array(3 * outW * outH)
  const plane = outW * outH
  const sx = crop.w / outW
  const sy = crop.h / outH
  for (let y = 0; y < outH; y++) {
    const fy = Math.min(crop.y + (y + 0.5) * sy - 0.5, crop.y + crop.h - 1)
    const y0 = Math.max(Math.floor(fy), crop.y)
    const y1 = Math.min(y0 + 1, crop.y + crop.h - 1)
    const wy = Math.max(fy - y0, 0)
    for (let x = 0; x < outW; x++) {
      const fx = Math.min(crop.x + (x + 0.5) * sx - 0.5, crop.x + crop.w - 1)
      const x0 = Math.max(Math.floor(fx), crop.x)
      const x1 = Math.min(x0 + 1, crop.x + crop.w - 1)
      const wx = Math.max(fx - x0, 0)
      const i00 = (y0 * srcW + x0) * 4
      const i01 = (y0 * srcW + x1) * 4
      const i10 = (y1 * srcW + x0) * 4
      const i11 = (y1 * srcW + x1) * 4
      for (let c = 0; c < 3; c++) {
        const top = pixels[i00 + c] * (1 - wx) + pixels[i01 + c] * wx
        const bottom = pixels[i10 + c] * (1 - wx) + pixels[i11 + c] * wx
        const v = (top * (1 - wy) + bottom * wy) / 255
        data[c * plane + y * outW + x] = (v - mean[c]) / std[c]
      }
    }
  }
  return new ort.Tensor('float32', data, [1, 3, outH, outW])
}

const roundTo32 = (n: number): number => Math.max(32, Math.round(n / 32) * 32)

// DB post-processing with axis-aligned boxes (trade screenshots are horizontal text).
// ponytail: connected components + bbox instead of contour polygons; fine for straight UI text.
async function detect(pixels: Uint8Array, width: number, height: number): Promise<Crop[]> {
  const scale = Math.min(1, OCR_TUNING.detMaxSide / Math.max(width, height))
  const dw = roundTo32(width * scale)
  const dh = roundTo32(height * scale)
  let t = performance.now()
  const input = toTensor(pixels, width, { x: 0, y: 0, w: width, h: height }, dw, dh, DET_MEAN, DET_STD)
  timings.detPrep = performance.now() - t
  t = performance.now()
  const out = await det.run({ [det.inputNames[0]]: input })
  const prob = out[det.outputNames[0]].data as Float32Array
  timings.detRun = performance.now() - t
  t = performance.now()

  const seen = new Uint8Array(dw * dh)
  const boxes: Crop[] = []
  const stack: number[] = []
  for (let start = 0; start < prob.length; start++) {
    if (seen[start] || prob[start] <= OCR_TUNING.detBinaryThreshold) continue
    let minX = dw
    let minY = dh
    let maxX = 0
    let maxY = 0
    let sum = 0
    let count = 0
    seen[start] = 1
    stack.push(start)
    while (stack.length) {
      const i = stack.pop()!
      const x = i % dw
      const y = (i - x) / dw
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
      sum += prob[i]
      count++
      for (const n of [x > 0 ? i - 1 : -1, x < dw - 1 ? i + 1 : -1, y > 0 ? i - dw : -1, y < dh - 1 ? i + dw : -1]) {
        if (n >= 0 && !seen[n] && prob[n] > OCR_TUNING.detBinaryThreshold) {
          seen[n] = 1
          stack.push(n)
        }
      }
    }
    const bw = maxX - minX + 1
    const bh = maxY - minY + 1
    if (Math.min(bw, bh) < OCR_TUNING.detMinSide || sum / count < OCR_TUNING.detBoxThreshold) continue
    // Unclip: DB predicts shrunk text regions; grow by area * ratio / perimeter.
    const grow = (bw * bh * OCR_TUNING.detUnclipRatio) / (2 * (bw + bh))
    const x0 = Math.max(0, Math.floor(((minX - grow) * width) / dw))
    const y0 = Math.max(0, Math.floor(((minY - grow) * height) / dh))
    const x1 = Math.min(width, Math.ceil(((maxX + 1 + grow) * width) / dw))
    const y1 = Math.min(height, Math.ceil(((maxY + 1 + grow) * height) / dh))
    if (x1 - x0 >= 2 && y1 - y0 >= 2) boxes.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 })
  }
  timings.boxes = performance.now() - t
  return boxes.sort((a, b) => a.y - b.y || a.x - b.x)
}

let timings: Record<string, number> = {}

// On GPU providers, recognition runs in fixed-size batches at a few fixed widths: they re-prepare for every
// new input shape, so reusing shapes is what keeps them fast. On CPU there's no such cost and padding is
// wasted work, so each box runs alone at its exact width. Padding is 0 in normalised space, as PaddleOCR does.
const REC_WIDTH_BUCKETS = [320, 640, 1280, 1920]
const REC_BATCH = 16
let fixedShapes = false

function decode(data: Float32Array, offset: number, steps: number, classes: number): { text: string; conf: number } {
  // CTC greedy decode. Class 0 is blank, 1..dict.length are dict chars, the last class is a space.
  let text = ''
  let confSum = 0
  let kept = 0
  let prev = 0
  for (let t = 0; t < steps; t++) {
    let best = 0
    let bestP = -Infinity
    const row = offset + t * classes
    for (let c = 0; c < classes; c++) {
      if (data[row + c] > bestP) {
        bestP = data[row + c]
        best = c
      }
    }
    if (best !== 0 && best !== prev) {
      text += best <= dict.length ? dict[best - 1] : ' '
      confSum += bestP
      kept++
    }
    prev = best
  }
  return { text: text.trim(), conf: kept ? confSum / kept : 0 }
}

async function recognizeAll(pixels: Uint8Array, width: number, boxes: Crop[]): Promise<{ text: string; conf: number }[]> {
  const h = OCR_TUNING.recHeight
  const results: { text: string; conf: number }[] = new Array(boxes.length)
  const byBucket = new Map<number, { index: number; w: number }[]>()
  boxes.forEach((box, index) => {
    const w = Math.min(OCR_TUNING.recMaxWidth, Math.max(8, Math.ceil((h * box.w) / box.h / 8) * 8))
    const bucket = fixedShapes
      ? (REC_WIDTH_BUCKETS.find((b) => b >= w) ?? REC_WIDTH_BUCKETS[REC_WIDTH_BUCKETS.length - 1])
      : w
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), { index, w: Math.min(w, bucket) }])
  })

  const batchSize = fixedShapes ? REC_BATCH : 1
  for (const [bucket, entries] of byBucket) {
    const slot = 3 * h * bucket
    for (let start = 0; start < entries.length; start += batchSize) {
      const chunk = entries.slice(start, start + batchSize)
      const batch = new Float32Array(batchSize * slot)
      chunk.forEach(({ index, w }, i) => {
        const crop = toTensor(pixels, width, boxes[index], w, h, REC_MEAN, REC_STD).data as Float32Array
        // Copy each w-wide row into the bucket-wide slot, leaving the right side padded.
        for (let c = 0; c < 3; c++) {
          for (let y = 0; y < h; y++) {
            batch.set(crop.subarray((c * h + y) * w, (c * h + y + 1) * w), i * slot + (c * h + y) * bucket)
          }
        }
      })
      const out = await rec.run({ [rec.inputNames[0]]: new ort.Tensor('float32', batch, [batchSize, 3, h, bucket]) })
      const logits = out[rec.outputNames[0]]
      const [, steps, classes] = logits.dims as number[]
      chunk.forEach(({ index }, i) => {
        results[index] = decode(logits.data as Float32Array, i * steps * classes, steps, classes)
      })
    }
  }
  return results
}

async function createSessions(detPath: string, recPath: string, providers: string[]): Promise<string> {
  for (const provider of providers) {
    const options: Session.SessionOptions = {
      executionProviders: provider === 'cpu' ? ['cpu'] : [provider, 'cpu'],
      // DirectML requires these.
      ...(provider === 'dml' ? { enableMemPattern: false, executionMode: 'sequential' as const } : {})
    }
    try {
      det = await ort.InferenceSession.create(detPath, options)
      rec = await ort.InferenceSession.create(recPath, options)
      fixedShapes = provider !== 'cpu'
      return provider
    } catch (err) {
      console.warn(`[ocr] ${provider} unavailable:`, err)
    }
  }
  throw new Error('No execution provider could load the OCR models')
}

port.on('message', async ({ data }: { data: WorkerRequest }) => {
  if (data.type === 'init') {
    try {
      ort = await import('onnxruntime-node')
      dict = readFileSync(data.dictPath, 'utf8').split(/\r?\n/).filter((line) => line.length > 0)
      reply({ type: 'ready', provider: await createSessions(data.detPath, data.recPath, data.providers) })
    } catch (err) {
      reply({ type: 'init-error', message: err instanceof Error ? err.message : String(err) })
    }
    return
  }

  try {
    timings = {}
    const started = performance.now()
    const boxes = await detect(data.pixels, data.width, data.height)
    const recStart = performance.now()
    const recognized = await recognizeAll(data.pixels, data.width, boxes)
    const detections: OcrDetection[] = []
    boxes.forEach((box, i) => {
      const { text, conf } = recognized[i]
      if (text) detections.push({ x0: box.x, y0: box.y, x1: box.x + box.w, y1: box.y + box.h, text, conf })
    })
    timings.rec = performance.now() - recStart
    timings.total = performance.now() - started
    reply({ type: 'result', id: data.id, detections, ms: timings })
  } catch (err) {
    reply({ type: 'scan-error', id: data.id, message: err instanceof Error ? err.message : String(err) })
  }
})
