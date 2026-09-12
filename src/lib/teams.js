/** Identidade visual e textual dos times, compartilhada pelas telas. */

export const TEAM_ACCENTS = [
  '#CCFF33',
  '#5CC8FF',
  '#FF9F45',
  '#FF6FA5',
  '#A78BFA',
  '#4ADE80',
  '#F4D03F',
  '#22D3EE',
]

export const teamLabel = (number) => `Time ${number}`

export const teamAccent = (number) => TEAM_ACCENTS[(number - 1) % TEAM_ACCENTS.length]

export const teamSum = (players) =>
  Math.round(players.reduce((acc, p) => acc + p.rating, 0) * 100) / 100

/** ["Ana", "Bia", "Caio"] -> "Ana, Bia e Caio" */
export function listNames(names) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}
