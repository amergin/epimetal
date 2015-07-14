var vis =
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
    'mgcrea.ngStrap.scrollspy'
    ]);

mod.constant('EXPLORE_DEFAULT_HISTOGRAMS', ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc']);
mod.constant('EXPLORE_DEFAULT_SIZE_X', 3);
mod.constant('EXPLORE_DEFAULT_SIZE_Y', 3);

mod.controller('ExploreController', ['$scope', '$templateCache', '$rootScope', 'windowHandler', 'DatasetFactory', '$q', 'PlotService', 'WindowHandler', 'SOMService', '$timeout', 'EXPLORE_DEFAULT_SIZE_X', 'EXPLORE_DEFAULT_SIZE_Y',
  function ExploreController($scope, $templateCache, $rootScope, windowHandler, DatasetFactory, $q, PlotService, WindowHandler, SOMService, $timeout, EXPLORE_DEFAULT_SIZE_X, EXPLORE_DEFAULT_SIZE_Y) {
    console.log("explore ctrl");

    $scope.windowHandler = windowHandler;
    $scope.windows  = $scope.windowHandler.get();

    $scope.itemMapper = {
        sizeX: 'window.grid.size.x',
        sizeY: 'window.grid.size.y',
        row: 'window.grid.position.row',
        col: 'window.grid.position.col'
    };

    var emitResize = function($element) {
      dc.events.trigger( function() {
        $rootScope.$emit('gridster.resize', $element);
      }, 200 );
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
           handles: ['se'],
           start: function(event, $element, widget) { console.log("resize start"); },
           resize: function(event, $element, widget) { 
            // event.stopImmediatePropagation();
            emitResize($element); 
            },
           stop: function(event, $element, widget) { 
            // event.stopImmediatePropagation();
            emitResize($element);
          }
      }
    };
  }
]);

mod.controller('ExploreMenuCtrl', ['$scope', '$rootScope', 'datasets', 'variables', 'windowHandler', 'NotifyService', 'PlotService', '$q',
  function ExploreMenuCtrl($scope, $rootScope, datasets, variables, windowHandler, NotifyService, PlotService, $q) {
    console.log("menu ctrl");

    $scope.windowHandler = windowHandler;

  }
])

.run(['$templateCache', function($templateCache) {
  // overwrite default template for modal; allow wider setup with custom css
  $templateCache.put('modal/modal.tpl.html', $templateCache.get('notify.modal-wide.tpl.html'));
}]);
