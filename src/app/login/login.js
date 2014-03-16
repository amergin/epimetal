var loginMod = angular.module('plotter.login', [
  'ui.bootstrap',
  'ui.router.state',
  'ui.router'
  ]);

loginMod.config(['$stateProvider',
  function ($stateProvider) {

    var state = {
      name: 'login',
      url: '/login/',
      abstract: false,
      controller: 'LoginCtrl',
      template: '<div class="row"><div class="col-md-2 col-md-offset-5"><h3>Please log in to proceed.</h3> <a ng-click="open()">Reopen login form</a></div></div>',
      // templateUrl: 'vis/.tpl.html',
      data: {
        pageTitle: 'Please login to continue'
      }
    };

    $stateProvider.state(state);
  }
]);

loginMod.controller('LoginCtrl', ['$scope', '$modal', '$state', '$rootScope', function($scope, $modal, $state, $rootScope) {

  $scope.open = function () {

    modalInstance = $modal.open({
      templateUrl: 'login/modal.tpl.html',
      keyboard: false,
      backdrop: 'static',
      controller: ModalInstanceCtrl,
      scope: $rootScope.$new(true),
      windowClass: 'login-modal'
      });

    modalInstance.result.then(function (selectedItem) {
      $state.go('vis');
    }, function () {
      $state.go('vis');
    });
  };

  // open on instantiation
  $scope.open();

}]);

var ModalInstanceCtrl = function($scope, $modalInstance) {
  $scope.ok = function () {
    $modalInstance.close();
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
};

