export default {
  routes: [
    {
      method: 'GET',
      path: '/saved-searches',
      handler: 'saved-search.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/saved-searches',
      handler: 'saved-search.create',
      config: {},
    },
    {
      method: 'DELETE',
      path: '/saved-searches/:id',
      handler: 'saved-search.remove',
      config: {},
    },
  ],
}
