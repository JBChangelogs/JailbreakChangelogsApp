import assert from 'node:assert/strict'
import {
  HYPERCHROME_PITY_BIG,
  HYPERCHROME_PITY_SMALL,
  robberiesToLevelUp,
  robberiesToBigPityGoal,
  bigPityAtLevel
} from '../src/shared/hyperchrome.ts'

assert.deepEqual(HYPERCHROME_PITY_BIG, [224, 473, 760, 870, 1335])
assert.deepEqual(HYPERCHROME_PITY_SMALL, [340, 716, 1152, 1319, 2023])
assert.equal(robberiesToLevelUp(0, 0, false), 224)
assert.equal(robberiesToLevelUp(0, 50, false), 112)
assert.equal(robberiesToLevelUp(0, 150, false), 0)
assert.equal(robberiesToBigPityGoal(0, 0, true), 224)
assert.equal(robberiesToBigPityGoal(0, 100, true), 0)
assert.equal(bigPityAtLevel(1, 100, false, 1), 100)

console.log('hyperchrome checks passed')
