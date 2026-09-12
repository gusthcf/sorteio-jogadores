/**
 * Persistencia local.
 *
 * Regra do projeto: SOMENTE o elenco (nome + estrelas) sobrevive ao F5.
 * Presenca, times sorteados e historico sao estado volatil e ficam apenas em memoria.
 */

const STORAGE_KEY = 'sorteio-volei:players:v1'

/** Verifica se o localStorage esta realmente disponivel (modo privado, cookies bloqueados...). */
function hasStorage() {
  try {
    const probe = '__probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export const storageAvailable = hasStorage()

/** Aceita apenas registros bem formados — protege contra dado corrompido no navegador. */
function sanitize(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p) => p && typeof p.name === 'string' && p.name.trim())
    .map((p) => ({
      id: typeof p.id === 'string' && p.id ? p.id : createId(),
      name: p.name.trim().slice(0, 40),
      rating: clampRating(Number(p.rating)),
    }))
}

export function clampRating(value) {
  if (!Number.isFinite(value)) return 3
  // Estrelas de 0,5 em 0,5, entre 0,5 e 5.
  const stepped = Math.round(value * 2) / 2
  return Math.min(5, Math.max(0.5, stepped))
}

export function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function loadPlayers() {
  if (!storageAvailable) return []
  try {
    return sanitize(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]'))
  } catch {
    return []
  }
}

export function savePlayers(players) {
  if (!storageAvailable) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(players))
  } catch {
    /* cota cheia ou acesso negado: o app segue funcionando em memoria */
  }
}
