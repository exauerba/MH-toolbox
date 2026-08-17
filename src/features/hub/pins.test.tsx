import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { RepositoryProvider } from '../../data/RepositoryProvider'
import type { ToolboxRepository } from '../../data/repository'
import { FakeRepository } from '../../data/testing/fakeRepository'
import { usePinnedTools } from './pins'

function wrapWith(repo: ToolboxRepository) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <RepositoryProvider initialRepo={repo}>{children}</RepositoryProvider>
  }
}

describe('usePinnedTools', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads pins from the repo', async () => {
    const repo = new FakeRepository()
    await repo.setPins(['jar', 'timeline'])
    const { result } = renderHook(() => usePinnedTools(), { wrapper: wrapWith(repo) })
    await waitFor(() => expect(result.current.pinned).toEqual(['jar', 'timeline']))
  })

  it('togglePin persists to the repo', async () => {
    const repo = new FakeRepository()
    await repo.setPins(['timeline'])
    const { result } = renderHook(() => usePinnedTools(), { wrapper: wrapWith(repo) })
    await waitFor(() => expect(result.current.pinned).toEqual(['timeline']))
    act(() => result.current.togglePin('jar'))
    expect(result.current.pinned).toEqual(['timeline', 'jar'])
    await expect(repo.getPins()).resolves.toEqual(['timeline', 'jar'])
  })

  it('movePin reorders and persists', async () => {
    const repo = new FakeRepository()
    await repo.setPins(['jar', 'bloom', 'timeline'])
    const { result } = renderHook(() => usePinnedTools(), { wrapper: wrapWith(repo) })
    await waitFor(() => expect(result.current.pinned).toEqual(['jar', 'bloom', 'timeline']))
    act(() => result.current.movePin('bloom', -1))
    expect(result.current.pinned).toEqual(['bloom', 'jar', 'timeline'])
    await expect(repo.getPins()).resolves.toEqual(['bloom', 'jar', 'timeline'])
  })

  it('reorder(fromIndex, toIndex) reorders and persists', async () => {
    const repo = new FakeRepository()
    await repo.setPins(['jar', 'bloom', 'timeline'])
    const { result } = renderHook(() => usePinnedTools(), { wrapper: wrapWith(repo) })
    await waitFor(() => expect(result.current.pinned).toEqual(['jar', 'bloom', 'timeline']))
    act(() => result.current.reorder(0, 2))
    expect(result.current.pinned).toEqual(['bloom', 'timeline', 'jar'])
    await expect(repo.getPins()).resolves.toEqual(['bloom', 'timeline', 'jar'])
  })

  it('localStorage seed migration', async () => {
    localStorage.setItem('steady:pins', JSON.stringify(['timeline', 'jar']))
    const repo = new FakeRepository()
    const { result } = renderHook(() => usePinnedTools(), { wrapper: wrapWith(repo) })
    await waitFor(() => expect(result.current.pinned).toEqual(['timeline', 'jar']))
    await expect(repo.getPins()).resolves.toEqual(['timeline', 'jar'])
    expect(localStorage.getItem('steady:pins')).toBeNull()
  })

  it('repo-swap reload', async () => {
    const repo1 = new FakeRepository()
    await repo1.setPins(['jar'])
    const repo2 = new FakeRepository()
    await repo2.setPins(['timeline'])
    const swap: { setRepo: (next: FakeRepository) => void } = { setRepo: () => {} }
    const Wrapper = ({ children }: { children: ReactNode }) => {
      const [repo, setRepo] = useState(repo1)
      const [key, setKey] = useState(0)
      swap.setRepo = (next: FakeRepository) => {
        setRepo(next)
        setKey((k) => k + 1)
      }
      return (
        <RepositoryProvider key={key} initialRepo={repo}>
          {children}
        </RepositoryProvider>
      )
    }
    const { result } = renderHook(() => usePinnedTools(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.pinned).toEqual(['jar']))
    act(() => swap.setRepo(repo2))
    await waitFor(() => expect(result.current.pinned).toEqual(['timeline']))
  })

  it("togglePin('more') is a no-op", async () => {
    const repo = new FakeRepository()
    const { result } = renderHook(() => usePinnedTools(), { wrapper: wrapWith(repo) })
    await waitFor(() => expect(result.current.pinned).toEqual(['jar', 'bloom']))
    act(() => result.current.togglePin('more'))
    expect(result.current.pinned).toEqual(['jar', 'bloom'])
    await expect(repo.getPins()).resolves.toEqual([])
  })
})