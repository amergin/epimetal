angular.module('ext.lodash', []).factory('_', function() {
    return window._;
});

angular.module('ext.d3', []).factory('d3', function() {
    return window.d3;
});

angular.module('utilities.math', []).factory('mathUtils', function() {
    return window.mathUtils;
});

angular.module('ext.core-estimator', [])

.factory('coreEstimator', function($q, $timeout) {
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

