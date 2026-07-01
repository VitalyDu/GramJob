export default {
  routes: [
    {
      method: 'GET',
      path: '/notifications',
      handler: 'notification.findMine',
      config: { middlewares: ['plugin::users-permissions.isAuthenticated'] },
    },
    {
      method: 'POST',
      path: '/notifications/read-all',
      handler: 'notification.markAllRead',
      config: { middlewares: ['plugin::users-permissions.isAuthenticated'] },
    },
    {
      method: 'PATCH',
      path: '/notifications/:id/read',
      handler: 'notification.markRead',
      config: { middlewares: ['plugin::users-permissions.isAuthenticated'] },
    },
  ],
}
