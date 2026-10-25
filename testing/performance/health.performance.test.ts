import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'
import app from '../../backend/src/app.js'

const enabled = process.env.RUN_PERFORMANCE_TESTS === '1'

test('health endpoint stays responsive during a small burst', { skip: !enabled }, async () => {
  const started = performance.now()
  const responses = await Promise.all(Array.from({ length: 40 }, () => request(app).get('/api/health')))
  const elapsed = performance.now() - started
  assert.ok(responses.every(response => response.status === 200))
  assert.ok(elapsed < 3_000, '40 health checks exceeded the 3 second budget')
})
