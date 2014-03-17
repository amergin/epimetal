var serv = angular.module('services.notify', ['angular-growl', 'ngSanitize', 'ngAnimate', 'ui.bootstrap']);

serv.factory('NotifyService', ['$injector',
  function NotifyService($injector) {

    var _getGrowlCallFn = function (level) {
      var fn;
      var growl = $injector.get('growl');
      switch (level) {
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


    var _ModalInstanceCtrl = function ($scope, $modalInstance) {
      $scope.ok = function () {
        $modalInstance.close();
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    };

    var _modalInstanceRef = null;


    return {

      /* THESE ARE FOR ANGULAR_GROWL NOTIFIER */
      addSticky: function (message, level) {
        return _getGrowlCallFn(level)("<strong>" + message + "</strong>", {
          enableHtml: true
        });
      },

      addTransient: function (message, level) {
        return _getGrowlCallFn(level)(message, {
          ttl: 7000
        });
      },

      addLoginNeeded: function () {
        var growl = $injector.get('growl');
        growl.addErrorMessage('Seems that you have not logged in. ' +
          'Please <a href="/API/twofactor.php" target="_blank">log in</a> and refresh this application afterwards.', {
            enableHtml: true
          });
      },


      /* THESE ARE FOR MODAL WINDOWS */

      addClosableModal: function (templateUrl) {

        var $rootScope = $injector.get('$rootScope');
        var $modal = $injector.get('$modal');

        var config = {
          keyboard: false,
          backdrop: 'static',
          templateUrl: templateUrl,
          controller: _ModalInstanceCtrl,
          scope: $rootScope.$new(true),
          windowClass: 'closable-modal'
        };

        // returns the modal instance
        _modalInstanceRef = $modal.open(config);
        return _modalInstanceRef;
      },

      addSpinnerModal: function (message) {
        var $rootScope = $injector.get('$rootScope');
        var $modal = $injector.get('$modal');
        var config = {
          keyboard: false,
          backdrop: 'static',
          template: '<div class="modal-body text-center"><i class="fa fa-spinner fa-5x fa-spin"></i><br/><h3>' + message + '</h3></div>',
          scope: $rootScope.$new(true),
          windowClass: 'spinner-modal'
        };

        // returns the modal instance
        _modalInstanceRef=  $modal.open(config);
        return _modalInstanceRef;
      },

      closeModal: function() {
        //var modalInstance = $injector.get('$modalInstance');
        _modalInstanceRef.close();
        // modalInstance.close();

      }
    };
  }
]);