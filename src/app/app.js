angular.module('plotter', [
  'templates-app',
  'templates-common',
  'plotter.vis',
  'ui.router.state',
  'ui.router',
  'services.compatibility',
  'plotter.compatibility',
  'ngSanitize', 
  'ngAnimate',
  'angularSpinner',
  'ext.lodash',
  'ext.dc'
  ])

.constant('constants', {
  nanValue: -1000,
  legalMinValue: 0,
  tickFormat: d3.format(".2s"),
  groups: {
    heatmap: 'ext',
    scatterplot: 'main',
    histogram: {
      interactive: 'histogram.filters',
      nonInteractive: 'histogram.nofilters'
    }
  },
  som: {
    websocket: {
      api: {
        som: '/ws/som',
        plane: '/ws/plane'
      },
      url: 'ws://' + window.location.host //'ws://localhost:6565'
    }
  }
})

.config(function config($stateProvider, $urlRouterProvider, $injector, $stickyStateProvider, $locationProvider) {

  $locationProvider
    // .html5Mode(true)
    .hashPrefix('!');

    // default route
    $urlRouterProvider.when('', ['$state', '$stateParams', function($state, $stateParams) {
      $state.go('vis.explore', { state: undefined });
    }]);
    $stickyStateProvider.enableDebug(true);

  })
.run(function run($rootScope, $state, $stateParams, $location, dc) {
  $rootScope.$state = $state;
  $rootScope.$stateParams = $stateParams;

      // dc event/trigger delay
      dc.constants.EVENT_DELAY = 150;

      // debug ui-router
      $rootScope.$on('$stateChangeStart',function(event, toState, toParams, fromState, fromParams){
        console.log('$stateChangeStart to '+toState.to+'- fired when the transition begins. toState,toParams : \n',toState, toParams);
      });
      $rootScope.$on('$stateChangeError',function(event, toState, toParams, fromState, fromParams){
        console.log('$stateChangeError - fired when an error occurs during transition.');
        console.log(arguments);
      });
      $rootScope.$on('$stateChangeSuccess',function(event, toState, toParams, fromState, fromParams){
        console.log('$stateChangeSuccess to '+toState.name+'- fired once the state transition is complete.');
      });
      $rootScope.$on('$viewContentLoading',function(event, viewConfig){
        // runs on individual scopes, so putting it in "run" doesn't work.
        console.log('$viewContentLoading - view begins loading - dom not rendered',viewConfig);
      });
      $rootScope.$on('$viewContentLoaded',function(event){
        console.log('$viewContentLoaded - fired after dom rendered',event);
      });
      $rootScope.$on('$stateNotFound',function(event, unfoundState, fromState, fromParams){
        console.log('$stateNotFound '+unfoundState.to+'  - fired when a state cannot be found by its name.');
        console.log(unfoundState, fromState, fromParams);
      });

})
.controller('AppCtrl', function AppCtrl($scope, $location, $templateCache, CompatibilityService, NotifyService, usSpinnerService) {

    $scope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
      if (toState.resolve) {
        usSpinnerService.spin('main');
      }
    });

    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      console.log("change route from", fromState, "-", toState);
      if (angular.isDefined(toState.data.pageTitle)) {
        $scope.pageTitle = toState.data.pageTitle + ' | Plotter';
      }

      if (toState.resolve) {
        usSpinnerService.stop('main');
      }
    });

    $scope.loading = { spinner: true };

});
