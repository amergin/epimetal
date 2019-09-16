angular.module('services.correlation.ww', [
  'services.dataset',
  'services.variable',
  'services.notify',
  'services.webworker',
  'ext.lodash',
  'utilities.math',
  'services.tab',
  'ext.core-estimator'
])

.constant('CORRELATION_SPLIT_MAX', 10)
.constant('CORRELATION_SPLIT_MIN', 4)
.constant('CORRELATION_VAR_THRESHOLD', 10)
.constant('CORRELATION_THREADS', 3)

.factory('CorrelationService', function CorrelationServiceWW($q, DatasetFactory, VariableService, NotifyService, CORRELATION_SPLIT_MAX, CORRELATION_SPLIT_MIN, CORRELATION_VAR_THRESHOLD, CORRELATION_THREADS, WebWorkerService, TabService, coreEstimator, _) {
  var that = this;
  var service = {};

  var _result = [];
  var _queuePromises = [];
  var _queueWindows = [];
  var _workers = [];
  var _availableCores = null;

  function initWorkers(count) {
    _workers = _.times(count, function() {
      var worker = WebWorkerService.create(),
        absUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
      worker
        .script(threadFunction)
        .addDependency(absUrl + 'assets/lodash.min.js')
        .addDependency(absUrl + 'assets/utilities.math.js')
        .addDependency(absUrl + 'assets/spearson.js');
      return worker;
    });
  }

  var getData = function(config, windowHandler) {
    var getRaw = function(samples) {
      return _.map(samples, function(s) {
        return s.variables;
      });
    };

    var deferred = $q.defer(),
      // objects
      variables = VariableService.getVariables(config.variables),
      separated = (config.separate === true),
      raw;

    if (separated) {
      that.sampleDimension = windowHandler.getDimensionService().getSampleDimension();
      var samples = _.filter(that.sampleDimension.get().top(Infinity), function(s) {
        return s.dataset == config.dataset.name();
      });
      raw = getRaw(samples);
      deferred.resolve(raw);
    } else {
      DatasetFactory.getVariableData(variables, windowHandler)
        .then(function() {
          that.sampleDimension = windowHandler.getDimensionService().getSampleDimension();
          var deDuplicated = _.unique(that.sampleDimension.get().top(Infinity), false, function(d) { 
            var arr = [];
            if(d.originalDataset) { arr = [d.originalDataset, d.sampleid]; }
            else { arr = [d.dataset, d.sampleid]; }
            return arr.join("|");
          });
          var raw = getRaw(deDuplicated);
          deferred.resolve(raw);
        });
    }
    return deferred.promise;
  };

  // partitions the heatmap table to cells that are unique
  // from the point of view of computation
  var partitionHeatmapTable = function(variables) {
    var coordinates = [],
      diagonals = [];
    _.each(variables, function(varX, indX) {
      _.each(variables, function(varY, indY) {
        var coord = {
          x: varX,
          y: varY
        };

        if (varX == varY) {
          // diagonal
          coord['corr'] = 1;
          diagonals.push(coord);
        } else if (indX > indY) {
          // duplicate by mirror, do not recalculate
        } else {
          // the real thing, compute away
          coordinates.push(coord);
        }
      });
    });

    var subArrayCount = (variables.length <= CORRELATION_VAR_THRESHOLD) ? 1 : _availableCores;
    return {
      diagonals: diagonals,
      coordinates: Utils.subarrays(coordinates, subArrayCount)
    };
  };

  var combineResults = function(coordinates, diagonals) {
    var result = coordinates.slice(0).concat(diagonals);
    _.each(coordinates, function(coord) {
      // add the mirror cell
      result.push({
        x: coord.y,
        y: coord.x,
        corr: coord.corr,
        pvalue: coord.pvalue
      });
    });
    return result;
  };

  var getVariableData = function(data, variable) {
    return _.pluck(data, variable);
  };

  function threadFunction(input, output) {
    var coordinates = input.coordinates,
      samples = input.samples,
      correlationType = input.correlationType;

    function notify(loopInd, iterations) {
      output.notify({
        progress: loopInd / iterations,
        thread: input.workerId
      });
    }

    // avoid minification issues of renaming lodash
    var _ = self["_"];

    try {
      _.each(coordinates, function(coord, ind) {
        var inputX = _.pluck(samples, coord.x),
        inputY = _.pluck(samples, coord.y);

        if (correlationType == 'pearson') {
          /*
          var varX = coord.x,
          varY = coord.y,
          meanX = mathUtils.mean(samples, varX),
          meanY = mathUtils.mean(samples, varY);

          var stdX = mathUtils.stDeviation(samples, meanX, function(item) {
              return +item[varX];
            }),
            stdY = mathUtils.stDeviation(samples, meanY, function(item) {
              return +item[varY];
            });

          // correlation
          coord['corr'] = mathUtils.sampleCorrelation(samples, varX, meanX, stdX, varY, meanY, stdY);
          */
          coord['corr'] = spearson.correlation.pearson(inputX, inputY, true);
        }
        else if (correlationType == 'spearman-rank') {
          coord['corr'] = spearson.correlation.spearman(inputX, inputY, true);
        }
        else if(correlationType == 'spearman') {
          coord['corr'] = spearson.correlation.spearman(inputX, inputY, false);
        }

        // p-value
        coord['pvalue'] = mathUtils.calcPForPearsonR(coord['corr'], samples.length);

        if (Math.ceil(((ind + 1) / coordinates.length) * 100) % 5 === 0) {
          notify(ind, coordinates.length);
        }
      });
      notify(1, 1);
      output.success(coordinates);
    } catch (e) {
      output.failure(e.message);
    } finally {
      console.log("Thread ready");
    }

  }

  service.inProgress = function() {
    return !_.isEmpty(_queuePromises) ||
      _.any(_workers, function(ww) {
        return ww.isBusy();
      });
  };

  service.compute = function(config, windowObject) {
    function doQueue(config, windowObject, deferred) {
      var queueWithoutMe = _.without(_queuePromises, deferred.promise);
      $q.all(queueWithoutMe).then(function succFn(res) {
          doDefault(config, windowObject, deferred);
        }, function errFn(reason) {
          console.log("error!", reason);
        })
        .finally(function() {
          _.remove(_queuePromises, function(p) {
            return p !== deferred.promise;
          });
        });
    }

    function checkWorkers() {
      if (_.isEmpty(_workers)) {
        initWorkers(_availableCores);
      }
    }

    function doDefault(config, windowObject, deferred) {
      function onTerminate() {
        windowObject.circleSpin(false);
        windowObject.circleSpinValue(0);
        _.each(_queueWindows, function(win) {
          win.remove();
        });
        _queueWindows.length = 0;
        TabService.lock(false);
        deferred.reject('User cancelled computation task');
      }
      TabService.lock(true);
      var percentProgress = {},
        windowHandler = windowObject.handler();
      windowObject.circleSpin(true);

      NotifyService.addTransient('Correlation computation started', 'Recomputing correlations and p-values.', 'info');

      var cellInfo = partitionHeatmapTable(config.variables);

      getData(config, windowHandler).then(function(data) {
        var workerPromises = [];
        _.each(_workers, function(worker, ind) {
          var coordinates = cellInfo.coordinates[ind];
          // consider the case where there are more workers than variables to calculate
          if (coordinates) {
            var promise = worker
              .onTerminate(onTerminate)
              .run({
                samples: data.slice(0),
                variables: config.variables,
                coordinates: coordinates,
                workerId: worker.id(),
                correlationType: config.correlationType
              });

            promise.then(null, null, function notifyFn(data) {
              percentProgress[data.thread] = data.progress;
              var workerCount = workerPromises.length;
              var totalProgress = Math.ceil(_.chain(percentProgress).values().sum().value() / workerCount * 100);
              windowObject.circleSpinValue(totalProgress);
            });
            workerPromises.push(promise);
          }
        });

        $q.all(workerPromises).then(function succFn(results) {
            windowObject.circleSpinValue(100);
            var flattened = _.chain(results).values().flatten(true).unique().value(),
              _result = combineResults(flattened, cellInfo.diagonals);
            NotifyService.addTransient('Correlation computation ready', 'Correlation plot updated.', 'success');
            deferred.resolve(_result);
          }, function errFn(reasons) {
            console.log("error", reasons);
            deferred.reject(reasons);
          })
          .finally(function() {
            TabService.lock(false);
            windowObject.circleSpin(false);
            windowObject.circleSpinValue(0);
            _.remove(_queueWindows, function(win) {
              return win == windowObject;
            });
            _.remove(_queuePromises, function(d) {
              return d == deferred.promise;
            });
          });

      });
    }

    switch (config.correlationType) {
      case 'pearson':
        break;

      case 'spearman-rank':
        break;

      case 'spearman':
        break;

      default:
        throw new Error('Unsupported correlation type.');
    }

    checkWorkers();

    var deferred = $q.defer();
    _queueWindows.push(windowObject);
    _queuePromises.push(deferred.promise);

    if (service.inProgress()) {
      doQueue(config, windowObject, deferred);
    } else {
      doDefault(config, windowObject, deferred);
    }

    return deferred.promise;
  };

  service.cancel = function() {
    _.each(_workers, function(worker) {
      worker.terminate();
    });
    _workers.length = 0;
    _queuePromises.length = 0;
  };

  _.delay(function() {
    console.log("delayed start");
    coreEstimator.get().then(function succFn(cores) {
        _availableCores = (cores - 1 > 0) ? cores - 1 : cores;
      }, function errFn() {
        _availableCores = CORRELATION_THREADS;
      })
      .finally(function() {
        initWorkers(_availableCores);
      });

  });//, 2000);


  return service;

});