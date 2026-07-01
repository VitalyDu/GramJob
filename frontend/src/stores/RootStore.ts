import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'
import { VacancyStore } from './VacancyStore'
import { ResumeStore } from './ResumeStore'
import { ApplicationStore } from './ApplicationStore'
import { FavoriteStore } from './FavoriteStore'
import { SavedSearchStore } from './SavedSearchStore'
import { BlockStore } from './BlockStore'
import { PaymentStore } from './PaymentStore'
import { NotificationStore } from './NotificationStore'
import { AnalyticsStore } from './AnalyticsStore'

export class RootStore {
  auth: AuthStore
  company: CompanyStore
  vacancy: VacancyStore
  resume: ResumeStore
  application: ApplicationStore
  favorite: FavoriteStore
  savedSearch: SavedSearchStore
  block: BlockStore
  payment: PaymentStore
  notification: NotificationStore
  analytics: AnalyticsStore

  constructor() {
    this.auth = new AuthStore()
    this.company = new CompanyStore()
    this.vacancy = new VacancyStore()
    this.resume = new ResumeStore()
    this.application = new ApplicationStore()
    this.favorite = new FavoriteStore()
    this.savedSearch = new SavedSearchStore()
    this.block = new BlockStore()
    this.payment = new PaymentStore()
    this.notification = new NotificationStore()
    this.analytics = new AnalyticsStore()
  }
}

export const rootStore = new RootStore()
