angular.module('services.dataset', ['services.notify', 'ui.router.state'])

.factory('DatasetFactory', ['$http', '$q', '$injector', 'constants', '$rootScope', 'NotifyService',
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
      $http.get(that.config.variablesURL, { cache: true })
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
      $http.get(that.config.datasetsURL, { cache: true })
        .success(function(response) {
          console.log("load dataset names");
          _.each(response.result, function(nameObj) {
            // create a dataset stub
            var dset = new DatabaseDataset();
            dset.name(nameObj.name)
            .color(that.colors(nameObj.name))
            .size(nameObj.size);
            res[nameObj.name] = dset;
          });
          that.sets = angular.copy(res);
          deferred.resolve(that.sets);
        })
        .error(function() {
          deferred.reject('Error in fetching dataset list');
        });
      return deferred.promise;      
    });

    // *****************************************************

    // --------------------------------------
    // abstract base class
    function BaseDataset() {

      // --------------------------------------
      // privates:
      // --------------------------------------

      var priv = this.privates = {
        name: undefined,
        color: undefined,
        samples: {},
        active: false,
        size: 0
      },
      dset = this.dset = {};

      // public functions:

      dset.type = function() {
        throw new Error("not implemented");
      };

      dset.name = function(x) {
        if(!arguments.length) { return priv.name; }
        priv.name = x;
        return dset;
      };

      dset.size = function(x) {
        if(!arguments.length) { return priv.size; }
        priv.size = x;
        return dset;
      };

      dset.color = function(x) {
        if(!arguments.length) { return priv.color; }
        priv.color = x;
        return dset;
      };

      dset.toggle = function() {
        priv.active = !priv.active;
        return dset;
      };

      dset.active = function(x) {
        if(!arguments.length) { return priv.active; }
        priv.active = x;
        return dset;
      };

      dset.variables = function() {
        return _.chain(priv.samples)
        .sample(4)
        .map(function(d) { return _.keys(d.variables); })
        .flatten()
        .uniq()
        .value();
      };

      dset.hasVariable = function(x) {
        return _.chain(priv.samples)
        .sample(3)
        .values()
        .map(function(d) { 
          return _.has(d.variables, x); 
        })
        .some(Boolean)
        .value();
      };

      // protected functions
      priv.getKey = function(samp) {
        return [samp.dataset, samp.sampleid].join("|");
      };

      priv.getResult = function(callVariables, newVariables, config, addedValues) {
        function getAllVariables() {
          var lookup = {};
          _.each(priv.samples, function(samp) {
            lookup[priv.getKey(samp)] = samp;
          });
          return lookup;
        }

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
      };

      priv.getVariables = function(variables, config, defer, datasetName, sampProcessFn) {
        function defaultProcessFn(addSamples) {
          _.each(addSamples, function(sample) {
            if (_.isUndefined(priv.samples[sample.sampleid])) {
              // previously unknown sample
              priv.samples[sample.sampleid] = sample;
            } else {
              // already present, just extend to include the new variable data
              _.extend(priv.samples[sample.sampleid].variables, sample.variables);
            }
          });
        }

        var performPost = function(vars, config, defer, datasetName, processFn) {
          $http.post(that.config.multipleVariablesURL, {
            variables: vars,
            dataset: datasetName
          }, { cache: true })
          .success(function(response) {
            processFn(response.result.values);
            // _.each(response.result.values, function(sample) {
            //   if (_.isUndefined(priv.samples[sample.sampleid])) {
            //     // previously unknown sample
            //     priv.samples[sample.sampleid] = sample;
            //   } else {
            //     // already present, just extend to include the new variable data
            //     _.extend(priv.samples[sample.sampleid].variables, sample.variables);
            //   }
            // });
            defer.resolve(priv.getResult(variables, vars, config, response.result.values));
          })
          .error(function(response, status, headers, config) {
            defer.reject(response);
          });
        };

        var processFn = sampProcessFn ? sampProcessFn : defaultProcessFn;
        performPost(variables, config, defer, datasetName, processFn);
      };

      return dset;
    } // BaseDataset ends

    // fixed dataset type from db
    function DatabaseDataset() {
      // call super
      BaseDataset.call(this);

      var dset = this.dset,
      priv = this.privates;

      dset.type = function() {
        return 'database';
      };

      // 'variables' is a list
      dset.getVariables = function(variables, config) {
        var defer = $q.defer(),
        configDefined = !_.isUndefined(config);

        var empty = _.isEmpty(priv.samples),
        currentVariables = dset.variables(),
        intersection = _.intersection(currentVariables, variables),
        newVariables = _.difference(variables, intersection);

        if(empty) {
          // get all variables
          priv.getVariables(variables, config, defer, dset.name());
        } 
        else if( _.isEmpty(newVariables) ) {
          // nothing to done, everything already fetched
          defer.resolve(priv.getResult(variables, newVariables, config));
        } else {
          // fetch new variables
          priv.getVariables(newVariables, config, defer, dset.name());
        }
        return defer.promise;
      };

      return dset;
    }

    DatabaseDataset.prototype = _.create(BaseDataset.prototype, {
      'constructor': BaseDataset
    });

    function DerivedDataset() {
      // call super
      BaseDataset.call(this);

      var dset = this.dset,
      priv = _.extend(this.privates, {
        samplesByDataset: {}
      });

      dset.type = function() {
        return 'derived';
      };

      dset.injector = function(x) {
        priv.injector = x;
        return dset;
      };

      // get
      priv.getDatasets = function() {
        return _.keys(priv.samplesByDataset);
      };

      // 'variables' is a list
      dset.getVariables = function(variables, config) {
        var configDefined = !_.isUndefined(config),
        allDefer = $q.defer(),
        promises = [];

        _.each(priv.getDatasets(), function(dsetName) {
          var defer = $q.defer(),
          empty = _.isEmpty(priv.samples),
          currentVariables = dset.variables(dsetName),
          intersection = _.intersection(currentVariables, variables),
          newVariables = _.difference(variables, intersection);

          if(empty) {
            // get all variables
            priv.getVariables(variables, config, defer, dsetName, priv.processSamples);
          } 
          else if( _.isEmpty(newVariables) ) {
            // nothing to done, everything already fetched
            defer.resolve(priv.getResult(variables, newVariables, config));
          } else {
            // fetch new variables
            priv.getVariables(newVariables, config, defer, dsetName, priv.processSamples);
          }

          promises.push(defer.promise);
        });

        $q.all(promises).then(function succFn(resArray) {
          // concatenate results into one object and return it
          var retObj = {
            samples: {
              added: [],
              all: {}
            },
            variables: {
              added: []
            },
            dataset: dset
          };

          _.each(resArray, function(setResult) {
            retObj.samples.added = retObj.samples.added.concat(setResult.samples.added);
            retObj.variables.added = retObj.variables.added.concat(setResult.variables.added);
          });
          var all = _.chain(resArray)
          .map(function(obj) { return obj.samples.all; })
          .value();
          retObj.samples.all = _.merge.apply(this, all);
          retObj.variables.added = _.uniq(retObj.variables.added);

          allDefer.resolve(retObj);
        }, function errFn(res) {
          allDefer.reject(res);
        });
        return allDefer.promise;
      };

      priv.processSamples = function(addSamples, initial) {
        var copySample,
        initialCall = !_.isUndefined(initial) ? initial : false;
        _.each(addSamples, function(samp) {
          // shallow copy, otherwise this will mess up other datasets that have this sample
          if(initialCall) {
            priv.samplesByDataset[samp.dataset] = {};
          }
          copySample = angular.copy(samp);
          copySample.originalDataset = samp.dataset;
          copySample.dataset = dset.name();

          var key = priv.getKey(copySample);
          if(initialCall) {
            priv.samples[key] = copySample;
            priv.samplesByDataset[copySample.originalDataset][key] = copySample;
          } else {
            // extending variables for ONLY existing samples
            if(priv.samples[key]) {
              _.extend(priv.samples[key].variables, copySample.variables);
              priv.samplesByDataset[copySample.originalDataset][key] = copySample;
            } else {
              // outside scope of active samples for this set, do nothing
            }
          }
        });
      };

      // only set
      dset.samples = function(samples) {
        if(!arguments.length) { return priv.samples; }
        priv.samplesByDataset = {};
        priv.processSamples(samples, true);
        return dset;
      };

      return dset;
    }

    DerivedDataset.prototype = _.create(DerivedDataset.prototype, {
      'constructor': BaseDataset
    });

    // *****************************************************

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

      var defer = $q.defer(),
      DimensionService = $injector.get('DimensionService'),
      $state = $injector.get('$state'),
      activeVars = DimensionService.getPrimary().activeVariables(),
      isPrimary = $state.current.name == 'vis.som';

      // nothing to add if disabled
      if (!set.active()) {
        defer.resolve('disabled');
      } else if (isPrimary && activeVars.length === 0) {
        // this is the case when no windows are present but selections are made
        // on the datasets. Just update the dimensionFilter...
        defer.resolve('empty');
      } else {

        // var promises = [];
        var dataWasAdded = false;

        set.getVariables(activeVars).then(function sucFn(obj) {

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
    service.getVariableData = function(variables, windowHandler, config) {
      function allDatasets() {
        // check every set
        _.each(service.activeSets(), function(set) {
          setPromises.push(set.getVariables(variables, config));
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

      function oneDataset(dataset) {
        dataset.getVariables(variables, config)
        .then(function succFn(result) {
          var dataAdded = windowHandler.getDimensionService().addVariableData(result);
          // if (dataAdded && addData) {
          //   windowHandler.getDimensionService().rebuildInstance();
          // }
          defer.resolve(result);
        }, function errFn(result) {
          defer.reject(result);
        });
      }



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
      getRawData = configDefined && config.getRawData,
      singleDataset = configDefined && config.singleDataset && !_.isUndefined(config.dataset);
      if(configDefined && config.addToDimensionService === false) {
        addData = false;
      }

      if (_.isEmpty(variables)) {
        // do nothing
        defer.resolve();
      } else {
        if(singleDataset) {
          oneDataset(config.dataset);
        } else {
          allDatasets();
        }
      }

      return defer.promise;
    };

    service.removeDerived = function(set) {
      function emitEvent(dset) {
        $rootScope.$emit('dataset:derived:remove', dset);
      }

      var DimensionService = $injector.get('DimensionService');
      if(set.type() !== 'derived') {
        throw new Error('wrong set type');
      }

      emitEvent(set);

      var dataRemoved = DimensionService.getPrimary().removeVariableData({
        samples: set.samples()
      });
      delete that.sets[set.name()];
      if(dataRemoved) {
        DimensionService.getPrimary().rebuildInstance();
      }
      $injector.get('WindowHandler').reRenderVisible({ compute: true });
    };

    service.createDerived = function(config) { //name) {
      function deselectOthers() {
        _.each(service.getSets(), function(set) {
          set.active(false);
        });
      }

      function removeFilters() {
        var FilterService = $injector.get('FilterService');
        FilterService.resetFilters({ spareSOM: true, force: false });
      }

      function emitEvent(dset) {
        $rootScope.$emit('dataset:derived:add', dset);
      }

      function getSamples(circles) {
        function anyCircleHas(sample) {
          return _.any(circles, function(filter) {
            return filter.contains(sample.bmus);
          });
        }
        var DimensionService = $injector.get('DimensionService'),
        primary, secondary, sampleDimension, samples,
        hasCircles = !_.isUndefined(circles) && _.size(circles) > 0;
        if(hasCircles) {
          secondary = DimensionService.getSecondary();
          sampleDimension = secondary.getSampleDimension();
          samples = _.filter(sampleDimension.get().top(Infinity), function(sample) {
            return anyCircleHas(sample);
          });
        } else {
          primary = DimensionService.getPrimary();
          sampleDimension = primary.getSampleDimension();
          samples = sampleDimension.get().top(Infinity);
        }
        return samples;
      }

      var name = config.name,
      circles = config.circles || undefined;

      if(that.sets[name]) {
        throw new Error('Dataset name exists');
      } else {
        var samples = getSamples(circles),
        DimensionService = $injector.get('DimensionService'),
        primary = DimensionService.getPrimary(),
        dataWasAdded;

        var derived = new DerivedDataset()
        .name(name)
        .size(samples.length)
        .color(that.colors(name))
        .samples(samples)
        .active(true);

        if(circles) {
          deselectOthers();
          that.sets[name] = derived;
          service.updateDataset();
        } else {
          deselectOthers();
          that.sets[name] = derived;
          removeFilters();
          service.updateDataset();
        }

        // deselectOthers();
        // that.sets[name] = derived;
        // removeFilters();
        // service.updateDataset();


        // add to dimension service
        dataWasAdded = primary.addVariableData({
          dataset: derived,
          samples: {
            all: derived.samples(),
            added: []
          },
          variables: {
            added: []
          }
        });
        if(dataWasAdded) {
          primary.rebuildInstance();
        }

        emitEvent(derived);
        $injector.get('WindowHandler').reRenderVisible({ compute: true });

        return derived;
      }
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
        return set.name();
      });
    };

    service.updateDataset = function(set) {
      $injector.get('DimensionService').getPrimary().updateDatasetDimension();
      // that.dimensionService.updateDatasetDimension();
    };

    service.activeSets = function() {
      return _.filter(that.sets, function(set) {
        return set.active();
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