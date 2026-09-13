import test from 'node:test'
import assert from 'node:assert/strict'
import { validateAuthFields } from '../src/utils/authValidation.js'

const valid = { username: 'player_1', password: 'password123', confirmation: 'password123', registering: true }

test('auth validation accepts valid credentials and trims only the username', () => {
  assert.deepEqual(validateAuthFields({ ...valid, username: ' player_1 ', password: ' password123 ', confirmation: ' password123 ' }), { username: '', password: '', confirmation: '' })
  assert.ok(validateAuthFields({ ...valid, password: ' password123 ' }).confirmation)
})

test('custom validation catches empty, Chinese, malformed and out-of-range usernames', () => {
  for (const username of ['', '   ', '琳聪', 'ab', 'a'.repeat(25), 'abc def', 'abc!']) {
    assert.ok(validateAuthFields({ ...valid, username }).username)
  }
  for (const username of ['abc', 'a'.repeat(24)]) assert.equal(validateAuthFields({ ...valid, username }).username, '')
})

test('password validation rejects blank and invalid lengths without trimming valid passwords', () => {
  for (const password of ['', '        ', '1234567', 'a'.repeat(129)]) assert.ok(validateAuthFields({ ...valid, password }).password)
  for (const password of ['12345678', 'a'.repeat(128), ' 密码 password ']) assert.equal(validateAuthFields({ ...valid, password }).password, '')
})

test('confirmation responds to either password changing and is not required for login', () => {
  assert.ok(validateAuthFields({ ...valid, confirmation: '' }).confirmation)
  assert.ok(validateAuthFields({ ...valid, confirmation: 'password12' }).confirmation)
  assert.equal(validateAuthFields(valid).confirmation, '')
  assert.ok(validateAuthFields({ ...valid, password: 'changed123' }).confirmation)
  assert.equal(validateAuthFields({ ...valid, registering: false, confirmation: '' }).confirmation, '')
})
