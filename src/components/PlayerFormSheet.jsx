import { useEffect, useRef, useState } from 'react'
import StarRating, { formatRating } from './StarRating.jsx'
import { Sheet } from './Ui.jsx'

const HINTS = {
  0.5: 'Nunca jogou vôlei',
  1: 'Está começando agora',
  1.5: 'Iniciante',
  2: 'Quebra o galho',
  2.5: 'Joga o básico bem',
  3: 'Nível médio da turma',
  3.5: 'Acima da média',
  4: 'Faz diferença em quadra',
  4.5: 'Muito forte',
  5: 'Carrega o time nas costas',
}

export default function PlayerFormSheet({ open, player, existingNames, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(3)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setName(player?.name ?? '')
    setRating(player?.rating ?? 3)
    setError('')
    // Em celular o teclado sobe junto com o sheet — foco apos a animacao.
    const timer = setTimeout(() => inputRef.current?.focus(), 260)
    return () => clearTimeout(timer)
  }, [open, player])

  function handleSubmit(event) {
    event?.preventDefault()
    const trimmed = name.trim().replace(/\s+/g, ' ')

    if (!trimmed) {
      setError('Escreva o nome do jogador.')
      return
    }
    const duplicated = existingNames.some(
      (item) => item.id !== player?.id && item.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (duplicated) {
      setError('Já existe alguém com esse nome no elenco.')
      return
    }

    onSubmit({ id: player?.id, name: trimmed.slice(0, 40), rating })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={player ? 'Editar jogador' : 'Novo jogador'}
      subtitle={player ? 'Atualize o nome ou o nível.' : 'Nome e nível de jogo, do jeito que a turma enxerga.'}
      footer={
        <button type="button" onClick={handleSubmit} className="btn-primary w-full py-4 text-[16px]">
          {player ? 'Salvar alterações' : 'Adicionar ao elenco'}
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 pb-2">
        <div>
          <label htmlFor="player-name" className="mb-2 block text-[13px] font-semibold text-white/45">
            Nome
          </label>
          <input
            id="player-name"
            ref={inputRef}
            type="text"
            value={name}
            maxLength={40}
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Ex.: Mariana"
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            className="field"
          />
          {error && <p className="mt-2 text-[13px] font-medium text-red-400">{error}</p>}
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-white/45">Nível</span>
            <span className="num font-display text-xl font-extrabold tracking-tightest text-volt-500">
              {formatRating(rating)}
              <span className="ml-0.5 text-sm text-white/30">/5</span>
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-5 text-center">
            <StarRating value={rating} onChange={setRating} size="lg" gap={8} />
            <p className="mt-3 text-[13px] font-medium text-white/40">{HINTS[rating]}</p>
            <p className="mt-1 text-[11.5px] text-white/25">
              Toque na metade esquerda da estrela para meio ponto
            </p>
          </div>
        </div>

        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Sheet>
  )
}
