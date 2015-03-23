sharedConfig = require('../shared/karma-firefox.conf.js');

module.exports = function(config){

  var file = ['../../test-karma/helper-test.js'];

  sharedConfig(config);

  config.files = config.files.concat(file);
  
}