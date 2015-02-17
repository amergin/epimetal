var serv = angular.module('services.notify', [
'mgcrea.ngStrap.alert', 
'mgcrea.ngStrap.popover',
'ui.bootstrap',
'angular-growl'
// 'ui.bootstrap.modal'
// 'mgcrea.ngStrap.modal'
]);

serv.config(['growlProvider', function(growlProvider) {
    growlProvider.onlyUniqueMessages(false);
    growlProvider.globalTimeToLive(6000);
    growlProvider.globalPosition('top-left');
}]);

serv.factory('NotifyService', ['$injector', '$timeout', 'growl',
  function NotifyService($injector, $timeout, growl) {

    var _modalInstanceRef = null;

    getAlertFunction = function(msgClass) {
      switch(msgClass) {
        case 'warn':
          return growl.warning;
        case 'info':
          return growl.info;
        case 'success':
          return growl.success;
        case 'error':
          return growl.error;
        default:
          throw 'Unknown alert type';
      }
    };

    return {

      // alerts
      addSticky: function (title, message, level) {
        var call = getAlertFunction(level);
        call(message, { ttl: -1 });
      },

      // alerts
      addTransient: function (title, message, level) {
        var call = getAlertFunction(level);
        call(message, { title: title });
      },

      /* THESE ARE FOR MODAL WINDOWS */

      addClosableModal: function (templateUrl, scope, config) {

        var $modal = $injector.get('$modal');
        var $q = $injector.get('$q');
        var deferred = $q.defer();
        var $rootScope = $injector.get('$rootScope');

        var applyConfig = {
          scope: scope,
          backdrop: true, //'static',
          keyboard: false,
          templateUrl: templateUrl,
          windowClass: 'modal-wide'
        };
        angular.extend(applyConfig, config);

        _modalInstanceRef = $modal.open(applyConfig);

        _modalInstanceRef.result.then(function() {
          deferred.resolve();
        }, function() {
          deferred.reject();
        });
        return deferred.promise;
      },


      addSpinnerModal: function (message, callback) {
        // TODO, rewrite
      },

      closeModal: function () {
          if( _.isNull(_modalInstanceRef) ) { return; }
          _modalInstanceRef.close();
          _modalInstanceRef = null;
      }
    };
  }
]);