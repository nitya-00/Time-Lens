import assert from 'node:assert/strict'
import test from 'node:test'
import { DistractionType } from '../generated/prisma/client.js'
import type { LoggedBlock } from './timeRules.js'
import { hasPhoneUse } from './habits.js'

function block(values: Partial<LoggedBlock>): LoggedBlock {
  return { activity: null, distraction: DistractionType.NONE, category: null, ...values } as LoggedBlock
}

test('phone habits only fail for phone or YouTube use', () => {
  assert.equal(hasPhoneUse(block({ distraction: DistractionType.PHONE })), true)
  assert.equal(hasPhoneUse(block({ activity: 'YouTube' })), true)
  assert.equal(hasPhoneUse(block({ category: { name: 'Phone' } })), true)
  assert.equal(hasPhoneUse(block({ distraction: DistractionType.TIRED })), false)
  assert.equal(hasPhoneUse(block({ distraction: DistractionType.FRIENDS })), false)
})
