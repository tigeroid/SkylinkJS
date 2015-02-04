var Skylink = {};

var rooms = [];

Skylink.init = function (apiKey, name, listener) {
  rooms[name] = new Room(name, listener);
  
  return rooms[name];
};