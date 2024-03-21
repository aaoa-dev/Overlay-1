import {reset, check} from './commands/index.js';

//This is TMI stuff that check message and act accordingly
const client = new tmi.Client({
  options: { debug: true },
  channels: ["aaoa_"],
});
client.connect().catch(console.error);
client.on("message", (channel, tags, message, self) => {
  if (self) return;
  // reset(tags, message);
  // if (message.startsWith('!')) return;
  check(tags);
});
