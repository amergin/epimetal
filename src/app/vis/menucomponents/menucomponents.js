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
vis.controller('DatasetTableController', ['$scope', '$rootScope', 'DatasetFactory', 'DimensionService', 'NotifyService', 'constants', '$location', 'UrlHandler', 'WindowHandler',
  function DatasetTableController($scope, $rootScope, DatasetFactory, DimensionService, NotifyService, constants, $location, UrlHandler, WindowHandler) {

    $scope.datasets = DatasetFactory.getSets();

    $scope.toggle = function(set) {
      WindowHandler.spinAllVisible();

      set.toggle();
      DatasetFactory.checkActiveVariables(set).then( function succFn(res) {

        if( res === 'enabled' || res === 'disabled' ) {
          DatasetFactory.updateDataset(set);

          // important!
          WindowHandler.reRenderVisible({ compute: true, dset: set, action: res });
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
vis.controller('RegressionMenuController', ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService', 'PlotService', 'RegressionService',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService, PlotService, RegressionService) {
    $scope.selection = {
      target: null,
      association: [],
      adjust: []
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
        variables: $scope.selection
      };

      RegressionService.selectedVariables($scope.selection);

      // only draw on first window, on subsequent, force redraw
      if( $scope.handler.get().length > 0 ) {
        $scope.handler.redrawAll();
      } else {
        PlotService.drawRegression(config, $scope.handler);
      }
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
        $scope.stateLink = $state.href($state.current.name, { state: hash }, { absolute: true });
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