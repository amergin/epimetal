angular.module('services.variable', ['services.notify'])

.constant('VARIABLE_GET_URL', '/API/headers/NMR_results')

.constant('SOM_DEFAULT_PROFILES', [
  { 
    'name': 'Total lipids',
    'variables': [],
    // variables ending with '-L'
    'regex': /^((?:[a-z|-]+)-L)$/i
  },
  {
    'name': 'Fatty acids',
    'variables': ['TotFA', 'UnSat', 'DHA', 'LA', 'FAw3', 'FAw6', 'PUFA', 'MUFA', 'SFA', 'DHAtoFA', 'LAtoFA', 'FAw3toFA', 'FAw6toFA', 'PUFAtoFA', 'MUFAtoFA', 'SFAtoFA']
  },
  {
    'name': 'Small molecules',
    'variables': ['Glc', 'Lac', 'Pyr', 'Cit', 'Glol', 'Ala', 'Gln', 'His', 'Ile', 'Leu', 'Val', 'Phe', 'Tyr', 'Ace', 'AcAce', 'bOHBut', 'Crea', 'Alb', 'Gp']
  }
])

.factory('VariableService', function VariablesService(NotifyService, $q, $http, 
  VARIABLE_GET_URL, SOM_DEFAULT_PROFILES) {

  var service = {};

  var _classedVariables = {},
  _variableCache = {},
  _groupCache = {};

  var initVariables = _.once(function() {
    var defer = $q.defer();
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

  initVariables();

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
      initVariables().then(function(res) {
        defer.resolve(res);
      }, function errFn() {
        defer.reject();
      });
    }
    else {
      initVariables().then(function(res) {
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

  service.getProfiles = _.once(function() {
    function pickVariables(list) {
      return _.map(list, function(v) {
        return _variableCache[v];
      });
    }
    var variables = _.values(_variableCache),
    profiles = _.map(SOM_DEFAULT_PROFILES, function(profile) {
      if(profile.regex) {
        return _.assign(profile, {
          'variables': _.filter(variables, function(d) {
            return profile.regex.test(d.name());
          })
        });
      } else {
        return _.assign(profile, {
          'variables': pickVariables(profile.variables)
        });
      }
    });
    return profiles;
  });

  // service.getProfiles = function() {
  //   return getProfiles();
  // };

  return service;

});
