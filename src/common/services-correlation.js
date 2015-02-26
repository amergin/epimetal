var mod = angular.module('services.correlation', ['services.dataset', 'services.notify']);

mod.factory('CorrelationService', ['$injector', '$q', '$rootScope', 'DatasetFactory', 'NotifyService',
  function RegressionService($injector, $q, $rootScope, DatasetFactory, NotifyService) {
    var that = this;
    var service = {};

    var _inProgress = false;
    var _result = [];

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

      return {
        diagonals: diagonals,
        coordinates: Utils.subarrays(coordinates, 20)
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

    function threadFunction(coordinates) {
      function mean(arr, variable) {
        var num = arr.length, sum = 0;
        for(var i = 0; i < arr.length; i++) {
          var val = +arr[i][variable];
          if( _.isNaN(val) ) {
            --num;
          } else {
            sum += val;
          }
        }
        return sum / num;
      }

      var samples = global.env.samples;

      _.each(coordinates, function(coord, ind) {
        var varX = coord.x,
        varY = coord.y,
        meanX = mean(samples, varX),
        meanY = mean(samples, varY);

        var stdX = stDeviation(samples, meanX, varX),
        stdY = stDeviation(samples, meanY, varY);

        // correlation
        coord['corr'] = sampleCorrelation(samples, varX, meanX, stdX, varY, meanY, stdY);
        // p-value
        coord['pvalue'] = calcPForPearsonR(coord['corr'], samples.length);
      });

      console.log("Thread ready");
      return coordinates;
    }

    service.inProgress = function() {
      return _inProgress;
    };

    service.compute = function(config, windowHandler) {
      var deferred = $q.defer();
      _inProgress = true;
      NotifyService.addTransient('Correlation computation started', 'Recomputing correlations and p-values.', 'info');

      var cellInfo = partitionHeatmapTable(config.variables);

      getData(config.variables, windowHandler).then(function(data) {

        var parallel = new Parallel(cellInfo.coordinates, {
            evalPath: 'assets/threads/eval.js',
            env: {
              // always use a copy of the samples
              samples: data.slice(0),
              variables: config.variables
            }
          })
          .require('underscore-min.js')
          // .require('d3.min.js')
          .require({ fn: Utils.stDeviation, name: 'stDeviation' })
          .require({ fn: Utils.sampleCorrelation, name: 'sampleCorrelation' })
          .require({ fn: Utils.calcPForPearsonR, name: 'calcPForPearsonR' })
          .require(normCumulativeApprox)
          .require(atanh)
          .map(threadFunction)
          .then(function(result) {
            _inProgress = false;
            var flattened = _.chain(result).values().flatten().unique().value();
            _result = combineResults(flattened, cellInfo.diagonals);
            NotifyService.addTransient('Correlation computation ready', 'Correlation plot updated.', 'success');
            deferred.resolve(_result);
          });
      });
      return deferred.promise;
    };

    return service;
  }
]);