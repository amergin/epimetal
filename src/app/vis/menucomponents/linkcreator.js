angular.module('plotter.vis.menucomponents.linkcreator', 
  ['ngClipboard'])

.config(function linkcreatorConfig(ngClipProvider) {
    ngClipProvider.setPath("assets/ZeroClipboard.swf");
})

.controller('LinkCreatorController', function LinkCreatorController($scope, UrlHandler, NotifyService, $state, usSpinnerService) {
    $scope.stateLink = null;

    $scope.buttonText = function() {
      if($scope.stateLink) { return "Copy link to clipboard"; }
      return "Create link of this view";
    };

    $scope.clicked = function() {
      NotifyService.addTransient('Copied to clip board', 'Link copied to clip board', 'info');
      $scope.$hide();
    };

    $scope.getStateLink = function() {
      // $scope.processing = true;
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
        $scope.processing = false;
        usSpinnerService.stop('linkcreator');
      });

    };

    // init on load
    // $scope.getStateLink();

})

// directive for heatmap form
.directive('plLinkCreator', function () {
  return {
    restrict: 'A',
    scope: true,
    // replace: true,
    controller: 'LinkCreatorController',
    templateUrl: 'vis/menucomponents/linkcreator.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});