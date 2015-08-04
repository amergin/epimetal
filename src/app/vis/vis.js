angular.module('plotter.vis', [
  'ui.router.state',
  // 'ui.router.util',
  // 'ct.ui.router.extras',
  'ct.ui.router.extras.core',
  'ct.ui.router.extras.dsr',
  'ct.ui.router.extras.sticky',
  'services.dataset',
  'services.notify',
  'services.window',
  'services.urlhandler',
  'plotter.vis.explore',
  'plotter.vis.som',
  'plotter.vis.regression',
  'plotter.vis.menucomponents',
  'services.som',
  'services.tab',
  'services.notify',
  'services.task-handler',
  'ngProgress',
  'progressBarInterceptor',
  'angularResizable',
  'ext.lodash'
])

.config(function visConfig($stateProvider, ngProgressProvider) {

  var vis = {
    name: 'vis',
    url: '/vis/?state',
    abstract: true,
    // don't reload state when query parameter is modified
    reloadOnSearch: false,
    data: {
      pageTitle: 'Visualization'
    },
    params: {
      state: undefined
    },
    resolve: {
      variables: ['DatasetFactory', function(DatasetFactory) {
        return DatasetFactory.getVariables();
      }],
      datasets: ['DatasetFactory', '$stateParams', '$state', function(DatasetFactory, $stateParams, $state) {
        return DatasetFactory.getDatasets();
      }],
      compatibility: ['CompatibilityService', function(CompatibilityService) {
        return CompatibilityService.browserCompatibility();
      }],
      dimensionServices: ['DimensionService', 'DatasetFactory', 'SOMService', 'WindowHandler', function(DimensionService, DatasetFactory, SOMService, WindowHandler) {
        var primaryDim = DimensionService.create('vis.explore', true);
        DatasetFactory.setDimensionService(primaryDim);
        var somDim = DimensionService.create('vis.som');
        SOMService.setDimensionService(somDim);
        var regression = DimensionService.create('vis.regression');

        var exploreHandler = WindowHandler.create('vis.explore');
        exploreHandler.setDimensionService(DimensionService.get('vis.explore'));

        var somBottomHandler = WindowHandler.create('vis.som.plane');
        somBottomHandler.setDimensionService(somDim);

        var somContentHandler = WindowHandler.create('vis.som.content');
        somContentHandler.setDimensionService(somDim);

        var regressionHandler = WindowHandler.create('vis.regression');
        regressionHandler.setDimensionService(primaryDim);

      }],
      loadState: ['UrlHandler', '$stateParams', '$state', 'variables', 'datasets', 'compatibility', 'dimensionServices',
        function(UrlHandler, $stateParams, $state, variables, datasets, compatibility, dimensionServices) {
          var stateHash = $stateParams.state;
          return UrlHandler.load(stateHash);
        }
      ]
    },
    views: {
      'content@': {
        templateUrl: 'vis/vis.content.tpl.html',
        controller: 'VisCtrl',
      },
      'header@': {
        templateUrl: 'vis/vis.header.tpl.html',
        controller: 'HeaderCtrl'
      },
      'sidenav@': {
        templateUrl: 'vis/vis.sidenav.tpl.html',
        controller: 'SidenavCtrl'
      }
    }
  };

  var explore = {
    name: 'vis.explore',
    url: 'explore',
    parent: 'vis',
    reloadOnSearch: false,
    data: {
      pageTitle: 'Explore datasets and filter | Visualization'
    },
    resolve: {
      windowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        return WindowHandler.get('vis.explore');
      }]
    },
    views: {
      'explore@vis': {
        controller: 'ExploreController',
        templateUrl: 'vis/explore/explore.tpl.html'
      }
    },
    deepStateRedirect: true,
    sticky: true
  };

  var som = {
    name: 'vis.som',
    url: 'som',
    // parent: 'vis',
    // abstract: true,
    reloadOnSearch: false,
    data: {
      pageTitle: 'Self-organizing maps | Visualization'
    },
    resolve: {
      // bottom portion of the page only!
      bottomWindowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        return WindowHandler.get('vis.som.plane');
      }],

      contentWindowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        return WindowHandler.get('vis.som.content');
      }]
    },
    views: {
      'som@vis': {
        templateUrl: 'vis/som/vis.som.content.tpl.html',
        controller: 'SOMContentCtrl'
      },

      'bottom@': {
        templateUrl: 'vis/som/vis.som.bottom.tpl.html',
        controller: 'SOMBottomContentCtrl'
      }
    },
    deepStateRedirect: true,
    sticky: true
  };

  var regression = {
    name: 'vis.regression',
    url: 'regression',
    // parent: 'vis',
    reloadOnSearch: false,
    data: {
      pageTitle: 'Regression analysis | Visualization'
    },
    views: {
      'regression@vis': {
        templateUrl: 'vis/regression/regression.tpl.html',
        controller: 'RegressionController'
      }
    },
    resolve: {
      windowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        return WindowHandler.get('vis.regression');
      }]
    },
    sticky: true,
    deepStateRedirect: true
  };

  $stateProvider.state(vis);
  $stateProvider.state(explore);
  $stateProvider.state(som);
  $stateProvider.state(regression);

  // progress bar settings
  ngProgressProvider.setHeight('3px');
})


