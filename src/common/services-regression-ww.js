angular.module('services.regression.ww', ['services.dataset', 'services.filter', 'services.tab', 'services.webworker', 'ext.core-estimator'])

.constant('DEFAULT_REGRESSION_THREADS', 3)
.constant('MAX_REGRESSION_THREADS', 4)

.factory('RegressionService', ['$injector', '$q', '$rootScope', 'DatasetFactory', 'TabService', 'WebWorkerService', 'DEFAULT_REGRESSION_THREADS', 'coreEstimator', 'MAX_REGRESSION_THREADS',
  function RegressionServiceWW($injector, $q, $rootScope, DatasetFactory, TabService, WebWorkerService, DEFAULT_REGRESSION_THREADS, coreEstimator, MAX_REGRESSION_THREADS) {
    var that = this;
    var service = {};
    var FilterService = $injector.get('FilterService');

    var _inProgress = false;
    // var _result = {};
    // sample count before 
    var _sampleCount = {};
    var _variables = {
      target: null,
      association: [],
      adjust: []
    };

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
        .addDependency(absUrl + 'assets/numeric.min.js')
        .addDependency(absUrl + 'assets/math.min.js')
        .addDependency(absUrl + 'assets/statistics-distributions-packaged.js')
        .addDependency(absUrl + 'assets/utilities.regression.js')
        .addDependency(absUrl + 'assets/utilities.math.js');
        return worker;
      });
    }


    var getRaw = function(samples) {
      return _.map(samples, function(s) {
        return s.variables;
      });
    };

    var getDatasetData = function(variables, windowHandler) {
      function getFilteredByDataset(samples) {
        var byDataset = _.chain(samples)
        .groupBy(function(d) {
          return d.dataset;
        })
        .value(),
        results = [];

        _.each(DatasetFactory.activeSets(), function(set) {
          results.push({
            'type': 'dataset',
            'name': set.name(),
            'samples': getRaw(byDataset[set.name()])
          });
        });
        return results;
      }

      var def = $q.defer();
      DatasetFactory.getVariableData(variables, windowHandler)
      .then(function() {
        var sampleDimension = windowHandler.getDimensionService().getSampleDimension(),
        samples = sampleDimension.get().top(Infinity),
        filtered = getFilteredByDataset(samples);

        def.resolve(filtered);
      }, function errFn() {
        def.reject();
      });
      return def.promise;
    };

    var getSOMData = function(variables, windowHandler) {
      var getSOMData = function(windowHandler) {
        var service = windowHandler.getService().getSecondary(),
        somService = service.getDimensionService(),
        // samples that are currently selected in SOM circles
        samples = somService.getSampleDimension().get().top(Infinity),
        circleFilters = FilterService.getSOMFilters();

        return _.chain(circleFilters)
        .map(function(circle) {
          var circleSamples, hexagons = circle.hexagons(), bmu;

          circleSamples = _.chain(samples)
          .filter(function(s) {
            return _.some(hexagons, function(h) { 
              bmu = s.bmus.valueOf();
              return (bmu.x == h.j) && (bmu.y == h.i);
            });
          })
          .value();
          return {
            name: circle.id(),
            type: 'som',
            samples: getRaw(circleSamples)
          };
        })
        .value();
      };


      function fetchTotal(windowHandler) {
        var def = $q.defer();
        DatasetFactory.getVariableData(variables, windowHandler)
        .then(function() {
          var sampleDimension = windowHandler.getService().getSecondary().getDimensionService().getSampleDimension();
          var retObject = {
            name: 'total',
            type: 'som',
            samples: getRaw(sampleDimension.get().top(Infinity))
          };
          def.resolve(retObject);
        }, function errFn() {
          def.reject();
        });

        return def.promise;
      }

      function fetchCircles(windowHandler) {
        var def = $q.defer();
        var somHandler = windowHandler.getService().get('vis.som.plane');
        DatasetFactory.getVariableData(variables, somHandler)
        .then(function succFn(res) {
          var ret = getSOMData(somHandler);
          def.resolve(ret);
        }, function errFn(res) {
          def.reject();
        });
        return def.promise;
      }

      var deferred = $q.defer(),
      promises = [fetchTotal(windowHandler), fetchCircles(windowHandler)];

      $q.all(promises).then(function succFn(res) {
        var flat = _.flatten(res);
        deferred.resolve(flat);
      }, function errFn() {
        deferred.reject();
      });

      return deferred.promise;
    };

    var getData = function(variables, windowHandler, source) {
      var fn;
      if(source == 'dataset') {
        fn = getDatasetData;
      } else {
        fn = getSOMData;
      }
      return fn.apply(this, arguments);
    };

    var getVariableData = function(data, variable) {
      var res = _.map(data, function(d) {
        var shallow = _.clone(d);
        shallow.samples = _.pluck(d.samples, variable);
        return shallow;
      });
      return res;
    };

    var getThreads = function(data, assocVars) {
      var threadData = [];
      _.each(assocVars, function(assocVar) {
        threadData.push({
          data: getVariableData(data, assocVar),
          variable: assocVar
        });
      });
      return threadData;
    };


    function getNaNIndices(data) {
      var nans = [],
        val;
      for (var i = 0; i < data.length; ++i) {
        val = +data[i];
        if (_.isNaN(val)) {
          nans.push(i);
        }
      }
      return nans;
    }

    // function stripNaNs(data, indices) {
    //   return _.filter(data, function(d, ind) {
    //     return !_.contains(indices, ind);
    //   });
    // }

    var getAdjustData = function(data, variables) {
      var pluckVariables = function(data, variables) {
        return _.map(variables, function(v) {
          return _.pluck(data, v);
        });
      };
      var ret = _.map(data, function(d) {
        var shallow = _.clone(d);
        shallow.samples = pluckVariables(d.samples, variables);
        return shallow;
      });
      return ret;
    };

    // this is called on each thread execution
    function threadFunction(input, output) {
      var compute = function(config) {

        function mathJs() {
          // see https://en.wikipedia.org/wiki/Ordinary_least_squares#Estimation
          // beta = (X^T X)^{-1} X^T y 
          var _xMatrixTransp = math.matrix(xMatrixTransp);
          var _xMatrix = math.transpose(xMatrixTransp);
          var _normalTargetData = math.matrix(normalTargetData);

          // Compute beta = (X^T X)^{-1} X^T y 
          var dotProduct = math.multiply(_xMatrixTransp, _xMatrix);
          var inverse = math.inv(dotProduct);
          var multi2 = math.multiply(inverse, _xMatrixTransp);
          var betas = math.multiply(multi2, normalTargetData);

          // console.log("mathjs betas=", String(betas));

          var n = math.size(_xMatrix)[0];
          var k = math.size(_xMatrix)[1];
          var beta = betas.subset(math.index(1));

          var _yMatrixTransp = math.matrix([normalTargetData]);

          // get confidence interval and p-value
          var ciAndPvalue = regressionUtils.getCIAndPvalueMathjs(inverse, _xMatrix, _xMatrixTransp, _yMatrixTransp, n, k, beta);

          return {
            result: { success: true },
            ci: ciAndPvalue.ci,
            pvalue: ciAndPvalue.pvalue,
            betas: betas.valueOf()
          };

        }

        function numericJs() {
          var xMatrix = numeric.transpose(xMatrixTransp);
          // see https://en.wikipedia.org/wiki/Ordinary_least_squares#Estimation
          // Compute beta = (X^T X)^{-1} X^T y 
          var dotProduct = numeric.dot(xMatrixTransp, xMatrix);
          var inverse = numeric.inv(dotProduct);
          dotProduct = null;
          var multi2 = numeric.dot(inverse, xMatrixTransp);
          var betas = numeric.dot(multi2, normalTargetData);
          multi2 = null;

          // console.log("numericjs betas", betas);

          var n = _.size(xMatrix),
          k = _.size(xMatrix[0]),
          beta = betas[1];

          // console.log("n, k", n, k);

          // get confidence interval and p-value
          var ciAndPvalue = regressionUtils.getCIAndPvalueNumericjs(inverse, xMatrix, xMatrixTransp, [normalTargetData], n, k, beta);

          return {
            result: { success: true },
            ci: ciAndPvalue.ci,
            pvalue: ciAndPvalue.pvalue,
            betas: betas
          };

        }
        var assocData = config.association,
        nanIndices = config.nans,
        targetData = config.target,
        adjustData = config.adjustData;

        var threadNaNs = regressionUtils.getNaNIndices(assocData),
        allNaNIndices = _.union(threadNaNs, nanIndices),
        normalAssocData = regressionUtils.getNormalizedData( regressionUtils.stripNaNs(assocData, allNaNIndices) ),
        onesArray = _.times(normalAssocData.length, function(d) { return 1; }),
        normalTargetData = regressionUtils.getNormalizedData( regressionUtils.stripNaNs(targetData, allNaNIndices) ),
        normalAdjustData = regressionUtils.getNormalizedData( regressionUtils.getStrippedAdjust(adjustData, allNaNIndices) );

        var xMatrixTransp = [onesArray, normalAssocData].concat(normalAdjustData);
        // var xMatrix = numeric.transpose(xMatrixTransp);


        // change this if you want to try it out
        // return mathJs();
        return numericJs();
      }; // end compute 

      function getError(message) {
        return {
          success: false,
          reason: message
        };          
      }

      function processOneVariable(varData, globals, varInd, noVars) {
        var retObj = {
          result: { 'success': true },
          payload: [],
          variable: varData.variable
        };

        // process total
        try {

          // for each dataset / som input
          _.each(varData.data, function(obj, ind, arr) {
            var computation = compute({
              association: obj.samples,
              nans: _.find(globals.nanIndices, function(d) { return d.name == obj.name; }).nans,
              target: _.find(globals.targetData, function(d) { return d.name == obj.name; }).samples,
              adjustData: _.find(globals.adjustData, function(d) { return d.name == obj.name; }).samples
            }),
            result = _.chain(obj)
                      .omit('samples')
                      .extend(computation)
                      .value();

            retObj.payload.push(result);

            // notify
            var percentage = ((ind + 1) / arr.length)*(1/noVars) + (varInd/noVars);
            output.notify({ progress: percentage, thread: input.workerId });

          });
        } catch(errorObject) {
          console.log("Regression throws error: ", errorObject.message);
          retObj['result'] = getError('Something went wrong while computing the regression. Please check and adjust sample selections as needed.');
        }
        finally {
          return retObj;
        }
      }

      console.log("Thread started");

      var results = _.map(input.data, function(varData, ind, arr) {
        var res = processOneVariable(varData, input.globals, ind, arr.length);
        return res;
      });

      var succeeded = !_.chain(results).find(function(v) { return v.result.success === false; }).isNull().value();

      if(succeeded) {
        output.notify({ progress: 1.1, thread: input.workerId });
        output.success(results);
      } else {
        output.failure(results);
      }    

    } // threadFunction

    var getNaNs = function(targetData, targetVar, adjustData, adjustVars) {
      var indices = [];
      indices = indices.concat(getNaNIndices(targetData));
      _.each(adjustVars, function(v, ind) {
        indices = indices.concat(getNaNIndices(adjustData[ind]));
      });

      return _.union(indices);
    };

    function updateSampleCount() {
      var DimensionService = $injector.get('DimensionService'),
      secondary = DimensionService.getSecondary(),
      primary = DimensionService.getPrimary();

      _sampleCount.primary = primary.getSampleDimension().groupAll().get().value();
      _sampleCount.secondary = secondary.getSampleDimension().groupAll().get().value();
    }

    var getAllNaNs = function(targetData, targetVar, adjustData, adjustVars) {
      var ret = _.chain(_.zip(targetData, adjustData))
      .map(function(d) {
        var info = _.omit(d[0], 'samples');
        info['nans'] = getNaNs(d[0].samples, targetVar, d[1].samples, adjustVars);
        return info;
      })
      .value();
      return ret;
    };

    service.inProgress = function() {
      return !_.isEmpty(_queuePromises);
    };

    service.selectedVariables = function(x) {
      if(!arguments.length) { return _variables; }
      _variables = x;
      return service;
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

      function checkWorkers() {
        if(_.isEmpty(_workers)) {
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

        var variables = _.chain(config.variables).values().flatten(true).unique().value();
        getData(variables, windowHandler, config.source).then(function(data) {
          var workerPromises = [];

          var targetVar = config.variables.target,
            assocVars = config.variables.association,
            adjustVars = config.variables.adjust;

          var threadData = getThreads(data, assocVars),
            targetData = getVariableData(data, targetVar),
            adjustData = getAdjustData(data, adjustVars),
            splitThreadData = Utils.subarrays(threadData, _availableCores),
            nanIndices = getAllNaNs(targetData, targetVar, adjustData, adjustVars);

          var globals = {
            targetData: targetData,
            adjustData: adjustData,
            nanIndices: nanIndices
          };

          _.each(_workers, function(worker, ind) {
            var promise = worker
                          .onTerminate(onTerminate)
                          .run({
                            workerId: worker.id(),
                            data: splitThreadData[ind],
                            globals: globals
                          });
            promise.then(null, null, function notifyFn(data) {
              percentProgress[data.thread] = data.progress;
              var totalProgress = Math.ceil(_.chain(percentProgress).values().sum().value() / _availableCores * 100);
              windowObject.circleSpinValue(totalProgress);
            });
            workerPromises.push(promise);
          });

          $q.all(workerPromises).then(function succFn(results) {
            windowObject.circleSpinValue(100);
            results = _.flatten(results);
            if( !results[0].result.success ) {
              // computation failed
              deferred.reject({
                input: config.variables,
                result: results
              });
            } else {
              console.log("resolve", results);
              deferred.resolve({
                input: config.variables,
                result: results
              });
            }
          }, function errFn(reasons) {
            deferred.reject({
              input: config.variables,
              result: result
            });

            console.log("error", reasons);
            deferred.reject(reasons);         
          })
          .finally(function() {
            updateSampleCount();
            TabService.lock(false);
            windowObject.circleSpin(false);
            windowObject.circleSpinValue(0);
            _.remove(_queueWindows, function(win) { return win == windowObject; });
            _.remove(_queuePromises, function(d) { return d == deferred.promise; });
          });
        });
      }

      checkWorkers();

      var deferred = $q.defer();
      _queuePromises.push(deferred.promise);
      _queueWindows.push(windowObject);

      if(service.inProgress()) {
        doQueue(config, windowObject, deferred);
      } else {
        doDefault(config, windowObject, deferred);
      }

      return deferred.promise;

    }; // compute

    service.sampleCount = function() {
      return _sampleCount;
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
        _availableCores = (cores - 1 > 0) ?  cores - 1 : cores;
        _availableCores = (_availableCores > MAX_REGRESSION_THREADS) ? MAX_REGRESSION_THREADS : _availableCores;
      }, function errFn() {
        _availableCores = DEFAULT_REGRESSION_THREADS;
      })
      .finally(function() {
        initWorkers(_availableCores);
      });

    }, 3000);

    return service;
  }
]);