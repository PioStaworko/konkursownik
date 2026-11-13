import { icons, type IconName } from '../ui/icons'

// Same list as the backend's ContestIcons.All (Material Symbols names).
export const DEFAULT_CONTEST_ICON = 'emoji_events'

export const CONTEST_ICONS = [
  'emoji_events', 'cookie', 'coffee', 'local_drink', 'icecream', 'local_pizza', 'liquor',
  'bakery_dining', 'storefront', 'shopping_basket', 'spa', 'cleaning_services', 'pets',
  'child_care', 'checkroom', 'devices', 'sports_esports', 'directions_car', 'flight', 'redeem',
] as const

export const asIcon = (name: string | null): IconName =>
  name && name in icons ? (name as IconName) : (DEFAULT_CONTEST_ICON as IconName)
