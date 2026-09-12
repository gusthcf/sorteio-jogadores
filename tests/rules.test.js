/**
 * Testes das regras do dia de volei. Rode com: npm test
 *
 * O algoritmo usa aleatoriedade, entao os testes verificam PROPRIEDADES que precisam valer
 * para qualquer sorteio (e rodam centenas de partidas simuladas), nao resultados fixos.
 * Os elencos sao gerados com semente fixa para que uma falha seja reproduzivel.
 */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BALANCE_LIMIT,
  BALANCE_LIMIT_HARD,
  BEGINNER_MAX_RATING,
  drawTeams,
  rotationSizes,
} from '../src/lib/balance.js'
import {
  BEGINNER_TOLERANCE,
  WINS_FOR_REDRAW,
  combinations,
  pickComplement,
  registerWinner,
  rotationPlayers,
  startRotation,
} from '../src/lib/rotation.js'
import { EMPTY_DAY, benchIds, drawDay, playMatch } from '../src/lib/day.js'

const TEAM_SIZE = 6
const RATINGS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

/* ------------------------------------------------------------ utilitarios */

function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeRoster(n, rand, prefix = 'p') {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    name: `${prefix.toUpperCase()}${i}`,
    rating: RATINGS[Math.floor(rand() * RATINGS.length)],
  }))
}

const fixed = (prefix, ratings) =>
  ratings.map((rating, i) => ({ id: `${prefix}${i}`, name: `${prefix}${rating}`, rating }))

const sum = (players) => players.reduce((acc, p) => acc + p.rating, 0)
const ids = (players) => players.map((p) => p.id)
const isBeginner = (p) => p.rating <= BEGINNER_MAX_RATING

function indexCombos(n, k) {
  return combinations(Array.from({ length: n }, (_, i) => i), k)
}

/** Menor diferenca possivel entre dois times de 6 (forca bruta). */
function bestSpreadTwoTeams(players) {
  const r = players.map((p) => Math.round(p.rating * 2))
  const total = r.reduce((a, b) => a + b, 0)
  let best = Infinity
  for (const combo of indexCombos(11, 5)) {
    const s = r[0] + combo.reduce((acc, k) => acc + r[k + 1], 0)
    best = Math.min(best, Math.abs(total - 2 * s))
  }
  return best / 2
}

/** Menor diferenca possivel entre tres times de 6 (forca bruta com parada no limite teorico). */
function bestSpreadThreeTeams(players) {
  const r = players.map((p) => Math.round(p.rating * 2))
  const total = r.reduce((a, b) => a + b, 0)
  const lowerBound = total % 3 === 0 ? 0 : 1
  const patternsA = indexCombos(17, 5)
  const patternsB = indexCombos(11, 5)
  const remaining = new Array(12)
  let best = Infinity

  for (const a of patternsA) {
    const used = new Uint8Array(18)
    used[0] = 1
    let sA = r[0]
    for (const k of a) {
      used[k + 1] = 1
      sA += r[k + 1]
    }
    let m = 0
    for (let i = 1; i < 18; i++) if (!used[i]) remaining[m++] = i
    for (const b of patternsB) {
      let sB = r[remaining[0]]
      for (const k of b) sB += r[remaining[k + 1]]
      const sC = total - sA - sB
      const spread = Math.max(sA, sB, sC) - Math.min(sA, sB, sC)
      if (spread < best) {
        best = spread
        if (best === lowerBound) return best / 2
      }
    }
  }
  return best / 2
}

/**
 * Simula um dia inteiro exatamente como o app faz: vencedores aleatorios (com tendencia
 * a manter sequencias, para provocar os sorteios automaticos) e sorteios manuais aleatorios.
 */
