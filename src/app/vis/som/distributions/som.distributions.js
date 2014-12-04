var vis =
  angular.module('plotter.vis.som.distributions', 
    [
    // 'plotter.vis.plotting',
    // 'services.dataset',
    // 'services.window',
    // 'services.notify', 
    // 'services.dimensions', 
    // 'localytics.directives',
    // 'services.urlhandler'
    ]);

mod.controller('SOMDistributionsController', ['$scope', '$templateCache', '$rootScope', 'windowHandler', 'PlotService',
  function SOMDistributionsController($scope, $templateCache, $rootScope, windowHandler, PlotService) {
    $scope.windowHandler = windowHandler;
    $scope.windowHandler.filtersEnabled(false);
    $scope.windows  = $scope.windowHandler.get();    

    $scope.itemMapper = {
        sizeX: 'window.size.x', 
        sizeY: 'window.size.y',
        row: 'window.position.row',
        col: 'window.position.col'
    };

    $scope.gridOptions = {
      pushing: false,
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
      columns: 4 * 10, // x colWidth
      width: 4 * 100 * 10,
      rows: 8,
      colWidth: '100',
      rowHeight: '88',
      resizable: {
           enabled: false,
           handles: ['se']
      }
    };
  }
]);

mod.controller('SOMMenuController', ['$scope', '$templateCache', '$rootScope', 'windowHandler',
  function SOMMenuController($scope, $templateCache, $rootScope, windowHandler) {
    $scope.windowHandler = windowHandler;
    $scope.somSpecial = true;
  }
]);

