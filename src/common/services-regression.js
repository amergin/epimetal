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

    function dispSize(title, matrix) {
      var isArray = function(d) {
        return _.isArray(d);
      };
      console.log(title + ": ", isArray(matrix) ? _.size(matrix) : 1, " x ", isArray(matrix[0]) ? _.size(matrix[0]) : 1);
    }

    function getCI(dotInverse, xMatrix, xMatrixTransposed, yMatrixTransposed, n, k, beta) {
      var VARIABLE_INDEX = 1;

      var hMatrix = numeric.dot( numeric.dot(xMatrix, dotInverse), xMatrixTransposed );
      // dispSize("hMatrix", hMatrix);

      var _identity = numeric.identity( _.size(hMatrix) );
      // dispSize("identity", _identity);

      var _subtracted = numeric.sub(_identity, hMatrix);
      // dispSize("subtracted", _subtracted);

      var yMatrix = numeric.transpose(yMatrixTransposed);

      // var _yMatrixTransp = numeric.transpose([yMatrix]);
      // dispSize("yTrans", _yMatrixTransp);
      // dispSize("y", yMatrix);

      var sigma = numeric.dot( numeric.dot( yMatrixTransposed, _subtracted ), yMatrix )[0][0] / (n-(k+1));
      console.log("sigma=", sigma);
      var cMatrix = numeric.mul(sigma, dotInverse);
      console.log("cmatrix=", JSON.stringify(cMatrix));

      var alpha = 0.05 / k;

      var _sqrt = Math.sqrt( cMatrix[VARIABLE_INDEX][VARIABLE_INDEX] ); //numeric.getDiag(cMatrix)[1] );
      var ci = statDist.tdistr(n-(k+1), alpha/2) * _sqrt;
      console.log("CI before [sub, add] of beta = ", ci);

      var ret = [ beta - ci, beta + ci ];
      // console.log(ret);
      return ret;
    }

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
        var process = function(array) {
          var ret = [],
          avg = mean(array),
          stDev = stDeviation(array, avg, function(d) { return +d; });
          for(var i = 0; i < array.length; ++i) {
            ret.push( (+array[i] - avg)/stDev );
          }
          return ret;
        };

        var normalized = [];
        // matrix = array with vertical columns
        if( _.isArray(data[0]) ) {
          _.each(data, function(array) {
            normalized.push( process(array) );
          });
        } else {
          normalized = process(data);
        }
        return normalized;
      };

      console.log("Thread started");

      var threadNaNs = getNaNIndices(thData.data),
        nanIndices = _.union(threadNaNs, global.env.nanIndices),
        associationData = getNormalizedData( stripNaNs(thData.data, nanIndices) ),
        onesArray = _.times(associationData.length, function(d) {
          return 1;
        }),
        // these are global and hence const, never try to modify them!
        targetData = getNormalizedData( stripNaNs(global.env.targetData.slice(0), nanIndices) ),
        adjustData = getNormalizedData( getStrippedAdjust(global.env.adjustData, nanIndices) );

      var xMatrixTransp = [onesArray, associationData].concat(adjustData),
      xMatrix  = numeric.transpose(xMatrixTransp);

      // see https://en.wikipedia.org/wiki/Ordinary_least_squares#Estimation
      // Compute beta = (X^T X)^{-1} X^T y 
      var dotProduct = numeric.dot(xMatrixTransp, xMatrix),
      inverse = numeric.inv(dotProduct),
      multi2 = numeric.dot(inverse, xMatrixTransp),
      betas = numeric.dot(multi2, targetData);

      // get confidence interval
      var ci = getCI(inverse, xMatrix, xMatrixTransp, [targetData], _.size(xMatrix), global.env.xColumns, betas[1]);

      return {
        betas: betas,
        variable: thData.variable,
        ci: ci
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
              nanIndices: getAllNaNs(targetData, targetVar, adjustData, adjustVars),
              xColumns: _.size(threadData) // = k
            }
          })
          .require('numeric.min.js')
          .require('underscore-min.js')
          // nan proprocessing
          .require(getNaNIndices)
          .require(stripNaNs)
          // normalization
          .require({ fn: Utils.stDeviation, name: 'stDeviation' })
          .require('statistics-distributions-packaged.js')
          // t distribution
          .require(getCI)
          // debugging
          .require(dispSize)
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