/**
 * Algoritmo de balanceamento dos times.
 *
 * FORMATO (regra da quadra): no maximo `teamSize` (6) por time.
 *   - Ate 12 presentes: dois times dividindo todo mundo (ex.: 11 -> 6 x 5).
 *   - Acima de 12: times cheios de 6 e a sobra em um ultimo time, que comeca de fora
 *     (13 -> 6·6·1 | 14 -> 6·6·2 | 18 -> 6·6·6 | 19 -> 6·6·6·1).
 *
 * Estrategia em tres camadas:
 *  1. SNAKE DRAFT   — ordena por estrelas (desc) e distribui em zigue-zague (1,2,3,3,2,1...).
 *  2. HILL CLIMBING — troca jogadores (1 por 1 e, quando trava, 2 por 2) enquanto isso reduzir
 *                     o desequilibrio.
 *  3. MULTI-START   — repete tudo centenas de vezes, partindo de pontos diferentes, e guarda a
 *                     melhor divisao inedita.
 *
 * Restricao dura (`mustPlay`): quem ficou de fora na ultima partida comeca em quadra.
 * E isso que impede alguem de ficar de fora duas partidas seguidas depois de um novo sorteio.
 *
 * O time incompleto de fora sera completado com jogadores do perdedor quando entrar.
 * Por isso ele e comparado pela sua FORCA PROJETADA: soma atual + vagas × media do grupo.
 */

/** Ate quantas estrelas um jogador e considerado iniciante (0,5 · 1 · 1,5). */
export const BEGINNER_MAX_RATING = 1.5

const COURT_TEAMS = 2
const EPSILON = 1e-9

// Protecao para celulares lentos: depois de um minimo de tentativas, para ao estourar o tempo.
const MIN_ATTEMPTS = 80
const TIME_BUDGET_MS = 160

const r2 = (n) => Math.round(n * 100) / 100
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

function shuffle(arr) {
  // Fisher-Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const range = (n) => Array.from({ length: n }, (_, i) => i)
const sumOf = (team) => r2(team.reduce((acc, p) => acc + p.rating, 0))

/** Tamanho de cada time, na ordem de entrada em quadra. */
export function rotationSizes(total, teamSize = 6) {
  if (total < 2) return []
  if (total <= teamSize * 2) return [Math.ceil(total / 2), Math.floor(total / 2)]
  const full = Math.floor(total / teamSize)
  const rest = total % teamSize
  const sizes = new Array(full).fill(teamSize)
  if (rest) sizes.push(rest)
  return sizes
}

/** Sequencia de escolhas em zigue-zague, pulando times que ja encheram. */
function snakeOrder(numTeams, total, sizes) {
  const seq = []
  const filled = new Array(numTeams).fill(0)
  let forward = true
  while (seq.length < total) {
    const row = forward ? range(numTeams) : range(numTeams).reverse()
    for (const t of row) {
      if (seq.length >= total) break
      if (filled[t] < sizes[t]) {
        seq.push(t)
        filled[t] += 1
      }
    }
    forward = !forward
  }
  return seq
}

/**
 * Custo do desequilibrio. Menor = melhor.
 * `pads` soma a forca esperada das vagas que serao completadas depois.
 * Os parametros opcionais simulam `sums[i] += di` e `sums[j] += dj` sem criar arrays —
 * esta funcao roda centenas de milhares de vezes por sorteio.
 */
function costOf(sums, pads, i = -1, di = 0, j = -1, dj = 0) {
  const n = sums.length
  let max = -Infinity
  let min = Infinity
  let total = 0
  for (let k = 0; k < n; k++) {
    const v = sums[k] + pads[k] + (k === i ? di : 0) + (k === j ? dj : 0)
    if (v > max) max = v
    if (v < min) min = v
    total += v
  }
  const mean = total / n
  let variance = 0
  for (let k = 0; k < n; k++) {
    const d = sums[k] + pads[k] + (k === i ? di : 0) + (k === j ? dj : 0) - mean
    variance += d * d
  }
  return (max - min) * 1000 + variance
}

/**
 * Tenta trocar uma DUPLA de um time por uma dupla de outro. So e usada quando nenhuma
 * troca simples melhora mais: e o que tira o otimizador de "otimos locais" (divisoes em
 * que trocar 1 por 1 nao ajuda, mas 2 por 2 chega no equilibrio perfeito).
 * Retorna o novo custo, ou null se nenhuma dupla melhora.
 */
function tryPairSwap(teams, sums, pads, mustPlay, current) {
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const crossesBench = i < COURT_TEAMS && j >= COURT_TEAMS
      const A = teams[i]
      const B = teams[j]
      for (let x1 = 0; x1 < A.length; x1++) {
        for (let x2 = x1 + 1; x2 < A.length; x2++) {
          if (crossesBench && (mustPlay.has(A[x1].id) || mustPlay.has(A[x2].id))) continue
          const out = A[x1].rating + A[x2].rating
          for (let y1 = 0; y1 < B.length; y1++) {
            for (let y2 = y1 + 1; y2 < B.length; y2++) {
              const delta = B[y1].rating + B[y2].rating - out
              if (delta === 0) continue
              const cost = costOf(sums, pads, i, delta, j, -delta)
              if (cost < current - EPSILON) {
                ;[A[x1], B[y1]] = [B[y1], A[x1]]
                ;[A[x2], B[y2]] = [B[y2], A[x2]]
                sums[i] = r2(sums[i] + delta)
                sums[j] = r2(sums[j] - delta)
                return cost
              }
            }
          }
        }
      }
    }
  }
  return null
}

