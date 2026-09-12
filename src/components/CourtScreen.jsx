import { formatRating } from './StarRating.jsx'
import { EmptyState } from './Ui.jsx'
import {
  IconAlert,
  IconCourt,
  IconHistory,
  IconMinus,
  IconPlus,
  IconShare,
  IconShuffle,
  IconTrophy,
  IconUndo,
} from './Icons.jsx'
import { balanceLabel } from '../lib/balance.js'
import { WINS_FOR_REDRAW } from '../lib/rotation.js'
import { listNames, teamAccent, teamLabel, teamSum } from '../lib/teams.js'

const MAX_SCORE = 99

/* ------------------------------------------------------ o que acabou de mudar */

function describeEvent(event, rotation) {
  switch (event?.type) {
    case 'draw': {
      const waiting = rotation.queue.length
      const detail = waiting
        ? `Time 1 e Time 2 começam. ${waiting === 1 ? 'Um time espera' : `${waiting} times esperam`} de fora.`
        : 'Todo mundo em quadra, ninguém fica de fora.'
      return event.exhausted
        ? { title: 'Todas as divisões já saíram hoje', detail: `Repetimos a mais equilibrada. ${detail}` }
        : { title: balanceLabel(event.spread).text, detail }
    }
    case 'match': {
      const title = `${teamLabel(event.winner)} venceu o ${teamLabel(event.loser)}`
      if (!event.entered) return { title, detail: 'Ninguém de fora: os mesmos times seguem.' }
      if (!event.stayed.length) {
        return {
          title,
          detail: `Entra o ${teamLabel(event.entered)}. O ${teamLabel(event.loser)} vai para o fim da fila.`,
        }
      }
      return {
        title,
        detail: `Entra o ${teamLabel(event.entered)}, completado com ${listNames(event.stayed)}, que ${
          event.stayed.length === 1 ? 'continua' : 'continuam'
        } do ${teamLabel(event.loser)}.`,
      }
    }
    case 'streak':
      return {
        accent: true,
        title: `${teamLabel(event.winner)} venceu ${event.streak} seguidas!`,
        detail: 'Novos times foram sorteados. Quem estava de fora começa jogando.',
      }
    case 'restore':
      return { title: 'Sorteio anterior de volta', detail: 'A rotação recomeçou com esses times.' }
    default:
      return null
  }
}

