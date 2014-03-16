var serv = angular.module('services.notify', ['angular-growl', 'ngSanitize', 'ngAnimate']);

serv.factory('NotifyService', [ 'growl', function NotifyService(growl) {

  var _getCallFn = function(level) {
    var fn;
    switch( level) 
    {
      case 'warn':
        fn = growl.addWarnMessage;
        break;
      case 'error':
        fn = growl.addErrorMessage;
        break;
      case 'info':
        fn = growl.addInfoMessage;
        break;
      case 'success':
        fn = growl.addSuccessMessage;
        break;
      default:
        fn = growl.addInfoMessage;
        break;
    }

    return fn;
  };

  return {

    addSticky: function(message, level) {
      return _getCallFn(level)("<strong>" + message + "</strong>", {enableHtml: true});
    },

    addTransient: function(message,level) {
      return _getCallFn(level)(message, {ttl: 7000});
    },

    addLoginNeeded: function() {
      growl.addErrorMessage('Seems that you have not logged in. ' +
        'Please <a href="/API/twofactor.php" target="_blank">log in</a> and refresh this application afterwards.', {enableHtml: true});
    }
  }; 
}]);

