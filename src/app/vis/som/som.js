var vis =
  angular.module('plotter.vis.som', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.notify',
    'ui.layout'
    // 'services.window',
    // 'services.dimensions', 
    // 'localytics.directives',
    // 'services.urlhandler'
    ]);

mod.controller('SOMBottomMenuController', ['$scope', '$templateCache', '$rootScope', 'NotifyService', 'variables', 'DatasetFactory', 'PlotService', 'bottomWindowHandler', '$timeout',
  function SOMBottomMenuController($scope, $templateCache, $rootScope, NotifyService, variables, DatasetFactory, PlotService, bottomWindowHandler, $timeout) {
    $scope.windowHandler = bottomWindowHandler;

    $scope.variables = variables;
    $scope.currentSelection = {};
    $scope.savedSelection = { x: [
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
      ] };
    $scope.planeInput = {};

    $scope.openSettings = function() {
      $scope.currentSelection = angular.copy( $scope.savedSelection );
      var promise = NotifyService.addClosableModal( 'vis/menucomponents/som.tpl.html', $scope );
      promise.then( function(res) {
        $scope.currentSelection = {};
      });
    };

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.clear = function() {
      $scope.currentSelection.x = [];
    };

    $scope.canSubmitSOM = function () {
      return $scope.canEdit() && !_.isEmpty($scope.currentSelection.x) && ($scope.currentSelection.x.length >= 3);
    };

    $scope.canOpenPlane = function() {
      return DatasetFactory.somReady();
    };

    $scope.saveSettings = function(selection) {
      NotifyService.closeModal();
      if( _.isEqual( selection, $scope.savedSelection ) ) {
        // do nothing
      } else {
        $scope.savedSelection = angular.copy( $scope.currentSelection );
        DatasetFactory.updateSOMVariables($scope.currentSelection.x);
      }
      $scope.currentSelection = {};
    };

    $scope.canSubmitPlane = function(plane) {
      return !_.isUndefined($scope.planeInput);
    };

    $scope.addPlane = function(testVar) {
      NotifyService.addTransient('Starting plane computation', 'The computation may take a while.', 'success');

      $scope.planeInput = {};

      PlotService.drawSOM({ variables: { x: testVar } }, $scope.windowHandler);
    };

    $scope.addFilter = function() {
      $rootScope.$emit('som:addFilter', 
        _.uniqueId('circle'), 
        { m: _.random(1,6), n: _.random(1,8) });
    };

    $timeout( function() {
      PlotService.drawSOM({ variables: { x: 'Serum-C' } }, $scope.windowHandler);
      PlotService.drawSOM({ variables: { x: 'Serum-TG' } }, $scope.windowHandler);
      PlotService.drawSOM({ variables: { x: 'HDL-C' } }, $scope.windowHandler);
      PlotService.drawSOM({ variables: { x: 'LDL-C' } }, $scope.windowHandler);
      PlotService.drawSOM({ variables: { x: 'Glc' } }, $scope.windowHandler);
    }, 5000);
  }
]);

mod.controller('SOMBottomContentController', ['$scope', '$templateCache', '$rootScope', 'bottomWindowHandler', 'DatasetFactory',
  function SOMBottomContentController($scope, $templateCache, $rootScope, bottomWindowHandler, DatasetFactory) {
    $scope.windowHandler = bottomWindowHandler;
    $scope.windows = $scope.windowHandler.get();

    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      if( toState.name == 'vis.som.distributions' || toState.name == 'vis.som.profiles' ) {
        // refresh SOM computation
        DatasetFactory.computeSOM();
      }
    });

    $scope.itemMapper = {
        sizeX: 'window.size.x', 
        sizeY: 'window.size.y',
        row: 'window.position.row',
        col: 'window.position.col'
    };

    $scope.gridOptions = {
      pushing: true,
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
      columns: 4 * 10,
      width: 4 * 100 * 10,
      colWidth: '100',
      rowHeight: '88',
      resizable: {
           enabled: false,
           handles: ['se']
      }
    };    
  }
]);