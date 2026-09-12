import { useMemo } from 'react'
import StarRating, { formatRating } from './StarRating.jsx'
import { Avatar, EmptyState, Segmented, Stepper } from './Ui.jsx'
import { IconCheck, IconRoster, IconShuffle } from './Icons.jsx'

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

export default function DrawScreen({
  players,
  present,
  onTogglePresent,
  onSelectAll,
  onClearAll,
  mode,
  onModeChange,
  teamCount,
  onTeamCountChange,
  playersPerTeam,
  onPlayersPerTeamChange,
  numTeams,
  onDraw,
  onGoToRoster,
}) {
  const presentPlayers = useMemo(
    () => players.filter((p) => present.has(p.id)),
    [players, present],
  )

  const totalStars = presentPlayers.reduce((acc, p) => acc + p.rating, 0)
  const canDraw = presentPlayers.length >= numTeams && numTeams >= 2
  const perTeamPreview = presentPlayers.length ? presentPlayers.length / numTeams : 0
  const uneven = presentPlayers.length % numTeams !== 0

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
          <h2 className="font-display text-[19px] font-bold tracking-tightest">Como dividir</h2>
          <p className="mt-0.5 text-[13px] text-white/40">Escolha pelo número de times ou pelo tamanho de cada um.</p>
        </div>

        <Segmented
          value={mode}
          onChange={onModeChange}
          options={[
            { value: 'teams', label: 'Nº de times' },
            { value: 'size', label: 'Jogadores por time' },
          ]}
        />

        {mode === 'teams' ? (
          <Stepper value={teamCount} min={2} max={8} onChange={onTeamCountChange} suffix="times" />
        ) : (
          <Stepper
            value={playersPerTeam}
            min={2}
            max={12}
            onChange={onPlayersPerTeamChange}
            suffix="jogadores por time"
          />
        )}

        <div className="rounded-2xl border border-white/[0.07] bg-ink-900/70 px-4 py-3.5">
          {presentPlayers.length < 2 ? (
            <p className="text-[14px] text-white/40">Marque quem veio jogar para ver a prévia.</p>
          ) : (
            <p className="text-[14px] leading-relaxed text-white/60">
              <span className="num font-semibold text-white">{numTeams} times</span> de{' '}
              <span className="num font-semibold text-white">
                {uneven
                  ? `${Math.floor(perTeamPreview)} a ${Math.ceil(perTeamPreview)}`
                  : perTeamPreview}{' '}
                jogadores
              </span>
              {uneven && <span className="text-white/40"> — alguém joga com um a mais</span>}
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- acao */}
      <button
        type="button"
        onClick={onDraw}
        disabled={!canDraw}
        className="btn-primary w-full py-4 text-[16.5px]"
      >
        <IconShuffle className="h-5 w-5" />
        Sortear times
      </button>

      {!canDraw && presentPlayers.length > 0 && (
        <p className="text-center text-[13px] text-white/35">
          São necessários pelo menos {numTeams} jogadores presentes.
        </p>
      )}
    </div>
  )
}
