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

  var visState = {
    name: 'vis',
    url: '/vis/',
    abstract: false,
    controller: 'VisCtrl',
    templateUrl: 'vis/vis.tpl.html',
    data: { pageTitle: 'Visualization' },

    // important: the app will NOT change state to 'vis' until
    // these object promises have been resolved. Failure is generally indication
    // that the user is not logged in -> redirect to 'login' state.
    resolve: {
      variables: function(DatasetFactory) {
        return DatasetFactory.getVariables();
      },
      datasets: function(DatasetFactory) {
        return DatasetFactory.getDatasets();
      }
    }
  };

  $stateProvider.state(visState);


}]);

 vis.controller( 'VisCtrl', ['$scope', 'DimensionService',
  function VisController( $scope, DimensionService) {
    
    $scope.visController = "visController";
    $scope.usedVariables = DimensionService.getUsedVariables();
    $scope.activeVariables = DimensionService.getDimensions();
    console.log("viscontroller");
  }]);






