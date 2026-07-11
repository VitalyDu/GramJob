import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'
import { VacancyStore } from './VacancyStore'
import { ResumeStore } from './ResumeStore'
import { ApplicationStore } from './ApplicationStore'
import { FavoriteStore } from './FavoriteStore'
import { BlockStore } from './BlockStore'
import { PaymentStore } from './PaymentStore'
import { NotificationStore } from './NotificationStore'
import { AnalyticsStore } from './AnalyticsStore'
import { LimitsStore } from './LimitsStore'

export class RootStore {
  auth: AuthStore
  company: CompanyStore
  vacancy: VacancyStore
  resume: ResumeStore
  application: ApplicationStore
  favorite: FavoriteStore
  block: BlockStore
  payment: PaymentStore
  notification: NotificationStore
  analytics: AnalyticsStore
  limits: LimitsStore

  constructor() {
    this.auth = new AuthStore()
    this.company = new CompanyStore()
    this.vacancy = new VacancyStore()
    this.resume = new ResumeStore()
    this.application = new ApplicationStore()
    this.favorite = new FavoriteStore()
    this.block = new BlockStore()
    this.payment = new PaymentStore()
    this.notification = new NotificationStore()
    this.analytics = new AnalyticsStore()
    this.limits = new LimitsStore()
  }
}

export const rootStore = new RootStore()
