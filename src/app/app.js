var App = angular.module('plotter', [
  'templates-app',
  'templates-common',
  'plotter.vis',
  'plotter.login',
  'ui.router.state',
  'ui.router',
  'services.compatibility',
  'plotter.compatibility',
  'ngSanitize', 'ngAnimate'
]);

App.constant('constants', {
  nanValue: -1000,
  legalMinValue: 0,
  tickFormat: d3.format(".2s"),
  groups: {
    heatmap: 'ext',
    scatterplot: 'main',
    histogram: 'main'
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

App.config(['$stateProvider', '$urlRouterProvider', '$httpProvider', '$injector',
  function ($stateProvider, $urlRouterProvider, $httpProvider, $injector) {

    // default route
    $urlRouterProvider.otherwise('/vis/');



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
      console.log(toParams);
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
App.config(['$provide', function ($provide) {
    $provide.decorator('$rootScope', ['$delegate',
      function ($delegate) {

        Object.defineProperty($delegate.constructor.prototype, '$onRootScope', {
          value: function (name, listener) {
            var unsubscribe = $delegate.$on(name, listener);
            this.$on('$destroy', unsubscribe);
          },
          enumerable: false
        });


        return $delegate;
      }
    ]);
  }
]);