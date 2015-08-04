angular.module('plotter.vis.menucomponents.new-graphmenu', 
  [
  'services.dimensions', 
  'services.notify',
  'ext.lodash'
  ])

.constant('MAX_HEATMAP_VARS', 100)

.controller('NewGraphMenuCtrl', function NewGraphMenuCtrl($scope, MAX_HEATMAP_VARS, NotifyService, DimensionService, _) {

    $scope.tab = {
      ind: 0
    };

    $scope.exportConfig = {
      heatmap: {
        separate: true
      }
    };

    function getSelection() {
      switch($scope.tab.ind) {
        case 0:
        return { 'type': 'histogram', 'data': $scope.histogram.selection };

        case 1:
        return { 'type': 'scatterplot', 'data': $scope.scatterplot };

        case 2:
        return { 'type': 'heatmap', 'data': $scope.heatmap.selection };
      }
    }

    $scope.selectTab = function(ind) {
      $scope.tab.ind = ind;
    };

    $scope.histogram = {
      selection: []
    };
    $scope.scatterplot = {
      x: [],
      y: []
    };
    $scope.heatmap = {
      selection: []
    };

    // controllers of the menu dialog:
    $scope.canSubmit = function() {
      var selection = getSelection();
      if($scope.tab.ind === 0) {
        return selection.data.length > 0;
      }
      else if($scope.tab.ind === 1) {
        return _.size(selection.data.x) > 0 &&
        _.size(selection.data.y) > 0;
      } else if($scope.tab.ind === 2) {
        return selection.data.length > 0;
      }
    };

    $scope.submit = function() {
      function getType() {
        return $scope.tabs[$scope.tab.ind].label.toLowerCase();
      }

      function hasError() {
        var selection = getSelection(),
        error = false,
        dimensionCount;
        if(selection.type == 'heatmap') {
          if(selection.data.length > MAX_HEATMAP_VARS) {
            NotifyService.addSticky('Too many selected variables', 'Please limit your selections to ' + MAX_HEATMAP_VARS + ' variables.', 'error', 
              { referenceId: 'graphinfo' });
            error = true;
          }
        }
        else if(selection.type == 'scatterplot') {
          dimensionCount = DimensionService.getPrimary().availableDimensionsCount();
          if(dimensionCount < selection.data.length) {
            NotifyService.addSticky('Too many selected variables', 'Please close unnecessary figure windows first.',
              'error', { referenceId: 'graphinfo' });
            error = true;
          }
        }
        else if(selection.type == 'histogram') {
          dimensionCount = DimensionService.getPrimary().availableDimensionsCount();
          if(dimensionCount < selection.data.length) {
            NotifyService.addSticky('Too many selected variables', 'Please select a maximum of ' + dimensionCount + ' variables. You can free variables by first closing unnecessary figure windows on this tab.', 
              'error', { referenceId: 'graphinfo' });
            error = true;
          }
        }
        return error;
      }

      if(hasError()) {
        return false;
      }

      var type = getType();
      return {
        type: getType(),
        selection: getSelection().data,
        config: $scope.exportConfig[type]
      };
    };

    $scope.heatmapsSeparate = true;

    $scope.separateHeatmaps = function(val) {
      if(!arguments.length) { return $scope.exportConfig.heatmap.separate; }
      $scope.exportConfig.heatmap.separate = val;
    };

    $scope.cancel = function() {
    };

    $scope.tabs = [
      {
        label: 'Histogram'
      },
      {
        label: 'Scatterplot'
      },
      {
        label: 'Heatmap'
      }
    ];

})

.directive('newGraphMenu', function () {
  return {
    restrict: 'C',
    scope: {
      canSubmit: "=reCanSubmit",
      submit: "=reSubmit",
      cancel: "=reCancel"
    },
    replace: true,
    controller: 'NewGraphMenuCtrl',
    templateUrl: 'vis/menucomponents/new.graphmenu.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});