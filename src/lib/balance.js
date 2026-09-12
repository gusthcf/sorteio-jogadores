/**
 * Algoritmo de balanceamento dos times.
 *
 * Estrategia em tres camadas:
 *  1. SNAKE DRAFT   — ordena por estrelas (desc) e distribui em zigue-zague (1,2,3,3,2,1...).
 *                     Ja entrega uma divisao decente e evita concentrar os melhores num time.
 *  2. HILL CLIMBING — troca pares de jogadores entre times enquanto isso reduzir o desequilibrio.
 *                     Refina o snake draft ate um otimo local (mantendo o tamanho dos times).
 *  3. MULTI-START   — repete tudo centenas de vezes com embaralhamento diferente e guarda a
 *                     melhor solucao cuja "assinatura" ainda nao apareceu no historico.
 *
 * O passo 3 e o que garante a regra de ouro: sortear de novo com os mesmos presentes
 * nunca devolve exatamente a mesma divisao, sem abrir mao do equilibrio.
 */

const r2 = (n) => Math.round(n * 100) / 100

function shuffle(arr) {
  // Fisher-Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const range = (n) => Array.from({ length: n }, (_, i) => i)

/** Quantos jogadores cada time recebe (a sobra e distribuida em times aleatorios). */
function teamSizes(total, numTeams) {
  const base = Math.floor(total / numTeams)
  const extra = total % numTeams
  const sizes = new Array(numTeams).fill(base)
  const order = shuffle(range(numTeams))
  for (let i = 0; i < extra; i++) sizes[order[i]] += 1
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

const sumOf = (team) => r2(team.reduce((acc, p) => acc + p.rating, 0))

/**
 * Custo do desequilibrio. Menor = melhor.
 * A diferenca entre o time mais forte e o mais fraco pesa muito mais que a variancia,
 * entao o algoritmo ataca primeiro o "buraco" entre os extremos.
 */
function costFromSums(sums) {
  let max = -Infinity
  let min = Infinity
  let total = 0
  for (const s of sums) {
    if (s > max) max = s
    if (s < min) min = s
    total += s
  }
  const mean = total / sums.length
  let variance = 0
  for (const s of sums) variance += (s - mean) ** 2
  return (max - min) * 1000 + variance
}

/** Refina por trocas: so aceita a troca que diminui o custo. Preserva o tamanho dos times. */
function optimize(teams, sums, maxRounds = 14) {
  let rounds = 0
  let improved = true
  let current = costFromSums(sums)

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
            const cost = costFromSums(trial)
            if (cost < current - 1e-9) {
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

/** Divisao puramente aleatoria — usada so na busca relaxada (ver drawTeams). */
function randomPartition(players, numTeams) {
  const pool = shuffle(players.slice())
  const sizes = teamSizes(pool.length, numTeams)
  const teams = []
  let cursor = 0
  for (const size of sizes) {
    teams.push(pool.slice(cursor, cursor + size))
    cursor += size
  }
  return teams
}

function buildCandidate(players, numTeams) {
  const pool = shuffle(players.slice()).sort((a, b) => b.rating - a.rating)
  const sizes = teamSizes(pool.length, numTeams)
  const teams = Array.from({ length: numTeams }, () => [])
  const order = snakeOrder(numTeams, pool.length, sizes)
  pool.forEach((player, index) => teams[order[index]].push(player))
  return teams
}

/**
 * Sorteia os times.
 *
 * @param {object}  options
 * @param {Array}   options.players              jogadores presentes ({ id, name, rating })
 * @param {number}  options.numTeams             quantidade de times
 * @param {Set}     options.excludedSignatures   divisoes que ja sairam nesta sessao
 * @param {number}  options.attempts             quantas solucoes candidatas gerar
 * @returns {{teams, sums, signature, spread, exhausted} | null}
 */
export function drawTeams({ players, numTeams, excludedSignatures = new Set(), attempts = 420 }) {
  const list = (players || []).filter(Boolean)
  if (numTeams < 2 || list.length < numTeams) return null

  let best = null // melhor divisao ainda inedita
  let fallback = null // melhor divisao no geral (usada se tudo ja saiu)

  for (let attempt = 0; attempt < attempts; attempt++) {
    const teams = buildCandidate(list, numTeams)
    const sums = teams.map(sumOf)
    optimize(teams, sums)

    const cost = costFromSums(sums)
    const signature = signatureOf(teams)
    const candidate = { teams, sums, cost, signature }

    if (!fallback || cost < fallback.cost) fallback = candidate

    if (!excludedSignatures.has(signature)) {
      if (!best || cost < best.cost) best = candidate
      if (best.cost === 0) break // equilibrio perfeito: nao ha o que melhorar
    }
  }

  // Busca relaxada: com elencos pequenos, o otimizador converge sempre para as mesmas
  // divisoes otimas. Se todas ja sairam, procuramos a melhor divisao INEDITA mesmo que
  // seja um pouco menos equilibrada — a regra de ouro (nao repetir) vem primeiro.
  if (!best) {
    let relaxed = null
    for (let attempt = 0; attempt < attempts * 3; attempt++) {
      const teams = randomPartition(list, numTeams)
      const sums = teams.map(sumOf)
      const signature = signatureOf(teams)
      if (excludedSignatures.has(signature)) continue
      const cost = costFromSums(sums)
      if (!relaxed || cost < relaxed.cost) relaxed = { teams, sums, cost, signature }
    }
    best = relaxed
  }

  const chosen = best || fallback
  const teams = chosen.teams.map((team) =>
    team.slice().sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, 'pt-BR')),
  )

  return {
    teams,
    sums: chosen.sums.map(r2),
    signature: chosen.signature,
    spread: r2(Math.max(...chosen.sums) - Math.min(...chosen.sums)),
    exhausted: !best, // todas as divisoes possiveis ja apareceram no historico
  }
}

/** Rotulo de qualidade do equilibrio, usado no cabecalho do resultado. */
export function balanceLabel(spread) {
  if (spread === 0) return { text: 'Equilíbrio perfeito', tone: 'great' }
  if (spread <= 0.5) return { text: 'Times muito equilibrados', tone: 'great' }
  if (spread <= 1) return { text: 'Times equilibrados', tone: 'good' }
  if (spread <= 2) return { text: 'Equilíbrio aceitável', tone: 'ok' }
  return { text: 'Diferença notável entre os times', tone: 'warn' }
}
