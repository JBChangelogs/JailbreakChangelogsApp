import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { readFile, readdir } from 'fs/promises'
import { join, extname } from 'path'

try {
  process.loadEnvFile(join(import.meta.dirname, '.env'))
} catch {
}

const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing required env var ${name}. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (from the R2 API token you created).`)
    process.exit(1)
  }
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
})

const contentTypes = {
  '.yml': 'text/yaml',
  '.json': 'application/json',
  '.exe': 'application/octet-stream',
  '.blockmap': 'application/octet-stream',
  '.nupkg': 'application/octet-stream',
  '.AppImage': 'application/octet-stream',
  '.dmg': 'application/x-apple-diskimage',
  '.ico': 'image/vnd.microsoft.icon',
  '': 'text/plain'
}

function contentTypeFor(filename) {
  return contentTypes[extname(filename)] ?? 'application/octet-stream'
}

const distDir = join(import.meta.dirname, '..', 'dist')
const RELEASE_FILE_PATTERN =
  /^latest.*\.yml$|^releases\..*\.json$|^assets\..*\.json$|-Setup\.exe$|\.exe\.blockmap$|\.nupkg$|\.AppImage$|\.AppImage\.blockmap$|\.dmg$|^RELEASES$/

function uploadKeyFor(localName) {
  return localName.endsWith('-Setup.exe') ? 'JBCLSetup.exe' : localName
}

async function findReleaseFiles(dir) {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.endsWith('-unpacked') || entry.name === 'mac') continue
      found.push(...(await findReleaseFiles(full)))
    } else if (RELEASE_FILE_PATTERN.test(entry.name)) {
      found.push(full)
    }
  }
  return found
}

const { version } = JSON.parse(await readFile(join(import.meta.dirname, '..', 'package.json'), 'utf8'))

const foundFiles = await findReleaseFiles(distDir)
const toUpload = foundFiles.filter((path) => {
  const name = path.split(/[\\/]/).pop()
  if (!name.endsWith('.nupkg')) return true
  return name.endsWith(`-${version}-full.nupkg`)
})

const skipped = foundFiles.filter((p) => !toUpload.includes(p))
if (skipped.length > 0) {
  console.log(`Skipping (not the current version's full package): ${skipped.map((p) => p.split(/[\\/]/).pop()).join(', ')}`)
}

if (toUpload.length === 0) {
  console.error(`No release files found in ${distDir}. Run "npm run build:win" first.`)
  process.exit(1)
}

toUpload.push(join(import.meta.dirname, 'icon.ico'))

const uploadedNames = new Set()

for (const path of toUpload) {
  const localName = path.split(/[\\/]/).pop()
  const key = uploadKeyFor(localName)
  uploadedNames.add(key)
  const body = await readFile(path)
  console.log(`Uploading ${key}${key !== localName ? ` (as ${localName} locally)` : ''} (${(body.length / 1024 / 1024).toFixed(1)} MB)...`)
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentTypeFor(key)
    })
  )
}

if (uploadedNames.has('JBCLSetup.dmg')) {
  // The Mac build can't auto-update; the app polls this to show a "new version, download" banner.
  console.log('Uploading latest-mac.json...')
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: 'latest-mac.json',
      Body: JSON.stringify({ version, url: 'https://updates.jailbreakchangelogs.com/JBCLSetup.dmg' }),
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    })
  )
}

const uploadedNupkg = [...uploadedNames].some((name) => name.endsWith('.nupkg'))

if (uploadedNupkg) {
  const { Contents = [] } = await client.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET }))
  const staleNupkgs = Contents.map((o) => o.Key).filter((key) => key.endsWith('.nupkg') && !uploadedNames.has(key))

  if (staleNupkgs.length > 0) {
    console.log(`Deleting ${staleNupkgs.length} stale nupkg(s): ${staleNupkgs.join(', ')}`)
    await client.send(
      new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET,
        Delete: { Objects: staleNupkgs.map((Key) => ({ Key })) }
      })
    )
  }
}

console.log(`Done.`)
console.log(`Windows download link: https://updates.jailbreakchangelogs.com/JBCLSetup.exe`)
if (uploadedNames.has('JBCLSetup.dmg')) {
  console.log(`macOS download link: https://updates.jailbreakchangelogs.com/JBCLSetup.dmg`)
}
if (uploadedNames.has('JBCLSetup.AppImage')) {
  console.log(`Linux download link: https://updates.jailbreakchangelogs.com/JBCLSetup.AppImage`)
}
