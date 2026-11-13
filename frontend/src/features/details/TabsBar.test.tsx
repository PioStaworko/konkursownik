import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TabsBar from './TabsBar'

afterEach(() => vi.restoreAllMocks())

describe('TabsBar', () => {
  it('scrolls the active tab into view horizontally', () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    render(
      <TabsBar
        tabs={[
          { key: 'a', label: 'Pierwsza', icon: 'checklist' },
          { key: 'b', label: 'Druga', icon: 'checklist' },
        ]}
        active="b"
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Druga' })).toHaveAttribute('aria-selected', 'true')
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })
    expect(scroll.mock.contexts[0]).toBe(screen.getByRole('tab', { name: 'Druga' }))
  })
})