/**
 * Refina por trocas: so aceita a troca que diminui o custo. Preserva o tamanho dos times
 * e nunca manda para fora da quadra alguem de `mustPlay`.
 * Primeiro trocas 1 por 1 (baratas); quando elas esgotam, uma troca 2 por 2 para destravar.
 */
function optimize(teams, sums, pads, mustPlay, maxRounds = 24) {
  let current = costOf(sums, pads)

  for (let round = 0; round < maxRounds; round++) {
    let improved = false
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const crossesBench = i < COURT_TEAMS && j >= COURT_TEAMS
        for (let x = 0; x < teams[i].length; x++) {
          for (let y = 0; y < teams[j].length; y++) {
            const a = teams[i][x]
            const b = teams[j][y]
            const delta = b.rating - a.rating
            if (delta === 0) continue
            if (crossesBench && mustPlay.has(a.id)) continue
            const cost = costOf(sums, pads, i, delta, j, -delta)
            if (cost < current - EPSILON) {
              teams[i][x] = b
              teams[j][y] = a
              sums[i] = r2(sums[i] + delta)
              sums[j] = r2(sums[j] - delta)
              current = cost
              improved = true
            }
          }
        }
      }
    }
    if (improved) continue
    if (current < EPSILON) break // equilibrio perfeito
    const pairCost = tryPairSwap(teams, sums, pads, mustPlay, current)
    if (pairCost === null) break
    current = pairCost
  }
}

/** Traz para a quadra quem nao pode ficar de fora de novo, trocando pela opcao mais equilibrada. */
function enforceMustPlay(teams, sums, pads, mustPlay) {
  if (!mustPlay.size) return
  for (let q = COURT_TEAMS; q < teams.length; q++) {
    for (let x = 0; x < teams[q].length; x++) {
      const waiting = teams[q][x]
      if (!mustPlay.has(waiting.id)) continue

      let best = null
      for (let c = 0; c < COURT_TEAMS; c++) {
        for (let y = 0; y < teams[c].length; y++) {
          const candidate = teams[c][y]
          if (mustPlay.has(candidate.id)) continue
          const delta = candidate.rating - waiting.rating
          const cost = costOf(sums, pads, q, delta, c, -delta)
          if (!best || cost < best.cost) best = { c, y, delta, cost }
        }
      }
      if (!best) return // a quadra ja esta toda ocupada por quem precisa jogar

      teams[q][x] = teams[best.c][best.y]
      teams[best.c][best.y] = waiting
      sums[q] = r2(sums[q] + best.delta)
      sums[best.c] = r2(sums[best.c] - best.delta)
    }
  }
}

