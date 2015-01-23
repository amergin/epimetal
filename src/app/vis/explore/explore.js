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
    'utilities',
    'mgcrea.ngStrap.collapse'
    ]);

mod.controller('ExploreController', ['$scope', '$templateCache', '$rootScope', 'windowHandler', 'DatasetFactory', '$q', 'PlotService', 'WindowHandler', 'SOMService', '$timeout',
  function ExploreController($scope, $templateCache, $rootScope, windowHandler, DatasetFactory, $q, PlotService, WindowHandler, SOMService, $timeout) {
    console.log("explore ctrl");

    $scope.windowHandler = windowHandler;
    $scope.windows  = $scope.windowHandler.get();

    $scope.itemMapper = {
        sizeX: 'window.size.x',
        sizeY: 'window.size.y'
        // row: 'window.position.row',
        // col: 'window.position.col'
    };

    var emitResize = function($element) {
      dc.events.trigger( function() {
        $rootScope.$emit('gridster.resize', $element);
      }, 200 );
    };

    // $rootScope.$on('tab.changed', function(event, tabName) {
    //   if( tabName == $scope.windowHandler.getName() ) {
    //     console.log("tab.changed triggered for", tabName);
    //     $scope.windowHandler.redrawAll();
    //   }
    // });


    $scope.gridOptions = {
      pushing: true,
      floating: true,
      swapping: true,
      margins: [10, 10],
      outerMargin: true,
      draggable: {
        enabled: true,
        handle: '.handle'
      },
      defaultSizeX: 3,
      defaultSizeY: 3,
      columns: 4 * 10,
      width: 4 * 150 * 10,
      colWidth: 150,
      rowHeight: '125',
      minSizeX: 2,
      maxSizeX: 5,
      minSizeY: 2,
      maxSizeY: 5,
      resizable: {
           enabled: true,
           handles: ['se'],
           start: function(event, $element, widget) { console.log("resize start"); },
           resize: function(event, $element, widget) { 
            event.stopImmediatePropagation();
            emitResize($element); 
            },
           stop: function(event, $element, widget) { 
            event.stopImmediatePropagation();
            emitResize($element);
          }
      }
    };


  var defaultVariables = ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc'];
  var planePromises = [];
  var defaultSOMInputs = [
    'XXL-VLDL-L',
    'XL-VLDL-L',
    'L-VLDL-L',
    'M-VLDL-L',
    'S-VLDL-L',
    'XS-VLDL-L',
    'IDL-L',
    'L-LDL-L',
    'M-LDL-L',
    'S-LDL-L',
    'XL-HDL-L',
    'L-HDL-L',
    'M-HDL-L',
    'S-HDL-L',
    'Serum-C',
    'Serum-TG',
    'HDL-C',
    'LDL-C',
    'Glc',
    'Cit',
    'Phe',
    'Gp',
    'Tyr',
    'FAw3toFA',
    'FAw6toFA',
    'SFAtoFA'
    ];

    var inputPromise = DatasetFactory.getVariableData(defaultVariables, $scope.windowHandler);

    inputPromise.then( function() {

      _.each( defaultVariables, function(variable) {
        PlotService.drawHistogram({ pooled: undefined,  variables: { x: variable } }, windowHandler);
      });

    });

  }
]);

mod.controller('ExploreMenuCtrl', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants', 'datasets', 'variables', 'windowHandler', 'NotifyService', 'PlotService',
  function ExploreMenuCtrl($scope, $templateCache, DimensionService, $rootScope, constants, datasets, variables, windowHandler, NotifyService, PlotService) {
    console.log("menu ctrl");

    $scope.windowHandler = windowHandler;
    $scope.variables = variables;
    var groups = _.chain(variables)
    .groupBy(function(v) { return v.group.name; } )
    .values()
    .sortBy(function(g) { return g[0].group.order; } )
    .value();

    // for splitting the data equally to columns, see http://stackoverflow.com/questions/21644493/how-to-split-the-ng-repeat-data-with-three-columns-using-bootstrap
    function chunk(arr, size) {
      var newArr = [];
      for (var i=0; i<arr.length; i+=size) {
        newArr.push(arr.slice(i, i+size));
      }
      return newArr;
    }

    $scope.openHeatmapSelection = function() {
      var getScope = function() {

        var $modalScope = $scope.$new(true);
        $modalScope.groups = chunk(groups, 4);
        $modalScope.modal = { wide: true };
        $modalScope.panels = [0];

        $modalScope.toggleGroupSelection = function(items) {
          var value = _.first(items).selected === true;
          _.each(items, function(item) {
            if(!item['selected']) { item['selected'] = true; }
            else {
              item['selected'] = !value; //!item.selected;
              console.log(item.selected);
            }
          });
        };

        $modalScope.groupSelected = function(items) {
          return _.every(items, function(i) {
            return i.selected && i.selected === true;
          });
        };

        $modalScope.getSelected = function() {
          return _.chain($modalScope.groups)
          .flatten()
          .filter(function(v) { return v.selected === true; })
          .value();
        };

        $modalScope.post = function() {
          var variables = $modalScope.getSelected();
          var bare = _.map(variables, function(v) { return v.name; } );
          PlotService.drawHeatmap({ variables: {x: bare} }, $scope.windowHandler);
        };

        $modalScope.getActiveNumber = function(items) {
          var counts = _.countBy(items, function(i) { 
          return _.isUndefined(i.selected) || i.selected === false ? false : true;
          } );
          return counts.true || 0;
        };
        return $modalScope;
      };

      NotifyService.addClosableModal('vis/menucomponents/heatmap.modal.tpl.html', getScope(), { 
        title: 'Add a correlation plot', 
        html: true,
        persist: true
      });
    };

  }
])

.run(['$templateCache', function($templateCache) {
  $templateCache.put('modal/modal.tpl.html', $templateCache.get('notify.modal-wide.tpl.html'));
}]);