function simulateDay(players, rand, { matches = 300, manualRedrawChance = 0.05, streakBias = 0.65 } = {}) {
  let day = drawDay(EMPTY_DAY, players, TEAM_SIZE)
  const benchRun = new Map()
  const expectedCounts = {}
  const report = { maxConsecutiveBench: 0, maxQueueTeams: 0, streakRedraws: 0, manualRedraws: 0 }

  for (let m = 0; m < matches; m++) {
    if (m > 0 && rand() < manualRedrawChance) {
      day = drawDay(day, players, TEAM_SIZE)
      report.manualRedraws += 1
    }

    const { court, queue } = day.rotation
    report.maxQueueTeams = Math.max(report.maxQueueTeams, queue.length)

    // Ninguem some, ninguem aparece duas vezes, quadra sempre completa.
    const everyone = ids(rotationPlayers(day.rotation))
    assert.equal(everyone.length, players.length, 'jogadores perdidos ou duplicados')
    assert.equal(new Set(everyone).size, players.length, 'jogador duplicado')
    if (players.length >= TEAM_SIZE * 2) {
      for (const team of court) assert.equal(team.players.length, TEAM_SIZE, 'time incompleto em quadra')
    }

    const bench = new Set(benchIds(day.rotation))
    for (const p of players) {
      const run = bench.has(p.id) ? (benchRun.get(p.id) || 0) + 1 : 0
      benchRun.set(p.id, run)
      report.maxConsecutiveBench = Math.max(report.maxConsecutiveBench, run)
      if (!bench.has(p.id)) expectedCounts[p.id] = (expectedCounts[p.id] || 0) + 1
    }

    const numbers = court.map((team) => team.number)
    const streak = day.rotation.streak
    const winner =
      streak && numbers.includes(streak.number) && rand() < streakBias
        ? streak.number
        : numbers[Math.floor(rand() * 2)]

    day = playMatch(day, winner, players, TEAM_SIZE)
    if (day.lastEvent.type === 'streak') report.streakRedraws += 1
  }

  for (const p of players) {
    assert.equal(day.matchCounts[p.id] || 0, expectedCounts[p.id] || 0, `contador errado para ${p.name}`)
  }
  return report
}

/* --------------------------------------------------------------- formato */

describe('formato dos times', () => {
  test('sempre dois times de 6 primeiro; a sobra espera de fora', () => {
    const expected = {
      2: [1, 1],
      7: [4, 3],
      11: [6, 5],
      12: [6, 6],
      13: [6, 6, 1],
      14: [6, 6, 2],
      15: [6, 6, 3],
      17: [6, 6, 5],
      18: [6, 6, 6],
      19: [6, 6, 6, 1],
      24: [6, 6, 6, 6],
    }
    for (const [n, sizes] of Object.entries(expected)) {
      assert.deepEqual(rotationSizes(Number(n), TEAM_SIZE), sizes, `${n} jogadores`)
    }
  })

  test('o sorteio respeita os tamanhos e usa cada presente exatamente uma vez', () => {
    const rand = seeded(1)
    for (let n = 2; n <= 24; n++) {
      const players = makeRoster(n, rand)
      const { teams } = drawTeams({ players, teamSize: TEAM_SIZE })
      assert.deepEqual(teams.map((t) => t.length), rotationSizes(n, TEAM_SIZE), `${n} jogadores`)
      assert.deepEqual(ids(teams.flat()).sort(), ids(players).sort())
    }
  })
})

/* ------------------------------------------------------------- equilibrio */

describe('equilíbrio do sorteio', () => {
  test('12 jogadores: encontra a menor diferença possível (comparado com força bruta)', () => {
    const rand = seeded(12)
    for (let round = 0; round < 25; round++) {
      const players = makeRoster(12, rand)
      const { spread } = drawTeams({ players, teamSize: TEAM_SIZE })
      assert.equal(spread, bestSpreadTwoTeams(players), `elenco ${round}`)
    }
  })

  test('18 jogadores: encontra a menor diferença possível entre os três times', () => {
    const rand = seeded(18)
    for (let round = 0; round < 8; round++) {
      const players = makeRoster(18, rand)
      const { spread } = drawTeams({ players, teamSize: TEAM_SIZE })
      assert.equal(spread, bestSpreadThreeTeams(players), `elenco ${round}`)
    }
  })

  test('sortear de novo com os mesmos presentes nunca repete a divisão', () => {
    const players = makeRoster(14, seeded(7))
    let day = EMPTY_DAY
    const seen = new Set()
    for (let i = 0; i < 12; i++) {
      day = drawDay(day, players, TEAM_SIZE)
      assert.ok(!seen.has(day.draw.signature), `sorteio ${i + 1} repetiu`)
      seen.add(day.draw.signature)
    }
  })
})

/* ------------------------------------------------------------ complemento */

