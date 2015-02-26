var mod = angular.module('services.regression', ['services.dataset', 'services.notify']);

mod.factory('RegressionService', ['$injector', '$q', '$rootScope', 'DatasetFactory', 'NotifyService',
  function RegressionService($injector, $q, $rootScope, DatasetFactory, NotifyService) {
    var that = this;
    var service = {};

    var _inProgress = false;
    var _result = {};

    var getData = function(variables, windowHandler) {
      var getRaw = function(samples, variables) {
        return _.map(samples, function(s) {
          return s.variables;
        });
      };
      var deferred = $q.defer();
      DatasetFactory.getVariableData(variables, windowHandler)
        .then(function() {
          that.sampleDimension = windowHandler.getDimensionService().getSampleDimension();
          var raw = getRaw(that.sampleDimension.get().top(Infinity), variables);
          deferred.resolve(raw);
        });
      return deferred.promise;
    };

    var getVariableData = function(data, variable) {
      return _.pluck(data, variable);
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

    function stripNaNs(data, indices) {
      return _.filter(data, function(d, ind) {
        return !_.contains(indices, ind);
      });
    }

    var getAdjustData = function(data, variables) {
      var ret = [];
      _.each(variables, function(v) {
        ret.push(_.pluck(data, v));
      });
      return ret;
    };


    function threadFunctionNumericjs(thData) {
      var getStrippedAdjust = function(data, nanIndices) {
        var ret = [];
        _.each(data, function(array) {
          var copy = array.slice(0);
          ret.push(stripNaNs(copy, nanIndices));
        });
        return ret;
      };

      function mean(arr) {
        var num = arr.length, sum = 0;
        for(var i = 0; i < arr.length; i++) {
          var val = +arr[i];
          sum += val;
        }
        return sum / num;
      }

      var getNormalizedData = function(data) {
        var avg = mean(data),
        stDev = stDeviation(data, avg, function(d) { return +d; }),
        normalized = [];
        for(var i = 0; i < data.length; ++i) {
          normalized.push( (+data[i] - avg)/stDev );
        }
        return normalized;
      };

      console.log("Thread started");

      var threadNaNs = getNaNIndices(thData.data),
        nanIndices = _.union(threadNaNs, global.env.nanIndices),
        associationDataRaw = stripNaNs(thData.data, nanIndices),
        associationData = getNormalizedData(associationDataRaw),
        onesArray = _.times(associationData.length, function(d) {
          return 1;
        }),
        // these are global and hence const, never try to modify them!
        targetData = stripNaNs(global.env.targetData.slice(0), nanIndices),
        adjustData = getStrippedAdjust(global.env.adjustData, nanIndices);

      var xMatrixTransp = [onesArray, associationData].concat(adjustData);
      var xMatrix  = numeric.transpose(xMatrixTransp);
      console.log( "transp size =", _.size(xMatrixTransp) );
      console.log( "matrix size =", _.size(xMatrix) );

      // see https://en.wikipedia.org/wiki/Ordinary_least_squares#Estimation
      // beta = (X^T X)^{-1} X^T y 
      var t0 = performance.now();
      var multi = numeric.dot(xMatrixTransp, xMatrix);
      var t1 = performance.now();
      console.log("multi took ", (t1 - t0) / 1000, " seconds");

      t0 = performance.now();
      var inv = numeric.inv(multi);
      t1 = performance.now();
      console.log("inv took ", (t1 - t0) / 1000, " seconds");

      t0 = performance.now();
      var multi2 = numeric.dot(inv, xMatrixTransp);
      t1 = performance.now();
      console.log("multi2 took ", (t1 - t0) / 1000, " seconds");

      t0 = performance.now();
      var multi3 = numeric.dot(multi2, targetData);
      t1 = performance.now();
      console.log("multi3 took ", (t1 - t0) / 1000, " seconds");

      return {
        betas: multi3,
        variable: thData.variable
      };
    }

    var getAllNaNs = function(targetData, targetVar, adjustData, adjustVars) {
      var indices = [];
      indices = indices.concat(getNaNIndices(targetData));
      _.each(adjustVars, function(v, ind) {
        indices = indices.concat(getNaNIndices(adjustData[ind]));
      });

      return _.union(indices);
    };

    service.inProgress = function() {
      return _inProgress;
    };

    service.compute = function(config, windowHandler) {
      var deferred = $q.defer();
      windowHandler.spinAll();
      _inProgress = true;
      NotifyService.addTransient('Regression analysis started', 'Regression analysis computation started.', 'info');

      var variables = _.chain(config.variables).values().flatten().unique().value();
      getData(variables, windowHandler).then(function(data) {

        var targetVar = config.variables.target,
          assocVars = config.variables.association,
          adjustVars = config.variables.adjust;

        var threadData = getThreads(data, assocVars),
          targetData = getVariableData(data, targetVar),
          adjustData = getAdjustData(data, adjustVars);

        var parallel = new Parallel(threadData, {
            evalPath: 'assets/threads/eval.js',
            env: {
              targetData: targetData,
              adjustData: adjustData,
              nanIndices: getAllNaNs(targetData, targetVar, adjustData, adjustVars)
            }
          })
          .require('numeric.min.js')
          .require('underscore-min.js')
          .require(getNaNIndices)
          .require(stripNaNs)
          .require({ fn: Utils.stDeviation, name: 'stDeviation' })
          .map(threadFunctionNumericjs)
          .then(function succFn(result) {
            windowHandler.stopAllSpins();
            console.log("Result Betas=", result);
            _inProgress = false;
            _result = result;
            NotifyService.addTransient('Regression analysis completed', 'Regression computation ready.', 'success');
            deferred.resolve(result);
          }, function errFn(result) {
            _inProgress = false;
            NotifyService.addTransient('Regression analysis failed', 'Something went wrong while performing the computation.', 'error');
            deferred.reject(result);
          });
      });
      return deferred.promise;
    };

    return service;
  }
]);