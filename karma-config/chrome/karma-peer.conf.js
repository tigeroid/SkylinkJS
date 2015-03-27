var sharedChromeConfig = require('../shared/karma-chrome.conf.js');

module.exports = function(config){

  var file = ['../../test-karma/peer-test.js'];

  sharedChromeConfig(config);

  config.files = config.files.concat(file);
  
}