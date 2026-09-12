import { useEffect } from 'react'
import { IconMinus, IconPlus, IconX } from './Icons.jsx'

/* ------------------------------------------------------------------ Sheet */

/** Bottom sheet — o padrao de modal que melhor funciona no polegar, em celular. */
export function Sheet({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md animate-sheet-up rounded-t-4xl border-t border-white/10 bg-ink-900
                   shadow-lift sm:rounded-4xl sm:border"
      >
        <div className="flex items-start gap-3 px-6 pb-2 pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[22px] font-bold leading-tight tracking-tightest">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-white/45">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 -mt-1 rounded-xl p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
          >
            <IconX />
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-6 py-3">{children}</div>

        {footer && (
          <div className="border-t border-white/[0.07] px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- Stepper */

/** Controle numerico grande o suficiente para o dedo (alvos de 44px). */
export function Stepper({ value, min, max, onChange, suffix }) {
  const canDown = value > min
  const canUp = value < max

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900 p-1.5">
      <button
        type="button"
        aria-label="Diminuir"
        disabled={!canDown}
        onClick={() => canDown && onChange(value - 1)}
        className="btn h-11 w-11 shrink-0 rounded-xl bg-white/[0.06] text-white hover:bg-white/10"
      >
        <IconMinus />
      </button>
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center leading-none">
        <span className="num font-display text-2xl font-extrabold tracking-tightest">{value}</span>
        {suffix && <span className="mt-0.5 text-[11px] font-medium text-white/40">{suffix}</span>}
      </div>
      <button
        type="button"
        aria-label="Aumentar"
        disabled={!canUp}
        onClick={() => canUp && onChange(value + 1)}
        className="btn h-11 w-11 shrink-0 rounded-xl bg-white/[0.06] text-white hover:bg-white/10"
      >
        <IconPlus />
      </button>
    </div>
  )
}

/* -------------------------------------------------------------- Segmented */

export function Segmented({ options, value, onChange }) {
  return (
    <div
      role="tablist"
      className="grid grid-flow-col gap-1 rounded-2xl border border-white/10 bg-ink-900 p-1"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
              active ? 'bg-white text-ink-950 shadow-soft' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/* ----------------------------------------------------------------- Avatar */

export function Avatar({ name, size = 40, tone = 'neutral' }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl font-bold tracking-tight ${
        tone === 'accent'
          ? 'bg-volt-500/15 text-volt-400'
          : 'bg-white/[0.06] text-white/65 ring-1 ring-inset ring-white/[0.06]'
      }`}
    >
      {initials || '?'}
    </span>
  )
}

/* ------------------------------------------------------------- EmptyState */

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/[0.07] bg-white/[0.03] text-white/30">
        {icon}
      </div>
      <h3 className="font-display text-xl font-bold tracking-tightest">{title}</h3>
      <p className="mt-2 max-w-[30ch] text-[15px] leading-relaxed text-white/40">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ Toast */

export function Toast({ message }) {
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4">
      <div className="animate-toast-in rounded-2xl border border-white/10 bg-ink-750/95 px-4 py-3 text-center text-[13.5px] font-medium text-white shadow-lift backdrop-blur">
        {message}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- Confirm */

export function ConfirmDialog({ open, title, description, confirmLabel = 'Excluir', onConfirm, onCancel }) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      subtitle={description}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn-ghost h-12 text-[15px]" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn h-12 bg-red-500/90 text-[15px] text-white hover:bg-red-500"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="h-1" />
    </Sheet>
  )
}
