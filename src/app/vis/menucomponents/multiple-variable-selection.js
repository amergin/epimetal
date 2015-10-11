angular.module('plotter.vis.menucomponents.multiple-variable-selection', 
  [
  'ngTagsInput',
  'ext.lodash',
  'services.variable', 
  'services.dataset'
  ])

.controller('MultipleVariableSelectionCtrl', 
  function MultipleVariableSelectionCtrl($scope, DatasetFactory, VariableService, _) {

    var _selectedCache;

    function initCache() {
      function multi() {
        _selectedCache = {};
      }

      function scatterplot() {
        _selectedCache = {
          x: {},
          y: {}
        };
      }

      function regression() {
        _selectedCache = {
          adjust: {},
          target: {},
          association: {}
        };
      }
      if($scope.mode == 'multi') { multi($scope.payload); }
      else if($scope.mode == 'scatterplot') { scatterplot(); }
      else if($scope.mode == 'regression') { regression(); }
    }

    initCache();

    function initPayload() {
      function multi() {
        if(!$scope.payload) {
          $scope.payload = [];
        }
      }

      function scatterplot() {
        $scope.payload = {
          x: [],
          y: []
        };
      }

      function regression() {
        if(!$scope.payload) {
          $scope.payload = {
            target: [],
            adjust: [],
            association: []
          };
        }
      }
      // shallow copy so that the selection is not altered even when modifications are made 
      // and the cancelled
      $scope.payload = angular.copy($scope.payload);

      if($scope.mode == 'multi') { multi($scope.payload); }
      else if($scope.mode == 'scatterplot') { scatterplot(); }
      else if($scope.mode == 'regression') { regression(); }      
    }

    initPayload();

    $scope.lengthLegal = function() {
      var payload = getPayloadField();

      if(!$scope.canSelectMultiple()) {
        return payload.length < 1;
      }
      return true;
    };

    function removeVariableFromCache(variable) {
      var cache = getCacheField();
      if(cache[variable.id]) {
        cache[variable.id].selected = false;
      }
    }

    function addVariableToCache(variable) {
      var cache = getCacheField();

      cache[variable.id] = {
        selected: true
      };
    }

    $scope.tagAdding = function(obj) {
      function isIncluded(variable) {
        return _.contains(payload, variable);
      }
      var found = _.find($scope.variables, function(d) { return d.name().toLowerCase() == obj.text.toLowerCase(); }),
      payload = getPayloadField();
      return !_.isUndefined(found) && !isIncluded(found) && $scope.lengthLegal();
    };

    $scope.tagRemoving = function(obj) {
      return true;
    };

    $scope.tagAdded = function(obj) {
      function removeText(payload) {
        // remove the text obj
        payload.splice(payload.length-1, 1);
      }
      function getAdded() {
        return _.find($scope.variables, function(d) { return d.name().toLowerCase() == obj.text.toLowerCase(); });
      }

      function setSelected(variable) {
        addVariableToCache(variable);
        // variable.selected = true;
      }

      var added = getAdded(),
      payload = getPayloadField();
      removeText(payload);
      setSelected(added);
      payload.push(added);
      // $scope.updateSelection(added, true);
    };

    $scope.tagRemoved = function(variable) {
      removeVariableFromCache(variable);
      // variable.selected = false;
      // $scope.updateSelection(variable, true);
    };

    //$scope.mode is from directive init

    // $scope.toggleVariable = function(variable) {
    //   var notDefined = _.isUndefined(variable.selected) || _.isNull(variable.selected);
    //   if(notDefined) { variable.selected = true; }
    //   else { variable.selected = !variable.selected; }
    // };

    $scope.variableIsSelected = function(v) {
      var cache = getCacheField();
      return !_.isUndefined(cache[v.id]) && cache[v.id].selected === true;
    };

    function addVariable(variable) {
      var payload = getPayloadField();
      var ind = payload.push(variable);
      addVariableToCache(variable, ind);
    }

    function removeVariable(variable) {
      var payload = getPayloadField();
      var ind = _.indexOf(payload, variable);
      payload.splice(ind, 1);
      removeVariableFromCache(variable);
    }

    $scope.updateSelection = function(variable, force) {

      // can hold multiple selections
      function multipleSelections(payload, cache) {
        var ind = _.indexOf(payload, variable);

        if(ind < 0) {
          // not currently on the list
          addVariable(variable);
        } else {
          // is on the list
          removeVariable(variable);
        }
      }

      // only one selection at a time
      function singleSelection(payload, cache) {
        var ind = _.indexOf(payload, variable);

        if(ind < 0) {
          setPayload([]);
          setCacheField({});
          addVariable(variable);
        } else {
          removeVariable(variable);
        }       
      }

      var payload = getPayloadField(),
      cache = getCacheField();
      if($scope.mode == 'multi') { multipleSelections(payload, cache); }
      else if($scope.mode == 'scatterplot') { singleSelection(payload, cache); }
      else if($scope.mode == 'regression') {
        if($scope.canSelectMultiple()) {
          multipleSelections(payload, cache);
        } else {
          singleSelection(payload, cache);
        }
      }
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

    function setCacheField(value) {
      switch($scope.mode) {
        case 'scatterplot':
        if($scope.focus.x) {
          _selectedCache.x = value;
        } else {
          _selectedCache.y = value;
        }
        break;

        case 'multi':
        _selectedCache = value;
        break;

        case 'regression':
        if($scope.focus.target) { 
          _selectedCache.target = value;
        } else if($scope.focus.adjust) {
          _selectedCache.adjust = value;
        } else if($scope.focus.association) {
          _selectedCache.association = value;
        }
        break;

        default:
        throw new Error("Unhandled type!");

      }
    } 

    function getCacheField() {
      switch($scope.mode) {
        case 'scatterplot':
        if($scope.focus.x) {
          return _selectedCache.x;
        }
        return _selectedCache.y;

        case 'multi':
        return _selectedCache;

        case 'regression':
        if($scope.focus.target) { 
          return _selectedCache.target;
        } else if($scope.focus.adjust) {
          return _selectedCache.adjust;
        } else if($scope.focus.association) {
          return _selectedCache.association;
        }
        break;

        default:
        throw new Error("Unhandled type!");

      }
    }    

    function setPayload(value) {
      switch($scope.mode) {
        case 'scatterplot':
        if($scope.focus.x) {
          $scope.payload.x = value;
        } else {
          $scope.payload.y = value;
        }
        break;

        case 'multi':
        $scope.payload = value;
        break;

        case 'regression':
        if($scope.focus.target) { 
          $scope.payload.target = value;
        } else if($scope.focus.adjust) {
          $scope.payload.adjust = value;
        } else if($scope.focus.association) {
          $scope.payload.association = value;
        }
        break;

        default:
        throw new Error("Unhandled type!");

      }
    }

    function getPayloadField() {
      switch($scope.mode) {
        case 'scatterplot':
        if($scope.focus.x) {
          return $scope.payload.x;
        }
        return $scope.payload.y;

        case 'multi':
        return $scope.payload;

        case 'regression':
        if($scope.focus.target) { 
          return $scope.payload.target;
        } else if($scope.focus.adjust) {
          return $scope.payload.adjust;
        } else if($scope.focus.association) {
          return $scope.payload.association;
        }
        break;

        default:
        throw new Error("Unhandled type!");

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
      return _.contains(lower(variable.name()), lower(input)) || 
      _.contains(lower(variable.description()), lower(input)) ||
      _.contains(lower(variable.group().name), lower(input));
    };

    $scope.inputIsDefined = function() {
      var input = $scope.getInputField();
      return !_.isUndefined(input) && !_.isNull(input) && input.length > 0;
    };

    VariableService.getVariables().then(function(res) {
      $scope.variables = res;
      $scope.nested = getNestedNavigation($scope.variables);
    });

    // For group navigation
    function getNestedNavigation(variables) {
      // do top-level grouping
      var topLevelGrp = _.chain(variables)
      .groupBy(function(v) {
        return _.isNull(v.group().topgroup) ? v.group().name : v.group().topgroup;
      })
      .value();

      // do second-level grouping
      var second = 
      _.chain(topLevelGrp)
      .map(function(grp, topName) {
        var grouped = _.groupBy(grp, function(sg) {
          return topName == sg.group().name ? null : sg.group().name;
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
          return _selectedCache[v.id] && _selectedCache[v.id].selected === true;
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
        addVariable(item);
        // $scope.updateSelection(item);
      });
    };

    $scope.deselectAll = function(selection) {
      _.each(selection, function(item) {
        if($scope.getType(item) == 'continues') { return; }
        removeVariable(item);
        // $scope.updateSelection(item);
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
        var cache = getCacheField();
        return cache[v.id] &&  cache[v.id].selected === true;
      })['true'];
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

    $scope.getType = function(item) {
      if( !_.isUndefined(item.type) ) {
        return 'terminates';
      }
      else {
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

    $scope.setFocus = function(field) {
      function scatterplot() {
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
)

.directive('multipleVariableSelection', function () {
  return {
    restrict: 'C',
    // replace: false,
    scope: {
      'payload': '=reSelection',
      'mode': "=reMode" // either 'scatterplot' or 'multi' or 'regression'
    },
    controller: 'MultipleVariableSelectionCtrl',
    templateUrl: 'vis/menucomponents/multiple-variable-selection.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});