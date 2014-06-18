var serv = angular.module('services.notify', ['ngSanitize', 'ngAnimate', 'mgcrea.ngStrap.alert', 'mgcrea.ngStrap.popover', 'mgcrea.ngStrap.modal']);//['angular-growl', 'ngSanitize', 'ngAnimate', 'ui.bootstrap']);

serv.factory('NotifyService', ['$injector',
  function NotifyService($injector) {

    var _modalInstanceRef = null;

    return {

      addSticky: function (title, message, level) {
        var $alert = $injector.get('$alert');
        var myAlert = $alert({
          title: title,
          content: message, 
          placement: 'top-right', 
          type: level,
          show: true
        });
      },

      addTransient: function (title, message, level) {
        var $alert = $injector.get('$alert');
        var myAlert = $alert({
          title: title,
          content: message, 
          placement: 'top-right', 
          type: level,
          show: true,
          duration: 6
        });
      },

      /* THESE ARE FOR MODAL WINDOWS */

      addClosableModal: function (templateUrl) {

        var $modal = $injector.get('$modal');
        var $q = $injector.get('$q');
        var deferred = $q.defer();
        var $rootScope = $injector.get('$rootScope');

        $rootScope.$on('modal.hide', function() {
          deferred.resolve();
        });

        _modalInstanceRef = $modal({
          contentTemplate: templateUrl,
          show: true,
          backdrop: 'static',
          keyboard: false,
          placement: 'center',
          animation: 'am-fade-and-scale'
        });
        return deferred.promise;
      },

      addSpinnerModal: function (message) {

        var $modal = $injector.get('$modal');

        var $scope = $injector.get('$rootScope').$new({ isolate: true });
        $scope.message = message;

        // Pre-fetch an external template populated with a custom scope
        _modalInstanceRef = $modal({
          scope: $scope,
          //html: true,
          contentTemplate: 'notify.modal.spinner.tpl.html',
          show: false,
          backdrop: 'static',
          keyboard: false,
          placement: 'center',
          animation: 'am-fade-and-scale'
        });

        _modalInstanceRef.$promise.then(_modalInstanceRef.show);
      },

      closeModal: function () {
        _modalInstanceRef.$promise.then( 
          function() { _modalInstanceRef.hide(); }, 
          function() { _modalInstanceRef.hide(); } 
        );
      }
    };
  }
]);