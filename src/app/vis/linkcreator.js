var mod = angular.module('plotter.vis.linkcreator', ['services.urlhandler', 'services.notify', 'utilities']);

mod.directive('linkCreator', ['$templateCache', '$compile', '$rootScope', '$injector', function($templateCache, $compile, $rootScope, $injector) {
  return {
    restrict: 'C',
    scope: true,
    // replace: false,
    controller: 'LinkCreatorController',
    template: function(tElem, tAttrs) {
      var button = $templateCache.get('vis/linkcreator.btn.tpl.html');
      var btnEl = angular.element( button );
      btnEl.attr('popover', $templateCache.get('vis/linkcreator.tpl.html') );
      return btnEl[0].outerHTML;
    }
  };
}]);

module.directive('selectOnClick', function () {
  return {
    restrict: 'A',
    // Linker function
    link: function (scope, element, attrs) {
      element.bind('click', function () {
        this.select();
      });
    }
  };
});

mod.constant('linksAPI', {
  shortener: {
    url: 'https://www.googleapis.com/urlshortener/v1/url'
  }, 
  error: 'Creating a short link failed. Please try again.'
});

mod.controller('LinkCreatorController', ['$scope', 'UrlHandler', 'NotifyService', '$templateCache', '$http', 'linksAPI',
  function LinkCreatorController($scope, UrlHandler, NotifyService, $templateCache, $http, linksAPI) {
    $scope.currentUrl = document.URL;

    $scope.update = function() { 
      $scope.currentUrl = document.URL;
    };

    $scope.getShort = function() {
      $http.post( linksAPI.shortener.url, document.URL ) // returns promise
      .success( function(data) {
        $scope.short = data.id;
      })
      .error( function(data, status, headers, config) {
        NotifyService.addTransient( linksAPI.error );
      });
    };

    $scope.testinov = "NOV";
    window.soo = $scope;
}]);

// see http://stackoverflow.com/questions/16722424/how-do-i-create-an-angularjs-ui-bootstrap-popover-with-html-content
mod.filter('unsafe', ['$sce', function ($sce) {
    return function (val) {
        return $sce.trustAsHtml(val);
    };
}]);

// update popover template for binding unsafe html
angular.module("template/popover/popover.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/popover/popover.html",
      "<div class=\"popover {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
      "  <div class=\"arrow\"></div>\n" +
      "\n" +
      "  <div class=\"popover-inner\">\n" +
      "      <h3 class=\"popover-title\" ng-bind-html=\"title | unsafe\" ng-show=\"title\"></h3>\n" +
      "      <div class=\"popover-content\"ng-bind-html=\"content | unsafe\"></div>\n" +
      "  </div>\n" +
      "</div>\n" +
      "");
}]);