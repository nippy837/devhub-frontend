export const BOARD_SIZE = 20
export const FOOD_COUNT = 8
export const POINTS_PER_FOOD = 20
export const MAX_TICKS = 50000
export const SPEEDS = { easy: 200, normal: 140, hard: 90 }
export const DIRECTION_CODES = { up: 'U', down: 'D', left: 'L', right: 'R' }

// 与后端使用相同的伪随机序列，服务端可以复算整局得分。
export function seededRandom(seed) {
  let state = seed | 0
  if (!state) state = 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
}
export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const sameCell = (a, b) => a.x === b.x && a.y === b.y

export function createFood(snake, size = BOARD_SIZE, random = Math.random) {
  const occupied = new Set(snake.map(({ x, y }) => `${x},${y}`))
  const free = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  return free.length ? free[Math.floor(random() * free.length)] : null
}

export function createGame(random = Math.random) {
  const snake = [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }]
  return { snake, direction: 'right', foods: refillFood(snake, [], BOARD_SIZE, random), score: 0, status: 'ready' }
}

export function refillFood(snake, foods, size = BOARD_SIZE, random = Math.random) {
  const result = [...foods]
  while (result.length < FOOD_COUNT) {
    const food = createFood([...snake, ...result], size, random)
    if (!food) break
    result.push(food)
  }
  return result
}

export function canTurn(current, next) {
  const a = DIRECTIONS[current]
  const b = DIRECTIONS[next]
  return Boolean(a && b && !(a.x + b.x === 0 && a.y + b.y === 0))
}

export function stepGame(game, direction = game.direction, random = Math.random, size = BOARD_SIZE) {
  if (game.status !== 'running') return game
  const nextDirection = canTurn(game.direction, direction) ? direction : game.direction
  const delta = DIRECTIONS[nextDirection]
  const head = {
    x: (game.snake[0].x + delta.x + size) % size,
    y: (game.snake[0].y + delta.y + size) % size,
  }
  const eating = game.foods.some((food) => sameCell(head, food))
  // The tail moves away on a normal step, so its current cell is safe to enter.
  const body = eating ? game.snake : game.snake.slice(0, -1)
  if (body.some((cell) => sameCell(cell, head))) {
    return { ...game, status: 'over' }
  }
  const snake = [head, ...game.snake]
  if (!eating) snake.pop()
  const foods = eating ? refillFood(snake, game.foods.filter((food) => !sameCell(head, food)), size, random) : game.foods
  return { ...game, snake, direction: nextDirection, foods, score: game.score + (eating ? POINTS_PER_FOOD : 0), status: snake.length === size * size ? 'won' : 'running' }
}