describe('quem continua em quadra para completar o time que entra', () => {
  test('sem partidas jogadas: equilíbrio primeiro; iniciantes (0,5 · 1 · 1,5★) têm prioridade dentro da margem', () => {
    const rand = seeded(42)
    for (let round = 0; round < 500; round++) {
      const loser = makeRoster(6, rand, 'l')
      const winner = makeRoster(6, rand, 'w')
      const entering = makeRoster(1 + Math.floor(rand() * 5), rand, 'e')
      const need = TEAM_SIZE - entering.length

      const { stay, leave } = pickComplement({ loser, entering, opponent: winner, need })
      assert.equal(stay.length, need)
      assert.deepEqual(ids([...stay, ...leave]).sort(), ids(loser).sort())

      const gapOf = (group) => Math.abs(sum(entering) + sum(group) - sum(winner))
      const beginnersOf = (group) => group.filter(isBeginner).length
      const options = combinations(loser, need)
      const bestGap = Math.min(...options.map(gapOf))
      const eligible = options.filter((o) => gapOf(o) <= bestGap + BEGINNER_TOLERANCE + 1e-9)
      const maxBeginners = Math.max(...eligible.map(beginnersOf))
      const bestGapWithMaxBeginners = Math.min(
        ...eligible.filter((o) => beginnersOf(o) === maxBeginners).map(gapOf),
      )

      assert.ok(gapOf(stay) <= bestGap + BEGINNER_TOLERANCE + 1e-9, `rodada ${round}: desequilibrou além da margem`)
      assert.equal(beginnersOf(stay), maxBeginners, `rodada ${round}: tirou iniciante sem necessidade`)
      assert.equal(gapOf(stay), bestGapWithMaxBeginners, `rodada ${round}: não escolheu a opção mais equilibrada`)
    }
  })

  test('exemplo: o iniciante de 1,5★ fica e sai o de 2★, pois a diferença cabe na margem', () => {
    const { stay, leave } = pickComplement({
      loser: fixed('L', [5, 4, 3.5, 3, 2, 1.5]),
      entering: fixed('E', [3]),
      opponent: fixed('W', [5, 4, 4, 3.5, 3, 2.5]),
      need: 5,
    })
    assert.ok(stay.some((p) => p.rating === 1.5), 'o iniciante deveria continuar')
    assert.deepEqual(leave.map((p) => p.rating), [2])
  })

  test('exemplo: o iniciante sai quando mantê-lo desequilibraria demais', () => {
    const { leave } = pickComplement({
      loser: fixed('L', [5, 5, 4.5, 4, 4, 0.5]),
      entering: fixed('E', [5]),
      opponent: fixed('W', [5, 5, 5, 5, 4.5, 4.5]),
      need: 5,
    })
    assert.deepEqual(leave.map((p) => p.rating), [0.5])
  })

  test('sem iniciantes envolvidos vale o melhor equilíbrio', () => {
    const rand = seeded(5)
    for (let round = 0; round < 200; round++) {
      const pool = () => RATINGS.filter((r) => r > BEGINNER_MAX_RATING)
      const pick = (prefix, n) =>
        fixed(prefix, Array.from({ length: n }, () => pool()[Math.floor(rand() * pool().length)]))
      const loser = pick('L', 6)
      const winner = pick('W', 6)
      const entering = pick('E', 1 + Math.floor(rand() * 5))
      const need = TEAM_SIZE - entering.length
      const { stay } = pickComplement({ loser, entering, opponent: winner, need })
      const gapOf = (group) => Math.abs(sum(entering) + sum(group) - sum(winner))
      const bestGap = Math.min(...combinations(loser, need).map(gapOf))
      assert.equal(gapOf(stay), bestGap, `rodada ${round}`)
    }
  })
})

/* ---------------------------------------------------------------- rotacao */

