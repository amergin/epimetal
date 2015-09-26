angular.module('services.som', [
  'akangas.services.som',
  'services.dataset',
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
.constant('SOM_DEFAULT_PLANES', ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc'])
.constant('SOM_DEFAULT_TESTVARS', ['XXL-VLDL-L', 'XL-VLDL-L', 'L-VLDL-L', 'M-VLDL-L',
  'S-VLDL-L', 'XS-VLDL-L', 'IDL-L', 'L-LDL-L',
  'M-LDL-L', 'S-LDL-L', 'XL-HDL-L', 'L-HDL-L',
  'M-HDL-L', 'S-HDL-L', 'Serum-C', 'Serum-TG',
  'HDL-C', 'LDL-C', 'Glc', 'Cit', 'Phe', 'Gp', 'Tyr',
  'FAw3toFA', 'FAw6toFA', 'SFAtoFA'
])
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

.factory('SOMService', function SOMService(SOMComputeService, WindowHandler, $timeout, 
  $injector, $rootScope, NotifyService, $q, DatasetFactory, TabService,
  SOM_DEFAULT_SIZE, SOM_DEFAULT_PLANES, SOM_DEFAULT_TESTVARS, SOM_MIN_SAMPLE_COUNT, 
  d3, _, $http, $log,
  SOM_TRAIN_GET_URL, SOM_TRAIN_POST_URL, SOM_PLANE_GET_URL, SOM_PLANE_POST_URL) {

  var that = this;

  this.som = {};
  this.bmus = [];
  this.trainSamples = [];
  that.inProgress = false;
  that.somSelection = {
    variables: SOM_DEFAULT_TESTVARS,
    samples: undefined
  };
  that.dimensionService = undefined;
  that.sampleDimension = undefined;

  var _colors = d3.scale.category10();
  var _queueWindows = [];
  var _cancelled = false;
  var service = {};
  var _dbId = null;
  var _size = SOM_DEFAULT_SIZE;

  service.inProgress = function() {
    return that.inProgress;
  };

  service.empty = function() {
    return _.isEmpty(that.som);
  };

  service.rows = function(x) {
    if (!arguments.length) { return _size.rows; }
    _size.rows = x;
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
    return SOM_DEFAULT_PLANES;
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
    TabService.lock(false);
    removePrevious();
    removeQueueWindows();
    removeExistingWindows();

    that.inProgress = false;
    _cancelled = true;
    return service;
  };

  service.inputVariables = function(variables) {
    function sameVars() {
      var inter = _.intersection(variables, that.somSelection.variables),
        diff = _.difference(variables, inter),
        isSubset = variables.length === inter.length;
      return diff.length === 0 && !isSubset;
    }

    if(!arguments.length) { return angular.copy(that.somSelection.variables); }

    var currEmpty = _.isUndefined(that.somSelection.variables) || that.somSelection.variables.length === 0;

    if (currEmpty || sameVars()) {
      return;
    }
    that.somSelection['variables'] = variables;
    // recompute
    var windowHandler = WindowHandler.get('vis.som.plane');
    service.getSOM(windowHandler);
    return service;
  };

  function removePrevious() {
    // remove previous computation
    that.som = {};
    that.bmus = [];
  }

  service.getSOM = function(windowHandler) {
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
      var variables = that.somSelection.variables,
        retObj = {
          samples: [],
          columns: new Array(variables.length)
        };

      var deDuplicated = _.unique(that.sampleDimension.top(Infinity), false, function(d) { 
        var arr = [];
        if(d.originalDataset) { arr = [d.originalDataset, d.sampleid]; }
        else { arr = [d.dataset, d.sampleid]; }
        return arr.join("|");
      });

      _.each(deDuplicated, function(obj, ind) {
        var sampValues = _.chain(obj.variables)
          .pick(variables)
          .map(function(val, key) {
            return [key, val];
          })
          .sortBy(_.first)
          .map(_.last)
          .value(),
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
          'dataset': obj.originalDataset ? obj.originalDataset : obj.dataset
        };

        retObj.samples.push(sampleId);
        _.each(sampValues, function(d, i) {
          // initialize the array on first time
          if (_.isUndefined(retObj.columns[i])) {
            retObj.columns[i] = [];
          }
          retObj.columns[i].push(sampValues[i]);
        });
      });
      return retObj;
    }

    function doCall() {
      function getHash(samples, variables, rows, cols) {
        // var p1 = performance.now();
        var spark = new SparkMD5();
        for(var i = 0; i < samples.length; ++i) {
          spark.append(samples[i].dataset + "|" + samples[i].sampleid);
        }
        spark.append( _.sortBy(variables) );
        spark.append(rows);
        spark.append(cols);
        // var p2 = performance.now();
        // console.log("hash creation took = ", p2-p1);
        return spark.end();
      }

      function sendNewTrain(somObject, callback) {
        $http.post(SOM_TRAIN_POST_URL, {
          bmus: Array.prototype.slice.call(somObject.bmus),
          weights: Array.prototype.slice.call(somObject.weights),
          codebook: Array.prototype.slice.call(somObject.codebook),
          variables: that.somSelection.variables,
          distances: Array.prototype.slice.call(somObject.distances),
          neighdist: somObject.neighdist,
          epoch: somObject.epoch,
          rows: somObject.rows,
          cols: somObject.cols,
          hash: getHash(data.samples, that.somSelection.variables, somObject.rows, somObject.cols)
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

      function doTrain(data) {
        TaskHandlerService.circleSpin(true);
        NotifyService.addTransient('Starting SOM computation', 'The computation may take a while.', 'info');
        SOMComputeService.create(service.rows(), service.columns(), data.samples, data.columns)
        .then(function succFn(result) {
          that.som = result.som;

          // do training
          SOMComputeService.train(that.som).then(function succFn(somObject) {
            NotifyService.addTransient('SOM computation ready', 'The submitted SOM computation is ready', 'success');
            that.bmus = SOMComputeService.get_formatter_bmus(that.som);
            that.dimensionService.addBMUs(that.bmus);

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
          });

        });
      }

      function populateFromDb(result, data) {
        var id = result.id,
        dbObject = result.data;
        $log.info("Populating SOM train from DB object", id);
        SOMComputeService.create(dbObject.rows, dbObject.cols, data.samples, data.columns)
        .then(function succFn(result) {
          that.som = result.som;
          that._dbId = id;
          that.som.bmus = dbObject.bmus;
          that.som.codebook = dbObject.codebook;
          that.som.distances = dbObject.distances;
          that.som.neighdist = dbObject.neighdist;
          that.som.weights = dbObject.weights;
          that.som.rows = dbObject.rows;
          that.som.cols = dbObject.cols;
          that.bmus = SOMComputeService.get_formatter_bmus(that.som);
          that.dimensionService.addBMUs(that.bmus);
          // this will force existing planes to redraw
          $rootScope.$emit('dataset:SOMUpdated', that.som);
          TabService.lock(false);
          that.inProgress = false;
          defer.resolve(that.som);
        }, function errFn(result) {
          $log.error('Creating SOM object FAILED.');
          defer.reject();
        })
        .finally(function() {
          TaskHandlerService.circleSpin(false);
          TaskHandlerService.circleSpinValue(0);
        });
      }

      removePrevious();

      var skipNaNs = false;
      var data = getData(skipNaNs);
      that.trainSamples = data.samples;

      var TaskHandlerService = $injector.get('TaskHandlerService');
      that.inProgress = true;     

      // ask from the server if the train result is already stored in the DB
      var idHash = getHash(data.samples, that.somSelection.variables, service.rows(), service.columns());
      $http.get( _.template(SOM_TRAIN_GET_URL)({ hash: idHash }), 
        // don't cache: otherwise it'll store the first 'not found' reply and
        // will result in subsequent calls to be always re-calculated
        { cache: false }
      )
      .then(function succFn(response) {
        if(response.status == 200) {
          // object found from DB
          populateFromDb(response.data.result, data);
        } else if(response.status == 204) {
          // not found, compute afresh
          doTrain(data);
        }
      }, function errFn(response) {

      }, function notifyFn(msg) {
        console.log("notify", msg);
      });

    }

    var defer = $q.defer();

    if (!computationNeeded()) {
      $timeout(function() {
        defer.resolve('not_needed');
      }, 5);

    } else {
      TabService.lock(true);
      // that.inProgress = true;

      // important: without clearing filters there's a risk only the sample that
      // are within the circles get passed
      windowHandler.getDimensionService().clearFilters();

      // prefetch data and store it in the dimensionservice of that particular handler
      DatasetFactory.getVariableData(that.somSelection.variables, windowHandler)
        .then(function succFn(res) {
          doCall();
        });
    }

    return defer.promise;
  };

  function somNotComputed() {
    return _.isEmpty(that.trainSamples) || _.isEmpty(that.som);
  }

  service.getPlane = function(testVar, windowObject, notifyFunction) {
    function getThreadData(variable, skipNaNs) {
      function inTrainSamples(sample) {
        return _.any(that.trainSamples, function(d) {
          return _.isEqual(d, sample);
        });
      }

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
        $http.post(SOM_PLANE_POST_URL, {
          variable: testVar,
          plane: plane,
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
        defer.resolve(data.plane);
      }

      function doPlane() {
        var skipNaNs = false;
        _queueWindows.push(windowObject);
        var threadData = getThreadData(testVar, skipNaNs);

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

      $http.get( _.template(SOM_PLANE_GET_URL)({ somHash: that._dbId, variable: testVar }), 
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

    if (somNotComputed()) {
      service.getSOM(windowHandler).then(function succFn(res) {
        startPlaneComputation();
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