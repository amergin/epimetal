var win = angular.module('plotter.vis.windowing', ['services.urlhandler']);

// controller for Packery windowing system
win.controller('PackeryController', ['$scope', '$rootScope', '$timeout', function($scope, $rootScope, $timeout) {
  console.log("packery controller");
  $scope.$onRootScope('packery.add', function(event, config) { //selection, type, size, filter, pooled) {
    $scope.add( config ); //, type, size, filter, pooled);

    $rootScope.$emit('variable:add', config.type, config.variables);
  });

  $scope.$onRootScope('packery.layout', function() {
    console.log("packery layout triggered");
    $scope.packery.layout();
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
    $scope.packery.remove( element[0] );
    $scope.packery.layout();
  };

  // adds window to grid
  $scope.add = function(config) { //selection, type, size, filter, pooled) {

    // always form a copy so that the form selection is not updated via reference to here.
    var variablesCopy = {};
    angular.copy(config.variables, variablesCopy);

    var win = {
      number: ++$scope.windowRunningNumber
    };
    angular.extend(win, config);

    // $scope.windows.push({ 
    //   number : (++$scope.windowRunningNumber),
    //   type: config.type, 
    //   variables: variablesCopy,
    //   pooled: config.pooled,
    //   size: config.size,
    //   filter: config.filter
    // });
    $scope.windows.push(win);
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
          // don't start layouting now
          // isInitLayout: false,
          isResizeBound: true,
          // columnWidth: 220, 
          // gutter: 10,
          // see https://github.com/metafizzy/packery/issues/7
          rowHeight: 400,
          itemSelector: '.window',
          gutter: '.gutter-sizer',
          columnWidth: 500
          // columnWidth: '.grid-sizer'
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

      if($scope.window.size == 'double') {
        $scope.element.addClass('window-dbl');
      }
      else if($scope.window.size == 'double-normal') {
        $scope.element.addClass('window-dbl-norm');
      }

      var draggable = new Draggabilly( $scope.element[0], { handle : '.handle' } );
      // create window and let Packery know
      $scope.packery.bindDraggabillyEvents( draggable );

      var newEl = angular.element(
        '<div class="' + $scope.window.type + '"' + 
        ' id="window' + $scope.window.number + '"></div>');
      $scope.element.append( newEl );
      $compile( newEl )($scope);

      $scope.packery.reloadItems();
      $scope.packery.layout();
      //$scope.packery.layoutItems( [draggable], false );

      // tell about dragging events:
      $scope.isDragging = false;
      $scope.element.find('.handle').mousedown( function() {
          $(window).mousemove(function() {
              $scope.isDragging = true;
              $(window).unbind("mousemove");
          });
      })
      .mouseup(function() {
          var wasDragging = $scope.isDragging;
          $scope.isDragging = false;
          $(window).unbind("mousemove");
          if (!wasDragging) { //was clicking
            return;
          }
          console.log("was dragging");
          setTimeout( function() {
            $scope.packery.reloadItems();
            // $scope.packery.layout();
          }, 900);
      });

      // catch window destroys
      $scope.$on('$destroy', function() {
        $rootScope.$emit('variable:remove', $scope.window.type, $scope.window.variables);
        $injector.get('UrlHandler').removeWindow($scope.window.type, $scope.window.variables, $scope.window.filter);
        // $scope.packery.reloadItems();
        $scope.packery.layout();
      });
    }
  };
}]);

