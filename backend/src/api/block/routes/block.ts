export default {
  routes: [
    {
      method: 'GET',
      path: '/blocks',
      handler: 'block.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/blocks',
      handler: 'block.create',
      config: {},
    },
    {
      method: 'DELETE',
      path: '/blocks/:id',
      handler: 'block.remove',
      config: {},
    },
  ],
}
