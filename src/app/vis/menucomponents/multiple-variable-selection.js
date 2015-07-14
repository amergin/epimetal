var vis =
  angular.module('plotter.vis.menucomponents.multiple-variable-selection', 
    [
    ]);

vis.controller('MultipleVariableSelectionCtrl', ['$scope', 'DatasetFactory',
  function MultipleVariableSelectionCtrl($scope, DatasetFactory) {

    // the results go here
    // $scope.payload = [];

    // $scope.payloadX = [];
    // $scope.payloadY = [];

    // // regression
    // $scope.payloadTarget = [];
    // $scope.payloadAdjust = [];
    // $scope.payloadAssociation = [];

    function payloadRemoveListener(newArray, oldArray) {
      if(oldArray.length > newArray.length) {
        // something removed
        var diff = _.difference(oldArray, newArray)[0];
        diff.selected = false;
        $scope.updateSelection(diff, true);
      }
    }

    if($scope.mode == 'multi') {
      $scope.$watchCollection('payload', payloadRemoveListener);
    } else if($scope.mode == 'scatterplot') {
      $scope.$watchCollection('payloadX', payloadRemoveListener);
      $scope.$watchCollection('payloadY', payloadRemoveListener);      
    } else if($scope.mode == 'regression') {
      $scope.$watchCollection('payloadTarget', payloadRemoveListener);
      $scope.$watchCollection('payloadAdjust', payloadRemoveListener);
      $scope.$watchCollection('payloadAssociation', payloadRemoveListener);
    }

    //$scope.mode is from directive init

    $scope.toggleVariable = function(variable) {
      var notDefined = _.isUndefined(variable) || _.isNull(variable);
      if(notDefined) { variable.selected = true; }
      else { variable.selected = !variable.selected; }
    };

    $scope.updateSelection = function(variable, force) {
      function multi(variables, indCollection) {
        // find index
        var ind = _.findIndex(variables, function(v) {
          return v == variable;
        }), indInVars;

        if(ind < 0) {
          if(variable.selected) {
            // not previously on the list
            if(indCollection) {
              indInVars = _.indexOf($scope.variables, variable);
              indCollection.push(indInVars);
            }
            variables.push(variable);
          } else {
            // already been removed, remove index
            indInVars = _.indexOf($scope.variables, variable);
            _.remove(indCollection, function(n) { return n == indInVars; });
          }
        } else {
          // is on the list
          if(variable.selected) {
            // do nothing
          }
          else {
            indInVars = _.indexOf($scope.variables, variable);
            _.remove(indCollection, function(n) { return n == indInVars; });
            variables.splice(ind, 1);
          }
        }
      }

      function scatterplot() {
        if(variable.selected) {
          setScatterplotPayload([variable]);
          var activeInd = getSelectedScatterInd();
          if(!_.isNull(activeInd)) { $scope.variables[activeInd].selected = false; }
          var index = _.indexOf($scope.variables, variable);
          setSelectedScatterInd(index);
        } else {
          setScatterplotPayload([]);
          setSelectedScatterInd(null);
        }        
      }

      function regression() {
        function target() {
          function setPayload(val) {
            $scope.payloadTarget = val;
          }
          function setInd(ind) {
            $scope.selectedRegressionInd.target = ind;
          }
          function getInd() {
            return $scope.selectedRegressionInd.target;
          }
          if(variable.selected) {
            setPayload([variable]);
            var activeInd = getInd();
            if(!_.isNull(activeInd)) { $scope.variables[activeInd].selected = false; }
            var currInd = _.indexOf($scope.variables, variable);
            setInd(currInd);
          } else {
            setPayload([]);
            setInd(null);
          }
        }
        if($scope.focus.adjust) {
          multi($scope.payloadAdjust, $scope.selectedRegressionInd.adjust);
        } else if($scope.focus.association) {
          multi($scope.payloadAssociation, $scope.selectedRegressionInd.association);
        }
        else {
          target();
        }
      }

      if($scope.mode == 'multi') { multi($scope.payload); }
      else if($scope.mode == 'scatterplot') { scatterplot(); }
      else if($scope.mode == 'regression') { regression(); }
    };

    $scope.getInputField = function()  {
      if($scope.mode == 'scatterplot') {
        if($scope.focus.x) {
          return $scope.filter.x;
        } else {
          return $scope.filter.y;
        }

      } else if($scope.mode == 'multi') {
        return $scope.filter.input;
      } 
      else if($scope.mode == 'regression') {
        if($scope.focus.target) { 
          return $scope.filter.target;
        } else if($scope.focus.adjust) {
          return $scope.filter.adjust;
        } else if($scope.focus.association) {
          return $scope.filter.association;
        }
      }
    };

    function getPayloadField() {
      if($scope.mode == 'scatterplot') {
        if($scope.focus.x) {
          return $scope.payloadX;
        } else {
          return $scope.payloadY;
        }

      } else if($scope.mode == 'multi') {
        return $scope.payload;
      } 
      else if($scope.mode == 'regression') {
        if($scope.focus.target) { 
          return $scope.payloadTarget;
        } else if($scope.focus.adjust) {
          return $scope.payloadAdjust;
        } else if($scope.focus.association) {
          return $scope.payloadAssociation;
        }
      }
    }

    function updateVariableSelections(indices, value) {
      if(!indices) { return; }
      _.each(indices, function(ind) {
        var variable = $scope.variables[ind];
        variable.selected = value;
      });
    }


    $scope.tableFilter = function(variable, ind, array) {
      function lower(str) {
        return _.isString(str) ? str.toLowerCase() : str;
      }
      var input = $scope.getInputField();
      return _.contains(lower(variable.name), lower(input)) || 
      _.contains(lower(variable.desc), lower(input)) ||
      _.contains(lower(variable.group.name), lower(input));
    };

    $scope.inputIsDefined = function() {
      var input = $scope.getInputField();
      return !_.isUndefined(input) && !_.isNull(input) && input.length > 0;
    };

    function getPrepopulate(variables) {
      var copy = angular.copy(variables),
      hasPayload = !_.isUndefined($scope.payload);
      if(hasPayload && $scope.payload.length > 0) {
        var objs = [];
        _.each($scope.payload, function(p) {
          var found = _.find(copy, p);
          found.selected = true;
          objs.push(found);
        });
        $scope.payload = objs;
      }
      return copy;
    }

    DatasetFactory.getVariables().then(function(res) {
      $scope.variables = getPrepopulate(res);
      $scope.nested = getNestedNavigation($scope.variables);
    });

    function setScatterplotPayload(value) {
      if($scope.focus.x) { $scope.payloadX = value; }
      else { $scope.payloadY = value; }
    }


    // For group navigation
    function getNestedNavigation(variables) {
      // do top-level grouping
      var topLevelGrp = _.chain(variables)
      .groupBy(function(v) {
        return _.isNull(v.group.topgroup) ? v.group.name : v.group.topgroup;
      })
      .value();

      // do second-level grouping
      var second = 
      _.chain(topLevelGrp)
      .map(function(grp, topName) {
        var grouped = _.groupBy(grp, function(sg) {
          return topName == sg.group.name ? null : sg.group.name;
        });

        var subGrouping = _.map(grouped, function(array, subName) {
          // no further navigation, extract to array
          if(subName == 'null') {
            return array;
          } else {
            return _.zipObject([[subName, array]]);
          }
        });
        return [topName, _.flatten(subGrouping)];
      })
      .map(function(array) { return _.zipObject([array]); })
      .value();

      return second;
    }

    $scope.toggleGroup = function(group) {
      var majoritySelected = $scope.majoritySelected(group);
      if(majoritySelected) {
        $scope.deselectAll(group);
      } else {
        $scope.selectAll(group);
      }
    };

    $scope.majoritySelected = function(selection) {
      var noVars = 0,
      counts = _.countBy(selection, function(v) { 
        var type = $scope.getType(v);
        if(type == 'terminates') {
          ++noVars;
          return v.selected || false;
        }
        return false;
      });
      return (counts.true || 0) / noVars > 0.5;
    };

    $scope.canSelectMultiple = function() {
      if($scope.mode == 'scatterplot') { return false; }
      if($scope.mode == 'regression') {
        if($scope.focus.target) { return false; }
      }
      return true;
    };

    $scope.selectAll = function(selection) {
      _.each(selection, function(item) {
        if($scope.getType(item) == 'continues') { return; }
        item.selected = true;
        $scope.updateSelection(item);
      });
    };

    $scope.deselectAll = function(selection) {
      _.each(selection, function(item) {
        if($scope.getType(item) == 'continues') { return; }
        item.selected = false;
        $scope.updateSelection(item);
      });
    };

    $scope.selected = {
      first: null,
      second: null,
      third: null,
      all: {
        first: false,
        second: false
      }
    };

    function getKeys(group) {
      return _.chain(group)
      .keys()
      .value();
    }

    $scope.getValue = function(group) {
      return _.chain(group)
      .values()
      .first()
      .value();
    };

    function getNextLevel(level) {
      if(level == 'first') { return 'second'; }
      if(level == 'second') { return 'third'; }
      return null;      
    }

    function getPreviousLevel(level) {
      if(level == 'second') { return 'first'; }
      if(level == 'third') { return 'second'; }
      return null;
    }

    function clearNextSelections(level) {
      var iLevel;
      function flush(level) {
        $scope.selected[level] = null;
      }

      iLevel = level;
      do {
        iLevel = getNextLevel(iLevel);
        flush(iLevel);
      } while( !_.isNull(iLevel) );
    }

    function getGroupSelection(group, level) {
      var keys = getKeys(group), ret;
      if(keys.length > 1) {
        // navigation goes on
        ret = _.map(group, function(v,k) { var obj = {}; obj[k] = v; return obj; });
      } else {
        // end of navigation
        ret = _.chain(group).values().first().value();
      }
      return ret;
    }

    $scope.selectGroup = function(group, level) {
      if( $scope.getType(group) == 'terminates' ) { return; }
      $scope.selected[level] = getGroupSelection(group, level);
      clearNextSelections(level);
    };

    $scope.selectedHasVariables = function(selection) {
      var counts = _.countBy(selection, function(i) { return $scope.getType(i); });
      return counts.terminates > 0;
    };

    $scope.selectInfo = function(variable) {
      $scope.selected['third'] = variable;
    };

    $scope.groupSelectedCount = function(group) {
      var flatVariables = _.chain(group)
      .map(function(v,k) { return v; })
      .flatten()
      .map(function(obj, ind, array) {
        var type = $scope.getType(obj);
        return type == 'continues' ? _.chain(obj).values().first().value() : obj;
      })
      .flatten()
      .value();

      return _.countBy(flatVariables, function(v) {
        return v.selected || false;
      })['true'];
    };

    $scope.isChecked = function(variable) {
      return !_.isUndefined(variable.selected) && variable.selected === true;
    };

    $scope.getGroupName = function(group, level) {
      if(level == 'first') {
        var variable = _.chain(group)
        .sample()
        .first()
        .value();
        return variable.group.topgroup;
      } else {
        return _.chain(group)
        .keys()
        .first()
        .value();
      }
    };

    $scope.isSelected = function(group, level) {
      var selected = getGroupSelection(group, level);
      return _.isEqual($scope.selected[level], selected);
    };

    $scope.getType = function(group) {
      if( _.has(group, 'name_order') ) {
        return 'terminates';
      } else {
        return 'continues';
      }
    };

    $scope.orderGroup = function(group) {
      var type = $scope.getType(group);
      if(type == 'terminates') {
        return '1_' + group.name;
      } else if(type == 'continues') {         
        return '0_' + $scope.getGroupName(group);
      }
    };

    function getSelectedScatterInd() {
      var active = $scope.focus.x ? 'x': 'y';
      return $scope.selectedScatterInd[active];
    }

    function setSelectedScatterInd(ind) {
      var active = $scope.focus.x ? 'x': 'y';
      $scope.selectedScatterInd[active] = ind;
    }

    function setActiveScatter(active, cpart) {
      var activeInd = $scope.selectedScatterInd[active],
      passiveInd = $scope.selectedScatterInd[cpart];
      if(!_.isNull(activeInd)) {
        $scope.variables[activeInd].selected = true;
      }

      if(!_.isNull(passiveInd)) {
        $scope.variables[passiveInd].selected = false;
      }

    }

    $scope.setFocus = function(field) {
      function scatterplot() {
        var cpart = (field == 'x') ? 'y' : 'x';
        setActiveScatter(field, cpart);

        $scope.focus[field] = true;
        $scope.focus[cpart] = false;
      }

      function regression() {
        function setFalse(array) {
          _.each(array, function(val) {
            $scope.focus[val] = false;
          });
        }
        function getTarget() {
          return !_.isNull($scope.selectedRegressionInd.target) ? [$scope.selectedRegressionInd.target] : [];
        }
        $scope.focus[field] = true;
        var previous, current, falsys;
        if(field == 'target') {
          previous = _.union($scope.selectedRegressionInd.adjust, $scope.selectedRegressionInd.association);
          current = getTarget();
          falsys = ['adjust', 'association'];
        } else if(field == 'adjust') {
          previous = _.union($scope.selectedRegressionInd.association, getTarget());
          current = $scope.selectedRegressionInd.adjust;
          falsys = ['target', 'association'];
        } else if(field == 'association') {
          previous = _.union($scope.selectedRegressionInd.adjust, getTarget());
          current = $scope.selectedRegressionInd.association;
          falsys = ['target', 'adjust'];
        }
        setFalse(falsys);
        updateVariableSelections(previous, false);
        updateVariableSelections(current, true);
      }

      if($scope.mode == 'regression') { regression(); }
      else if($scope.mode == 'scatterplot') { scatterplot(); }
    };

    $scope.focus = {
      x: true,
      y: false,
      target: true,
      association: false,
      adjust: false
    };

    $scope.selectedScatterInd = {
      x: null,
      y: null
    };

    $scope.selectedRegressionInd = {
      target: null,
      adjust: [],
      association: []
    };

    // For table section
    $scope.filter = {
      input: null,
      x: null,
      y: null,
      target: null,
      adjust: null,
      association: null
    };
    $scope.pageSize = 40;
    $scope.sortReverse = false;
    $scope.sortType = 'name';

    $scope.setSortType = function(type) {
      $scope.sortType = type;
    };

    $scope.sortTypeIs = function(type) {
      return $scope.sortType == type;
    };

    $scope.toggleSortReverse = function() {
      $scope.sortReverse = !$scope.sortReverse;
    };

  }
]);

vis.directive('multipleVariableSelection', function () {
  return {
    restrict: 'C',
    replace: false,
    scope: {
      'payload': "=?reSelection",
      'payloadX': "=?reSelectionX",
      'payloadY': "=?reSelectionY",
      'payloadTarget': "=?reSelectionTarget",
      'payloadAssociation': "=?reSelectionAssociation",
      'payloadAdjust': "=?reSelectionAdjust",
      'mode': "=reMode" // either 'scatterplot' or 'multi' or 'regression'
    },
    controller: 'MultipleVariableSelectionCtrl',
    templateUrl: 'vis/menucomponents/multiple-variable-selection.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});