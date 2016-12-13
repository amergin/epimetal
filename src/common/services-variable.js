angular.module('services.variable', 
  ['services.notify',
   'ext.mathjs'
  ])

.constant('VARIABLE_GET_URL', '/API/headers/NMR_results')
.constant('EXPLORE_DEFAULT_HISTOGRAMS_URL', '/API/settings/explore/histograms')
.constant('SOM_DEFAULT_INPUT_VARIABLES_URL', '/API/settings/som/input')
.constant('SOM_DEFAULT_PROFILES_URL', '/API/settings/som/profiles')
.constant('SOM_DEFAULT_PLANES_URL', '/API/settings/som/planes')
.constant('CUSTOM_VAR_GROUP_NUMBER', -1)


.factory('VariableService', function VariablesService(NotifyService, $q, $http, $log, math, constants,
  VARIABLE_GET_URL, CUSTOM_VAR_GROUP_NUMBER,
  EXPLORE_DEFAULT_HISTOGRAMS_URL, SOM_DEFAULT_PROFILES_URL, SOM_DEFAULT_INPUT_VARIABLES_URL,
  SOM_DEFAULT_PLANES_URL) {

  var service = {};

  var _classedVariables = {},
  _variableCache = {},
  _groupCache = {},
  _initVariablesPromise = _.once(function() {

    function initCustomGroup() {
      _groupCache[CUSTOM_VAR_GROUP_NUMBER] = {
        'name': 'Custom variables',
        'order': CUSTOM_VAR_GROUP_NUMBER,
        'topgroup': null
      };
    }
    var defer = $q.defer();

    initCustomGroup();
    $http.get(VARIABLE_GET_URL, {
        cache: true
      })
      .success(function(response) {
        console.log("Load variable list");
        var varInstance;
        _.each(response.result, function(variable) {
          varInstance = new PlDatabaseVariable()
          .classed(variable.classed === true)
          .description(variable.desc)
          .group(variable.group)
          .name(variable.name)
          .nameOrder(variable.name_order)
          .unit(variable.unit);

          if(varInstance.classed()) {
            _classedVariables[varInstance.name()] = varInstance;
          }
          _variableCache[varInstance.name()] = varInstance;
          _groupCache[varInstance.group().order] = varInstance.group();
        });
        defer.resolve( _.values(_variableCache) );
      })
      .error(function() {
        NotifyService.addSticky('Error', 'Something went wrong while fetching variables. Please reload the page.', 'error');
        defer.reject('Something went wrong while fetching variables. Please reload the page');
      });
    return defer.promise;
  });

  _initVariablesPromise();

  service.isClassVariable = function(v) {
    return !_.isUndefined(_classedVariables[v]);
  };

  service.getVariable = function(v) {
    return _variableCache[v];
  };

  service.getGroup = function(order) {
    return _groupCache[order];
  };

  service.getVariables = function(list) {
    var defer = $q.defer();
    if(!arguments.length) { 
      _initVariablesPromise().then(function(res) {
        defer.resolve(_.values(_variableCache));
      }, function errFn() {
        defer.reject();
      });
    }
    else {
      _initVariablesPromise().then(function(res) {
        var mapped = _.map(list, function(v) {
          return _variableCache[v];
        });
        defer.resolve(mapped);
      }, function errFn() {
        defer.reject();
      });
    }
    return defer.promise;
  };

  service.addCustomVariable = function(config) {
      function checkExpressionErrors(expression, group) {
        var metaInfo = [],
        matchVariables = /\[[\w|-]*\]/ig;


        function checkInvalidVariables() {
          var matchBrackets = /[\[|\]]/ig,
          variables = expression.match(matchVariables),
          nameWithoutBrackets,
          metaData,
          errors = [];
          // hadErrors = false;

          _.each(variables, function(v) {
            nameWithoutBrackets = v.replace(matchBrackets, '');
            metaData = service.getVariable(nameWithoutBrackets);
            if(!metaData) {
              errors.push('Invalid variable: ' + nameWithoutBrackets);
              // NotifyService.addTransient(null, 'Invalid variable: ' + nameWithoutBrackets, 'error',
              //   { referenceId: errorField });
              // hadErrors = true;
            } 
            else if(metaData.type() == 'custom') {
              errors.push('Variable can not depend on other derived variables');
              // NotifyService.addTransient(null, 'Variable can not depend on other derived variables', 'error',
              //   { referenceId: errorField });
              // hadErrors = true;
            }
            else {
              metaInfo.push(metaData);
            }
          });
          if(errors.length) {
            throw errors;
          }
        }

        function checkInvalidExpression() {
          function createVariable() {
            var variable = new PlCustomVariable()
            .name(config.id || _.uniqueId('_custvar'))
            .descriptiveName(config.name)
            .description('Expression: ' + expression)
            .group(group)
            .originalExpression(expression)
            .substitutedExpression(expWithSubNames)
            .substitutedCache(cache)
            .external(constants.nanValue, math)
            .dependencies(metaInfo);

            _variableCache[variable.name()] = variable;
          }
          try {
            var cache = {};
            var expWithSubNames = expression.replace(matchVariables, function(d) {
              var id = _.uniqueId('var');
              cache[d] = id;
              return id;
            });
            var values = _.chain(cache)
            .values()
            .map(function(d) {
              return [d, _.random(0.5, 10)];
            })
            .object()
            .value();

            // if expression is fine, this should go through eval
            /* jshint ignore:start */
            var result = math.eval(expWithSubNames, values);
            /* jshint ignore:end */
            $log.debug('Expression result', result);

            // everything seems fine, create the custom variable
            createVariable();

          } catch(err) {
            $log.debug('Expression evaluation failed', err.message);
            throw ['Please check the mathematical expression.'];
          }
        }

        checkInvalidVariables();
        checkInvalidExpression();
      }

      // checkNameErrors(config.name);
      checkExpressionErrors(config.expression, config.group);

      return service;
  };

  service.removeCustomVariable = function(x) {
    delete _variableCache[x.name()];
    return service;
  };

  service.getCustomVariables = function() {
    return _.filter(_variableCache, function(v, name) {
      return v.type() == 'custom';
    });
  };

  function pickVariables(list) {
    return _.map(list, function(v) {
      return _variableCache[v];
    });
  }

  service.getExploreDefaultHistograms = function() {
    var defer = $q.defer();
    $http.get(EXPLORE_DEFAULT_HISTOGRAMS_URL, {
        cache: true
      })
    .then(function succFn(result) {
      return defer.resolve(pickVariables(result.data.result.variables));
    }, function errFn() {
      defer.reject(); 
    });
    return defer.promise;
  };

  service.getSOMDefaultInputVariables = function() {
    var defer = $q.defer();

    _initVariablesPromise().then(function() {
      $http.get(SOM_DEFAULT_INPUT_VARIABLES_URL, {
        cache: true
      })
      .then(function succFn(result) {
        return defer.resolve(pickVariables(result.data.result.variables));
      }, function errFn() {
        defer.reject();
      });
    });

    return defer.promise;
  };

  service.getSOMDefaultPlanes = function() {
    var defer = $q.defer();
    $http.get(SOM_DEFAULT_PLANES_URL, {
        cache: true
      })
    .then(function succFn(result) {
      return defer.resolve(result.data.result.variables);
    }, function errFn() {
      defer.reject(); 
    });
    return defer.promise;
  };

  service.getSOMDefaultProfiles = function() {
    function mapResult(profiles) {
      return _.map(profiles, function(profile) {
        return _.assign(profile, {
          'variables': pickVariables(profile.variables)
        });
      });
    }

    var defer = $q.defer();

    _initVariablesPromise().then(function() {
      $http.get(SOM_DEFAULT_PROFILES_URL, {
        cache: true
      })
      .then(function succFn(result) {
        return defer.resolve(mapResult(result.data.result.profiles));
      }, function errFn() {
        defer.reject();
      });
    });
    return defer.promise;
  };

  return service;

});
