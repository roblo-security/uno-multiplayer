'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var Card = mongoose.model('Card');
var Player = mongoose.model('Player');

var constants = require('./../../constants');
var CARD_COLORS = constants.CARD_COLORS;
var CARD_VALUES = constants.CARD_VALUES;

var schema = new Schema({
  drawDeck: [{ type: ObjectId, ref: 'Card' }],
  discardDeck: [{ type: ObjectId, ref: 'Card' }],
  lastPlayedCard: { type: ObjectId, ref: 'Card' },
  turn: { type: Number, default: 0 },
  reversedOrder: { type: Boolean, default: false },
  players: [{ type: ObjectId, ref: 'Player' }]
});


schema.methods.addNewDeck = function addNewDeck() {
  var that = this;
  var createdCardPromises = [];
  Object.keys(CARD_COLORS).forEach(function(colorKey) {
    var color = CARD_COLORS[colorKey]
    if (color === CARD_COLORS.WILD) {
      createdCardPromises.push(new Card({
        color: CARD_COLORS.WILD,
        value: CARD_VALUES.ZERO,
        penalty: 0,
        game: that._id
      }).save());
      createdCardPromises.push(new Card({
        color: CARD_COLORS.WILD,
        value: CARD_VALUES.FOUR,
        penalty: 4,
        game: that._id
      }).save());
    } else {
      Object.keys(CARD_VALUES).forEach(function(valueKey) {
        var value = CARD_VALUES[valueKey]
        var times = value === CARD_VALUES.ZERO ? 1 : 2;
        for (var i = 0; i < times; i++) {
          var penalty = value === CARD_VALUES.DRAW ? 2 : 0;
          createdCardPromises.push(new Card({
            color: color,
            value: value,
            penalty: penalty,
            game: that._id
          }).save())
        }
      });
    }
  });

  return Promise.all(createdCardPromises).then(function(cards) {
    that.drawDeck = that.drawDeck.concat(Card.shuffleCards(cards));
    return that.save();
  });
}

schema.methods.updatePlayers = function updatePlayers() {
  var that = this;
  return Player.find({
    _id: { $in: this.players }
  }).then(function(players) {
    that.players = players;
    return that.save();
  });
}

schema.methods.addPlayer = function addPlayer(playerId) {
  this.players.push(playerId)
  return this.updatePlayers();
}

schema.methods.removePlayer = function addPlayer(playerId) {
  var playerIndex = this.players.indexOf(playerId);
  if (playerIndex < 0) return this;

  this.players.splice(playerIndex, 1);
  return this.updatePlayers();
}

schema.methods.checkReady = function checkReady() {
  if (this.players.length < 2) return Promise.resolve(false);
  return Player.find({ _id: { $in: this.players } }).then(function(players) {
    return players.every(function(player) {
      return player.isReady;
    });
  });
}



mongoose.model('Game', schema);
