angular.module('services.regression', ['services.dataset', 'services.filter', 'services.tab'])

.factory('RegressionService', ['$injector', '$q', '$rootScope', 'DatasetFactory', 'TabService',
  function RegressionService($injector, $q, $rootScope, DatasetFactory, TabService) {
    var that = this;
    var service = {};
    var FilterService = $injector.get('FilterService');

    var _inProgress = false;
    var _result = {};
    // sample count before 
    var _sampleCount = {};
    var _variables = {
      target: null,
      association: [],
      adjust: []
    };

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
      var ret = _.map(data, function(d) {
        var shallow = _.clone(d);
        shallow.samples = pluckVariables(d.samples, variables);
        return shallow;
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
      var pvalue = statDist.tprob(degrees, t);

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

      var compute = function(config) {
        var assocData = config.association,
        nanIndices = config.nans,
        targetData = config.target,
        adjustData = config.adjustData;

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
        betas = numeric.dot(multi2, normalTargetData),

        n = _.size(xMatrix),
        k = _.size(xMatrix[0]),
        beta = betas[1];

        // get confidence interval and p-value
        var ciAndPvalue = getCIAndPvalue(inverse, xMatrix, xMatrixTransp, [normalTargetData], n, k, beta);

        return {
          result: { success: true },
          betas: betas,
          ci: ciAndPvalue.ci,
          pvalue: ciAndPvalue.pvalue
        };


      }; // end compute 

      function getError(message) {
        return {
          success: false,
          reason: message
        };          
      }

      console.log("Thread started");

      var retObj = {
        result: { 'success': true },
        payload: [],
        variable: thData.variable
      };

      // process total
      try {
        _.each(thData.data, function(obj) {
          var computation = compute({
            association: obj.samples,
            nans: _.find(global.env.nanIndices, function(d) { return d.name == obj.name; }).nans,
            target: _.find(global.env.targetData, function(d) { return d.name == obj.name; }).samples,
            adjustData: _.find(global.env.adjustData, function(d) { return d.name == obj.name; }).samples
          }),
          result = _.chain(obj)
            .omit('samples')
            .extend(computation)
            .value();

          retObj.payload.push(result);
        });
      } catch(errorObject) {
        console.log("Regression throws error: ", errorObject.message);
        retObj['result'] = getError('Something went wrong while computing the regression. Please check and adjust sample selections as needed.');
      }
      finally {
        return retObj;
      }

    }

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
      return _inProgress;
    };

    service.selectedVariables = function(x) {
      if(!arguments.length) { return _variables; }
      _variables = x;
      return service;
    };

    service.compute = function(config, windowHandler) {
      TabService.lock(true);
      var deferred = $q.defer();
      _inProgress = true;

      var variables = _.chain(config.variables).values().flatten(true).unique().value();
      getData(variables, windowHandler, config.source).then(function(data) {

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
            console.log("Regression result = ", result);
            _inProgress = false;
            _result = result;
            updateSampleCount();
            TabService.lock(false);

            if( !result[0].result.success ) {
              // computation failed
              deferred.reject({
                input: config.variables,
                result: result
              });
            } else {
              deferred.resolve({
                input: config.variables,
                result: result
              });
            }
          }, function errFn(result) {
            _inProgress = false;
            TabService.lock(false);
            _result = {};
            updateSampleCount();
            deferred.reject({
              input: config.variables,
              result: result
            });
          });
      });
      return deferred.promise;
    };

    // only get
    service.result = function() {
      return _result;
    };

    service.sampleCount = function() {
      return _sampleCount;
    };

    return service;
  }
]);