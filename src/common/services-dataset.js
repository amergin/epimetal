var serv = angular.module('services.dataset', ['services.notify', 'ui.router.state']);

serv.factory('DatasetFactory', ['$http', '$q', '$injector', 'constants', '$rootScope', 'NotifyService',
  function($http, $q, $injector, constants, $rootScope, NotifyService) {

    // privates
    var that = this;
    that.sets = {};
    that.variables = [];
    that.config = {
      datasetsURL: '/API/datasets',
      variablesURL: '/API/headers/NMR_results',
      variableURLPrefix: '/API/list/',
      multipleVariablesURL: '/API/list/'
    };
    that.colors = d3.scale.category20();
    that.classedVariables = {};
    that.variableCache = {};

    // primary from dimension service
    that.dimensionService = null;

    var initVariables = _.once(function() {
      var defer = $q.defer();
      $http.get(that.config.variablesURL)
        .success(function(response) {
          console.log("Load variable list");
          _.each(response.result, function(variable) {
            if(variable.classed) {
              that.classedVariables[variable.name] = variable;
            }
            that.variableCache[variable.name] = variable;
          });
          that.variables = response.result;
          defer.resolve(that.variables);
        })
        .error( function() {
          that.variables = angular.copy([]);
          NotifyService.addSticky('Error', 'Something went wrong while fetching variables. Please reload the page.', 'error');
          defer.reject('Something went wrong while fetching variables. Please reload the page');
        });
      return defer.promise;
    });

    var initDatasets = _.once(function() {
      var deferred = $q.defer();
      var res = {};
      $http.get(that.config.datasetsURL)
        .success(function(response) {
          console.log("load dataset names");
          _.each(response.result, function(nameObj) {
            // create a dataset stub
            res[nameObj.name] = new Dataset(nameObj.name, that.colors(nameObj.name), nameObj.size);
            // that.sets[nameObj.name] = new Dataset(nameObj.name, that.colors(nameObj.name), nameObj.size);
          });
          that.sets = angular.copy(res);
          deferred.resolve(that.sets);
        })
        .error(function() {
          deferred.reject('Error in fetching dataset list');
        });
      return deferred.promise;      
    });


    // --------------------------------------
    // class for defining a single dataset
    function Dataset(dsetName, col, noSamples) {

      // --------------------------------------
      // privates:
      // --------------------------------------

      var name = dsetName,
      color = col,

      // loaded samples from the api
      samples = {},

      active = false,
      size = null || noSamples;

      var dset = {};

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
      dset.getVarSamples = function(variables, config) {
        var defer = $q.defer(),
        configDefined = !_.isUndefined(config);

        function getSubsetOfVariables(callVariables) {
          var lookup = {};
          function getKey(samp) {
            return samp.dataset + "|" + samp.sampleid;
          }
          _.chain(samples)
          .map(function(samp, key) { 
            var obj = {},
            baseDetails = _.chain(samp).omit('variables').value();
            _.chain(obj)
            .extend(baseDetails)
            .extend({'variables': _.pick(samp.variables, callVariables)})
            .value();
            lookup[getKey(samp)] = obj;
          })
          .value();
          return lookup;
        }

        // this is probably significantly faster
        function getAllVariables() {
          var lookup = {};
          function getKey(samp) {
            return samp.dataset + "|" + samp.sampleid;
          }
          _.each(samples, function(samp) {
            lookup[getKey(samp)] = samp;
          });
          return lookup;
        }

        function getResult(callVariables, newVariables, config, addedValues) {
          var retObj = {
            samples: {
              added: [],
              all: []
            },
            variables: {
              added: newVariables
            },
            dataset: dset
          };

          if(addedValues) {
            retObj.samples.added = addedValues;
          }

          retObj.samples.all = getAllVariables();

          return retObj;
        }

        var performPost = function(vars, config) {
          $http.post(that.config.multipleVariablesURL, {
            variables: vars,
            dataset: name
          })
            .success(function(response) {
              _.each(response.result.values, function(sample) {
                if (_.isUndefined(samples[sample.sampleid])) {
                  // previously unknown sample
                  samples[sample.sampleid] = sample;
                } else {
                  // already present, just extend to include the new variable data
                  _.extend(samples[sample.sampleid].variables, sample.variables);
                }
              });

              defer.resolve(getResult(variables, vars, config, response.result.values));
            })
            .error(function(response, status, headers, config) {
              defer.reject(response);
            });
        };


        var empty = _.isEmpty(samples),
        currentVariables = dset.variables(),
        intersection = _.intersection(currentVariables, variables),
        newVariables = _.difference(variables, intersection);

        if(empty) {
          // get all variables
          performPost(variables, config);
        } 
        else if( _.isEmpty(newVariables) ) {
          // nothing to done, everything already fetched
          defer.resolve(getResult(variables, newVariables, config));
        } else {
          // fetch new variables
          performPost(newVariables, config);
        }

        return defer.promise;
      };

      dset.getColor = function() {
        return color;
      };

      dset.toggle = function() {
        active = !active;
        return that;
      };

      dset.disable = function() {
        active = false;
        return dset;
      };

      dset.enable = function() {
        active = true;
        return dset;
      };

      dset.isActive = function() {
        return active;
      };

      dset.getName = function() {
        return name;
      };

      dset.getSize = function() {
        return size || _.size(samples);
      };

      dset.variables = function() {
        return _.chain(samples)
        .sample(4)
        .map(function(d) { return _.keys(d.variables); })
        .flatten()
        .uniq()
        .value();
      };

      dset.hasVariable = function(x) {
        return _.chain(samples)
        .sample(3)
        .values()
        .map(function(d) { 
          return _.has(d.variables, x); 
        })
        .some(Boolean)
        .value();
      };

      return dset;

    } // Dataset class ends


    var service = {};

    service.isClassVariable = function(v) {
      return !_.isUndefined(that.classedVariables[v]);
    };

    service.getVariable = function(v) {
      return that.variableCache[v];
    };

    service.getColorScale = function() {
      return that.colors;
    };

    service.getVariables = function() {
      return initVariables();
    };

    service.getDatasets = function() {
      return initDatasets();
    };

    var getProfiles = _.once(function() {
      var getSorted = function() {
        return _.chain(that.variables)
        .sortBy(function(v) { return v.name_order; })
        .sortBy(function(v) { return v.group.order; })
        .value();
      };
      var getTotalLipids = function(sorted) {
        // get variables ending with '-L'
        var re = /^((?:[a-z|-]+)-L)$/i;
        return _.filter(sorted, function(d) { return re.test(d.name); });
      };
      var getFattyAcids = function(sorted) {
        var names = ['TotFA', 'UnSat', 'DHA', 'LA', 'FAw3', 'FAw6', 'PUFA', 'MUFA', 'SFA', 'DHAtoFA', 'LAtoFA', 'FAw3toFA', 'FAw6toFA', 'PUFAtoFA', 'MUFAtoFA', 'SFAtoFA'];
        return _.filter(sorted, function(v) { return _.some(names, function(n) { return v.name == n; } ); });
      };

      var getSmallMolecules = function(sorted) {
        var names = ['Glc', 'Lac', 'Pyr', 'Cit', 'Glol', 'Ala', 'Gln', 'His', 'Ile', 'Leu', 'Val', 'Phe', 'Tyr', 'Ace', 'AcAce', 'bOHBut', 'Crea', 'Alb', 'Gp'];
        return _.filter(sorted, function(v) { return _.some(names, function(n) { return v.name == n; } ); });
      };

      var sorted = getSorted();
      return [ { name: 'Total lipids', variables: getTotalLipids(sorted) },
      { name: 'Fatty acids', variables: getFattyAcids(sorted) },
      { name: 'Small molecules', variables: getSmallMolecules(sorted) }
      ];
    });

    service.getProfiles = function() {
      return getProfiles();
    };

    // this function checks if new variables need to be fetched
    // for datasets that have not been previously selected
    // Called on dataset toggling!
    service.checkActiveVariables = function(set) {

      var defer = $q.defer();
      var DimensionService = $injector.get('DimensionService');
      var activeVars = DimensionService.getPrimary().activeVariables();

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

        set.getVarSamples(activeVars).then(function sucFn(obj) {

          if(_.isEmpty(obj.samples.added)) {
            defer.resolve('enabled');
            return;
          }

          var config = _.extend(obj, { force: true });

          var dataAdded = that.dimensionService.addVariableData(config); //(activeVars, obj.samples.added, obj.dataset, true);
          if (dataAdded) {
            dataWasAdded = true;
          }

          if (dataWasAdded) {
            that.dimensionService.rebuildInstance();
          }
          defer.resolve('enabled');

        }, function errFn(samples) {
          console.log("checkActiveVariables", samples);
          defer.reject(samples);
        });
      }

      return defer.promise;
    };


    // Fetches and permanently stores the fetched variable data.
    // By default, the windowHandler 
    service.getVariableData = function(variables, windowHandler, config) {
      var defer = $q.defer(),
      dataWasAdded = false,
      configDefined = !_.isUndefined(config),
      result = {
        dataWasAdded: undefined,
        samples: {}
      };

      var DimensionService = $injector.get('DimensionService');

      var setPromises = [],
      addData = true,
      getRawData = configDefined && config.getRawData;        
      if(configDefined && config.addToDimensionService === false) {
        addData = false;
      }

      if (_.isEmpty(variables)) {
        // do nothing
        defer.resolve();
      } else {
        // check every set
        _.each(service.activeSets(), function(set) {
          setPromises.push(set.getVarSamples(variables, config));
        });

        $q.all(setPromises).then(function sucFn(res) {
          _.each(res, function(setObj) {

            if(getRawData) {
              // combine result samples
              _.extend(result.samples, setObj.samples.all);
            }

            var config = setObj;

            if(!addData) {
              return;
            } else {
              var dataAdded = windowHandler.getDimensionService().addVariableData(config);
              if (dataAdded) {
                dataWasAdded = true;
              }              
            }

          });

          if (dataWasAdded && addData) {
            windowHandler.getDimensionService().rebuildInstance();
          }

          // return result
          result.dataWasAdded = dataWasAdded;
          defer.resolve(result);
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

    service.updateDataset = function(set) {
      that.dimensionService.updateDatasetDimension();
    };

    service.activeSets = function() {
      return _.filter(that.sets, function(set) {
        return set.isActive();
      });
    };

    service.isActive = function(name) {
      return that.sets[name].active();
    };

    service.setDimensionService = function(dimensionService) {
      that.dimensionService = dimensionService;
    };

    return service;
  }
]);