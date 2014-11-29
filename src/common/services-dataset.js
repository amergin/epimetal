var serv = angular.module('services.dataset', ['services.notify', 'ui.router.state']);

serv.factory('DatasetFactory', ['$http', '$q', '$injector', 'constants', '$rootScope', 'NotifyService',
  function($http, $q, $injector, constants, $rootScope, NotifyService) {

    // privates
    var that = this;
    that.sets = {};
    that.variables = [];
    that.variablesLookup = {};
    that.config = {
      datasetsURL: '/API/datasets',
      variablesURL: '/API/headers/NMR_results',
      variableURLPrefix: '/API/list/',
      multipleVariablesURL: '/API/list/'
    };
    that.colors = d3.scale.category20();

    // notice: these cannot be kept in DimensionService, since
    // not all variables rely on crossfilter-dimension setup!
    // SOM variables are not added here since they do not require
    // API loading.
    that.activeVariables = {};

    // that.SOMs = {};
    // only one SOM can be active at a time; if this is empty that means 
    // a SOM has not yet been computed (waiting)
    that.som = {};
    that.somSelection = {
      variables: [],
      samples: null
    };
    // that.somVariables = [];
    that.SOMPlanes = {};



    // --------------------------------------
    // class for defining a single dataset
    function Dataset(dsetName, col, noSamples) {

      // --------------------------------------
      // privates:
      // --------------------------------------

      var name = dsetName;
      var color = col;

      // loaded samples from the api
      var samples = {};

      var active = false;

      var size = null || noSamples;

      // --------------------------------------
      // functions
      // --------------------------------------

      var _restructureSamples = function(samples, variable) {
        var res = {};
        _.each(samples, function(val, sampId) {
          res[sampId] = {
            dataset: name,
            variables: {},
            id: sampId
          };
          res[sampId].variables[variable] = val;
        });
        return res;
      };

      // 'variables' is a list
      this.getVarSamples = function(variables) {
        var defer = $q.defer();

        var performPost = function() {
          $http.post(that.config.multipleVariablesURL, {
            variables: variables,
            dataset: name
          })
            .success(function(response) {

              _.each(response.result.values, function(sample) {
                if (_.isUndefined(samples[sample['sampleid']])) {
                  // previously unknown sample
                  samples[sample['sampleid']] = sample;
                } else {
                  // already present, just extend to include the new variable data
                  _.extend(samples[sample['sampleid']].variables, samples.variables);
                }
              });

              // send the received data to dimension, to be further added to crossfilter instance
              defer.resolve(response.result.values);
            })
            .error(function(response, status, headers, config) {
              defer.reject(response);
            });
        };

        var samplesPopulated = !_.isUndefined(_.first(_.values(samples)));
        if (samplesPopulated) {
          var availableVariables = _.keys(_.first(_.values(samples)).variables);
          var newVariables = _.difference(variables, availableVariables);

          if (!_.isEmpty(newVariables)) {
            performPost();
          } else {
            // nothing new discovered
            defer.resolve();
          }
        } else {
          // samples is completely empty, e.g. pageload situation
          performPost();
        }

        return defer.promise;
      };

      this.getColor = function() {
        return color;
      };

      this.toggle = function() {
        active = !active;
      };

      this.disable = function() {
        active = false;
      };

      this.isActive = function() {
        return active;
      };

      this.getName = function() {
        return name;
      };
      this.getSize = function() {
        return size || _.size(samples);
      };


    } // Dataset class ends


    var service = {};

    service.getColorScale = function() {
      return that.colors;
    };

    service.getVariables = function() {
      var deferred = $q.defer();
      $http.get(that.config.variablesURL)
        .success(function(response) {
          console.log("Load variable list");
          // empty just in case it's not empty
          that.variables = [];
          _.each(response.result, function(varNameObj, ind) {
            that.variables.push(varNameObj);
            that.variablesLookup[varNameObj.name] = ind;
          });
          that.variables = _.sortBy(that.variables, function(obj) {
            return obj.desc || obj.name;
          });
          deferred.resolve(that.variables);
        })
        .error(function(response) {
          deferred.reject('Error in fetching variable list');
        });
      return deferred.promise;
    };

    service.getDatasets = function() {
      var deferred = $q.defer();
      $http.get(that.config.datasetsURL)
        .success(function(response) {
          console.log("load dataset names");
          _.each(response.result, function(nameObj) {
            // create a dataset stub
            that.sets[nameObj.name] = new Dataset(nameObj.name, that.colors(nameObj.name), nameObj.size);
          });
          deferred.resolve(that.sets);
        })
        .error(function() {
          deferred.reject('Error in fetching dataset list');
        });
      return deferred.promise;
    };

    service.variables = function() {
      return that.variables;
    };

    service.legalVariables = function(array) {
      var legal = true;
      _.every(array, function(variable) {
        if (_.isUndefined(that.variablesLookup[variable])) {
          legal = false;
          return false; // break
        }
        return true; // continue iter
      });
      return legal;
    };

    // this function checks if new variables need to be fetched
    // for datasets that have not been previously selected
    // Called on dataset toggling!
    service.checkActiveVariables = function(set) {

      var defer = $q.defer();
      var DimensionService = $injector.get('DimensionService');
      var activeVars = service.getActiveVariables();

      // nothing to add if disabled
      if (!set.isActive()) {
        defer.resolve('disabled');
      } else if (activeVars.length === 0) {
        // this is the case when no windows are present but selections are made
        // on the datasets. Just update the dimensionFilter...
        defer.resolve('empty');
      } else {

        // var promises = [];
        var dataWasAdded = false;

        set.getVarSamples(activeVars).then(function sucFn(samples) {

          if (_.isUndefined(samples)) {
            defer.resolve('enabled');
            return;
          }

          _.each(activeVars, function(variable) {
            var dataAdded = DimensionService.addVariableData(variable, samples);
            if (dataAdded) {
              dataWasAdded = true;
            }
          });

          if (dataWasAdded) {
            DimensionService.rebuildInstance();
          }
          defer.resolve('enabled');

        }, function errFn(samples) {
          console.log("checkActiveVariables", samples);
          defer.reject(samples);
        });
      }

      return defer.promise;
    };

    // var _findSOM = function(selection, datasets) {
    //   for (var key in that.SOMs) {
    //     var som = that.SOMs[key];
    //     if (_.isEqual(som.variables, selection) && _.isEqual(som.datasets, datasets)) {
    //       return som;
    //     }
    //   }
    // };

    var _findPlane = function(som) {
      for (var key in that.SOMPlanes) {
        var plane = that.SOMPlanes[key];
        if (_.isEqual(plane.som_id, som.som) && _.isEqual(plane.variable, som.tinput)) {
          return plane;
        }
      }
    };

    service.getPlaneBySOM = function(somId) {
      return _.filter( that.SOMPlanes, function(plane, key) {
        return plane.som_id === somId;
      });
    };

    service.updateSOMVariables = function(variables) {
      function sameVariables(variables) {
        return _.isEmpty( _.difference(variables, that.somSelection.variables) );
      }

      if( sameVariables(variables) ) {
        return;
      }
      that.somSelection['variables'] = variables;

      service.computeSOM(true);
    };

    service.computeSOM = function(force) {
      var DimensionService = $injector.get('DimensionService');
      var sampleDim = DimensionService.getSampleDimension();
      var samples = sampleDim.top(Infinity);

      if( samples.length > 0 && 
        !_.isEmpty(that.somSelection.variables) &&
        !_.isEqual( that.somSelection['samples'], samples.length ) ||
        force
        ) {
        that.somSelection['samples'] = samples.length;
        service._getSOM();
      }
    };

    service._getSOM = function() {
      NotifyService.addTransient('Starting SOM computation', 'The computation may take a while.', 'success');

      function getSamples() {
        var DimensionService = $injector.get('DimensionService');
        var sampleDim = DimensionService.getSampleDimension();

        return _.map( sampleDim.top(Infinity), function(obj) {
          return _.pick( obj, 'dataset', 'sampleid');
        });
      }

      var samples = getSamples();

      // at least 10 samples required
      if( samples.length < 10 ) { return; }

      var selection = that.somSelection.variables;
      var defer = $q.defer();

      var datasets = _.map(service.activeSets(), function(set) {
        return set.getName();
      });

        // remove previous computation
        that.som = {};

        var ws = new WebSocket(constants.som.websocket.url + constants.som.websocket.api.som);

        if(selection.somid) {
          // som exists beforehand, it's queried by its id
          ws.onopen = function() {
            ws.send(JSON.stringify({
              'somid': selection.somid
            }));
          };
        } else {
          // don't know whether som exists already
          ws.onopen = function() {
            ws.send(JSON.stringify({
              // 'datasets': datasets,
              'variables': selection,
              'samples': samples
            }));
          };
        }

        ws.onclose = function(evt) {
          console.log("SOM WS closed", evt);
        };

        ws.onmessage = function(evt) {
          var result = JSON.parse(evt.data);
          if (result.result.code == 'error') {
            // SOM computation failed
            NotifyService.addTransient('SOM computation failed', result.result.message, 'danger');
            defer.reject(result.result.message);
          } else {
            // SOM comp is OK
            NotifyService.addTransient('SOM computation ready', 'The submitted SOM computation is ready', 'success');
            var som = result.data;
            $rootScope.$emit('dataset:SOMUpdated', result.data);
            var DimensionService = $injector.get('DimensionService');
            DimensionService.addBMUs(som.id, som.bmus);


            // that.SOMs[som.id] = som;
            that.som = som;
            defer.resolve(som);
          }
        };
      // }
      return defer.promise;
    };

    service.somReady = function() {
      return !_.isEmpty(that.som);
    };

    service.getPlane = function(testVar) {
      var defer = $q.defer();
      var ws = new WebSocket(constants.som.websocket.url + constants.som.websocket.api.plane);
      ws.onopen = function() {
        ws.send(JSON.stringify({
          'somid': that.som.id,
          'datasets': that.som.datasets,
          'variables': {
            'test': testVar,
            'input': that.som.variables
          }
        }));
      };

      ws.onclose = function(evt) {
        console.log("Plane WS closed", evt);
      };

      ws.onmessage = function(evt) {
        var result = JSON.parse(evt.data);
        if (result.result.code == 'error') {
          defer.reject(result.result.message);
        } else {
          that.SOMPlanes[result.data.id] = result.data;
          defer.resolve( angular.copy(result.data) );
        }
      };
      return defer.promise;
    };

    // this is called whenever a plot is drawn to check if variable data
    // is to be fetched beforehand. 
    // Example: 
    // 1. select three datasets
    // 2. select varA for histogram
    // 3. plot -> this is called
    service.getVariableData = function(variables) {
      var defer = $q.defer();
      var activeSets = service.activeSets();
      var dataWasAdded = false;
      var DimensionService = $injector.get('DimensionService');
      var setPromises = [];

      if (_.isEmpty(variables)) {

        defer.resolve();
      } else {
        // check every set
        _.each(activeSets, function(set) {
          setPromises.push(set.getVarSamples(variables));
        });

        $q.all(setPromises).then(function sucFn(resArray) {
          _.each(resArray, function(setSamples) {

            if (_.isUndefined(setSamples)) {
              // nothing new was fetched
              return;
            }

            _.each(variables, function(vari) {
              var dataAdded = DimensionService.addVariableData(vari, setSamples);
              if (dataAdded) {
                dataWasAdded = true;
              }
            });

          });

          if (dataWasAdded) {
            // rebuilds crossfilter instance
            DimensionService.rebuildInstance();
          }
          // result can be empty, it's the promise that counts, not the data delivered outwards
          defer.resolve();
        }, function errFn(res) {
          defer.reject(res);
        });
      }

      return defer.promise;
    };


    // assumes getDatasets is called and therefore the service is initialized
    service.getSets = function() {
      return that.sets;
    };

    service.getSet = function(name) {
      return that.sets[name];
    };

    // get all dset names, whether active or not
    service.getSetNames = function() {
      return _.map(service.getSets(), function(set) {
        return set.getName();
      });
    };

    service.toggle = function(set) {
      var DimensionService = $injector.get('DimensionService');
      DimensionService.updateDatasetDimension();
    };

    service.activeSets = function() {
      return _.filter(that.sets, function(set) {
        return set.isActive();
      });
    };

    service.isActive = function(name) {
      return that.sets[name].active();
    };


    service._addActiveVariable = function(variable) {
      if (_.isUndefined(that.activeVariables[variable])) {
        that.activeVariables[variable] = {
          count: 1
        };
      } else {
        ++that.activeVariables[variable].count;
      }
    };

    service._removeActiveVariable = function(variable) {
      --that.activeVariables[variable].count;
    };

    service.getActiveVariables = function() {
      return _.without(
        _.map(that.activeVariables, function(val, key) {
          if (val.count > 0) {
            return key;
          }
        }),
        undefined);
    };

    $rootScope.$on('variable:add', function(event, type, selection) {
      _.each(Utils.getVariables(type, selection), function(variable) {
        service._addActiveVariable(variable);
      });
    });

    $rootScope.$on('variable:remove', function(event, type, selection) {
      _.each(Utils.getVariables(type, selection), function(variable) {
        service._removeActiveVariable(variable);
      });
    });

    return service;
  }
]);