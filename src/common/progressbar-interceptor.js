var mod = angular.module('progressBarInterceptor', ['ngProgress']);

mod.factory('progressBarInterceptor', ['$injector', function($injector) {  
  var progressBarInterceptor = {
    request: function(config) {
      $injector.invoke(function(ngProgress, $templateCache) {
        // don't use on template get requests, those are actually local
        if( $templateCache.get(config.url) === undefined ) {
          ngProgress.start();
        }
      });
      return config;
    }, 
    response: function(response) {
      $injector.invoke(function(ngProgress, $templateCache) {
        if( $templateCache.get(response.config.url) === undefined ) {
          ngProgress.complete();
        }
      });
      return response;
    }
  };
  return progressBarInterceptor;
}]);

mod.config(['$injector', function($injector) {
  $injector.invoke(function($httpProvider) {
    $httpProvider.interceptors.push('progressBarInterceptor');
  });
}]);