const STAR_PATH =
  'M12 2.6l2.86 5.8 6.4.93-4.63 4.51 1.09 6.38L12 17.2l-5.72 3.02 1.09-6.38L2.74 9.33l6.4-.93L12 2.6Z'

function StarShape({ size, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  )
}

/** Uma estrela que pode estar vazia, pela metade ou cheia. */
function Star({ portion, size }) {
  return (
    <span className="relative inline-block align-middle" style={{ width: size, height: size }}>
      <StarShape size={size} className="absolute inset-0 text-white/[0.11]" />
      {portion > 0 && (
        <span
          className="absolute inset-0 overflow-hidden"
          style={{ width: portion === 0.5 ? '50%' : '100%' }}
        >
          <StarShape size={size} className="text-volt-500 drop-shadow-[0_0_6px_rgba(204,255,51,.25)]" />
        </span>
      )}
    </span>
  )
}

const SIZES = { sm: 13, md: 18, lg: 38 }

/**
 * Avaliacao em estrelas com meia-estrela.
 * Modo leitura: apenas exibe. Modo edicao: cada estrela vira dois alvos de toque
 * (metade esquerda = X,5 / metade direita = X,0).
 */
export default function StarRating({ value = 0, onChange, size = 'md', readOnly = false, gap = 2 }) {
  const px = SIZES[size] ?? SIZES.md

  return (
    <span className="inline-flex items-center" style={{ gap }}>
      {[1, 2, 3, 4, 5].map((index) => {
        const portion = value >= index ? 1 : value >= index - 0.5 ? 0.5 : 0

        if (readOnly) return <Star key={index} portion={portion} size={px} />

        return (
          <span key={index} className="relative inline-block" style={{ width: px, height: px }}>
            <Star portion={portion} size={px} />
            <button
              type="button"
              aria-label={`${index - 0.5} estrelas`}
              onClick={() => onChange?.(index - 0.5)}
              className="absolute inset-y-0 left-0 w-1/2 rounded-l-md"
              style={{ marginLeft: -gap / 2, paddingLeft: gap / 2 }}
            />
            <button
              type="button"
              aria-label={`${index} estrelas`}
              onClick={() => onChange?.(index)}
              className="absolute inset-y-0 right-0 w-1/2 rounded-r-md"
              style={{ marginRight: -gap / 2, paddingRight: gap / 2 }}
            />
          </span>
        )
      })}
    </span>
  )
}

/** 3,5 -> "3,5"  |  4 -> "4" */
export function formatRating(value) {
  return Number(value).toFixed(1).replace('.0', '').replace('.', ',')
}
