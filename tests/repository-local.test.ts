import 'fake-indexeddb/auto'
import { createSteadyDB } from '../src/data/local/db'
import { LocalRepository } from '../src/data/local/LocalRepository'
import { runRepositorySuite } from './parity.suite'

// Unique DB per test so suites never share state (fake-indexeddb is global).
let dbCounter = 0

runRepositorySuite('local (Dexie)', () => {
  const db = createSteadyDB(`steady-test-${dbCounter++}`)
  return {
    repo: new LocalRepository(db),
    teardown: async () => {
      await db.delete()
    },
  }
})