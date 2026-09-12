import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DrawScreen from './components/DrawScreen.jsx'
import HistorySheet from './components/HistorySheet.jsx'
import PlayerFormSheet from './components/PlayerFormSheet.jsx'
import PlayersScreen from './components/PlayersScreen.jsx'
import TeamsScreen, { teamName } from './components/TeamsScreen.jsx'
import { ConfirmDialog, Toast } from './components/Ui.jsx'
import { IconBall, IconRoster, IconShuffle, IconTrophy } from './components/Icons.jsx'
import { formatRating } from './components/StarRating.jsx'
import { drawTeams } from './lib/balance.js'
import { clampRating, createId, loadPlayers, savePlayers, storageAvailable } from './lib/storage.js'

const TABS = [
  { id: 'roster', label: 'Elenco', Icon: IconRoster },
  { id: 'draw', label: 'Sorteio', Icon: IconShuffle },
  { id: 'teams', label: 'Times', Icon: IconTrophy },
]

export default function App() {
  /* --------------------------------------------------- estado PERSISTENTE */
  // Unico dado que sobrevive ao F5: o elenco.
  const [players, setPlayers] = useState(loadPlayers)

  useEffect(() => {
    savePlayers(players)
  }, [players])

  /* ------------------------------------------------------- estado VOLATIL */
  const [tab, setTab] = useState('roster')
  const [present, setPresent] = useState(() => new Set())
  const [mode, setMode] = useState('teams')
  const [teamCount, setTeamCount] = useState(2)
  const [playersPerTeam, setPlayersPerTeam] = useState(6)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  /* ------------------------------------------------------------- overlays */
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const notify = useCallback((message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3200)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (!storageAvailable) {
      notify('Seu navegador bloqueou o armazenamento: o elenco não será salvo.')
    }
  }, [notify])

  /* --------------------------------------------------------------- elenco */
  function handleSavePlayer({ id, name, rating }) {
    if (id) {
      setPlayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name, rating: clampRating(rating) } : p)),
      )
      notify('Jogador atualizado.')
    } else {
      setPlayers((prev) => [...prev, { id: createId(), name, rating: clampRating(rating) }])
      notify(`${name} entrou no elenco.`)
    }
    setFormOpen(false)
    setEditing(null)
  }

  function handleDeletePlayer() {
    const target = deleting
    setPlayers((prev) => prev.filter((p) => p.id !== target.id))
    setPresent((prev) => {
      const next = new Set(prev)
      next.delete(target.id)
      return next
    })
    setDeleting(null)
    notify(`${target.name} foi removido.`)
  }

  /* ------------------------------------------------------------- presenca */
  const togglePresent = useCallback((id) => {
    setPresent((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const presentPlayers = useMemo(
    () => players.filter((p) => present.has(p.id)),
    [players, present],
  )

  // Quantidade de times: escolhida direto ou derivada do tamanho desejado de time.
  const numTeams = useMemo(() => {
    if (mode === 'teams') return teamCount
    if (presentPlayers.length < 2) return 2
    return Math.max(2, Math.floor(presentPlayers.length / playersPerTeam))
  }, [mode, teamCount, playersPerTeam, presentPlayers.length])

  /* -------------------------------------------------------------- sorteio */
  const runDraw = useCallback(
    (isRedraw) => {
      const list = players.filter((p) => present.has(p.id))
      if (list.length < numTeams || numTeams < 2) {
        notify('Marque mais jogadores presentes para esse formato.')
        return
      }

      const excludedSignatures = new Set(history.map((entry) => entry.signature))
      const drawn = drawTeams({ players: list, numTeams, excludedSignatures })
      if (!drawn) return

      setResult(drawn)
      setHistory((prev) =>
        [
          {
            id: createId(),
            at: Date.now(),
            teams: drawn.teams,
            sums: drawn.sums,
            signature: drawn.signature,
            spread: drawn.spread,
          },
          ...prev,
        ].slice(0, 25),
      )
      setTab('teams')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      navigator.vibrate?.(12)

      if (drawn.exhausted) {
        notify('Todas as divisões possíveis já saíram hoje — repetimos a mais equilibrada.')
      } else if (isRedraw) {
        notify('Times novos, nenhuma repetição.')
      }
    },
    [players, present, numTeams, history, notify],
  )

  /* ---------------------------------------------------------- compartilhar */
  async function handleShare() {
    if (!result) return
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const text = [
      `\u{1F3D0} Times do dia ${date}`,
      '',
      ...result.teams.map((team, index) =>
        [
          `${teamName(index).toUpperCase()} - ${formatRating(result.sums[index])}★`,
          ...team.map((p) => `- ${p.name} (${formatRating(p.rating)})`),
        ].join('\n'),
      ),
    ].join('\n\n')

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Times de hoje', text })
        return
      }
      await navigator.clipboard.writeText(text)
      notify('Times copiados. É só colar no grupo.')
    } catch {
      /* usuario cancelou o compartilhamento */
    }
  }

  /* ---------------------------------------------------------------- render */
  const presentCount = presentPlayers.length

  return (
    <div className="relative z-10 mx-auto flex min-h-full w-full max-w-md flex-col">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/85 px-5 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-volt-500/10 text-volt-500">
            <IconBall className="h-[22px] w-[22px]" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[21px] font-extrabold leading-none tracking-tightest">
              Sorteio de Times
            </h1>
            <p className="mt-1 text-[12.5px] font-medium text-white/35">
              {presentCount > 0
                ? `${presentCount} em quadra · ${numTeams} times`
                : 'Vôlei sem discussão na hora de dividir'}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4">
        {tab === 'roster' && (
          <PlayersScreen
            players={players}
            onAdd={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            onEdit={(player) => {
              setEditing(player)
              setFormOpen(true)
            }}
            onDelete={setDeleting}
          />
        )}

        {tab === 'draw' && (
          <DrawScreen
            players={players}
            present={present}
            onTogglePresent={togglePresent}
            onSelectAll={() => setPresent(new Set(players.map((p) => p.id)))}
            onClearAll={() => setPresent(new Set())}
            mode={mode}
            onModeChange={setMode}
            teamCount={teamCount}
            onTeamCountChange={setTeamCount}
            playersPerTeam={playersPerTeam}
            onPlayersPerTeamChange={setPlayersPerTeam}
            numTeams={numTeams}
            onDraw={() => runDraw(false)}
            onGoToRoster={() => setTab('roster')}
          />
        )}

        {tab === 'teams' && (
          <TeamsScreen
            result={result}
            historyCount={history.length}
            onRedraw={() => runDraw(true)}
            onOpenHistory={() => setHistoryOpen(true)}
            onShare={handleShare}
            onGoToDraw={() => setTab('draw')}
          />
        )}
      </main>

      {/* --------------------------------------------------------- navegacao */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-white/[0.07] bg-ink-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="grid grid-cols-3">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-3 text-[11px] font-semibold transition ${
                  active ? 'text-white' : 'text-white/30 hover:text-white/55'
                }`}
              >
                {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-volt-500" />}
                <Icon className="h-[22px] w-[22px]" />
                {label}
                {id === 'teams' && result && !active && (
                  <span className="absolute right-[28%] top-2.5 h-1.5 w-1.5 rounded-full bg-volt-500" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ---------------------------------------------------------- overlays */}
      <PlayerFormSheet
        open={formOpen}
        player={editing}
        existingNames={players}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSavePlayer}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Excluir ${deleting?.name ?? ''}?`}
        description="O jogador sai do elenco salvo neste aparelho. Não dá para desfazer."
        onCancel={() => setDeleting(null)}
        onConfirm={handleDeletePlayer}
      />

      <HistorySheet
        open={historyOpen}
        history={history}
        currentSignature={result?.signature}
        onClose={() => setHistoryOpen(false)}
        onRestore={(entry) => {
          setResult({
            teams: entry.teams,
            sums: entry.sums,
            signature: entry.signature,
            spread: entry.spread,
            exhausted: false,
          })
          setHistoryOpen(false)
        }}
        onClear={() => {
          setHistory(
            result ? history.filter((entry) => entry.signature === result.signature) : [],
          )
          setHistoryOpen(false)
          notify('Histórico limpo.')
        }}
      />

      <Toast message={toast} />
    </div>
  )
}
