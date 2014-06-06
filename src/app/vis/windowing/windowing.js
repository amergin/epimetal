var win = angular.module('plotter.vis.windowing', []);

// controller for Packery windowing system
win.controller('PackeryController', ['$scope', '$rootScope', '$timeout', function($scope, $rootScope, $timeout) {
  console.log("packery controller");
  $scope.$onRootScope('packery.add', function(event,selection,type) {
    $scope.add( selection,type );
  });

  $scope.windows = [];
  $scope.windowRunningNumber = 0;

  // remove from grid
  $scope.remove = function(number, element) {
    // console.log("remove window ", number, ", array size=", $scope.windows.length);
    $scope.windows = _.reject( $scope.windows, function(obj) { 
      return obj.number === number; 
    });
    // $scope.windows.splice(number,1);
    $scope.packery.remove( element );
    $scope.packery.layout();
  };

  // adds window to grid
  $scope.add = function(selection, type) {

    // always form a copy so that the form selection is not updated via reference to here.
    var selectionCopy = {};
    angular.copy(selection, selectionCopy);

    $scope.windows.push({ 
      number : (++$scope.windowRunningNumber),
      type: type, variables: selectionCopy 
    });
  };

}]);

// directive for Packery windowing system
win.directive('packery', [ function() {
  return {
    restrict: 'C',
    templateUrl : 'vis/windowing/packery.tpl.html',
    replace: true,
    controller: 'PackeryController',
    scope: {},
    link: function(scope, elm, attrs, controller) {


      console.log("postlink packery");
          // create a new empty grid system
          scope.packery = new Packery( elm[0], 
          { 
          // columnWidth: 220, 
          // gutter: 10,
          // see https://github.com/metafizzy/packery/issues/7
          rowHeight: 410,
          itemSelector: '.window',
          gutter: '.gutter-sizer',
          columnWidth: 500
          //columnWidth: '.grid-sizer'
        } );

          window.packery = scope.packery;
        }
      };
    }]);


// Directive for individual Window in Packery windowing system
win.directive('window', ['$compile', '$injector', function($compile, $injector){
  return {
    scope: false,
    // must be within packery directive
    require: '^packery',
    restrict: 'C',
    templateUrl : 'vis/windowing/window.tpl.html',
    replace: true,
    // transclude: true,
    link: function($scope, ele, iAttrs, controller) {
      console.log('window linker');
      $scope.element = ele;

      // create window and let Packery know
      $scope.$parent.packery.bindDraggabillyEvents( 
        new Draggabilly( $scope.element[0], { handle : '.handle' } ) );
      $scope.packery.reloadItems();      
      $scope.packery.layout();

      // append a new suitable div to execute its directive
      var elName = '';
      if( $scope.window.type === 'histogram' ) {
        elName = 'histogram';
      }
      else if( $scope.window.type === 'scatterplot' ) {
        elName = 'scatterplot';
      }
      else if( $scope.window.type === 'heatmap' ) {
        elName = 'heatmap';
      }
      else {
        throw new Error("unknown plot type");
      }

      var newEl = angular.element(
        '<div class="' + elName + '"' + 
        ' id="window' + $scope.window.number + '"></div>');
      $scope.element.append( newEl );
      $compile( newEl )($scope);

      // catch window destroys
      $scope.$on('$destroy', function() {
        var DimensionService = $injector.get('DimensionService');

        var varX = $scope.window.variables.x;
        var varY = $scope.window.variables.y;

        if( !_.isUndefined( varX ) && !_.isUndefined( varY ) ) {
          DimensionService.checkDimension([varX + '|' + varY]);
        }
        else {
          DimensionService.checkDimension([varX]);
        }
      });
    }
  };
}]);

