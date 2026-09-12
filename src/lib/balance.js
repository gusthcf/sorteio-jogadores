/**
 * Algoritmo de balanceamento dos times.
 *
 * FORMATO (regra da quadra): no maximo `teamSize` (6) por time.
 *   - Ate 12 presentes: dois times dividindo todo mundo (ex.: 11 -> 6 x 5).
 *   - Acima de 12: times cheios de 6 e a sobra em um ultimo time, que comeca de fora
 *     (13 -> 6·6·1 | 14 -> 6·6·2 | 18 -> 6·6·6 | 19 -> 6·6·6·1).
 *
 * PRIORIDADES, em ordem:
 *  1. Quem ficou de fora na ultima partida comeca em quadra (regra dura, `mustPlay`).
 *  2. Numero de partidas parecido entre todos: comeca de fora quem ja jogou mais.
 *     Para isso o equilibrio pode ceder ate BALANCE_LIMIT (1,5★) — ou BALANCE_LIMIT_HARD (2★)
 *     quando so assim a diferenca de partidas entre os jogadores diminui.
 *  3. Equilibrio dos times.
 *
 * Estrategia em tres camadas:
 *  1. SNAKE DRAFT   — ordena por estrelas (desc) e distribui em zigue-zague (1,2,3,3,2,1...).
 *  2. HILL CLIMBING — troca jogadores (1 por 1 e, quando trava, 2 por 2) enquanto isso melhorar
 *                     as prioridades acima.
 *  3. MULTI-START   — repete tudo centenas de vezes, partindo de pontos diferentes, e guarda a
 *                     melhor divisao inedita.
 *
 * O time incompleto de fora sera completado com jogadores do perdedor quando entrar.
 * Por isso ele e comparado pela sua FORCA PROJETADA: soma atual + vagas × media do grupo.
 */

/** Ate quantas estrelas um jogador e considerado iniciante (0,5 · 1 · 1,5). */
export const BEGINNER_MAX_RATING = 1.5

/** Quanto o equilibrio pode ceder para igualar o numero de partidas jogadas. */
export const BALANCE_LIMIT = 1.5
/** ...e em casos dificeis, quando so assim a diferenca de partidas diminui. */
export const BALANCE_LIMIT_HARD = 2

const COURT_TEAMS = 2
const EPSILON = 1e-9

// Pesos do otimizador: passar do limite de equilibrio > partidas jogadas > equilibrio fino.
const OVER_LIMIT_WEIGHT = 1e11
const FAIRNESS_WEIGHT = 1e5

// Protecao para celulares lentos: depois de um minimo de tentativas, para ao estourar o tempo.
const MIN_ATTEMPTS = 80
const TIME_BUDGET_MS = 160
// Com partidas jogadas, o ponto de partida "quem jogou mais fica de fora" ja chega perto do
// objetivo: menos tentativas bastam e o sorteio continua rapido no celular.
const FAIR_ATTEMPTS = 120

const NO_FAIRNESS_WINDOW = { limit: Infinity, fairest: Infinity }

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

/* ------------------------------------------------- partidas jogadas no dia */

/**
 * Diferenca entre quem mais e quem menos tera jogado depois da proxima partida
 * (`playing` ganha +1, `sitting` fica como esta).
 */
export function projectedPlaySpread(playing, sitting, matchCounts) {
  let max = -Infinity
  let min = Infinity
  for (const p of playing) {
    const c = (matchCounts[p.id] || 0) + 1
    if (c > max) max = c
    if (c < min) min = c
  }
  for (const p of sitting) {
    const c = matchCounts[p.id] || 0
    if (c > max) max = c
    if (c < min) min = c
  }
  return max === -Infinity ? 0 : max - min
}

/**
 * Ate onde o equilibrio pode ceder em nome das partidas jogadas.
 * Recebe opcoes `{ gap, spread }` (gap = diferenca de estrelas, spread = diferenca de partidas):
 *   - em regra, ate 1,5★ (ou o melhor equilibrio possivel, se nem isso existir);
 *   - ate 2★ somente se alguma opcao nessa faixa deixar as partidas mais parelhas.
 * Devolve o limite usado e a menor diferenca de partidas alcancavel dentro dele.
 */
export function fairnessWindow(options, bestGap) {
  const soft = Math.max(BALANCE_LIMIT, bestGap)
  const hard = Math.max(BALANCE_LIMIT_HARD, bestGap)
  const fairestWithin = (limit) => {
    let best = Infinity
    for (const o of options) if (o.gap <= limit + EPSILON && o.spread < best) best = o.spread
    return best
  }
  const softSpread = fairestWithin(soft)
  const hardSpread = fairestWithin(hard)
  return hardSpread < softSpread
    ? { limit: hard, fairest: hardSpread }
    : { limit: soft, fairest: softSpread }
}

/** Compara listas de criterios em ordem (menor vence). */
export function compareKeys(a, b) {
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    if (Math.abs(d) > EPSILON) return d
  }
  return 0
}

