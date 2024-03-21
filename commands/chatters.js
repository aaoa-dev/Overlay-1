export let chatters = [];

const chatterString = localStorage.getItem("chatters");
if (chatterString) {
  const chatterArr = JSON.parse(chatterString);
  if (Array.isArray(chatterArr)) {
    chatters.push(...chatterArr);
  }
}

const timeSpan = 10*60*1000;

setInterval(() => {
  const filteredChatters = chatters.filter(chatter => Date.now() - chatter.timestamp < timeSpan);
    if (filteredChatters.length != chatters.length) {
      chatters = filteredChatters;
      localStorage.setItem("chatters", JSON.stringify(chatters));
      
    }
}, 60000);

console.log(chatters);