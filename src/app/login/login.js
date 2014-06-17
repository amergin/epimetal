var loginMod = angular.module('plotter.login', [
  'services.notify',
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
      templateUrl: 'login/login.tpl.html',
      data: {
        pageTitle: 'Please login to continue'
      }
    };

    $stateProvider.state(state);
  }
]);

loginMod.controller('LoginCtrl', ['$scope', 'NotifyService', '$state', function($scope, NotifyService, $state) {

  $scope.open = function () {

    var modalInstance = NotifyService.addClosableModal('login/modal.tpl.html');

    modalInstance.then(function successFn() {
      $state.go('vis.all');
    }, function errFn() {
      $state.go('vis.all');
    });

  };

  // open on instantiation
  $scope.open();

}]);

