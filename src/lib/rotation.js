/**
 * Controle das partidas do dia ("rei da quadra").
 *
 *  - Dois times em quadra; os demais esperam numa fila, em ordem (Time 3, Time 4...).
 *  - Quem vence continua. O primeiro da fila entra no lugar de quem perdeu.
 *  - Se o time que entra estiver incompleto, ele e completado com jogadores do perdedor.
 *    O resto do perdedor vai para o fim da fila, mantendo o numero do time.
 *  - Se nao houver ninguem de fora, os mesmos dois times seguem jogando.
 *  - O mesmo time vencendo WINS_FOR_REDRAW vezes seguidas dispara um novo sorteio.
 *
 * Com ate um time na fila (ate 18 jogadores), quem espera entra SEMPRE na partida seguinte:
 * ninguem fica de fora duas partidas seguidas.
 */

import {
  BEGINNER_MAX_RATING,
  compareKeys,
  fairnessWindow,
  projectedPlaySpread,
  sortTeam,
} from './balance.js'

export const WINS_FOR_REDRAW = 3

/**
 * Margem (em estrelas) sobre o melhor equilibrio possivel dentro da qual o app
 * prefere manter iniciantes (ate BEGINNER_MAX_RATING) em quadra — eles precisam jogar mais.
 */
export const BEGINNER_TOLERANCE = 1

const r2 = (n) => Math.round(n * 100) / 100
const sumOf = (players) => r2(players.reduce((acc, p) => acc + p.rating, 0))
const EPSILON = 1e-9
const NOT_ALLOWED = Number.MAX_SAFE_INTEGER

/** Monta a rotacao a partir de um sorteio (times ja na ordem de entrada). */
export function startRotation(orderedTeams) {
  const teams = orderedTeams.map((players, index) => ({
    number: index + 1,
    players,
    joined: [], // ids de quem veio de outro time para completar este
    joinedFrom: null,
  }))
  return {
    court: teams.slice(0, 2),
    queue: teams.slice(2),
    streak: null, // { number, count }
  }
}

export const rotationPlayers = (rotation) =>
  rotation ? [...rotation.court, ...rotation.queue].flatMap((team) => team.players) : []

/** Todas as combinacoes de `k` elementos de `items`. */
export function combinations(items, k) {
  const result = []
  const pick = (start, acc) => {
    if (acc.length === k) {
      result.push(acc.slice())
      return
    }
    for (let i = start; i <= items.length - (k - acc.length); i++) {
      acc.push(items[i])
      pick(i + 1, acc)
      acc.pop()
    }
  }
  pick(0, [])
  return result
}

/**
 * Escolhe quais jogadores do perdedor continuam em quadra para completar o time que entra.
 * Criterios, em ordem:
 *
 *  1. PARTIDAS PARECIDAS: a menor diferenca entre quem mais e quem menos tera jogado,
 *     cedendo ate 1,5★ de equilibrio (2★ so quando isso deixa as partidas mais parelhas).
 *  2. INICIANTES (0,5 · 1 · 1,5★): o maximo deles em quadra, custando ate BEGINNER_TOLERANCE
 *     sobre o melhor equilibrio possivel.
 *  3. Continua quem jogou menos partidas no dia (dentro do mesmo limite de equilibrio).
 *  4. Equilibrio; depois menos estrelas; depois sorteio.
 *
 * Antes de alguem jogar (contadores zerados), 1 e 3 empatam e valem as regras antigas.
 */
