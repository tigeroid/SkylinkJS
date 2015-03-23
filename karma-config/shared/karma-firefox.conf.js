sharedConfig = require('./karma-shared.conf.js');

module.exports = function(config){

  var browser = ['FirefoxUM'];

  sharedConfig(config);

  config.browsers = config.browsers.concat(browser);
  
}