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
  'services.dataset', 
  'services.notify',
  'services.window',
  'wu.packery',
  //'plotter.vis.windowing',
  'plotter.vis.sidebar',
  'plotter.vis.plotting',
  'services.urlhandler',
  'plotter.vis.linkcreator',
  'plotter.vis.filterinfo'
  ] );

/**
 * Each section or module of the site can also have its own routes. AngularJS
 * will handle ensuring they are all available at run-time, but splitting it
 * this way makes each module more "self-contained".
 */
 vis.config(['$stateProvider', function ( $stateProvider ) {

  var vis = {
    name: 'vis',
    url: '/vis/{path:.*}',
    abstract: true,
    data: { pageTitle: 'Visualization' },
    controller: 'VisCtrl',
    templateUrl: 'vis/vis.tpl.html',
    reloadOnSearch: false,

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
    }
  };

  // since parent is abstract and this one has the 
  // same url, default is always redirected to this child
  var all = {
    name: 'vis.all',
    url: '',
    // controller: ['$scope', '$stateParams', function($scope, $stateParams) { console.log($stateParams); }],
    //templateUrl: 'vis/sidebar/sidebar.tpl.html',
    data: { pageTitle: 'Visualization' },
    reloadOnSearch: false,

    views: {
      'sidebar': {
        //controller: ['$location', function($location) { $location.url('/vis/'); }],
        templateUrl: 'vis/sidebar/vis.sidebar.tpl.html',
      },
      'dashboard': {
        templateUrl: 'vis/vis.dashboard.tpl.html'
      },
      // notice absolute addressing -> to the root
      'header@': {
        templateUrl: 'vis/header.tpl.html'
      }
    }
  };

  $stateProvider.state(vis);
  $stateProvider.state(all);


}]);

 vis.controller( 'VisCtrl', ['$scope', 'DimensionService', '$stateParams', 'PlotService', 'UrlHandler', '$injector', 'WindowService', 'variables', 'datasets',
  function VisController( $scope, DimensionService, $stateParams, PlotService, UrlHandler, $injector, WindowService, variables, datasets) {

    $scope.menuDatasets = datasets;
    $scope.menuVariables = variables;
    
    $scope.visController = "visController";
    console.log("viscontroller");

    $scope.usedVariables = DimensionService.getUsedVariables();
    $scope.activeVariables = DimensionService.getDimensions();

    // populate the view from current url 
    UrlHandler.loadNewPageState( $stateParams.path, PlotService );

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

    $scope.windows = WindowService.get();

  }]);
