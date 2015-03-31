var sharedSafariConfig = require('../shared/karma-safari.conf.js');

module.exports = function(config){

  var file = ['../../test-karma/async-test.js'];

  sharedSafariConfig(config);

  config.files = config.files.concat(file);
  
}