.controller('HeaderCtrl', function HeaderCtrl($scope, $state, TabService, plSidenav, _) {

  $scope.tabs = [{
    'title': 'Explore and filter',
    'name': 'explore'
  }, {
    'title': 'Self-organizing maps',
    'name': 'som'
  }, {
    'title': 'Regression analysis & associations',
    'name': 'regression'
  }];

  function getTabInd() {
    var state = TabService.activeState();
    if (state.name == 'vis.explore') {
      return 0;
    } else if (_.startsWith(state.name, 'vis.som')) {
      return 1;
    } else if (state.name == 'vis.regression') {
      return 2;
    }
  }

  $scope.headerTabInd = getTabInd();

  // quickfix: http://stackoverflow.com/questions/22054391/angular-ui-router-how-do-i-get-parent-view-to-be-active-when-navigating-to-ne
  $scope.$state = $state;


  $scope.toggleSidenav = function() {
    plSidenav.toggle();
  };

  $scope.sideNavOpen = function() {
    return plSidenav.isOpen();
  };

  console.log("header ctrl");
})

.controller('SidenavCtrl', function sidenavCtrl($scope, TabService, $rootScope, NotifyService, WindowHandler, PlotService, RegressionService, plSidenav, SOMService, _) {

  $scope.toggleSidenav = function() {
    plSidenav.toggle();
  };

  $scope.openGraphModal = function(ev) {
    var diagScope = $rootScope.$new(true);

    diagScope.config = {
      title: 'Create a new graph',
      template: 'vis/menucomponents/new.graph.tpl.html',
      actions: {
        submit: 'Create a graph',
        cancel: 'Cancel and close'
      }
    };

    var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', diagScope, {
      controller: 'ModalCtrl'
    }, ev);

    promise.then(function(config) {
      var winHandler = WindowHandler.getVisible()[0];

      function postHistogram(array) {
        _.each(array, function(variable) {
          PlotService.drawHistogram({
            variables: {
              x: variable.name
            },
            pooled: false,
            somSpecial: false
          }, winHandler);
        });
      }

      function postHeatmap(array) {
        function processVariables(array) {
          return _.chain(array)
            .map(function(v) {
              return v.name;
            }).value();
        }

        PlotService.drawHeatmap({
          variables: {
            x: processVariables(array)
          },
          separate: config.config.separate
        }, winHandler);
      }

      function postScatterplot(selection) {
        PlotService.drawScatter({
          variables: {
            x: _.first(selection.x).name,
            y: _.first(selection.y).name
          },
          pooled: false
        }, winHandler);
      }

      switch (config.type) {
        case 'histogram':
          postHistogram(config.selection);
          break;

        case 'scatterplot':
          postScatterplot(config.selection);
          break;

        case 'heatmap':
          postHeatmap(config.selection);
          break;
      }

    });
  };

  $scope.openSOMModal = function(ev) {
    var diagScope = $rootScope.$new(true);

    diagScope.config = {
      title: 'Add SOM figures',
      template: 'vis/menucomponents/som.modal.tpl.html',
      actions: {
        submit: 'Create',
        cancel: 'Cancel and close'
      }
    };

    var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', diagScope, {
      controller: 'ModalCtrl'
    }, ev);

    promise.then(function succFn(variables) {

    }, function errFn() {

    });

  };

  $scope.canOpen = function() {
    return !TabService.lock();
  };

  $scope.canOpenSOM = function() {
    return !SOMService.inProgress();
  };

  $scope.openSOMInputModal = function(ev) {

    var diagScope = $rootScope.$new(true);

    diagScope.config = {
      title: 'Select Self-organizing Map input variables',
      template: 'vis/menucomponents/som.input.tpl.html',
      actions: {
        submit: 'Update input variables',
        cancel: 'Cancel and close'
      }
    };

    var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', diagScope, {
      controller: 'ModalCtrl'
    }, ev);

    promise.then(function succFn(result) {}, function errFn() {});

  };

  $scope.openRegressionModal = function(ev) {
    var diagScope = $rootScope.$new(true);

    diagScope.config = {
      title: 'Create a regression view',
      template: 'vis/menucomponents/new.regression.tpl.html',
      actions: {
        submit: 'Compute regression',
        cancel: 'Cancel and close'
      }
    };

    var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', diagScope, {
      controller: 'ModalCtrl'
    }, ev);

    promise.then(function(result) {
      function pickVariables(value) {
        if (_.isArray(value)) {
          return _.map(value, function(d) {
            return d.name;
          });
        } else {
          return value.name;
        }
      }

      function getVariablesFormatted(selection) {
        return _.chain(selection)
          .map(function(v, k) {
            return [k, pickVariables(v)];
          })
          .zipObject()
          .value();
      }

      var winHandler = WindowHandler.getVisible()[0],
        config = {
          variables: getVariablesFormatted(result.selection),
          source: result.source
        };

      RegressionService.selectedVariables(result.selection);
      PlotService.drawRegression(config, winHandler);
    });
  };

  $scope.getMenuButtonType = function() {
    var state = TabService.activeState();
    switch (state.name) {
      case 'vis.regression':
        return 'regression';

      case 'vis.som':
        return 'som';

      default:
        return 'default';
    }
  };

})

