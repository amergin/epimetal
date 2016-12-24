angular.module('plotter.vis.menucomponents.filterinfo', 
  ['services.dimensions', 
  'services.filter', 
  'mgcrea.ngStrap.alert',
  'ext.d3',
  'ext.dc',
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

.controller('FilterInfoController', function FilterInfoController($scope, $rootScope, $timeout, $log, $injector, $state,
  DimensionService, FilterService, NotifyService, TabService, DatasetFactory, SOMService, 
  d3, dc, _) {
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

    $scope.formatNumber = function(num) {
      return numFormat(num);
    };

    $scope.filterOrder = function(filt) {
      switch(filt.type()) {
        case 'circle':
        return 'circle_' + filt.name();

        case 'range':
        return 'range_' + filt.variable().name();

        case 'classed':
        return 'classed_' + filt.variable().name();

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

      function clearField() {
        $scope.derivedInput = '';
      }

      if(!name || !name.length) {
        NotifyService.addTransient('Error', 'Please name the dataset you are creating.', 'error', { referenceId: 'datasetinfo' });
        return;
      }

      var stateName = $state.current.name,
      circles;

      if(stateName == 'vis.som') {
        var hasFilters = _.any($scope.somCheckbox, function(val, key) { return val; });

        if(!hasFilters) {
          NotifyService.addTransient('Error', 'Please check at least one filter based upon which the dataset will be created.', 'error', { referenceId: 'datasetinfo' });
          return;
        }
        circles = getSelectedCircles();
      } else {
        // nothing
      }

      try {
        var config = {
          name: name,
          circles: circles || undefined
        };
        config.setActive = circles ? false : true;
        DatasetFactory.createDerived(config);
        TabService.check();

        clearField();
      }
      catch(err) {
        $log.error(err.stack);
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

    $scope.editRangeFilterCallback = function(filter, result) {
      $log.info("range filter edit", filter, result);
    };

    $scope.truncateMiddle = function(str, length) {
      return Utils.truncateMiddle(str, length, "..");
    };

    $scope.rangeFilterLookup = {};
    var rangePrecisionFormat = d3.format(".3g");

    function getRangeFilterValue(filter) {
      return $scope.rangeFilterLookup[filter.variable().id];
    }

    function getRangeLocationInd(location) {
      return (location == 'lower') ? 0 : 1;
    }

    function getRangeLocationNotInd(location) {
      return (location == 'lower') ? 1 : 0;
    }

    $scope.getRangeFilterMin = function(filter) {
      return filter.chart().x().domain()[0] * 0.9;
    };

    $scope.getRangeFilterMax = function(filter) {
      return filter.chart().x().domain()[1] * 1.10;
    };

    $scope.initRangeFilter = function(filter, location) {
      var obj = $scope.rangeFilterLookup[filter.variable().id] || {},
      ind = getRangeLocationInd(location);
      obj[location] = +rangePrecisionFormat(filter.payload()[ind]);
      $scope.rangeFilterLookup[filter.variable().id] = obj;
    };

    $scope.setRangeFilter = function(filter, location) {
      $log.info("setting", filter, location);
      var value = getRangeFilterValue(filter)[location],
      ind = getRangeLocationInd(location);
      if(isNaN(value) || !isFinite(value)) {
        // restore old value to field
        $scope.rangeFilterLookup[filter.variable().id][location] = 
        +rangePrecisionFormat(filter.payload()[ind]);
        return;
      }
      else {
        // update the filter and redraw with new info

        var lower, upper, payloadFilter, chart;
        if(location == 'lower') {
          upper = filter.payload()[1];
          lower = value;
        } else if(location == 'upper') {
          lower = filter.payload()[0];
          upper = value;
        }

        payloadFilter = new dc.filters.RangedFilter(lower, upper);
        chart = filter.chart();
        chart.filter(null);
        chart.filter(payloadFilter);
        $injector.get('WindowHandler').redrawVisible();


        /*filter.payload()[ind] = +rangePrecisionFormat(value);
        filter.chart().filter(filter.payload());
        $injector.get('WindowHandler').redrawVisible(); */
      }
    };

    $rootScope.$on('histogram:filter:shift', function(event, filter) {
      var obj = $scope.rangeFilterLookup[filter.variable().id];
      obj['lower'] = +rangePrecisionFormat(filter.payload()[0]);
      obj['upper'] = +rangePrecisionFormat(filter.payload()[1]);
    });


});