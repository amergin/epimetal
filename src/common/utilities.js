// Utilities
var Utils = Utils || {};
var module = angular.module('utilities', []);

// selects all text for example in a input/text area when applied
module.directive('selectOnClick', function() {
  return {
    restrict: 'A',
    // Linker function
    link: function(scope, element, attrs) {
      element.bind('click', function() {
        this.select();
      });
    }
  };
});

// disables angular-animate on elements. See
//http://stackoverflow.com/questions/21249441/disable-nganimate-form-some-elements
module.directive('disableAnimate', ['$animate', function($animate) {
  return {
    link: function(scope, element) {
        $animate.enabled(false, element);
    },
    priority: 150
  };
}]);

module.directive('enableAnimate', ['$animate', function($animate) {
    return function(scope, element) {
        $animate.enabled(true, element);
    };
}]);

Utils.getVariables = function(windowType, selection, splitScatter) {
  if (windowType === 'scatterplot') {
    if (splitScatter) {
      return [selection.x + "|" + selection.y];
    }
    return [selection.x, selection.y];
  } else if (windowType === 'histogram') {
    return [selection.x];
  } else if (windowType === 'heatmap') {
    return selection.x;
  } else if (windowType === 'somplane') {
    return [];
  } else {
    console.log("Undefined type!");
  }
};

Utils.stDeviation = function(array, mean, variable) {
  // for loop is actually fastest vs js map-reduce
  // http://stackoverflow.com/questions/3762589/fastest-javascript-summation
  var dev = [];
  for (var i = array.length; i--;) {
    var val = +array[i].variables[variable];
    dev.push((val - mean) * (val - mean));
  }

  var count = 0;
  for (var j = dev.length; j--;) {
    count += dev[j] || 0;
  }

  return Math.sqrt(count / (array.length - 1));
};

Utils.sampleCorrelation = function(samples, varA, meanA, stdA, varB, meanB, stdB) {
  var val = 0;
  _.each(samples, function(samp, ind) {
    var valA = +samp.variables[varA];
    var valB = +samp.variables[varB];
    // if (_.isUndefined(valA) || _.isUndefined(valB)) {
    //   return;
    // }
    var sum = (valA - meanA) * (valB - meanB);
    if (_(sum).isNaN()) {
      return;
    }
    val += sum;
  });
  return val / (stdA * stdB * (samples.length - 1));
};

// NOTE: this will be an infinite loop without 'g' flag!
RegExp.prototype.execAll = function(string) {
  var match = null;
  var matches = []; //new Array();
  while (match = this.exec(string)) {
    var matchArray = [];
    for (var i in match) {
      if (parseInt(i) == i) {
        matchArray.push(match[i]);
      }
    }
    matches.push(matchArray);
  }
  return matches;
};

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) === str;
  };
}

Utils.indexOf = function(arr, equalityFn) {
  var ind = -1;
  var found = _.some(arr, function(f,i) {
    if( equalityFn(f,i) ) { 
      ind = i;
      return true;
    }
    return false;
  });
  return ind;
};
