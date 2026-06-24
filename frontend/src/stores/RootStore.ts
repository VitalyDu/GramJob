import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'
import { VacancyStore } from './VacancyStore'

export class RootStore {
  auth: AuthStore
  company: CompanyStore
  vacancy: VacancyStore

  constructor() {
    this.auth = new AuthStore()
    this.company = new CompanyStore()
    this.vacancy = new VacancyStore()
  }
}

export const rootStore = new RootStore()
