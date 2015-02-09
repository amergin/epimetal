var mod = angular.module('services.regression', ['services.dataset', 'services.notify']);

mod.factory('RegressionService', ['$injector', '$q', '$rootScope', 'DatasetFactory', 'NotifyService',
  function RegressionService($injector, $q, $rootScope, DatasetFactory, NotifyService) {
    var that = this;
    var service = {};

    var _inProgress = false;

    var getData = function(variables, windowHandler) {
      var getRaw = function(samples, variables) {
        return _.map(samples, function(s) { return s.variables; } );
      };
      var deferred = $q.defer();
      DatasetFactory.getVariableData(variables, windowHandler)
      .then(function() {
        that.sampleDimension = windowHandler.getDimensionService().getSampleDimension();
        var raw = getRaw( that.sampleDimension.get().top(Infinity), variables );
        deferred.resolve( raw );
      });
      return deferred.promise;
    };

    var getVariableData = function(data, variable) {
      return _.pluck(data, variable);
    };

    var getThreads = function(data, assocVars) {
      var threadData = [];
      _.each(assocVars, function(assocVar) {
        threadData.push( getVariableData(data, assocVar) );
      });
      return threadData;
    };


    function getNaNIndices(data) {
      var nans = [], val;
      for(var i = 0; i < data.length; ++i) {
        val = +data[i];
        if( _.isNaN(val) ) {
          nans.push(i);
        }
      }
      return nans;
    }

    function stripNaNs(data, indices) {
      return _.filter(data, function(d,ind) {
        return !_.contains(indices, ind);
      });
    }

    var getAdjustData = function(data, variables) {
      var ret = [];
      _.each(variables, function(v) {
        ret.push( _.pluck(data, v) );
      });
      return ret;
    };


    function threadFunctionNumericjs(thData) {
      var getStrippedAdjust = function(data, nanIndices) {
        var ret = [];
        _.each(data, function(array) {
          var copy = array.slice(0);
          ret.push( stripNaNs(copy, nanIndices) );
        });
        return ret;
      };

      console.log("thread started");

      var threadNaNs = getNaNIndices(thData),
      nanIndices = _.union(threadNaNs, global.env.nanIndices),
      threadData = stripNaNs(thData, nanIndices),
      onesArray = _.times(threadData.length, function(d) { return 1; }),
      targetData = stripNaNs(global.env.targetData.slice(0), nanIndices),
      adjustData = getStrippedAdjust(global.env.adjustData, nanIndices);

      var xMatrix = [ onesArray, threadData ].concat(adjustData);
      var xMatrixTransp = numeric.transpose(xMatrix);

      // see https://en.wikipedia.org/wiki/Ordinary_least_squares#Estimation
      // beta = (X^T X)^{-1} X^T y 
      var t0 = performance.now();
      var multi = numeric.dot( xMatrixTransp, xMatrix );
      var t1 = performance.now();
      console.log("multi took ", (t1-t0) / 1000, " seconds");

      t0 = performance.now();
      var inv = numeric.inv(multi);
      t1 = performance.now();
      console.log("inv took ", (t1-t0) / 1000, " seconds");

      t0 = performance.now();
      var multi2 = numeric.dot(inv, xMatrixTransp);
      t1 = performance.now();
      console.log("multi2 took ", (t1-t0) / 1000, " seconds");

      t0 = performance.now();
      var multi3 = numeric.dot(multi2, targetData);
      t1 = performance.now();
      console.log("multi3 took ", (t1-t0) / 1000, " seconds");

      return multi3;
    }







    function threadFunctionMathjs(thData) {
      var getStrippedAdjust = function(data, nanIndices) {
        var ret = [];
        _.each(data, function(array) {
          var copy = array.slice(0);
          ret.push( stripNaNs(copy, nanIndices) );
        });
        return ret;
      };

      console.log("thread started");

      var threadNaNs = getNaNIndices(thData),
      nanIndices = _.union(threadNaNs, global.env.nanIndices),
      threadData = stripNaNs(thData, nanIndices),
      onesArray = _.times(threadData.length, function(d) { return 1; }),
      targetData = stripNaNs(global.env.targetData.slice(0), nanIndices),
      adjustData = getStrippedAdjust(global.env.adjustData, nanIndices);

      var xArray = [ onesArray, threadData ].concat(adjustData);

      var xMatrix = math.matrix(xArray),
      xMatrixTransp = math.transpose(xMatrix);


      console.log("Starting matrix computation");
      // see https://en.wikipedia.org/wiki/Ordinary_least_squares#Estimation
      // beta = (X^T X)^{-1} X^T y 
      // var beta = math.chain(xMatrixTransp)
      // .multiply(xMatrix)
      // .inv()
      // .multiply(xMatrixTransp)
      // .multiply(targetData)
      // .done();
      // return beta;

      var t0 = performance.now();
      var res1 = math.multiply(xMatrixTransp, xMatrix);
      var t1 = performance.now();
      console.log("res1 took ", t1-t0 / 1000, " seconds");

      t0 = performance.now();
      var res2 = math.inv(res1);
      t1 = performance.now();
      console.log("res2 took ", t1-t0 / 1000, " seconds");

      t0 = performance.now();
      var res3 = math.multiply(res2, xMatrixTransp);
      t1 = performance.now();
      console.log("res3 took ", t1-t0 / 1000, " seconds");

      t0 = performance.now();
      var res4 = math.multiply(res3, targetData);
      t1 = performance.now();
      console.log("res4 took ", t1-t0 / 1000, " seconds");

      console.log("Thread computation completed");
      return res4;
    }

    var getAllNaNs = function(targetData, targetVar, adjustData, adjustVars) {
      var indices = [];
      indices = indices.concat( getNaNIndices(targetData) );
      _.each( adjustVars, function(v, ind) {
        indices = indices.concat( getNaNIndices(adjustData[ind]) );
      });

      return _.union(indices);
    };

    service.compute = function(config, windowHandler) {
      var deferred = $q.defer();
      windowHandler.spinAll();
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
        .require('numeric.min.js') //'math.min.js')//'assets/threads/math.min.js')
        .require('underscore-min.js')//'assets/threads/underscore-min.js')
        .require(getNaNIndices)
        .require(stripNaNs)
        .map(threadFunctionNumericjs)
        .then(function(result) {
          windowHandler.stopAllSpins();
          console.log("Result Betas=", result);
        });
      });
      return deferred.promise;
    };

    return service;
  }
  ]);