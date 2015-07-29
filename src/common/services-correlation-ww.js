angular.module('services.correlation.ww', ['services.dataset', 'services.notify', 'services.webworker', 'ext.lodash', 'utilities.math', 'services.tab'])

.constant('CORRELATION_SPLIT_MAX', 10)
.constant('CORRELATION_SPLIT_MIN', 4)
.constant('CORRELATION_VAR_THRESHOLD', 40)
.constant('CORRELATION_THREADS', 4)

// .run(function (WorkerService, $location) {
//   var baseUrl = $location.protocol() + '://' + $location.host() + ':' + $location.port() + window.location.pathname;
//   WorkerService.setAngularUrl('https://ajax.googleapis.com/ajax/libs/angularjs/1.3.15/angular.min.js');
//   // WorkerService.addDependency('_', 'ext.lodash', 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.10.0/lodash.min.js');
//   WorkerService.addDependency('mathUtils', 'utilities.math', baseUrl + 'assets/utilities.math.js');
// })

.factory('CorrelationService', ['$q', 'DatasetFactory', 'NotifyService', 'CORRELATION_SPLIT_MAX', 'CORRELATION_SPLIT_MIN', 'CORRELATION_VAR_THRESHOLD', 'CORRELATION_THREADS', 'WebWorkerService', 'TabService',
  function CorrelationServiceWW($q, DatasetFactory, NotifyService, CORRELATION_SPLIT_MAX, CORRELATION_SPLIT_MIN, CORRELATION_VAR_THRESHOLD, CORRELATION_THREADS, WebWorkerService, TabService) {
    var that = this;
    var service = {};

    var _result = [];
    var _queuePromises = [];
    var _workers = [];

    // function initWorkers(count) {
    //   function thread(input) {
    //     var callback = function(i) {
    //       output.notify(i);
    //       i++;
    //     };
    //     console.log("input = ", input);
    //     // console.log(mathUtils);

    //     setInterval(function(){ callback(++i); }, Math.floor((Math.random() * 1000) + 100));
    //     //output.resolve(true);
    //     //output.reject(false);
    //   }

    //   var promises = _.times(count, function() {
    //     return WorkerService.createAngularWorker(['input', 'output', '$http', 'mathUtils', thread]);
    //   });

    //   $q.all(promises)
    //   .then(function succFn(angularWorkers) {
    //     _workers = _.map(angularWorkers, function(worker) {
    //       return {
    //         busy: false,
    //         worker: worker
    //       };
    //     });
    //   }, function errFn(reason) {
    //     console.log("WW init failed!");
    //     console.log(reason);
    //   });
    // }

    function initWorkers(count) {
      _workers = _.times(count, function() {
        var worker = WebWorkerService.create(),
        absUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        worker
        .script(threadFunction)
        .addDependency(absUrl + 'assets/lodash.min.js')
        .addDependency(absUrl + 'assets/utilities.math.js');
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
      variables = config.variables,
      separated = config.separate === true,
      raw;

      if(separated) {
        that.sampleDimension = windowHandler.getDimensionService().getSampleDimension();
        var samples = _.filter(that.sampleDimension.get().top(Infinity), function(s) { 
          return s.dataset == config.dataset.name();
        });
        raw = getRaw(samples);
        deferred.resolve(raw);
        // config.dataset.getVariables(variables).then(function(data) {
        //   raw = getRaw(data.samples.all);
        //   deferred.resolve(raw);
        // });
      } else {
        DatasetFactory.getVariableData(variables, windowHandler)
        .then(function() {
          that.sampleDimension = windowHandler.getDimensionService().getSampleDimension();
          var raw = getRaw(that.sampleDimension.get().top(Infinity), variables);
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

          if( varX == varY ) {
            // diagonal
            coord['corr'] = 1;
            diagonals.push(coord);
          } else if( indX > indY ) {
            // duplicate by mirror, do not recalculate
          } else {
            // the real thing, compute away
            coordinates.push(coord);
          }
        });
      });

      var subArrayCount = CORRELATION_THREADS;//(variables.length <= CORRELATION_VAR_THRESHOLD) ? CORRELATION_SPLIT_MIN : CORRELATION_SPLIT_MAX;
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
      samples = input.samples;

      function notify(loopInd, iterations) {
        output.notify({ progress: loopInd/iterations, thread: input.workerId });
      }

      try {
        _.each(coordinates, function(coord, ind) {
          var varX = coord.x,
          varY = coord.y,
          meanX = mathUtils.mean(samples, varX),
          meanY = mathUtils.mean(samples, varY);

          var stdX = mathUtils.stDeviation(samples, meanX, function(item) { return +item[varX]; }),
          stdY = mathUtils.stDeviation(samples, meanY, function(item) { return +item[varY]; });

          // correlation
          coord['corr'] = mathUtils.sampleCorrelation(samples, varX, meanX, stdX, varY, meanY, stdY);
          // p-value
          coord['pvalue'] = mathUtils.calcPForPearsonR(coord['corr'], samples.length);
          if(ind % (_.round(coordinates.length, -3) / 10) === 0) { notify(ind, coordinates.length); }
        });
        output.success(coordinates);
      } catch(e) {
        output.failure(e.message);
      }
      console.log("Thread ready");
    }

    service.inProgress = function() {
      return !_.isEmpty(_queuePromises);
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
          _.remove(_queuePromises, function(p) { return p !== deferred.promise; });
        });
      }

      function doDefault(config, windowObject, deferred) {
        TabService.lock(true);
        var percentProgress = {},
        windowHandler = windowObject.handler();
        windowObject.circleSpin(true);

        NotifyService.addTransient('Correlation computation started', 'Recomputing correlations and p-values.', 'info');

        var cellInfo = partitionHeatmapTable(config.variables);

        getData(config, windowHandler).then(function(data) {
          var workerPromises = [];
          _.each(_workers, function(worker, ind) {
            var promise = worker.run({
              samples: data.slice(0),
              variables: config.variables,
              coordinates: cellInfo.coordinates[ind],
              workerId: worker.id()
            });
            promise.then(null, null, function notifyFn(data) {
              percentProgress[data.thread] = data.progress;
              var totalProgress = Math.ceil(_.chain(percentProgress).values().sum().value() / CORRELATION_THREADS * 100);
              windowObject.circleSpinValue(totalProgress);
            });
            workerPromises.push(promise);
          });

          $q.all(workerPromises).then(function succFn(results) {
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
          });

        });
      }

      var deferred = $q.defer();
      var queueNo = _queuePromises.push(deferred.promise) - 1;

      if(service.inProgress()) {
        doQueue(config, windowObject, deferred, queueNo);
      } else {
        doDefault(config, windowObject, deferred, queueNo);
      }

      return deferred.promise;
    };

    initWorkers(CORRELATION_THREADS);

    return service;
  }
]);