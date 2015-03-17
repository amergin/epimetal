var mod = angular.module('services.tab', []);

mod.factory('TabService', ['$injector', '$timeout', 'constants', '$rootScope', '$state', 'WindowHandler', 'DimensionService', 'NotifyService',
  function ($injector, $timeout, constants, $rootScope, $state, WindowHandler, DimensionService, NotifyService) {

    var _service = {},
    _locked = false,
    _activeState;

    // listen on tab changes
    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {

      // som -> somewhere
      if( _.startsWith(fromState.name, 'vis.som' ) ) {

        // som -> regression
        if( _.startsWith(toState.name, 'vis.regression') ) {
          // update regression view
          WindowHandler.get(toState.name).redrawAll();
        } 
        // som -> explore
        else if( _.startsWith(toState.name, 'vis.explore') ) {
          // do nothing
        }
      } 
      // explore -> somewhere
      else if( _.startsWith(fromState.name, 'vis.explore') ) {

        // explore -> som.*
        if( _.startsWith(toState.name, 'vis.som') ) {
          // check differences and recompute & refresh if necessary
          checkSOMState();
        }
        // explore -> regression
        else if( _.startsWith(toState.name, 'vis.regression') ) {
          // do nothing
        }
      } 
      // regression -> somewhere
      else if( _.startsWith(fromState.name, 'vis.regression') ) {

        // no actions
      }
    });

    function checkDefaultPlanes() {
      var SOMService = $injector.get('SOMService'),
      PlotService = $injector.get('PlotService'),
      defaultPlanes = SOMService.defaultPlanes(),
      planeHandler = WindowHandler.get('vis.som');

      if( planeHandler.get().length === 0 ) {
        // no planes
        _.each( defaultPlanes, function(variable) {
          PlotService.drawSOM({ variables: { x: variable } }, planeHandler);
        });
      }
    }

    function checkSOMState() {
      var primary  = DimensionService.getPrimary(),
      current = DimensionService.get('vis.som'),
      SOMService = $injector.get('SOMService'),
      somBottomHandler = WindowHandler.get('vis.som');

      if( !DimensionService.equal( primary, current ) ) {
        console.log("dimension instances not equal, need to restart");
        DimensionService.restart( current, primary );
        WindowHandler.spinAllVisible();

        SOMService.getSOM(somBottomHandler).then( function succFn() {
          checkDefaultPlanes();
          $timeout(function() {
            WindowHandler.reRenderVisible({ compute: true });
          });
        }, function errFn(msg) {
          NotifyService.addTransient('Error', msg, 'danger');
          WindowHandler.removeAllVisible();

          // stop plane spins
          _.each( WindowHandler.getVisible(), function(handler) {
            _.each(handler.get(), function(win) {
              if( win.type == 'somplane' ) {
                handler.stopSpin(win._winid);
              }
            });
          });              
        })
        .finally(function() {
          _.each(WindowHandler.getVisible(), function(handler) {
            _.each(handler.get(), function(win) {
              if( win.type != 'somplane' ) {
                handler.stopSpin(win._winid);
              }
            });
          });
        });
      }      

    }

    _service.lock = function(x) {
      if(!arguments.length) { return _locked; }
      _locked = x;
      console.log("Tabs are locked = ", _locked);
      return _service;
    };

    // only get
    _service.activeState = function(x) {
      // TODO
    };



    return _service;

}]);