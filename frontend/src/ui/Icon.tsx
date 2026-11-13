import { icons, type IconName } from './icons'

type Props = { name: IconName; size?: number; fill?: boolean; className?: string }

export function Icon({ name, size = 20, fill = false, className }: Props) {
  const raw = icons[name][fill ? 1 : 0]
  const svg = raw
    .replace(/ width="\d+" height="\d+"/, ` width="${size}" height="${size}" fill="currentColor" aria-hidden="true" focusable="false"`)
  return (
    <span
      className={`inline-flex shrink-0 leading-none ${className ?? ''}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
