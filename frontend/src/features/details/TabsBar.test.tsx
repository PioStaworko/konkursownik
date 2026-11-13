import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TabsBar from './TabsBar'

afterEach(() => vi.restoreAllMocks())

const tabs = [
  { key: 'a', label: 'Pierwsza', icon: 'checklist' as const },
  { key: 'b', label: 'Druga', icon: 'checklist' as const },
]

describe('TabsBar', () => {
  it('scrolls only the tablist horizontally to reveal an off-screen active tab', () => {
    const intoView = vi.fn()
    const winScroll = vi.fn()
    Element.prototype.scrollIntoView = intoView
    vi.stubGlobal('scrollTo', winScroll)
    const clientWidth = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200)
    const offsetLeft = vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(300)
    const offsetWidth = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100)
    render(<TabsBar tabs={tabs} active="b" onChange={() => {}} />)
    expect(screen.getByRole('tablist').scrollLeft).toBe(200) // 300 + 100 - 200
    expect(intoView).not.toHaveBeenCalled()
    expect(winScroll).not.toHaveBeenCalled()
    clientWidth.mockRestore()
    offsetLeft.mockRestore()
    offsetWidth.mockRestore()
  })
})
