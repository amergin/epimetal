var vis =
  angular.module('plotter.vis.menucomponents.new-graphmenu', 
    []);

vis.controller('NewGraphMenuCtrl', ['$scope', 'DatasetFactory',
  function NewGraphMenuCtrl($scope, DatasetFactory) {

    $scope.tab = {
      ind: 0
    };

    $scope.exportConfig = {
      heatmap: {
        separate: true
      }
    };

    function getSelection() {
      if($scope.tab.ind === 0) {
        return $scope.histogram.selection;
      }
      else if($scope.tab.ind === 1) {
        return $scope.scatterplot;
      } else if($scope.tab.ind === 2) {
        return $scope.heatmap.selection;
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
        return selection.length > 0;
      }
      else if($scope.tab.ind === 1) {
        return _.size(selection.x) > 0 &&
        _.size(selection.y) > 0;
      } else if($scope.tab.ind === 2) {
        return selection.length > 0;
      }
    };

    $scope.submit = function() {
      function getType() {
        return $scope.tabs[$scope.tab.ind].label.toLowerCase();
      }
      var type = getType();
      return {
        type: getType(),
        selection: getSelection(),
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

  }
]);

vis.directive('newGraphMenu', function () {
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