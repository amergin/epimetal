var vis =
  angular.module('plotter.vis.menucomponents', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.window',
    'services.notify', 
    'services.dimensions', 
    'localytics.directives',
    'services.urlhandler',
    'ngClipboard'
    ]);

vis.config(['ngClipProvider', function(ngClipProvider) {
    ngClipProvider.setPath("assets/ZeroClipboard.swf");
  }]);

// directive for displaying the dataset table on sidebar
vis.directive('datasetForm', function () {
  return {
    scope: {},
    restrict: 'C',
    templateUrl: 'vis/menucomponents/dataset.tpl.html',
    replace: true,
    controller: 'DatasetTableController'
  };
});

// dataset table controller
vis.controller('DatasetTableController', ['$scope', '$rootScope', 'DatasetFactory', 'DimensionService', 'NotifyService', 'constants', '$location', 'UrlHandler', 'WindowHandler', 'FilterService', 'TabService',
  function DatasetTableController($scope, $rootScope, DatasetFactory, DimensionService, NotifyService, constants, $location, UrlHandler, WindowHandler, FilterService, TabService) {

    $scope.$watch(function() {
      return DatasetFactory.getSets();
    }, function(sets) {
      $scope.datasets = _.values(sets);
    }, true);

    // $scope.isDatabase = function(set) {
    //   return set.type() == 'database';
    // };

    $scope.removeDerived = function(set) {
      DatasetFactory.removeDerived(set);
    };

    $scope.isDerived = function(set) {
      return set.type() == 'derived';
    };

    $scope.canToggle = function() {
      return !TabService.lock();
    };

    $scope.toggle = function(set) {
      WindowHandler.spinAllVisible();

      set.toggle();
      DatasetFactory.checkActiveVariables(set).then( function succFn(res) {

        if( res === 'enabled' || res === 'disabled' ) {
          DatasetFactory.updateDataset(set);

          TabService.check({ force: true, origin: 'dataset' });

          // important!
          WindowHandler.reRenderVisible({ compute: true, dset: set, action: ("dataset:" + res) });
        }
        else if( res === 'empty' ) {
          DatasetFactory.updateDataset(set);
        }

      }, function errFn(variable) {
        var title = 'Error fetching variable ' + variable,
        message = 'Something went wrong while fetching samples with the given combination.',
        level = 'error';
        NotifyService.addTransient(title, message, level);
      }).finally( function() {
        WindowHandler.stopAllSpins();
      });
    };
  }
]);