.controller('ModalCtrl', function ModalCtrl($scope, _) {

  $scope.canSubmit = {
    initial: function() {
      return _.isNull($scope.canSubmit.inherited) ? true : $scope.canSubmit.inherited();
    },
    inherited: null
  };

  $scope.submit = {
    initial: function() {
      var retval = $scope.submit.inherited();
      if (retval === false) {
        return;
      } else {
        $scope.$close(retval);
      }
    },
    inherited: null
  };

  $scope.cancel = {
    initial: function() {
      $scope.$dismiss(!$scope.cancel.inherited ? {} : $scope.cancel.inherited());
    },
    inherited: null
  };

})

.controller('VisCtrl', function VisCtrl($scope, $rootScope, DimensionService, variables, datasets, TabService, NotifyService, plSidenav, $state, _) {
  console.log("viscontroller");

  $rootScope.tabChangeEnabled = function(tab) {
    var locked = !TabService.lock(),
      canChange = TabService.canChangeTo('vis.' + tab.name);

    if (!locked) {
      NotifyService.addTransient(
        'Please wait until the computation has been completed',
        'Tabs cannot be switched during computational tasks.', 'warn');
    } else if (!canChange) {
      NotifyService.addTransient(
        'Please navigate between the tabs in consecutive order',
        'Please navigate between the tabs in consecutive order.', 'warn');
    }
    return locked && canChange;
  };

  $scope.menuDatasets = datasets;
  $scope.menuVariables = variables;

  $scope.dimensionService = DimensionService.getPrimary();

  $rootScope.sideMenuVisible = function() {
    return plSidenav.isOpen();
  };

  $rootScope.showBottomContainer = function() {
    return _.startsWith($state.current.name, 'vis.som');
  };

});