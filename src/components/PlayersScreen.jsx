import { useMemo, useState } from 'react'
import StarRating, { formatRating } from './StarRating.jsx'
import { Avatar, EmptyState, Segmented } from './Ui.jsx'
import { IconPencil, IconPlus, IconRoster, IconSearch, IconTrash } from './Icons.jsx'

function PlayerRow({ player, onEdit, onDelete }) {
  return (
    <li className="group flex items-center gap-3.5 px-4 py-3">
      <Avatar name={player.name} />

      <button
        type="button"
        onClick={() => onEdit(player)}
        className="min-w-0 flex-1 text-left"
        aria-label={`Editar ${player.name}`}
      >
        <p className="truncate text-[16px] font-semibold leading-tight">{player.name}</p>
        <span className="mt-1.5 flex items-center gap-2">
          <StarRating value={player.rating} size="sm" readOnly />
          <span className="num text-[12px] font-semibold text-white/35">
            {formatRating(player.rating)}
          </span>
        </span>
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(player)}
          aria-label={`Editar ${player.name}`}
          className="rounded-xl p-2.5 text-white/35 transition hover:bg-white/5 hover:text-white"
        >
          <IconPencil className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(player)}
          aria-label={`Excluir ${player.name}`}
          className="rounded-xl p-2.5 text-white/25 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <IconTrash className="h-[18px] w-[18px]" />
        </button>
      </div>
    </li>
  )
}

export default function PlayersScreen({ players, onAdd, onEdit, onDelete }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('name')

  const average = useMemo(() => {
    if (!players.length) return 0
    return players.reduce((acc, p) => acc + p.rating, 0) / players.length
  }, [players])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    const list = term
      ? players.filter((p) => p.name.toLowerCase().includes(term))
      : players.slice()
    list.sort((a, b) =>
      sort === 'rating'
        ? b.rating - a.rating || a.name.localeCompare(b.name, 'pt-BR')
        : a.name.localeCompare(b.name, 'pt-BR'),
    )
    return list
  }, [players, query, sort])

  if (!players.length) {
    return (
      <EmptyState
        icon={<IconRoster className="h-7 w-7" />}
        title="Seu elenco está vazio"
        description="Cadastre a galera que costuma jogar e dê uma nota de 1 a 5 estrelas para cada um. Isso fica salvo no seu celular."
        action={
          <button type="button" className="btn-primary h-12 px-6 text-[15px]" onClick={onAdd}>
            <IconPlus className="h-[18px] w-[18px]" />
            Cadastrar primeiro jogador
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Jogadores</p>
          <p className="num mt-1 font-display text-3xl font-extrabold tracking-tightest">
            {players.length}
          </p>
        </div>
        <div className="card px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Média</p>
          <p className="num mt-1 font-display text-3xl font-extrabold tracking-tightest">
            {formatRating(Math.round(average * 10) / 10)}
            <span className="ml-1 align-middle text-base font-bold text-white/25">★</span>
          </p>
        </div>
      </div>

      {players.length > 6 && (
        <div className="flex gap-2.5">
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/25" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              className="field py-3 pl-11 text-[15px]"
            />
          </div>
          <Segmented
            value={sort}
            onChange={setSort}
            options={[
              { value: 'name', label: 'A-Z' },
              { value: 'rating', label: 'Nível' },
            ]}
          />
        </div>
      )}

      <ul className="card divide-y divide-white/[0.05] overflow-hidden py-1">
        {visible.map((player) => (
          <PlayerRow key={player.id} player={player} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {!visible.length && (
          <li className="px-4 py-10 text-center text-[15px] text-white/35">
            Ninguém encontrado com “{query}”.
          </li>
        )}
      </ul>

      <button type="button" className="btn-ghost w-full py-3.5 text-[15px]" onClick={onAdd}>
        <IconPlus className="h-[18px] w-[18px]" />
        Adicionar jogador
      </button>
    </div>
  )
}
