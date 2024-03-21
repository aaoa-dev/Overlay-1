import {players} from './players.js';

const p1Name = document.getElementById("p1-Name");
const p2Name = document.getElementById("p2-Name");
const p1Score = document.getElementById("p1-Score");
const p2Score = document.getElementById("p2-Score");

export const updateScore = () => {
  players.sort((a, b) => b.score - a.score);
  const chatters = players.slice(0, 2);
  chatters.map((chatter, index) => {
    if (index === 0) {
      p1Name.innerText = chatter.name;
      p1Score.innerText = chatter.score;
    } else {
      p2Name.innerText = chatter.name;
      p2Score.innerText = chatter.score;
    }
  });
};

updateScore();

export const resetUI = () => {
    p1Name.innerText = "N/A";
    p1Score.innerText = 0;
    p2Name.innerText = "N/A";
    p2Score.innerText = 0;
  };

 export let isRaiding = false;

export const reset = (tags, message) => {
    if (!tags.badges || !Object.entries(tags.badges).some(([key]) => key === "broadcaster" || key === "moderator")) {
      return;
    }
    if (message === "!reset") {
      localStorage.removeItem("players"); 
      console.log('Local Storage cleared'); 
      players.length = 0;
      resetUI();
      isRaiding = true;
      setTimeout(() => {isRaiding = false;}, 10000)
    }
  };