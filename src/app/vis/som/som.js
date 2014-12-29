var vis =
  angular.module('plotter.vis.som', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.notify',
    'services.som'
    ]);

mod.run(['SOMService', 'DimensionService', function(SOMService, DimensionService) {

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

    SOMService.updateVariables(defaultSOMInputs);

}]);

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

    $scope.filterInfo = [];
    $scope.$watch( function() {
      return FilterService.getCircleFilterInfo();
    }, function(val) {
      $scope.filterInfo = val;
    }, true);

    // $scope.getFilterInfo = function() {
    //   // angular.copy( FilterService.getCircleFilterInfo(), $scope.filterInfo );
    //   return $scope.filterInfo;
    //   // return JSON.stringify( FilterService.getCircleFilterInfo() );
    //   // var circle = FilterService.getSOMFilter('circle1');
    //   // var info = FilterService.getCircleFilterInfo( circle.id() );
    //   // return JSON.stringify( info.all() );
    //   // var str = '';
    //   // _.each( FilterService.getSOMFilters(), function(circle) {
    //   //   str += FilterService.getCircleFilterInfo( circle.id() );
    //   // });
    //   // return str;
    // };

    $scope.canOpenPlane = function() {
      return SOMService.somReady();
      // return DatasetFactory.somReady();
    };

    $scope.saveSettings = function(selection) {
      NotifyService.closeModal();
      if( _.isEqual( selection, $scope.savedSelection ) ) {
        // do nothing
      } else {
        $scope.savedSelection = angular.copy( $scope.currentSelection );
        SOMService.updateVariables($scope.currentSelection.x);
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


    var defaultVariables = ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc'];

    // $timeout( function() {
    //   SOMService.getSOM().then( function succFn() {
    //     _.each( defaultVariables, function(variable) {
    //       PlotService.drawSOM({ variables: { x: variable } }, bottomWindowHandler);
    //     });
    //   });
    // }, 4000);
    
  }
]);

mod.controller('SOMBottomContentController', ['$scope', '$injector', '$timeout', '$rootScope', 'bottomWindowHandler', 'DatasetFactory', 'DimensionService', 'SOMService', 'PlotService', 'NotifyService',
  function SOMBottomContentController($scope, $injector, $timeout, $rootScope, bottomWindowHandler, DatasetFactory, DimensionService, SOMService, PlotService, NotifyService) {
    $scope.windowHandler = bottomWindowHandler;
    $scope.windows = $scope.windowHandler.get();

    var defaultVariables = ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc'];

    $scope.checkDefaults = _.once( function() {
      _.each( defaultVariables, function(variable) {
        PlotService.drawSOM({ variables: { x: variable } }, bottomWindowHandler);
      });
    });

    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      var compareAndRestart = function() {
          var primary  = DimensionService.getPrimary();
          var current = $scope.windowHandler.getDimensionService();
          if( !DimensionService.equal( primary, current ) ) {
            console.log("dimension instances not equal, need to restart");
            DimensionService.restart( current, primary );
            SOMService.getSOM().then( function succFn() {
              $scope.checkDefaults();
              // $timeout(function() {
              //   $scope.windowHandler.getService().reRenderVisible({ compute: true });
              // });
            }, function errFn(msg) {
              NotifyService.addTransient('Error', msg, 'warning');
            });
          } else {
            console.log("dimension instances equal, do not restart");
          }
      };

      // don't double compute -> vis.som.* should handle
      if( toState === 'vis.som' ) { return; }

      switch(fromState.name) {
        case '':
        if( toState.name == 'vis.som.distributions' || toState.name == 'vis.som.profiles' ) {
          compareAndRestart();
        }
        break;
        
        case 'vis.explore':
        compareAndRestart();
        break;
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
      rowHeight: '79',
      resizable: {
           enabled: false,
           handles: ['se']
      }
    };    
  }
]);