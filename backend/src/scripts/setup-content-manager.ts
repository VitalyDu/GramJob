import type { Core } from '@strapi/strapi'

interface CmConfig {
  settings: {
    bulkable: boolean
    filterable: boolean
    searchable: boolean
    pageSize: number
    mainField: string
    defaultSortBy: string
    defaultSortOrder: string
  }
  layouts: {
    list: string[]
  }
  metadatas: Record<string, { list: { label: string; searchable: boolean; sortable: boolean } }>
}

const CONTENT_TYPES: Array<{ uid: string; config: CmConfig }> = [
  {
    uid: 'api::vacancy.vacancy',
    config: {
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 50,
        mainField: 'title',
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
      },
      layouts: {
        list: ['id', 'title', 'moderationStatus', 'createdAt'],
      },
      metadatas: {
        id: { list: { label: 'ID', searchable: false, sortable: true } },
        title: { list: { label: 'Название', searchable: true, sortable: true } },
        moderationStatus: { list: { label: 'Статус', searchable: false, sortable: true } },
        createdAt: { list: { label: 'Создана', searchable: false, sortable: true } },
      },
    },
  },
  {
    uid: 'api::resume.resume',
    config: {
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 50,
        mainField: 'title',
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
      },
      layouts: {
        list: ['id', 'title', 'moderationStatus', 'createdAt'],
      },
      metadatas: {
        id: { list: { label: 'ID', searchable: false, sortable: true } },
        title: { list: { label: 'Должность', searchable: true, sortable: true } },
        moderationStatus: { list: { label: 'Статус', searchable: false, sortable: true } },
        createdAt: { list: { label: 'Создано', searchable: false, sortable: true } },
      },
    },
  },
  {
    uid: 'api::company.company',
    config: {
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 50,
        mainField: 'name',
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
      },
      layouts: {
        list: ['id', 'name', 'moderationStatus', 'createdAt'],
      },
      metadatas: {
        id: { list: { label: 'ID', searchable: false, sortable: true } },
        name: { list: { label: 'Название', searchable: true, sortable: true } },
        moderationStatus: { list: { label: 'Статус', searchable: false, sortable: true } },
        createdAt: { list: { label: 'Создана', searchable: false, sortable: true } },
      },
    },
  },
]

export async function setupContentManagerViews(strapi: Core.Strapi) {
  for (const { uid, config } of CONTENT_TYPES) {
    const storeKey = `configuration_content_types::${uid}`
    try {
      await strapi
        .store({ type: 'plugin', name: 'content-manager', key: storeKey })
        .set({ value: config })
      strapi.log.info(`[content-manager] List view configured for ${uid}`)
    } catch (err) {
      strapi.log.warn(`[content-manager] Failed to configure list view for ${uid}:`, err)
    }
  }
}
