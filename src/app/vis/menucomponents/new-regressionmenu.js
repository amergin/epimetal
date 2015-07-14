var vis =
  angular.module('plotter.vis.menucomponents.new-regressionmenu', 
    []);


vis.controller('RegressionMenuCtrl', ['$scope', 'DatasetFactory', 'RegressionService', 'NotifyService', 'SOMService',
  function RegressionMenuCtrl($scope, DatasetFactory, RegressionService, NotifyService, SOMService) {

    $scope.selection = {
      adjust: [],
      association: [],
      target: []
    };

    DatasetFactory.getVariables().then(function(res) {
      $scope.variables = angular.copy(res);
    });

    // for target
    $scope.querySearch = function(query) {
      var results = query ? $scope.variables.filter($scope.createFilterFor(query)) : [];
      return results;
    };

    // for target
    $scope.createFilterFor = function(query) {
      var lowercaseQuery = angular.lowercase(query);

      return function filterFn(variable) {
        return (variable.name.toLowerCase().indexOf(lowercaseQuery) === 0) ||
        (variable.desc.toLowerCase().indexOf(lowercaseQuery) === 0);
      };
    };

    $scope.targetSelected = function() {
      return !_.isNull($scope.selection.target);
    };

    function typeSelected(type) {
      return $scope.selection[type].length > 0;
    }

    function getEquality() {
      var equalityLodash = _.runInContext();
      equalityLodash.mixin({
      'indexOf': function (array, item) {
        var result = -1;
        _.some(array, function (value, index) {
          if (_.isEqual(value, item)) {
            result = index;
            return true;
          }
        });
        return result;
      } });
      return equalityLodash;        
    }

    function _copy(src) {
      return angular.copy(src);
    }

    var lodash = getEquality();

    $scope.accordionOpen = {
      'target': true,
      'adjust': false,
      'association': false
    };

    var assocAndAdjustOverlapping = function() {
      return lodash.intersection(_copy($scope.selection.association), _copy($scope.selection.adjust)).length > 0;
    };

    var assocIncludesTargetVar = function() {
      return lodash.intersection(_copy($scope.selection.association), _copy($scope.selection.target)).length > 0;
    };

    var adjustIncludesTarget = function() {
      return lodash.intersection(_copy($scope.selection.adjust), _copy($scope.selection.target)).length > 0;
    };

    $scope.canEdit = function() {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.getAmount = function(type) {
      return $scope.selection[type].payload.length;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && 
      $scope.targetSelected() &&
      typeSelected('association');
    };

    $scope.submit = function() {
      var error = false;
      if( assocAndAdjustOverlapping() ) {
        NotifyService.addSticky('Incorrect variable combination', 
          'Association variables and adjust variables overlap. Please modify the selection.', 'error',  { referenceId: 'regressioninfo' });
        error = true;
      }
      if( assocIncludesTargetVar() ) {
        NotifyService.addSticky('Incorrect variable combination', 
          'The target variable is included in the association variables. Please modify the selection.', 'error', { referenceId: 'regressioninfo' });
        error = true;
      }
      if( adjustIncludesTarget() ) {
        NotifyService.addSticky('Incorrect variable combination', 
          'The target variable is included in the adjust variables. Please modify the selection.', 'error', { referenceId: 'regressioninfo' });
        error = true;
      }
      if(RegressionService.inProgress()) {
        NotifyService.addSticky('Regression already being computed', 
          'Please wait until the previous computation has been completed.', 'error', { referenceId: 'regressioninfo' });
      }
      if(error) {
        $scope.closeAccordion();
        return false;
      }

      return {
        type: 'regression',
        selection: {
          target: $scope.selection.target,
          adjust: $scope.selection.adjust,
          association: $scope.selection.association
        },
        source: $scope.dataSource
      };
    };

    $scope.cancel = function() {
    };

    $scope.somButtonDisabled = function() {
      return SOMService.empty();
    };

    $scope.dataSource = 'dataset';

    $scope.setDataSource = function(s) { 
      $scope.dataSource = s;
    };

    $scope.closeAccordion = function() {
      _.each($scope.accordionOpen, function(val, key) {
        $scope.accordionOpen[key] = false;
      });
    };

  }
]);

vis.directive('newRegressionMenu', function () {
  return {
    restrict: 'C',
    replace: false,
    scope: {
      canSubmit: "=reCanSubmit",
      submit: "=reSubmit",
      cancel: "=reCancel"
    },
    controller: 'RegressionMenuCtrl',
    templateUrl: 'vis/menucomponents/regression.modal.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});