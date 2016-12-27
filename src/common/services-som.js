angular.module('services.som', [
  'akangas.services.som',
  'services.dataset',
  'services.variable',
  'services.dimensions',
  'services.notify',
  'services.tab',
  'services.task-handler',
  'ext.d3',
  'ext.lodash',
  'ext.core-estimator'
])

.constant('SOM_DEFAULT_SIZE', {
  rows: 7, cols: 9
})
.constant('SOM_MIN_SAMPLE_COUNT', 10)
.constant('SOM_DEFAULT_THREADS', 4)
.constant('SOM_TRAIN_GET_URL', '/API/som/<%= hash %>')
.constant('SOM_TRAIN_POST_URL', '/API/som')
.constant('SOM_PLANE_GET_URL', '/API/som/plane/<%= somHash %>/<%= variable %>')
.constant('SOM_PLANE_POST_URL', '/API/som/plane')

.run(function(SOMComputeService, coreEstimator, SOM_DEFAULT_THREADS, $log) {
  var _availableCores;

  coreEstimator.get().then(function succFn(cores) {
    _availableCores = cores;
    }, function errFn() {
      _availableCores = SOM_DEFAULT_THREADS;
    })
    .finally(function() {
      var absUrl = window.location.protocol + '//' + window.location.host + window.location.pathname,
      dependencies = [
        absUrl + 'assets/lodash.min.js',
        absUrl + 'assets/utilities.som.js'
      ];

      $log.info(_availableCores + " cores are estimated for SOM Computation");

      SOMComputeService.noWorkers(_availableCores)
      .dependencies(dependencies);
    });

})

