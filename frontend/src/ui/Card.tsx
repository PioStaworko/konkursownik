import type { ReactNode } from 'react'

const tones = {
  low: 'bg-surface-container-low',
  default: 'bg-surface-container',
  high: 'bg-surface-container-high',
} as const

type Props = { tone?: keyof typeof tones; className?: string; children: ReactNode }

export function Card({ tone = 'low', className, children }: Props) {
  return (
    <div className={`${tones[tone]} rounded-xl p-space-md shadow-sm ${className ?? ''}`}>{children}</div>
  )
}
