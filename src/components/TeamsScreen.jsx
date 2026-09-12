import StarRating, { formatRating } from './StarRating.jsx'
import { balanceLabel } from '../lib/balance.js'
import { Avatar, EmptyState } from './Ui.jsx'
import { IconHistory, IconShare, IconShuffle, IconTrophy } from './Icons.jsx'

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

export const teamName = (index) => `Time ${String.fromCharCode(65 + index)}`

const TONES = {
  great: 'text-volt-500',
  good: 'text-volt-500',
  ok: 'text-amber-400',
  warn: 'text-orange-400',
}

function TeamCard({ team, sum, index, isStrongest }) {
  const accent = TEAM_ACCENTS[index % TEAM_ACCENTS.length]

  return (
    <section
      className="card animate-pop-in overflow-hidden"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <span
          className="h-9 w-1.5 shrink-0 rounded-full"
          style={{ background: accent, boxShadow: `0 0 16px -2px ${accent}66` }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[19px] font-bold leading-tight tracking-tightest">
            {teamName(index)}
          </h3>
          <p className="num mt-0.5 text-[12.5px] text-white/35">
            {team.length} jogadores · média {formatRating(Math.round((sum / team.length) * 10) / 10)}★
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-right">
          <p className="num font-display text-xl font-extrabold leading-none tracking-tightest">
            {formatRating(sum)}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            estrelas
          </p>
        </div>
      </header>

      <ul className="divide-y divide-white/[0.05] border-t border-white/[0.05]">
        {team.map((player, position) => (
          <li key={player.id} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar name={player.name} size={34} />
            <span className="min-w-0 flex-1 truncate text-[15.5px] font-semibold">
              {player.name}
              {position === 0 && isStrongest && (
                <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wider text-white/25">
                  capitão
                </span>
              )}
            </span>
            <StarRating value={player.rating} size="sm" readOnly />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function TeamsScreen({ result, onRedraw, onOpenHistory, onShare, historyCount, onGoToDraw }) {
  if (!result) {
    return (
      <EmptyState
        icon={<IconTrophy className="h-7 w-7" />}
        title="Nenhum time sorteado"
        description="Marque quem veio jogar, escolha o formato e o app monta times equilibrados na hora."
        action={
          <button type="button" className="btn-primary h-12 px-6 text-[15px]" onClick={onGoToDraw}>
            <IconShuffle className="h-[18px] w-[18px]" />
            Fazer o sorteio
          </button>
        }
      />
    )
  }

  const label = balanceLabel(result.spread)
  const strongest = result.sums.indexOf(Math.max(...result.sums))

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <p className={`font-display text-[20px] font-bold leading-tight tracking-tightest ${TONES[label.tone]}`}>
            {label.text}
          </p>
          <p className="num mt-1 text-[13px] text-white/40">
            {result.spread === 0
              ? 'Todos os times com a mesma soma de estrelas'
              : `Diferença de apenas ${formatRating(result.spread)}★ entre o mais forte e o mais fraco`}
          </p>
        </div>
        <button
          type="button"
          onClick={onShare}
          aria-label="Compartilhar times"
          className="btn-ghost h-11 w-11 shrink-0 rounded-2xl"
        >
          <IconShare className="h-[18px] w-[18px]" />
        </button>
      </div>

      {result.teams.map((team, index) => (
        <TeamCard
          key={index}
          team={team}
          sum={result.sums[index]}
          index={index}
          isStrongest={index === strongest}
        />
      ))}

      <div className="space-y-3 pt-1">
        <button type="button" onClick={onRedraw} className="btn-primary w-full py-4 text-[16.5px]">
          <IconShuffle className="h-5 w-5" />
          Sortear novamente
        </button>

        {historyCount > 0 && (
          <button type="button" onClick={onOpenHistory} className="btn-ghost w-full py-3.5 text-[15px]">
            <IconHistory className="h-[18px] w-[18px]" />
            Sorteios de hoje ({historyCount})
          </button>
        )}
      </div>

      <p className="px-2 pb-2 text-center text-[12.5px] leading-relaxed text-white/25">
        Cada novo sorteio sempre gera uma divisão diferente das anteriores desta sessão.
      </p>
    </div>
  )
}
