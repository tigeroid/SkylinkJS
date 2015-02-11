/**
 * Handles the whole Skylink interface.
 * @module Skylink
 * @since 0.6.0
 */
var Skylink = {};

var rooms = [];

var Config = function (options) {
  globals.apiKey = options.apiKey;
  
};

Skylink.init = function (apiKey, name, listener) {
  rooms[name] = new Room(name, listener);
  
  return rooms[name];
};