/* --------------------------------------------------------- equilibrio */

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
 * `limit` penaliza fortemente a diferenca entre times COMPLETOS acima do limite.
 * Os parametros opcionais simulam `sums[i] += di` e `sums[j] += dj` sem criar arrays —
 * esta funcao roda centenas de milhares de vezes por sorteio.
 */
function costOf(sums, pads, limit = Infinity, i = -1, di = 0, j = -1, dj = 0) {
  const n = sums.length
  let max = -Infinity
  let min = Infinity
  let maxFull = -Infinity
  let minFull = Infinity
  let total = 0
  for (let k = 0; k < n; k++) {
    const s = sums[k] + (k === i ? di : 0) + (k === j ? dj : 0)
    const v = s + pads[k]
    if (v > max) max = v
    if (v < min) min = v
    total += v
    if (pads[k] === 0) {
      if (s > maxFull) maxFull = s
      if (s < minFull) minFull = s
    }
  }
  const mean = total / n
  let variance = 0
  for (let k = 0; k < n; k++) {
    const d = sums[k] + pads[k] + (k === i ? di : 0) + (k === j ? dj : 0) - mean
    variance += d * d
  }
  const fullSpread = maxFull === -Infinity ? 0 : maxFull - minFull
  const over = fullSpread > limit + EPSILON ? fullSpread - limit : 0
  return over * OVER_LIMIT_WEIGHT + (max - min) * 1000 + variance
}

/**
 * Tenta trocar uma DUPLA de um time por uma dupla de outro. So e usada quando nenhuma
 * troca simples melhora mais: e o que tira o otimizador de "otimos locais".
 * Retorna `{ score, benchPlayed }` da troca feita, ou null se nenhuma dupla melhora.
 */
