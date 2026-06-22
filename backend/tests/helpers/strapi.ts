import { createStrapi, compileStrapi } from '@strapi/strapi'
import type { Core } from '@strapi/strapi'
import * as path from 'path'

let instance: Core.Strapi | undefined

export async function setupStrapi(): Promise<Core.Strapi> {
  if (!instance) {
    process.env.DATABASE_NAME = 'gramjob_test'
    process.env.NODE_ENV = 'test'
    const appDir = path.resolve(__dirname, '../..')
    const distDir = path.resolve(appDir, 'dist')
    await compileStrapi({ appDir })
    instance = await createStrapi({ appDir, distDir }).load()
    await instance.server.mount()
  }
  return instance
}

export async function teardownStrapi(): Promise<void> {
  if (instance) {
    await instance.server.destroy()
    await instance.destroy()
    instance = undefined
  }
}