// scatter plot form
vis.directive('scatterplotForm', function () {
  return {
    restrict: 'C',
    scope: { handler: '=' },
    replace: true,
    controller: 'ScatterplotFormController',
    templateUrl: 'vis/menucomponents/scatterplot.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});


// scatter plot form controller
vis.controller('ScatterplotFormController', ['$scope', '$rootScope', '$q', 'DatasetFactory', '$injector', 'NotifyService',
  function ($scope, $rootScope, $q, DatasetFactory, $injector, NotifyService) {
    $scope.selection = {};

    DatasetFactory.getVariables().then( function(res) { $scope.variables = res; } );

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isUndefined($scope.selection.x) && !_.isUndefined($scope.selection.y);
    };

    $scope.add = function (select) {
      $scope.$parent.$hide();

      var selection = angular.copy(select);

      var PlotService = $injector.get('PlotService');
      PlotService.drawScatter({ variables: selection, pooled: selection.pooled}, $scope.handler);

    };

  }
]);


// directive for histogram form
vis.directive('histogramForm', function () {
  return {
    restrict: 'C',
    scope: { handler: '=', somSpecial: '@'},
    replace: true,
    controller: 'HistogramFormController',
    templateUrl: 'vis/menucomponents/histogram.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});


// controller for the histogram form
vis.controller('HistogramFormController', ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService) {
    // $scope.handler comes when the directive is called in a template

    $scope.selection = {};

    DatasetFactory.getVariables().then( function(res) { $scope.variables = res; } );

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isUndefined($scope.selection.x);
    };

    $scope.isClassVariable = function(x) {
      return DatasetFactory.isClassVariable(x);
    };

    $scope.add = function (select) {
      $scope.$parent.$hide();

      var selection = angular.copy(select);

      var PlotService = $injector.get('PlotService');
      PlotService.drawHistogram({variables: selection, pooled: selection.pooled, somSpecial: $scope.somSpecial}, $scope.handler);
    };

  }
]);

// controller for the histogram form
vis.controller('SOMFormController', 
  ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService', 'constants', '$timeout', 'UrlHandler',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService, constants, $timeout, UrlHandler) {
    $scope.selection = {};

    $scope.datasets = DatasetFactory.getSets();

    DatasetFactory.getVariables().then( function(res) { $scope.variables = res; } );

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.clear = function() {
      $scope.selection.x = [];
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isEmpty($scope.selection.x) && ($scope.selection.x.length >= 3);
    };

    $scope.submitComputation = function(selection) {
      NotifyService.closeModal();
      
      DatasetFactory.getSOM(selection.x).then(
        function succFn(som) {
          NotifyService.addTransient('SOM computation ready', 'The submitted SOM computation is ready', 'success');
        }, function errFn(res) {
          NotifyService.addTransient('SOM computation failed', res, 'error');
        });
    };
  }
]);

// directive for histogram form
vis.directive('somForm', function () {
  return {
    restrict: 'C',
    scope: { handler: '=' },
    replace: true,
    controller: 'SOMFormController',
    templateUrl: 'vis/menucomponents/som.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});


// controller for the histogram form
vis.controller('HeatmapFormController', ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService', 'PlotService',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService, PlotService) {
    $scope.selection = {};

    DatasetFactory.getVariables().then( function(res) { $scope.variables = res; } );

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isEmpty($scope.selection.x);
    };

    $scope.clear = function() {
      $scope.selection.x = [];
    };

    $scope.add = function (select) {
      $scope.$parent.$hide();

      var selection = angular.copy(select);
      PlotService.drawHeatmap({variables: selection}, $scope.handler);
    };
  }
]);

