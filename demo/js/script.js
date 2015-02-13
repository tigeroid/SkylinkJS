var app = angular.module('SkylinkDemo', []);

var menu = [
  { text: 'Room', url: 'room' }
];

app.controller('MainController', function ($http, $log) {
  this.template = 'templates/room.html';
  this.codeTemplate = 'templates-code/room.js';
  this.code = '';
  this.nav = menu;
  this.loaded = false;

  this.setPage = function (url) {
    this.active = url;
    this.template = 'templates/' + url + '.html';
    this.codeTemplate = 'templates-code/' + url + '.js';

    angular.element('.content, .code').removeClass('loaded');

    var scope = this;
    var noError = true;

    $http.get(this.codeTemplate).success(function(data){
      scope.code = data;

      setTimeout(function () {
        prettyPrint();

        if (noError) {
          angular.element('.code').addClass('loaded');
        }
      }, 10);

    }).error(function (error) {
      throw error;
    });

    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = this.codeTemplate;

    script.onreadystatechange = script.onload = function () {
      console.log('loaded script');
      angular.element('.content').addClass('loaded');
    };

    script.onerror = function (error) {
      console.error('failed loading script', error);
      angular.element('.content, .code').removeClass('loaded');
      noError = false;
    };

    head.appendChild(script);
  };

  this.setPage('room');
});



/* css */
var resizeFn = function () {
  var calculatedHeight = window.innerHeight - $('nav').outerHeight() - $('.header').outerHeight();

  $('.content, .code').css('height', calculatedHeight + 'px');
  $('.content, .code').css('max-height', calculatedHeight + 'px');
};

window.onload = window.onresize = resizeFn;
