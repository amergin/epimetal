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
  NotifyService, SOMService, DimensionService, PlotService, plSidenav, API_URL_STATE, _) {

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
      .datasets(DatasetFactory.getSets())
      .activeView(TabService.activeState().name)
      .customVariables(_.map(VariableService.getCustomVariables(), function(cv) {
        return cv.get();
      }))
      .sideMenu(plSidenav.get());
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
        .windowHandlers([
          WindowHandler.get('vis.som.content'),
          WindowHandler.get('vis.som.plane')
        ])
        .filters(FilterService.getSOMFilters())
        .selection(SOMService.trainVariables())
        .size({
          rows: SOMService.rows(),
          columns: SOMService.columns()
        })
        .somId(SOMService.somId());
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

    var sendObject = {
      common: getCommonState(),
      browsing: getBrowsingStates()
    };

    $log.info("Sending URL object: ", sendObject);

    var defer = $q.defer();
    $http.post(API_URL_STATE, sendObject)
    .success(function(response) {
      $log.debug('Sending state obj succeeded, got back: ', response.result);
      defer.resolve(response.result);
    })
    .error(function(response) {
      $log.error('Sending state obj FAILED, got back: ', response);
      defer.reject(response);
    });
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

        plSidenav.load(state.sideMenu());

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

      // fetches all data of variables belonging to primary dimension
      // service.
      function fetchPrimaryDimensionVars(browsing, common) {
        var vars = [],
        defer = $q.defer(),
        primaryHandler = null;
        flattenedVars = [];
        _.each(browsing, function(browse) {
          _.each(browse.windowHandlers(), function(handler) {
            var isPrimary = $injector.get('WindowHandler').getPrimary() == handler;
            if(isPrimary) {
              primaryHandler = handler;
              var windows = handler.get(),
              variables = _.map(windows, function(w) { return w.object.variables(); });
              vars = vars.concat(variables);
            }
          });
        });

        flattenedVars = 
          _.chain(vars)
          .map(function(v) {
            if(!_.has(v, 'type')) {
              return _.values(v);
            } else {
              return v;
            }
          })
          .flatten()
          .value();

        DatasetFactory.getVariableData(flattenedVars, primaryHandler, { getRawData: true }).then(function succFn() {
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
              FilterService.createCircleFilter(filter);
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

      function initSOM(browse) {
        SOMService.rows(browse.size().rows);
        SOMService.columns(browse.size().columns);
        SOMService.somId(browse.somId());
        // _.each(browse.filters(), function(filter) {
        //   FilterService.createCircleFilter(filter);
        // });
      }

      // function loadVariables(stateObj) {
      //   function addSOMTestVariables(stateObj, fetchVariables) {
      //     var testVars = stateObj.som.testVars;
      //     return _.union(fetchVariables, testVars);
      //   }

      //   var defer = $q.defer(),
      //     promises = [];

      //   var fetches = _.chain(stateObj.views)
      //     .groupBy(function(view) {
      //       return WindowHandler.get(view.name).getDimensionService().getName();
      //     })
      //     .map(function(views, somServiceName) {
      //       var handler,
      //         fetchVariables = _.chain(views)
      //         .map(function(v) {
      //           return v.figures;
      //         })
      //         .flatten()
      //         .map(function(fig) {
      //           handler = fig.handler;
      //           var isRegression = (fig.type == 'regression-plot');
      //           if (isRegression) {
      //             return fig.computation.input;
      //           } else {
      //             return fig.variables;
      //           }
      //         })
      //         .map(function(d) {
      //           return _.chain(d)
      //             .pick('x', 'y', 'adjust', 'association', 'target')
      //             .values()
      //             .value();
      //         })
      //         .flattenDeep()
      //         .value();

      //       var handlerInstance = WindowHandler.get(handler);

      //       if (SOMService.getDimensionService() == handlerInstance.getDimensionService()) {
      //         // add SOM test variables to be fetched, too
      //         fetchVariables = addSOMTestVariables(stateObj, fetchVariables);

      //       }

      //       return {
      //         handler: handlerInstance,
      //         variables: fetchVariables,
      //         service: DimensionService.get(somServiceName)
      //       };
      //     })
      //     .value();

      //   _.each(fetches, function(obj) {
      //     promises.push(DatasetFactory.getVariableData(obj.variables, obj.handler));
      //   });

      //   $q.all(promises).then(function succFn(res) {
      //     defer.resolve();
      //   }, function errFn(res) {
      //     defer.reject();
      //   });
      //   return defer.promise;
      // }

      // function addFigures(stateObj) {
      //   function addView(view, promises) {
      //     _.each(view.figures, function(figure) {
      //       var handler = WindowHandler.get(figure.handler),
      //         config = _.omit(figure, 'handler');

      //       if (config.type == 'regression-plot' || config.type == 'somplane') {
      //         handler.add(config);
      //       } else {
      //         promises.push(PlotService.draw(config.type, config, handler));
      //       }
      //     });
      //   }

      //   var promises = [],
      //     deferred = $q.defer();

      //   _.chain(stateObj.views)
      //     .sortBy(function(view) {
      //       // load the states in the order described below
      //       var sortNum = {
      //         'vis.explore': 0,
      //         'vis.som': 10,
      //         'vis.som.profiles': 11,
      //         'vis.som.distributions': 12,
      //         'vis.regression': 20
      //       };
      //       return sortNum[view.name];
      //     })
      //     .each(function(view) {
      //       addView(view, promises);
      //     })
      //     .value();

      //   $q.all(promises).then(function succFn() {
      //     deferred.resolve();
      //   }, function errFn() {
      //     deferred.reject();
      //   });

      //   return deferred.promise;
      // }

      // function selectDatasets(dsets) {
      //   try {
      //     var setObjs = DatasetFactory.getSets();
      //     _.each(dsets, function(set) {
      //       setObjs[set].enable();
      //     });
      //     DatasetFactory.updateDataset();
      //   } catch (e) {
      //     throw new Error('Unknown dataset name');
      //   }
      // }

      // function loadSOM(stateObj) {
      //   function positionCircles(circles) {
      //     try {
      //       _.each(circles, function(circle) {
      //         var filter = FilterService.getSOMFilter(circle.id);
      //         if (circle.position && circle.radius) {
      //           filter.position(circle.position).radius(circle.radius);
      //         }
      //       });
      //     } catch (e) {
      //       throw new Error('Invalid SOM filters');
      //     }
      //   }

      //   function addBMUs(bmus) {
      //     try {
      //       if (!bmus || bmus.length === 0) {
      //         return;
      //       }
      //       SOMService.bmus(bmus);
      //       DimensionService.get('vis.som').addBMUs(bmus);
      //     } catch (e) {
      //       throw new Error('Invalid bmu samples');
      //     }
      //   }

      //   function addTestVars(vars) {
      //     try {
      //       var somBottomHandler = WindowHandler.get('vis.som');
      //       SOMService.updateVariables(vars, somBottomHandler);
      //     } catch (e) {
      //       throw new Error('Invalid SOM test vars');
      //     }
      //   }
      //   positionCircles(stateObj.som.filters);
      //   addBMUs(stateObj.som.bmus);
      //   addTestVars(stateObj.som.testVars);
      // }

      // function loadRegression(stateObj) {
      //   try {
      //     var RegressionService = $injector.get('RegressionService');
      //     RegressionService.selectedVariables(stateObj.regression.selected);
      //   } catch (e) {
      //     throw new Error('Invalid Regression info');
      //   }
      // }

      var defer = $q.defer();

      getState(hash).then(function succFn(stateObj) {
        // ensure variables have been loaded
        VariableService.getVariables().then(function succFn() {
          // try {
            // init common
            var common = loadCommon(stateObj.common),
            // init browsing states
            browsing = loadBrowsing(stateObj.browsing);

            fetchPrimaryDimensionVars(browsing, common).then(function succFn() {
              activateFilters(browsing);
              makeSelections(browsing);
              initSOM(_.find(browsing, function(br) { return br.type() == 'som'; }) );
              defer.resolve();
            }, function errFn() {
              defer.reject();
            });
        }, function errFn() {
          defer.reject();
        });

        // selectDatasets(stateObj.datasets);
        // loadSOM(stateObj);
        // loadRegression(stateObj);
        // loadVariables(stateObj).then(function succFn() {
        //   $timeout(function() {
        //     addFigures(stateObj).then(function succFn() {
        //       defer.resolve();
        //     }, function errFn() {
        //       defer.reject();
        //     });
        //   });

        // }, function errFn() {
        //   defer.reject();
        // });

      }, function errFn(result) {
        defer.reject();
      });

      return defer.promise;
    }; // loadFromState

    function loadDefaultView() {
      var drawExplore = function(defer) {
        var exploreHandler = WindowHandler.get('vis.explore'),
          defaultHistograms = $injector.get('EXPLORE_DEFAULT_HISTOGRAMS');

        VariableService.getVariables(defaultHistograms).then(function(variables) {
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
        FilterService.createCircleFilter('A');
        FilterService.createCircleFilter('B');
      }

      var defer = $q.defer();

      selectDatasets();
      drawExplore(defer);
      createSOMFilters();

      return defer.promise;
    }

    function removeHash() {
      // remove the state hash from url
      $state.params['state'] = undefined;
      $location.search('state', undefined);
      $location.url($location.path());
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