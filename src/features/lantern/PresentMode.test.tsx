import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LanternScale } from '../../data/types'
import { PresentMode } from './PresentMode'

function scale(levelCount: number): LanternScale {
  const levels = Array.from({ length: levelCount }, (_, i) => ({
    id: `level-${i + 1}`,
    position: i + 1,
    label: `Level ${i + 1}`,
    description: `Description ${i + 1}`,
    actions: [`Action ${i + 1}a`, `Action ${i + 1}b`],
  }))
  return {
    id: 'scale-1',
    name: 'My Lantern',
    levelCount,
    levels,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function renderPresent(scaleData: LanternScale, onClose = vi.fn()) {
  return render(
    <PresentMode open scale={scaleData} imagesByLevel={{}} onClose={onClose} />,
  )
}

describe('PresentMode', () => {
  it('starts in locate phase listing every level', () => {
    renderPresent(scale(3))
    expect(screen.getByText('Where are you right now?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Level 1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Level 3/ })).toBeInTheDocument()
  })

  it('tapping a level opens present phase with its content', () => {
    renderPresent(scale(3))
    fireEvent.click(screen.getByRole('button', { name: /Level 2/ }))
    expect(screen.getByText('Description 2')).toBeInTheDocument()
    expect(screen.getByText('Action 2a')).toBeInTheDocument()
    expect(screen.getByText('Action 2b')).toBeInTheDocument()
  })

  it('shows a crisis callout on the top level', () => {
    renderPresent(scale(3))
    fireEvent.click(screen.getByRole('button', { name: /Level 3/ }))
    expect(screen.getByText('This is a crisis level.')).toBeInTheDocument()
    expect(screen.getByText(/988 Suicide & Crisis Lifeline/)).toBeInTheDocument()
  })

  it('does not show a crisis callout on a calm level', () => {
    renderPresent(scale(3))
    fireEvent.click(screen.getByRole('button', { name: /Level 1/ }))
    expect(screen.queryByText('This is a crisis level.')).not.toBeInTheDocument()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    renderPresent(scale(3), onClose)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('navigates levels with arrow keys', () => {
    renderPresent(scale(3))
    fireEvent.click(screen.getByRole('button', { name: /Level 1/ }))
    expect(screen.getByText('Description 1')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByText('Description 2')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByText('Description 1')).toBeInTheDocument()
  })
})