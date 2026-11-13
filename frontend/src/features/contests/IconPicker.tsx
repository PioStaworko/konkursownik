import { CONTEST_ICONS } from '../../lib/contestIcons'
import { Icon } from '../../ui/Icon'

const ICON_LABELS: Record<(typeof CONTEST_ICONS)[number], string> = {
  emoji_events: 'Puchar',
  cookie: 'Ciastko',
  coffee: 'Kawa',
  local_drink: 'Napój',
  icecream: 'Lody',
  local_pizza: 'Pizza',
  liquor: 'Alkohol',
  bakery_dining: 'Pieczywo',
  storefront: 'Sklep',
  shopping_basket: 'Koszyk',
  spa: 'Kosmetyki',
  cleaning_services: 'Chemia domowa',
  pets: 'Zwierzęta',
  child_care: 'Dziecko',
  checkroom: 'Ubrania',
  devices: 'Elektronika',
  sports_esports: 'Gry',
  directions_car: 'Samochód',
  flight: 'Podróż',
  redeem: 'Prezent',
}

type Props = { value: string | null; onChange: (icon: string) => void }

export default function IconPicker({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Ikona" className="grid grid-cols-5 gap-space-sm">
      {CONTEST_ICONS.map((name) => {
        const selected = value === name
        return (
          <button
            key={name}
            type="button"
            aria-pressed={selected}
            aria-label={ICON_LABELS[name]}
            title={ICON_LABELS[name]}
            onClick={() => onChange(name)}
            className={`flex min-h-11 items-center justify-center rounded-lg transition-colors ${
              selected
                ? 'bg-primary text-on-primary ring-2 ring-primary'
                : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon name={name} size={24} />
          </button>
        )
      })}
    </div>
  )
}
