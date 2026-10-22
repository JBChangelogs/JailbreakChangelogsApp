import { createHash } from 'crypto'
import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { crc32, deflateRawSync } from 'zlib'

const VERSION = '1.31.0'
const ARCHIVES = {
  'win32-x64': ['win-x64', 'zip', '3958d8a44984160692c1b4ffd0de3cb48f8c39f9d34bb31e433db06e30b82195', 'onnxruntime.dll', 'onnxruntime.dll'],
  'win32-arm64': ['win-arm64', 'zip', 'ef6206fa8d6975878d93a97035d280240ce5764c126a7430e5427e18923316d5', 'onnxruntime.dll', 'onnxruntime.dll'],
  'darwin-arm64': ['osx-arm64', 'tgz', '1031b36dd3bdaa8d976a6130d9cf2a05e9be320b93ae804f8427b91dc3432afc', `libonnxruntime.${VERSION}.dylib`, 'libonnxruntime.dylib'],
  'linux-x64': ['linux-x64', 'tgz', 'cc5c72baf5ae5c8238a6841f0897227be2d02826b9cf98eaf02fdefaeeb03a57', `libonnxruntime.so.${VERSION}`, 'libonnxruntime.so'],
  'linux-arm64': ['linux-aarch64', 'tgz', 'c5b8b3cca31f3d643a3b313b8f42e2d0f16a4fcefd02cda343d97bd5306afaab', `libonnxruntime.so.${VERSION}`, 'libonnxruntime.so']
}
const BASE_URL = 'https://updates.jailbreakchangelogs.com/ocr'

const root = join(import.meta.dirname, '..')
const key = process.argv[2] ?? `${process.platform}-${process.platform === 'darwin' ? 'arm64' : process.arch}`
const entry = ARCHIVES[key]
if (!entry) {
  console.error(`No ONNX Runtime build for ${key}. Known: ${Object.keys(ARCHIVES).join(', ')}`)
  process.exit(1)
}
const [name, ext, sha256, libFile, outFile] = entry
const sha = (buf) => createHash('sha256').update(buf).digest('hex')

const outDir = join(root, 'src-tauri', 'ocr-pack')
const manifestPath = join(root, 'src-tauri', 'ocr-pack.json')
const stampPath = join(outDir, '.source')
const models = ['det.onnx', 'rec.onnx', 'dict.txt', 'NOTICE.md'].map((f) => [f, readFileSync(join(root, 'resources', 'ocr', f))])
const source = `${key} ${sha256} ${sha(Buffer.concat(models.map(([, b]) => b)))}`

if (existsSync(manifestPath) && existsSync(stampPath) && readFileSync(stampPath, 'utf8') === source) {
  const { sha256: packSha } = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (existsSync(join(outDir, `${packSha}.zip`))) process.exit(0)
}

const url = `https://github.com/microsoft/onnxruntime/releases/download/v${VERSION}/onnxruntime-${name}-${VERSION}.${ext}`
console.log(`Downloading ${url}`)
const res = await fetch(url)
if (!res.ok) throw new Error(`Download failed: ${res.status}`)
const archive = Buffer.from(await res.arrayBuffer())
if (sha(archive) !== sha256) throw new Error(`Checksum mismatch for ${url}`)

const work = mkdtempSync(join(tmpdir(), 'onnxruntime-'))
let files
try {
  writeFileSync(join(work, `ort.${ext}`), archive)
  const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar'
  execFileSync(tar, ['-xf', `ort.${ext}`], { cwd: work, stdio: 'inherit' })
  const dir = join(work, `onnxruntime-${name}-${VERSION}`)
  files = [
    [outFile, readFileSync(join(dir, 'lib', libFile))],
    ['ONNXRUNTIME-LICENSE.txt', readFileSync(join(dir, 'LICENSE'))],
    ...models
  ]
} finally {
  rmSync(work, { recursive: true, force: true })
}

function zip(entries) {
  const local = []
  const central = []
  let offset = 0
  for (const [fileName, data] of entries) {
    const nameBuf = Buffer.from(fileName)
    const compressed = deflateRawSync(data, { level: 9 })
    const crc = crc32(data)
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(8, 8)
    header.writeUInt32LE(crc, 14)
    header.writeUInt32LE(compressed.length, 18)
    header.writeUInt32LE(data.length, 22)
    header.writeUInt16LE(nameBuf.length, 26)
    local.push(header, nameBuf, compressed)
    const dirEntry = Buffer.alloc(46)
    dirEntry.writeUInt32LE(0x02014b50, 0)
    dirEntry.writeUInt16LE(20, 4)
    dirEntry.writeUInt16LE(20, 6)
    dirEntry.writeUInt16LE(8, 10)
    dirEntry.writeUInt32LE(crc, 16)
    dirEntry.writeUInt32LE(compressed.length, 20)
    dirEntry.writeUInt32LE(data.length, 24)
    dirEntry.writeUInt16LE(nameBuf.length, 28)
    dirEntry.writeUInt32LE(offset, 42)
    central.push(dirEntry, nameBuf)
    offset += header.length + nameBuf.length + compressed.length
  }
  const centralBuf = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, centralBuf, end])
}

const pack = zip(files)
const packSha = sha(pack)
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, `${packSha}.zip`), pack)
writeFileSync(stampPath, source)
writeFileSync(
  manifestPath,
  JSON.stringify({ url: `${BASE_URL}/${packSha}.zip`, sha256: packSha, size: pack.length, library: outFile }, null, 2)
)
console.log(`OCR pack ${key}: ${(pack.length / 1048576).toFixed(1)} MB -> ${packSha}.zip`)
