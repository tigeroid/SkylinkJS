sharedConfig = require('../shared/karma-shared.conf.js');

module.exports = function(config){

  var browser = ['ChromeUM'];

  var file = ['../../test-karma/helper-test.js'];

  sharedConfig(config);

  config.browsers = config.browsers.concat(browser);

  config.files = config.files.concat(file);
  
}