// directive for heatmap form
vis.directive('heatmapForm', function () {
  return {
    restrict: 'C',
    scope: { handler: '=' },
    replace: true,
    controller: 'HeatmapFormController',
    templateUrl: 'vis/menucomponents/heatmap.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});

vis.controller('ModalFormController', ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService', 'PlotService', '$timeout', '$location', '$anchorScroll', '$modalInstance',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService, PlotService, $timeout, $location, $anchorScroll, $modalInstance) {
    $scope.variables = [];

    $scope.sideGroups = [];

    function groupVariables(variables) {
      return _.chain(variables)
      .groupBy(function(v) { return v.group.name; } )
      .values()
      .sortBy(function(g) { return g[0].group.order; } )
      .value();      
    }


    DatasetFactory.getVariables().then(function(res) {
      if($scope.extend.variables && $scope.extend.variables.length > 0) {
        // load state
        $scope.groups = Utils.chunk( groupVariables($scope.extend.variables), 3 );
      }
      else if( !_.isEmpty($scope.extend.groups) ) {
        // previous selections
        $scope.groups = $scope.extend.groups;
      }
      else {
        // nothing pre-existing...
        $scope.variables = angular.copy(res);
        $scope.groups = Utils.chunk( groupVariables($scope.variables), 3 );
      }

      $scope.sideGroups = _.chain($scope.groups)
      .flatten(false)//true)
      .value();
    });

    $scope.scrollToGroup = function(id) {
        var old = $location.hash();
        $location.hash(id);
        $anchorScroll();
        // $anchorScroll(null, { target: '#' + id, offset: -30});
        $location.hash(old);
    };

    $scope.toggleGroupSelection = function(items) {
      var value = _.first(items).selected === true;
      _.each(items, function(item) {
        if(!item['selected']) { item['selected'] = true; }
        else {
          item['selected'] = !value; //!item.selected;
        }
      });
    };

    $scope.canSubmit = function() {
      var selected = $scope.getSelected();
      if(!_.isUndefined($scope.extend.lowerLimit) && $scope.extend.lowerLimit >= selected.length) {
        return $scope.extend.canSubmit.apply(arguments);
      }
      return (selected.length > 0) && $scope.extend.canSubmit.apply(arguments);
    };

    $scope.groupSelected = function(items) {
      return _.every(items, function(i) {
        return i.selected && i.selected === true;
      });
    };

    $scope.getSelected = function(selection) {
      return _.chain(selection || $scope.groups)
      .flatten(true)
      .filter(function(v) { return v.selected === true; })
      .value();
    };

    $scope.post = function() {
      var variables = $scope.getSelected();
      var bare = _.map(variables, function(v) { return v.name; } );
      if($scope.extend.upperLimit && bare.length > $scope.extend.upperLimit ) {
        NotifyService.addTransient('Too many variables selected', 
          'Please do not exceed the limit of ' + $scope.extend.upperLimit + ' variables.', 
          'error', { referenceId: 'modalinfo' });
        return;
      } 
      $scope.$parent.extend['groups'] = $scope.groups;
      $scope.extend.variables = [];
      $modalInstance.close(bare);
    };

    $scope.cancel = function() {
      $modalInstance.dismiss('cancel');
    };

    $scope.getActiveNumber = function(items) {
      var counts = _.countBy(items, function(i) { 
      return _.isUndefined(i.selected) || i.selected === false ? false : true;
      } );
      return counts.true || 0;
    };

    $scope.$on('$destroy', function() {
      console.log("modal scope destroyed");
    });

    $scope.clear = function() {
      _.chain($scope.groups)
      .flatten(true)
      .each(function(v) { v.selected = false; })
      .value();
    };

  }
]);



// regression menu modal controller
vis.controller('RegressionMenuController', ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService', 'PlotService', 'RegressionService', 'SOMService',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService, PlotService, RegressionService, SOMService) {
    $scope.selection = {
      target: null,
      association: [],
      adjust: []
    };

    $scope.computationSource = 'dataset';

    $scope.somButtonDisabled = function() {
      return SOMService.empty();
    };

    $scope.selection = RegressionService.selectedVariables();

    function getGroupSelections(selection, variables) {
      var copy = angular.copy(variables);
      _.each(copy, function(v) {
        var contains = _.some(selection, function(s) { return v.name == s; });
        if(contains) { v.selected = true; }
      });
      return copy;
    }

    var associationScope = $scope.$new({ isolate: true });
    associationScope.extend = {
      canSubmit: function() { return true; },
      title: 'Select association variable(s) for regression analysis',
      submitButton: 'Select',
      groups: [],
      variables: []
    };

    var adjustScope = $scope.$new({ isolate: true });
    adjustScope.extend = {
      canSubmit: function() { return true; },
      title: 'Select adjust variable(s) for regression analysis',
      submitButton: 'Select',
      groups: [],
      variables: [],
      lowerLimit: 0
    };

    DatasetFactory.getVariables().then( function(res) { 
      $scope.variables = res;
      associationScope.extend.variables = getGroupSelections($scope.selection.association, $scope.variables);
      adjustScope.extend.variables = getGroupSelections($scope.selection.adjust, $scope.variables);
    });

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    var assocAndAdjustOverlapping = function() {
      return _.intersection( $scope.selection.association, $scope.selection.adjust ).length > 0;
    };

    var assocIncludesTargetVar = function() {
      return _.contains( $scope.selection.association, $scope.selection.target );
    };

    $scope.canSubmit = function () {
      return !RegressionService.inProgress() && 
      $scope.canEdit() && 
      !_.isUndefined($scope.selection.target) &&
      !_.isEmpty($scope.selection.association);
    };

    $scope.submit = function(result) {
      var error = false;
      if( assocAndAdjustOverlapping() ) {
        NotifyService.addSticky('Incorrect variable combination', 'Association variables and adjust variables overlap. Please adjust the selection.', 'error');
        error = true;
      }
      if( assocIncludesTargetVar() ) {
        NotifyService.addSticky('Incorrect variable combination', 'The target variable is included in the association variables. Please adjust the selection.', 'error');
        error = true;
      }
      if(error) { return; }

      var config = {
        variables: $scope.selection,
        source: $scope.computationSource
      };

      RegressionService.selectedVariables($scope.selection);

      PlotService.drawRegression(config, $scope.handler);
    };

    $scope.openAssociation = function() {
      var $modalScope = associationScope;

      var promise = NotifyService.addClosableModal('vis/menucomponents/new.heatmap.modal.tpl.html', $modalScope, { 
        controller: 'ModalFormController',
        windowClass: 'modal-wide'
      });

      promise.then( function succFn(variables) {
        $scope.selection.association = variables;
      }, function errFn(res) {
      })
      .finally(function() {
      });
    };

    $scope.openAdjust = function() {
      var $modalScope = adjustScope;

      var promise = NotifyService.addClosableModal('vis/menucomponents/new.heatmap.modal.tpl.html', $modalScope, { 
        controller: 'ModalFormController',
        windowClass: 'modal-wide'
      });

      promise.then( function succFn(variables) {
        $scope.selection.adjust = variables;
      }, function errFn(res) {
      })
      .finally(function() {
      });
    };



  }
]);

