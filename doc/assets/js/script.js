$(document).ready(function () {
  $('#menu-toggle').click(function(e) {
    e.preventDefault();
    $('#wrapper').toggleClass('toggled');
  });
  
  $('.sidebar-nav li').each(function () {
    if (window.location.href.indexOf( $(this).attr('href') ) > 0) {
      $(this).parent().addClass('active');
    }
  });
});