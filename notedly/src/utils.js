const names = require("../pokemon-names.json");
const jwt = require("jsonwebtoken");

function getPokemonSprite() {
  const randomChoice = Math.floor(Math.random() * names.length);

  return `https://img.pokemondb.net/sprites/sword-shield/icon/${names[randomChoice]}.png`;
}

function getUser(token) {
  if (token) {
    try {
      const result = jwt.verify(token, "thisstringhastobesupersecret");
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }
}

module.exports = {
  getPokemonSprite,
  getUser,
};