// directive for heatmap form
vis.directive('regressionMenu', function () {
  return {
    restrict: 'C',
    scope: { 
      handler: '='
    },
    replace: true,
    controller: 'RegressionMenuController',
    templateUrl: 'vis/menucomponents/regression-menu.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});

vis.controller('LinkCreatorController', ['$scope', 'UrlHandler', 'NotifyService', '$templateCache', '$http', '$location', '$timeout', '$state', 'usSpinnerService',
  function LinkCreatorController($scope, UrlHandler, NotifyService, $templateCache, $http, $location, $timeout, $state, usSpinnerService) {
    $scope.stateLink = null;

    $scope.clicked = function() {
      NotifyService.addTransient('Copied to clip board', 'Link copied to clip board', 'info');
      $scope.$hide();
    };

    $scope.getStateLink = function() {
      usSpinnerService.spin('linkcreator');
      UrlHandler.create()
      .then(function succFn(hash) {
        var baseUrl = window.location.origin + window.location.pathname;
        $scope.stateLink = baseUrl + $state.href($state.current.name, { state: hash }, { relative: true });
        // does not work:
        //$state.href($state.current.name, { state: hash }, { absolute: true });
      }, function errFn(res) {
        NotifyService.addSticky('Error', 'The current state could not be saved. Please try again.', 'error', 
          { referenceId: 'linkcreatorinfo' });
      })
      .finally(function() {
        usSpinnerService.stop('linkcreator');
      });

    };

    // init on load
    $scope.getStateLink();

  }
]);

// directive for heatmap form
vis.directive('linkCreator', function () {
  return {
    restrict: 'C',
    replace: true,
    controller: 'LinkCreatorController',
    templateUrl: 'vis/menucomponents/linkcreator.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});


vis.controller('NewGraphMenuCtrl', ['$scope', 'DatasetFactory',
  function NewGraphMenuCtrl($scope, DatasetFactory) {

    $scope.tab = {
      ind: 0
    };

    $scope.exportConfig = {
      heatmap: {
        separate: true
      }
    };

    function getSelection() {
      if($scope.tab.ind === 0) {
        return $scope.histogram.selection;
      }
      else if($scope.tab.ind === 1) {
        return $scope.scatterplot;
      } else if($scope.tab.ind === 2) {
        return $scope.heatmap.selection;
      }      
    }

    $scope.selectTab = function(ind) {
      $scope.tab.ind = ind;
    };

    $scope.histogram = {
      selection: []
    };
    $scope.scatterplot = {
      x: [],
      y: []
    };
    $scope.heatmap = {
      selection: []
    };

    // controllers of the menu dialog:
    $scope.canSubmit = function() {
      var selection = getSelection();
      if($scope.tab.ind === 0) {
        return selection.length > 0;
      }
      else if($scope.tab.ind === 1) {
        return _.size(selection.x) > 0 &&
        _.size(selection.y) > 0;
      } else if($scope.tab.ind === 2) {
        return selection.length > 0;
      }
    };

    $scope.submit = function() {
      function getType() {
        return $scope.tabs[$scope.tab.ind].label.toLowerCase();
      }
      var type = getType();
      return {
        type: getType(),
        selection: getSelection(),
        config: $scope.exportConfig[type]
      };
    };

    $scope.heatmapsSeparate = true;

    $scope.separateHeatmaps = function(val) {
      if(!arguments.length) { return $scope.exportConfig.heatmap.separate; }
      $scope.exportConfig.heatmap.separate = val;
    };

    $scope.cancel = function() {
    };

    $scope.tabs = [
      {
        label: 'Histogram'
      },
      {
        label: 'Scatterplot'
      },
      {
        label: 'Heatmap'
      }
    ];

  }
]);

vis.directive('newGraphMenu', function () {
  return {
    restrict: 'C',
    scope: {
      canSubmit: "=reCanSubmit",
      submit: "=reSubmit",
      cancel: "=reCancel"
    },
    replace: true,
    controller: 'NewGraphMenuCtrl',
    templateUrl: 'vis/menucomponents/new.graphmenu.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});

vis.directive('graphTabScatterplot', function () {
  return {
    restrict: 'C',
    replace: false,
    scope: {
      payloadX: "=reSelectionX",
      payloadY: "=reSelectionY"
    },
    require: '^?newGraphMenu',
    controller: 'GraphTabScatterplotCtrl',
    templateUrl: 'vis/menucomponents/tab.scatterplot.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});

vis.controller('GraphTabScatterplotCtrl', ['$scope', 'DatasetFactory',
  function GraphTabScatterplotCtrl($scope, DatasetFactory) {

    $scope.payloadX = null;
    $scope.searchTextX = null;
    $scope.payloadY = null;
    $scope.searchTextY = null;

    $scope.querySearch = function(query) {
      var results = query ? $scope.variables.filter($scope.createFilterFor(query)) : [];
      return results;
    };

    $scope.createFilterFor = function(query) {
      var lowercaseQuery = angular.lowercase(query);

      return function filterFn(variable) {
        return (variable.name.toLowerCase().indexOf(lowercaseQuery) === 0) ||
        (variable.desc.toLowerCase().indexOf(lowercaseQuery) === 0);
      };
    };

    DatasetFactory.getVariables().then(function(res) {
      $scope.variables = angular.copy(res);
    });

  }
]);


vis.controller('RegressionMenuCtrl', ['$scope', 'DatasetFactory', 'RegressionService', 'NotifyService', 'SOMService',
  function RegressionMenuCtrl($scope, DatasetFactory, RegressionService, NotifyService, SOMService) {

    $scope.selection = {
      adjust: [],
      association: [],
      target: []
    };

    DatasetFactory.getVariables().then(function(res) {
      $scope.variables = angular.copy(res);
    });

    // for target
    $scope.querySearch = function(query) {
      var results = query ? $scope.variables.filter($scope.createFilterFor(query)) : [];
      return results;
    };

    // for target
    $scope.createFilterFor = function(query) {
      var lowercaseQuery = angular.lowercase(query);

      return function filterFn(variable) {
        return (variable.name.toLowerCase().indexOf(lowercaseQuery) === 0) ||
        (variable.desc.toLowerCase().indexOf(lowercaseQuery) === 0);
      };
    };

    $scope.targetSelected = function() {
      return !_.isNull($scope.selection.target);
    };

    function typeSelected(type) {
      return $scope.selection[type].length > 0;
    }

    function getEquality() {
      var equalityLodash = _.runInContext();
      equalityLodash.mixin({
      'indexOf': function (array, item) {
        var result = -1;
        _.some(array, function (value, index) {
          if (_.isEqual(value, item)) {
            result = index;
            return true;
          }
        });
        return result;
      } });
      return equalityLodash;        
    }

    function _copy(src) {
      return angular.copy(src);
    }

    var lodash = getEquality();

    $scope.accordionOpen = {
      'target': true,
      'adjust': false,
      'association': false
    };

    var assocAndAdjustOverlapping = function() {
      return lodash.intersection(_copy($scope.selection.association), _copy($scope.selection.adjust)).length > 0;
    };

    var assocIncludesTargetVar = function() {
      return lodash.intersection(_copy($scope.selection.association), _copy($scope.selection.target)).length > 0;
    };

    var adjustIncludesTarget = function() {
      return lodash.intersection(_copy($scope.selection.adjust), _copy($scope.selection.target)).length > 0;
    };

    $scope.canEdit = function() {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.getAmount = function(type) {
      return $scope.selection[type].payload.length;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && 
      $scope.targetSelected() &&
      typeSelected('association');
    };

    $scope.submit = function() {
      var error = false;
      if( assocAndAdjustOverlapping() ) {
        NotifyService.addSticky('Incorrect variable combination', 
          'Association variables and adjust variables overlap. Please modify the selection.', 'error',  { referenceId: 'regressioninfo' });
        error = true;
      }
      if( assocIncludesTargetVar() ) {
        NotifyService.addSticky('Incorrect variable combination', 
          'The target variable is included in the association variables. Please modify the selection.', 'error', { referenceId: 'regressioninfo' });
        error = true;
      }
      if( adjustIncludesTarget() ) {
        NotifyService.addSticky('Incorrect variable combination', 
          'The target variable is included in the adjust variables. Please modify the selection.', 'error', { referenceId: 'regressioninfo' });
        error = true;
      }
      if(RegressionService.inProgress()) {
        NotifyService.addSticky('Regression already being computed', 
          'Please wait until the previous computation has been completed.', 'error', { referenceId: 'regressioninfo' });
      }
      if(error) {
        $scope.closeAccordion();
        return false;
      }

      return {
        type: 'regression',
        selection: {
          target: $scope.selection.target,
          adjust: $scope.selection.adjust,
          association: $scope.selection.association
        },
        source: $scope.dataSource
      };
    };

    $scope.cancel = function() {
    };

    $scope.somButtonDisabled = function() {
      return SOMService.empty();
    };

    $scope.dataSource = 'dataset';

    $scope.setDataSource = function(s) { 
      $scope.dataSource = s;
    };

    $scope.closeAccordion = function() {
      _.each($scope.accordionOpen, function(val, key) {
        $scope.accordionOpen[key] = false;
      });
    };

  }
]);

vis.directive('newRegressionMenu', function () {
  return {
    restrict: 'C',
    replace: false,
    scope: {
      canSubmit: "=reCanSubmit",
      submit: "=reSubmit",
      cancel: "=reCancel"
    },
    controller: 'RegressionMenuCtrl',
    templateUrl: 'vis/menucomponents/regression.modal.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});


vis.controller('SOMInputMenuCtrl', ['$scope', 'DatasetFactory', 'RegressionService', 'NotifyService', 'SOMService',
  function SOMInputMenuCtrl($scope, DatasetFactory, RegressionService, NotifyService, SOMService) {

    $scope.selection = [];

    function setVariables() {
      DatasetFactory.getVariables().then(function(variables) {
        var somVariables = SOMService.getVariables();
        $scope.selection = _.map(somVariables, function(somv) {
          return _.find(variables, function(v) { return v.name == somv; });
        });
      });
    }

    setVariables();

    $scope.canSubmit = function() {
      return $scope.selection.length >= 3;
    };

    $scope.submit = function() {
      function justNames(variables) {
        return _.map($scope.selection, function(v) {
          return v.name;
        });
      }

      var names = justNames($scope.selection);

      SOMService.setVariables(names);
      return names;
    };

  }
]);


vis.directive('somInputMenu', function () {
  return {
    restrict: 'C',
    replace: false,
    scope: {
      canSubmit: "=reCanSubmit",
      submit: "=reSubmit",
      cancel: "=reCancel"
    },
    controller: 'SOMInputMenuCtrl',
    templateUrl: 'vis/menucomponents/som.input.menu.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});


vis.controller('SOMModalMenuCtrl', ['$scope', 'DatasetFactory', 'RegressionService', 'NotifyService', 'SOMService', 'WindowHandler', 'PlotService',
  function SOMModalMenuCtrl($scope, DatasetFactory, RegressionService, NotifyService, SOMService, WindowHandler, PlotService) {

    $scope.selection = {
      planes: [],
      profiles: angular.copy(DatasetFactory.getProfiles()),
      distributions: []
    };


    $scope.selectedTab = 'planes';

    $scope.selectTab = function(tab) {
      $scope.selectedTab = tab;
    };

    $scope.activeTabIs = function(tab) {
      return $scope.selectedTab == tab;
    };

    $scope.canSubmit = function() {
      var equality = {
        'profiles': function() {
          return _.any($scope.selection.profiles, function(prof) { return prof.selected; });
        },
        'distributions': function() {
          return $scope.selection.distributions.length >= 1;
        },
        'planes': function() {
          return $scope.selection.planes.length >= 1;
        }
      };

      return (equality[$scope.selectedTab])();
    };

    $scope.submit = function() {
      function justNames(variables) {
        return _.map(variables, function(v) {
          return v.name;
        });
      }
      var contentHandler = WindowHandler.get('vis.som.content'),
      planeHandler = WindowHandler.get('vis.som.plane');
      lookup = {
        'planes': {
          getData: function() {
            return justNames($scope.selection.planes);
          },
          action: function(variables) {
            _.each(variables, function(variable) {
                PlotService.drawSOM({ variables: { x: variable } }, planeHandler);
            });
          } 
        },

        'distributions': {
          getData: function() {
            return justNames($scope.selection.distributions);
          },
          action: function(variables) {
            _.each(variables, function(variable) {
              PlotService.drawHistogram({ variables: { x: variable }, somSpecial: true, filterEnabled: false }, contentHandler);
            });
          }
        },

        'profiles': {
          getData: function() {
            var selected = _.filter($scope.selection.profiles, function(prof) {
              return prof.selected;
            });
            return selected;
          },
          action: function(profiles) {
            _.each(profiles, function(prof) {
              PlotService.drawProfileHistogram({ name: prof.name, variables: { x: justNames(prof.variables) } }, contentHandler);
            });
          }
        }
      };

      var data = lookup[$scope.selectedTab].getData();
      lookup[$scope.selectedTab].action(data);
      return data;
    };

  }
]);


vis.directive('somModalMenu', function () {
  return {
    restrict: 'C',
    replace: false,
    scope: {
      canSubmit: "=reCanSubmit",
      submit: "=reSubmit",
      cancel: "=reCancel"
    },
    controller: 'SOMModalMenuCtrl',
    templateUrl: 'vis/menucomponents/som.modal.menu.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});




// custom
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

