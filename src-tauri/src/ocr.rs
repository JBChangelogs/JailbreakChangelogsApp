use std::path::Path;

#[cfg(target_os = "macos")]
use ort::ep;
use ort::session::Session;
use ort::value::Tensor;
use serde::Serialize;

const DET_MAX_SIDE: f32 = 960.0;
const DET_BINARY_THRESHOLD: f32 = 0.3;
const DET_BOX_THRESHOLD: f32 = 0.6;
const DET_UNCLIP_RATIO: f32 = 1.5;
const DET_MIN_SIDE: usize = 3;
const REC_HEIGHT: usize = 48;
const REC_MAX_WIDTH: usize = 1920;

const DET_MEAN: [f32; 3] = [0.485, 0.456, 0.406];
const DET_STD: [f32; 3] = [0.229, 0.224, 0.225];
const REC_MEAN: [f32; 3] = [0.5, 0.5, 0.5];
const REC_STD: [f32; 3] = [0.5, 0.5, 0.5];

const REC_WIDTH_BUCKETS: [usize; 4] = [320, 640, 1280, 1920];
const REC_BATCH: usize = 16;

#[derive(Serialize, Clone)]
pub struct Detection {
    x0: usize,
    y0: usize,
    x1: usize,
    y1: usize,
    text: String,
    conf: f32,
}

#[derive(Clone, Copy)]
struct Crop {
    x: usize,
    y: usize,
    w: usize,
    h: usize,
}

pub struct Ocr {
    det: Session,
    rec: Session,
    dict: Vec<String>,
    fixed_shapes: bool,
}

pub struct Image<'a> {
    pub rgba: &'a [u8],
    pub width: usize,
    pub height: usize,
}

const BGR: [usize; 3] = [2, 1, 0];

fn to_chw(img: &Image, crop: Crop, out_w: usize, out_h: usize, mean: [f32; 3], std: [f32; 3]) -> Vec<f32> {
    let plane = out_w * out_h;
    let mut data = vec![0f32; 3 * plane];
    let sx = crop.w as f32 / out_w as f32;
    let sy = crop.h as f32 / out_h as f32;
    let (max_x, max_y) = ((crop.x + crop.w - 1) as f32, (crop.y + crop.h - 1) as f32);
    for y in 0..out_h {
        let fy = (crop.y as f32 + (y as f32 + 0.5) * sy - 0.5).min(max_y);
        let y0 = (fy.floor() as isize).max(crop.y as isize) as usize;
        let y1 = (y0 + 1).min(crop.y + crop.h - 1);
        let wy = (fy - y0 as f32).max(0.0);
        for x in 0..out_w {
            let fx = (crop.x as f32 + (x as f32 + 0.5) * sx - 0.5).min(max_x);
            let x0 = (fx.floor() as isize).max(crop.x as isize) as usize;
            let x1 = (x0 + 1).min(crop.x + crop.w - 1);
            let wx = (fx - x0 as f32).max(0.0);
            let (i00, i01) = ((y0 * img.width + x0) * 4, (y0 * img.width + x1) * 4);
            let (i10, i11) = ((y1 * img.width + x0) * 4, (y1 * img.width + x1) * 4);
            for (c, &src) in BGR.iter().enumerate() {
                let p = |i: usize| img.rgba[i + src] as f32;
                let top = p(i00) * (1.0 - wx) + p(i01) * wx;
                let bottom = p(i10) * (1.0 - wx) + p(i11) * wx;
                let v = (top * (1.0 - wy) + bottom * wy) / 255.0;
                data[c * plane + y * out_w + x] = (v - mean[c]) / std[c];
            }
        }
    }
    data
}

fn round_to_32(n: f32) -> usize {
    (((n / 32.0).round() * 32.0) as usize).max(32)
}

fn tensor(shape: [usize; 4], data: Vec<f32>) -> ort::Result<Tensor<f32>> {
    Tensor::from_array((shape, data.into_boxed_slice()))
}

