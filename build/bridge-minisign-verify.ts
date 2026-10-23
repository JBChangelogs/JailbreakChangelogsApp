import { createHash, createPublicKey, verify } from 'crypto'

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function lines(base64Text: string): string[] {
  return Buffer.from(base64Text.trim(), 'base64')
    .toString('utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

export function verifyMinisign(file: Buffer, signatureBase64: string, publicKeyBase64: string): boolean {
  try {
    const keyLine = lines(publicKeyBase64).find((l) => !l.startsWith('untrusted comment:'))
    const sigLines = lines(signatureBase64)
    const sigLine = sigLines.find((l) => !l.includes(':'))
    const trustedLine = sigLines.find((l) => l.startsWith('trusted comment: '))
    const globalLine = trustedLine ? sigLines[sigLines.indexOf(trustedLine) + 1] : undefined
    if (!keyLine || !sigLine || !trustedLine || !globalLine) return false

    const keyBytes = Buffer.from(keyLine, 'base64')
    const sigBytes = Buffer.from(sigLine, 'base64')
    if (keyBytes.length !== 42 || sigBytes.length !== 74) return false
    if (keyBytes.subarray(0, 2).toString() !== 'Ed') return false
    if (!keyBytes.subarray(2, 10).equals(sigBytes.subarray(2, 10))) return false

    const algorithm = sigBytes.subarray(0, 2).toString()
    if (algorithm !== 'ED' && algorithm !== 'Ed') return false
    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, keyBytes.subarray(10)]),
      format: 'der',
      type: 'spki'
    })
    const signature = sigBytes.subarray(10)
    const message = algorithm === 'ED' ? createHash('blake2b512').update(file).digest() : file
    if (!verify(null, message, publicKey, signature)) return false

    const trustedComment = Buffer.from(trustedLine.slice('trusted comment: '.length))
    return verify(null, Buffer.concat([signature, trustedComment]), publicKey, Buffer.from(globalLine, 'base64'))
  } catch {
    return false
  }
}
