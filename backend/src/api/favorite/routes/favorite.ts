export default {
  routes: [
    {
      method: 'GET',
      path: '/favorites',
      handler: 'favorite.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/favorites',
      handler: 'favorite.create',
      config: {},
    },
    {
      method: 'DELETE',
      path: '/favorites/:targetType/:targetId',
      handler: 'favorite.remove',
      config: {},
    },
  ],
}
