var App = angular.module('plotter', [
  'templates-app',
  'templates-common',
  'plotter.vis',
  'plotter.login',
  'ui.router.state',
  'ui.router',
  'angular-growl',
  'ngSanitize',
  'ngAnimate',
  'services.notify'
]);

App.config(['$stateProvider', '$urlRouterProvider', '$httpProvider', 'growlProvider', '$injector',
  function ($stateProvider, $urlRouterProvider, $httpProvider, growlProvider, $injector) {

    // default route
    $urlRouterProvider.otherwise('/vis/');


    // allow HTML markup in notify messages:
    growlProvider.globalEnableHtml(true);

    // introduce response interceptor: logic for accepting/rejecting
    // promises app-wide. This is used to redirect to login when
    // unauth'd usage of the api occurs.
    // see http://arthur.gonigberg.com/2013/06/29/angularjs-role-based-auth/
    var errorInterceptor = function ($q, $location, NotifyService) {
      var successFn = function (response) {
        return response;
      };

      var errorFn = function (response) {
        // var NotifyService = $injector.get('NotifyService');
        // var $state = $injector.get('$state');
        if (response.status === 403) {
          //NotifyService.addLoginNeeded();
          $location.path('/login/');
          // $injector.invoke( function($state) {
          //   $state.go('/login/');
          // });
        }
        return $q.reject(response);
      };

      //errorFn.$inject = ['NotifyService', '$state'];

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

      // // auth & login stuff:
      // // enumerate routes that don't need authentication
      // var routesThatDontRequireAuth = ['/login'];

      // // check if current location matches route  
      // var routeClean = function (route) {
      //   return _.find(routesThatDontRequireAuth,
      //     function (noAuthRoute) {
      //       return _.str.startsWith(route, noAuthRoute);
      //     });
      // };

      // $rootScope.$on('$stateChangeStart', function (ev, to, toParams, from, fromParams) {
      //   // if route requires auth and user is not logged in
      //   if (!routeClean($location.url()) && !AuthenticationService.isLoggedIn()) {
      //     // redirect back to login
      //     $location.path('/login');
      //   }
      // });



    }

  ]);

App.controller('AppCtrl', ['$scope', '$location',
  function AppCtrl($scope, $location) {

    $scope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
      if (toState.resolve) {
        $scope.loading.spinner = true;
      }
    });

    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      console.log("change route from", fromState, "-", toState);
      if (angular.isDefined(toState.data.pageTitle)) {
        $scope.pageTitle = toState.data.pageTitle + ' | Plotter';
      }

      if (toState.resolve) {
        $scope.loading.spinner = false;
      }
    });

    $scope.loading = { spinner: true };



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