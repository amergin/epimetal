var mod = angular.module('services.regression', ['services.dataset', 'services.filter', 'services.tab']);

mod.factory('RegressionService', ['$injector', '$q', '$rootScope', 'DatasetFactory', 'TabService',
  function RegressionService($injector, $q, $rootScope, DatasetFactory, TabService) {
    var that = this;
    var service = {};
    var FilterService = $injector.get('FilterService');

    var _inProgress = false;
    var _result = {};

    var getData = function(variables, windowHandler) {
      var getRaw = function(samples) {
        return _.map(samples, function(s) {
          return s.variables;
        });
      };
      var getSOMData = function(windowHandler) {
        var service = windowHandler.getService().get('vis.som'),
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
              return (bmu.x == (h.j+1)) && (bmu.y == (h.i+1));
            });
          })
          .value();
          return {
            id: circle.id(),
            samples: getRaw(circleSamples)
          };
        })
        .value();
      };

      var deferred = $q.defer();
      // fetches the data from API and adds it to dimensionservices
      DatasetFactory.getVariableData(variables, windowHandler)
        .then(function() {
          that.sampleDimension = windowHandler.getDimensionService().getSampleDimension();
          var retObject = {
            circles: getSOMData(windowHandler),
            total: {
              samples: getRaw(that.sampleDimension.get().top(Infinity))
            }
          };
          deferred.resolve(retObject);
        });
      return deferred.promise;
    };

    var getVariableData = function(data, variable) {
      var obj = {
        total: {
          samples: _.pluck(data.total.samples, variable),
        },
        circles: _.map(data.circles, function(circle) {
          return {
            id: circle.id,
            samples: _.pluck(circle.samples, variable)
          };
        })
      };
      return obj;
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
      var pluckVariables = function(data, variables) {
        return _.map(variables, function(v) {
          return _.pluck(data, v);
        });
      };
      var ret = {
        total: [],
        circles: {}
      };
      ret.total = pluckVariables(data.total.samples,variables);
      _.each(data.circles, function(circle, ind) {
        ret.circles[circle.id] = pluckVariables(circle.samples, variables);
      });
      return ret;
    };

    function dispSize(title, matrix) {
      var isArray = function(d) {
        return _.isArray(d);
      };
      console.log(title + ": ", isArray(matrix) ? _.size(matrix) : 1, " x ", isArray(matrix[0]) ? _.size(matrix[0]) : 1);
    }

    function getCIAndPvalue(dotInverse, xMatrix, xMatrixTransposed, yMatrixTransposed, n, k, beta) {
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
      var degrees = n-(k+1);
      var ci = statDist.tdistr(degrees, alpha/2) * _sqrt;

      // See http://reliawiki.org/index.php/Multiple_Linear_Regression_Analysis 
      // -> p value = 2 * (1-P(T <= |t0|)
      var t = beta / _sqrt;
      var pvalue = 2 * statDist.tprob(degrees, t);

      console.log("CI before [sub, add] of beta = ", ci);
      return {
        ci: [ beta - ci, beta + ci ],
        pvalue: pvalue
      };
    }

    // this is called on each thread execution
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

      var compute = function(assocData, nanIndices, targetData, adjustData) {
        var threadNaNs = getNaNIndices(assocData),
        allNaNIndices = _.union(threadNaNs, nanIndices),
        normalAssocData = getNormalizedData( stripNaNs(assocData, allNaNIndices) ),
        onesArray = _.times(normalAssocData.length, function(d) { return 1; }),
        normalTargetData = getNormalizedData( stripNaNs(targetData, allNaNIndices) ),
        normalAdjustData = getNormalizedData( getStrippedAdjust(adjustData, allNaNIndices) );

        var xMatrixTransp = [onesArray, normalAssocData].concat(normalAdjustData),
        xMatrix = numeric.transpose(xMatrixTransp);

        // see https://en.wikipedia.org/wiki/Ordinary_least_squares#Estimation
        // Compute beta = (X^T X)^{-1} X^T y 
        var dotProduct = numeric.dot(xMatrixTransp, xMatrix),
        inverse = numeric.inv(dotProduct),
        multi2 = numeric.dot(inverse, xMatrixTransp),
        betas = numeric.dot(multi2, normalTargetData);

        // get confidence interval and p-value
        var ciAndPvalue = getCIAndPvalue(inverse, xMatrix, xMatrixTransp, [normalTargetData], _.size(xMatrix), global.env.xColumns, betas[1]);

        return {
          betas: betas,
          ci: ciAndPvalue.ci,
          pvalue: ciAndPvalue.pvalue
        };
      }; // end compute 

      console.log("Thread started");
      var retObj = {
        total: null,
        circles: {},
        variable: thData.variable
      };

      // process total
      retObj['total'] = compute(thData.data.total.samples, global.env.nanIndices.total, 
        global.env.targetData.total.samples.slice(0), global.env.adjustData.total);

      // process each circle
      _.each(thData.data.circles, function(circle, ind) {
        retObj.circles[circle.id] = compute(circle.samples, global.env.nanIndices.circles[circle.id], 
          global.env.targetData.circles[ind].samples.slice(0), global.env.adjustData.circles[circle.id]);
      });

      // all done
      return retObj;
    }

    var getNaNs = function(targetData, targetVar, adjustData, adjustVars) {
      var indices = [];
      indices = indices.concat(getNaNIndices(targetData));
      _.each(adjustVars, function(v, ind) {
        indices = indices.concat(getNaNIndices(adjustData[ind]));
      });

      return _.union(indices);
    };

    var getAllNaNs = function(targetData, targetVar, adjustData, adjustVars) {
      var obj = {
        total: [],
        circles: {
        }
      };

      // total
      obj.total = getNaNs(targetData.total.samples, targetVar, adjustData.total, adjustVars);

      // circles
      _.each(targetData.circles, function(circle, ind) {
        obj.circles[circle.id] = getNaNs( circle.samples, targetVar, adjustData.circles[circle.id], adjustVars);
      });
      return obj;
    };

    service.inProgress = function() {
      return _inProgress;
    };

    service.compute = function(config, windowHandler) {
      TabService.lock(true);
      var deferred = $q.defer();
      windowHandler.spinAll();
      _inProgress = true;

      var variables = _.chain(config.variables).values().flatten(true).unique().value();
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
          .require('lodash.min.js')
          // nan proprocessing
          .require(getNaNIndices)
          .require(stripNaNs)
          // normalization
          .require({ fn: Utils.stDeviation, name: 'stDeviation' })
          .require('statistics-distributions-packaged.js')
          // t distribution
          .require(getCIAndPvalue)
          // debugging
          .require(dispSize)
          .map(threadFunctionNumericjs)
          .then(function succFn(result) {
            windowHandler.stopAllSpins();
            console.log("Result Betas=", result);
            _inProgress = false;
            _result = result;
            TabService.lock(false);
            deferred.resolve({
              input: config.variables,
              result: result
            });
          }, function errFn(result) {
            _inProgress = false;
            TabService.lock(false);
            deferred.reject({
              input: config.variables,
              result: result
            });
          });
      });
      return deferred.promise;
    };

    return service;
  }
]);