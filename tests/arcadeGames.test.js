import test from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from '../src/utils/snakeGame.js'
import { create2048, move2048, createSokoban, moveSokoban, createMines, actMines, mineNeighbors, levels, MINE_MODES } from '../src/utils/arcadeGames.js'

const tiles = (row, rest = Array(12).fill(0)) => ({ cells: [...row, ...rest], score: 0, steps: 0, status: 'running' })
test('2048 merges each tile once, scores merged values and spawns exactly one tile', () => {
  const initial = tiles([2, 2, 2, 2])
  const next = move2048(initial, 'L', () => 0)
  assert.deepEqual(next.cells.slice(0, 4), [4, 4, 2, 0])
  assert.equal(next.score, 8)
  assert.equal(next.steps, 1)
  assert.deepEqual(initial.cells.slice(0, 4), [2, 2, 2, 2])
  assert.deepEqual(move2048(tiles([2, 2, 4, 0]), 'L', () => 0).cells.slice(0, 3), [4, 4, 2])
})

test('2048 handles all move directions and unchanged input never consumes randomness', () => {
  for (const [direction, indices] of [['L', [0, 1]], ['R', [2, 3]], ['U', [0, 4]], ['D', [8, 12]]]) {
    const game = tiles([0, 0, 0, 0])
    indices.forEach((index) => { game.cells[index] = 2 })
    assert.equal(move2048(game, direction, () => 0).score, 4)
  }
  const initial = tiles([2, 0, 0, 0])
  assert.equal(move2048(initial, 'L', () => { throw Error('Randomness consumed') }), initial)
})

test('2048 detects a win and the last available move ending in a blocked board', () => {
  assert.equal(move2048(tiles([1024, 1024, 0, 0]), 'L', () => 0).status, 'won')
  const game = { cells: [2, 2, 8, 16, 8, 16, 32, 64, 16, 32, 64, 128, 32, 64, 128, 256], score: 0, steps: 0, status: 'running' }
  assert.equal(move2048(game, 'L', () => 0).status, 'over')
  assert.deepEqual(create2048(seededRandom(123)), create2048(seededRandom(123)))
})

const solutions = { '1': 'U', '2': 'LUDRRU', '3': 'LUURURRDDLLDLU', '4': 'LUURULDDDDLLUURRDLRRUU', '5': 'URRUUUDDLLULUURRRDDLLU' }
test('all five Sokoban levels can be solved and stop accepting movement after victory', () => {
  for (const level of levels) {
    let game = createSokoban(level.id)
    assert.equal(game.boxes.length, game.goals.length)
    for (const move of solutions[level.id]) game = moveSokoban(game, move)
    assert.equal(game.status, 'won', level.id)
    assert.equal(game.steps, solutions[level.id].length)
    assert.equal(moveSokoban(game, 'D'), game)
  }
})

test('Sokoban walls and stacked boxes block movement without increasing steps', () => {
  let game = createSokoban('3')
  assert.equal(moveSokoban(game, 'U'), game)
  game = moveSokoban(game, 'L')
  game = moveSokoban(game, 'L')
  assert.equal(moveSokoban(game, 'L'), game)
})

test('Sokoban maps have rectangular closed boundaries and one player', () => {
  for (const level of levels) {
    assert.ok(level.map.every((row) => row.length === level.map[0].length && row.startsWith('#') && row.endsWith('#')))
    assert.match(level.map[0], /^#+$/)
    assert.match(level.map.at(-1), /^#+$/)
    assert.equal([...level.map.join('')].filter((cell) => '@+'.includes(cell)).length, 1)
  }
})

test('all Mines modes protect the first click and its neighbors and use distinct mines', () => {
  for (const mode of Object.keys(MINE_MODES)) {
    for (const index of [0, 40]) {
      const game = actMines(createMines(mode), `O${index}`, seededRandom(9876))
      assert.equal(game.mines.length, MINE_MODES[mode].mines)
      assert.equal(new Set(game.mines).size, game.mineCount)
      assert.ok([index, ...mineNeighbors(index, game.size)].every((cell) => !game.mines.includes(cell)))
      assert.ok(game.revealed.includes(index))
      assert.notEqual(game.status, 'over')
    }
  }
})

test('Mines supports flag removal, protects flags during flood reveal, and caps flags', () => {
  const random = seededRandom(123)
  let game = actMines(createMines('easy'), 'F1', random)
  assert.equal(actMines(game, 'O1', random), game)
  game = actMines(game, 'O0', random)
  assert.ok(!game.revealed.includes(1))
  game = actMines(game, 'F1', random)
  assert.ok(!game.flags.includes(1))
  game = createMines('easy')
  for (let i = 0; i < 10; i++) game = actMines(game, `F${i}`, random)
  assert.equal(actMines(game, 'F10', random), game)
})

test('Mines reveals zero regions, loses on a mine, and wins after revealing all safe cells', () => {
  const random = seededRandom(3456)
  let game = actMines(createMines('easy'), 'O40', random)
  assert.ok(game.revealed.length >= 9)
  const lost = actMines(game, `O${game.mines[0]}`, random)
  assert.equal(lost.status, 'over')
  assert.equal(actMines(lost, 'F0', random), lost)
  for (let i = 0; i < game.size ** 2; i++) if (!game.mines.includes(i)) game = actMines(game, `O${i}`, random)
  assert.equal(game.status, 'won')
  assert.equal(game.revealed.length, 71)
})
