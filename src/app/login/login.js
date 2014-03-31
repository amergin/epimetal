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
      template: '<div class="row"><div class="col-md-2 col-md-offset-5"><h3>Please log in to proceed.</h3> <a href="#/login" ng-click="open()">Reopen login form</a></div></div>',
      // templateUrl: 'vis/.tpl.html',
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

    modalInstance.result.then(function successFn() {
      $state.go('vis');
    }, function errFn() {
      $state.go('vis');
    });

  };

  // open on instantiation
  $scope.open();

}]);

