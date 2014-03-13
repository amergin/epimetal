var serv = angular.module('services.notify', ['angular-growl', 'ngSanitize', 'ngAnimate']);

serv.factory('NotifyService', [ 'growl', function NotifyService(growl) {
  return {
    addSticky: function(message, level) {
      switch( level) 
      {
        case 'warn':
          growl.addWarnMessage("<strong>" + message + "</strong>", {enableHtml: true});
          break;
        case 'error':
          growl.addErrorMessage("<strong>" + message + "</strong>", {enableHtml: true});
          break;
        case 'info':
          growl.addInfoMessage("<strong>" + message + "</strong>", {enableHtml: true});
          break;
        case 'success':
          growl.addSuccessMessage("<strong>" + message + "</strong>", {enableHtml: true});
          break;
        default:
          growl.addInfoMessage("<strong>" + message + "</strong>", {enableHtml: true});
          break;
      }
    },
    addLoginNeeded: function() {
      growl.addErrorMessage('Seems that you have not logged in. ' +
        'Please <a href="/API/twofactor.php" target="_blank">log in</a> and refresh this application afterwards.', {enableHtml: true});
    }
  }; 
}]);

