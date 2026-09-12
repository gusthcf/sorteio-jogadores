import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CourtScreen from './components/CourtScreen.jsx'
import DrawScreen from './components/DrawScreen.jsx'
import GamesScreen from './components/GamesScreen.jsx'
import HistorySheet from './components/HistorySheet.jsx'
import PlayerFormSheet from './components/PlayerFormSheet.jsx'
import PlayersScreen from './components/PlayersScreen.jsx'
import { ConfirmDialog, Toast } from './components/Ui.jsx'
import { IconBall, IconChart, IconCourt, IconRoster, IconShuffle } from './components/Icons.jsx'
import { formatRating } from './components/StarRating.jsx'
import { EMPTY_DAY, drawDay, playMatch, restoreDraw, wouldBenchAgain } from './lib/day.js'
import { rotationPlayers } from './lib/rotation.js'
import { teamLabel, teamSum } from './lib/teams.js'
import { clampRating, createId, loadPlayers, savePlayers, storageAvailable } from './lib/storage.js'

const TABS = [
  { id: 'roster', label: 'Elenco', Icon: IconRoster },
  { id: 'draw', label: 'Sorteio', Icon: IconShuffle },
  { id: 'court', label: 'Quadra', Icon: IconCourt },
  { id: 'games', label: 'Jogos', Icon: IconChart },
]

const UNDO_LIMIT = 40

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
  const [teamSize, setTeamSize] = useState(6)
  // Tudo do dia fica num objeto so (ver lib/day.js): "Desfazer" e voltar ao snapshot anterior.
  const [day, setDay] = useState(EMPTY_DAY)
  const [undoStack, setUndoStack] = useState([])

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

  /** Aplica uma mudanca no dia guardando o estado anterior para o "Desfazer". */
  function commit(next) {
    setUndoStack((stack) => [day, ...stack].slice(0, UNDO_LIMIT))
    setDay(next)
  }

  function handleUndo() {
    if (!undoStack.length) return
    const [previous, ...rest] = undoStack
    setDay(previous)
    setUndoStack(rest)
    notify('Última ação desfeita.')
  }

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

  const onCourtToday = useMemo(() => rotationPlayers(day.rotation), [day.rotation])

  const presenceChanged = useMemo(() => {
    if (!day.rotation) return false
    if (onCourtToday.length !== present.size) return true
    return onCourtToday.some((p) => !present.has(p.id))
  }, [day.rotation, onCourtToday, present])

  // Quem aparece na contagem: quem esta na rotacao + quem ja jogou alguma partida hoje.
  const dayPlayers = useMemo(() => {
    const byId = new Map(onCourtToday.map((p) => [p.id, p]))
    for (const p of players) if (day.matchCounts[p.id] != null) byId.set(p.id, p)
    return [...byId.values()].map((p) => players.find((x) => x.id === p.id) || p)
  }, [onCourtToday, players, day.matchCounts])

  /* -------------------------------------------------------------- sorteio */
  function handleDraw() {
    // Presenca e a fonte da verdade; se estiver vazia, re-sorteia quem ja esta jogando.
    const pool = presentPlayers.length >= 2 ? presentPlayers : onCourtToday
    const next = drawDay(day, pool, teamSize)
    if (!next) {
      notify('Marque pelo menos 2 jogadores presentes.')
      return
    }
    commit(next)
    setTab('court')
    window.scrollTo({ top: 0 })
    navigator.vibrate?.(12)
  }

  /* -------------------------------------------------------------- partida */
  function handleWinner(number) {
    if (!day.rotation) return
    const next = playMatch(day, number, presentPlayers, teamSize)
    commit(next)
    window.scrollTo({ top: 0 })
    navigator.vibrate?.(next.lastEvent?.type === 'streak' ? [20, 60, 20] : 12)
  }

  // Placar nao entra no "Desfazer": ja tem o proprio toque para diminuir.
  function handleScore(number, value) {
    setDay((current) => ({ ...current, score: { ...current.score, [number]: value } }))
    navigator.vibrate?.(6)
  }

  /* ---------------------------------------------------------- compartilhar */
  async function handleShare() {
    if (!day.rotation) return
    const { court, queue } = day.rotation
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const line = (team) =>
      `${teamLabel(team.number)} (${formatRating(teamSum(team.players))}★): ${team.players
        .map((p) => p.name)
        .join(', ')}`

    const text = [
      `\u{1F3D0} Partida ${day.matches.length + 1} · ${date}`,
      '',
      'EM QUADRA',
      line(court[0]),
      line(court[1]),
      ...(queue.length ? ['', 'NA FILA', ...queue.map((team, i) => `${i + 1}º ${line(team)}`)] : []),
    ].join('\n')

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
  const subtitle = day.rotation
    ? `Partida ${day.matches.length + 1} · ${onCourtToday.length} jogando hoje`
    : presentPlayers.length > 0
      ? `${presentPlayers.length} presentes`
      : 'Vôlei sem discussão na hora de dividir'

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
            <p className="num mt-1 text-[12.5px] font-medium text-white/35">{subtitle}</p>
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
            teamSize={teamSize}
            onTeamSizeChange={setTeamSize}
            hasSession={Boolean(day.rotation)}
            onDraw={handleDraw}
            onGoToRoster={() => setTab('roster')}
          />
        )}

        {tab === 'court' && (
          <CourtScreen
            rotation={day.rotation}
            teamSize={day.draw?.teamSize ?? teamSize}
            score={day.score}
            lastEvent={day.lastEvent}
            matchNumber={day.matches.length + 1}
            canUndo={undoStack.length > 0}
            presenceChanged={presenceChanged}
            historyCount={day.history.length}
            onWinner={handleWinner}
            onScore={handleScore}
            onUndo={handleUndo}
            onRedraw={handleDraw}
            onShare={handleShare}
            onOpenHistory={() => setHistoryOpen(true)}
            onGoToDraw={() => setTab('draw')}
          />
        )}

        {tab === 'games' && (
          <GamesScreen
            dayPlayers={dayPlayers}
            matchCounts={day.matchCounts}
            matches={day.matches}
            onGoToCourt={() => setTab('court')}
          />
        )}
      </main>

      {/* --------------------------------------------------------- navegacao */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-white/[0.07] bg-ink-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="grid grid-cols-4">
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
                {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-volt-500" />}
                <Icon className="h-[22px] w-[22px]" />
                {label}
                {id === 'court' && day.rotation && !active && (
                  <span className="absolute right-[26%] top-2.5 h-1.5 w-1.5 rounded-full bg-volt-500" />
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
        history={day.history}
        currentSignature={day.draw?.signature}
        isBlocked={(entry) => wouldBenchAgain(entry, day.satOutLast)}
        onClose={() => setHistoryOpen(false)}
        onRestore={(entry) => {
          if (wouldBenchAgain(entry, day.satOutLast)) return
          commit(restoreDraw(day, entry))
          setHistoryOpen(false)
        }}
        onClear={() => {
          commit({
            ...day,
            history: day.history.filter((entry) => entry.signature === day.draw?.signature).slice(0, 1),
          })
          setHistoryOpen(false)
          notify('Histórico limpo.')
        }}
      />

      <Toast message={toast} />
    </div>
  )
}
