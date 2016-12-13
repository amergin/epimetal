angular.module('services.tab', [
  'services.notify',
  'services.variable',
  'ext.lodash'
])

.factory('TabService', function TabService(VariableService, NotifyService, DatasetFactory, SideNavService, $injector, $log, $timeout, $rootScope, $state, WindowHandler, DimensionService, _) {

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
    if (_.startsWith(name, 'vis.som')) {
      rootName = 'vis.som';
    } else {
      rootName = name;
    }
    DatasetFactory.setDimensionService(DimensionService.get(rootName));
    updateFilterService(rootName);
  }

  $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {

    if (fromState.name == 'vis.explore') {
      // exit from explore resets all current filters
      $injector.get('FilterService').resetFilters({
        spareSOM: true
      });
    }

  });

  // called on tab transition, checks whether some windows are
  // invalid and should now be removed
  function checkActiveWindows() {
    function removeInactiveSeparatedHeatmaps() {
      var win = null,
      isSeparated = false,
      isHeatmap = false,
      isSameDataset = false,
      winsToBeRemoved = [];
      _.each(DatasetFactory.getSets(), function(set, name) {
        if(set.active()) {
          return;
        }

        _.each(WindowHandler.getVisible(), function(handler) {
          _.each(handler.get(), function(w) {
            win = w.object;
            isHeatmap = win.figure() == 'pl-heatmap';
            isSeparated = win.extra().separate === true;
            isSameDataset = win.extra().dataset == set;

            if(isHeatmap && isSeparated && isSameDataset) {
              winsToBeRemoved.push(win);
            }
          });
        });
      });

      _.each(winsToBeRemoved, function(win) {
        win.remove();
      });
    }


    removeInactiveSeparatedHeatmaps();
  }

  // listen on tab changes
  $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
    console.log("tab change: ", fromState.name, " -> ", toState.name);

    changeDimensionService(toState.name);

    if (toState.name == 'vis.som') {
      checkSOMState({
        tabChanged: true
      });
    } else if (toState.name == 'vis.regression') {
      checkRegressionState();
    } else if(toState.name == 'vis.explore') {
      WindowHandler.get('vis.explore').rerenderAll();
    }

    checkActiveWindows();

  });

  function checkDefaultPlanes() {
    var SOMService = $injector.get('SOMService'),
      PlotService = $injector.get('PlotService'),
      planeHandler = WindowHandler.get('vis.som');

      SOMService.defaultPlanes().then(function succFn(defaultPlanes) {
        VariableService.getVariables(defaultPlanes).then(function(planeVars) {
          if (planeHandler.get().length === 0) {
            // no planes
            _.each(planeVars, function(variable) {
              PlotService.drawSOM({
                variable: variable
              }, planeHandler);
            });
          }
        });
      }, function errFn(res) {
        $log.debug("Failed to fetch default planes.");
      });
  }

  _service.check = function(cfg) {
    var stateName = $state.current.name;

    if (stateName == 'vis.som') {
      checkSOMState(cfg);
    } else if (stateName == 'vis.regression') {
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
    if (cfg && cfg.origin && cfg.origin == 'dataset') {
      return;
    }
    if (!sameSamples()) {
      WindowHandler.get('vis.regression').redrawAll();
    }
  }

  function checkSOMState(cfg) {
    function hasExisting() {
      return SOMService.hasExisting();
    }

    function hasChanged() {
      var primaryDim = DimensionService.getPrimary(),
      currentDim = DimensionService.get('vis.som');

      var equalSamples = DimensionService.equal(primaryDim, currentDim);
      return !equalSamples;
    }

    function originatedFromTabChange() {
      return cfg.tabChanged === true;
    }

    function doDialog() {
      var diagScope = $rootScope.$new(true);

      diagScope.config = {
        title: 'Do you want to recompute the Self-Organizing Map?',
        template: 'vis/menucomponents/new.som.action.tpl.html',
        actions: {
          submit: 'Recompute',
          cancel: 'Cancel'
        }
      };

      var promise = NotifyService.addClosableModal(
        'vis/menucomponents/new.modal.tpl.html', 
        diagScope, 
        { 
          controller: 'ModalCtrl',
          windowClass: 'modal-normal',
          placement: 'top'          
        });

      return promise;
    }

    var SOMService = $injector.get('SOMService');

    if(hasExisting()) {
      // has existing computation in place, but is there a change?
      $log.debug("Existing SOM found, but is there a change?");

      if(hasChanged()) {
        $log.debug("...There is a change.");
        if(originatedFromTabChange()) {
          $log.debug("...Originated from tab change & there's a change, ask the user.");
          var dialogPromise = doDialog();

          dialogPromise.then(function succFn(result) {
            $log.debug("...User said yes");
            _service.doComputeSOM();
          }, function errFn() {
            $log.debug("...User said no.");
          });
        } else {
          $log.debug("...Originated from user actions, show button.");
          SideNavService.somRefreshButton(true);
        }
      } else {
        // do check if state has been loaded but no default windows exist
        checkDefaultPlanes();

        $log.debug("...There is NO change, do nothing.");
        SideNavService.somRefreshButton(false);
      }
    } else {
      $log.debug("No existing SOM computations -> start comp without asking.");
      checkDefaultPlanes();
      _service.doComputeSOM();
    }
  }

  // wrapper function that does the necessary logic prior to SOM computation
  _service.doComputeSOM = function(callback) {
    function startComputation() {
      var SOMService = $injector.get('SOMService'),
      somPlaneHandler = WindowHandler.get('vis.som');

      // WindowHandler.spinAllVisible();
      SOMService.getSOM(somPlaneHandler).then(function succFn() {
          checkDefaultPlanes();
          $timeout(function() {
            WindowHandler.reRenderVisible({
              compute: true
            });
          });
          if(callback) { callback(); }
        }, function errFn(msg) {
          function stopPlaneSpins() {
            _.each(WindowHandler.getVisible(), function(handler) {
              _.each(handler.get(), function(win) {
                if (win.object.figure() == 'pl-somplane') {
                  win.object.spin(false);
                }
              });
            });
          }
          WindowHandler.removeAllVisible();
          stopPlaneSpins();
        })
        .finally(function() {
          WindowHandler.stopAllSpins();
        });
    }

    $log.debug("SOM compute is called");
    WindowHandler.spinAllVisible();
    var primaryDim = DimensionService.getPrimary(),
    currentDim = DimensionService.get('vis.som');

    DimensionService.restart(currentDim, primaryDim)
    .then(function succFn(res) {
      startComputation();
    });
  };

  _service.needSOMRestart = function() {
    var primary = DimensionService.getPrimary(),
      current = DimensionService.get('vis.som'),
      cancelled = $injector.get('SOMService').cancelled();

    return !DimensionService.equal(primary, current) || cancelled;
  };

  _service.lock = function(x) {
    if (!arguments.length) {
      return _locked;
    }
    _locked = x;
    console.log("Tabs are locked = ", _locked);
    return _service;
  };

  _service.canChangeTo = function(toName) {
    var currentName = $state.current.name;
    if (_.startsWith(currentName, toName)) {
      // click on the current tab
      return true;
    } else if (_.startsWith(toName, 'vis.som')) {
      return currentName == 'vis.explore' ||
        currentName == 'vis.regression';
    } else if (_.startsWith(toName, 'vis.regression')) {
      return true;
      //return _.startsWith(currentName, 'vis.som');
    } else if (_.startsWith(toName, 'vis.explore')) {
      return _.startsWith(currentName, 'vis.som') ||
        currentName == 'vis.regression';
    } else {
      return true;
    }
  };

  // only get
  _service.activeState = function() {
    return $state.current;
  };
  return _service;

});