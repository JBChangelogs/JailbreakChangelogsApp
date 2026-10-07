// Self-check for the trade scan post-processing. Run: node --experimental-strip-types build/check-trade-scan.mjs
import assert from 'node:assert/strict'
import { fuzzRatio, parseTradeScan, TradeScanError } from '../src/shared/tradeScan.ts'

// fuzz.ratio parity with rapidfuzz
assert.equal(fuzzRatio('abc', 'abc'), 100)
assert.equal(fuzzRatio('', ''), 100)
assert.equal(Math.round(fuzzRatio('vehicle', 'vehicel')), 86)
assert.equal(fuzzRatio('abc', 'xyz'), 0)

const det = (text, x, y, w = 120, h = 20, conf = 0.9) => ({ x0: x, y0: y, x1: x + w, y1: y + h, text, conf })
const catalog = [
  { id: 222, name: 'Torpedo', type: 'Vehicle' },
  { id: 170, name: 'Javelin', type: 'Vehicle' },
  { id: 549, name: 'HyperBlue Level 3', type: 'HyperChrome' },
  { id: 9, name: 'Torpedo Engine', type: 'Engine' }
]

// Two labels on top (offering), one at the bottom (requesting); UI noise and below-window text ignored.
const result = parseTradeScan(
  [
    det('Vehicle', 100, 100),
    det('TORPEDO', 100, 125),
    det('HyperChrome', 300, 100),
    det('HYPERBLUE LEVEL 3', 300, 125),
    det('Vehicle', 100, 400),
    det('JAVELN', 100, 425),
    det('trade chat', 500, 300),
    det('Accept', 100, 600),
    det('Decline', 300, 600),
    det('TORPEDO', 100, 900)
  ],
  1000,
  catalog
)
assert.deepEqual(
  result.offering.map((i) => i.id),
  [222, 549]
)
assert.deepEqual(
  result.requesting.map((i) => i.id),
  [170]
)

// Accept/Decline alone isn't the trade menu; Exit or Ready is.
assert.equal(result.inTradeMenu, false)
assert.equal(parseTradeScan([det('Vehicle', 100, 100), det('TORPEDO', 100, 125), det('Ready', 100, 600)], 1000, catalog).inTradeMenu, true)
assert.equal(parseTradeScan([det('Exit (3)', 100, 600)], 1000, catalog).inTradeMenu, true)

// Pipe-split + too many regions
assert.throws(
  () => parseTradeScan(Array.from({ length: 51 }, (_, i) => det('a | b', 0, i * 10)), 1000, catalog),
  (e) => e instanceof TradeScanError && e.code === 'too_many_text_regions'
)

// Lowercase names never pair; skipped categories never match.
assert.deepEqual(parseTradeScan([det('Vehicle', 100, 100), det('torpedo', 100, 125)], 1000, catalog).offering, [])

console.log('trade scan checks passed')
