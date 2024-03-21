export const players = [];

const playersString = localStorage.getItem("players");
if (playersString) {
  const playersArr = JSON.parse(playersString);
  if (Array.isArray(playersArr)) {
    players.push(...playersArr);
  }
}