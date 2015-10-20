angular.module('ext.lodash', []).factory('_', function lodash() {
    return window._;
});

angular.module('ext.d3', []).factory('d3', function d3() {
    return window.d3;
});

angular.module('ext.dc', []).factory('dc', function dc() {
    return window.dc;
});

angular.module('ext.mathjs', [])
.run(function() {
  // should come in handy for custom math expressions:
  window.math.import({ln: window.math.log});
})
.factory('math', function mathjs() {
    return window.math;
});

angular.module('utilities.math', []).factory('mathUtils', function mathUtils() {
    return window.mathUtils;
});

angular.module('ext.core-estimator', [])
.factory('coreEstimator', function coreEstimator($q, $timeout) {
  var _cores = null;

  var service = {
    get: function() {
      var deferred = $q.defer();
      if(_cores) {
        deferred.resolve(_cores);
      } else {
        // in case core-estimator bugs out and we never get a reply
        var timeoutPromise = $timeout(function() {
          deferred.reject("timeout");
        }, 3000);
        navigator.getHardwareConcurrency(function(cores) {
          _cores = cores;
          $timeout.cancel(timeoutPromise);
          deferred.resolve(_cores);
        });
      }
      return deferred.promise;
    }
  };

  return service;
});

