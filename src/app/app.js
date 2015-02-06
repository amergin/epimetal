var App = angular.module('plotter', [
  'templates-app',
  'templates-common',
  'plotter.vis',
  'plotter.login',
  'ui.router.state',
  'ui.router',
  'services.compatibility',
  'plotter.compatibility',
  'ngSanitize', 'ngAnimate',
  'angularSpinner'
]);

App.constant('constants', {
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
  },
  'export': {
    'svg': '/API/export/svg',
    'png': '/API/export/png'
  }
});

App.config(['$stateProvider', '$urlRouterProvider', '$httpProvider', '$injector', '$stickyStateProvider', '$locationProvider',
  function ($stateProvider, $urlRouterProvider, $httpProvider, $injector, $stickyStateProvider, $locationProvider) {

    $locationProvider
    // .html5Mode(true)
    .hashPrefix('!');

    // default route
    // $urlRouterProvider.otherwise('/vis/explore');
    $urlRouterProvider.otherwise('/vis/explore');

    $stickyStateProvider.enableDebug(true);


    // introduce response interceptor: logic for accepting/rejecting
    // promises app-wide. This is used to redirect to login when
    // unauth'd usage of the api occurs.
    // see http://arthur.gonigberg.com/2013/06/29/angularjs-role-based-auth/
    var errorInterceptor = function ($q, $location, NotifyService) {
      var successFn = function (response) {
        return response;
      };

      var errorFn = function (response) {
        if (response.status === 403) {
          $location.path('/login/');
        }
        return $q.reject(response);
      };

      // return the success/error functions
      return function (promise) {
        return promise.then(successFn, errorFn);
      };

    };
    errorInterceptor.$inject = ['$q', '$location', 'NotifyService'];

    $httpProvider.responseInterceptors.push(errorInterceptor);
  }
])
  .run(['$rootScope', '$state', '$stateParams', '$location',
    function ($rootScope, $state, $stateParams, $location) {
      $rootScope.$state = $state;
      $rootScope.$stateParams = $stateParams;

      // debug ui-router
      // $rootScope.$on('$stateChangeStart',function(event, toState, toParams, fromState, fromParams){
      //   console.log('$stateChangeStart to '+toState.to+'- fired when the transition begins. toState,toParams : \n',toState, toParams);
      // });
      // $rootScope.$on('$stateChangeError',function(event, toState, toParams, fromState, fromParams){
      //   console.log('$stateChangeError - fired when an error occurs during transition.');
      //   console.log(arguments);
      // });
      // $rootScope.$on('$stateChangeSuccess',function(event, toState, toParams, fromState, fromParams){
      //   console.log('$stateChangeSuccess to '+toState.name+'- fired once the state transition is complete.');
      // });
      // // $rootScope.$on('$viewContentLoading',function(event, viewConfig){
      // //   // runs on individual scopes, so putting it in "run" doesn't work.
      // //   console.log('$viewContentLoading - view begins loading - dom not rendered',viewConfig);
      // // });
      // $rootScope.$on('$viewContentLoaded',function(event){
      //   console.log('$viewContentLoaded - fired after dom rendered',event);
      // });
      // $rootScope.$on('$stateNotFound',function(event, unfoundState, fromState, fromParams){
      //   console.log('$stateNotFound '+unfoundState.to+'  - fired when a state cannot be found by its name.');
      //   console.log(unfoundState, fromState, fromParams);
      // });

    }
  ]);

App.controller('AppCtrl', ['$scope', '$location', '$templateCache', 'CompatibilityService', 'NotifyService',
  function AppCtrl($scope, $location, $templateCache, CompatibilityService, NotifyService) {

    $scope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
      if (toState.resolve) {
        $scope.loading.spinner = true;
      }
    });

    $scope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams) {
    });

    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      console.log("change route from", fromState, "-", toState);
      if (angular.isDefined(toState.data.pageTitle)) {
        $scope.pageTitle = toState.data.pageTitle + ' | Plotter';
      }

      $scope.loading.spinner = false;
    });

    $scope.loading = { spinner: true };

    // $scope.compatible = CompatibilityService.isCompatible();

  }
]);


// see http://stackoverflow.com/questions/11252780/whats-the-correct-way-to-communicate-between-controllers-in-angularjs
// App.config(['$provide', function ($provide) {
//     $provide.decorator('$rootScope', ['$delegate',
//       function ($delegate) {

//         Object.defineProperty($delegate.constructor.prototype, '$onRootScope', {
//           value: function (name, listener) {
//             var unsubscribe = $delegate.$on(name, listener);
//             this.$on('$destroy', unsubscribe);
//           },
//           enumerable: false
//         });


//         return $delegate;
//       }
//     ]);
//   }
// ]);