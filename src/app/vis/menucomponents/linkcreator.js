var vis =
  angular.module('plotter.vis.menucomponents.linkcreator', 
    ['ngClipboard']);



vis.config(['ngClipProvider', function(ngClipProvider) {
    ngClipProvider.setPath("assets/ZeroClipboard.swf");
  }]);


vis.controller('LinkCreatorController', ['$scope', 'UrlHandler', 'NotifyService', '$templateCache', '$http', '$location', '$timeout', '$state', 'usSpinnerService',
  function LinkCreatorController($scope, UrlHandler, NotifyService, $templateCache, $http, $location, $timeout, $state, usSpinnerService) {
    $scope.stateLink = null;

    $scope.clicked = function() {
      NotifyService.addTransient('Copied to clip board', 'Link copied to clip board', 'info');
      $scope.$hide();
    };

    $scope.getStateLink = function() {
      usSpinnerService.spin('linkcreator');
      UrlHandler.create()
      .then(function succFn(hash) {
        var baseUrl = window.location.origin + window.location.pathname;
        $scope.stateLink = baseUrl + $state.href($state.current.name, { state: hash }, { relative: true });
        // does not work:
        //$state.href($state.current.name, { state: hash }, { absolute: true });
      }, function errFn(res) {
        NotifyService.addSticky('Error', 'The current state could not be saved. Please try again.', 'error', 
          { referenceId: 'linkcreatorinfo' });
      })
      .finally(function() {
        usSpinnerService.stop('linkcreator');
      });

    };

    // init on load
    $scope.getStateLink();

  }
]);

// directive for heatmap form
vis.directive('linkCreator', function () {
  return {
    restrict: 'C',
    replace: true,
    controller: 'LinkCreatorController',
    templateUrl: 'vis/menucomponents/linkcreator.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});