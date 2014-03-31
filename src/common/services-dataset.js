var serv = angular.module('services.dataset', ['services.notify']);

serv.factory('DatasetFactory', ['$http', '$q', '$injector',
  function ($http, $q, $injector) {

    // privates
    var that = this;
    that.sets = {};
    that.variables = [];
    that.config = {
      datasetsURL: '/API/datasets',
      variablesURL: '/API/headers/NMR_results'
    };
    that.colors = d3.scale.category20();


    // --------------------------------------
    // class for defining a single dataset
    function Dataset(dsetName, col) {

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
              //console.log("dset returning", _.size(samples[variable]) );
              deferred.resolve(_restructureSamples(samples[variable], variable));
            })
            .error(function (response, status, headers, config) {
              //console.log("dset returning empty");
              // var NotifyService = $injector.get('NotifyService');
              // NotifyService.addSticky('Error receiving data at ' + config.url, 'error' );
              var message = !_.isUndefined(response.result) ? response.result.error :
                'Something went wrong while fetching the samples from server. Plotting window will not be drawn.';
              deferred.reject(message);
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
        return _.size(samples);
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
          _.each(response.result, function (varNameObj) {
            that.variables.push(varNameObj.name);
          });
          that.variables = _.sortBy(that.variables, function (name) {
            return name.toLowerCase();
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
            that.sets[nameObj.name] = new Dataset(nameObj.name, that.colors(nameObj.name));
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
      var activeVars = DimensionService.getActiveVariables();
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

        }, function errFn(res) {
          defer.reject(res);
        });
      });
      return defer.promise;
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

        }, function errFn(resArray) {
          defer.reject(resArray);
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

    return service;
  }
]);