export function pickComplement({ loser, entering, opponent, need, waiting = [], matchCounts = {} }) {
  if (need <= 0) return { stay: [], leave: loser.slice() }
  if (need >= loser.length) return { stay: loser.slice(), leave: [] }

  const target = sumOf(opponent)
  const base = sumOf(entering)
  const playingAnyway = [...opponent, ...entering]
  const fair = [...loser, ...playingAnyway, ...waiting].some((p) => (matchCounts[p.id] || 0) > 0)

  const options = combinations(loser, need).map((stay) => {
    const stayIds = new Set(stay.map((p) => p.id))
    const leave = loser.filter((p) => !stayIds.has(p.id))
    const stars = sumOf(stay)
    return {
      stay,
      stars,
      gap: r2(Math.abs(base + stars - target)),
      beginners: stay.filter((p) => p.rating <= BEGINNER_MAX_RATING).length,
      spread: fair ? projectedPlaySpread([...playingAnyway, ...stay], [...leave, ...waiting], matchCounts) : 0,
      load: stay.reduce((acc, p) => acc + (matchCounts[p.id] || 0), 0),
      tiebreak: Math.random(),
    }
  })

  const bestGap = Math.min(...options.map((o) => o.gap))
  const window = fair ? fairnessWindow(options, bestGap) : { limit: Infinity, fairest: Infinity }
  const beginnerLimit = bestGap + BEGINNER_TOLERANCE

  const keyOf = (o) => [
    o.spread <= window.fairest + EPSILON ? 0 : 1,
    o.gap <= beginnerLimit + EPSILON ? -o.beginners : 0,
    o.gap <= window.limit + EPSILON ? o.load : NOT_ALLOWED,
    o.gap,
    o.stars,
    o.tiebreak,
  ]

  let chosen = options[0]
  let chosenKey = keyOf(chosen)
  for (const option of options.slice(1)) {
    const key = keyOf(option)
    if (compareKeys(key, chosenKey) < 0) {
      chosen = option
      chosenKey = key
    }
  }

  const stayIds = new Set(chosen.stay.map((p) => p.id))
  return {
    stay: loser.filter((p) => stayIds.has(p.id)),
    leave: loser.filter((p) => !stayIds.has(p.id)),
  }
}

/**
 * Registra o vencedor da partida atual e calcula a proxima formacao.
 *
 * @returns {{ rotation, played, event, needsRedraw }}
 *   played: ids de todos que estavam em quadra (contam +1 partida)
 *   event:  descricao do que mudou, para o log e para o aviso na tela
 */
export function registerWinner(rotation, winnerNumber, { teamSize = 6, matchCounts = {} } = {}) {
  const [first, second] = rotation.court
  const winnerSlot = first.number === winnerNumber ? 0 : 1
  const winner = rotation.court[winnerSlot]
  const loser = rotation.court[1 - winnerSlot]

  const count = rotation.streak?.number === winner.number ? rotation.streak.count + 1 : 1
  const played = [...first.players, ...second.players].map((p) => p.id)

  // Os contadores ja incluem a partida que acabou de terminar.
  const countsAfter = { ...matchCounts }
  for (const id of played) countsAfter[id] = (countsAfter[id] || 0) + 1

  const event = {
    winner: winner.number,
    loser: loser.number,
    streak: count,
    entered: null,
    stayed: [],
  }

  const cleanWinner = { ...winner, joined: [], joinedFrom: null }
  let court
  let queue

  if (!rotation.queue.length) {
    // Ninguem de fora: os mesmos times seguem.
    court = [cleanWinner, { ...loser, joined: [], joinedFrom: null }]
    if (winnerSlot === 1) court.reverse()
    queue = []
  } else {
    const [entering, ...rest] = rotation.queue
    const need = Math.max(0, teamSize - entering.players.length)
    const { stay, leave } = pickComplement({
      loser: loser.players,
      entering: entering.players,
      opponent: winner.players,
      need,
      waiting: rest.flatMap((team) => team.players),
      matchCounts: countsAfter,
    })

    const completed = {
      number: entering.number,
      players: sortTeam([...entering.players, ...stay]),
      joined: stay.map((p) => p.id),
      joinedFrom: stay.length ? loser.number : null,
    }

    // O vencedor mantem o lado da quadra; quem entra ocupa o lado do perdedor.
    court = winnerSlot === 0 ? [cleanWinner, completed] : [completed, cleanWinner]
    queue = leave.length
      ? [...rest, { number: loser.number, players: leave, joined: [], joinedFrom: null }]
      : rest

    event.entered = entering.number
    event.stayed = stay.map((p) => p.name)
  }

  return {
    rotation: { court, queue, streak: { number: winner.number, count } },
    played,
    event,
    needsRedraw: count >= WINS_FOR_REDRAW,
  }
}
