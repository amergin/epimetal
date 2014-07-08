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
          animation: 'am-fade-and-slide-top',
          type: level,
          show: true
        });
      },

      addTransient: function (title, message, level) {
        var $alert = $injector.get('$alert');
        var myAlert = $alert({
          title: title + "\n",
          content: message, 
          placement: 'top-right',
          animation: 'am-fade-and-slide-top',
          type: level,
          show: true,
          duration: 7
        });
      },

      /* THESE ARE FOR MODAL WINDOWS */

      addClosableModal: function (templateUrl, scope) {

        var $modal = $injector.get('$modal');
        var $q = $injector.get('$q');
        var deferred = $q.defer();
        var $rootScope = $injector.get('$rootScope');

        $rootScope.$on('modal.hide', function() {
          deferred.resolve();
        });

        _modalInstanceRef = $modal({
          scope: scope,
          contentTemplate: templateUrl,
          show: true,
          backdrop: true, //'static',
          keyboard: false,
          placement: 'center',
          animation: 'am-fade-and-scale'
        });
        return deferred.promise;
      },

      addSpinnerModal: function (message, callback) {

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

        _modalInstanceRef.$promise.then( _modalInstanceRef.show )
        .finally( function() {
          if( !_.isUndefined( callback ) ) { callback(); }
        });
      },

      closeModal: function () {
        var $timeout = $injector.get('$timeout');
        $timeout( function() {
          _modalInstanceRef.hide();
        }, 100);
      }
    };
  }
]);