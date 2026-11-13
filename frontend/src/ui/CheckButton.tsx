import { Icon } from './Icon'

type Props = { checked: boolean; onChange: (checked: boolean) => void; label: string }

export function CheckButton({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors ${
        checked ? 'text-secondary' : 'text-outline hover:text-on-surface'
      }`}
    >
      <Icon name={checked ? 'check_box' : 'check_box_outline_blank'} size={24} fill={checked} />
    </button>
  )
}
