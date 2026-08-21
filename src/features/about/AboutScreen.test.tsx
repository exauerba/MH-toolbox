import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AboutScreen } from './AboutScreen'

describe('AboutScreen crisis resources', () => {
  it('renders the US region by default', () => {
    render(<AboutScreen />)

    expect(
      screen.getByRole('link', { name: /988 Suicide & Crisis Lifeline/ }),
    ).toHaveAttribute('href', 'tel:988')
    expect(
      screen.getByRole('link', { name: /Crisis Text Line/ }),
    ).toHaveAttribute('href', 'sms:741741')
    expect(
      screen.getByRole('link', { name: /Emergency services/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /International Association for Suicide Prevention/ }),
    ).toBeInTheDocument()
  })

  it('switches regions and updates the resource list', async () => {
    const user = userEvent.setup()
    render(<AboutScreen />)

    expect(screen.queryByRole('link', { name: /Samaritans/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /United Kingdom/ }))

    expect(screen.getByRole('link', { name: /Samaritans/ })).toHaveAttribute(
      'href',
      'tel:116123',
    )
    expect(
      screen.getByRole('link', { name: /Emergency services/ }),
    ).toHaveAttribute('href', 'tel:999')
    expect(
      screen.queryByRole('link', { name: /988 Suicide & Crisis Lifeline/ }),
    ).not.toBeInTheDocument()
  })
})
