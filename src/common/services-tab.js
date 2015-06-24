var mod = angular.module('services.tab', []);

mod.factory('TabService', ['$injector', '$timeout', 'constants', '$rootScope', '$state', 'WindowHandler', 'DimensionService', 'NotifyService',
  function ($injector, $timeout, constants, $rootScope, $state, WindowHandler, DimensionService, NotifyService) {

    var _service = {},
    _locked = false,
    _activeState;

    function changeDimensionService(name) {
      function updateFilterService(name) {
        var FilterService = $injector.get('FilterService');
        FilterService.tabChange(name);
      }
      var rootName,
      DatasetFactory = $injector.get('DatasetFactory');
      if( _.startsWith(name, 'vis.som') ) { rootName = 'vis.som'; }
      else {
        rootName = name;
      }
      DatasetFactory.setDimensionService( DimensionService.get(rootName) );
      updateFilterService(rootName);
    }

    // listen on tab changes
    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      console.log("tab change: ", fromState.name, " -> ", toState.name);

      changeDimensionService(toState.name);

      // som -> somewhere
      if( _.startsWith(fromState.name, 'vis.som' ) ) {

        // som -> regression
        if( _.startsWith(toState.name, 'vis.regression') ) {
          // update regression view
          checkRegressionState(toState.name);
        } 
        // som -> explore
        // else if( _.startsWith(toState.name, 'vis.explore') ) {
        //   // do nothing
        // }
      } 
      // explore -> somewhere
      else if( _.startsWith(fromState.name, 'vis.explore') ) {

        // explore -> som.*
        if( _.startsWith(toState.name, 'vis.som') ) {
          // check differences and recompute & refresh if necessary
          // checkSOMState();
        }
        // explore -> regression
        else if( _.startsWith(toState.name, 'vis.regression') ) {
          checkRegressionState(toState.name);
        }
      } 
      // regression -> somewhere
      else if( _.startsWith(fromState.name, 'vis.regression') ) {
        // regression -> som
        if( _.startsWith(toState.name, 'vis.som') ) {
          // check differences and recompute & refresh if necessary
          // checkSOMState();
        }
      }
    });

    function checkDefaultPlanes() {
      var SOMService = $injector.get('SOMService'),
      PlotService = $injector.get('PlotService'),
      defaultPlanes = SOMService.defaultPlanes(),
      planeHandler = WindowHandler.get('vis.som');

      if( planeHandler.get().length === 0 ) {
        // no planes
        _.each( defaultPlanes, function(variable) {
          PlotService.drawSOM({ variables: { x: variable } }, planeHandler);
        });
      }
    }

    function checkRegressionState(toName) {
      function sameSamples() {
        var RegressionService = $injector.get('RegressionService'),
        DimensionService = $injector.get('DimensionService'),
        primary = DimensionService.getPrimary(),
        secondary = DimensionService.getSecondary(),
        regressionCount = RegressionService.sampleCount(),
        primaryCount = primary.getSampleDimension().groupAll().get().value(),
        secondaryCount = secondary.getSampleDimension().groupAll().get().value();

        var primaryIsSame = (primaryCount == regressionCount.primary),
        secondaryIsSame = (secondaryCount == regressionCount.secondary);

        return primaryIsSame && secondaryIsSame;
      }
      if(!sameSamples()) {
        WindowHandler.get(toName).redrawAll();
      }
    }

    function checkSOMState() {
      function startSOMComputation() {
        var SOMService = $injector.get('SOMService'),
        somBottomHandler = WindowHandler.get('vis.som');

        SOMService.getSOM(somBottomHandler).then( function succFn() {
          checkDefaultPlanes();
          $timeout(function() {
            WindowHandler.reRenderVisible({ compute: true });
          });
        }, function errFn(msg) {
          WindowHandler.removeAllVisible();

          // stop plane spins
          _.each( WindowHandler.getVisible(), function(handler) {
            _.each(handler.get(), function(win) {
              if( win.type == 'somplane' ) {
                handler.stopSpin(win._winid);
              }
            });
          });              
        })
        .finally(function() {
          _.each(WindowHandler.getVisible(), function(handler) {
            _.each(handler.get(), function(win) {
              if( win.type != 'somplane' ) {
                handler.stopSpin(win._winid);
              }
            });
          });
        });        
      }
      var primary  = DimensionService.getPrimary(),
      current = DimensionService.get('vis.som');

      if( !DimensionService.equal( primary, current ) ) {
        console.log("dimension instances not equal, need to restart");
        WindowHandler.spinAllVisible();
        DimensionService.restart( current, primary ).then(function succFn(res) {
          startSOMComputation();
        });
      }      

    }

    _service.lock = function(x) {
      if(!arguments.length) { return _locked; }
      _locked = x;
      console.log("Tabs are locked = ", _locked);
      return _service;
    };

    _service.canChangeTo = function(toName) {
      var currentName = $state.current.name;
      if( _.startsWith(currentName, toName) ) {
        // click on the current tab
        return true;
      } else if( _.startsWith(toName, 'vis.som') ) {
        return currentName == 'vis.explore' ||
        currentName == 'vis.regression';
      } else if( _.startsWith(toName, 'vis.regression') ) {
        return true;
        //return _.startsWith(currentName, 'vis.som');
      } else if( _.startsWith(toName, 'vis.explore') ) {
        return _.startsWith(currentName, 'vis.som') ||
        currentName == 'vis.regression';
      }
      else {
        return true;
      }
    };

    // only get
    _service.activeState = function() {
      return $state.current;
    };
    return _service;
}]);