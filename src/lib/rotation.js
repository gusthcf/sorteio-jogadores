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

import { BEGINNER_MAX_RATING, sortTeam } from './balance.js'

export const WINS_FOR_REDRAW = 3

/**
 * Margem (em estrelas) sobre o melhor equilibrio possivel dentro da qual o app
 * prefere manter iniciantes (ate BEGINNER_MAX_RATING) em quadra — eles precisam jogar mais.
 */
export const BEGINNER_TOLERANCE = 1

const r2 = (n) => Math.round(n * 100) / 100
const sumOf = (players) => r2(players.reduce((acc, p) => acc + p.rating, 0))

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
 *
 *  1. Calcula, para cada combinacao possivel, a diferenca de estrelas contra o vencedor.
 *  2. Considera "equilibradas" as combinacoes ate BEGINNER_TOLERANCE acima da melhor.
 *  3. Entre elas, fica quem mantem MAIS iniciantes (0,5 · 1 · 1,5★) em quadra.
 *  4. Depois vale o melhor equilibrio; empates: menos estrelas, depois quem jogou menos.
 */
export function pickComplement({ loser, entering, opponent, need, matchCounts = {} }) {
  if (need <= 0) return { stay: [], leave: loser.slice() }
  if (need >= loser.length) return { stay: loser.slice(), leave: [] }

  const target = sumOf(opponent)
  const base = sumOf(entering)

  const options = combinations(loser, need).map((stay) => {
    const stars = sumOf(stay)
    return {
      stay,
      stars,
      gap: r2(Math.abs(base + stars - target)),
      beginners: stay.filter((p) => p.rating <= BEGINNER_MAX_RATING).length,
      played: stay.reduce((acc, p) => acc + (matchCounts[p.id] || 0), 0),
      tiebreak: Math.random(),
    }
  })

  const bestGap = Math.min(...options.map((o) => o.gap))
  const eligible = options.filter((o) => o.gap <= bestGap + BEGINNER_TOLERANCE + 1e-9)
  eligible.sort(
    (a, b) =>
      b.beginners - a.beginners ||
      a.gap - b.gap ||
      a.stars - b.stars ||
      a.played - b.played ||
      a.tiebreak - b.tiebreak,
  )

  const stayIds = new Set(eligible[0].stay.map((p) => p.id))
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
      matchCounts,
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
