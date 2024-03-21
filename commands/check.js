import {players} from './players.js';
import {updateScore, isRaiding} from './reset.js';


export const check = (tags) => {
    if (isRaiding) return;
    if (players.some((player) => player.user == tags.username)) { 
      const player = players.find((player) => player.user == tags.username); 
      player.score += 1;
    } else {
      players.push({
        name: tags["display-name"],
        user: tags.username,
        score: 1,
      });
    }
    localStorage.setItem("players", JSON.stringify(players));
    updateScore();
  };