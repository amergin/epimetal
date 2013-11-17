
var App = angular.module( 'plotter', [
  'templates-app',
  'templates-common',
  'plotter.vis',
  'ui.state',
  'ui.route'
  ]);

App.config( function myAppConfig ( $stateProvider, $urlRouterProvider ) {
  $urlRouterProvider.otherwise( '/vis' );
})
.run(['$rootScope', '$state', '$stateParams', function ($rootScope,   $state,   $stateParams) {
  $rootScope.$state = $state;
  $rootScope.$stateParams = $stateParams;
  $state.transitionTo('vis');
}]);

App.controller( 'AppCtrl', function AppCtrl ( $scope, $location ) {
  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    if ( angular.isDefined( toState.data.pageTitle ) ) {
      $scope.pageTitle = toState.data.pageTitle + ' | Plotter' ;
    }
  });
});


// see http://stackoverflow.com/questions/11252780/whats-the-correct-way-to-communicate-between-controllers-in-angularjs
App.config(['$provide', function($provide){
  $provide.decorator('$rootScope', ['$delegate', function($delegate){

    Object.defineProperty($delegate.constructor.prototype, '$onRootScope', {
      value: function(name, listener){
        var unsubscribe = $delegate.$on(name, listener);
        this.$on('$destroy', unsubscribe);
      },
      enumerable: false
    });


    return $delegate;
  }]);
}]);
