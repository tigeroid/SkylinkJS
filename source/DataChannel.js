function DataChannel(channel, config, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  com.id = config.id;
  
  if (!channel) {
    throw Error('DataChannel missing');
  }
}