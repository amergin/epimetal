angular.module('plotter.vis.regression', 
  [
  'plotter.vis.plotting',
  'services.dataset',
  'services.window',
  'services.notify', 
  'services.dimensions', 
  'services.urlhandler'
  ])

.constant('REGRESSION_WIN_X_PX', 40)
.constant('REGRESSION_WIN_Y_PX', 100)

.controller('RegressionController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants', 'variables', 'windowHandler', 'REGRESSION_WIN_X_PX', 'REGRESSION_WIN_Y_PX',
  function RegressionController($scope, $templateCache, DimensionService, $rootScope, constants, variables, windowHandler, REGRESSION_WIN_X_PX, REGRESSION_WIN_Y_PX) {
    $scope.handler = windowHandler;
    $scope.windows = windowHandler.get();
    console.log("regression ctrl");

    $scope.itemMapper = {
        sizeX: 'window.grid.size.x',
        sizeY: 'window.grid.size.y',
        row: 'window.grid.position.row',
        col: 'window.grid.position.col'
    };

    $scope.gridOptions = {
      pushing: true,
      floating: true,
      swapping: true,
      margins: [10, 10],
      outerMargin: true,
      draggable: {
        enabled: false,
        // handle: '.handle'
      },
      // defaultSizeX: 16,
      // defaultSizeY: 40,
      columns: 16 * 10,
      width: 16 * 10 * REGRESSION_WIN_X_PX,
      maxSizeY: 800,
      rowHeight: String(REGRESSION_WIN_Y_PX),
      colWidth: REGRESSION_WIN_X_PX,
      resizable: {
           enabled: false
      }
    };    
  }
]);