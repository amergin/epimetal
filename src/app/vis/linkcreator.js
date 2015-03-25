var mod = angular.module('plotter.vis.linkcreator', ['services.urlhandler', 'services.notify', 'utilities']);

mod.directive('linkCreator', ['$templateCache', '$compile', '$rootScope', '$injector',
  function($templateCache, $compile, $rootScope, $injector) {
    return {
      restrict: 'C',
      scope: true,
      replace: true,
      controller: 'LinkCreatorController',
      template: function(tElem, tAttrs) {
        var button = $templateCache.get('vis/linkcreator.btn.tpl.html');
        var btnEl = angular.element(button);
        return btnEl[0].outerHTML;
      }
    };
  }
]);

mod.constant('linksAPI', {
  shortener: {
    url: 'https://www.googleapis.com/urlshortener/v1/url'
  },
  error: 'Creating a short link failed. Please try again.'
});

mod.controller('LinkCreatorController', ['$scope', 'UrlHandler', 'NotifyService', '$templateCache', '$http', 'linksAPI',
  function LinkCreatorController($scope, UrlHandler, NotifyService, $templateCache, $http, linksAPI) {
    $scope.currentUrl = document.URL;
    $scope.short = null;

    $scope.getShort = function() {
      UrlHandler.create();
      // $http.post(linksAPI.shortener.url, {
      //   'longUrl': document.URL
      // }) // returns promise
      // .success(function(data) {
      //   $scope.short = data.id;
      // })
      //   .error(function(data, status, headers, config) {
      //     NotifyService.addTransient(linksAPI.error);
      //   });
    };

  }
]);