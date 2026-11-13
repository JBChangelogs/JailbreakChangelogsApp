import assert from 'node:assert/strict'
import {
  validateServerLink,
  validateServerRules,
  validateServerExpiry,
  normaliseRules,
  toExpiresField,
  parseServerTimestamp,
  displayRules
} from '../src/shared/servers.ts'

assert.equal(validateServerLink('https://www.roblox.com/share?code=abc&type=Server'), null)
assert.ok(validateServerLink(''))
assert.ok(validateServerLink('https://roblox.com/share?code=abc'))
assert.ok(validateServerLink('https://www.roblox.com/share'))
assert.ok(validateServerLink('http://www.roblox.com/share?code=abc'))

assert.equal(validateServerRules('join https://discord.gg/abc.'), null)
assert.equal(validateServerRules('see https://www.roblox.com/games/1'), null)
assert.ok(validateServerRules('https://evil.com/discord.gg'))
assert.ok(validateServerRules('x'.repeat(201)))

assert.equal(normaliseRules('  a  \n\n\n\n b '), 'a\n\nb')
assert.equal(normaliseRules('   '), 'N/A')

const now = new Date('2026-01-01T12:00:00').getTime()
const day = 86_400_000
assert.equal(validateServerExpiry(null, now), null)
assert.ok(validateServerExpiry(now + 3 * day, now))
assert.equal(validateServerExpiry(now + 8 * day, now), null)
assert.equal(toExpiresField(null, now), 'Never')
assert.equal(toExpiresField(now + 400 * day, now), 'Never')
assert.equal(toExpiresField(now + 10 * day, now), String(Math.floor((now + 10 * day) / 1000)))

assert.equal(parseServerTimestamp('Never'), null)
assert.equal(parseServerTimestamp('1794173498'), 1794173498000)
assert.equal(parseServerTimestamp(1794173498000), 1794173498000)

assert.equal(displayRules('N/A'), null)
assert.equal(displayRules('dm me on discord.gg/x'), 'dm me on [REDACTED]')

console.log('server checks passed')
