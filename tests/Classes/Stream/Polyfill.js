(function () {
  
'use strict';

// Dependencies
var test = require('tape');
var adapter = require('./../node_modules/adapterjs/publish/adapter.debug.js');

var options = {
  timeout: 10000
};

var stream = null;

var getMediaFn = function (defer, t) {
  window.getUserMedia({
    audio: true,
    video: true

  }, function (event) {
    stream = event;
    defer();

  }, function (error) {
    throw error;
    t.end();
  });
};
  
console.log('Starting StreamPolyfill tests');

test('.stop()', options, function (t) {
  t.plan(3);

  getMediaFn(function () {
    
  });
});

})();