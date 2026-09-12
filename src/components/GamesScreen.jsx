import { formatRating } from './StarRating.jsx'
import { Avatar, EmptyState } from './Ui.jsx'
import { IconChart, IconCourt } from './Icons.jsx'
import { listNames, teamAccent, teamLabel } from '../lib/teams.js'

const time = (timestamp) =>
  new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export default function GamesScreen({ dayPlayers, matchCounts, matches, onGoToCourt }) {
  if (!matches.length) {
    return (
      <EmptyState
        icon={<IconChart className="h-7 w-7" />}
        title="Nenhuma partida ainda"
        description="Na aba Quadra, toque em “Venceu” no fim de cada jogo. A contagem de partidas de cada jogador aparece aqui."
        action={
          <button type="button" className="btn-primary h-12 px-6 text-[15px]" onClick={onGoToCourt}>
            <IconCourt className="h-[18px] w-[18px]" />
            Ir para a quadra
          </button>
        }
      />
    )
  }

  const rows = dayPlayers
    .map((player) => ({ ...player, count: matchCounts[player.id] || 0 }))
    .sort(
      (a, b) => b.count - a.count || a.rating - b.rating || a.name.localeCompare(b.name, 'pt-BR'),
    )
  const max = Math.max(1, ...rows.map((row) => row.count))
  const average = rows.length ? rows.reduce((acc, row) => acc + row.count, 0) / rows.length : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Partidas</p>
          <p className="num mt-1 font-display text-3xl font-extrabold tracking-tightest">{matches.length}</p>
        </div>
        <div className="card px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Média por jogador</p>
          <p className="num mt-1 font-display text-3xl font-extrabold tracking-tightest">
            {formatRating(Math.round(average * 10) / 10)}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ contagem por jogador */}
      <section className="card overflow-hidden">
        <header className="px-4 pb-3 pt-4">
          <h2 className="font-display text-[19px] font-bold tracking-tightest">Partidas por jogador</h2>
          <p className="mt-0.5 text-[13px] text-white/40">Conta cada jogo em que a pessoa estava em quadra.</p>
        </header>
        <ul className="divide-y divide-white/[0.05] border-t border-white/[0.05]">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={row.name} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{row.name}</span>
                  <span className="num shrink-0 text-[11.5px] text-white/30">{formatRating(row.rating)}★</span>
                  <span className="num w-7 shrink-0 text-right font-display text-[18px] font-extrabold tracking-tightest">
                    {row.count}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-white/35 transition-[width] duration-500"
                    style={{ width: `${(row.count / max) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------- resultados */}
      <section className="card overflow-hidden">
        <header className="px-4 pb-3 pt-4">
          <h2 className="font-display text-[19px] font-bold tracking-tightest">Resultados</h2>
        </header>
        <ol className="divide-y divide-white/[0.05] border-t border-white/[0.05]">
          {matches
            .slice()
            .reverse()
            .map((match) => (
              <li key={match.id} className="px-4 py-3">
                <p className="num text-[12px] text-white/35">
                  <span className="font-semibold text-white/60">Partida {match.number}</span> · {time(match.at)}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: teamAccent(match.winner) }}
                  />
                  <span>
                    <span className="font-semibold">{teamLabel(match.winner)}</span>
                    <span className="text-white/50"> venceu o {teamLabel(match.loser)}</span>
                  </span>
                  {match.streak >= 2 && <span className="chip py-0.5">{match.streak}ª seguida</span>}
                </p>
                {match.entered && (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-white/40">
                    Entrou o {teamLabel(match.entered)}
                    {match.stayed.length > 0 && ` com ${listNames(match.stayed)}`}
                  </p>
                )}
                {match.redraw && (
                  <p className="mt-1 text-[12.5px] font-medium text-volt-500/80">Novo sorteio feito</p>
                )}
              </li>
            ))}
        </ol>
      </section>
    </div>
  )
}
