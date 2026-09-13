import levels from './sokobanLevels.json' with { type: 'json' }
import { seededRandom } from './snakeGame.js'

export { levels }
export const MAX_ACTIONS = 20000
export const VECTORS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }
export const MINE_MODES = {
  easy: { size: 9, mines: 10, label: '初级 · 9×9' },
  medium: { size: 12, mines: 24, label: '中级 · 12×12' },
  hard: { size: 16, mines: 40, label: '高级 · 16×16' },
}

function addTile(cells, random) {
  const free = cells.flatMap((value, index) => value === 0 ? [index] : [])
  if (free.length) cells[free[Math.floor(random() * free.length)]] = random() < 0.9 ? 2 : 4
}

export function create2048(random) {
  const cells = Array(16).fill(0)
  addTile(cells, random)
  addTile(cells, random)
  return { cells, score: 0, steps: 0, status: 'running' }
}

export function move2048(game, direction, random) {
  if (game.status !== 'running' || !VECTORS[direction]) return game
  const cells = [...game.cells]
  let score = game.score
  for (let line = 0; line < 4; line++) {
    const indices = Array.from({ length: 4 }, (_, i) => {
      if (direction === 'L') return line * 4 + i
      if (direction === 'R') return line * 4 + 3 - i
      if (direction === 'U') return i * 4 + line
      return (3 - i) * 4 + line
    })
    const values = indices.map((index) => cells[index]).filter(Boolean)
    const merged = []
    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) { merged.push(values[i] * 2); score += values[i] * 2; i++ }
      else merged.push(values[i])
    }
    indices.forEach((index, i) => { cells[index] = merged[i] || 0 })
  }
  if (cells.every((value, i) => value === game.cells[i])) return game
  addTile(cells, random)
  const possible = cells.some((value, i) => value === 0
    || (i % 4 < 3 && value === cells[i + 1]) || (i < 12 && value === cells[i + 4]))
  return { cells, score, steps: game.steps + 1, status: cells.includes(2048) ? 'won' : possible ? 'running' : 'over' }
}

export function createSokoban(levelId) {
  const level = levels.find((entry) => entry.id === levelId)
  if (!level) throw new Error('关卡不存在')
  const width = level.map[0].length
  const cells = level.map.join('').split('')
  return { width, height: level.map.length, walls: cells.flatMap((c, i) => c === '#' ? [i] : []),
    goals: cells.flatMap((c, i) => '.+*'.includes(c) ? [i] : []),
    boxes: cells.flatMap((c, i) => '$*'.includes(c) ? [i] : []),
    player: cells.findIndex((c) => '@+'.includes(c)), steps: 0, status: 'running' }
}

export function moveSokoban(game, direction) {
  if (game.status !== 'running' || !VECTORS[direction]) return game
  const [dx, dy] = VECTORS[direction]
  function neighbor(cell) {
    const x = cell % game.width + dx, y = Math.floor(cell / game.width) + dy
    return x < 0 || x >= game.width || y < 0 || y >= game.height ? -1 : y * game.width + x
  }
  const next = neighbor(game.player)
  if (next < 0 || game.walls.includes(next)) return game
  const boxes = [...game.boxes]
  if (boxes.includes(next)) {
    const beyond = neighbor(next)
    if (beyond < 0 || game.walls.includes(beyond) || boxes.includes(beyond)) return game
    boxes[boxes.indexOf(next)] = beyond
  }
  return { ...game, boxes, player: next, steps: game.steps + 1,
    status: game.goals.every((cell) => boxes.includes(cell)) ? 'won' : 'running' }
}

export function mineNeighbors(index, size) {
  const result = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = index % size + dx, y = Math.floor(index / size) + dy
    if ((dx || dy) && x >= 0 && x < size && y >= 0 && y < size) result.push(y * size + x)
  }
  return result
}

export function createMines(mode) {
  const config = MINE_MODES[mode]
  if (!config) throw new Error('难度不存在')
  return { ...config, mines: [], revealed: [], flags: [], counts: [], mineCount: config.mines, status: 'running', steps: 0, exploded: -1 }
}

export function actMines(game, action, random) {
  if (game.status !== 'running' || !/^[OF]\d+$/.test(action)) return game
  const index = Number(action.slice(1))
  if (!Number.isInteger(index) || index < 0 || index >= game.size ** 2 || game.revealed.includes(index)) return game
  if (action[0] === 'F') {
    if (!game.flags.includes(index) && game.flags.length >= game.mineCount) return game
    const flags = game.flags.includes(index) ? game.flags.filter((cell) => cell !== index) : [...game.flags, index]
    return { ...game, flags, steps: game.steps + 1 }
  }
  if (game.flags.includes(index)) return game
  let mines = game.mines, counts = game.counts
  if (!mines.length) {
    const safe = new Set([index, ...mineNeighbors(index, game.size)])
    const candidates = Array.from({ length: game.size ** 2 }, (_, i) => i).filter((i) => !safe.has(i))
    mines = []
    while (mines.length < game.mineCount) mines.push(candidates.splice(Math.floor(random() * candidates.length), 1)[0])
    counts = Array.from({ length: game.size ** 2 }, (_, i) => mineNeighbors(i, game.size).filter((n) => mines.includes(n)).length)
  }
  if (mines.includes(index)) return { ...game, mines, counts, exploded: index, status: 'over', steps: game.steps + 1 }
  const revealed = new Set(game.revealed)
  const queue = [index]
  while (queue.length) {
    const cell = queue.pop()
    if (revealed.has(cell) || game.flags.includes(cell) || mines.includes(cell)) continue
    revealed.add(cell)
    if (counts[cell] === 0) queue.push(...mineNeighbors(cell, game.size))
  }
  return { ...game, mines, counts, revealed: [...revealed], steps: game.steps + 1,
    status: revealed.size === game.size ** 2 - game.mineCount ? 'won' : 'running' }
}

export function createArcade(kind, variant, seed) {
  const random = seededRandom(seed)
  const game = kind === '2048' ? create2048(random) : kind === 'sokoban' ? createSokoban(variant) : createMines(variant)
  return { game, random }
}

export function applyArcade(kind, game, action, random) {
  return kind === '2048' ? move2048(game, action, random) : kind === 'sokoban' ? moveSokoban(game, action) : actMines(game, action, random)
}
