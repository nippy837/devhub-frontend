import test from 'node:test'
import assert from 'node:assert/strict'
import { canTurn, createFood, createGame, seededRandom, stepGame } from '../src/utils/snakeGame.js'

const runningGame = (overrides = {}) => ({ ...createGame(() => 0), status: 'running', ...overrides })

test('moving preserves length and does not mutate the previous state', () => {
  const game = runningGame()
  const next = stepGame(game)
  assert.deepEqual(next.snake[0], { x: 8, y: 10 })
  assert.equal(next.snake.length, 3)
  assert.deepEqual(game.snake[0], { x: 7, y: 10 })
  assert.equal(next.score, 0)
})

test('eating grows the snake, scores points and puts food in a free cell', () => {
  const next = stepGame(runningGame({ foods: [{ x: 8, y: 10 }] }), 'right', () => 0)
  assert.equal(next.score, 20)
  assert.equal(next.snake.length, 4)
  assert.equal(next.foods.length, 8)
  assert.ok(next.foods.every((food) => !next.snake.some((cell) => cell.x === food.x && cell.y === food.y)))
})

test('opposite directions are rejected', () => {
  assert.equal(canTurn('right', 'left'), false)
  assert.equal(canTurn('up', 'down'), false)
  assert.equal(canTurn('right', 'up'), true)
  assert.equal(canTurn('right', 'invalid'), false)
  assert.deepEqual(stepGame(runningGame(), 'left').snake[0], { x: 8, y: 10 })
})

test('crossing each edge wraps to the opposite edge', () => {
  for (const [direction, head, destination] of [
    ['left', { x: 0, y: 5 }, { x: 19, y: 5 }],
    ['right', { x: 19, y: 5 }, { x: 0, y: 5 }],
    ['up', { x: 5, y: 0 }, { x: 5, y: 19 }],
    ['down', { x: 5, y: 19 }, { x: 5, y: 0 }],
  ]) {
    const next = stepGame(runningGame({ snake: [head], direction }))
    assert.equal(next.status, 'running')
    assert.deepEqual(next.snake[0], destination)
  }
})

test('wrapping can eat fruit or collide with the body on the opposite edge', () => {
  const snake = [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }]
  const next = stepGame(runningGame({ snake, foods: [{ x: 0, y: 5 }] }))
  assert.equal(next.score, 20)
  assert.equal(next.snake.length, 4)
  assert.deepEqual(next.snake[0], { x: 0, y: 5 })
  const loop = [{ x: 19, y: 5 }, { x: 19, y: 6 }, { x: 0, y: 6 }, { x: 0, y: 5 }, { x: 0, y: 4 }]
  assert.equal(stepGame(runningGame({ snake: loop })).status, 'over')
})

test('eating the last fruit across an edge fills the real 20 by 20 board and wins', () => {
  const snake = []
  for (let y = 0; y < 20; y++) {
    for (let offset = 0; offset < 20; offset++) {
      const x = y % 2 === 0 ? 19 - offset : offset
      if (x !== 0 || y !== 0) snake.push({ x, y })
    }
  }
  const result = stepGame(runningGame({ snake, score: 7920, foods: [{ x: 0, y: 0 }] }))
  assert.equal(result.status, 'won')
  assert.deepEqual(result.foods, [])
  assert.equal(result.score, 7940)
  assert.equal(new Set(result.snake.map(({ x, y }) => `${x},${y}`)).size, 400)
  assert.equal(stepGame(result), result)
})

test('body collision ends the game, but moving into the departing tail is allowed', () => {
  const snake = [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }]
  assert.equal(stepGame(runningGame({ snake, direction: 'up' }), 'left').status, 'running')
  assert.equal(stepGame(runningGame({ snake: [...snake, { x: 0, y: 2 }], direction: 'up' }), 'left').status, 'over')
})

test('filling the board wins without trying to spawn another fruit', () => {
  const snake = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]
  const result = stepGame(runningGame({ snake, foods: [{ x: 1, y: 0 }] }), 'right', () => 0, 2)
  assert.equal(result.status, 'won')
  assert.deepEqual(result.foods, [])
  assert.equal(result.snake.length, 4)
  assert.equal(createFood(result.snake, 2), null)
})

test('ready, paused and finished games do not move', () => {
  for (const status of ['ready', 'paused', 'over', 'won']) {
    const game = runningGame({ status })
    assert.equal(stepGame(game), game)
  }
})


test('eight distinct fruits are maintained and seeded layouts are repeatable', () => {
  const a = createGame(seededRandom(123456789))
  const b = createGame(seededRandom(123456789))
  assert.deepEqual(a, b)
  assert.equal(a.foods.length, 8)
  assert.equal(new Set(a.foods.map(({ x, y }) => `${x},${y}`)).size, 8)
  assert.ok(a.foods.every((food) => !a.snake.some((cell) => cell.x === food.x && cell.y === food.y)))
  assert.notDeepEqual(a.foods, createGame(seededRandom(987654321)).foods)
})
