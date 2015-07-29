angular.module('ext.lodash', []).factory('_', function() {
    return window._;
});

angular.module('ext.d3', []).factory('d3', function() {
    return window.d3;
});

angular.module('utilities.math', []).factory('mathUtils', function() {
    return window.mathUtils;
});

angular.module('ext.core-estimator', []).factory('coreEstimator', function() {
  var getNoCores = _.once(function() {
    navigator.getHardwareConcurrency(function(cores) {
      _cores = cores;
    });
  }),
  _cores = null;

  getNoCores();

  return {
    get: function() {
      return _cores;
    }
  };
});

