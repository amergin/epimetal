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
    'utilities'
    ]);

mod.controller('ExploreController', ['$scope', '$templateCache', '$rootScope', 'windowHandler', 'DatasetFactory', '$q', 'PlotService', 'WindowHandler', 'SOMService', '$timeout',
  function ExploreController($scope, $templateCache, $rootScope, windowHandler, DatasetFactory, $q, PlotService, WindowHandler, SOMService, $timeout) {
    console.log("explore ctrl");

    $scope.windowHandler = windowHandler;
    $scope.windows  = $scope.windowHandler.get();

    $scope.itemMapper = {
        sizeX: 'window.size.x',
        sizeY: 'window.size.y'
        // row: 'window.position.row',
        // col: 'window.position.col'
    };

    var emitResize = function($element) {
      dc.events.trigger( function() {
        $rootScope.$emit('gridster.resize', $element);
      }, 200 );
    };

    // $rootScope.$on('tab.changed', function(event, tabName) {
    //   if( tabName == $scope.windowHandler.getName() ) {
    //     console.log("tab.changed triggered for", tabName);
    //     $scope.windowHandler.redrawAll();
    //   }
    // });


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
      width: 4 * 150 * 10,
      colWidth: 150,
      rowHeight: '125',
      minSizeX: 3,
      maxSizeX: 6,
      minSizeY: 3,
      maxSizeY: 6,
      resizable: {
           enabled: true,
           handles: ['se'],
           start: function(event, $element, widget) { console.log("resize start"); },
           resize: function(event, $element, widget) { 
            event.stopImmediatePropagation();
            emitResize($element); 
            },
           stop: function(event, $element, widget) { 
            event.stopImmediatePropagation();
            emitResize($element);
          }
      }
    };


  var defaultVariables = ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc'];
  var planePromises = [];
  var defaultSOMInputs = [
    'XXL-VLDL-L',
    'XL-VLDL-L',
    'L-VLDL-L',
    'M-VLDL-L',
    'S-VLDL-L',
    'XS-VLDL-L',
    'IDL-L',
    'L-LDL-L',
    'M-LDL-L',
    'S-LDL-L',
    'XL-HDL-L',
    'L-HDL-L',
    'M-HDL-L',
    'S-HDL-L',
    'Serum-C',
    'Serum-TG',
    'HDL-C',
    'LDL-C',
    'Glc',
    'Cit',
    'Phe',
    'Gp',
    'Tyr',
    'FAw3toFA',
    'FAw6toFA',
    'SFAtoFA'
    ];

    var inputPromise = DatasetFactory.getVariableData(defaultVariables, $scope.windowHandler);

    inputPromise.then( function() {

      _.each( defaultVariables, function(variable) {
        PlotService.drawHistogram({ pooled: undefined,  variables: { x: variable } }, windowHandler);
      });

    });

    // PlotService.drawHistogram({ pooled: undefined,  variables: { x: 'Serum-C' } }, $scope.windowHandler);
    // PlotService.drawHistogram({ pooled: undefined,  variables: { x: 'Serum-TG' } }, $scope.windowHandler);
    // PlotService.drawHistogram({ pooled: undefined,  variables: { x: 'HDL-C' } }, $scope.windowHandler);
    // PlotService.drawHistogram({ pooled: undefined,  variables: { x: 'LDL-C' } }, $scope.windowHandler);
    // PlotService.drawHistogram({ pooled: undefined,  variables: { x: 'Glc' } }, $scope.windowHandler);
    
  }
]);

mod.controller('ExploreMenuCtrl', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants', 'datasets', 'variables', 'windowHandler',
  function ExploreMenuCtrl($scope, $templateCache, DimensionService, $rootScope, constants, datasets, variables, windowHandler) {
    console.log("menu ctrl", datasets);

    $scope.windowHandler = windowHandler;
  }
]);
