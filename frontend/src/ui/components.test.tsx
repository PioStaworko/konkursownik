import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Icon } from './Icon'
import { CheckButton } from './CheckButton'
import { BottomSheet } from './BottomSheet'
import { StatusBadge } from './StatusBadge'
import { FilterPill } from './FilterPill'
import { Field } from './Field'
import { Button } from './Button'

describe('Icon', () => {
  it('renders svg with aria-hidden', () => {
    const { container } = render(<Icon name="search" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('uses a different glyph when filled', () => {
    const a = render(<Icon name="check_circle" />).container.innerHTML
    const b = render(<Icon name="check_circle" fill />).container.innerHTML
    expect(a).not.toBe(b)
  })
})

describe('CheckButton', () => {
  it('toggles and has 44px target', async () => {
    function Host() {
      const [on, setOn] = useState(false)
      return <CheckButton checked={on} onChange={setOn} label="Kupione" />
    }
    render(<Host />)
    const btn = screen.getByRole('button', { name: 'Kupione' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(btn).toHaveClass('min-w-11', 'min-h-11')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('BottomSheet', () => {
  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<BottomSheet open onClose={onClose} title="Tytuł"><button>wew</button></BottomSheet>)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on backdrop click and renders nothing when closed', async () => {
    const onClose = vi.fn()
    const { rerender } = render(<BottomSheet open onClose={onClose} title="Tytuł">x</BottomSheet>)
    await userEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
    rerender(<BottomSheet open={false} onClose={onClose} title="Tytuł">x</BottomSheet>)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('traps focus inside', async () => {
    render(<BottomSheet open onClose={() => {}} title="T"><button>a</button><button>b</button></BottomSheet>)
    const dialog = screen.getByRole('dialog')
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
  })
})

describe('small components', () => {
  it('StatusBadge shows Polish label', () => {
    render(<StatusBadge status="AwaitingResults" />)
    expect(screen.getByText('Czekam na wyniki')).toBeInTheDocument()
  })

  it('FilterPill exposes active state and count', () => {
    render(<FilterPill active count={7}>Wszystkie</FilterPill>)
    expect(screen.getByRole('button', { name: /Wszystkie/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('Field links label, shows error', () => {
    render(<Field label="Nazwa" error="Wymagane"><input /></Field>)
    expect(screen.getByLabelText('Nazwa')).toHaveAccessibleDescription('Wymagane')
    expect(screen.getByRole('alert')).toHaveTextContent('Wymagane')
  })

  it('Button renders variant and click', async () => {
    const onClick = vi.fn()
    render(<Button variant="success" onClick={onClick}>OK</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(onClick).toHaveBeenCalled()
  })
})
