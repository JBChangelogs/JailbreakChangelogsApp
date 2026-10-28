import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createPublicKey, verify } from 'crypto'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { publicKeyMatches, signLegacy } from './minisign-legacy.mjs'

try {
  process.loadEnvFile(join(import.meta.dirname, '.env'))
} catch {
}

for (const name of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']) {
  if (!process.env[name]) {
    console.error(`Missing required env var ${name}.`)
    process.exit(1)
  }
}

const root = join(import.meta.dirname, '..')
const dir = join(root, process.argv[2] ?? 'dist-tauri')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const BASE = 'https://updates.jailbreakchangelogs.com'

const ARTIFACTS = [
  { file: 'JBCLSetup.exe', platforms: ['windows-x86_64'], legacySignature: true, download: 'JBCLSetup.exe', type: 'application/octet-stream' },
  { file: 'JBCLSetup.AppImage', platforms: ['linux-x86_64'], legacySignature: true, download: 'JBCLSetup.AppImage', type: 'application/octet-stream' },
  { file: 'JBCLSetup.deb', platforms: ['linux-x86_64-deb'], download: 'JBCLSetup.deb', type: 'application/vnd.debian.binary-package' },
  { file: 'JBCLSetup.rpm', platforms: ['linux-x86_64-rpm'], download: 'JBCLSetup.rpm', type: 'application/x-rpm' },
  { file: 'JBCLSetup.app.tar.gz', platforms: ['darwin-aarch64', 'darwin-x86_64'], type: 'application/gzip' },
  { file: 'JBCLSetup.dmg', platforms: [], download: 'JBCLSetup.dmg', type: 'application/x-apple-diskimage' }
]

const keyEnv = process.env.TAURI_SIGNING_PRIVATE_KEY ?? ''
const signingKey = keyEnv && existsSync(keyEnv) ? readFileSync(keyEnv, 'utf8') : keyEnv
const signingPassword = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? ''
const { pubkey } = JSON.parse(readFileSync(join(root, 'src-tauri', 'tauri.conf.json'), 'utf8')).plugins.updater
if (!signingKey || !publicKeyMatches(signingKey, signingPassword, pubkey)) {
  console.error('TAURI_SIGNING_PRIVATE_KEY is missing or does not match the updater public key in tauri.conf.json.')
  process.exit(1)
}

function legacySignature(body, fileName) {
  const signature = signLegacy(body, signingKey, signingPassword, fileName, version)
  const sigLine = Buffer.from(signature, 'base64').toString().split('\n')[1]
  const keyLine = Buffer.from(pubkey, 'base64').toString().split('\n')[1]
  const key = createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(keyLine, 'base64').subarray(10)]),
    format: 'der',
    type: 'spki'
  })
  if (!verify(null, body, key, Buffer.from(sigLine, 'base64').subarray(10))) {
    throw new Error(`legacy signature for ${fileName} did not verify`)
  }
  return signature
}

const present = ARTIFACTS.filter((a) => existsSync(join(dir, a.file)))
if (present.length === 0) {
  console.error(`No release files found in ${dir}.`)
  process.exit(1)
}
for (const a of present) {
  if (a.platforms.length && !existsSync(join(dir, `${a.file}.sig`))) {
    console.error(`${a.file} has no .sig; refusing to publish an unsigned update.`)
    process.exit(1)
  }
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
})

async function put(key, body, type, cacheControl) {
  console.log(`Uploading ${key} (${(body.length / 1024 / 1024).toFixed(1)} MB)...`)
  await client.send(
    new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, Body: body, ContentType: type, CacheControl: cacheControl })
  )
}

const ocrDir = join(dir, 'ocr')
for (const file of existsSync(ocrDir) ? readdirSync(ocrDir).filter((f) => /^[0-9a-f]{64}\.zip$/.test(f)) : []) {
  await put(`ocr/${file}`, readFileSync(join(ocrDir, file)), 'application/zip', 'public, max-age=31536000, immutable')
}

const platforms = {}
for (const a of present) {
  const body = readFileSync(join(dir, a.file))
  const key = `tauri/${version}/${a.file}`
  await put(key, body, a.type, 'public, max-age=31536000, immutable')
  if (a.platforms.length) {
    const signature = a.legacySignature
      ? legacySignature(body, a.file)
      : readFileSync(join(dir, `${a.file}.sig`), 'utf8').trim()
    for (const p of a.platforms) platforms[p] = { url: `${BASE}/${key}`, signature }
  }
}

const notesPath = [join(root, 'update-notes.md'), join(root, 'release-notes.md')].find((p) => existsSync(p))
const manifest = {
  version,
  notes: notesPath ? readFileSync(notesPath, 'utf8') : '',
  pub_date: new Date().toISOString(),
  platforms
}

for (const a of present) {
  if (a.download) await put(a.download, readFileSync(join(dir, a.file)), a.type, 'no-cache')
}
if (present.some((a) => a.file === 'JBCLSetup.dmg')) {
  await put('latest-mac.json', Buffer.from(JSON.stringify({ version, url: `${BASE}/JBCLSetup.dmg` })), 'application/json', 'no-cache')
}
await put('tauri/latest.json', Buffer.from(JSON.stringify(manifest, null, 2)), 'application/json', 'no-cache')

console.log(`Done. Published ${version} for: ${Object.keys(platforms).join(', ')}`)
