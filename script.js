import {check} from './commands/check.js';
import {refreshBS} from './commands/reset.js';
import {messageHandleTempertature} from './commands/temps.js';
import {config} from './config.js';

//This is TMI stuff that check message and act accordingly
const client = new tmi.Client({
  options: {
      skipUpdatingEmotesets: true,
  },
  identity: {
      username: config.settings.TWITCH.USERNAME,
      password: config.settings.TWITCH.OAUTH_TOKEN,
  },
  channels: [config.settings.TWITCH.CHANNEL_NAME],
});

client.connect().catch(console.error);
client.on("message", (channel, tags, message, self) => {
  if (self) return;
  // reset(tags, message);
  // if (message.startsWith('!')) return;
  check(tags);
  refreshBS(tags, message);
  messageHandleTempertature(message, client);
});