describe('ordem da quadra', () => {
  test('quem vence fica, o primeiro da fila entra e quem perde vai para o fim da fila', () => {
    const { teams } = drawTeams({ players: makeRoster(24, seeded(3)), teamSize: TEAM_SIZE })
    const start = startRotation(teams)
    assert.deepEqual(start.queue.map((t) => t.number), [3, 4])

    const first = registerWinner(start, 1, { teamSize: TEAM_SIZE }).rotation
    assert.deepEqual(first.court.map((t) => t.number), [1, 3])
    assert.deepEqual(first.queue.map((t) => t.number), [4, 2])
    assert.deepEqual(ids(first.court[0].players), ids(start.court[0].players), 'vencedor mudou')

    const second = registerWinner(first, 3, { teamSize: TEAM_SIZE }).rotation
    assert.deepEqual(second.court.map((t) => t.number), [4, 3])
    assert.deepEqual(second.queue.map((t) => t.number), [2, 1])
  })

  test('13 jogadores: o Time 3 (1 jogador) entra completado com 5 do perdedor; a sobra vai para a fila', () => {
    const { teams } = drawTeams({ players: makeRoster(13, seeded(13)), teamSize: TEAM_SIZE })
    const start = startRotation(teams)
    const loserIds = ids(start.court[1].players)

    const next = registerWinner(start, 1, { teamSize: TEAM_SIZE }).rotation
    const entered = next.court[1]
    assert.equal(entered.number, 3)
    assert.equal(entered.players.length, 6)
    assert.equal(entered.joined.length, 5)
    assert.ok(entered.joined.every((id) => loserIds.includes(id)))
    assert.deepEqual(next.queue.map((t) => [t.number, t.players.length]), [[2, 1]])
  })

  test('sem ninguém de fora, os mesmos times seguem', () => {
    const { teams } = drawTeams({ players: makeRoster(12, seeded(4)), teamSize: TEAM_SIZE })
    const start = startRotation(teams)
    const next = registerWinner(start, 2, { teamSize: TEAM_SIZE }).rotation
    assert.deepEqual(next.court.map((t) => ids(t.players)), start.court.map((t) => ids(t.players)))
    assert.equal(next.queue.length, 0)
  })

  test(`${WINS_FOR_REDRAW} vitórias seguidas pedem novo sorteio; vitória de outro time zera a sequência`, () => {
    const { teams } = drawTeams({ players: makeRoster(12, seeded(8)), teamSize: TEAM_SIZE })
    let rotation = startRotation(teams)
    const expected = [
      [1, 1, false],
      [1, 2, false],
      [2, 1, false],
      [2, 2, false],
      [2, 3, true],
    ]
    for (const [winner, count, redraw] of expected) {
      const out = registerWinner(rotation, winner, { teamSize: TEAM_SIZE })
      assert.deepEqual(out.rotation.streak, { number: winner, count })
      assert.equal(out.needsRedraw, redraw)
      rotation = out.rotation
    }
  })

  test('na 3ª vitória o app sorteia sozinho, mantém os contadores e registra o placar', () => {
    const players = makeRoster(12, seeded(10))
    let day = drawDay(EMPTY_DAY, players, TEAM_SIZE)
    for (let m = 0; m < 3; m++) {
      const [a, b] = day.rotation.court.map((t) => t.number)
      day = { ...day, score: { [a]: 25, [b]: 20 + m } }
      day = playMatch(day, a, players, TEAM_SIZE)
    }
    assert.equal(day.lastEvent.type, 'streak')
    assert.equal(day.matches.length, 3)
    assert.equal(day.matches[2].redraw, true)
    assert.deepEqual(day.matches.map((m) => m.score), [[25, 20], [25, 21], [25, 22]])
    assert.equal(day.rotation.streak, null)
    assert.deepEqual(day.score, {})
    for (const p of players) assert.equal(day.matchCounts[p.id], 3)
  })
})

/* ------------------------------------------------- ninguem de fora 2x seguidas */