/**
 * Identidade unica de uma divisao de times, independente da ordem dos times
 * e da ordem dos jogadores dentro deles. E a chave da regra anti-repeticao.
 */
export function signatureOf(teams) {
  return teams
    .map((team) => team.map((p) => p.id).sort().join('~'))
    .sort()
    .join('|')
}

function buildCandidate(players, sizes) {
  const pool = shuffle(players.slice()).sort((a, b) => b.rating - a.rating)
  // Embaralha quem "escolhe primeiro" no draft para variar as divisoes.
  const pickOrder = shuffle(range(sizes.length))
  const shuffledSizes = pickOrder.map((t) => sizes[t])
  const seq = snakeOrder(sizes.length, pool.length, shuffledSizes)
  const teams = sizes.map(() => [])
  pool.forEach((player, index) => teams[pickOrder[seq[index]]].push(player))
  return teams
}

function randomPartition(players, sizes) {
  const pool = shuffle(players.slice())
  let cursor = 0
  return sizes.map((size) => {
    const team = pool.slice(cursor, cursor + size)
    cursor += size
    return team
  })
}

/**
 * Ordem de entrada entre os times cheios: primeiro quem tem gente que PRECISA jogar,
 * depois quem jogou menos partidas no dia. O time incompleto e sempre o ultimo da fila.
 */
function orderForCourt(teams, sizes, matchCounts, mustPlay) {
  if (sizes.length <= COURT_TEAMS) return teams
  const partialIndex = sizes[sizes.length - 1] < sizes[0] ? sizes.length - 1 : -1
  const full = shuffle(teams.filter((_, i) => i !== partialIndex)).map((team) => ({
    team,
    needs: team.reduce((acc, p) => acc + (mustPlay.has(p.id) ? 1 : 0), 0),
    played: team.reduce((acc, p) => acc + (matchCounts[p.id] || 0), 0),
  }))
  full.sort((a, b) => b.needs - a.needs || a.played - b.played)
  const ordered = full.map((entry) => entry.team)
  return partialIndex >= 0 ? [...ordered, teams[partialIndex]] : ordered
}

/** Pontua uma divisao ja ordenada. */
function evaluate(teams, pads, matchCounts, mustPlay) {
  const sums = teams.map(sumOf)
  let violations = 0
  let benchBeginners = 0
  let benchPlayed = 0

  for (let t = COURT_TEAMS; t < teams.length; t++) {
    for (const p of teams[t]) {
      if (mustPlay.has(p.id)) violations += 1
      if (p.rating <= BEGINNER_MAX_RATING) benchBeginners += 1
      benchPlayed += matchCounts[p.id] || 0
    }
  }

  const fullSums = sums.filter((_, i) => !(pads[i] > 0))
  return {
    teams,
    sums,
    cost: costOf(sums, pads),
    violations,
    benchBeginners,
    benchPlayed,
    spread: fullSums.length ? r2(Math.max(...fullSums) - Math.min(...fullSums)) : 0,
    signature: signatureOf(teams),
  }
}

/**
 * Criterios, em ordem:
 *  1. ninguem que ficou de fora na ultima partida comeca de fora de novo;
 *  2. equilibrio;
 *  3. desempate: menos iniciantes esperando de fora;
 *  4. desempate: de fora fica quem ja jogou mais partidas no dia.
 */
function isBetter(a, b) {
  if (!b) return true
  if (a.violations !== b.violations) return a.violations < b.violations
  if (Math.abs(a.cost - b.cost) > EPSILON) return a.cost < b.cost
  if (a.benchBeginners !== b.benchBeginners) return a.benchBeginners < b.benchBeginners
  return a.benchPlayed > b.benchPlayed
}

