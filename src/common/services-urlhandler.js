var mod = angular.module('services.urlhandler', ['services.dataset', 'ui.router']);

mod.constant('API_URL_STATE', '/API/state');

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
mod.factory('UrlHandler', ['$injector', '$timeout', '$location', 'DatasetFactory', 'DimensionService', '$rootScope', '$state', 'SOMService', 'API_URL_STATE', '$q', '$http',
  function($injector, $timeout, $location, DatasetFactory, DimensionService, $rootScope, $state, SOMService, API_URL_STATE, $q, $http) {

    var _service = {},
    _loaded = false; // only do state loading once per page load

    // gathers the current state of the application
    _service.create = function() {
      // emits an event that provides a callback for each figure/component
      // to present its current state on this service
      var windows = [];
      function emitGather() {
        var callback = function(win) {
          windows.push(win);
        };
        $rootScope.$emit('UrlHandler:getState', callback);
      }

      function getDBFormat() {
        var groupedByHandler = _.chain(windows)
        .map(function(win) {
          // handler object to its name so the object is serializable later
          return _.assign(win, { handler: win.handler.getName() });
        })
        .groupBy('handler')
        .map(function(windows, key) {
          return { name: key, figures: windows }; 
        })
        .value();

        var activeSets = _.chain( DatasetFactory.getSets() )
        .values()
        .filter(function(set) { return set.isActive(); })
        .map(function(set) { return set.getName(); })
        .value();

        var FilterService = $injector.get('FilterService');

        function getSOMFilters() {
          return _.map(FilterService.getSOMFilters(), function(filter) {
            return { radius: filter.radius(), position: filter.position(), id: filter.id() };
          });
        }

        return {
          activeState: $state.current.name,
          views: groupedByHandler,
          datasets: activeSets,
          som: {
            size: SOMService.planeSize(),
            bmus: SOMService.getBMUs(),
            testVars: SOMService.getVariables(),
            filters: getSOMFilters()
          },
          sampleCount: DimensionService.getPrimary().getSampleInfo().active
        };
      }

      emitGather();
      var postData = getDBFormat();

      var defer = $q.defer();
      $http.post(API_URL_STATE, postData)
      .success(function(response) {
        defer.resolve(response.result);
      })
      .error(function(response) {
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
            defer.resolve(response.result);
          })
          .error(function(response) {
            defer.reject(response);
          });
          return defer.promise;
        };

        function addFigures(stateObj) {
          function addView(view, promises) {
            _.each(view.figures, function(figure) {
              var handler = WindowHandler.get(figure.handler),
              config = _.omit(figure, 'handler');

              if(config.type == 'regression-plot' || config.type == 'somplane') {
                handler.add(config);
              } else {
                promises.push(PlotService.draw(config.type, config, handler));
              }
            }); 
          }

          var promises = [],
          deferred = $q.defer();

          _.chain(stateObj.views)
          .sortBy(function(view) {
            // load the states in the order described below
            var sortNum = {
              'vis.explore': 0,
              'vis.som': 10,
              'vis.som.profiles': 11,
              'vis.som.distributions': 12,
              'vis.regression': 20
            };
            return sortNum[view.name];
          })
          .each(function(view) {
            addView(view, promises);
          })
          .value();

          $q.all(promises).then(function succFn() {
            deferred.resolve();
          }, function errFn() {
            deferred.reject();
          });

          return deferred.promise;
        }

        function selectDatasets(dsets) {
          try {
            var setObjs = DatasetFactory.getSets();
            _.each(dsets, function(set) {
              setObjs[set].enable();
            });
            DatasetFactory.updateDataset();
          } catch(e) {
            throw new Error('Unknown dataset name');
          }
        }

        function loadSOM(stateObj) {
          function positionCircles(circles) {
            try {
              _.each(circles, function(circle) {
                var filter = FilterService.getSOMFilter(circle.id);
                filter.position(circle.position).radius(circle.radius);
              });
            } catch(e) {
              throw new Error('Invalid SOM filters');
            }
          }

          function addBMUs(bmus) {
            try {
              if(!bmus || bmus.length === 0 ) { return; }
              DimensionService.get('vis.som').addBMUs(bmus);
            } catch(e) {
              throw new Error('Invalid bmu samples');
            }
          }

          function addTestVars(vars) {
            try {
              var somBottomHandler = WindowHandler.get('vis.som');
              SOMService.updateVariables(vars, somBottomHandler);
            } catch(e) {
              throw new Error('Invalid SOM test vars');
            }
          }
          positionCircles(stateObj.som.filters);
          addBMUs(stateObj.som.bmus);
          addTestVars(stateObj.som.testVars);
        }

        var defer = $q.defer();

        getState(hash).then(function succFn(stateObj) {
          selectDatasets(stateObj.datasets);
          loadSOM(stateObj);
          addFigures(stateObj).then(function succFn() {
            defer.resolve();
          }, function errFn() {
            defer.reject();
          });
          defer.resolve();
        }, function errFn(result) {
          defer.reject();
        });

        return defer.promise;
      }; // loadFromState

      function loadDefaultView() {
        var drawExplore = function(defer) {
          var exploreHandler = WindowHandler.get('vis.explore'),
          defaultHistograms = $injector.get('EXPLORE_DEFAULT_HISTOGRAMS');

          DatasetFactory.getVariableData(defaultHistograms, exploreHandler)
          .then(function succFn(res) {
            _.each(defaultHistograms, function(variable) {
              PlotService.drawHistogram({ pooled: undefined,  variables: { x: variable } }, exploreHandler);
            });
            defer.resolve();
          }, function errFn(res) {
            defer.reject();
          });
        };

        var selectDatasets = function() {
          _.each(DatasetFactory.getSets(), function(set) {
            set.enable();
          });
          DatasetFactory.updateDataset();
        };

        var defer = $q.defer();

        selectDatasets();
        drawExplore(defer);

        return defer.promise;
      }

      function removeHash() {
        // remove the state hash from url
        $location.search('state', undefined);
        $location.url($location.path());
      }

      var NotifyService = $injector.get('NotifyService'),
      FilterService = $injector.get('FilterService'),
      WindowHandler = $injector.get('WindowHandler'),
      SOMService = $injector.get('SOMService'),
      DatasetFactory = $injector.get('DatasetFactory'),
      DimensionService = $injector.get('DimensionService'),
      PlotService = $injector.get('PlotService');

      var defer = $q.defer();

      if(_loaded) {
        $timeout(function() { 
          console.log("url state already loaded, do nothing.");
          defer.resolve({ result: 'redundant'});
        });
      }
      // load default view
      else if(_.isUndefined(urlHash)) {
        loadDefaultView().then(function succFn() {
          console.log("default view loaded successfully");
          defer.resolve({ result: 'default_success' });
        }, function errFn() {
          NotifyService.addSticky('Error', 'Loading the default figures failed.', 'error');
          defer.resolve({ result: 'default_failed'});
        })
        .finally(function() {
          _loaded = true;
        });
      } else {
        // load from hash id
        loadFromState(urlHash).then(function succFn() {
          console.log("url state loaded");
          defer.resolve({ result: 'hash_success' });
        }, function errFn() {
          NotifyService.addSticky('Error', 
            'Loading the state from the provided URL failed. Please check the link you followed', 
            'error');
          defer.resolve({ result: 'hash_failed' });
        })
        .finally(function() {
          removeHash();
          _loaded = true;
        });
      }

      return defer.promise;
    }; // load






    return _service;
  }]);