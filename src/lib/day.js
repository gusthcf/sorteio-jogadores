/**
 * Estado do dia de jogo: sorteio atual, rotacao da quadra, contadores, placar e logs.
 *
 * Funcoes puras (recebem um "dia" e devolvem outro), usadas pelo App e pelos testes —
 * assim os testes exercitam exatamente as mesmas regras que rodam na tela.
 */

import { drawTeams } from './balance.js'
import { registerWinner, rotationPlayers, startRotation } from './rotation.js'
import { createId } from './storage.js'

export const EMPTY_DAY = {
  draw: null,
  rotation: null,
  matchCounts: {},
  matches: [],
  history: [],
  lastEvent: null,
  satOutLast: [], // ids de quem ficou de fora na ultima partida registrada
  score: {}, // placar da partida atual, por numero de time
}

const HISTORY_LIMIT = 25

/** Ids de quem esta esperando de fora na formacao atual. */
export const benchIds = (rotation) =>
  rotation ? rotation.queue.flatMap((team) => team.players.map((p) => p.id)) : []

/**
 * Faz um sorteio (inicial ou novo) mantendo contadores e log.
 * Quem ficou de fora na ultima partida e obrigado a comecar em quadra.
 */
export function drawDay(base, pool, teamSize) {
  const inPool = new Set(pool.map((p) => p.id))
  const drawn = drawTeams({
    players: pool,
    teamSize,
    excludedSignatures: new Set(base.history.map((entry) => entry.signature)),
    matchCounts: base.matchCounts,
    mustPlay: new Set(base.satOutLast.filter((id) => inPool.has(id))),
  })
  if (!drawn) return null

  return {
    ...base,
    draw: { ...drawn, teamSize },
    rotation: startRotation(drawn.teams),
    score: {},
    history: [
      {
        id: createId(),
        at: Date.now(),
        teams: drawn.teams,
        sums: drawn.sums,
        signature: drawn.signature,
        spread: drawn.spread,
        teamSize,
      },
      ...base.history,
    ].slice(0, HISTORY_LIMIT),
    lastEvent: { type: 'draw', spread: drawn.spread, exhausted: drawn.exhausted },
  }
}

/**
 * Registra o vencedor da partida atual. Conta +1 partida para quem estava em quadra,
 * guarda o placar e, se o time chegou a 3 vitorias seguidas, ja faz o novo sorteio.
 */
export function playMatch(base, winnerNumber, pool, teamSize) {
  if (!base.rotation) return base

  const satOutLast = benchIds(base.rotation)
  const out = registerWinner(base.rotation, winnerNumber, {
    teamSize: base.draw?.teamSize ?? teamSize,
    matchCounts: base.matchCounts,
  })

  const matchCounts = { ...base.matchCounts }
  for (const id of out.played) matchCounts[id] = (matchCounts[id] || 0) + 1

  const winnerScore = base.score[out.event.winner] || 0
  const loserScore = base.score[out.event.loser] || 0

  let next = {
    ...base,
    rotation: out.rotation,
    matchCounts,
    satOutLast,
    score: {},
    matches: [
      ...base.matches,
      {
        id: createId(),
        at: Date.now(),
        number: base.matches.length + 1,
        ...out.event,
        score: winnerScore || loserScore ? [winnerScore, loserScore] : null,
        redraw: out.needsRedraw,
      },
    ],
    lastEvent: { type: 'match', ...out.event },
  }

  if (out.needsRedraw) {
    const redrawPool = pool.length >= 2 ? pool : rotationPlayers(base.rotation)
    const redrawn = drawDay(next, redrawPool, teamSize)
    if (redrawn) {
      next = {
        ...redrawn,
        lastEvent: { type: 'streak', winner: out.event.winner, streak: out.event.streak },
      }
    }
  }

  return next
}

/** Um sorteio antigo nao pode voltar se colocaria de fora quem acabou de ficar de fora. */
export function wouldBenchAgain(entry, satOutLast) {
  if (!satOutLast.length) return false
  const sat = new Set(satOutLast)
  return entry.teams.slice(2).some((team) => team.some((p) => sat.has(p.id)))
}

export function restoreDraw(base, entry) {
  return {
    ...base,
    draw: {
      teams: entry.teams,
      sums: entry.sums,
      signature: entry.signature,
      spread: entry.spread,
      teamSize: entry.teamSize,
      exhausted: false,
    },
    rotation: startRotation(entry.teams),
    score: {},
    lastEvent: { type: 'restore' },
  }
}
