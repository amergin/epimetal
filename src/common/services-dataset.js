angular.module('services.dataset', ['services.notify',
  'ui.router.state',
  'services.variable',
  'ext.d3',
  'ext.lodash'
])

.constant('DATASET_URL_FETCH_DATASETS', '/API/datasets')
.constant('DATASET_URL_FETCH_MULTIPLE_VARS', '/API/list/')

.factory('DatasetFactory', function DatasetFactory($http, $q, $injector, $rootScope, NotifyService, VariableService,
  d3, _, lodashEq,
  DATASET_URL_FETCH_DATASETS, DATASET_URL_FETCH_MULTIPLE_VARS) {

  // privates
  var that = this;
  that.sets = {};
  that.variables = [];
  that.colors = d3.scale.category20();
  that.classedVariables = {};
  that.variableCache = {};

  // primary from dimension service
  that.dimensionService = null;

  var initDatasets = _.once(function() {
    var deferred = $q.defer();
    var res = {};
    $http.get(DATASET_URL_FETCH_DATASETS, {
        cache: true
      })
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
        if (!arguments.length) {
          return priv.name;
        }
        priv.name = x;
        return dset;
      };

      dset.size = function(x) {
        if (!arguments.length) {
          return priv.size;
        }
        priv.size = x;
        return dset;
      };

      dset.color = function(x) {
        if (!arguments.length) {
          return priv.color;
        }
        priv.color = x;
        return dset;
      };

      dset.toggle = function() {
        priv.active = !priv.active;
        return dset;
      };

      dset.active = function(x) {
        if (!arguments.length) {
          return priv.active;
        }
        priv.active = x;
        return dset;
      };

      dset.variables = function() {
        return _.chain(priv.samples)
          .sample(4)
          .map(function(d) {
            return _.keys(d.variables);
          })
          .flatten()
          .uniq()
          .map(function(v) {
            return VariableService.getVariable(v);
          })
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

      dset.removeCustomVariable = function(variable) {
        var samp,
        name = variable.name();
        for(var sampid in priv.samples) {
          samp = priv.samples[sampid];
          if(samp.variables[name]) {
            delete samp.variables[name];
          }
        }
        return dset;
      };

      priv.state = function() {
        return {
          name: dset.name(),
          color: dset.color(),
          size: dset.size(),
          active: dset.active()          
        };
      };

      // protected functions
      priv.getKey = function(samp) {
        return [samp.dataset, samp.sampleid].join("|");
      };

      // separates the input variables into db vars and custom vars
      priv.separateVariables = function(variables) {
        var ret = { 'db': [], 'custom': [] };
        _.each(variables, function(v) {
          ret[v.type()].push(v);
          if( v.type() == 'custom' ) {
            ret['db'].push.apply(ret['db'], v.dependencies());
          }
        });
        return ret;
      };

      priv.getResult = function(newVariables, config, addedValues) {
        function getAllVariables() {
          var lookup = {}, samp;
          for(var sampid in priv.samples) {
            samp = priv.samples[sampid];
            lookup[priv.getKey(samp)] = samp;
          }
          return lookup;
        }

        var retObj = {
          samples: {
            added: false,
            all: []
          },
          variables: {
            added: newVariables
          },
          dataset: dset
        };

        if (addedValues) {
          retObj.samples.added = addedValues;
        }

        if(config.getRawData === true) {
          retObj.samples.all = getAllVariables();          
        }

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

        var performPost = function(normalVars, config, defer, datasetName, processFn, callback, separated) {
          $http.post(DATASET_URL_FETCH_MULTIPLE_VARS, {
              variables: Utils.pickVariableNames(normalVars),
              dataset: datasetName
            }, {
              cache: true
            })
            .success(function(response) {
              processFn(response.result.values);
              var addedVars = _.chain(separated).values().flatten().value();
              if(callback) { callback(); }
              defer.resolve(priv.getResult(addedVars, config, true));
            })
            .error(function(response, status, headers, config) {
              defer.reject(response);
            });
        };

        function customVarCallback(vars) {
          // adds the custom var value to the sample
          _.each(vars, function(v) {
            var name = v.name();
            _.each(priv.samples, function(samp, id) {
              if(!samp.variables[name]) {
                samp.variables[name] = v.evaluate(samp);
              }
            });
          });
        }

        function process() {
          var separated = priv.separateVariables(variables);

          if( separated['db'] && separated['db'].length ) {
            // for the normal vars, request to API
            performPost(separated['db'], config, defer, datasetName, processFn, 
            function() {
              if(separated['custom'].length) {
                customVarCallback(separated['custom']);
              }
            }, 
            separated);
          } else {
            // no  normal vars, proceed with custom vars now
            customVarCallback(separated['custom']);
            defer.resolve(priv.getResult(separated['custom'], config, true));
          }
        }

        var processFn = sampProcessFn ? sampProcessFn : defaultProcessFn;
        process();
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

    dset.state = function() {
      return _.extend(priv.state(), {
        type: dset.type()
      });
    };

    // 'variables' is a list
    dset.getVariables = function(variables, config) {
      var defer = $q.defer(),
        configDefined = !_.isUndefined(config);

      var samplesEmpty = _.isEmpty(priv.samples),
        currentVariables = dset.variables(),
        intersection = lodashEq.intersection(currentVariables, variables),
        newVariables = lodashEq.difference(variables, intersection);

      if (samplesEmpty) {
        // get all variables
        priv.getVariables(variables, config, defer, dset.name());
      } else if (_.isEmpty(newVariables)) {
        // nothing to done, everything already fetched
        defer.resolve(priv.getResult(newVariables, config, false));
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

    dset.state = function() {
      return _.extend(priv.state(), {
        type: dset.type(),
        samples: _.map(priv.samples, function(samp) { 
          return { 
            dataset: samp.originalDataset, 
            sampleid: samp.sampleid 
          }; 
        })
      });
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
      function concatenate(resArray) {
        var results = {};
        _.each(resArray, function(obj) {
          for(var key in obj.samples.all) {
            if(!results[key]) { results[key] = obj.samples.all[key]; }
          }
        });
        return results;
      }

      var configDefined = !_.isUndefined(config),
        allDefer = $q.defer(),
        promises = [];

      _.each(priv.getDatasets(), function(dsetName) {
        var defer = $q.defer(),
          empty = _.isEmpty(priv.samples),
          currentVariables = dset.variables(dsetName),
          intersection = lodashEq.intersection(currentVariables, variables),
          newVariables = lodashEq.difference(variables, intersection);

        if (empty) {
          // get all variables
          priv.getVariables(variables, config, defer, dsetName, priv.processSamples);
        } else if (_.isEmpty(newVariables)) {
          // nothing to do, everything already fetched
          defer.resolve(priv.getResult(newVariables, config, false));
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
            added: _.chain(resArray).map(function(d) { return d.samples.added; }).any().value(),
            all: {}
          },
          variables: {
            added: []
          },
          dataset: dset
        };

        if(config.getRawData === true) {
          _.each(resArray, function(setResult) {
            retObj.variables.added = retObj.variables.added.concat(setResult.variables.added);
          });
          var all = _.chain(resArray)
            .map(function(obj) {
              return obj.samples.all;
            })
            .value();
          retObj.samples.all = concatenate(resArray);
          retObj.variables.added = _.uniq(retObj.variables.added);
        }

        allDefer.resolve(retObj);
      }, function errFn(res) {
        allDefer.reject(res);
      });
      return allDefer.promise;
    };

    priv.processSamples = function(addSamples, initial) {
      function setOrigin(sample, source) {
        var dsetName = source.dataset,
          isDerived = service.getSet(dsetName).type() == 'derived';

        if (isDerived) {
          // do nothing, preserve original
          return;
        } else {
          sample.originalDataset = dsetName;
        }
      }

      function setByDataset(sample) {
        var obj = {},
          isDerived = service.getSet(sample.dataset).type() == 'derived',
          name;

        if (isDerived) {
          name = sample.originalDataset;
        } else {
          name = sample.dataset;
        }
        obj[name] = {};
        _.defaults(priv.samplesByDataset, obj);
      }

      function placeSample(sample) {
        var name = sample.originalDataset;
        key = priv.getKey(sample);
        priv.samplesByDataset[name][key] = sample;
      }

      var copySample,
      initialCall = !_.isUndefined(initial) ? initial : false;

      _.each(addSamples, function(samp) {
        if (initialCall) {
          setByDataset(samp);
        }

        // shallow copy, otherwise this will mess up other datasets that have this sample
        copySample = angular.extend({}, samp);//angular.copy(samp);
        setOrigin(copySample, samp);
        // copySample.originalDataset = samp.dataset;
        copySample.dataset = dset.name();

        var key = priv.getKey(copySample);
        if (initialCall) {
          priv.samples[key] = copySample;
          placeSample(copySample);
        } else {
          // extending variables for ONLY existing samples
          if (priv.samples[key]) {
            _.extend(priv.samples[key].variables, copySample.variables);
            placeSample(copySample);
          } else {
            // outside scope of active samples for this set, do nothing
          }
        }
      });
    };

    // only set
    dset.samples = function(samples) {
      if (!arguments.length) {
        return priv.samples;
      }
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

  service.getColorScale = function() {
    return that.colors;
  };

  service.getDatasets = function() {
    return initDatasets();
  };

  // this function checks if new variables need to be fetched
  // for datasets that have not been previously selected
  // Called on dataset toggling!
  service.checkActiveVariables = function(set) {

    var defer = $q.defer(),
      DimensionService = $injector.get('DimensionService'),
      $state = $injector.get('$state'),
      activeVars = DimensionService.getPrimary().activeVariables(),
      isPrimary = $state.current.name == 'vis.explore';

    // nothing to add if disabled
    if (!set.active()) {
      defer.resolve('disabled');
    }
    else if(activeVars.length === 0) {
      if(isPrimary) {
        // this is the case when no windows are present but selections are made
        // on the datasets. Just update the dimensionFilter...
        defer.resolve('empty');
      } else {
        defer.resolve('enabled');
      }
    }
    else {
      var dataWasAdded = false;

      set.getVariables(activeVars, { getRawData: true }).then(function sucFn(obj) {
        // if(!obj.samples.added) {
        //   defer.resolve('enabled');
        //   return;
        // }

        var config = _.extend(obj, {});//, { force: true });

        var dataAdded = that.dimensionService.addVariableData(config);
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
          var config = setObj;

          if (getRawData) {
            // combine result samples
            _.extend(result.samples, setObj.samples.all);
          }

          if(!addData) { return; }
          else {
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

    if(!configDefined) {
      config = {};
    }

    var setPromises = [],
      addData = true,
      getRawData = configDefined && config.getRawData,
      singleDataset = configDefined && config.singleDataset && !_.isUndefined(config.dataset);
    if (configDefined && config.addToDimensionService === false) {
      addData = false;
    }

    if (_.isEmpty(variables)) {
      // do nothing
      defer.resolve();
    } else {
      if (singleDataset) {
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
    if (set.type() !== 'derived') {
      throw new Error('wrong set type');
    }

    emitEvent(set);

    var dataRemoved = DimensionService.getPrimary().removeVariableData({
      samples: set.samples()
    });
    delete that.sets[set.name()];
    if (dataRemoved) {
      DimensionService.getPrimary().rebuildInstance();
    }
    $injector.get('WindowHandler').reRenderVisible({
      compute: true
    });
  };

  service.createDerived = function(config) {
    function deselectOthers() {
      _.each(service.getSets(), function(set) {
        set.active(false);
      });
    }

    function removeFilters() {
      var FilterService = $injector.get('FilterService');
      FilterService.resetFilters({
        spareSOM: true,
        force: false
      });
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
      if (hasCircles) {
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

    if (that.sets[name]) {
      throw new Error('Dataset name exists');
    } 

    var samples = config.samples || getSamples(circles),
      DimensionService = $injector.get('DimensionService'),
      primary = DimensionService.getPrimary(),
      dataWasAdded;

    var derived = new DerivedDataset()
      .name(name)
      .size(samples.length)
      .color(config.color || that.colors(name))
      .samples(samples)
      .active(config.setActive);

    if (circles) {
      // deselectOthers();
      that.sets[name] = derived;
      service.updateDataset();
    } else {
      deselectOthers();
      that.sets[name] = derived;
      removeFilters();
      service.updateDataset();
    }

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
    if (dataWasAdded) {
      primary.rebuildInstance();
    }

    emitEvent(derived);
    $injector.get('WindowHandler').reRenderVisible({
      compute: true
    });
    return derived;
  };

  service.removeCustomVariable = function(variable) {
    _.each(that.sets, function(set, name) {
      set.removeCustomVariable(variable);
    });
    return service;
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

});