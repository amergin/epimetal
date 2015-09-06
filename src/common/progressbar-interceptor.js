angular.module('progressBarInterceptor', ['services.progressbar'])

.factory('progressBarInterceptor', function progressBarInterceptorFn($injector, $q) {
  var progressBarInterceptor = {
    request: function(config) {
      $injector.invoke(function(ProgressbarService, $templateCache) {
        // don't use on template get requests, those are actually local
        if ($templateCache.get(config.url) === undefined) {
          ProgressbarService.get().start();
        }
      });
      return config || $q.when(config);
    },
    requestError: function(rejection) {
      $injector.invoke(function(ProgressbarService) {
        ProgressbarService.get().complete();
      });
      return $q.reject(rejection);
    },
    response: function(response) {
      $injector.invoke(function(ProgressbarService, $templateCache) {
        if ($templateCache.get(response.config.url) === undefined) {
          ProgressbarService.get().complete();
        }
      });
      return response || $q.when(response);
    },
    responseError: function(rejection) {
      $injector.invoke(function(ProgressbarService) {
        ProgressbarService.get().complete();
      });
      return $q.reject(rejection);
    }

  };
  return progressBarInterceptor;
})

.config(function progressBarConfig($injector) {
  $injector.invoke(function($httpProvider) {
    $httpProvider.interceptors.push('progressBarInterceptor');
  });
});