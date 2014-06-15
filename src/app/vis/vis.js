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
  'plotter.vis.windowing',
  'plotter.vis.sidebar',
  'plotter.vis.plotting'
  ] );

/**
 * Each section or module of the site can also have its own routes. AngularJS
 * will handle ensuring they are all available at run-time, but splitting it
 * this way makes each module more "self-contained".
 */
 vis.config(['$stateProvider', function ( $stateProvider ) {

  var vis = {
    name: 'vis',
    //'(?:/[^/]+)?'
    url: '/vis/{path:.*}', //'/vis/ds{(?:/)?(?:)}',
    abstract: true,
    data: { pageTitle: 'Visualization' },
    controller: 'VisCtrl',
    templateUrl: 'vis/vis.tpl.html',

    // important: the app will NOT change state to 'vis' until
    // these object promises have been resolved. Failure is generally indication
    // that the user is not logged in -> redirect to 'login' state.
    resolve: {
      variables: ['DatasetFactory', function(DatasetFactory) {
        return DatasetFactory.getVariables();
      }],
      datasets: ['DatasetFactory', function(DatasetFactory) {
        return DatasetFactory.getDatasets();
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
    views: {
      'sidebar': {
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

 vis.controller( 'VisCtrl', ['$scope', 'DimensionService', '$stateParams', 'DatasetFactory', 'NotifyService', 'PlotService',
  function VisController( $scope, DimensionService, $stateParams, DatasetFactory, NotifyService, PlotService) {
    
    $scope.visController = "visController";
    $scope.usedVariables = DimensionService.getUsedVariables();
    $scope.activeVariables = DimensionService.getDimensions();
    console.log("viscontroller");



    // regular expressions for url routing:
    var regexpStrings = {
      dataset: "(ds)(?:;set=((?:[A-Za-z0-9_-]+,)+[A-Za-z0-9_-]+|[A-Za-z0-9_-]+))?\/",
      scatter: "(?:(sca);var=([A-Za-z0-9_-]+),([A-Za-z0-9_-]+))",
      heatmap: "(?:(hea);var=((?:[A-Za-z0-9_-]+,)+[A-Za-z0-9_-]+|[A-Za-z0-9_-]+)(?:;f=((?:[A-Za-z0-9_-]+,)+[A-Za-z0-9_-]+|[A-Za-z0-9_-]+))?)",
      histogram: "(his);var=([A-Za-z0-9_-]+)(?:;f=(\\d+\\.?\\d*)-(\\d+\\.?\\d*))?"
    };

    var regexps = {
      dataset: new RegExp( regexpStrings['dataset'], 'g' ),
      scatter: new RegExp( regexpStrings['scatter'], 'g' ),
      heatmap: new RegExp( regexpStrings['heatmap'], 'g' ),
      histogram: new RegExp( regexpStrings['histogram'], 'g' )
    };

    var activeVariables = [];
    var errorMessage = 'The URL you followed is invalid. Please re-check it.';
    var windowsToCreate = [];

    _.each( regexps, function(regex, rname) {
      _.each( regex.execAll( $stateParams.path ), function(result) {
        console.log(result);
        switch( result[1] ) {
          case 'hea':
            activeVariables.push( result[2].split(",") );
            windowsToCreate.push({
              type: 'heatmap',
              variables: { x: result[2].split(",") },
              filter: result[3].split(",")
            });
            break;

          case 'ds':
            var setNames = result[2].split(",");
            _.each( setNames, function(set) { DatasetFactory.getSet(set).toggle(); } );
            break;

          case 'sca':
            activeVariables.push( result[2], result[3] );
            windowsToCreate.push({
              type: 'scatterplot',
              variables: { x: result[2], y: result[3] }
            });         
            break;

          case 'his':
            activeVariables.push( result[2] );
            windowsToCreate.push({
              type: 'histogram',
              variables: { x: result[2] },
              filter: [ +result[3], +result[4] ]
            });            
            break;
        }
      });
    });

    activeVariables = _.unique( _.flatten( activeVariables ) );
    if( !DatasetFactory.legalVariables( activeVariables ) ) {
      NotifyService.addTransient(errorMessage, 'error');
      return;
    }

    // load active variables:
    DatasetFactory.getVariableData( activeVariables ).then( function success(res) {
      console.log(res);

      _.each( windowsToCreate, function(win) {
        switch(win.type) {
          case 'scatterplot':
            PlotService.drawScatter(win.variables);
            break;

          case 'heatmap':
            PlotService.drawHeatmap(win.variables, win.filter);
            break;

          case 'histogram':
            PlotService.drawHistogram(win.variables, win.filter);
            break;
        }
      });

    }, function err(res) {
      NotifyService.addTransient(errorMessage, 'error');
    });
    console.log(activeVariables);

  }]);
