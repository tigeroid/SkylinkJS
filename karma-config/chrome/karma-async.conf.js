var sharedChromeConfig = require('../shared/karma-chrome.conf.js');

module.exports = function(config){

  var file = ['../../test-karma/async-test.js'];

  sharedChromeConfig(config);

  config.files = config.files.concat(file);
  
}