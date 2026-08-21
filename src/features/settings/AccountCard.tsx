import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Icon, SegmentedControl, TextInput } from '../../design'
import { useAuthMode } from '../../data/RepositoryProvider'
import { supabase } from '../../config/supabase'
import {
  createAuthService,
  lockedMessage,
  MESSAGES,
  PASSWORD_MIN_LENGTH,
  usernameIsValid,
} from '../../auth/authCore'

type FormMode = 'sign-in' | 'create'

/**
 * The account row inside the "Your data" card. Handles three states:
 * not configured, signed in, and signed out (with an inline sign-in form).
 */
export function AccountCard() {
  const { mode, user } = useAuthMode()
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('sign-in')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const authService = useMemo(() => createAuthService(), [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLockoutMessage(null)
    if (!usernameIsValid(username)) {
      setError(MESSAGES.USERNAME_INVALID)
      return
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(MESSAGES.PASSWORD_TOO_SHORT)
      return
    }
    setSubmitting(true)
    const result =
      formMode === 'create'
        ? await authService.signUp(username, password)
        : await authService.signIn(username, password)
    if (!result.ok) {
      setError(result.error)
      if (formMode === 'sign-in') {
        const status = authService.lockoutStatus()
        if (status.locked) {
          setLockoutMessage(lockedMessage(status.remainingSeconds))
        }
      }
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setUsername('')
    setPassword('')
    setError(null)
    setLockoutMessage(null)
    setShowForm(false)
  }

  if (supabase === null) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted px-3 py-2">
        <div className="min-w-0">
          <p className="font-bold text-ink">Account</p>
          <p className="text-sm text-ink-soft">{MESSAGES.NOT_CONFIGURED}</p>
        </div>
        <Button variant="secondary" disabled leadingIcon={<Icon name="user" size={16} pixel />}>
          Sign in
        </Button>
      </div>
    )
  }

  if (mode === 'signed-in') {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted px-3 py-2">
        <div className="min-w-0">
          <p className="font-bold text-ink">Account</p>
          <p className="text-sm text-ink-soft">Signed in as {user?.username}</p>
        </div>
        <Button
          variant="secondary"
          leadingIcon={<Icon name="logout" size={16} pixel />}
          onClick={() => {
            void authService.signOut()
          }}
        >
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted px-3 py-2">
        <div className="min-w-0">
          <p className="font-bold text-ink">Account</p>
          <p className="text-sm text-ink-soft">
            Using steady locally on this device. Sign in to back your tools up
            across devices.
          </p>
        </div>
        <Button
          variant="secondary"
          leadingIcon={<Icon name="user" size={16} pixel />}
          onClick={() => {
            setShowForm((open) => !open)
            setError(null)
            setLockoutMessage(null)
          }}
        >
          Sign in
        </Button>
      </div>
      {showForm && (
        <form
          aria-label="Account form"
          className="mt-3 space-y-3"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <TextInput
            id="account-username"
            label="Username"
            hint="Letters, numbers, dots, and dashes."
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <TextInput
            id="account-password"
            label="Password"
            type="password"
            hint="At least 6 characters."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <SegmentedControl
            label="Account mode"
            value={formMode}
            onChange={(value) => setFormMode(value as FormMode)}
            options={[
              { value: 'sign-in', label: 'Sign in' },
              { value: 'create', label: 'Create account' },
            ]}
            pixel
          />
          {error && <Alert variant="error">{error}</Alert>}
          {lockoutMessage && <Alert variant="warning">{lockoutMessage}</Alert>}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={submitting}
            disabled={lockoutMessage !== null}
          >
            {formMode === 'create' ? 'Create account' : 'Sign in'}
          </Button>
        </form>
      )}
    </div>
  )
}