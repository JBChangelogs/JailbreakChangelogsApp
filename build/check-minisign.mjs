import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto'
import { verifyMinisign } from '../src/main/minisign.ts'
import { publicKeyMatches, signLegacy } from './minisign-legacy.mjs'

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32)
const keyId = randomBytes(8)
const b64 = (s) => Buffer.from(s).toString('base64')
const pub = b64(`untrusted comment: minisign public key\n${Buffer.concat([Buffer.from('Ed'), keyId, raw]).toString('base64')}\n`)

function signFile(file, id = keyId) {
  const signature = sign(null, createHash('blake2b512').update(file).digest(), privateKey)
  const trusted = 'timestamp:1\tfile:payload'
  const global = sign(null, Buffer.concat([signature, Buffer.from(trusted)]), privateKey)
  const line = Buffer.concat([Buffer.from('ED'), id, signature]).toString('base64')
  return b64(`untrusted comment: signature\n${line}\ntrusted comment: ${trusted}\n${global.toString('base64')}\n`)
}

const file = randomBytes(4096)
const sig = signFile(file)
assert.equal(verifyMinisign(file, sig, pub), true)

const tampered = Buffer.from(file)
tampered[100] ^= 1
assert.equal(verifyMinisign(tampered, sig, pub), false)
assert.equal(verifyMinisign(file, signFile(file, randomBytes(8)), pub), false)
assert.equal(verifyMinisign(file, sig.slice(0, 80), pub), false)
assert.equal(verifyMinisign(file, 'not base64 at all', pub), false)

const forgedComment = Buffer.from(sig, 'base64').toString().replace('timestamp:1', 'timestamp:2')
assert.equal(verifyMinisign(file, b64(forgedComment), pub), false)

const seed = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(-32)
const box = Buffer.concat([
  Buffer.from('Ed'),
  Buffer.from([0, 0]),
  Buffer.from('B2'),
  Buffer.alloc(32),
  Buffer.alloc(16),
  keyId,
  seed,
  raw,
  Buffer.alloc(32)
])
const secret = b64(`untrusted comment: minisign secret key\n${box.toString('base64')}\n`)
assert.equal(publicKeyMatches(secret, '', pub), true)
const legacy = signLegacy(file, secret, '', 'payload', '1.2.3')
const legacyText = Buffer.from(legacy, 'base64').toString()
assert.equal(verifyMinisign(file, legacy, pub), true)
assert.equal(verifyMinisign(tampered, legacy, pub), false)
assert.match(legacyText, /trusted comment: timestamp:\d+\tfile:payload\tversion:1\.2\.3/)
assert.equal(Buffer.from(legacyText.split('\n')[1], 'base64').subarray(0, 2).toString(), 'Ed')

console.log('minisign checks passed')
