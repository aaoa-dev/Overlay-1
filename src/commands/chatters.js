import {updateUI} from './reset.js';
import {timeSpan, interval} from "./times.js";
export let chatters = [];

export const chattersContainer = document.getElementById("chattersContainer");
export function addChatter(chatter) {
  console.log(chatter)
  chattersContainer.innerHTML += `<div id="${chatter.user}" class="opacity-0 transition-all duration-1000 aspect-square h-auto w-0 flex justify-center align-middle items-center bg-[var(--chatter-color)] text-0 font-extrabold text-black rounded-full" style="--chatter-color: ${chatter.color || "#ffffff"}">
  ${chatter.user[0].toUpperCase()}
  </div>`;

  setTimeout(() => {
    const child = document.getElementById(chatter.user);
    child.classList.replace("opacity-0", "opacity-100");
    child.classList.replace("w-0", "w-20");
    child.classList.replace("text-0", "text-5xl")
  }, 0);
}

export function removeChatter(child) {
  child.classList.replace("opacity-100", "opacity-0");
  child.classList.replace("w-20", "w-0");
  child.classList.replace("text-5xl", "text-0");
  setTimeout(() => child.remove(), 420)
  
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

setInterval(() => {
  const filteredChatters = chatters.filter(chatter => Date.now() - chatter.timestamp < timeSpan);
    if (filteredChatters.length != chatters.length) {
      chatters = filteredChatters;
      localStorage.setItem("chatters", JSON.stringify(chatters));
      updateUI();
    }
}, interval);

console.log(chatters);
export function sortChatters() {
chatters = chatters.sort((a, b) => a.timestamp - b.timestamp);
chatters = chatters.slice(0,8);
};