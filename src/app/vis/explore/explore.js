angular.module('plotter.vis.explore', 
  [
  'plotter.vis.plotting',
  'services.dataset',
  'services.window',
  'services.notify', 
  'services.dimensions', 
  'services.urlhandler',
  'gridster',
  'utilities',
  'ext.dc'    
  ])

.constant('EXPLORE_DEFAULT_SIZE_X', 3)
.constant('EXPLORE_DEFAULT_SIZE_Y', 3)

.controller('ExploreController', function ExploreController(VariableService, $scope, $rootScope, windowHandler, EXPLORE_DEFAULT_SIZE_X, EXPLORE_DEFAULT_SIZE_Y, dc) {
  console.log("explore ctrl");

  $scope.windowHandler = windowHandler;
  $scope.windows  = $scope.windowHandler.get();

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
    defaultSizeX: EXPLORE_DEFAULT_SIZE_X,
    defaultSizeY: EXPLORE_DEFAULT_SIZE_Y,
    columns: 4 * 3,
    width: 'auto',
    colWidth: 'auto',
    rowHeight: 'match',
      // colWidth: 150,
      // rowHeight: '125',
      minSizeX: 2,
      maxSizeX: 8,
      minSizeY: 2,
      maxSizeY: 8,
      maxRows: 50,
      resizable: {
       enabled: true,
       handles: ['se']
        }
      };

})

.controller('ExploreMenuCtrl', function ExploreMenuCtrl($scope, datasets, variables, windowHandler) {
  console.log("menu ctrl");
  $scope.windowHandler = windowHandler;
})

.run(function runExplore($templateCache) {
  // overwrite default template for modal; allow wider setup with custom css
  $templateCache.put('modal/modal.tpl.html', $templateCache.get('notify.modal-wide.tpl.html'));
});
