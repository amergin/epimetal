// Utilities
var Utils = Utils || {};
var utilModule = angular.module('utilities', []);

// selects all text for example in a input/text area when applied
utilModule.directive('selectOnClick', function() {
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

utilModule.directive('noclick', [function() {
    return {
      restrict: 'A',
      link: function link(scope, element, attrs) {
        element.bind('click', function(e) {
            e.stopPropagation();
        });
      }
    };
}]);

// for introducing a custom directive in a nested directive situation
utilModule.directive('replaceAndCompile', ['$compile', '$timeout', function($compile, $timeout) {
  return {
    scope: { 
      'name': '=reName',
      'window': '=reWindow' 
    },
    restrict: 'A',
    priority: 200,
    link: {
      post: function(scope, element, attrs) {
        $timeout( function() {
          var el = angular.element('<div/>')
          .addClass(scope.name)
          .addClass('figure');
          element.parent().append(el);
          $compile(el)(scope);
          element.remove();
        });
      }
    }
  };
}]);

// disables angular-animate on elements. See
//http://stackoverflow.com/questions/21249441/disable-nganimate-form-some-elements
utilModule.directive('disableAnimate', ['$animate', function($animate) {
  return {
    link: function(scope, element) {
      $animate.enabled(false, element);
    },
    priority: 150
  };
}]);

utilModule.directive('enableAnimate', ['$animate', function($animate) {
  return function(scope, element) {
    $animate.enabled(true, element);
  };
}]);

// see http://stackoverflow.com/questions/25600071/how-to-achieve-that-ui-sref-be-conditionally-executed
utilModule.directive('eatClickIf', ['$parse', '$rootScope',
  function($parse, $rootScope) {
    return {
      // this ensure eatClickIf be compiled before ngClick
      priority: 100,
      restrict: 'A',
      compile: function($element, attr) {
        var fn = $parse(attr.eatClickIf);
        return {
          pre: function link(scope, element) {
            var eventName = 'click';
            element.on(eventName, function(event) {
              var callback = function() {
                if (fn(scope, {$event: event})) {
                  // prevents ng-click to be executed
                  event.stopImmediatePropagation();
                  // prevents href 
                  event.preventDefault();
                  return false;
                }
              };
              if ($rootScope.$$phase) {
                scope.$evalAsync(callback);
              } else {
                scope.$apply(callback);
              }
            });
          },
          post: function() {}
        };
      }
    };
  }
]);

Utils.stDeviation = function(array, mean, accessFn) { //variable) {
  // for loop is actually fastest vs js map-reduce
  // http://stackoverflow.com/questions/3762589/fastest-javascript-summation
  var dev = [];
  for (var i = array.length; i--;) {
    var val = accessFn.apply(null, [ array[i] ] );
    // var val = +array[i][variable];
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
    var valA = +samp[varA];
    var valB = +samp[varB];

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

// find index of object based on the value returned by the
// equality function
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


function atanh(x) {
  return 0.5 * Math.log((1+x)/(1-x));
}

/*
* Approximation for cumulative univariate normal distribution.
* (G. West : BETTER APPROXIMATIONS TO CUMULATIVE NORMAL FUNCTIONS,
* https://lyle.smu.edu/~aleskovs/emis/sqc2/accuratecumnorm.pdf)
*/
function normCumulativeApprox(x) {

  var xabs = Math.abs(x);
  var cm;

  if(xabs > 37) {

    cm = 0;

  } else {

    exponential = Math.exp(- (xabs*xabs) / 2);

    if(xabs < 7.07106781186547) {

      build = 0.0352624965998911 * xabs + 0.700383064443688;
      build = build * xabs + 6.37396220353165;
      build = build * xabs + 33.912866078383;
      build = build * xabs + 112.079291497871;
      build = build * xabs + 221.213596169931;
      build = build * xabs + 220.206867912376;
      cm = exponential * build;
      build = 0.0883883476483184 * xabs + 1.75566716318264;
      build = build * xabs + 16.064177579207;
      build = build * xabs + 86.7807322029461;
      build = build * xabs + 296.564248779674;
      build = build * xabs + 637.333633378831;
      build = build * xabs + 793.826512519948;
      build = build * xabs + 440.413735824752;
      cm = cm / build;
    } else {
      build = xabs + 0.65;
      build = xabs + 4 / build;
      build = xabs + 3 / build;
      build = xabs + 2 / build;
      build = xabs + 1 / build;
      cm = exponential / build / 2.506628274631;
    }
  }

  if(x > 0) {
    cm = 1 - cm;
  }

  return cm;

}


Utils.calcPForPearsonR = function(r,n) {
  var absr = Math.abs(r);
  var zscore = atanh(absr) * Math.sqrt(n-3) ;
  return 2*normCumulativeApprox(-zscore);
};

// http://stackoverflow.com/a/23124958/1467417
Utils.sortedJSON = function(obj) {
  var sortByKeys = function(obj) {
    if (!_.isObject(obj)) {
      return obj;
    }
    var sorted = {};
    _.each(_.keys(obj).sort(), function(key) {
      sorted[key] = sortByKeys(obj[key]);
    });
    return sorted;
  };

  return JSON.stringify( sortByKeys(obj) );

};

String.prototype.hashCode = function() {
  var hash = 0;
  if (this.length === 0) { return hash; }
  for (var i = 0; i < this.length; i++) {
    var character = this.charCodeAt(i);
    hash = ((hash<<5)-hash)+character;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};


// for splitting the data equally to columns, see http://stackoverflow.com/questions/21644493/how-to-split-the-ng-repeat-data-with-three-columns-using-bootstrap
Utils.chunk = function(arr, size) {
  var newArr = [];
  for (var i=0; i<arr.length; i+=size) {
    newArr.push(arr.slice(i, i+size));
  }
  return newArr;
};

Utils.subarrays = function(array, n) {
  var len = array.length, out = [], i = 0;
 
  while (i < len) {
    var size = Math.ceil((len - i) / n--);
    out.push(array.slice(i, i += size));
  }
 
  return out;
};
