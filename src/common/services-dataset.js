var serv = angular.module('services.dataset', ['services.notify']);

serv.factory('DatasetFactory', ['$http', '$q', '$injector', 'constants',
  function ($http, $q, $injector, constants) {

    // privates
    var that = this;
    that.sets = {};
    that.variables = [];
    that.variablesLookup = {};
    that.config = {
      datasetsURL: '/API/datasets',
      variablesURL: '/API/headers/NMR_results'
    };
    that.colors = d3.scale.category20();

    // notice: these cannot be kept in DimensionService, since
    // not all variables rely on crossfilter-dimension setup!
    // SOM variables are not added here since they do not require
    // API loading.
    that.activeVariables = {};

    that.SOMs = {};
    that.SOMPlanes = {};

    // --------------------------------------
    // class for defining a single dataset
    function Dataset(dsetName, col, noSamples) {

      // --------------------------------------
      // privates:
      // --------------------------------------

      var config = {
        variableURLPrefix: '/API/list/'
      };

      var name = dsetName;
      var color = col;

      // loaded samples from the api
      var samples = {};

      var active = false;

      var size = null || noSamples;

      // --------------------------------------
      // functions
      // --------------------------------------

      var _restructureSamples = function (samples, variable) {
        var res = {};
        _.each(samples, function (val, sampId) {
          res[sampId] = {
            dataset: name
          };
          res[sampId].variables = {};
          res[sampId].variables[variable] = val;
          res[sampId]['id'] = sampId;
        });
        return res;
      };

      // returns a map for the variables asked for,
      // fetches them from api if necessary
      this.getVarSamples = function (variable) {
        var deferred = $q.defer();

        // check if needed to fetch
        if (_.isUndefined(samples[variable])) {
          $http.get(config.variableURLPrefix + variable + "/in/" + name)
            .success(function (response) {
              samples[variable] = response.result.values;
              deferred.resolve(_restructureSamples(samples[variable], variable));
            })
            .error(function (response, status, headers, config) {
              deferred.reject(variable);
            });
        } else {
          // already available, fetched
          deferred.resolve(_restructureSamples(samples[variable], variable));
        }
        return deferred.promise;
      };

      this.getColor = function () {
        return color;
      };

      this.toggle = function () {
        active = !active;
      };

      this.disable = function() {
        active = false;
      };

      this.isActive = function () {
        return active;
      };

      this.getName = function () {
        return name;
      };
      this.getSize = function () {
        return size || _.size(samples);
      };


    } // Dataset class ends


    var service = {};

    service.getColorScale = function () {
      return that.colors;
    };

    service.getVariables = function () {
      var deferred = $q.defer();
      $http.get(that.config.variablesURL)
        .success(function (response) {
          console.log("Load variable list");
          // empty just in case it's not empty
          that.variables = [];
          _.each(response.result, function (varNameObj, ind) {
            that.variables.push(varNameObj);
            that.variablesLookup[varNameObj.name] = ind;
          });
          that.variables = _.sortBy(that.variables, function (obj) {
            return obj.desc || obj.name;
          });
          deferred.resolve(that.variables);
        })
        .error(function (response) {
          deferred.reject('Error in fetching variable list');
        });
      return deferred.promise;
    };

    service.getDatasets = function () {
      var deferred = $q.defer();
      $http.get(that.config.datasetsURL)
        .success(function (response) {
          console.log("load dataset names");
          _.each(response.result, function (nameObj) {
            // create a dataset stub
            that.sets[nameObj.name] = new Dataset(nameObj.name, that.colors(nameObj.name), nameObj.size);
          });
          deferred.resolve(that.sets);
        })
        .error(function () {
          deferred.reject('Error in fetching dataset list');
        });
      return deferred.promise;
    };

    service.variables = function () {
      return that.variables;
    };

    service.legalVariables = function(array) {
      _.each(array, function(variable) {
        if( _.isUndefined( that.variablesLookup[variable] ) ) {
          return false;
        }
      });
      return true;
    };

    // this function checks if new variables need to be fetched
    // for datasets that have not been previously selected
    // Called on dataset toggling!
    service.checkActiveVariables = function (set) {

      var defer = $q.defer();

      // nothing to add if disabled
      if (!set.isActive()) {
        defer.resolve('disabled');
      }

      var DimensionService = $injector.get('DimensionService');
      var activeVars = service.getActiveVariables();
      var dataWasAdded = false;

      if( activeVars.length === 0 ) {
        // this is the case when no windows are present but selections are made
        // on the datasets. Just update the dimensionFilter...
        defer.resolve('empty');
      }

      _.each(activeVars, function (variable, ind) {
        var varPromise = set.getVarSamples(variable);
        varPromise.then(function sucFn(samples) {
          var dataAdded = DimensionService.addVariableData(variable, samples);
          if (dataAdded) {
            dataWasAdded = true;
          }

          if (ind === (activeVars.length - 1)) {
            if (dataWasAdded) {
              DimensionService.rebuildInstance();
            }
            defer.resolve('enabled');
          }

        }, function errFn(errVar) {
          defer.reject(errVar);
        });
      });
      return defer.promise;
    };

    var _findSOM = function(selection, datasets) {
      for(var key in that.SOMs) {
        var som = that.SOMs[key];
        if( _.isEqual( som.variables, selection ) && _.isEqual( som.datasets, datasets ) ) {
          return som;
        }
      }
    };

    var _findPlane = function(som) {
      for(var key in that.SOMPlanes) {
        var plane = that.SOMPlanes[key];
        if( _.isEqual( plane.som_id, som.som ) && _.isEqual( plane.variable, som.tinput ) ) {
          return plane;
        }
      }
    };

    service.getSOM = function(selection) {
      var defer = $q.defer();

      var datasets = _.map( service.activeSets(),function(set) { return set.getName(); });
      var cachedSom = _findSOM(selection,datasets);
      if( cachedSom ) {
        defer.resolve( cachedSom );
      }
      else {
        var ws = new WebSocket(constants.som.websocket.url + constants.som.websocket.api.som);
         ws.onopen = function() {
            ws.send(JSON.stringify({
              'datasets': datasets,
              'variables': selection
            }));
         };
         ws.onclose = function(evt) {
            console.log("closed", evt);
         };

         ws.onmessage = function(evt) {
            var result = JSON.parse(evt.data);
            if( result.result.code == 'error' ) {
              defer.reject(result.result.message);
            }
            else {
              that.SOMs[result.data.id] = result.data;
              defer.resolve(result.data);
            }
         };
      }
      return defer.promise;
    };

    service.getPlane = function(som) {

      var defer = $q.defer();

      var ws = new WebSocket(constants.som.websocket.url + constants.som.websocket.api.plane);
      var cachedPlane = _findPlane(som);
      if( cachedPlane ) {
        defer.resolve( cachedPlane );
      }
      else {
        if( som.planeid ) {
          ws.onopen = function() {
            ws.send(JSON.stringify({
              'planeid': som.planeid
            }));
          };
        }
        else {
           ws.onopen = function() {
              ws.send(JSON.stringify({
                'somid': som.som,
                'datasets': som.datasets,
                'variables': {
                  'test': som.tinput,
                  'input': som.variables
                }
              }));
           };
        }

         ws.onclose = function(evt) {
            console.log("closed", evt);
         };

         ws.onmessage = function(evt) {
            var result = JSON.parse(evt.data);
            if( result.result.code == 'error' ) {
              defer.reject(result.result.message);
            }
            else {
              that.SOMPlanes[result.id] = result.data;
              defer.resolve(result.data);
            }
         };
         return defer.promise;
      }
    };



    // this is called whenever a plot is drawn to check if variable data
    // is to be fetched beforehand. 
    // Example: 
    // 1. select three datasets
    // 2. select varA for histogram
    // 3. plot -> this is called
    service.getVariableData = function (variables) {

      // checks all active datasets and gets the parameter var
      // samples for that dataset. Response: { sampid: sample, ... }
      var _getVarForDatasets = function (variable) {
        var defer = $q.defer();

        var varPromises = [];
        var activeSets = service.activeSets();

        // check every set
        _.each(activeSets, function (set) {
          varPromises.push(set.getVarSamples(variable));
        });

        $q.all(varPromises).then(function sucFn(resArray) {
          var result = {};
          _.each(resArray, function (varMap) {
            _.extend(result, varMap);
          });

          defer.resolve({
            variable: variable,
            samples: result
          });

        }, function errFn(errVar) {
          defer.reject(errVar);
        });

        return defer.promise;
      };

      var combDefer = $q.defer();
      var combPromises = [];
      var DimensionService = $injector.get('DimensionService');

      // for each inserted var, usually only x/y
      _.each(variables, function (variable) {
        combPromises.push(_getVarForDatasets(variable));
      });

      $q.all(combPromises).then(function succFn(res) {

        var dataWasAdded = false;
        _.each(res, function (varInSet) {
          var dataAdded = DimensionService.addVariableData(varInSet.variable, varInSet.samples);
          if (dataAdded) {
            dataWasAdded = true;
          }
        });

        if (dataWasAdded) {
          DimensionService.rebuildInstance();
        }
        combDefer.resolve(res);

      }, function errFn(res) {
        combDefer.reject(res);
      });

      return combDefer.promise;
    };

    // assumes getDatasets is called and therefore the service is initialized
    service.getSets = function () {
      return that.sets;
    };

    service.getSet = function(name) {
      return that.sets[name];
    };

    // get all dset names, whether active or not
    service.getSetNames = function () {
      return _.map(service.getSets(), function (set) {
        return set.getName();
      });
    };

    service.toggle = function (set) {
      var DimensionService = $injector.get('DimensionService');
      DimensionService.updateDatasetDimension();
    };

    service.activeSets = function () {
      return _.filter(that.sets, function (set) {
        return set.isActive();
      });
    };

    service.isActive = function (name) {
      return that.sets[name].active();
    };


    service._addActiveVariable = function(variable) {
      if( _.isUndefined( that.activeVariables[variable] ) ) {
        that.activeVariables[variable] = { count: 1 };
      }
      else {
        ++that.activeVariables[variable].count;
      }
    };

    service._removeActiveVariable = function(variable) {
      --that.activeVariables[variable].count;
    };

    service.getActiveVariables = function() {
      return _.without( 
        _.map( that.activeVariables, function(val,key) { if( val.count > 0 ) { return key; } } ), 
        undefined );
    };

    var $rootScope = $injector.get('$rootScope');
    $rootScope.$on('variable:add', function(event, type, selection) {
      _.each( Utils.getVariables(type,selection), function(variable) {
        service._addActiveVariable( variable );
      });
    });

    $rootScope.$on('variable:remove', function(event, type, selection) {
      _.each( Utils.getVariables(type,selection), function(variable) {
        service._removeActiveVariable( variable );
      });
    });

    return service;
  }
]);