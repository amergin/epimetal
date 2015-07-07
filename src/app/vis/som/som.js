var vis =
  angular.module('plotter.vis.som', 
    [
    'plotter.vis.plotting',
    'plotter.vis.som.circle-filter-control',
    'services.dataset',
    'services.notify',
    'services.som',
    ]);

// mod.controller('SOMBottomMenuController', ['$scope', '$templateCache', '$rootScope', 'NotifyService', 'variables', 'DatasetFactory', 'SOMService', 'PlotService', 'bottomWindowHandler', '$timeout', 'DimensionService', 'FilterService',
//   function SOMBottomMenuController($scope, $templateCache, $rootScope, NotifyService, variables, DatasetFactory, SOMService, PlotService, bottomWindowHandler, $timeout, DimensionService, FilterService) {
//     $scope.windowHandler = bottomWindowHandler;

//     $scope.variables = variables;
//     $scope.currentSelection = {};
//     $scope.savedSelection = {
//       x: SOMService.getVariables()
//     };

//     $scope.planeInput = {};

//     $scope.openSettings = function() {
//       $scope.currentSelection = angular.copy( $scope.savedSelection );
//       var promise = NotifyService.addClosableModal( 'vis/menucomponents/som.tpl.html', $scope, {
//         size: 'lg'
//       });
//       promise.then( function(res) {
//         $scope.savedSelection = angular.copy( $scope.currentSelection );
//         $scope.currentSelection = {};
//         SOMService.updateVariables($scope.savedSelection.x, $scope.windowHandler);
//       });
//     };

//     $scope.canEdit = function () {
//       return DatasetFactory.activeSets().length > 0;
//     };

//     $scope.clear = function() {
//       $scope.currentSelection.x = [];
//     };

//     $scope.canSubmitSOM = function () {
//       return $scope.canEdit();
//     };

//     $scope.filterInfo = [];
//     $scope.$watch( function() {
//       return FilterService.getCircleFilterInfo();
//     }, function(val) {
//       $scope.filterInfo = val;
//     }, true);

//     $scope.canOpenPlane = function() {
//       return SOMService.somReady();
//     };

//     $scope.saveSettings = function(selection) {
//       if( $scope.currentSelection.x.length < 3 ) {
//         NotifyService.addSticky('Error', 'Please select at least three variables.', 'error', { referenceId: 'som-input' });
//         return;
//       }
//       NotifyService.closeModal();
//     };

//     $scope.canSubmitPlane = function(plane) {
//       return !_.isUndefined($scope.planeInput);
//     };

//     $scope.addPlane = function(testVar) {
//       $scope.planeInput = {};
//       PlotService.drawSOM({ variables: { x: testVar } }, $scope.windowHandler);
//     };


//     var defaultVariables = ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc'];
   
//   }
// ]);

mod.constant('SOM_DEFAULT_SIZE_X', 3);
mod.constant('SOM_DEFAULT_SIZE_Y', 3);
mod.constant('SOM_DEFAULT_PLANES', ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc']);

mod.controller('SOMContentCtrl', ['$scope', '$rootScope', 'NotifyService', 'contentWindowHandler', 'SOM_DEFAULT_SIZE_X', 'SOM_DEFAULT_SIZE_Y',
  function SOMContentCtrl($scope, $rootScope, NotifyService, contentWindowHandler, SOM_DEFAULT_SIZE_X, SOM_DEFAULT_SIZE_Y) {

    $scope.windowHandler = contentWindowHandler;
    $scope.windows = $scope.windowHandler.get();

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
      defaultSizeX: SOM_DEFAULT_SIZE_X,
      defaultSizeY: SOM_DEFAULT_SIZE_Y,
      columns: 4 * 3,
      width: 'auto',
      colWidth: 'auto',
      rowHeight: 'match',
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



mod.controller('SOMBottomContentCtrl', ['$scope', '$injector', '$timeout', '$rootScope', 'bottomWindowHandler', 'DatasetFactory', 'DimensionService', 'SOMService', 'PlotService', 'NotifyService', 'SOM_DEFAULT_PLANES',
  function SOMBottomContentCtrl($scope, $injector, $timeout, $rootScope, bottomWindowHandler, DatasetFactory, DimensionService, SOMService, PlotService, NotifyService, SOM_DEFAULT_PLANES) {
    $scope.windowHandler = bottomWindowHandler;
    $scope.windows = $scope.windowHandler.get();

    $scope.checkDefaults = function() {
      if( $scope.windows.length === 0 ) {
        _.each(SOM_DEFAULT_PLANES, function(variable) {
          PlotService.drawSOM({ variables: { x: variable } }, bottomWindowHandler);
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
  }
]);