describe('ninguém fica de fora duas partidas seguidas', () => {
  for (const n of [13, 14, 15, 16, 17, 18]) {
    test(`${n} jogadores: 300 partidas com sorteios automáticos e manuais`, () => {
      const report = simulateDay(makeRoster(n, seeded(1000 + n)), seeded(2000 + n))
      assert.equal(report.maxConsecutiveBench, 1, 'alguém ficou de fora 2 partidas seguidas')
      assert.ok(report.streakRedraws > 0, 'a simulação precisa passar por sorteios automáticos')
      assert.ok(report.manualRedraws > 0, 'a simulação precisa passar por sorteios manuais')
    })
  }

  test('com 12 ou menos, ninguém fica de fora', () => {
    for (const n of [6, 9, 11, 12]) {
      const report = simulateDay(makeRoster(n, seeded(n)), seeded(n + 1), { matches: 120 })
      assert.equal(report.maxConsecutiveBench, 0, `${n} jogadores`)
    }
  })

  test('18 jogadores, 3 vitórias seguidas: quem estava de fora começa o novo sorteio em quadra', () => {
    const players = makeRoster(18, seeded(99))
    for (let round = 0; round < 40; round++) {
      let day = drawDay(EMPTY_DAY, players, TEAM_SIZE)
      let satOut = []
      while (day.lastEvent.type !== 'streak') {
        satOut = benchIds(day.rotation)
        const keep = day.rotation.streak?.number ?? day.rotation.court[0].number
        day = playMatch(day, keep, players, TEAM_SIZE)
      }
      const newBench = new Set(benchIds(day.rotation))
      assert.ok(satOut.every((id) => !newBench.has(id)), `rodada ${round}`)
    }
  })

  test('quando alguém chega e o app sorteia de novo, quem estava de fora começa jogando', () => {
    const everyone = makeRoster(18, seeded(77))
    const early = everyone.slice(0, 17)
    const rand = seeded(78)
    for (let round = 0; round < 30; round++) {
      let day = drawDay(EMPTY_DAY, early, TEAM_SIZE)
      for (let m = 0; m < 1 + Math.floor(rand() * 5); m++) {
        day = playMatch(day, day.rotation.court[Math.floor(rand() * 2)].number, early, TEAM_SIZE)
      }
      const satOut = day.satOutLast
      day = drawDay(day, everyone, TEAM_SIZE)
      const bench = new Set(benchIds(day.rotation))
      assert.ok(satOut.every((id) => !bench.has(id)), `rodada ${round}`)
    }
  })

  test('acima de 18 (dois times na fila) a espera máxima é de duas partidas', () => {
    for (const n of [19, 20, 24]) {
      const report = simulateDay(makeRoster(n, seeded(3000 + n)), seeded(4000 + n))
      assert.equal(report.maxQueueTeams, 2)
      assert.ok(report.maxConsecutiveBench <= 2, `${n} jogadores: esperou ${report.maxConsecutiveBench}`)
    }
  })
})

/* ------------------------------------------- partidas parecidas entre os jogadores */

