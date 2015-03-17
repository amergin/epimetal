 var vis = 
 angular.module( 'plotter.vis', [ 
  'ui.router.state',
  'ui.router.util',
  'ct.ui.router.extras',
  'services.dataset', 
  'services.notify',
  'services.window',
  // 'wu.packery',
  'plotter.vis.explore',
  'plotter.vis.som',
  'plotter.vis.som.distributions',
  'plotter.vis.regression',
  'plotter.vis.menucomponents',
  'services.urlhandler',
  'plotter.vis.linkcreator',
  'plotter.vis.filterinfo',
  'plotter.vis.sampleinfo',
  'mgcrea.ngStrap.popover',
  'services.som',
  'services.tab',
  'services.notify',
  'ui.layout'
  ] );

 vis.config(['$stateProvider', '$urlRouterProvider', function ( $stateProvider, $urlRouterProvider) {

  var vis = {
    name: 'vis',
    url: '/vis/',
    abstract: true,
    data: { pageTitle: 'Visualization' },
    // templateUrl: 'vis/vis.tpl.html',
    // important: the app will NOT change state to 'vis' until
    // these object promises have been resolved. Failure is generally indication
    // that the user is not logged in -> redirect to 'login' state.
    resolve: {
      variables: ['DatasetFactory', function(DatasetFactory) {
        return DatasetFactory.getVariables();
      }],
      datasets: ['DatasetFactory', function(DatasetFactory) {
        return DatasetFactory.getDatasets();
      }],
      compatibility: ['CompatibilityService', function(CompatibilityService) {
        return CompatibilityService.browserCompatibility();
      }],
      dimensionServices: ['DimensionService', 'DatasetFactory', 'SOMService', function(DimensionService, DatasetFactory, SOMService) {
        var primary = DimensionService.create('vis.explore', true);
        DatasetFactory.setDimensionService(primary);
        var som = DimensionService.create('vis.som');
        SOMService.setDimensionService(som);
        var regression = DimensionService.create('vis.regression');
      }]
    },
    views: {
      'content': {
        templateUrl: 'vis/vis.content.tpl.html',
        controller: 'VisCtrl',
      },
      'header@': {
        templateUrl: 'vis/vis.header.tpl.html',
        controller: 'HeaderCtrl'
      }
    }
  };

  var explore = {
    name: 'vis.explore',
    url: 'explore',
    parent: 'vis',
    data: { pageTitle: 'Explore datasets and filter | Visualization' },
    resolve: {
      windowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        var handler = WindowHandler.create('vis.explore');
        handler.setDimensionService( DimensionService.get('vis.explore') );
        return handler;
      }]
    },
    views: {
      'explore@vis': {
        controller: 'ExploreController',
        templateUrl: 'vis/explore/explore.tpl.html'
      },
      'submenu-explore@vis': {
        controller: 'ExploreMenuCtrl',
        templateUrl: 'vis/explore/explore.submenu.tpl.html'
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
    data: { pageTitle: 'Self-organizing maps | Visualization' },
    resolve: {
      // bottom portion of the page only!
      bottomWindowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        var handler = WindowHandler.create('vis.som');
        handler.setDimensionService( DimensionService.get('vis.som') );
        return handler;
      }]
    },
    views: {
      'submenu-som@vis': {
        templateUrl: 'vis/som/som.submenu.tpl.html'
      },
      'som@vis': {
        templateUrl: 'vis/som/som.tpl.html'
        // controller: 'ExploreMenuCtrl'
      },
      'som-bottom-menu@vis.som': {
        controller: 'SOMBottomMenuController',
        templateUrl: 'vis/som/som.bottom.menu.tpl.html'
      },
      'som-bottom-content@vis.som': {
        controller: 'SOMBottomContentController',
        templateUrl: 'vis/som/som.bottom.content.tpl.html'
      }
    },
    deepStateRedirect: true,
    sticky: true
  };
  // abstract-like state, route elsewhere
  $urlRouterProvider.when('/vis/som', '/vis/som/distributions');

  var somDistributions = {
    name: 'vis.som.distributions',
    url: '/distributions',
    // parent: 'vis.som',
    data: { pageTitle: 'Compare distributions | Self-organizing maps | Visualization' },
    resolve: {
      windowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        var handler = WindowHandler.create('vis.som.distributions');
        handler.setDimensionService( DimensionService.get('vis.som') );
        return handler;
      }]
    },
    views: {
      'submenu-distributions@vis.som': {
        controller: 'SOMMenuController',
        templateUrl: 'vis/som/distributions/som.submenu.tpl.html'
      },
      'top-distributions@vis.som': {
        controller: 'SOMDistributionsController',
        templateUrl: 'vis/som/distributions/som.top.tpl.html'
      }
    },
    deepStateRedirect: true,
    sticky: true
  };

  var somProfiles = {
    name: 'vis.som.profiles',
    url: '/profiles',
    // parent: 'vis.som',
    data: { pageTitle: 'Compare profiles | Self-organizing maps | Visualization' },
    resolve: {
      windowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        var handler = WindowHandler.create('vis.som.profiles');
        handler.setDimensionService( DimensionService.get('vis.som') );
        return handler;
      }]
    },
    views: {
      'submenu-profiles@vis.som': {
        controller: 'SOMProfilesMenuController',
        templateUrl: 'vis/som/profiles/som.submenu.tpl.html'
      },
      'top-profiles@vis.som': {
        controller: 'SOMProfilesController',
        templateUrl: 'vis/som/profiles/som.top.tpl.html'
      }
    },
    deepStateRedirect: true,
    sticky: true
  };   

  var regression = {
    name: 'vis.regression',
    url: 'regression',
    // parent: 'vis',
    data: { pageTitle: 'Regression analysis | Visualization' },
    views: {
      'submenu-regression@vis': {
        templateUrl: 'vis/regression/regression.submenu.tpl.html',
        controller: 'RegressionSubmenuController'
      },
      'regression@vis': {
        templateUrl: 'vis/regression/regression.tpl.html',
        controller: 'RegressionController'
      }
    },
    resolve: {
      windowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        var handler = WindowHandler.create('vis.regression');
        handler.setDimensionService( DimensionService.getPrimary() );
        return handler;
      }]
    },
    sticky: true,
    deepStateRedirect: true
  };


  $stateProvider.state(vis);
  $stateProvider.state(explore);
  $stateProvider.state(som);
  $stateProvider.state(somDistributions);
  $stateProvider.state(somProfiles);
  $stateProvider.state(regression);


}]);


 vis.controller( 'HeaderCtrl', ['$scope', '$stateParams', '$injector', '$state',
  function ($scope, $stateParams, $injector, $state) {

    $scope.tabs = [
    { 'title': 'Explore and filter', 'name': 'explore' },
    { 'title': 'Self-organizing maps', 'name': 'som' },
    { 'title': 'Regression analysis & associations', 'name': 'regression' }
    ];
    $scope.tabs.activeTab = 0;

    // quickfix: http://stackoverflow.com/questions/22054391/angular-ui-router-how-do-i-get-parent-view-to-be-active-when-navigating-to-ne
    $scope.$state = $state;

    console.log("header ctrl");

  }]);


 vis.controller( 'VisCtrl', ['$scope', 'DimensionService', 'DatasetFactory', '$stateParams', 'PlotService', 'UrlHandler', '$injector', 'WindowHandler', 'variables', 'datasets', '$q', 'SOMService', 'TabService', 'NotifyService',
  function VisController( $scope, DimensionService, DatasetFactory, $stateParams, PlotService, UrlHandler, $injector, WindowHandler, variables, datasets, $q, SOMService, TabService, NotifyService) {
    console.log("viscontroller");

    var $rootScope = $injector.get('$rootScope');

    $rootScope.tabChangeEnabled = function() {
      var val = !TabService.lock();
      if(!val) { 
        NotifyService.addTransient(
          'Please wait until the computation has been completed', 
          'Tabs cannot be switched during computational tasks.', 'warn');
      }
      return val;
    };

    $scope.menuDatasets = datasets;
    $scope.menuVariables = variables;

    $scope.dimensionService = DimensionService.getPrimary();


    // for debugging
    $scope.usedVariables = $scope.dimensionService.getUsedVariables();
    $scope.activeVariables = $scope.dimensionService.getDimensions();

    _.each( DatasetFactory.getSets(), function(set) {
      set.toggle();
      DatasetFactory.toggle(set);
    });

    $rootScope.$on('tab.changed', function(event, tabName) {
      _.each( WindowHandler.getVisible(), function(hand) {
        console.log("tab.changed triggered for", tabName);
        // hand.redrawAll({ 'compute': false });
      });
    });



  }]);
