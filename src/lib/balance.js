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
 *  2. HILL CLIMBING — troca pares de jogadores entre times enquanto isso reduzir o desequilibrio.
 *  3. MULTI-START   — repete tudo centenas de vezes e guarda a melhor divisao inedita.
 *
 * O time incompleto de fora sera completado com jogadores do perdedor quando entrar.
 * Por isso ele e comparado pela sua FORCA PROJETADA: soma atual + vagas × media do grupo.
 */

const r2 = (n) => Math.round(n * 100) / 100
const EPSILON = 1e-9

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
 */
function costOf(sums, pads) {
  let max = -Infinity
  let min = Infinity
  let total = 0
  const values = sums.map((s, i) => s + pads[i])
  for (const v of values) {
    if (v > max) max = v
    if (v < min) min = v
    total += v
  }
  const mean = total / values.length
  let variance = 0
  for (const v of values) variance += (v - mean) ** 2
  return (max - min) * 1000 + variance
}

/** Refina por trocas: so aceita a troca que diminui o custo. Preserva o tamanho dos times. */
function optimize(teams, sums, pads, maxRounds = 14) {
  let rounds = 0
  let improved = true
  let current = costOf(sums, pads)

  while (improved && rounds < maxRounds) {
    improved = false
    rounds += 1
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        for (let x = 0; x < teams[i].length; x++) {
          for (let y = 0; y < teams[j].length; y++) {
            const delta = teams[j][y].rating - teams[i][x].rating
            if (delta === 0) continue
            const trial = sums.slice()
            trial[i] = r2(trial[i] + delta)
            trial[j] = r2(trial[j] - delta)
            const cost = costOf(trial, pads)
            if (cost < current - EPSILON) {
              const tmp = teams[i][x]
              teams[i][x] = teams[j][y]
              teams[j][y] = tmp
              sums[i] = trial[i]
              sums[j] = trial[j]
              current = cost
              improved = true
            }
          }
        }
      }
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

const playedBy = (team, matchCounts) => team.reduce((acc, p) => acc + (matchCounts[p.id] || 0), 0)

/**
 * Ordem de entrada: entre os times cheios, quem jogou MENOS partidas no dia comeca em quadra.
 * O time incompleto (se houver) e sempre o ultimo da fila.
 */
function orderForCourt(teams, sizes, matchCounts) {
  const partialIndex = sizes.length > 2 && sizes[sizes.length - 1] < sizes[0] ? sizes.length - 1 : -1
  const full = teams.filter((_, i) => i !== partialIndex)
  shuffle(full).sort((a, b) => playedBy(a, matchCounts) - playedBy(b, matchCounts))
  return partialIndex >= 0 ? [...full, teams[partialIndex]] : full
}

/** Pontua uma divisao ja ordenada. */
function evaluate(teams, sizes, pads, matchCounts) {
  const sums = teams.map(sumOf)
  const courtAndFull = teams.filter((t, i) => !(pads[i] > 0))
  const fullSums = courtAndFull.map(sumOf)
  return {
    teams,
    sums,
    cost: costOf(sums, pads),
    // Desempate: quem ja jogou mais partidas comeca de fora.
    benchPlayed: teams.slice(2).reduce((acc, t) => acc + playedBy(t, matchCounts), 0),
    spread: fullSums.length ? r2(Math.max(...fullSums) - Math.min(...fullSums)) : 0,
    signature: signatureOf(teams),
  }
}

const isBetter = (a, b) =>
  !b || a.cost < b.cost - EPSILON || (Math.abs(a.cost - b.cost) <= EPSILON && a.benchPlayed > b.benchPlayed)

/**
 * Sorteia os times ja na ordem de entrada em quadra.
 *
 * @param {object}  options
 * @param {Array}   options.players             jogadores presentes ({ id, name, rating })
 * @param {number}  options.teamSize            maximo de jogadores por time (padrao 6)
 * @param {Set}     options.excludedSignatures  divisoes que ja sairam nesta sessao
 * @param {object}  options.matchCounts         partidas jogadas por jogador no dia
 * @returns {{teams, sums, signature, spread, exhausted} | null}
 *          teams[0] e teams[1] comecam em quadra; o resto e a fila, em ordem.
 */
export function drawTeams({
  players,
  teamSize = 6,
  excludedSignatures = new Set(),
  matchCounts = {},
  attempts = 420,
}) {
  const list = (players || []).filter(Boolean)
  const sizes = rotationSizes(list.length, teamSize)
  if (sizes.length < 2) return null

  // Forca esperada das vagas do time incompleto de fora.
  const mean = list.reduce((acc, p) => acc + p.rating, 0) / list.length
  const pads = sizes.map((size) => (sizes.length > 2 && size < teamSize ? (teamSize - size) * mean : 0))

  let best = null // melhor divisao ainda inedita
  let fallback = null // melhor divisao no geral (usada se tudo ja saiu)

  for (let attempt = 0; attempt < attempts; attempt++) {
    const raw = buildCandidate(list, sizes)
    const sums = raw.map(sumOf)
    optimize(raw, sums, pads)
    const candidate = evaluate(orderForCourt(raw, sizes, matchCounts), sizes, pads, matchCounts)

    if (isBetter(candidate, fallback)) fallback = candidate
    if (!excludedSignatures.has(candidate.signature) && isBetter(candidate, best)) best = candidate
  }

  // Busca relaxada: com elencos pequenos o otimizador converge sempre para as mesmas
  // divisoes. Se todas ja sairam, aceita a melhor divisao INEDITA mesmo menos equilibrada.
  if (!best) {
    for (let attempt = 0; attempt < attempts * 3; attempt++) {
      const raw = randomPartition(list, sizes)
      const candidate = evaluate(orderForCourt(raw, sizes, matchCounts), sizes, pads, matchCounts)
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
