import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'

export class RootStore {
  auth: AuthStore
  company: CompanyStore

  constructor() {
    this.auth = new AuthStore()
    this.company = new CompanyStore()
  }
}

export const rootStore = new RootStore()
