(function() {

'use strict';

var test = require('tape');

var skylink = require('./../publish/skylink.complete.js');

globals.apiKey = '5f874168-0079-46fc-ab9d-13931c2baa39';


test('Stream 1: ', function(t) {
  t.plan(1);

  var streamObject;
  
  var constraints = { 
    audio: true, 
    video: false
  };
  
  var eventOrder = [];


  var handler = {
    
    'stream:start': function (data) {
      var pass = eventOrder.length === 0 && data.hasOwnProperty('id');
      
      t[pass ? 'pass' : 'fail']('Stream start is invoked first with correct parameters');
    },
    
    'stream:stop': function (data) {
      var pass = eventOrder.indexOf('stream:start') > -1 && data.hasOwnProperty('id');
      
      t[pass ? 'pass' : 'fail']('Stream start has stopped with correct parameters');
    },
    
    'stream:track:start': function (data) {
      var pass = eventOrder. && data.hasOwnProperty('trackId');
      
      t[pass ? 'pass' : 'fail']('Stream track has started with correct parameters');
    },
    
    'stream:track:stop': function (data) {
      var pass = eventOrder.length === 0 && data.hasOwnProperty('id') && data.hasOwnProperty('trackId');
      
      t[pass ? 'pass' : 'fail']('Stream track has stopped with correct parameters');
    },
    
    'stream:track:mute': function (data) {
      var pass = eventOrder.length === 0 && data.hasOwnProperty('id') && data.hasOwnProperty('trackId');
      
      t[pass ? 'pass' : 'fail']('Stream track has been muted with correct parameters');
    },
    
    'stream:track:unmute': function (data) {
      var pass = eventOrder.length === 0 && data.hasOwnProperty('id') && data.hasOwnProperty('trackId');
      
      t[pass ? 'pass' : 'fail']('Stream track has been unmuted with correct parameters');
    },
    
    'stream:error': function (data) {
      t.fail('Stream MediaStream retrieval failed');
    }
  };
  
  
  var listenerFn = function (event, data) {
    eventOrder.push(event);
    handler(event, data);
  };

  streamObject = new Stream(null, { audio: true, video: true }, listenerFn);
});

test('Stream 2: No MediaStream object inputted', function(t) {
  t.plan(1);

  var streamObject;
  
  var constraints = { 
    audio: true, 
    video: false
  };
  
  var eventOrder = [];


  var handler = {
    
    'stream:start': function (data) {
      var pass = eventOrder.length === 0 && data.hasOwnProperty('id');
      
      t[pass ? 'pass' : 'fail']('Stream start is invoked first with correct parameters');
    }
    
  };
  
  
  var listenerFn = function (event, data) {
    eventOrder.push(event);
    
  };

  var gUMSuccessFn = function (stream) {
    console.log('Retrieved MediaStream', constraints);
    
    streamObject = new Stream(stream, {}, listenerFn);
  };
  
  var gUMFailureFn = function (error) {
    t.fail('Test 1: Failed getting user media');
    t.end();
  };
  
  
  window.getUserMedia(constraints, 

});
