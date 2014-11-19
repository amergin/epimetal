var vis =
  angular.module('plotter.vis.explore', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.window',
    'services.notify', 
    'services.dimensions', 
    'localytics.directives',
    'services.urlhandler',
    'gridster',
    'utilities'
    ]);

mod.controller('ExploreController', ['$scope', '$templateCache', '$rootScope', 'windowHandler',
  function ExploreController($scope, $templateCache, $rootScope, windowHandler) {
    console.log("explore ctrl");

    $scope.windowHandler = windowHandler;
    $scope.windows  = $scope.windowHandler.get();

    $scope.itemMapper = {
        sizeX: 'window.size.x', 
        sizeY: 'window.size.y',
        row: 'window.position.row',
        col: 'window.position.col'
    };

    $scope.gridOptions = {
      pushing: true,
      floating: true,
      swapping: false,
      margins: [10, 10],
      outerMargin: true,
      draggable: {
        enabled: true,
        handle: '.handle'
      },
      defaultSizeX: 4,
      defaultSizeY: 4,
      columns: 4 * 10,
      width: 4 * 125 * 10,
      // minColumns: 4 * 4,
      // minRows: 4 * 4,
      colWidth: '125',
      rowHeight: '100',
      resizable: {
           enabled: true,
           handles: ['se']
      }
    };


    // $scope.gridsterOpts = {
    //     columns: 40, // the width of the grid, in columns
    //     pushing: true, // whether to push other items out of the way on move or resize
    //     floating: true, // whether to automatically float items up so they stack (you can temporarily disable if you are adding unsorted items with ng-repeat)
    //     swapping: true, // whether or not to have items of the same size switch places instead of pushing down if they are the same size
    //     width: 'auto', // can be an integer or 'auto'. 'auto' scales gridster to be the full width of its containing element
    //     colWidth: 'auto', // can be an integer or 'auto'.  'auto' uses the pixel width of the element divided by 'columns'
    //     // rowHeight: 'match', // can be an integer or 'match'.  Match uses the colWidth, giving you square widgets.
    //     margins: [10, 10], // the pixel distance between each widget
    //     outerMargin: true, // whether margins apply to outer edges of the grid
    //     // isMobile: false, // stacks the grid items if true
    //     // mobileBreakPoint: 600, // if the screen is not wider that this, remove the grid layout and stack the items
    //     // mobileModeEnabled: true, // whether or not to toggle mobile mode when screen width is less than mobileBreakPoint
    //     minColumns: 3, // the minimum columns the grid must have
    //     minRows: 2, // the minimum height of the grid, in rows
    //     maxRows: 5,
    //     defaultSizeX: 2, // the default width of a gridster item, if not specifed
    //     defaultSizeY: 1, // the default height of a gridster item, if not specified
    //     resizable: {
    //        enabled: true,
    //        handles: ['se'],
    //        // handles: ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'],
    //        // start: function(event, $element, widget) {}, // optional callback fired when resize is started,
    //        // resize: function(event, $element, widget) {}, // optional callback fired when item is resized,
    //        // stop: function(event, $element, widget) {} // optional callback fired when item is finished resizing
    //     },
    //     draggable: {
    //        enabled: true, // whether dragging items is supported
    //        handle: '.handle' // optional selector for resize handle
    //        // start: function(event, $element, widget) {}, // optional callback fired when drag is started,
    //        // drag: function(event, $element, widget) {}, // optional callback fired when item is moved,
    //        // stop: function(event, $element, widget) {} // optional callback fired when item is finished dragging
    //     }
    // };

  }
]);

mod.controller('ExploreMenuCtrl', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants', 'datasets', 'variables', 'windowHandler',
  function ExploreMenuCtrl($scope, $templateCache, DimensionService, $rootScope, constants, datasets, variables, windowHandler) {
    console.log("menu ctrl", datasets);

    $scope.windowHandler = windowHandler;
  }
]);
