var sharedConfig = require('./karma-shared.conf.js');

module.exports = function(config){

  var browser = ['OperaUM'];

  sharedConfig(config);

  config.browsers = config.browsers.concat(browser);
  
}