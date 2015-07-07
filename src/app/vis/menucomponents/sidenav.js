var mod =
  angular.module('plotter.vis.menucomponents.sidenav', 
    [
    ]);


mod.service('plSidenav', ['$injector', function($injector) {
    var that = this,
    values = {
        open: true
    };

    that.show = function() {
        values.open = true;
    };

    that.hide = function() {
        values.open = false;
    };

    that.toggle = function() {
        if(that.isOpen()) { that.hide(); }
        else { that.show(); }
    };

    that.isOpen = function() {
        return values.open;
    };

}]);


// vis.controller('PlSidenavCtrl', ['$scope', 'DatasetFactory', 'RegressionService', 'NotifyService', 'SOMService', 'plSidenav', '$animate',
//   function PlSidenavCtrl($scope, DatasetFactory, RegressionService, NotifyService, SOMService, plSidenav, $animate) {
//     console.log("sidenav");


//     $scope.show = function() {
//         $scope.element[0].style.opacity = 1;
//         $animate.enter($scope.element, $scope.element.parent());
//         // $scope.element.show();
//         // $scope.element.addClass('ng-enter');
//         // $scope.element[0].style['display'] = '';
//         // $scope.element.removeClass('ng-enter');
//     };

//     $scope.hide = function() {
//         $animate.leave($scope.element);
//         $scope.element[0].style.opacity = 0;
//         // $scope.element.hide();
//         // $scope.element.addClass('ng-leave');
//         // $scope.element[0].style['display'] = 'none';
//         // $scope.element.removeClass('ng-leave');
//     };

//     $scope.isOpen = function() {
//         return $scope.element[0].style.display !== 'none';
//     };

//     plSidenav._init($scope);

//   }]);

// mod.directive('plSidenavigation', function () {
//     function addClasses(element) {
//         element.addClass('am-slide-left');
//     }
//   return {
//     restrict: 'AEC',
//     transclude: true,
//     replace: false,
//     scope: {
//     },
//     controller: 'PlSidenavCtrl',
//     templateUrl: 'vis/menucomponents/sidenav.tpl.html',
//     link: function (scope, elm, attrs) {
//         scope.element = elm.parent();
//         addClasses(scope.element);
//     }
//   };
// });