function tryPairSwap(teams, sums, pads, mustPlay, limit, counts, benchPlayed, current) {
  const played = (p) => (counts ? counts[p.id] || 0 : 0)
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const crossesBench = i < COURT_TEAMS && j >= COURT_TEAMS
      const A = teams[i]
      const B = teams[j]
      for (let x1 = 0; x1 < A.length; x1++) {
        for (let x2 = x1 + 1; x2 < A.length; x2++) {
          if (crossesBench && (mustPlay.has(A[x1].id) || mustPlay.has(A[x2].id))) continue
          const out = A[x1].rating + A[x2].rating
          const outPlayed = played(A[x1]) + played(A[x2])
          for (let y1 = 0; y1 < B.length; y1++) {
            for (let y2 = y1 + 1; y2 < B.length; y2++) {
              const delta = B[y1].rating + B[y2].rating - out
              const dBench = crossesBench ? outPlayed - played(B[y1]) - played(B[y2]) : 0
              if (delta === 0 && dBench === 0) continue
              const score =
                costOf(sums, pads, limit, i, delta, j, -delta) - (benchPlayed + dBench) * FAIRNESS_WEIGHT
              if (score < current - EPSILON) {
                ;[A[x1], B[y1]] = [B[y1], A[x1]]
                ;[A[x2], B[y2]] = [B[y2], A[x2]]
                sums[i] = r2(sums[i] + delta)
                sums[j] = r2(sums[j] - delta)
                return { score, benchPlayed: benchPlayed + dBench }
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
 * Refina por trocas: so aceita a troca que melhora. Preserva o tamanho dos times
 * e nunca manda para fora da quadra alguem de `mustPlay`.
 *
 * Com `fairness` ({ limit, counts }), o objetivo passa a ser, em ordem: nao passar do limite
 * de equilibrio, deixar de fora quem jogou mais partidas, e so entao equilibrar.
 */
function optimize(teams, sums, pads, mustPlay, fairness = null, maxRounds = 24) {
  const limit = fairness ? fairness.limit : Infinity
  const counts = fairness ? fairness.counts : null
  const played = (p) => (counts ? counts[p.id] || 0 : 0)

  let benchPlayed = 0
  if (counts) {
    for (let t = COURT_TEAMS; t < teams.length; t++) for (const p of teams[t]) benchPlayed += played(p)
  }
  let current = costOf(sums, pads, limit) - benchPlayed * FAIRNESS_WEIGHT

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
            const dBench = crossesBench ? played(a) - played(b) : 0
            if (delta === 0 && dBench === 0) continue
            if (crossesBench && mustPlay.has(a.id)) continue
            const score =
              costOf(sums, pads, limit, i, delta, j, -delta) - (benchPlayed + dBench) * FAIRNESS_WEIGHT
            if (score < current - EPSILON) {
              teams[i][x] = b
              teams[j][y] = a
              sums[i] = r2(sums[i] + delta)
              sums[j] = r2(sums[j] - delta)
              benchPlayed += dBench
              current = score
              improved = true
            }
          }
        }
      }
    }
    if (improved) continue
    if (!counts && current < EPSILON) break // equilibrio perfeito
    const pair = tryPairSwap(teams, sums, pads, mustPlay, limit, counts, benchPlayed, current)
    if (!pair) break
    current = pair.score
    benchPlayed = pair.benchPlayed
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
          const cost = costOf(sums, pads, Infinity, q, delta, c, -delta)
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
 * Ponto de partida pensado nas partidas: quem jogou mais vai para a fila (sem quebrar a regra
 * de quem precisa jogar) e o restante e dividido em quadra pelo snake draft.
 */
function fairStart(players, sizes, matchCounts, mustPlay) {
  const benchSize = sizes.slice(COURT_TEAMS).reduce((a, b) => a + b, 0)
  const pool = shuffle(players.slice())
  const byPlayed = (a, b) => (matchCounts[b.id] || 0) - (matchCounts[a.id] || 0)
  const ordered = [
    ...pool.filter((p) => !mustPlay.has(p.id)).sort(byPlayed),
    ...pool.filter((p) => mustPlay.has(p.id)),
  ]
  const bench = ordered.slice(0, benchSize)
  const court = ordered.slice(benchSize)
  return [
    ...buildCandidate(court, sizes.slice(0, COURT_TEAMS)),
    ...buildCandidate(bench, sizes.slice(COURT_TEAMS)),
  ]
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
    playSpread: projectedPlaySpread(
      teams.slice(0, COURT_TEAMS).flat(),
      teams.slice(COURT_TEAMS).flat(),
      matchCounts,
    ),
    spread: fullSums.length ? r2(Math.max(...fullSums) - Math.min(...fullSums)) : 0,
    signature: signatureOf(teams),
  }
}

/**
 * Escolhe a melhor divisao entre as candidatas. Criterios, em ordem:
 *  1. ninguem que ficou de fora na ultima partida comeca de fora de novo;
 *  2. a menor diferenca de partidas alcancavel dentro do limite de equilibrio (1,5★ / 2★);
 *  3. respeitar esse limite;
 *  4. de fora fica quem ja jogou mais partidas;
 *  5. equilibrio;
 *  6. desempate: menos iniciantes esperando de fora.
 * Sem partidas jogadas ainda, os criterios 2 a 4 empatam e vale o equilibrio puro.
 */
function pickDraw(candidates, fair) {
  if (!candidates.length) return null
  const fewest = Math.min(...candidates.map((c) => c.violations))
  const pool = candidates.filter((c) => c.violations === fewest)

  const window = fair
    ? fairnessWindow(
        pool.map((c) => ({ gap: c.spread, spread: c.playSpread })),
        Math.min(...pool.map((c) => c.spread)),
      )
    : NO_FAIRNESS_WINDOW

  const keyOf = (c) => [
    c.playSpread <= window.fairest + EPSILON ? 0 : 1,
    c.spread <= window.limit + EPSILON ? 0 : 1,
    -c.benchPlayed,
    c.cost,
    c.benchBeginners,
  ]

  let best = null
  let bestKey = null
  for (const candidate of pool) {
    const key = keyOf(candidate)
    if (!best || compareKeys(key, bestKey) < 0) {
      best = candidate
      bestKey = key
    }
  }
  return best
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

  // Partidas so pesam quando alguem vai ficar de fora e o dia ja comecou.
  const fair = sizes.length > COURT_TEAMS && list.some((p) => (matchCounts[p.id] || 0) > 0)

  const all = []
  const fresh = [] // divisoes ainda ineditas no dia

  const maxAttempts = fair ? Math.min(attempts, FAIR_ATTEMPTS) : attempts
  let started = now()
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt >= MIN_ATTEMPTS && now() - started > TIME_BUDGET_MS) break

    // Pontos de partida variados evitam cair sempre no mesmo otimo local.
    const kind = attempt % 3
    const start =
      fair && kind === 0
        ? fairStart(list, sizes, matchCounts, mustPlay)
        : kind === 2
          ? randomPartition(list, sizes)
          : buildCandidate(list, sizes)

    const teams = orderForCourt(start, sizes, matchCounts, mustPlay)
    const sums = teams.map(sumOf)
    enforceMustPlay(teams, sums, pads, mustPlay)
    const fairness = fair
      ? { limit: attempt % 2 ? BALANCE_LIMIT_HARD : BALANCE_LIMIT, counts: matchCounts }
      : null
    optimize(teams, sums, pads, mustPlay, fairness)

    const candidate = evaluate(teams, pads, matchCounts, mustPlay)
    all.push(candidate)
    if (!excludedSignatures.has(candidate.signature)) fresh.push(candidate)
  }

  let best = pickDraw(fresh, fair)

  // Busca relaxada: com elencos pequenos o otimizador converge sempre para as mesmas
  // divisoes. Se todas ja sairam, aceita a melhor divisao INEDITA mesmo menos equilibrada.
  if (!best) {
    const relaxed = []
    started = now()
    for (let attempt = 0; attempt < attempts * 3; attempt++) {
      if (attempt >= MIN_ATTEMPTS && now() - started > TIME_BUDGET_MS) break
      const teams = orderForCourt(randomPartition(list, sizes), sizes, matchCounts, mustPlay)
      const sums = teams.map(sumOf)
      enforceMustPlay(teams, sums, pads, mustPlay)
      const candidate = evaluate(teams, pads, matchCounts, mustPlay)
      if (!excludedSignatures.has(candidate.signature)) relaxed.push(candidate)
    }
    best = pickDraw(relaxed, fair)
  }

  const chosen = best || pickDraw(all, fair)
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