function EventCard({ event, rotation, canUndo, onUndo }) {
  const info = describeEvent(event, rotation)
  if (!info && !canUndo) return null

  return (
    <div
      className={`card flex animate-pop-in items-start gap-3 p-4 ${
        info?.accent ? 'border-volt-500/30 bg-volt-500/[0.06]' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        {info ? (
          <>
            <p
              className={`font-display text-[17px] font-bold leading-snug tracking-tightest ${
                info.accent ? 'text-volt-400' : ''
              }`}
            >
              {info.title}
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-white/50">{info.detail}</p>
          </>
        ) : (
          <p className="text-[13.5px] text-white/50">Tocou errado? Dá para voltar a última ação.</p>
        )}
      </div>
      {canUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="btn-ghost shrink-0 rounded-xl px-3 py-2 text-[12.5px]"
        >
          <IconUndo className="h-4 w-4" />
          Desfazer
        </button>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- placar */

/** Toque na metade direita soma um ponto; na metade esquerda, tira. */
function ScorePad({ value, onChange, label }) {
  const change = (next) => {
    const clamped = Math.min(MAX_SCORE, Math.max(0, next))
    if (clamped !== value) onChange(clamped)
  }

  return (
    <div className="relative mt-4 h-[76px] overflow-hidden rounded-2xl border border-white/10 bg-ink-900">
      <button
        type="button"
        aria-label={`Tirar um ponto do ${label}`}
        disabled={value <= 0}
        onClick={() => change(value - 1)}
        className="absolute inset-y-0 left-0 w-1/2 transition-colors active:bg-white/[0.07] disabled:cursor-default"
      />
      <button
        type="button"
        aria-label={`Somar um ponto ao ${label}`}
        disabled={value >= MAX_SCORE}
        onClick={() => change(value + 1)}
        className="absolute inset-y-0 right-0 w-1/2 transition-colors active:bg-volt-500/[0.12] disabled:cursor-default"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2.5">
        <IconMinus className={`h-4 w-4 ${value <= 0 ? 'text-white/10' : 'text-white/35'}`} />
        <span
          aria-live="polite"
          className="num font-display text-[42px] font-extrabold leading-none tracking-tightest"
        >
          {value}
        </span>
        <IconPlus className={`h-4 w-4 ${value >= MAX_SCORE ? 'text-white/10' : 'text-white/35'}`} />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- quadra */

function CourtTeam({ team, score, onScore, onWinner }) {
  const accent = teamAccent(team.number)
  const joined = new Set(team.joined)
  const label = teamLabel(team.number)

  return (
    <div className="flex min-w-0 flex-col bg-ink-850 px-3 pb-3 pt-4">
      <div className="flex items-center gap-2 pr-3">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: accent, boxShadow: `0 0 12px ${accent}80` }}
        />
        <h3 className="truncate font-display text-[17px] font-bold tracking-tightest">{label}</h3>
      </div>
      <p className="num mt-0.5 text-[12px] text-white/35">
        {formatRating(teamSum(team.players))}★ · {team.players.length} jog.
      </p>

      <ul className="mt-3 flex-1 space-y-2">
        {team.players.map((player) => (
          <li key={player.id} className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{player.name}</span>
            {joined.has(player.id) && (
              <span
                title={`Continuou do ${teamLabel(team.joinedFrom)}`}
                className="shrink-0 rounded-md bg-white/[0.08] px-1 py-px text-[9.5px] font-bold text-white/55"
              >
                {`T${team.joinedFrom}`}
              </span>
            )}
            <span className="num shrink-0 text-[11.5px] text-white/30">{formatRating(player.rating)}</span>
          </li>
        ))}
      </ul>

      <ScorePad value={score} label={label} onChange={(value) => onScore(team.number, value)} />

      <button
        type="button"
        onClick={() => onWinner(team.number)}
        className="btn-primary mt-2.5 w-full py-3 text-[14.5px] shadow-none"
      >
        <IconTrophy className="h-[18px] w-[18px]" />
        Venceu
      </button>
    </div>
  )
}

function StreakBar({ streak }) {
  if (!streak) return null
  const remaining = WINS_FOR_REDRAW - streak.count

  return (
    <div className="flex items-center gap-3 border-t border-white/[0.05] px-4 py-3">
      <div className="flex shrink-0 gap-1">
        {Array.from({ length: WINS_FOR_REDRAW }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-5 rounded-full ${i < streak.count ? 'bg-volt-500' : 'bg-white/10'}`}
          />
        ))}
      </div>
      <p className="min-w-0 flex-1 text-[12.5px] text-white/50">
        <span className="font-semibold text-white/80">{teamLabel(streak.number)}</span> ·{' '}
        {streak.count === 1 ? '1 vitória' : `${streak.count} vitórias seguidas`}
        {remaining === 1 && <span className="text-white/35"> — mais uma e sorteia de novo</span>}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ fila */

function QueueCard({ team, position, teamSize }) {
  const missing = teamSize - team.players.length

  return (
    <li className="card flex gap-3 p-3.5">
      <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] font-display text-[15px] font-bold text-white/70">
        {`${position}º`}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: teamAccent(team.number) }} />
          <span className="font-display text-[16px] font-bold tracking-tightest">{teamLabel(team.number)}</span>
          <span className="num text-[12px] text-white/35">
            {`${team.players.length} jog. · ${formatRating(teamSum(team.players))}★`}
          </span>
          {position === 1 && <span className="chip ml-auto py-0.5">entra na próxima</span>}
        </div>
        <p className="mt-1 text-[13px] leading-snug text-white/50">
          {team.players.map((p) => p.name).join(', ')}
        </p>
        {missing > 0 && (
          <p className="mt-1.5 text-[12px] font-medium text-amber-300/80">
            Entra completado com {missing} {missing === 1 ? 'jogador' : 'jogadores'} do time que perder
          </p>
        )}
      </div>
    </li>
  )
}

