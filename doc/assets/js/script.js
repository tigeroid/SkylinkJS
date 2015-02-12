$(document).ready(function () {
  $('#menu-toggle').click(function(e) {
    e.preventDefault();
    $('#wrapper').toggleClass('toggled');
  });
  
  $('.sidebar-nav li').each(function (index) {
    var link =  $(this).find('a');
    
    // Set selected
    if (link.length > 0) {
      var currentUrlParts = location.pathname.split('/');
      var urlParts = link.attr('href').split('/');
      
      if (urlParts[ urlParts.length - 1] === currentUrlParts[ currentUrlParts.length - 1]) {
        
        if (!$(this).hasClass('sidebar-brand')) {
          $(this).addClass('active');
        }
      
      } else {
        var url = urlParts[ urlParts.length - 2] + '/' + urlParts[ urlParts.length - 1];
        var currentUrl = currentUrlParts[ currentUrlParts.length - 2] + '/' + 
          currentUrlParts[ currentUrlParts.length - 1];
        
        if (url === currentUrl) {
          $(this).addClass('active');
        }
      }
      
      // Remove test scripts
      if (link.html().indexOf('_Test') > 0) {
        $(this).remove();
      } 
    }
    
    if (index === $('.sidebar-nav li').length - 1) {
      $('.sidebar-nav li.slide-item').addClass('show');
    }
  });
  
  
});