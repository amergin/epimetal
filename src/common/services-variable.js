angular.module('services.variable', ['services.notify'])

.constant('VARIABLE_GET_URL', '/API/headers/NMR_results')

.factory('VariableService', function VariablesService(NotifyService, $q, $http, VARIABLE_GET_URL) {

  var service = {};

  var _classedVariables = {},
  _variableCache = {},
  _variables;

  var initVariables = _.once(function() {
    var defer = $q.defer();
    $http.get(VARIABLE_GET_URL, {
        cache: true
      })
      .success(function(response) {
        console.log("Load variable list");
        _.each(response.result, function(variable) {
          if (variable.classed) {
            _classedVariables[variable.name] = variable;
          }
          _variableCache[variable.name] = variable;
        });
        _variables = response.result;
        defer.resolve(_variables);
      })
      .error(function() {
        _variables = angular.copy([]);
        NotifyService.addSticky('Error', 'Something went wrong while fetching variables. Please reload the page.', 'error');
        defer.reject('Something went wrong while fetching variables. Please reload the page');
      });
    return defer.promise;
  });


  service.isClassVariable = function(v) {
    return !_.isUndefined(_classedVariables[v]);
  };

  service.getVariable = function(v) {
    return _variableCache[v];
  };

  service.getVariables = function() {
    return initVariables();
  };

  var getProfiles = _.once(function() {
    var getSorted = function() {
      return _.chain(_variables)
        .sortBy(function(v) {
          return v.name_order;
        })
        .sortBy(function(v) {
          return v.group.order;
        })
        .value();
    };
    var getTotalLipids = function(sorted) {
      // get variables ending with '-L'
      var re = /^((?:[a-z|-]+)-L)$/i;
      return _.filter(sorted, function(d) {
        return re.test(d.name);
      });
    };
    var getFattyAcids = function(sorted) {
      var names = ['TotFA', 'UnSat', 'DHA', 'LA', 'FAw3', 'FAw6', 'PUFA', 'MUFA', 'SFA', 'DHAtoFA', 'LAtoFA', 'FAw3toFA', 'FAw6toFA', 'PUFAtoFA', 'MUFAtoFA', 'SFAtoFA'];
      return _.filter(sorted, function(v) {
        return _.some(names, function(n) {
          return v.name == n;
        });
      });
    };

    var getSmallMolecules = function(sorted) {
      var names = ['Glc', 'Lac', 'Pyr', 'Cit', 'Glol', 'Ala', 'Gln', 'His', 'Ile', 'Leu', 'Val', 'Phe', 'Tyr', 'Ace', 'AcAce', 'bOHBut', 'Crea', 'Alb', 'Gp'];
      return _.filter(sorted, function(v) {
        return _.some(names, function(n) {
          return v.name == n;
        });
      });
    };

    var sorted = getSorted();
    return [{
      name: 'Total lipids',
      variables: getTotalLipids(sorted)
    }, {
      name: 'Fatty acids',
      variables: getFattyAcids(sorted)
    }, {
      name: 'Small molecules',
      variables: getSmallMolecules(sorted)
    }];
  });

  service.getProfiles = function() {
    return getProfiles();
  };

  return service;

});