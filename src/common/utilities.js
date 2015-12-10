// Utilities
var Utils = Utils || {};

angular.module('utilities', [])

// see http://stackoverflow.com/questions/18095727/limit-the-length-of-a-string-with-angularjs
.filter('cut', function () {
  return function (value, wordwise, max, tail) {
      if (!value) { return ''; }

      max = parseInt(max, 10);
      if (!max) { return value; }
      if (value.length <= max) { return value; }

      value = value.substr(0, max);
      if (wordwise) {
          var lastspace = value.lastIndexOf(' ');
          if (lastspace != -1) {
              value = value.substr(0, lastspace);
          }
      }

      return value + (tail || ' …');
  };
})

// selects all text for example in a input/text area when applied
.directive('selectOnClick', function() {
  return {
    restrict: 'A',
    // Linker function
    link: function(scope, element, attrs) {
      element.bind('click', function() {
        this.select();
      });
    }
  };
})

.directive('noclick', [function() {
    return {
      restrict: 'A',
      link: function link(scope, element, attrs) {
        element.bind('click', function(e) {
            e.stopPropagation();
        });
      }
    };
}])

// for introducing a custom directive in a nested directive situation
.directive('replaceAndCompile', ['$compile', '$timeout', function($compile, $timeout) {
  return {
    scope: { 
      'name': '=reName',
      'window': '=reWindow' 
    },
    restrict: 'A',
    priority: 200,
    transclude: true,
    link: {
      post: function(scope, element, attrs) {
        $timeout( function() {
          var el = angular.element('<div/>')
          .addClass(scope.name)
          .addClass('figure');
          var classes = element.attr('class').replace(/\sng[\w|-]+/ig, '');
          classes.split(" ").forEach(function(cl) {
            el.addClass(cl);
          });
          if(attrs['ngHide']) {
            el.attr(attrs.$attr['ngHide'], attrs['ngHide']);
          }
          if(attrs['ngShow']) {
            el.attr(attrs.$attr['ngShow'], attrs['ngShow']);
          }
          element.parent().append(el);
          $compile(el)(scope);
          element.remove();
        });
      }
    }
  };
}])

// disables angular-animate on elements. See
//http://stackoverflow.com/questions/21249441/disable-nganimate-form-some-elements
.directive('disableAnimate', ['$animate', function($animate) {
  return {
    link: function(scope, element) {
      $animate.enabled(false, element);
    },
    priority: 150
  };
}])

.directive('enableAnimate', ['$animate', function($animate) {
  return function(scope, element) {
    $animate.enabled(true, element);
  };
}])

// see http://stackoverflow.com/questions/25600071/how-to-achieve-that-ui-sref-be-conditionally-executed
.directive('eatClickIf', ['$parse', '$rootScope',
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

Utils.pickVariableNames = function(vars) {
  return _.map(vars, function(v) { return v.name(); });
};

Utils.subarrays = function(array, n) {
  var len = array.length, out = [], i = 0;
 
  while (i < len) {
    var size = Math.ceil((len - i) / n--);
    out.push(array.slice(i, i += size));
  }
 
  return out;
};