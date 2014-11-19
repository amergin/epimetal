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
  'mgcrea.ngStrap.popover'
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
      windowHandler: ['WindowHandler', function(WindowHandler) {
        return WindowHandler.create('vis.explore');
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
      bottomWindowHandler: ['WindowHandler', function(WindowHandler) {
        return WindowHandler.create('vis.som');
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
      windowHandler: ['WindowHandler', function(WindowHandler) {
        return WindowHandler.create('vis.som.distributions');
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

vis.run(['$rootScope', '$state', '$stateParams', '$location', '$timeout',
function ($rootScope, $state, $stateParams, $location, $timeout) {
  $rootScope.$on('$viewContentLoaded',function(event, toState, toParams, fromState, fromParams){
    $timeout( function() {
      $rootScope.$emit('scatterplot.redrawAll');
      $rootScope.$emit('histogram.redraw');
      $rootScope.$emit('heatmap.redraw');    
    });
  }, 50);
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


 vis.controller( 'VisCtrl', ['$scope', 'DimensionService', '$stateParams', 'PlotService', 'UrlHandler', '$injector', 'WindowHandler', 'variables', 'datasets',
  function VisController( $scope, DimensionService, $stateParams, PlotService, UrlHandler, $injector, WindowHandler, variables, datasets) {

    $scope.testVariable = 'parent test';

    $scope.menuDatasets = datasets;
    $scope.menuVariables = variables;

    $scope.usedVariables = DimensionService.getUsedVariables();
    $scope.activeVariables = DimensionService.getDimensions();

    // populate the view from current url 
    // UrlHandler.loadNewPageState( $stateParams.path, PlotService );

    $scope.showSidebar = true;
    var $rootScope = $injector.get('$rootScope');

    $scope.toggleSidebar = function() {
      $scope.showSidebar = !$scope.showSidebar;
      var $timeout = $injector.get('$timeout');
      $timeout( function() {
        $rootScope.$emit('packery.layout');
      });
    };

    $scope.sidebarInfo = function() {
      return ( $scope.showSidebar ? 'Hide' : "Show" ) + " sidebar";
    };

    console.log("viscontroller");
  }]);
