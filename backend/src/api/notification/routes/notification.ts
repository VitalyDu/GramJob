export default {
  routes: [
    {
      method: 'GET',
      path: '/notifications',
      handler: 'notification.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/notifications/read-all',
      handler: 'notification.markAllRead',
      config: {},
    },
    {
      method: 'PATCH',
      path: '/notifications/:id/read',
      handler: 'notification.markRead',
      config: {},
    },
  ],
}
