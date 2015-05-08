/* Copyright Temasys Communications, 2014 */
var connect = require('connect');
var http = require('http');
var https = require('https');
var fs = require('fs');

var hskey = fs.readFileSync('certificates/key.pem');
var hscert = fs.readFileSync('certificates/certificate.pem');

var options = {
  key: hskey,
  cert: hscert
};

var app = connect().use(connect.static(__dirname));

connect.createServer(connect.static(__dirname)).listen(8081);
https.createServer(options, app).listen(8082);

console.log("HTTP Server start @ 8081");
console.log("HTTPS Server start @ 8082");
