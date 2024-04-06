import {chatters, sortChatters} from './chatters.js';
import {updateUI} from './reset.js';

export const check = (tags) => {
    if (chatters.some((chatter) => chatter.user == tags.username)) { 
      const chatter = chatters.find((chatter) => chatter.user == tags.username); 
      chatter.timestamp = Date.now(); 
    } else {
      chatters.push({
        name: tags["display-name"],
        user: tags.username,
        timestamp: Date.now(),
        color: tags.color,
      });
    }
    sortChatters();
    localStorage.setItem("chatters", JSON.stringify(chatters));
   updateUI();
  };
console.log(chatters);
