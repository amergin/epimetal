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
  .constant('SOM_DEFAULT_PLANES', ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc'])

.controller('SOMContentCtrl', function SOMContentCtrl($scope, $rootScope, contentWindowHandler, SOM_DEFAULT_SIZE_X, SOM_DEFAULT_SIZE_Y, dc, _) {

  $scope.windowHandler = contentWindowHandler;
  $scope.windows = $scope.windowHandler.get();

  $scope.itemMapper = {
    sizeX: 'window.grid.size.x',
    sizeY: 'window.grid.size.y',
    row: 'window.grid.position.row',
    col: 'window.grid.position.col'
  };

  var emitResize = function($element) {
    dc.events.trigger(function() {
      $rootScope.$emit('gridster.resize', $element);
    }, 200);
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
    minSizeX: 2,
    maxSizeX: 20,
    minSizeY: 2,
    maxSizeY: 8,
    maxRows: 50,
    resizable: {
      enabled: true,
      handles: ['se']
        //  start: function(event, $element, widget) { console.log("resize start"); },
        //  resize: function(event, $element, widget) { 
        //   // event.stopImmediatePropagation();
        //   emitResize($element); 
        //   },
        //  stop: function(event, $element, widget) { 
        //   // event.stopImmediatePropagation();
        //   emitResize($element);
        // }
    }
  };

})

.controller('SOMBottomContentCtrl', function SOMBottomContentCtrl($scope, bottomWindowHandler, PlotService, SOM_DEFAULT_PLANES, _) {
  $scope.windowHandler = bottomWindowHandler;
  $scope.windows = $scope.windowHandler.get();

  $scope.checkDefaults = function() {
    if ($scope.windows.length === 0) {
      _.each(SOM_DEFAULT_PLANES, function(variable) {
        PlotService.drawSOM({
          variables: {
            x: variable
          }
        }, bottomWindowHandler);
      });
    }
  };

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
    defaultSizeX: 4,
    defaultSizeY: 4,
    // minColumns: 40,
    columns: 4 * 40,
    width: 4 * 40 * 100,
    colWidth: '100',
    rowHeight: '79',
    resizable: {
      enabled: false,
      handles: ['se']
    }
  };

});