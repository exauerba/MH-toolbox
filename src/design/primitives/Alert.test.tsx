import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('renders the title and children', () => {
    render(
      <Alert title="Guest mode">Using locally on this device — sign in to back this up.</Alert>,
    )

    expect(screen.getByText('Guest mode')).toBeInTheDocument()
    expect(
      screen.getByText('Using locally on this device — sign in to back this up.'),
    ).toBeInTheDocument()
  })

  it('renders the body as a button when onClick is provided and clicking it calls onClick', () => {
    const onClick = vi.fn()
    render(<Alert title="Guest mode" onClick={onClick}>Using locally on this device.</Alert>)

    const button = screen.getByRole('button', { name: /Guest mode/ })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders exactly two sibling buttons when both onClick and dismissible are set', () => {
    const onClick = vi.fn()
    const onDismiss = vi.fn()
    render(
      <Alert title="Guest mode" onClick={onClick} dismissible onDismiss={onDismiss}>
        Using locally on this device.
      </Alert>,
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)

    const dismiss = screen.getByRole('button', { name: 'Dismiss this message' })
    expect(dismiss.parentElement).toBe(buttons[0].parentElement)

    fireEvent.click(dismiss)
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders no button and keeps role="status" when onClick is not provided', () => {
    const { container } = render(<Alert title="Guest mode">Using locally on this device.</Alert>)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBe(container.firstChild)
  })
})