var App = angular.module('plotter', [
  'templates-app',
  'templates-common',
  'plotter.vis',
  'ui.state',
  'ui.route'
]);

App.config(['$stateProvider', '$urlRouterProvider', '$httpProvider',
  function ($stateProvider, $urlRouterProvider, $httpProvider) {

    // default route
    $urlRouterProvider.otherwise('/vis');

    // introduce response interceptor: logic for accepting/rejecting
    // promises app-wide. This is used to redirect to login when
    // unauth'd usage of the api occurs.
    // see http://arthur.gonigberg.com/2013/06/29/angularjs-role-based-auth/
    var errorInterceptor = function ($q, $location) {
      var successFn = function (response) {

        // notice that partial templates are fetched using this as well!
        // if (response.status === 200) {
        //   if ( !_.isUndefined(response.data.success) ) {
        //     var successFlag = response.data.success.toLowerCase();
        //     if (successFlag === 'false') {
        //       $location.path('/login');
        //       // $state.go('login', {} );
        //       return $q.reject(response);
        //     }
        //   }
        // }
        // all is good
        return response;
      };

      var errorFn = function (response) {
        if( response.status === 403 ) {
          $location.path('/login');
          return $q.reject(response);
        }
        else {
          return $q.reject(response);
        }
      };

      // return the success/error functions
      return function (promise) {
        return promise.then(successFn, errorFn);
      };

    };

    $httpProvider.responseInterceptors.push(errorInterceptor);

  }
])
  .run(['$rootScope', '$state', '$stateParams', 'AuthenticationService', '$location',
    function ($rootScope, $state, $stateParams, AuthenticationService, $location) {
      $rootScope.$state = $state;
      $rootScope.$stateParams = $stateParams;
      $state.transitionTo('vis');

      // auth & login stuff:
      // enumerate routes that don't need authentication
      var routesThatDontRequireAuth = ['/login'];

      // check if current location matches route  
      var routeClean = function (route) {
        return _.find(routesThatDontRequireAuth,
          function (noAuthRoute) {
            return _.str.startsWith(route, noAuthRoute);
          });
      };

      $rootScope.$on('$stateChangeStart', function (ev, to, toParams, from, fromParams) {
        // if route requires auth and user is not logged in
        if (!routeClean($location.url()) && !AuthenticationService.isLoggedIn()) {
          // redirect back to login
          $location.path('/login');
        }
      });



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