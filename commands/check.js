import {chatters} from './chatters.js';
import {updateScore, isRaiding} from './reset.js';


export const check = (tags) => {
    // if (isRaiding) return;
    if (chatters.some((chatter) => chatter.user == tags.username)) { 
      const chatter = chatters.find((chatter) => chatter.user == tags.username); 
      chatter.timestamp = Date.now(); 
    } else {
      chatters.push({
        name: tags["display-name"],
        user: tags.username,
        timestamp: Date.now(),
      });
    }
    localStorage.setItem("chatters", JSON.stringify(chatters));
    // updateScore();
  };

