angular.module('plotter.vis.menucomponents.filterinfo', 
  ['services.dimensions', 
  'services.filter', 
  'mgcrea.ngStrap.alert',
  'ext.d3',
  'ext.lodash'
  ])

.directive('plFilterInfo', function plFilterInfo() {
    return {
      restrict: 'A',
      scope: {},
      replace: false,
      controller: 'FilterInfoController',
      templateUrl: 'vis/menucomponents/filterinfo.tpl.html'
    };
  }
)

.controller('FilterInfoController', function FilterInfoController($scope, $timeout, $injector, DimensionService, FilterService, $state, NotifyService, TabService, DatasetFactory, SOMService, d3, _) {
    var numFormat = d3.format('.2e');
    var dimensionService = DimensionService.getPrimary();

    $scope.filters = FilterService.getFilters();

    $scope.somCheckbox = {
      // id: true/false
    };

    var initSOMCheckbox = _.once(function() {
      _.each(FilterService.getSOMFilters(), function(filt) {
        $scope.somCheckbox[filt.id()] = false;
      });
    });

    initSOMCheckbox();

    $scope.somCheckboxToggle = function(filter) {
      console.log(filter);
    };

    $scope.canSubmitDerived = function() {
      function som() {
        var hasFilters = _.any($scope.somCheckbox, function(val, key) { return val; });
        return hasFilters && $scope.derivedInput;
      }
      function explore() {
        return $scope.derivedInput;
      }

      var stateName = $state.current.name;
      if(stateName == 'vis.som') { return som(); }
      else if(stateName == 'vis.explore') { return explore(); }

    };

    $scope.formatNumber = function(num) {
      return numFormat(num);
    };

    $scope.filterOrder = function(filt) {
      switch(filt.type()) {
        case 'circle':
        return 'circle_' + filt.name();

        case 'range':
        return 'range_' + filt.variable();

        case 'classed':
        return 'classed_' + filt.variable();

        default:
        return 'xxx';
      }
    };

    $scope.showFilter = function(filter) {
      function isCircle() {
        return filter.type() == 'circle';
      }
      function isNormal() {
        return filter.type() == 'range' || filter.type() == 'classed';
      }
      var stateName = $state.current.name;
      if(stateName == 'vis.som') {
        return isCircle();
      } else if(stateName == 'vis.explore') {
        return isNormal();
      }
    };

    var editable = function() {
      if( SOMService.inProgress() ) {
        NotifyService.addSticky('Warning', 'Filters can only be edited on Explore tab.', 'warn', 
          { referenceId: 'filterinfo' });
        return false;
      }
      return true;
    };

    $scope.close = function(filter) {
      if( !editable() ) { return; }
      FilterService.removeFilter(filter);
      $injector.get('WindowHandler').redrawVisible();
    };

    $scope.reset = function() {
      if( !editable() ) { return; }
      FilterService.resetFilters({ spareSOM: true, force: true });
      $timeout(function() {
        $injector.get('WindowHandler').reRenderVisible({ compute: true, omit: 'histogram' });
        $injector.get('WindowHandler').redrawVisible();
      });
    };

    $scope.createDerived = function(name) {
      function getSelectedCircles() {
        return _.chain($scope.somCheckbox)
        .pick(function(val, key, obj) { return val; })
        .keys()
        .map(function(circleId) { 
          return FilterService.getSOMFilter(circleId); 
        })
        .value();
      }

      var stateName = $state.current.name,
      // spaces to underscores, truncate
      modified = name.replace(/\s/g, '_').substring(0,15),
      circles;

      if(stateName == 'vis.som') {
        circles = getSelectedCircles();
      } else {
        // nothing
      }

      try {
        DatasetFactory.createDerived({
          name: modified,
          circles: circles || undefined
        });

        TabService.check();
      }
      catch(err) {
        NotifyService.addSticky('Error', err.message, 'error', { referenceId: 'datasetinfo' });
      }
    };

    $scope.removeDerived = function(set) {
      DatasetFactory.removeDerived(set);
    };

    $scope.isVisible = function() {
      var stateName = $state.current.name;
      if(stateName == 'vis.som') {
        return FilterService.getFilters().length > 0;
      } else if(stateName == 'vis.explore') {
        return _.chain(FilterService.getFilters())
        .filter(function(d) { return d.type() !== 'circle'; })
        .size()
        .value() > 0;
      }
    };

    $scope.showReset = function() {
      var stateName = $state.current.name;
      if(stateName == 'vis.som') {
        return false;
      }
      return true;
    };    

});