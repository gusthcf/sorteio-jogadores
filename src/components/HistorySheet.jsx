import { formatRating } from './StarRating.jsx'
import { Sheet } from './Ui.jsx'
import { teamAccent, teamLabel } from '../lib/teams.js'

const time = (timestamp) =>
  new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export default function HistorySheet({
  open,
  history,
  currentSignature,
  isBlocked,
  onClose,
  onRestore,
  onClear,
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Sorteios de hoje"
      subtitle="O histórico existe só nesta sessão — ao recarregar a página ele zera."
      footer={
        history.length > 1 ? (
          <button type="button" onClick={onClear} className="btn-quiet w-full py-3 text-[14px]">
            Limpar histórico e liberar repetições
          </button>
        ) : null
      }
    >
      <ol className="space-y-3 pb-2">
        {history.map((entry, index) => {
          const isCurrent = entry.signature === currentSignature
          const blocked = !isCurrent && isBlocked(entry)
          return (
            <li
              key={entry.id}
              className={`rounded-2xl border p-3.5 transition ${
                isCurrent ? 'border-volt-500/40 bg-volt-500/[0.05]' : 'border-white/[0.07] bg-white/[0.02]'
              }`}
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span className="num text-[13px] font-bold">Sorteio {history.length - index}</span>
                <span className="num text-[12px] text-white/30">{time(entry.at)}</span>
                {isCurrent ? (
                  <span className="chip ml-auto border-volt-500/30 text-volt-500">atual</span>
                ) : blocked ? (
                  <span className="ml-auto text-right text-[11.5px] leading-tight text-white/30">
                    Indisponível: alguém ficaria
                    <br />
                    de fora 2 partidas seguidas
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRestore(entry)}
                    className="ml-auto rounded-lg px-2 py-1 text-[12px] font-semibold text-white/40 transition hover:bg-white/5 hover:text-white"
                  >
                    Usar este
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {entry.teams.map((team, teamIndex) => (
                  <div key={teamIndex} className="flex items-start gap-2.5">
                    <span
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: teamAccent(teamIndex + 1) }}
                    />
                    <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/50">
                      <span className="font-semibold text-white/70">{teamLabel(teamIndex + 1)}</span>{' '}
                      {team.map((p) => p.name).join(', ')}
                    </p>
                    <span className="num shrink-0 text-[12.5px] font-semibold text-white/40">
                      {formatRating(entry.sums[teamIndex])}★
                    </span>
                  </div>
                ))}
              </div>
            </li>
          )
        })}
      </ol>
    </Sheet>
  )
}