fn decode(dict: &[String], data: &[f32], steps: usize, classes: usize) -> (String, f32) {
    let mut text = String::new();
    let (mut conf_sum, mut kept, mut prev) = (0f32, 0usize, 0usize);
    for t in 0..steps {
        let row = &data[t * classes..(t + 1) * classes];
        let (best, best_p) = row.iter().enumerate().fold((0, f32::NEG_INFINITY), |acc, (c, &p)| if p > acc.1 { (c, p) } else { acc });
        if best != 0 && best != prev {
            text.push_str(dict.get(best - 1).map_or(" ", String::as_str));
            conf_sum += best_p;
            kept += 1;
        }
        prev = best;
    }
    (text.trim().to_owned(), if kept > 0 { conf_sum / kept as f32 } else { 0.0 })
}

impl Ocr {
    pub fn load(runtime: &Path, det_path: &Path, rec_path: &Path, dict_path: &Path) -> Result<Self, String> {
        let dict = std::fs::read_to_string(dict_path)
            .map_err(|e| e.to_string())?
            .lines()
            .filter(|l| !l.is_empty())
            .map(str::to_owned)
            .collect();
        let env = ort::init_from(runtime).map_err(|e| e.to_string())?.with_name("trade-scanner").build().map_err(|e| e.to_string())?;
        let mut last_error = String::from("no execution provider");
        for &provider in providers() {
            let session = |path: &Path| -> ort::Result<Session> {
                let mut builder = Session::builder(&env)?;
                if provider == "cpu" {
                    builder = builder.with_intra_threads(cpu_threads())?;
                }
                builder = match provider {
                    #[cfg(target_os = "macos")]
                    "coreml" => builder.with_execution_providers([ep::CoreML::default().build().error_on_failure()])?,
                    _ => builder,
                };
                builder.commit_from_file(path)
            };
            match session(det_path).and_then(|det| Ok((det, session(rec_path)?))) {
                Ok((det, rec)) => return Ok(Ocr { det, rec, dict, fixed_shapes: provider != "cpu" }),
                Err(e) => {
                    eprintln!("[ocr] {provider} unavailable: {e}");
                    last_error = e.to_string();
                }
            }
        }
        Err(last_error)
    }

