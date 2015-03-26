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

mod.controller('LinkCreatorController', ['$scope', 'UrlHandler', 'NotifyService', '$templateCache', '$http', '$location', '$timeout',
  function LinkCreatorController($scope, UrlHandler, NotifyService, $templateCache, $http, $location, $timeout) {
    $scope.stateLink = null;

    $scope.getStateLink = function() {
      UrlHandler.create()
      .then(function succFn(hash) {
        $location.search('state', hash);
        $scope.stateLink = $location.absUrl();
        $location.url($location.path());
      }, function errFn(res) {
        NotifyService.addSticky('Error', 'The current state could not be saved. Please try again.', 'error', 
          { referenceId: 'linkcreatorinfo' });
      });

    };

  }
]);