angular.module('services.tab', [])

.factory('TabService', ['$injector', '$timeout', 'constants', '$rootScope', '$state', 'WindowHandler', 'DimensionService', 'NotifyService',
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

    $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){

      if(fromState.name == 'vis.explore') {
        // exit from explore resets all current filters
        $injector.get('FilterService').resetFilters({ spareSOM: true });
      }

    });

    // listen on tab changes
    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      console.log("tab change: ", fromState.name, " -> ", toState.name);

      changeDimensionService(toState.name);

      if(toState.name == 'vis.som') {
        checkSOMState();
      }
      else if(toState.name == 'vis.regression') {
        checkRegressionState();
      }

    });

    function checkDefaultPlanes() {
      var SOMService = $injector.get('SOMService'),
      PlotService = $injector.get('PlotService'),
      defaultPlanes = SOMService.defaultPlanes(),
      planeHandler = WindowHandler.get('vis.som.plane');

      if( planeHandler.get().length === 0 ) {
        // no planes
        _.each( defaultPlanes, function(variable) {
          PlotService.drawSOM({ variables: { x: variable } }, planeHandler);
        });
      }
    }

    _service.check = function(cfg) {
      var stateName = $state.current.name;

      if(stateName == 'vis.som') {
        checkSOMState(cfg);
      } else if(stateName == 'vis.regression') {
        checkRegressionState(cfg);
      }
    };

    function checkRegressionState(cfg) {
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
        WindowHandler.get('vis.regression').redrawAll();
      }
    }

    function checkSOMState(cfg) {
      function startSOMComputation() {
        var SOMService = $injector.get('SOMService'),
        somPlaneHandler = WindowHandler.get('vis.som.plane');

        WindowHandler.spinAllVisible();
        SOMService.getSOM(somPlaneHandler).then( function succFn() {
          checkDefaultPlanes();
          $timeout(function() {
            WindowHandler.reRenderVisible({ compute: true });
          });
        }, function errFn(msg) {
          WindowHandler.removeAllVisible();

          // stop plane spins
          _.each( WindowHandler.getVisible(), function(handler) {
            _.each(handler.get(), function(win) {
              if(win.object.figure() == 'pl-somplane') {
                win.object.spin(false);
              }
            });
          });              
        })
        .finally(function() {
          WindowHandler.stopAllSpins();
        });        
      }

      function restart() {
        console.log("dimension instances not equal, need to restart");
        WindowHandler.spinAllVisible();
        DimensionService.restart( current, primary ).then(function succFn(res) {
          startSOMComputation();
        });
      }


      var primary  = DimensionService.getPrimary(),
      current = DimensionService.get('vis.som'),
      forced = !_.isUndefined(cfg) && _.isEqual(cfg.force, true),
      notForced = !_.isUndefined(cfg) && _.isEqual(cfg.force, false);

      if(forced) {
        restart();
      } else if(notForced) {
        return;
      } else if( !DimensionService.equal( primary, current ) ) {
        // when tab change triggered
        restart();
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