    fn detect(&mut self, img: &Image) -> ort::Result<Vec<Crop>> {
        let (width, height) = (img.width, img.height);
        let scale = (DET_MAX_SIDE / width.max(height) as f32).min(1.0);
        let dw = round_to_32(width as f32 * scale);
        let dh = round_to_32(height as f32 * scale);
        let input = to_chw(img, Crop { x: 0, y: 0, w: width, h: height }, dw, dh, DET_MEAN, DET_STD);
        let out = self.det.run(ort::inputs![tensor([1, 3, dh, dw], input)?])?;
        let (_, prob) = out[0].try_extract_tensor::<f32>()?;

        let mut seen = vec![false; dw * dh];
        let mut boxes = Vec::new();
        let mut stack = Vec::new();
        for start in 0..prob.len().min(dw * dh) {
            if seen[start] || prob[start] <= DET_BINARY_THRESHOLD {
                continue;
            }
            let (mut min_x, mut min_y, mut max_x, mut max_y) = (dw, dh, 0, 0);
            let (mut sum, mut count) = (0f32, 0usize);
            seen[start] = true;
            stack.push(start);
            while let Some(i) = stack.pop() {
                let (x, y) = (i % dw, i / dw);
                min_x = min_x.min(x);
                max_x = max_x.max(x);
                min_y = min_y.min(y);
                max_y = max_y.max(y);
                sum += prob[i];
                count += 1;
                let neighbours = [
                    (x > 0).then(|| i - 1),
                    (x < dw - 1).then(|| i + 1),
                    (y > 0).then(|| i - dw),
                    (y < dh - 1).then(|| i + dw),
                ];
                for n in neighbours.into_iter().flatten() {
                    if !seen[n] && prob[n] > DET_BINARY_THRESHOLD {
                        seen[n] = true;
                        stack.push(n);
                    }
                }
            }
            let (bw, bh) = (max_x - min_x + 1, max_y - min_y + 1);
            if bw.min(bh) < DET_MIN_SIDE || (sum / count as f32) < DET_BOX_THRESHOLD {
                continue;
            }
            let grow = (bw * bh) as f32 * DET_UNCLIP_RATIO / (2 * (bw + bh)) as f32;
            let (fw, fh) = (width as f32 / dw as f32, height as f32 / dh as f32);
            let x0 = ((min_x as f32 - grow) * fw).floor().max(0.0) as usize;
            let y0 = ((min_y as f32 - grow) * fh).floor().max(0.0) as usize;
            let x1 = (((max_x + 1) as f32 + grow) * fw).ceil().min(width as f32) as usize;
            let y1 = (((max_y + 1) as f32 + grow) * fh).ceil().min(height as f32) as usize;
            if x1.saturating_sub(x0) >= 2 && y1.saturating_sub(y0) >= 2 {
                boxes.push(Crop { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
            }
        }
        boxes.sort_by_key(|b| (b.y, b.x));
        Ok(boxes)
    }

    fn recognize_all(&mut self, img: &Image, boxes: &[Crop]) -> ort::Result<Vec<(String, f32)>> {
        let h = REC_HEIGHT;
        let mut results = vec![(String::new(), 0f32); boxes.len()];
        let mut by_bucket: Vec<(usize, Vec<(usize, usize)>)> = Vec::new();
        for (index, b) in boxes.iter().enumerate() {
            let w = REC_MAX_WIDTH.min(((h * b.w) as f32 / b.h as f32 / 8.0).ceil() as usize * 8).max(8);
            let bucket = if self.fixed_shapes {
                *REC_WIDTH_BUCKETS.iter().find(|&&bw| bw >= w).unwrap_or(REC_WIDTH_BUCKETS.last().unwrap())
            } else {
                w
            };
            let entry = (index, w.min(bucket));
            match by_bucket.iter_mut().find(|(bw, _)| *bw == bucket) {
                Some((_, list)) => list.push(entry),
                None => by_bucket.push((bucket, vec![entry])),
            }
        }

        let batch_size = if self.fixed_shapes { REC_BATCH } else { 1 };
        for (bucket, entries) in by_bucket {
            let slot = 3 * h * bucket;
            for chunk in entries.chunks(batch_size) {
                let mut batch = vec![0f32; batch_size * slot];
                for (i, &(index, w)) in chunk.iter().enumerate() {
                    let crop = to_chw(img, boxes[index], w, h, REC_MEAN, REC_STD);
                    for row in 0..3 * h {
                        let dst = i * slot + row * bucket;
                        batch[dst..dst + w].copy_from_slice(&crop[row * w..(row + 1) * w]);
                    }
                }
                let out = self.rec.run(ort::inputs![tensor([batch_size, 3, h, bucket], batch)?])?;
                let (shape, logits) = out[0].try_extract_tensor::<f32>()?;
                let (steps, classes) = (shape[1] as usize, shape[2] as usize);
                for (i, &(index, _)) in chunk.iter().enumerate() {
                    let start = i * steps * classes;
                    results[index] = decode(&self.dict, &logits[start..start + steps * classes], steps, classes);
                }
            }
        }
        Ok(results)
    }

    pub fn scan(&mut self, img: &Image) -> ort::Result<Vec<Detection>> {
        let boxes = self.detect(img)?;
        let recognized = self.recognize_all(img, &boxes)?;
        Ok(boxes
            .iter()
            .zip(recognized)
            .filter(|(_, (text, _))| !text.is_empty())
            .map(|(b, (text, conf))| Detection { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h, text, conf })
            .collect())
    }
}

fn cpu_threads() -> usize {
    std::thread::available_parallelism().map_or(1, |n| n.get() / 2).clamp(1, 4)
}

fn providers() -> &'static [&'static str] {
    #[cfg(target_os = "macos")]
    return &["coreml", "cpu"];
    #[cfg(not(target_os = "macos"))]
    return &["cpu"];
}
