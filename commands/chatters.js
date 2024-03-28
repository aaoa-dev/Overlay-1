import {updateUI} from './reset.js';
export let chatters = [];

export const chattersContainer = document.getElementById("chattersContainer");
export function addChatter(chatter) {
  console.log(chatter)
chattersContainer.innerHTML += `<div id="${chatter.user}" class="aspect-square h-auto w-20 flex justify-center align-middle items-center bg-[var(--chatter-color)] text-5xl font-extrabold text-black rounded-full" style="--chatter-color: ${chatter.color || "#ffffff"}">
${chatter.user[0].toUpperCase()}
</div>`;
}

const chatterString = localStorage.getItem("chatters");
if (chatterString) {
  const chatterArr = JSON.parse(chatterString);
  if (Array.isArray(chatterArr)) {
    
    for (let index = 0; index < chatterArr.length; index++) {
      addChatter(chatterArr[index]);
    }
    chatters.push(...chatterArr);
  }
  
}

const timeSpan = 5*60*1000;
const interval = 2*1000;
setInterval(() => {
  const filteredChatters = chatters.filter(chatter => Date.now() - chatter.timestamp < timeSpan);
    if (filteredChatters.length != chatters.length) {
      chatters = filteredChatters;
      localStorage.setItem("chatters", JSON.stringify(chatters));
      updateUI();
    }
}, interval);

console.log(chatters);