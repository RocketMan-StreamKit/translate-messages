/**
 * My StreamKit Addon
 * @see https://rocketman-streamkit.github.io/types/
 */

network.endpoints.create('webhook', 'POST', 'onWebhook');

events.On('onWebhook', ({ body }) => {
  console.log('Webhook payload', body);
  return { ok: true };
});

status.Update({ current: 'offline' });
