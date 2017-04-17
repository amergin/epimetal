angular.module('plotter.vis.som', [
  'plotter.vis.plotting',
  'plotter.vis.som.circle-filter-control',
  'services.dataset',
  'services.notify',
  'services.som',
  'ext.dc',
  'ext.lodash'
])

.constant('SOM_DEFAULT_SIZE_X', 3)
  .constant('SOM_DEFAULT_SIZE_Y', 3)

.filter('prettifyArray', function() {
  function prettify(array) {
    if(!array || !array.length || !_.isArray(array)) {
      return "(none)";
    } else {
      return array.join(", ");
    }
  }
  return prettify;
})

.controller('SOMContentCtrl', function SOMContentCtrl($scope, $rootScope, contentWindowHandler, SOM_DEFAULT_SIZE_X, SOM_DEFAULT_SIZE_Y, dc, _) {

  $scope.windowHandler = contentWindowHandler;
  $scope.windows = $scope.windowHandler.get();

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
      enabled: true,
      handle: '.handle'
    },
    defaultSizeX: SOM_DEFAULT_SIZE_X,
    defaultSizeY: SOM_DEFAULT_SIZE_Y,
    columns: 4 * 3,
    width: 'auto',
    colWidth: 'auto',
    rowHeight: 'match',
    // colWidth: 150,
    // rowHeight: '125',
    minSizeX: 3,
    maxSizeX: 8,
    minSizeY: 3,
    maxSizeY: 8,
    maxRows: 50,
    resizable: {
     enabled: true,
     handles: ['se']
      }
    };
});