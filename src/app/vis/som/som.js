var vis =
  angular.module('plotter.vis.som', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.notify',
    'ui.layout'
    // 'services.window',
    // 'services.dimensions', 
    // 'localytics.directives',
    // 'services.urlhandler'
    ]);

mod.controller('SOMBottomMenuController', ['$scope', '$templateCache', '$rootScope', 'NotifyService', 'variables', 'DatasetFactory', 'PlotService', 'bottomWindowHandler',
  function SOMBottomMenuController($scope, $templateCache, $rootScope, NotifyService, variables, DatasetFactory, PlotService, bottomWindowHandler) {
    $scope.windowHandler = bottomWindowHandler;

    $scope.variables = variables;
    $scope.currentSelection = {};
    $scope.savedSelection = {};
    $scope.planeInput = {};

    $scope.openSettings = function() {
      $scope.currentSelection = angular.copy( $scope.savedSelection );
      var promise = NotifyService.addClosableModal( 'vis/menucomponents/som.tpl.html', $scope );
      promise.then( function(res) {
        $scope.currentSelection = {};
      });
    };

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.clear = function() {
      $scope.currentSelection.x = [];
    };

    $scope.canSubmitSOM = function () {
      return $scope.canEdit() && !_.isEmpty($scope.currentSelection.x) && ($scope.currentSelection.x.length >= 3);
    };

    $scope.canOpenPlane = function() {
      return DatasetFactory.somReady();
    };

    $scope.saveSettings = function(selection) {
      NotifyService.closeModal();
      if( _.isEqual( selection, $scope.savedSelection ) ) {
        // do nothing
      } else {
        $scope.savedSelection = angular.copy( $scope.currentSelection );
        DatasetFactory.updateSOMVariables($scope.currentSelection.x);
      }
      $scope.currentSelection = {};
    };

    $scope.canSubmitPlane = function(plane) {
      return !_.isUndefined($scope.planeInput);
    };

    $scope.addPlane = function(testVar) {
      $scope.planeInput = {};
      NotifyService.addTransient('Starting plane computation', 'The computation may take a while.', 'success');
      DatasetFactory.getPlane(testVar).then(
        function succFn(res) {
          PlotService.drawSOM(res, $scope.windowHandler);
          NotifyService.addTransient('Plane computation ready', 'The requested new plane has now been drawn.', 'success');
          console.log(res);

        },
        function errFn(res) {
          NotifyService.addTransient('Plane computation failed', res, 'danger');
        }
      );
    };

  }
]);

mod.controller('SOMBottomContentController', ['$scope', '$templateCache', '$rootScope', 'bottomWindowHandler', 'DatasetFactory',
  function SOMBottomContentController($scope, $templateCache, $rootScope, bottomWindowHandler, DatasetFactory) {
    $scope.windowHandler = bottomWindowHandler;
    $scope.windows = $scope.windowHandler.get();

    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      if( toState.name == 'vis.som.distributions' || toState.name == 'vis.som.profiles' ) {
        // refresh SOM computation
        DatasetFactory.computeSOM();
      }
    });

    $scope.itemMapper = {
        sizeX: 'window.size.x', 
        sizeY: 'window.size.y',
        row: 'window.position.row',
        col: 'window.position.col'
    };

    $scope.gridOptions = {
      pushing: true,
      floating: true,
      swapping: false,
      margins: [10, 10],
      outerMargin: true,
      draggable: {
        enabled: true,
        handle: '.handle'
      },
      defaultSizeX: 4,
      defaultSizeY: 4,
      // minColumns: 40,
      columns: 4 * 10,
      width: 4 * 125 * 10,
      colWidth: '125',
      rowHeight: '100',
      resizable: {
           enabled: false,
           handles: ['se']
      }
    };    
  }
]);