import { createPrivateKey, scryptSync, sign } from 'crypto'

const lines = (base64Text) =>
  Buffer.from(base64Text.trim(), 'base64')
    .toString('utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

function scryptParams(opslimit, memlimit) {
  const r = 8
  const ops = Math.max(opslimit, 32768)
  let nLog2 = 1
  if (ops < memlimit / 32) {
    const maxN = ops / (r * 4)
    while (nLog2 < 63 && 2 ** nLog2 <= maxN / 2) nLog2++
    return { N: 2 ** nLog2, r, p: 1 }
  }
  const maxN = memlimit / (r * 128)
  while (nLog2 < 63 && 2 ** nLog2 <= maxN / 2) nLog2++
  const maxrp = Math.min(Math.floor(ops / 4 / 2 ** nLog2), 0x3fffffff)
  return { N: 2 ** nLog2, r, p: Math.max(1, Math.floor(maxrp / r)) }
}

function secretKey(secretKeyBase64, password) {
  const keyLine = lines(secretKeyBase64).find((l) => !l.startsWith('untrusted comment:'))
  const box = Buffer.from(keyLine, 'base64')
  if (box.subarray(0, 2).toString() !== 'Ed') throw new Error('not an Ed25519 minisign secret key')
  const kdf = box.subarray(2, 4).toString('latin1')
  const salt = box.subarray(6, 38)
  const opslimit = Number(box.readBigUInt64LE(38))
  const memlimit = Number(box.readBigUInt64LE(46))
  const sealed = box.subarray(54, 158)
  let keynum = sealed
  if (kdf === 'Sc') {
    const { N, r, p } = scryptParams(opslimit, memlimit)
    const stream = scryptSync(Buffer.from(password ?? ''), salt, sealed.length, { N, r, p, maxmem: 256 * N * r + 1024 * 1024 })
    keynum = Buffer.from(sealed.map((b, i) => b ^ stream[i]))
  } else if (kdf !== '\0\0') {
    throw new Error(`unsupported key derivation ${JSON.stringify(kdf)}`)
  }
  const keyId = keynum.subarray(0, 8)
  const seed = keynum.subarray(8, 40)
  const publicKey = keynum.subarray(40, 72)
  const privateKey = createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
    format: 'der',
    type: 'pkcs8'
  })
  return { keyId, publicKey, privateKey }
}

export function signLegacy(file, secretKeyBase64, password, fileName, version) {
  const { keyId, privateKey } = secretKey(secretKeyBase64, password)
  const signature = sign(null, file, privateKey)
  const trusted = `timestamp:${Math.floor(Date.now() / 1000)}\tfile:${fileName}\tversion:${version}`
  const global = sign(null, Buffer.concat([signature, Buffer.from(trusted)]), privateKey)
  const text = [
    'untrusted comment: signature from tauri secret key',
    Buffer.concat([Buffer.from('Ed'), keyId, signature]).toString('base64'),
    `trusted comment: ${trusted}`,
    global.toString('base64'),
    ''
  ].join('\n')
  return Buffer.from(text).toString('base64')
}

export function publicKeyMatches(secretKeyBase64, password, publicKeyBase64) {
  const { keyId, publicKey } = secretKey(secretKeyBase64, password)
  const pub = Buffer.from(lines(publicKeyBase64).find((l) => !l.startsWith('untrusted comment:')), 'base64')
  return pub.subarray(2, 10).equals(keyId) && pub.subarray(10, 42).equals(publicKey)
}
