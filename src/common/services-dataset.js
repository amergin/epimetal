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

    // primary from dimension service
    that.dimensionService = null;

    // notice: these cannot be kept in DimensionService, since
    // not all variables rely on crossfilter-dimension setup!
    // SOM variables are not added here since they do not require
    // API loading.
    that.activeVariables = {};

    var initVariables = _.once(function() {
      var defer = $q.defer();
      $http.get(that.config.variablesURL)
        .success(function(response) {
          console.log("Load variable list");
          // empty just in case it's not empty
          var res = [];
          _.each(response.result, function(varNameObj, ind) {
            res.push(varNameObj);
          });
          res = _.sortBy(res, function(obj) {
            return obj.desc || obj.name;
          });
          that.variables = angular.copy(res);
          defer.resolve(that.variables);
        })
        .error( function() {
          that.variables = angular.copy([]);
          NotifyService.addSticky('Error!', 'Something went wrong while fetching variables. Please reload the page', 'danger');
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
      size = null || noSamples,

      // flag that is used to determine whether newly acquired
      // data is added. check addVariableData fn on 
      // services-dimensions!
      unreadData = false;

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
      dset.getVarSamples = function(variables) {
        var defer = $q.defer();

        var performPost = function(vars) {
          $http.post(that.config.multipleVariablesURL, {
            variables: vars,
            dataset: name
          })
            .success(function(response) {
              unreadData = true;
              _.each(response.result.values, function(sample) {
                if (_.isUndefined(samples[sample.sampleid])) {
                  // previously unknown sample
                  samples[sample.sampleid] = sample;
                } else {
                  // already present, just extend to include the new variable data
                  _.extend(samples[sample.sampleid].variables, sample.variables);
                }
              });

              // send the received data to dimension, to be further added to crossfilter instance
              defer.resolve({
                samples: response.result.values,
                newVariables: vars,
                dataset: dset
              });
            })
            .error(function(response, status, headers, config) {
              defer.reject(response);
            });
        };


        var empty = _.isEmpty(samples),
        currentVariables = _.chain(samples)
        .sample(4)
        .map(function(d) { return _.keys(d.variables); })
        .flatten()
        .uniq()
        .value(),
        newVariables = _.difference(variables, currentVariables);

        if(empty) {
          // get all variables
          performPost(variables);
        } 
        else if( _.isEmpty(newVariables) ) {
          // nothing to done, everything already fetched
          defer.resolve({
            samples: [],
            newVariables: newVariables,
            dataset: dset
          });
        } else {
          // fetch new variables
          performPost(newVariables);
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

      dset.unread = function(x) {
        if(!arguments.length) { return unreadData; }
        unreadData = x;
        return dset;
      };

      return dset;

    } // Dataset class ends


    var service = {};

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
      // var DimensionService = $injector.get('DimensionService');
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

        set.getVarSamples(activeVars).then(function sucFn(obj) {

          if (_.isUndefined(obj.samples)) {
            defer.resolve('enabled');
            return;
          }

          var dataAdded = that.dimensionService.addVariableData(obj.samples, obj.dataset);
          if (dataAdded) {
            dataWasAdded = true;
          }
          // _.each(obj.newVariables, function(variable) {
          //   var dataAdded = that.dimensionService.addVariableData(variable, obj.samples, obj.dataset);
          //   if (dataAdded) {
          //     dataWasAdded = true;
          //   }
          // });

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

    // this is called whenever a plot is drawn to check if variable data
    // is to be fetched beforehand. 
    // Example: 
    // 1. select three datasets
    // 2. select varA for histogram
    // 3. plot -> this is called
    service.getVariableData = function(variables, windowHandler) {
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

        $q.all(setPromises).then(function sucFn(resObject) {
          _.each(resObject, function(setObj) {

            if (_.isUndefined(setObj.samples)) {
              // nothing new was fetched for this dataset, continue loop
              return;
            }

            var dataAdded = windowHandler.getDimensionService().addVariableData(setObj.samples, setObj.dataset);
            if (dataAdded) {
              dataWasAdded = true;
            }

            // _.each(setObj.newVariables, function(vari) {
            //   var dataAdded = windowHandler.getDimensionService().addVariableData(vari, setObj.samples, setObj.dataset);
            //   if (dataAdded) {
            //     dataWasAdded = true;
            //   }
            // });

          });

          if (dataWasAdded) {
            windowHandler.getDimensionService().rebuildInstance();
          }
          defer.resolve(dataWasAdded);
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

    service.setDimensionService = function(dimensionService) {
      that.dimensionService = dimensionService;
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