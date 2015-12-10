angular.module('plotter.vis.menucomponents.multiple-variable-selection', 
  [
  'ngTagsInput',
  'ext.lodash',
  'ext.mathjs',
  'services.variable', 
  'services.som',
  'services.dataset',
  'services.notify',
  'services.window',
  'mentio'
  ])

.constant('MENU_USER_DEFINED_VARS_CATEGORY', 'User-defined variables')

.controller('MultipleVariableSelectionCtrl', 
  function MultipleVariableSelectionCtrl($scope, $q, $log, DatasetFactory, DimensionService, 
    WindowHandler, VariableService, NotifyService, SOMService,
    MENU_USER_DEFINED_VARS_CATEGORY, 
    _, math, constants) {

    // custom dialog stuff
    $scope.customDialogOpen = false;
    $scope.customCreateDialog = function(val) {
      if(!arguments.length) { return $scope.customDialogOpen; }
      $scope.customDialogOpen = val;
    };

    $scope.isCustomCreateDialog = function() {
      return $scope.selected.zeroth && $scope.selected.zeroth == MENU_USER_DEFINED_VARS_CATEGORY;
    };

    function updateCustomMenu() {
      // close menu
      $scope.customCreateDialog(false);
      $scope.selected.first = null;
      $scope.clearCustomField();
      // refresh variables
      doNesting(function() {
        // update the grouping
        $scope.selected.first = _.chain($scope.nested)
        .find(function(obj) {
          return _.keys(obj)[0] == MENU_USER_DEFINED_VARS_CATEGORY;
        })
        .values()
        .first()
        .value();
      });
    }

    $scope.removeCustomVariable = function(variable) {
      function removeWindowsContaining() {
        function rejectFn(win) {
          variables = win.variables();
          if(_.isArray(variables)) {
            return _.contains(variables, variable);
          } else if(win.figure() == 'pl-scatterplot') {
            return _.chain(variables).values().contains(variable).value();
          } else if(win.figure() == 'pl-regression') {
            return _.contains(variables.adjust, variable) ||
            _.contains(variables.association, variable) ||
            _.contains(variables.target, variable);
          } else {
            return _.isEqual(variables, variable);
          }
        }
        WindowHandler.removeWindowsFromHandlers(rejectFn);
      }

      function removeFromTrainVars(v) {
        var current = SOMService.trainVariables(),
        contains = _.contains(current, v);
        if(contains) {
          SOMService.trainVariables(_.without(current, v));
        }
      }

      function removeFromSelections(v) {
        function removeFrom(payload) {
          var ind = _.findIndex(payload, v);
          if(ind >= 0) { payload.splice(ind, 1); }
        }

        switch($scope.mode) {
          case 'multi':
          removeFrom($scope.payload);
          break;

          case 'scatterplot':
          removeFrom($scope.payload.x);
          removeFrom($scope.payload.y);
          break;

          case 'regression':
          removeFrom($scope.payload.target);
          removeFrom($scope.payload.adjust);
          removeFrom($scope.payload.association);
          break;
        }
      }

      $log.debug('Removing custom variable', variable.name());
      removeWindowsContaining();
      removeFromSelections(variable);
      removeFromTrainVars(variable);
      VariableService.removeCustomVariable(variable);
      DatasetFactory.removeCustomVariable(variable);
      // remove from dim service
      _.each(DimensionService.getAll(), function(obj) {
        obj.instance.removeCustomVariable(variable);
        obj.instance.rebuildInstance();
      });
      removeVariableFromCache(variable);
      updateCustomMenu();
      // hide third
      $scope.selected.third = null;
    };

    $scope.clearCustomField = function() {
      $scope.customVariableName.content = '';
      $scope.typedCustomVarExpression.content = '';
    };

    $scope.customVariableName = { content: '' };
    $scope.typedCustomVarExpression = { content: '' };

    $scope.customExpressionSearch = function(term) {
      $scope.filteredCustVariables = _.chain($scope.variables)
      .filter(function(variable) {
        return _.contains(variable.name().toLowerCase(), term) ||
        _.contains(variable.description().toLowerCase(), term);
      })
      .sortBy(function(variable) {
        return variable.name().toLowerCase();
      })
      .value();
      return $q.when($scope.filteredCustVariables);
    };

    $scope.customExpressionFieldId = _.uniqueId('mentio');

    $scope.customTagName = function(item) {
      return "[" + item.name() + "]";
    };

    $scope.customCanSubmit = function() {
      return $scope.customVariableName.content.length > 0 &&
      $scope.typedCustomVarExpression.content.length > 0;
    };

    $scope.customSubmit = function() {
      function nameHasErrors(name) {
        var exists = !_.isUndefined(VariableService.getVariable(name)),
        hasSpace = _.contains(name, ' '),
        hasNonAlphaNumeric = name.match(/\W+/g) != null,
        hadErrors = false;

        if(exists) {
          NotifyService.addTransient(null, 'Variable is already defined', 'error',
            { referenceId: errorField });
          hadErrors = true;
        }

        if(hasSpace) {
          NotifyService.addTransient(null, 'Variable name has a space', 'error',
            { referenceId: errorField });
          hadErrors = true;          
        }

        if(hasNonAlphaNumeric) {
          NotifyService.addTransient(null, 'Invalid characters in variable name', 'error',
            { referenceId: errorField });
          hadErrors = true;
        }
        return hadErrors;
      }

      function expressionHasErrors(expression) {
        var metaInfo = [],
        matchVariables = /\[[\w|-]*\]/ig;


        function hasInvalidVariables() {
          var matchBrackets = /[\[|\]]/ig,
          variables = expression.match(matchVariables),
          nameWithoutBrackets,
          metaData,
          hadErrors = false;

          _.each(variables, function(v) {
            nameWithoutBrackets = v.replace(matchBrackets, '');
            metaData = VariableService.getVariable(nameWithoutBrackets);
            if(!metaData) {
              NotifyService.addTransient(null, 'Invalid variable: ' + nameWithoutBrackets, 'error',
                { referenceId: errorField });
              hadErrors = true;
            } 
            else if(metaData.type() == 'custom') {
              NotifyService.addTransient(null, 'Variable can not depend on other derived variables', 'error',
                { referenceId: errorField });
              hadErrors = true;
            }
            else {
              metaInfo.push(metaData);
            }
          });
          return hadErrors;
        }

        function hasInvalidExpression() {
          function createVariable() {
            var variable = new PlCustomVariable()
            .name($scope.customVariableName.content)
            .description('Expression: ' + expression)
            .group({
              name: MENU_USER_DEFINED_VARS_CATEGORY,
              order: -1,
              topgroup: null,
              type: 'custom'
            })
            .originalExpression(expression)
            .substitutedExpression(expWithSubNames)
            .substitutedCache(cache)
            .external(constants.nanValue, math)
            .dependencies(metaInfo);

            VariableService.addCustomVariable(variable);
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

            updateCustomMenu();

            return false;
            // DatasetFactory.getVariables(metaInfo).then(function() {
            // });
          } catch(err) {
            $log.debug('Expression evaluation failed', err.message);
            NotifyService.addTransient(null, 'Please check the mathematical expression. ' + err.message, 'error',
              { referenceId: errorField });
            return true;
          }
        }

        return hasInvalidVariables() || hasInvalidExpression();
      }

      var errorField = 'cust-var-info-' + $scope.customExpressionFieldId;
      if( nameHasErrors($scope.customVariableName.content) ||
        expressionHasErrors($scope.typedCustomVarExpression.content) ) {
        return;
      }

    };

    // ------------- Custom var stuff ends -------------------------


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
      }

      var added = getAdded(),
      payload = getPayloadField();
      removeText(payload);
      setSelected(added);
      payload.push(added);
    };

    $scope.tagRemoved = function(variable) {
      removeVariableFromCache(variable);
    };

    //$scope.mode is from directive init

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
      var ind = _.findIndex(payload, variable);
      payload.splice(ind, 1);
      removeVariableFromCache(variable);
    }

    $scope.updateSelection = function(variable, force) {

      // can hold multiple selections
      function multipleSelections(payload, cache) {
        var ind = _.findIndex(payload, variable);

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
        var ind = _.findIndex(payload, variable);

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

    function doNesting(callback) {
      VariableService.getVariables().then(function(res) {
        $scope.variables = res;
        $scope.nested = getNestedNavigation($scope.variables);
        if(callback) { callback(); }
      });
    }

    doNesting();

    // For group navigation
    function getNestedNavigation(variables) {
      function checkCustomVarCategory(second) {
        var ind = _.findIndex(second, function(d) { return _.keys(d)[0] == MENU_USER_DEFINED_VARS_CATEGORY; });

        if(ind == -1) {
          // no custom vars yet, add the category
          var obj = {};
          obj[MENU_USER_DEFINED_VARS_CATEGORY] = [];
          second.push(obj);
        }
      }


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

      checkCustomVarCategory(second);

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
      cache = getCacheField(),
      counts = _.countBy(selection, function(v) { 
        var type = $scope.getType(v);
        if(type == 'terminates') {
          ++noVars;
          return cache[v.id] && cache[v.id].selected === true;
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
      zeroth: null,
      first: null,
      second: null,
      third: null
      // all: {
      //   first: false,
      //   second: false
      // }
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
      if(level == 'first') {
        $scope.selected['zeroth'] = _.keys(group)[0];
      }
      if( $scope.getType(group) == 'terminates' ) { return; }
      $scope.selected[level] = getGroupSelection(group, level);

      // hide custom var dialog
      if( _.keys(group)[0] !== MENU_USER_DEFINED_VARS_CATEGORY ) {
        $scope.customCreateDialog(false);
      }
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

    var _selectedCache;

    function initPayload() {
      function multi() {
        // don't replace existing, if any
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
        // don't replace existing
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
      // $scope.payload = angular.copy($scope.payload);

      if($scope.mode == 'multi') { multi($scope.payload); }
      else if($scope.mode == 'scatterplot') { scatterplot(); }
      else if($scope.mode == 'regression') { regression(); }      
    }

    initPayload();

    function initCache() {
      function multi() {
        _selectedCache = {};
        _.each($scope.payload, function(variable) {
          addVariableToCache(variable);
        });
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
        _.each($scope.payload.target, function(v) {
          _selectedCache.target[v.id] = {
            selected: true
          };
        });
        _.each($scope.payload.adjust, function(v) {
          _selectedCache.adjust[v.id] = {
            selected: true
          };
        });
        _.each($scope.payload.association, function(v) {
          _selectedCache.association[v.id] = {
            selected: true
          };
        });
      }
      if($scope.mode == 'multi') { multi($scope.payload); }
      else if($scope.mode == 'scatterplot') { scatterplot(); }
      else if($scope.mode == 'regression') { regression(); }
    }

    initCache();

})

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