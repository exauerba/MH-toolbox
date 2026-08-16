import { FakeRepository } from '../src/data/testing/fakeRepository'
import { runRepositorySuite } from './parity.suite'

runRepositorySuite('fake', () => ({ repo: new FakeRepository() }))