/**
 * Sorteia os times ja na ordem de entrada em quadra.
 *
 * @param {object}  options
 * @param {Array}   options.players             jogadores presentes ({ id, name, rating })
 * @param {number}  options.teamSize            maximo de jogadores por time (padrao 6)
 * @param {Set}     options.excludedSignatures  divisoes que ja sairam nesta sessao
 * @param {object}  options.matchCounts         partidas jogadas por jogador no dia
 * @param {Set}     options.mustPlay            ids que ficaram de fora na ultima partida
 * @returns {{teams, sums, signature, spread, exhausted} | null}
 *          teams[0] e teams[1] comecam em quadra; o resto e a fila, em ordem.
 */
export function drawTeams({
  players,
  teamSize = 6,
  excludedSignatures = new Set(),
  matchCounts = {},
  mustPlay = new Set(),
  attempts = 300,
}) {
  const list = (players || []).filter(Boolean)
  const sizes = rotationSizes(list.length, teamSize)
  if (sizes.length < 2) return null

  // Forca esperada das vagas do time incompleto de fora.
  const mean = list.reduce((acc, p) => acc + p.rating, 0) / list.length
  const pads = sizes.map((size) =>
    sizes.length > COURT_TEAMS && size < teamSize ? (teamSize - size) * mean : 0,
  )

  let best = null // melhor divisao ainda inedita
  let fallback = null // melhor divisao no geral (usada se tudo ja saiu)

  let started = now()
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt >= MIN_ATTEMPTS && now() - started > TIME_BUDGET_MS) break
    // A cada 3 tentativas, parte de uma divisao aleatoria em vez do snake draft: comecar
    // de lugares diferentes evita cair sempre no mesmo otimo local.
    const start = attempt % 3 === 2 ? randomPartition(list, sizes) : buildCandidate(list, sizes)
    const teams = orderForCourt(start, sizes, matchCounts, mustPlay)
    const sums = teams.map(sumOf)
    enforceMustPlay(teams, sums, pads, mustPlay)
    optimize(teams, sums, pads, mustPlay)
    const candidate = evaluate(teams, pads, matchCounts, mustPlay)

    if (isBetter(candidate, fallback)) fallback = candidate
    if (!excludedSignatures.has(candidate.signature) && isBetter(candidate, best)) best = candidate
  }

  // Busca relaxada: com elencos pequenos o otimizador converge sempre para as mesmas
  // divisoes. Se todas ja sairam, aceita a melhor divisao INEDITA mesmo menos equilibrada.
  if (!best) {
    started = now()
    for (let attempt = 0; attempt < attempts * 3; attempt++) {
      if (attempt >= MIN_ATTEMPTS && now() - started > TIME_BUDGET_MS) break
      const teams = orderForCourt(randomPartition(list, sizes), sizes, matchCounts, mustPlay)
      const sums = teams.map(sumOf)
      enforceMustPlay(teams, sums, pads, mustPlay)
      const candidate = evaluate(teams, pads, matchCounts, mustPlay)
      if (excludedSignatures.has(candidate.signature)) continue
      if (isBetter(candidate, best)) best = candidate
    }
  }

  const chosen = best || fallback
  const teams = chosen.teams.map(sortTeam)

  return {
    teams,
    sums: teams.map(sumOf),
    signature: chosen.signature,
    spread: chosen.spread,
    exhausted: !best, // todas as divisoes possiveis ja apareceram no historico
  }
}

export function sortTeam(team) {
  return team.slice().sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, 'pt-BR'))
}

/** Rotulo de qualidade do equilibrio. */
export function balanceLabel(spread) {
  if (spread === 0) return { text: 'Equilíbrio perfeito', tone: 'great' }
  if (spread <= 0.5) return { text: 'Times muito equilibrados', tone: 'great' }
  if (spread <= 1) return { text: 'Times equilibrados', tone: 'good' }
  if (spread <= 2) return { text: 'Equilíbrio aceitável', tone: 'ok' }
  return { text: 'Diferença notável entre os times', tone: 'warn' }
}