.factory('SOMService', function SOMService(SOMComputeService, VariableService, WindowHandler, $timeout, 
  $injector, $rootScope, NotifyService, $http, $log, $q, DatasetFactory, TabService,
  d3, _, lodashEq,
  SOM_DEFAULT_SIZE, SOM_MIN_SAMPLE_COUNT, 
  SOM_TRAIN_GET_URL, SOM_TRAIN_POST_URL, SOM_PLANE_GET_URL, SOM_PLANE_POST_URL) {

  var that = this;

  this.som = {};
  this.bmus = [];
  this.trainSamples = [];
  this.defaultPlanes = [];
  that.inProgress = false;
  that.description = {
    'datasets': [],
    'variables': [],
    'N': 0
  };
  that.pivotVariable = null;
  that.pivotVariableEnabled = false;

  VariableService.getSOMDefaultInputVariables().then(function(vars) {
    that.trainVariables = vars;
  });

  var initPivotSettings = _.once(function() {
    var defer = $q.defer();

    VariableService.getDefaultPivotSettings().then(function(settings) {
      that.pivotVariableEnabled = settings.enabled;
      that.pivotVariable = settings.variable;
      defer.resolve();
    });

    return defer.promise; 
  });

  initPivotSettings();

  
  that.dimensionService = undefined;
  that.sampleDimension = undefined;

  var _queueWindows = [];
  var _cancelled = false;
  var service = {};
  var _size = SOM_DEFAULT_SIZE;

  function hasCustomVars(vars) {
    for(var i=0; i < vars.length; ++i) {
      if(vars[i].type() == 'custom') { return true; }
    }
    return false;
  }

  function clearDescription() {
    that.description['N'] = 0;
    that.description['variables'] = [];
    that.description['datasets'] = [];
  }

  service.inProgress = function() {
    return that.inProgress;
  };

  service.somId = function(x) {
    if(!arguments.length) { return that._dbId; }
    that._dbId = x;
    return service;
  };

  service.hasExisting = function() {
    return !_.isEmpty(that.trainSamples) && !_.isEmpty(that.som);
  };

  // service.empty = function() {
  //   return _.isEmpty(that.som);
  // };

  service.rows = function(x) {
    if (!arguments.length) { return _size.rows; }
    _size.rows = x;
    return service;
  };

  service.description = function(x) {
    if(!arguments.length) { return that.description; }
    that.description = x;
    return service;
  };

  service.columns = function(x) {
    if (!arguments.length) { return _size.cols; }
    _size.cols = x;
    return service;
  };

  service.bmus = function(x) {
    if (!arguments.length) {
      return that.bmus;
    }
    that.bmus = x;
    return service;
  };

  service.defaultPlanes = function() {
    var defer = $q.defer();

    VariableService.getSOMDefaultPlanes().then(function succFn(vars) {
      that.defaultPlanes = vars;
      defer.resolve(vars);
    }, function errFn(res) {
      defer.reject(res);
    });

    return defer.promise;
  };

  service.cancelled = function(x) {
    if(!arguments.length) { return _cancelled; }
    _cancelled = x;
    return service;
  };

  service.setDimensionService = function(dimensionService) {
    that.dimensionService = dimensionService;
    that.sampleDimension = that.dimensionService.getSampleDimension().get();
    return service;
  };

  service.getDimensionService = function() {
    return that.dimensionService;
  };

  service.cancel = function() {
    function removeQueueWindows() {
      _.each(_queueWindows, function(win) {
        win.remove();
      });
      _queueWindows = [];
    }
    function removeExistingWindows() {
      WindowHandler.removeAllVisible();
    }
    SOMComputeService.cancel();

    var TaskHandlerService = $injector.get('TaskHandlerService');
    TaskHandlerService.circleSpin(false);
    TaskHandlerService.circleSpinValue(0);
    TabService.lock(false);

    removePrevious();
    removeQueueWindows();
    removeExistingWindows();

    that.inProgress = false;
    _cancelled = true;
    return service;
  };

  service.pivotVariableEnabled = function(x) {
    if(!arguments.length) { return that.pivotVariableEnabled; }
    that.pivotVariableEnabled = x;
    return service;
  };

  service.pivotVariable = function(variable) {
    if(!arguments.length) { return that.pivotVariable; }

    if(that.pivotVariable == variable) {
      // same, do nothing
      return false;
    }

    that.pivotVariable = variable;
    $log.info("SOM pivot variable has changed", variable);
    return true;
  };

  service.trainVariables = function(variables) {
    function sameVars() {
      var inter = lodashEq.intersection(variables, that.trainVariables),
      diff = lodashEq.difference(variables, inter),
      noChange =  (that.trainVariables.length - inter.length) === 0;
      return diff.length === 0 && noChange;
    }

    if(!arguments.length) { return that.trainVariables; }

    var currEmpty = _.isUndefined(that.trainVariables) || that.trainVariables.length === 0;

    if (currEmpty || sameVars()) {
      return;
    }

    $log.info("SOM train variables have changed.");

    that.trainVariables = variables;
    // recompute
    var windowHandler = WindowHandler.get('vis.som');
    service.getSOM(windowHandler);
    return service;
  };

  function removePrevious() {
    // remove previous computation
    that.som = {};
    that.bmus = [];
  }

  service.getSOM = function(windowHandler, hashId) {
    var TaskHandlerService = $injector.get('TaskHandlerService');

    function computationNeeded() {
      if (!that.sampleDimension) {
        // early invoke, even before dimensionservice is initialized
        return false;
      }
      var sampleCount = that.sampleDimension.groupAll().value();
      if (sampleCount === 0) {
        // no samples

        return false;
      } else if (sampleCount < SOM_MIN_SAMPLE_COUNT) {
        NotifyService.addSticky('Error', 'Please select at least ' + SOM_MIN_SAMPLE_COUNT + ' samples.', 'error');
        return false;
      } else if (service.inProgress()) {
        return false;
      }
      return true;
    }

    function getData(skipNaNs) {
      var variables = that.trainVariables,
      retObj = {
        samples: []
      };

      if(service.pivotVariableEnabled()) {
        variables = that.trainVariables.concat(that.pivotVariable);
      }

      var variableNames = Utils.pickVariableNames(variables);
      retObj.columns = new Array(variables.length);

      // deduplicate the sample collection used in the calculation
      var deDuplicated = _.unique(that.sampleDimension.top(Infinity), false, function(d) { 
        var arr = [];
        if(d.originalDataset) { arr = [d.originalDataset, d.sampleid]; }
        else { arr = [d.dataset, d.sampleid]; }
        return arr.join("|");
      }),
      obj;

      /* jshint ignore:start */
      for(var ind = 0; ind < deDuplicated.length; ++ind) {
        obj = deDuplicated[ind];
        var sampValues = _.chain(obj.variables)
          // pick only the variable names that are used
          .pick(variableNames)
          // pick var name and value
          .map(function(val, key) {
            return [key, val];
          })
          // sort by name
          .sortBy(_.first)
          // pick value
          .map(_.last)
          // get the output of this chain
          .value(),
          // is any of the values on this sample 
          containsNaNs = _.some(sampValues, function(d) {
            return _.isNaN(+d);
          }),
          sampleId;

        // don't record this one
        if (skipNaNs && containsNaNs) {
          return;
        }

        sampleId = { 
          'sampleid': obj.sampleid, 
          'dataset': obj.dataset //obj.originalDataset ? obj.originalDataset : obj.dataset
        };

        retObj.samples.push(sampleId);
        _.each(sampValues, function(d, i) {
          // initialize the array on first time
          if (_.isUndefined(retObj.columns[i])) {
            retObj.columns[i] = [];
          }
          retObj.columns[i].push(sampValues[i]);
        });

      }

      if(service.pivotVariableEnabled()) {
        var pivotColumnIndex = _.chain(variableNames)
        .sortBy(_.first)
        .indexOf(that.pivotVariable.name())
        .value();

        // pulls = removes the pivot index from the columns, placing it
        // on the result object
        retObj.pivotColumn = _.pullAt(retObj.columns, pivotColumnIndex)[0];
      }

      /* jshint ignore:end */
      return retObj;
    }

    function doCall() {
      function getHash(samples, variables, rows, cols) {
        // var p1 = performance.now();
        var spark = new SparkMD5(),
        dataset;
        for(var i = 0; i < samples.length; ++i) {
          dataset = samples[i].originalDataset ? samples[i].originalDataset : samples[i].dataset;
          spark.append(dataset + "|" + samples[i].sampleid);
        }
        spark.append( _.sortBy(variables) );
        spark.append(rows);
        spark.append(cols);
        spark.append(that.pivotVariableEnabled);
        if(that.pivotVariableEnabled) {
          spark.append(that.pivotVariable.name());
        }
        // var p2 = performance.now();
        // console.log("hash creation took = ", p2-p1);
        return spark.end();
      }

      function sendNewTrain(somObject, callback) {
        // don't send cust vars to DB
        if( hasCustomVars(that.trainVariables) ) { 
          callback(); 
          return; 
        }

        var rawTrainVarNames = Utils.pickVariableNames(that.trainVariables),
        pivotVariable = service.pivotVariable() ? service.pivotVariable().name() : undefined;
        $http.post(SOM_TRAIN_POST_URL, {
          bmus: Array.prototype.slice.call(somObject.bmus),
          weights: Array.prototype.slice.call(somObject.weights),
          codebook: Array.prototype.slice.call(somObject.codebook),
          variables: rawTrainVarNames,
          distances: Array.prototype.slice.call(somObject.distances),
          neighdist: somObject.neighdist,
          epoch: somObject.epoch,
          rows: somObject.rows,
          cols: somObject.cols,
          description: that.description,
          pivot: {
            enabled: service.pivotVariableEnabled(),
            variable: pivotVariable
          },
          hash: getHash(data.samples, rawTrainVarNames, somObject.rows, somObject.cols)
        }, { cache: false })
        .then(function succFn(response) {
          that._dbId = response.data.result.id;
          $log.info("Sending new train object succeeded", that._dbId);
        }, function errFn(response) {
          $log.error("Sending new train object FAILED.");
        })
        .finally(function() {
          callback();
        });
      }

      function doTrain(data, defer) {
        function description(n) {
          function activeDsetNames() {
            return _.chain(DatasetFactory.getSets())
            .filter(function(dset) { 
              return dset.active(); 
            })
            .map(function(dset) {
              return dset.name();
            })
            .value();
          }

          function trainVariables() {
            return _.map(service.trainVariables(), function(v) { return v.name(); });
          }
          service.description({
            'datasets': activeDsetNames(),
            'variables': trainVariables(),
            'N': n
          });
        }

        TaskHandlerService.circleSpin(true);
        NotifyService.addTransient('Starting SOM computation', 'The computation may take a while.', 'info');
        windowHandler.spinAll();

        if(service.pivotVariableEnabled() === true) {
          $log.info("Creating SOM train with pivot enabled.");

          SOMComputeService.create(service.rows(), service.columns(), data.samples, data.columns, data.pivotColumn)
          .then(function succFn(result) {
            that.som = result.som;

            // do training
            SOMComputeService.train(that.som).then(function succFn(somObject) {
              NotifyService.addTransient('SOM computation ready', 'The submitted SOM computation is ready', 'success');
              that.bmus = SOMComputeService.get_formatter_bmus(that.som);
              that.dimensionService.addBMUs(that.bmus);


              description(that.som.N);

              TabService.lock(false);
              that.inProgress = false;
              sendNewTrain(that.som, function callback() {
                // this will force existing planes to redraw
                $rootScope.$emit('dataset:SOMUpdated', that.som);
                defer.resolve(that.som);
              });
                        
            }, function errFn(result) {
              var message = '(Message)';
              NotifyService.addTransient('SOM computation failed', message, 'error');
              TabService.lock(false);
              that.inProgress = false;
              defer.reject();
            }, function notifyFn(progress) {
              TaskHandlerService.circleSpinValue(progress);
            })
            .finally(function() {
              TaskHandlerService.circleSpin(false);
              TaskHandlerService.circleSpinValue(0);
              windowHandler.stopAllSpins();
            });

          }, function errFn(result) {
            $log.error("Pivot variable create failed, probably incorrect formatting?");
            NotifyService.addSticky(
              'SOM computation failed', 
              'Please ensure the pivot variable contains values for each column.',
              'error');
            service.cancel();
            defer.reject();
          });


        } else {
          SOMComputeService.create(service.rows(), service.columns(), data.samples, data.columns)
          .then(function succFn(result) {
            that.som = result.som;

            // do training
            SOMComputeService.train(that.som).then(function succFn(somObject) {
              NotifyService.addTransient('SOM computation ready', 'The submitted SOM computation is ready', 'success');
              that.bmus = SOMComputeService.get_formatter_bmus(that.som);
              that.dimensionService.addBMUs(that.bmus);


              description(that.som.N);

              TabService.lock(false);
              that.inProgress = false;
              sendNewTrain(that.som, function callback() {
                // this will force existing planes to redraw
                $rootScope.$emit('dataset:SOMUpdated', that.som);
                defer.resolve(that.som);
              });
                        
            }, function errFn(result) {
              var message = '(Message)';
              NotifyService.addTransient('SOM computation failed', message, 'error');
              TabService.lock(false);
              that.inProgress = false;
              defer.reject();
            }, function notifyFn(progress) {
              TaskHandlerService.circleSpinValue(progress);
            })
            .finally(function() {
              TaskHandlerService.circleSpin(false);
              TaskHandlerService.circleSpinValue(0);
              windowHandler.stopAllSpins();
            });

          }, function errFn(result) {
            $log.error("Pivot variable create failed, probably incorrect formatting?");
            NotifyService.addSticky(
              'SOM computation failed', 
              'Please ensure the pivot variable contains values for each column.',
              'error');
            service.cancel();
            defer.reject();
          });          
        }
      }

      removePrevious();

      var skipNaNs = false,
      data = getData(skipNaNs);
      that.trainSamples = data.samples;

      that.inProgress = true;     

      // ask from the server if the train result is already stored in the DB
      var idHash = getHash(that.trainSamples, Utils.pickVariableNames(that.trainVariables), service.rows(), service.columns());
      $http.get( _.template(SOM_TRAIN_GET_URL)({ hash: idHash }), 
        // don't cache: otherwise it'll store the first 'not found' reply and
        // will result in subsequent calls to be always re-calculated
        { cache: false }
      )
      .then(function succFn(response) {
        if(response.status == 200) {
          // object found from DB
          populateFromDb(response.data.result, data, defer);
        } else if(response.status == 204) {
          // not found, compute afresh
          doTrain(data, defer);
        }
      }, function errFn(response) {

      }, function notifyFn(msg) {
        console.log("notify", msg);
      });

    }

    function doExisting(hashId, defer) {
      var skipNaNs = false;
      var data = getData(skipNaNs);
      that.trainSamples = data.samples;

      $http.get( _.template(SOM_TRAIN_GET_URL)({ hash: hashId }), 
        // don't cache: otherwise it'll store the first 'not found' reply and
        // will result in subsequent calls to be always re-calculated
        { cache: false }
      )
      .then(function succFn(response) {
        if(response.status == 200) {
          // object found from DB
          populateFromDb(response.data.result, data, defer);
        } else if(response.status == 204) {
          // not found, compute afresh
          doTrain(data, defer);
        }
      }, function errFn(response) {

      }, function notifyFn(msg) {
        console.log("notify", msg);
      })
      .finally(function() {
        that.inProgress = false;
      });

    }

    function populateFromDb(result, data, defer) {
      var id = result.id,
      dbObject = result.data;
      $log.info("Populating SOM train from DB object", id);
      that.som = SOMComputeService.init(dbObject.rows, dbObject.cols, data.samples,
        dbObject.bmus, dbObject.codebook, dbObject.distances, dbObject.weights);
      that._dbId = id;
      that.bmus = SOMComputeService.get_formatter_bmus(that.som);
      that.dimensionService.addBMUs(that.bmus);

      service.description(result.data.description || {});

      service.pivotVariableEnabled(result.data.pivotEnabled);
      if(result.data.pivotEnabled) {
        service.pivotVariable(VariableService.getVariable(result.data.pivotVariable));
      }

      $rootScope.$emit('dataset:SOMUpdated', that.som);

      TabService.lock(false);
      that.inProgress = false;
      TaskHandlerService.circleSpin(false);
      TaskHandlerService.circleSpinValue(0);

      defer.resolve(that.som);
    }


    var defer = $q.defer();

    if(hashId) {
      TabService.lock(true);
      that.inProgress = true;
      windowHandler.getDimensionService().clearFilters();
      DatasetFactory.getVariableData(that.trainVariables, windowHandler, {
        getRawData: true
      })
      .then(function succFn(res) {
        doExisting(hashId, defer);
      });
    }

    else if(!computationNeeded()) {
      $log.info("SOM computation deemed not needed, not doing anything.");
      $timeout(function() {
        defer.resolve('not_needed');
      }, 5);

    } else {
      $log.info("Needs SOM computation, starting.");
      TabService.lock(true);
      that.inProgress = true;

      // important: without clearing filters there's a risk only the sample that
      // are within the circles get passed
      windowHandler.getDimensionService().clearFilters();

      initPivotSettings().then(function() {
        var variables = that.trainVariables;
        if(service.pivotVariableEnabled()) {
          variables = variables.concat(that.pivotVariable);
        }

        // prefetch data and store it in the dimensionservice of that particular handler
        DatasetFactory.getVariableData(variables, windowHandler)
        .then(function succFn(res) {
          doCall();
        });

      });

    }
    return defer.promise;
  };

  service.getPlane = function(testVar, windowObject, notifyFunction) {
    function getThreadData(variable, skipNaNs) {
      // function inTrainSamples(sample) {
      //   return _.any(that.trainSamples, function(d) {
      //     return _.isEqual(d, sample);
      //   });
      // }

      var data = [], sampValue, notNumber, sampleid;
      var deDuplicated = _.unique(that.sampleDimension.top(Infinity), false, function(d) { 
        return [d.originalDataset || d.dataset, d.sampleid].join("|");
      });

      _.each(deDuplicated, function(obj, ind) {
        sampValue = +obj.variables[variable];
        notNumber = isNaN(sampValue);

        if(skipNaNs && notNumber) { return; }

        data.push(sampValue);
      });
      return data;
    }

    function doCall() {
      function sendNewPlane(plane) {
        if(hasCustomVars([testVar])) { return; }
        plane = _.clone(plane);
        $http.post(SOM_PLANE_POST_URL, {
          variable: testVar.name(),
          plane: _.assign(plane, { variable: plane.variable.name() }),
          som: that._dbId
        }, { cache: false })
        .then(function succFn(response) {
          $log.info("Sending new plane object succeeded");
        }, function errFn(response) {
          $log.error("Sending new plane object FAILED.");
        });
      }

      function populateFromDb(data) {
        TabService.lock(false);
        that.inProgress = false;
        // transform to a var meta object
        _.assign(data.plane, { variable: VariableService.getVariable(data.plane.variable) });
        defer.resolve(data.plane);
      }

      function doPlane() {
        var skipNaNs = false;
        _queueWindows.push(windowObject);
        var threadData = getThreadData(testVar.name(), skipNaNs);

        SOMComputeService.calculate_component_plane(that.som, that.trainSamples, threadData, testVar)
        .then(function succFn(result) {
          sendNewPlane(result.plane);
          defer.resolve(result.plane);
        }, function errFn(result) {
          TabService.lock(false);
          that.inProgress = false;
          $log.error('Plane computation of variable ' + testVar + ' failed');
          defer.reject('Plane computation of variable ' + testVar + ' failed');
        }, function notifyFn(progress) {
          notifyFunction(progress);
        })
        .finally(function() {
          _.remove(_queueWindows, function(win) { return win == windowObject; }); 
          TabService.lock(false);
          that.inProgress = false;
        });
      }

      $http.get( _.template(SOM_PLANE_GET_URL)({ somHash: that._dbId, variable: testVar.name() }), 
        { cache: false }
      )
      .then(function succFn(response) {
        if(response.status == 200) {
          // object found from DB
          populateFromDb(response.data.result.data);
        } else if(response.status == 204) {
          // not found, compute afresh
          doPlane();
        }
      }, function errFn(response) {

      }, function notifyFn(msg) {
        console.log("notify", msg);
      });      

    }

    function startPlaneComputation() {
      TabService.lock(true);
      that.inProgress = true;

      // important: without clearing filters there's a risk only the sample that
      // are within the circles get passed
      windowHandler.getDimensionService().clearFilters();

      DatasetFactory.getVariableData([testVar], windowHandler)
      .then(function(res) {
        doCall();
      });
    }

    var defer = $q.defer(),
    windowHandler = windowObject.handler();

    if (!service.hasExisting()) {
      service.getSOM(windowHandler).then(function succFn(res) {

        if(res == 'not_needed') {
          defer.reject('not_needed');
        } else {
          startPlaneComputation();
        }
      }, function errFn(res) {
        defer.reject();
      });
    } else {
      startPlaneComputation();
    }

    return defer.promise;
  };

  return service;

});