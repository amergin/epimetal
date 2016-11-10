angular.module('services.urlhandler', [
  'services.dataset',
  'services.variable',
  'plotter.vis.menucomponents.sidenav',
  'ui.router',
  'ext.lodash'
])

.constant('API_URL_STATE', '/API/state')

.factory('UrlHandler', function UrlHandler($injector, $timeout, $location, $rootScope, $state, $q, $http, $log,
  DatasetFactory, VariableService, WindowHandler, RegressionService, FilterService, TabService,
  NotifyService, SOMService, DimensionService, PlotService, SideNavService, API_URL_STATE, _) {

  var _service = {},
    _loaded = false; // only do state loading once per page load

  _service.loaded = function() {
    return _loaded;
  };

  // gathers the current state of the application. Sends it to the DB
  // and returns the resulting details or yields error where applicable.
  _service.create = function() {
    function getCommonState() {
      var state = new PlCommonBrowsingState()
      .injector($injector)
      .datasets(DatasetFactory.getSets())
      .activeView(TabService.activeState().name)
      .customVariables(_.map(VariableService.getCustomVariables(), function(cv) {
        return cv.get();
      }))
      .sideMenu(SideNavService.get());
      return state.get();
    }

    function getBrowsingStates() {
      function regression() {
        var state = new PlRegressionBrowsingState()
        .windowHandlers([WindowHandler.get('vis.regression')])
        .filters(null)
        .selection(RegressionService.selectedVariables());
        return state;
      }

      function som() {
        var state = new PlSOMBrowsingState()
        .injector($injector)
        .windowHandlers([
          WindowHandler.get('vis.som'),
        ])
        .filters(FilterService.getSOMFilters())
        .selection(SOMService.trainVariables())
        .size({
          rows: SOMService.rows(),
          columns: SOMService.columns()
        })
        .som({
          id: SOMService.somId()
          // hashId will be appended by the db
        });
        return state;
      }

      function explore() {
        var filters = _.reject(FilterService.getFilters(), function(filter) {
          return filter.type() == 'circle';
        }),
        state = new PlExploreBrowsingState()
        .windowHandlers([WindowHandler.getPrimary()])
        .filters(filters);
        return state;
      }

      // get states:
      var states = [
        explore().get(),
        som().get(),
        regression().get()
      ];
      return states;
    }

    function doStart() {
      var sendObject = {
        common: getCommonState(),
        browsing: getBrowsingStates()
      };

      $log.info("Sending URL object: ", sendObject);
      $http.post(API_URL_STATE, sendObject)
      .success(function(response) {
        $log.debug('Sending state obj succeeded, got back: ', response.result);
        defer.resolve(response.result);
      })
      .error(function(response) {
        $log.error('Sending state obj FAILED, got back: ', response);
        defer.reject(response);
      });      
    }

    var defer = $q.defer();

    if(TabService.needSOMRestart()) {
      var primary = DimensionService.getPrimary(),
      current = DimensionService.get('vis.som');

      DimensionService.restart(current, primary).then(function succFn(res) {
        SOMService.getSOM( WindowHandler.get('vis.som') ).then(function succFn() {
          doStart();
        });
      });
    } else {
      doStart();
    }

    return defer.promise;
  };

  _service.load = function(urlHash) {
    var loadFromState = function(hash) {
      var getState = function(hash) {
        var defer = $q.defer();
        $http.get(API_URL_STATE + "/" + hash)
          .success(function(response) {
            $log.debug("Loading URL state from object: ", response.result);
            defer.resolve(response.result);
          })
          .error(function(response) {
            defer.reject(response);
          });
        return defer.promise;
      };

      function loadCommon(common) {
        var state = new PlCommonBrowsingState()
        .injector($injector)
        .load(common);

        SideNavService.load(state.sideMenu());

        return state;
      }

      function loadBrowsing(browsing) {
        return _.map(browsing, function(browse) {
          var state;
          if(browse.type == 'explore') {
            state = new PlExploreBrowsingState()
            .injector($injector)
            .load(browse);
          } 
          else if(browse.type == 'som') {
            state = new PlSOMBrowsingState()
            .injector($injector)            
            .load(browse);
          } 
          else if(browse.type == 'regression') {
            state = new PlRegressionBrowsingState()
            .injector($injector)
            .load(browse);           
          } 
          else {
            throw new Error('Unknown browsing type');
          }
          return state;
        });
      }

      // fetches all data of variables belonging to primary and secondary
      // dimension services.
      function fetchDimensionVars(browsing, common) {
        function flattenVars(vars) {
          return _.chain(vars)
          .map(function(v) {
            if(!_.has(v, 'type')) {
              return _.values(v);
            } else {
              return v;
            }
          })
          .flatten(true)
          .value();          
        }

        var primaryVars = [],
        secondaryVars = [],
        defer = $q.defer(),
        primaryHandler = null,
        secondaryHandler = null;

        _.each(browsing, function(browse) {
          _.each(browse.windowHandlers(), function(handler) {
            var isPrimary = $injector.get('DimensionService').getPrimary() == handler.getDimensionService(),
            isSecondary = $injector.get('DimensionService').getSecondary() == handler.getDimensionService(),
            windows = handler.get();
            if(isPrimary) {
              primaryHandler = handler;
              variables = _.map(windows, function(w) { return w.object.variables(); });
              primaryVars = primaryVars.concat(variables);
            } else if(isSecondary) {
              secondaryHandler = handler;
              variables = _.map(windows, function(w) { return w.object.variables(); });
              secondaryVars = secondaryVars.concat(variables);
            }
          });
        });

        var primaryPromise = DatasetFactory.getVariableData(flattenVars(primaryVars), primaryHandler, { getRawData: true }),
        secondaryPromise = DatasetFactory.getVariableData(flattenVars(secondaryVars), secondaryHandler, { getRawData: true });

        $q.all([primaryPromise, secondaryPromise]).then(function succFn() {
          defer.resolve();
        }, function errFn() {
          defer.reject();
        });

        return defer.promise;
      }

      function activateFilters(browsing) {
        var promises = [];
        _.each(browsing, function(browse) {
          _.each(browse.filters(), function(filter) {
            // add the filter to service and later each figure checks upon init
            // if such filter has been applied to its window
            if(filter.type() == 'circle') {
              FilterService.createCircleFilter({ filter: filter });
            } else {
              FilterService.addFilter(filter);
            }
          });
        });
      }

      function makeSelections(browsing) {
        _.each(browsing, function(browse) {
          if(browse.type() == 'regression') {
            RegressionService.selectedVariables(browse.selection());
          }
          else if(browse.type() == 'som') {
            SOMService.trainVariables(browse.selection());
          }
        });
      }

      function initSOM(browse, callback) {
        SOMService.rows(browse.size().rows);
        SOMService.columns(browse.size().columns);
        // SOM object can be empty as well, which is valid
        if(!browse.som().hashId) {
          SOMService.getSOM( WindowHandler.get('vis.som') )
          .then(function succFn() {
            if(callback) { callback(); }
          });
        } else {
          SOMService.getSOM( WindowHandler.get('vis.som'), browse.som().hashId )
          .then(function succFn() {
            if(callback) { callback(); }
          });
        }
      }

      var defer = $q.defer();

      getState(hash).then(function succFn(stateObj) {
        // ensure variables have been loaded
        VariableService.getVariables().then(function succFn() {
          // try {
            // init common
            var common = loadCommon(stateObj.common),
            // init browsing states
            browsing = loadBrowsing(stateObj.browsing);

            fetchDimensionVars(browsing, common).then(function succFn() {
              activateFilters(browsing);
              makeSelections(browsing);
              initSOM(_.find(browsing, function(br) { return br.type() == 'som'; }),
              function callback() {
                defer.resolve();
              });
            }, function errFn() {
              defer.reject();
            });
        }, function errFn() {
          defer.reject();
        });

      }, function errFn(result) {
        defer.reject();
      });

      return defer.promise;
    }; // loadFromState

    function loadDefaultView() {
      var drawExplore = function(defer) {
        var exploreHandler = WindowHandler.get('vis.explore');

        VariableService.getExploreDefaultHistograms().then(function(variables) {
          DatasetFactory.getVariableData(variables, exploreHandler, { getRawData: true })
            .then(function succFn(res) {
              _.each(variables, function(variable) {
                PlotService.drawHistogram({
                  pooled: undefined,
                  variable: variable
                }, exploreHandler);
              });
              defer.resolve();
            }, function errFn(res) {
              defer.reject();
            });
        });

      };

      var selectDatasets = function() {
        _.each(DatasetFactory.getSets(), function(set) {
          set.active(true);
        });
        DatasetFactory.updateDataset();
      };

      function createSOMFilters() {
        FilterService.createCircleFilter({ name: 'A' });
        FilterService.createCircleFilter({ name: 'B' });
      }

      var defer = $q.defer();

      selectDatasets();
      drawExplore(defer);
      createSOMFilters();

      return defer.promise;
    }

    function removeHash() {
      // remove the state hash from url and replace
      // the previous history state with the one without the 'state' parameter
      // to eliminate back button browsing to it
      $state.go($state.current.name, { 'state': undefined }, { 'location': 'replace' });
    }

    var defer = $q.defer();

    if (_loaded) {
      $timeout(function() {
        console.log("url state already loaded, do nothing.");
        defer.resolve({
          result: 'redundant'
        });
      });
    }
    // load default view
    else if (_.isUndefined(urlHash)) {
      loadDefaultView().then(function succFn() {
          console.log("default view loaded successfully");
          defer.resolve({
            result: 'default_success'
          });
        }, function errFn() {
          NotifyService.addSticky('Error', 'Loading the default figures failed.', 'error');
          defer.resolve({
            result: 'default_failed'
          });
        })
        .finally(function() {
          _loaded = true;
        });
    } else {
      // load from hash id
      loadFromState(urlHash).then(function succFn() {
          $log.info("url state ", urlHash, "loaded");
          defer.resolve({
            result: 'hash_success'
          });
        }, function errFn() {
          NotifyService.addSticky('Error',
            'Loading the state from the provided URL failed. Please check the link you followed.',
            'error');
          loadDefaultView().then(function succFn() {
            console.log("default view loaded successfully");
            defer.resolve({
              result: 'default_success'
            });
          }, function errFn() {
            NotifyService.addSticky('Error', 'Loading the default figures failed.', 'error');
            defer.resolve({
              result: 'default_failed'
            });
          });
        })
        .finally(function() {
          NotifyService.disabled(false);
          $timeout(function() {
            removeHash();
          });
          _loaded = true;
        });
    }

    return defer.promise;
  }; // load

  return _service;

});