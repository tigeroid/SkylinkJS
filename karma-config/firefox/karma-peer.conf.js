var sharedFirefoxConfig = require('../shared/karma-firefox.conf.js');

module.exports = function(config){

  var file = ['../../test-karma/peer-test.js'];

  sharedFirefoxConfig(config);

  config.files = config.files.concat(file);
  
}