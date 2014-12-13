/**
 * Each section of the site has its own module. It probably also has
 * submodules, though this boilerplate is too simple to demonstrate it. Within
 * `src/app/home`, however, could exist several additional folders representing
 * additional modules that would then be listed as dependencies of this one.
 * For example, a `note` section could have the submodules `note.create`,
 * `note.delete`, `note.edit`, etc.
 *
 * Regardless, so long as dependencies are managed correctly, the build process
 * will automatically take take of the rest.
 *
 * The dependencies block here is also where component dependencies should be
 * specified, as shown below.
 */

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
  'ui.layout'
  ] );

/**
 * Each section or module of the site can also have its own routes. AngularJS
 * will handle ensuring they are all available at run-time, but splitting it
 * this way makes each module more "self-contained".
 */
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
      // defaultView: ['DatasetFactory', 'PlotService', 'SOMService', '$q', 'variables', 'datasets', 'compatibility', 'WindowHandler',
      // function(DatasetFactory, PlotService, SOMService, $q, variables, datasets, compatibility, WindowHandler) {
      //   var defer = $q.defer();
      //   return defer.promise;
      // }]
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
      'submenu': {
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
      'submenu@vis': {
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
    views: {
      'submenu-profiles@vis.som': {
        // controller: 'SOMDistributionsController',
        templateUrl: 'vis/som/profiles/som.submenu.tpl.html'
      },
      'top-profiles@vis.som': {
        // controller: 'SOMDistributionsController',
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
      'submenu@vis': {
        controller: 'RegressionController',
        templateUrl: 'vis/regression/regression.submenu.tpl.html'
      },
      'regression@vis': {
        templateUrl: 'vis/regression/regression.tpl.html'
      }
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

// vis.run(['$rootScope', '$state', '$stateParams', '$location', '$timeout', 'DimensionService', 'DatasetFactory', 'PlotService', '$q', 'WindowHandler', 'SOMService',
// function ($rootScope, $state, $stateParams, $location, $timeout, DimensionService, DatasetFactory, PlotService, $q, WindowHandler, SOMService) {
// }]);


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


 vis.controller( 'VisCtrl', ['$scope', 'DimensionService', 'DatasetFactory', '$stateParams', 'PlotService', 'UrlHandler', '$injector', 'WindowHandler', 'variables', 'datasets', '$q', 'SOMService',
  function VisController( $scope, DimensionService, DatasetFactory, $stateParams, PlotService, UrlHandler, $injector, WindowHandler, variables, datasets, $q, SOMService) {
    console.log("viscontroller");

    var $rootScope = $injector.get('$rootScope');

    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      var name = 'vis.som';
      switch(toState.name) {
        case 'vis.som':
        case 'vis.som.distributions':
        case 'vis.som.profiles':
        name = 'vis.som';
        break;

        case 'vis.explore':
        name = 'vis.explore';
        break;
      }
      DatasetFactory.setDimensionService( DimensionService.get(name) );
      $rootScope.$emit('tab.changed', name);
    });

    $scope.menuDatasets = datasets;
    $scope.menuVariables = variables;

    $scope.dimensionService = DimensionService.getPrimary();

    $scope.usedVariables = $scope.dimensionService.getUsedVariables();
    $scope.activeVariables = $scope.dimensionService.getDimensions();



    // $rootScope.$on('$viewContentLoaded', function() {
    //   console.log("loaded", arguments);
    // });

    // populate the view from current url 
    // UrlHandler.loadNewPageState( $stateParams.path, PlotService );

  _.each( DatasetFactory.getSets(), function(set) {
    set.toggle();
    DatasetFactory.toggle(set);
  });

    $rootScope.$on('tab.changed', function(event, tabName) {
      _.each( WindowHandler.getVisible(), function(hand) {
        console.log("tab.changed triggered for", tabName);
        hand.redrawAll({ 'compute': false });
      });
    });



  }]);
