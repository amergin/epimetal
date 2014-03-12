var App = angular.module('plotter', [
  'templates-app',
  'templates-common',
  'plotter.vis',
  'ui.router.state',
  'ui.router',
  'angular-growl',
  'ngSanitize',
  'ngAnimate',
  'services.notify'
]);

App.config(['$stateProvider', '$urlRouterProvider', '$httpProvider', 'growlProvider',
  function ($stateProvider, $urlRouterProvider, $httpProvider, growlProvider) {

    // default route
    $urlRouterProvider.otherwise('/vis');


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
        if( response.status === 403 ) {
          NotifyService.addLoginNeeded();
          // $location.path('/login');
        }
        return $q.reject(response);
      };

      errorFn.$inject = ['NotifyService'];

      // return the success/error functions
      return function (promise) {
        return promise.then(successFn, errorFn);
      };

    };

    $httpProvider.responseInterceptors.push(errorInterceptor);

  }
])
  .run(['$rootScope', '$state', '$stateParams', '$location',
    function ($rootScope, $state, $stateParams, $location) {
      $rootScope.$state = $state;
      $rootScope.$stateParams = $stateParams;
      $state.transitionTo('vis');

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
    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      if (angular.isDefined(toState.data.pageTitle)) {
        $scope.pageTitle = toState.data.pageTitle + ' | Plotter';
      }
    });
  }
]);


// // see http://stackoverflow.com/questions/11252780/whats-the-correct-way-to-communicate-between-controllers-in-angularjs
// App.config(['$provide', function($provide){
//   $provide.decorator('$rootScope', ['$delegate', function($delegate){

//     Object.defineProperty($delegate.constructor.prototype, '$onRootScope', {
//       value: function(name, listener){
//         var unsubscribe = $delegate.$on(name, listener);
//         this.$on('$destroy', unsubscribe);
//       },
//       enumerable: false
//     });


//     return $delegate;
//   }]);
// }]);