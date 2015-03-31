var sharedChromeConfig = require('../shared/karma-chrome.conf.js');

module.exports = function(config){

  //var file = ['../../publish/skylink.debug.js', '../../test-karma/socket-test.js'];

  var file = ['../../test-karma/socket-test.js'];

  sharedChromeConfig(config);

  config.files = config.files.concat(file);

  //config.files = file;
  
}