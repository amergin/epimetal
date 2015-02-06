var serv = angular.module('services.notify', [
'mgcrea.ngStrap.alert', 
'mgcrea.ngStrap.popover',
'ui.bootstrap'
// 'ui.bootstrap.modal'
// 'mgcrea.ngStrap.modal'
]);

serv.factory('NotifyService', ['$injector', '$timeout',
  function NotifyService($injector, $timeout) {

    var _modalInstanceRef = null;

    return {

      addSticky: function (title, message, level) {
        // var $alert = $injector.get('$alert');
        // var myAlert = $alert({
        //   title: title,
        //   content: message,
        //   container: '.alert-area',
        //   // placement: 'top-right',
        //   animation: 'am-fade-and-slide-top',
        //   type: level,
        //   show: true
        // });
      },

      addTransient: function (title, message, level) {
        // var $alert = $injector.get('$alert');
        // var myAlert = $alert({
        //   title: title + "\n",
        //   content: message, 
        //   container: '.alert-area',
        //   // placement: 'top-right',
        //   animation: 'am-fade-and-slide-top',
        //   type: level,
        //   show: true,
        //   duration: 8
        // });
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