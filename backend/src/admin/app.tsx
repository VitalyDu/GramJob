import * as React from 'react'
import type { StrapiApp } from '@strapi/strapi/admin'
import {
  ApproveAction,
  RejectAction,
  ResolveReportAction,
  DismissReportAction,
} from './extensions/moderation/actions'

// Simple checkmark icon component (avoids @strapi/icons external resolution issue)
const ModerationIcon = () =>
  React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      width: '1em',
      height: '1em',
      fill: 'currentColor',
    },
    React.createElement('path', {
      d: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    })
  )

export default {
  config: {
    locales: [],
  },
  register(app: StrapiApp) {
    app.addMenuLink({
      to: '/moderation',
      icon: ModerationIcon,
      intlLabel: { id: 'moderation.menu.label', defaultMessage: 'Модерация' },
      permissions: [],
      Component: () => import('./extensions/moderation/StatsPage'),
    })
  },
  bootstrap(app: StrapiApp) {
    const contentManager = app.getPlugin('content-manager')
    const apis = contentManager.apis as unknown as {
      addDocumentAction: (reducer: (actions: unknown[]) => unknown[]) => void
    }
    apis.addDocumentAction((actions) => [
      ApproveAction,
      RejectAction,
      ResolveReportAction,
      DismissReportAction,
      ...actions,
    ])
  },
}
