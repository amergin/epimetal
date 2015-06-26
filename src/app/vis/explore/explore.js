var vis =
  angular.module('plotter.vis.explore', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.window',
    'services.notify', 
    'services.dimensions', 
    'localytics.directives',
    'services.urlhandler',
    'gridster',
    'utilities',
    // 'mgcrea.ngStrap.collapse',
    'mgcrea.ngStrap.scrollspy'
    ]);

mod.constant('EXPLORE_DEFAULT_HISTOGRAMS', ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc']);

mod.controller('ExploreController', ['$scope', '$templateCache', '$rootScope', 'windowHandler', 'DatasetFactory', '$q', 'PlotService', 'WindowHandler', 'SOMService', '$timeout',
  function ExploreController($scope, $templateCache, $rootScope, windowHandler, DatasetFactory, $q, PlotService, WindowHandler, SOMService, $timeout) {
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
      defaultSizeX: 3,
      defaultSizeY: 3,
      columns: 4 * 10,
      // width: 4 * 10 * 150,
      colWidth: 150,
      rowHeight: '125',
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

    $scope.openHeatmapSelection = function() {
      var $modalScope = $scope.$new({ isolate: true });

      $modalScope.extend = {
        canSubmit: function() { return true; },
        title: 'Select a set of variables for a correlation plot',
        submitButton: 'Add correlation plot',
        upperLimit: 100
      };

      var promise = NotifyService.addClosableModal('vis/menucomponents/new.heatmap.modal.tpl.html', $modalScope, { 
        controller: 'ModalFormController',
        windowClass: 'modal-wide'
      });

      promise.then( function succFn(variables) {
        PlotService.drawHeatmap({ variables: {x: variables} }, $scope.windowHandler);
      }, function errFn(res) {
        // cancelled
      })
      .finally(function() {
        $modalScope.$destroy();
      });

    };

  }
])

.run(['$templateCache', function($templateCache) {
  // overwrite default template for modal; allow wider setup with custom css
  $templateCache.put('modal/modal.tpl.html', $templateCache.get('notify.modal-wide.tpl.html'));
}]);
