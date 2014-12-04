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

mod.controller('ExploreController', ['$scope', '$templateCache', '$rootScope', 'windowHandler', 'DatasetFactory', '$q', 'PlotService', 'WindowHandler', 'SOMService',
  function ExploreController($scope, $templateCache, $rootScope, windowHandler, DatasetFactory, $q, PlotService, WindowHandler, SOMService) {
    console.log("explore ctrl");

    $scope.windowHandler = windowHandler;
    $scope.windows  = $scope.windowHandler.get();

    $scope.itemMapper = {
        sizeX: 'window.size.x', 
        sizeY: 'window.size.y'
        // row: 'window.position.row',
        // col: 'window.position.col'
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
      columns: 4 * 10,
      width: 4 * 125 * 10,
      colWidth: 125,
      rowHeight: '100',
      resizable: {
           enabled: true,
           handles: ['se']
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

    var inputPromise = DatasetFactory.getVariableData(defaultVariables);

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