describe('número de partidas parecido entre os jogadores', () => {
  const countsFor = (groups) => {
    const counts = {}
    for (const [list, value] of groups) for (const p of list) counts[p.id] = value
    return counts
  }

  test('propriedade: partidas antes do equilíbrio, cedendo até 1,5★ (2★ só quando necessário)', () => {
    const rand = seeded(2024)
    for (let round = 0; round < 500; round++) {
      const loser = makeRoster(6, rand, 'l')
      const winner = makeRoster(6, rand, 'w')
      const entering = makeRoster(1 + Math.floor(rand() * 5), rand, 'e')
      const waiting = makeRoster(Math.floor(rand() * 7), rand, 'q')
      const matchCounts = {}
      for (const p of [...loser, ...winner, ...entering, ...waiting]) matchCounts[p.id] = Math.floor(rand() * 8)
      const need = TEAM_SIZE - entering.length

      const { stay } = pickComplement({ loser, entering, opponent: winner, need, waiting, matchCounts })

      const gapOf = (group) => Math.abs(sum(entering) + sum(group) - sum(winner))
      const spreadOf = (group) => {
        const staying = new Set(ids(group))
        const counts = [
          ...[...winner, ...entering, ...group].map((p) => matchCounts[p.id] + 1),
          ...[...loser.filter((p) => !staying.has(p.id)), ...waiting].map((p) => matchCounts[p.id]),
        ]
        return Math.max(...counts) - Math.min(...counts)
      }
      const options = combinations(loser, need)
      const bestGap = Math.min(...options.map(gapOf))
      const soft = Math.max(BALANCE_LIMIT, bestGap)
      const hard = Math.max(BALANCE_LIMIT_HARD, bestGap)
      const fairestWithin = (limit) =>
        Math.min(...options.filter((o) => gapOf(o) <= limit + 1e-9).map(spreadOf))

      assert.ok(
        spreadOf(stay) <= fairestWithin(soft),
        `rodada ${round}: havia opção com partidas mais parelhas dentro de 1,5★`,
      )
      assert.ok(
        gapOf(stay) <= Math.max(hard, bestGap + BEGINNER_TOLERANCE) + 1e-9,
        `rodada ${round}: desequilibrou além do permitido (${gapOf(stay)}★)`,
      )
      if (gapOf(stay) > soft + 1e-9 && gapOf(stay) > bestGap + BEGINNER_TOLERANCE + 1e-9) {
        assert.ok(
          fairestWithin(hard) < fairestWithin(soft),
          `rodada ${round}: passou de 1,5★ sem deixar as partidas mais parelhas`,
        )
      }
    }
  })

  test('exemplo: quem jogou muito mais sai para descansar, mesmo custando 1,5★ de equilíbrio', () => {
    const loser = fixed('L', [5, 3, 3, 3, 3, 3])
    const entering = fixed('E', [3])
    const winner = fixed('W', [4, 3.5, 3, 3, 3, 3]) // 19,5★
    const matchCounts = { ...countsFor([[loser, 2], [entering, 2], [winner, 5]]), L0: 9 }

    const withCounts = pickComplement({ loser, entering, opponent: winner, need: 5, matchCounts })
    assert.deepEqual(ids(withCounts.leave), ['L0'], 'o jogador de 9 partidas deveria descansar')

    // Sem contar partidas, o equilíbrio (0,5★) manteria o de 5★ em quadra.
    const balanceOnly = pickComplement({ loser, entering, opponent: winner, need: 5 })
    assert.ok(!ids(balanceOnly.leave).includes('L0'))
  })

  test('exemplo: vai até 2★ quando só assim as partidas ficam mais parelhas', () => {
    const loser = fixed('L', [5, 3, 3, 3, 3, 3])
    const entering = fixed('E', [3])
    const winner = fixed('W', [5, 4, 3, 3, 3, 2]) // 20★: tirar o de 5★ deixa 2★ de diferença
    const matchCounts = { ...countsFor([[loser, 2], [entering, 2], [winner, 5]]), L0: 9 }
    const { leave } = pickComplement({ loser, entering, opponent: winner, need: 5, matchCounts })
    assert.deepEqual(ids(leave), ['L0'])
  })

  test('exemplo: o equilíbrio não cede além de 2★', () => {
    const loser = fixed('L', [5, 3, 3, 3, 3, 3])
    const entering = fixed('E', [3])
    const winner = fixed('W', [5, 4, 3, 3, 3, 2.5]) // 20,5★: tirar o de 5★ deixaria 2,5★
    const matchCounts = { ...countsFor([[loser, 2], [entering, 2], [winner, 5]]), L0: 9 }
    const { leave } = pickComplement({ loser, entering, opponent: winner, need: 5, matchCounts })
    assert.ok(!ids(leave).includes('L0'), 'não pode desequilibrar 2,5★')
  })

  test('sorteio com 13: quem jogou muito mais começa de fora, com times dentro de 1,5★', () => {
    const rand = seeded(31)
    let checked = 0
    for (let round = 0; round < 60; round++) {
      const players = makeRoster(13, rand)
      const tired = players[Math.floor(rand() * players.length)]
      const others = players.filter((p) => p !== tired)
      if (bestSpreadTwoTeams(others) > BALANCE_LIMIT) continue // elenco em que é impossível
      checked += 1

      const matchCounts = Object.fromEntries(players.map((p) => [p.id, 3]))
      matchCounts[tired.id] = 9
      const { teams, spread } = drawTeams({ players, teamSize: TEAM_SIZE, matchCounts })
      assert.deepEqual(ids(teams[2]), [tired.id], `rodada ${round}`)
      assert.ok(spread <= BALANCE_LIMIT, `rodada ${round}: ${spread}★ de diferença`)
    }
    assert.ok(checked >= 40)
  })

  test('sorteio com 18: o time de fora é formado por quem jogou mais', () => {
    const tired = fixed('T', [5, 4, 3, 3, 2, 1])
    const players = [...fixed('A', [5, 4, 3, 3, 2, 1]), ...fixed('B', [5, 4, 3, 3, 2, 1]), ...tired]
    const matchCounts = Object.fromEntries(players.map((p) => [p.id, tired.includes(p) ? 8 : 4]))
    for (let round = 0; round < 20; round++) {
      const { teams, spread } = drawTeams({ players, teamSize: TEAM_SIZE, matchCounts })
      assert.deepEqual(ids(teams[2]).sort(), ids(tired).sort(), `rodada ${round}`)
      assert.ok(spread <= BALANCE_LIMIT)
    }
  })
})
