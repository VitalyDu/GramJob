import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'
import { VacancyStore } from './VacancyStore'
import { ResumeStore } from './ResumeStore'
import { ApplicationStore } from './ApplicationStore'

export class RootStore {
  auth: AuthStore
  company: CompanyStore
  vacancy: VacancyStore
  resume: ResumeStore
  application: ApplicationStore

  constructor() {
    this.auth = new AuthStore()
    this.company = new CompanyStore()
    this.vacancy = new VacancyStore()
    this.resume = new ResumeStore()
    this.application = new ApplicationStore()
  }
}

export const rootStore = new RootStore()
