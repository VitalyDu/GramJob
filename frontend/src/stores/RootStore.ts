import { AuthStore } from './AuthStore'

export class RootStore {
  auth: AuthStore

  constructor() {
    this.auth = new AuthStore()
  }
}

export const rootStore = new RootStore()
