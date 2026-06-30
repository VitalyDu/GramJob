export default {
  routes: [
    {
      method: 'POST',
      path: '/telegram/webhook',
      handler: 'telegram-webhook.handle',
      config: { auth: false },
    },
  ],
}