/* ---------------------------------------------------------------- tela */

export default function CourtScreen({
  rotation,
  teamSize,
  score,
  lastEvent,
  matchNumber,
  canUndo,
  presenceChanged,
  historyCount,
  onWinner,
  onScore,
  onUndo,
  onRedraw,
  onShare,
  onOpenHistory,
  onGoToDraw,
}) {
  if (!rotation) {
    return (
      <EmptyState
        icon={<IconCourt className="h-7 w-7" />}
        title="Ninguém em quadra ainda"
        description="Marque quem veio jogar e sorteie. Depois é só apontar o vencedor de cada partida que o app cuida da fila."
        action={
          <button type="button" className="btn-primary h-12 px-6 text-[15px]" onClick={onGoToDraw}>
            <IconShuffle className="h-[18px] w-[18px]" />
            Fazer o sorteio
          </button>
        }
      />
    )
  }

  const [left, right] = rotation.court
  const diff = Math.abs(teamSum(left.players) - teamSum(right.players))

  return (
    <div className="space-y-4">
      {presenceChanged && (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
          <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-amber-100">A lista de presença mudou</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-amber-100/55">
              Sorteie de novo para incluir quem chegou ou tirar quem foi embora.
            </p>
          </div>
          <button
            type="button"
            onClick={onRedraw}
            className="btn shrink-0 rounded-xl bg-amber-300 px-3 py-2 text-[12.5px] text-ink-950"
          >
            Sortear
          </button>
        </div>
      )}

      <EventCard
        key={`${matchNumber}-${lastEvent?.type}`}
        event={lastEvent}
        rotation={rotation}
        canUndo={canUndo}
        onUndo={onUndo}
      />

      <section className="card overflow-hidden">
        <header className="flex items-end justify-between px-4 pb-3 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Em quadra</p>
            <h2 className="num font-display text-[24px] font-extrabold leading-tight tracking-tightest">
              Partida {matchNumber}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Diferença</p>
            <p className="num font-display text-[20px] font-bold leading-tight tracking-tightest">
              {formatRating(Math.round(diff * 100) / 100)}★
            </p>
          </div>
        </header>

        <div className="relative grid grid-cols-2 gap-px border-t border-white/[0.05] bg-white/[0.05]">
          {[left, right].map((team) => (
            <CourtTeam
              key={team.number}
              team={team}
              score={score[team.number] || 0}
              onScore={onScore}
              onWinner={onWinner}
            />
          ))}
          <span className="pointer-events-none absolute left-1/2 top-3.5 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-ink-900 text-[12px] font-bold text-white/40">
            ×
          </span>
        </div>

        <StreakBar streak={rotation.streak} />
      </section>

      <section className="space-y-2.5">
        <h3 className="px-1 text-[13px] font-semibold text-white/45">Na fila</h3>
        {rotation.queue.length ? (
          <ol className="space-y-2.5">
            {rotation.queue.map((team, index) => (
              <QueueCard
                key={`${team.number}-${team.players.map((p) => p.id).join('.')}`}
                team={team}
                position={index + 1}
                teamSize={teamSize}
              />
            ))}
          </ol>
        ) : (
          <p className="rounded-3xl border border-dashed border-white/10 px-4 py-4 text-center text-[13.5px] text-white/35">
            Ninguém de fora — os mesmos times seguem depois de cada partida.
          </p>
        )}
      </section>

      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onRedraw} className="btn-ghost py-3.5 text-[14.5px]">
            <IconShuffle className="h-[18px] w-[18px]" />
            Novo sorteio
          </button>
          <button type="button" onClick={onShare} className="btn-ghost py-3.5 text-[14.5px]">
            <IconShare className="h-[18px] w-[18px]" />
            Compartilhar
          </button>
        </div>
        {historyCount > 0 && (
          <button type="button" onClick={onOpenHistory} className="btn-quiet w-full py-2.5 text-[13.5px]">
            <IconHistory className="h-[18px] w-[18px]" />
            Sorteios de hoje ({historyCount})
          </button>
        )}
      </div>
    </div>
  )
}
