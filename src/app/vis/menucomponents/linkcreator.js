angular.module('plotter.vis.menucomponents.linkcreator', 
  ['ngClipboard', 'mgcrea.ngStrap.popover'])

.config(function linkcreatorConfig(ngClipProvider) {
    ngClipProvider.setPath("assets/ZeroClipboard.swf");
})

.controller('LinkCreatorController', function LinkCreatorController($scope, $q, $popover, $element, UrlHandler, NotifyService, $state, usSpinnerService) {

    $scope.stateLink = null;

    // create popover relative to the button
    $scope.popover = $popover($element, {
      title: 'Link this view',
      trigger: 'manual',
      container: 'body',
      placement: 'bottom-right',
      contentTemplate: 'vis/menucomponents/linkcreator.inner.tpl.html',
      autoClose: 1
    });

    $scope.popover.$scope.getCopyLink = function() {
      return $scope.stateLink;
    };

    $scope.close = function() {
      $scope.stateLink = null;
      $scope.popover.hide();
    };

    $scope.click = function() {
      if($scope.stateLink) { $scope.close(); }
      else {
        $scope.getStateLink().then(function succFn() {
          $scope.popover.show();
        });
      }
    };


    $scope.popover.$scope.copied = function() {
      NotifyService.addTransient('Copied to clip board', 'Link copied to clip board', 'info');
      $scope.close();
    };

    $scope.getStateLink = function() {
      var defer = $q.defer();

      usSpinnerService.spin('linkcreator');
      UrlHandler.create()
      .then(function succFn(hash) {
        var baseUrl = window.location.origin + window.location.pathname;
        $scope.stateLink = baseUrl + $state.href($state.current.name, { state: hash }, { relative: true });
        defer.resolve($scope.stateLink);
        // does not work:
        //$state.href($state.current.name, { state: hash }, { absolute: true });
      }, function errFn(res) {
        NotifyService.addSticky('Error', 'The current state could not be saved. Please try again.', 'error', 
          { referenceId: 'linkcreatorinfo' });
        defer.reject('error');
      })
      .finally(function() {
      });

      return defer.promise;
    };

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