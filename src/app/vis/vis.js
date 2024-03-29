angular.module('plotter.vis', [
  'ui.router.state',
  'ct.ui.router.extras.core',
  'ct.ui.router.extras.dsr',
  'ct.ui.router.extras.sticky',
  'services.dataset',
  'services.variable',
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
  'progressBarInterceptor',
  'ext.lodash'
])

.config(function visConfig($stateProvider) {

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
      variables: function(VariableService) {
        return VariableService.getVariables();
      },
      datasets: function(DatasetFactory, $stateParams, $state) {
        return DatasetFactory.getDatasets();
      },
      compatibility: function(CompatibilityService) {
        return CompatibilityService.browserCompatibility();
      },
      dimensionServices: function(DimensionService, DatasetFactory, SOMService, WindowHandler) {
        var primaryDim = DimensionService.create('vis.explore', true);
        DatasetFactory.setDimensionService(primaryDim);
        var somDim = DimensionService.create('vis.som');
        SOMService.setDimensionService(somDim);
        var regression = DimensionService.create('vis.regression');

        var exploreHandler = WindowHandler.create('vis.explore');
        exploreHandler.setDimensionService(DimensionService.get('vis.explore'));

        //var somBottomHandler = WindowHandler.create('vis.som.plane');
        //somBottomHandler.setDimensionService(somDim);

        var somContentHandler = WindowHandler.create('vis.som');//.content');
        somContentHandler.setDimensionService(somDim);

        var regressionHandler = WindowHandler.create('vis.regression');
        regressionHandler.setDimensionService(primaryDim);

      },
      loadState: function(UrlHandler, $stateParams, $state, variables, datasets, compatibility, dimensionServices) {
        var stateHash = $stateParams.state;
        return UrlHandler.load(stateHash);
      }
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
      windowHandler: function(WindowHandler, DimensionService) {
        return WindowHandler.get('vis.explore');
      }
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
    reloadOnSearch: false,
    data: {
      pageTitle: 'Self-organizing maps | Visualization'
    },
    resolve: {
      // bottom portion of the page only!
      /*sideWindowHandler: function(WindowHandler, DimensionService) {
        return WindowHandler.get('vis.som.plane');
      },*/

      contentWindowHandler: function(WindowHandler, DimensionService) {
        return WindowHandler.get('vis.som');
      }
    },
    views: {
      /*'som@vis': {
        templateUrl: 'vis/som/vis.som.tpl.html'
      },*/
      'som@vis': {
        templateUrl: 'vis/som/vis.som.content.tpl.html',
        controller: 'SOMContentCtrl'
      }/* ,
      'side@vis.som': {
        templateUrl: 'vis/som/vis.som.side.tpl.html',
        controller: 'SOMSideCtrl'
      } */     
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
      windowHandler: function(WindowHandler, DimensionService) {
        return WindowHandler.get('vis.regression');
      }
    },
    sticky: true,
    deepStateRedirect: true
  };

  $stateProvider.state(vis);
  $stateProvider.state(explore);
  $stateProvider.state(som);
  $stateProvider.state(regression);

})


.controller('HeaderCtrl', function HeaderCtrl($scope, $state, TabService, SideNavService, _) {

  $scope.tabs = [{
    'title': 'Explore and filter',
    'name': 'explore'
  }, 
  {
    'title': 'Regression analysis',
    'name': 'regression'
  },
  {
    'title': 'SOM',
    'name': 'som'
  }, 
  ];

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
    SideNavService.toggle();
  };

  $scope.sideNavOpen = function() {
    return SideNavService.isOpen();
  };

  $scope.getDocUrl = function() {
    // origin includes port number
    return window.location.origin + '/documentation';
  };

  console.log("header ctrl");
})

.controller('SidenavCtrl', function sidenavCtrl($scope, TabService, $rootScope, NotifyService, WindowHandler, PlotService, RegressionService, SideNavService, SOMService, _) {

  $scope.toggleSidenav = function() {
    SideNavService.toggle();
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

    var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', 
      diagScope, { controller: 'ModalCtrl' });

    promise.then(function(config) {
      var winHandler = WindowHandler.getVisible()[0];

      function postHistogram(array) {
        _.each(array, function(variable) {
          PlotService.drawHistogram({
            variable: variable,
            pooled: false,
            somSpecial: false
          }, winHandler);
        });
      }

      function postHeatmap(variables) {
        PlotService.drawHeatmap({
          variables: variables,
          separate: config.config.separate
        }, winHandler);
      }

      function postScatterplot(variables) {
        PlotService.drawScatter({
          variables: variables,
          pooled: false
        }, winHandler);
      }

      function postBoxplot(variables) {
        _.each(variables, function(v) {
          PlotService.drawBoxplot({
            variable: v,
            somSpecial: false
          }, winHandler);
        });
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

        case 'boxplot':
          postBoxplot(config.selection);
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

    var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', 
      diagScope, { controller: 'ModalCtrl' });

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

  $scope.somRefreshButton = function() {
    return SideNavService.somRefreshButton();
  };

  $scope.refreshSOM = function() {
    TabService.doComputeSOM(function callback() {
      SideNavService.somRefreshButton(false);
    });
  };

  $scope.openSOMSettings = function(ev) {

    var diagScope = $rootScope.$new(true);

    diagScope.config = {
      title: 'Self-organizing Map settings',
      template: 'vis/menucomponents/som.settings.tpl.html',
      actions: {
        submit: 'Submit',
        cancel: 'Cancel and close'
      }
    };

    function doSize(size) {
      var changed = (SOMService.columns() !== size.cols) || 
      (SOMService.rows() !== size.rows);
      // update SOM size
      SOMService
      .rows(size.rows)
      .columns(size.cols);

      if(changed) {
        var somHandler = WindowHandler.get('vis.som');//.plane');
        SOMService.getSOM(somHandler); // no use to wait results
      }
    }

    function doPivot(res) {
      var changed = false;
      SOMService.pivotVariableEnabled(res.enabled);

      if(res.variable) {
        changed = SOMService.pivotVariable(res.variable);
      }

      if(!res.enabled || changed) {
        var somHandler = WindowHandler.get('vis.som');//.plane');
        SOMService.getSOM(somHandler); // no use to wait results        
      }

    }

    function doTrainVariables(vars) {
      SOMService.trainVariables(vars);
    }


    var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', 
      diagScope, { controller: 'ModalCtrl' });

    promise.then(function succFn(result) {

      switch(result.activeTab) {
        case 'size':
        doSize(result.size);
        break;

        case 'pivotVariable':
        doPivot(result.pivot);
        break;

        case 'trainVariables':
        doTrainVariables(result.trainVariables);
        break;
      }

    });

  };

  $scope.openRegressionModal = function(ev) {
    var diagScope = $rootScope.$new(true);

    diagScope.config = {
      title: 'Create a regression forest plot',
      template: 'vis/menucomponents/new.regression.tpl.html',
      actions: {
        submit: 'Compute regression',
        cancel: 'Cancel and close'
      }
    };

    var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', 
      diagScope, { controller: 'ModalCtrl' });

    promise.then(function succFn(result) {
      var winHandler = WindowHandler.getVisible()[0],
      config = {
        variables: result.selection,
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
      var retval = $scope.submit.inherited ? $scope.submit.inherited() : true;
      if (!retval) {
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

.controller('VisCtrl', function VisCtrl($scope, $rootScope, DimensionService, variables, datasets, TabService, NotifyService, SideNavService, $state, _) {
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
    return SideNavService.isOpen();
  };

});