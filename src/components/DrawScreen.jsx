import { useMemo } from 'react'
import StarRating, { formatRating } from './StarRating.jsx'
import { Avatar, EmptyState, Stepper } from './Ui.jsx'
import { IconCheck, IconRoster, IconShuffle } from './Icons.jsx'
import { rotationSizes } from '../lib/balance.js'
import { teamAccent, teamLabel } from '../lib/teams.js'

function PresenceRow({ player, checked, onToggle }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(player.id)}
        aria-pressed={checked}
        className={`flex w-full items-center gap-3.5 px-4 py-3 text-left transition ${
          checked ? 'bg-volt-500/[0.05]' : ''
        }`}
      >
        <Avatar name={player.name} tone={checked ? 'accent' : 'neutral'} />

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[16px] font-semibold leading-tight transition ${
              checked ? 'text-white' : 'text-white/45'
            }`}
          >
            {player.name}
          </span>
          <span className="mt-1.5 flex items-center gap-2">
            <StarRating value={player.rating} size="sm" readOnly />
            <span className="num text-[12px] font-semibold text-white/30">
              {formatRating(player.rating)}
            </span>
          </span>
        </span>

        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
            checked
              ? 'border-volt-500 bg-volt-500 text-ink-950'
              : 'border-white/15 bg-transparent text-transparent'
          }`}
        >
          <IconCheck className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </button>
    </li>
  )
}

function TeamPill({ number, size, partial }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[13px]">
      <span className="h-2 w-2 rounded-full" style={{ background: teamAccent(number) }} />
      <span className="font-semibold">{teamLabel(number)}</span>
      <span className={`num font-semibold ${partial ? 'text-amber-300/90' : 'text-white/40'}`}>{size}</span>
    </span>
  )
}

/** Mostra como os presentes vao se dividir antes mesmo de sortear. */
function FormatPreview({ sizes, teamSize }) {
  if (sizes.length < 2) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-ink-900/70 px-4 py-3.5">
        <p className="text-[14px] text-white/40">Marque quem veio jogar para ver como os times ficam.</p>
      </div>
    )
  }

  const bench = sizes.slice(2)

  return (
    <div className="space-y-2.5 rounded-2xl border border-white/[0.07] bg-ink-900/70 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Em quadra</p>
      <div className="flex flex-wrap items-center gap-2">
        <TeamPill number={1} size={sizes[0]} />
        <span className="text-sm font-bold text-white/25">×</span>
        <TeamPill number={2} size={sizes[1]} />
      </div>

      {bench.length ? (
        <>
          <p className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-white/30">
            De fora, nesta ordem
          </p>
          <div className="flex flex-wrap gap-2">
            {bench.map((size, index) => (
              <TeamPill key={index} number={index + 3} size={size} partial={size < teamSize} />
            ))}
          </div>
          {bench.some((size) => size < teamSize) && (
            <p className="text-[12.5px] leading-relaxed text-white/40">
              O time incompleto entra completado com jogadores do time que perder.
            </p>
          )}
        </>
      ) : (
        <p className="text-[12.5px] text-white/40">Ninguém fica de fora: os mesmos times jogam todas.</p>
      )}
    </div>
  )
}

export default function DrawScreen({
  players,
  present,
  onTogglePresent,
  onSelectAll,
  onClearAll,
  teamSize,
  onTeamSizeChange,
  hasSession,
  onDraw,
  onGoToRoster,
}) {
  const presentPlayers = useMemo(
    () => players.filter((p) => present.has(p.id)),
    [players, present],
  )

  const totalStars = presentPlayers.reduce((acc, p) => acc + p.rating, 0)
  const sizes = rotationSizes(presentPlayers.length, teamSize)
  const canDraw = sizes.length >= 2

  if (players.length < 2) {
    return (
      <EmptyState
        icon={<IconRoster className="h-7 w-7" />}
        title="Cadastre a galera primeiro"
        description="Você precisa de pelo menos 2 jogadores no elenco para montar os times."
        action={
          <button type="button" className="btn-primary h-12 px-6 text-[15px]" onClick={onGoToRoster}>
            Ir para o elenco
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------- presenca */}
      <section className="card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
          <div>
            <h2 className="font-display text-[19px] font-bold tracking-tightest">Quem veio hoje</h2>
            <p className="num mt-0.5 text-[13px] text-white/40">
              {presentPlayers.length} de {players.length} marcados
              {presentPlayers.length > 0 && ` · ${formatRating(totalStars)}★ em quadra`}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={onSelectAll}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] font-semibold text-white/70 transition hover:bg-white/[0.08]"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-xl px-3 py-2 text-[12.5px] font-semibold text-white/35 transition hover:text-white/70"
            >
              Limpar
            </button>
          </div>
        </header>

        <ul className="divide-y divide-white/[0.05] border-t border-white/[0.05]">
          {players
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
            .map((player) => (
              <PresenceRow
                key={player.id}
                player={player}
                checked={present.has(player.id)}
                onToggle={onTogglePresent}
              />
            ))}
        </ul>
      </section>

      {/* --------------------------------------------------------- formato */}
      <section className="card space-y-4 p-4">
        <div>
          <h2 className="font-display text-[19px] font-bold tracking-tightest">Formato</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-white/40">
            Dois times em quadra. Quem sobrar espera de fora e entra no lugar de quem perder.
          </p>
        </div>

        <Stepper
          value={teamSize}
          min={2}
          max={6}
          onChange={onTeamSizeChange}
          suffix="jogadores por time (máx.)"
        />

        <FormatPreview sizes={sizes} teamSize={teamSize} />
      </section>

      {/* ------------------------------------------------------------- acao */}
      <button
        type="button"
        onClick={onDraw}
        disabled={!canDraw}
        className="btn-primary w-full py-4 text-[16.5px]"
      >
        <IconShuffle className="h-5 w-5" />
        {hasSession ? 'Sortear novos times' : 'Sortear times'}
      </button>

      {hasSession && canDraw && (
        <p className="text-center text-[13px] text-white/35">
          A contagem de partidas do dia continua valendo.
        </p>
      )}
      {!canDraw && presentPlayers.length > 0 && (
        <p className="text-center text-[13px] text-white/35">Marque pelo menos 2 jogadores presentes.</p>
      )}
    </div>
  )
}
