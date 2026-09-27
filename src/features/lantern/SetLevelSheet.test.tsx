import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LanternCurrentLevel, LanternScale } from '../../data/types'
import { SetLevelSheet } from './SetLevelSheet'

function scale(): LanternScale {
  return {
    id: 'scale-1',
    name: 'My Lantern',
    levelCount: 3,
    levels: [
      {
        id: 'l1',
        position: 1,
        label: 'Steady',
        description: 'Grounded enough.',
        actions: ['Breathe with me'],
      },
      {
        id: 'l2',
        position: 2,
        label: 'Stretched',
        description: 'Hard to hold.',
        actions: ['Stay close', 'Say nothing'],
      },
      {
        id: 'l3',
        position: 3,
        label: 'At the edge',
        description: 'Not safe alone.',
        actions: ['Stay with me'],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function currentOn(levelId: string): LanternCurrentLevel {
  return {
    id: 'cur-1',
    levelId,
    setAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 45 * 60_000).toISOString(),
  }
}

function renderSheet({ current = null, onSet, onClear }: {
  current?: LanternCurrentLevel | null
  onSet?: (levelId: string) => Promise<void>
  onClear?: () => Promise<void>
} = {}) {
  const setLevel = onSet ?? vi.fn(async () => {})
  const clearLevel = onClear ?? vi.fn(async () => {})
  const onError = vi.fn()
  const onClose = vi.fn()
  const view = render(
    <SetLevelSheet
      open
      onClose={onClose}
      scale={scale()}
      current={current}
      onSet={setLevel}
      onClear={clearLevel}
      onError={onError}
    />,
  )
  return { ...view, setLevel, clearLevel, onError, onClose }
}

describe('SetLevelSheet', () => {
  it('puts the level label before its number', () => {
    renderSheet()

    // Naming the feeling is the primary target (affect labelling), the numeral
    // is secondary. 'Stretched' contains no digit, so the first '2' after the
    // label is the position and the two offsets are unambiguous. Each offset is
    // asserted `>= 0` first: a missing match returns -1 and -1 sorts before
    // everything, which would make the ordering comparison pass on nothing.
    const buttonText = screen.getByRole('button', { name: /Stretched/ }).textContent ?? ''
    const labelInButton = buttonText.indexOf('Stretched')
    const numberInButton = buttonText.indexOf('2')
    expect(labelInButton).toBeGreaterThanOrEqual(0)
    expect(numberInButton).toBeGreaterThan(labelInButton)

    // The sheet renders through a portal, so the render `container` is empty —
    // read the dialog's own text for the same ordering at the whole-list level.
    const dialogText = screen.getByRole('dialog').textContent ?? ''
    const labelAt = dialogText.indexOf('Stretched')
    const numberAt = dialogText.indexOf('2')
    expect(labelAt).toBeGreaterThanOrEqual(0)
    expect(numberAt).toBeGreaterThan(labelAt)
  })

  it('previews what helps at the chosen level', () => {
    renderSheet()

    fireEvent.click(screen.getByRole('button', { name: /Stretched/ }))

    expect(screen.getByText('What helps at Stretched')).toBeInTheDocument()
    expect(screen.getByText('Stay close')).toBeInTheDocument()
    expect(screen.getByText('Say nothing')).toBeInTheDocument()
  })

  it('keeps confirm disabled until a level is chosen', () => {
    renderSheet()

    const confirm = screen.getByRole('button', { name: /Set this level/ })
    expect(confirm).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Steady/ }))

    expect(confirm).toBeEnabled()
  })

  it('sets the chosen level', async () => {
    const { setLevel, onClose } = renderSheet()

    fireEvent.click(screen.getByRole('button', { name: /At the edge/ }))
    fireEvent.click(screen.getByRole('button', { name: /Set this level/ }))

    await waitFor(() => expect(setLevel).toHaveBeenCalledWith('l3'))
    expect(onClose).toHaveBeenCalled()
  })

  it('clears an existing level', async () => {
    const { clearLevel } = renderSheet({ current: currentOn('l2') })

    expect(screen.getByText('Your current level')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear my level' }))

    await waitFor(() => expect(clearLevel).toHaveBeenCalled())
  })

  it('offers no clear control when there is nothing to clear', () => {
    renderSheet()

    expect(screen.queryByRole('button', { name: 'Clear my level' })).not.toBeInTheDocument()
  })
})
