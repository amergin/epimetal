var vis =
  angular.module('plotter.vis.som', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.notify',
    'services.som'
    ]);

mod.controller('SOMBottomMenuController', ['$scope', '$templateCache', '$rootScope', 'NotifyService', 'variables', 'DatasetFactory', 'SOMService', 'PlotService', 'bottomWindowHandler', '$timeout', 'DimensionService', 'FilterService',
  function SOMBottomMenuController($scope, $templateCache, $rootScope, NotifyService, variables, DatasetFactory, SOMService, PlotService, bottomWindowHandler, $timeout, DimensionService, FilterService) {
    $scope.windowHandler = bottomWindowHandler;

    $scope.variables = variables;
    $scope.currentSelection = {};
    $scope.savedSelection = {
      x: SOMService.getVariables()
    };

    $scope.planeInput = {};

    $scope.openSettings = function() {
      $scope.currentSelection = angular.copy( $scope.savedSelection );
      var promise = NotifyService.addClosableModal( 'vis/menucomponents/som.tpl.html', $scope, {
        size: 'lg'
      });
      promise.then( function(res) {
        $scope.savedSelection = angular.copy( $scope.currentSelection );
        $scope.currentSelection = {};
        SOMService.updateVariables($scope.savedSelection.x, $scope.windowHandler);
      });
    };

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.clear = function() {
      $scope.currentSelection.x = [];
    };

    $scope.canSubmitSOM = function () {
      return $scope.canEdit();
    };

    $scope.filterInfo = [];
    $scope.$watch( function() {
      return FilterService.getCircleFilterInfo();
    }, function(val) {
      $scope.filterInfo = val;
    }, true);

    $scope.canOpenPlane = function() {
      return SOMService.somReady();
    };

    $scope.saveSettings = function(selection) {
      if( $scope.currentSelection.x.length < 3 ) {
        NotifyService.addSticky('Error', 'Please select at least three variables.', 'error', { referenceId: 'som-input' });
        return;
      }
      NotifyService.closeModal();
    };

    $scope.canSubmitPlane = function(plane) {
      return !_.isUndefined($scope.planeInput);
    };

    $scope.addPlane = function(testVar) {
      $scope.planeInput = {};
      PlotService.drawSOM({ variables: { x: testVar } }, $scope.windowHandler);
    };


    var defaultVariables = ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc'];
   
  }
]);

mod.controller('SOMBottomContentController', ['$scope', '$injector', '$timeout', '$rootScope', 'bottomWindowHandler', 'DatasetFactory', 'DimensionService', 'SOMService', 'PlotService', 'NotifyService',
  function SOMBottomContentController($scope, $injector, $timeout, $rootScope, bottomWindowHandler, DatasetFactory, DimensionService, SOMService, PlotService, NotifyService) {
    $scope.windowHandler = bottomWindowHandler;
    $scope.windows = $scope.windowHandler.get();

    var defaultVariables = ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc'];

    $scope.checkDefaults = function() {
      if( $scope.windows.length === 0 ) {
        _.each( defaultVariables, function(variable) {
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
      columns: 4 * 10,
      width: 4 * 100 * 10,
      colWidth: '100',
      rowHeight: '79',
      resizable: {
           enabled: false,
           handles: ['se']
      }
    };    
  }
]);