var dimMod = angular.module('services.dimensions', ['services.dataset']);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
dimMod.service('DimensionService', ['$injector', 'constants', 'DatasetFactory', '$rootScope',
  function ($injector, constants, DatasetFactory, $rootScope) {

    // dimensions created in this tool
    var dimensions = {};

    // for displaying active filters
    var dispFilters = [];

    // for displaying active sample count
    var dispSamples = {};

    // keep a record of added vars so dummy work is avoided
    var usedVariables = {};

    // initialized when samples arrive
    var crossfilterInst = null;

    // current samples, formatted for crossfilter
    var currSamples = {};

    var that = this;

    // return one dimension. This is used for 
    this.getDimension = function (selection) {

      // call to return one dimension
      var _getDimension = function (variable) {
        var retDimension;
        // dimension does not exist
        if (_.isUndefined(dimensions[variable])) {
          console.log("Dimension for ", variable, " created");

          retDimension = crossfilterInst.dimension(function (d) {
            if( _(d.variables).isUndefined() ) {
              return constants.nanValue;
            }
            else {
              // a little checking to make sure NaN's are not returned
              return +d.variables[variable] || constants.nanValue;
            }
          });
          dimensions[variable] = {
            count: 1,
            dimension: retDimension
          };
        } else {
          // already defined earlier
          ++dimensions[variable].count;
          retDimension = dimensions[variable]['dimension'];
        }
        return retDimension;
      };

      // only x
      if (!_.isUndefined(selection.x)) {
        return _getDimension(selection.x);
      } else {
        console.log("Error at getting dimension!");
      }
    };


    this.getDatasetDimension = function() {
      return dimensions['_dataset'];
    };

    this.getSOMDimension = function(somId) {
      var somKey = "som" + somId;
      if( _.isUndefined( dimensions[somKey] ) ) {

        if( _.isNull( crossfilterInst ) ) { 
          this.rebuildInstance();
        }

        dimensions[somKey] = {
          count: 1,
          filters: [],
          dimension: crossfilterInst.dimension( function(d) { 
            if( _.isUndefined( d['bmus'][somId] ) ) {
              return {
                x: NaN,
                y: NaN,
                valueOf: function() { return constants.nanValue; }
              };
           }
            return {
              x: d['bmus'][somId].x,
              y: d['bmus'][somId].y,
              valueOf: function() {
                return ( d['bmus'][somId].x + d['bmus'][somId].y ) || constants.nanValue;
              }
            };
          })
        };
      }
      else {
        ++dimensions[somKey].count;
      }
      return dimensions[somKey].dimension;
    };

    var _checkSOMFilterEmpty = function(somKey) {
      if( _.isEmpty( dimensions[somKey].filters ) ) {
        // all filters have been removed, remove the filter function
        dimensions[somKey].dimension.filterAll();
        return true;
      }
      return false;
    };

    var _applySOMFilter = function(somKey) {
      if( _checkSOMFilterEmpty(somKey) ) {
        // pass
      }
      else {
        dimensions[somKey].dimension.filterFunction( function(d) {

          if( _.isNaN( d.x ) || _.isNaN( d.y ) ) {
            // sample is not in the dataset included in the SOM computation,
            // therefore do NOT filter it out
            return true;
          }
          return _.any( dimensions[somKey].filters, function(f) {
            return (f.x === d.x) && (f.y === d.y); 
          });
        });
      }
      $rootScope.$emit('dimension:SOMFilter');
    };

    this.getSOMFilters = function(somId) {
      var somKey = 'som' + somId;
      return dimensions[somKey].filters;
    };

    this.addSOMFilter = function(somId, coord) {
      function updateDispFilter(coord, somId, somKey) {
        dispFilters.push({'action': 'added', 
          'payload': { 'type': 'som', 'coord': coord, 'id': somId }});
      }
      var somKey = "som" + somId;
      dimensions[somKey].filters.push( coord );

      updateDispFilter(coord, somId, somKey);

      _applySOMFilter(somKey);
    };

    this.removeSOMFilter = function(somId, coord) {
      function updateDispFilter(coord, somId, somKey) {
        var ind = Utils.indexOf( dispFilters, function(f,i) { 
          return _.isEqual(f.payload, {'type': 'som', 'id': somId, 'coord': coord});
        });
        if( ind != -1 ) {
          dispFilters.splice(ind,1);
        }
      }

      var somKey = "som" + somId;
      var ind = Utils.indexOf( dimensions[somKey].filters, function(f,i) { 
        return (f.x == coord.x) && (f.y == coord.y);
      });
      dimensions[somKey].filters.splice(ind,1);

      updateDispFilter(coord, somId, somKey);

      _applySOMFilter(somKey);
    };

    this.getSampleDimension = function() {
      if( _.isUndefined( dimensions['_samples'] ) ) {
        dimensions['_samples'] = {
          count: 1,
          dimension: crossfilterInst.dimension( function(d) { return d.dataset + "|" + d.id; } )
        };
      }
      else {
        ++dimensions['_samples'].count;
      }
      return dimensions['_samples'].dimension;
    };

    this.getSampleInfo = function() {
      _updateSampleInfo();
      return dispSamples;

    };

    var _updateSampleInfo = function() {
      angular.copy( {
        'active': crossfilterInst.groupAll().value()
      }, 
      dispSamples);
    };

    var sampleUpdates = ['dc.histogram.filter', 'dimension:dataset', 
    'dimension:SOMFilter', 'dimension:crossfilter'];

    _.each(sampleUpdates, function(name) {
      $rootScope.$on(name, function() { _updateSampleInfo(); });
    });

    // call this to get combined dimension for x-y scatterplots
    this.getXYDimension = function (selection) {
      var varComb = selection.x + "|" + selection.y;
      var _dim;

      var indVal = 200;
      window.output = [];

      // dimension does not exist, create one
      if (_.isUndefined(dimensions[varComb])) {

        _dim = crossfilterInst.dimension(function (d) {
          return {
            x: +d.variables[selection.x],
            y: +d.variables[selection.y],
            // override prototype function to ensure the object is naturally ordered
            valueOf: function () {
              // the value is not important, only the resulting ordering is. 
              // NaNs screw up ordering which will foil crossfilter instance!
              return (+this.x) + (+this.y) || constants.nanValue;
            }
          };
        });
        dimensions[varComb] = {
          count: 1,
          dimension: _dim
        };
      } else {
        // already defined earlier
        ++dimensions[varComb].count;
        _dim = dimensions[varComb]['dimension'];
      }
      return _dim;
    };

    $rootScope.$on('variable:remove', function(event, type, selection) {
      _.each( Utils.getVariables(type,selection, true), function(variable) {
        // heatmaps don't have a dimension
        if( type === 'heatmap' ) { return; }
        that._checkDimension(variable);
      });
    });

    $rootScope.$on('dimension:decreaseCount', function(eve, name) {
      that._checkDimension(name);
    });

    // Notice: 'variable:add' message is not noted on this service,
    // since all necessary plotters will request a dimension anyway -> handled there

    this._checkDimension = function (variable) {
        if( _.isUndefined( dimensions[variable] ) ) {
          console.log("undefined dimension checked");
          return;
        }
        --dimensions[variable].count;

        if( dimensions[variable].count === 0 ) {
          if( !_.isUndefined(dimensions[variable].filters) ) {
            _.each( angular.copy(dimensions[variable].filters), function(coord) {
              that.removeSOMFilter(variable.replace(/som/, ''), coord);
            });
            dimensions[variable].dimension.filterAll();
          }
          dimensions[variable].dimension.dispose();
          console.log('Deleting dimension', variable);
          delete dimensions[variable];
        }
    };


    // form a grouping using a custom reduce function
    // NB! reduce functions will only affect the 
    // grouping object VALUE part! (not the key part)  
    this.getReduceScatterplot = function (dimensionGroup) {

      var reduceAdd = function (p, v) {
        p.counts[v.dataset] = p.counts[v.dataset] + 1;
        p.dataset = v.dataset;
        p.sampleid = v.sampleid;
        return p;
      };

      var reduceRemove = function (p, v) {
        p.counts[v.dataset] = p.counts[v.dataset] - 1;
        p.dataset = v.dataset;
        p.sampleid = v.sampleid;
        return p;
      };

      var reduceInitial = function () {
        var DatasetFactory = $injector.get('DatasetFactory');
        var setNames = DatasetFactory.getSetNames();
        var p = {
          counts: {}
        };

        _.each(setNames, function (name) {
          p.counts[name] = 0;
        });
        return p;
      };

      return dimensionGroup.reduce(reduceAdd, reduceRemove, reduceInitial);
    };

    this.getReducedGroupHisto = function (dimensionGroup, variable) {

      var reduceAdd = function (p, v) {
        p.counts[v.dataset] = p.counts[v.dataset] + 1;
        p.counts.total = p.counts.total + 1;
        // p.sums[v.dataset] = p.sums[v.dataset] + v.variables[variable];
        // p.sums.total = p.sums.total + v.variables[variable];

        p.dataset = v.dataset;
        //p.sampleid = v.sampleid;
        return p;
      };

      var reduceRemove = function (p, v) {
        p.counts[v.dataset] = p.counts[v.dataset] - 1;
        p.counts.total = p.counts.total - 1;
        // p.sums[v.dataset] = p.sums[v.dataset] - v.variables[variable];
        // p.sums.total = p.sums.total - v.variables[variable];

        p.dataset = v.dataset;
        //p.sampleid = v.sampleid;
        return p;
      };

      var reduceInitial = function () {
        var DatasetFactory = $injector.get('DatasetFactory');
        var setNames = DatasetFactory.getSetNames();
        var p = {
          sums: {},
          counts: {}
        };

        _.each(setNames, function (name) {
          p.sums[name] = 0;
          p.counts[name] = 0;
        });
        p.sums.total = 0;
        p.counts.total = 0;
        return p;
      };

      return dimensionGroup.reduce(reduceAdd, reduceRemove, reduceInitial);
    };

    // adds BMU information for each sample in SOM
    this.addBMUs = function(somId, bmuSamples) {
      _.each( bmuSamples, function(samp) {
        var key = _getSampleKey(samp.sample.dataset, samp.sample.sampleid);
        if( _.isUndefined( currSamples[key] ) ) {
          currSamples[key] = {};

          // add dataset and sampleid fields
          angular.extend( currSamples[key], samp.sample );
        }
        if( _.isUndefined( currSamples[key]['bmus'] ) ) {
          currSamples[key]['bmus'] = {};
        }
        // add bmu info
        currSamples[key]['bmus'][somId] = { x: samp.x, y: samp.y };
      });

      this.rebuildInstance();
      // Context: datasets 1&3 have samples used to plot histogram.
      // SOM is constructed of using datasets 1&2. As a result,
      // DSETs 1&3 should be active, DSET2 is dummy and has no samples.
      // Update by applying datasetfilter function
      this.updateDatasetDimension();
    };

    // receives new variable data
    this.addVariableData = function (variable, samples) {

      var dataWasAdded = true;

      usedVariables[variable] = true;

      _.every(samples, function (samp) {

        var key = _getSampleKey(samp.dataset, samp.sampleid);

        if (_.isUndefined(currSamples[key])) {
          currSamples[ key ] = samp;
          currSamples[ key ]['bmus'] = {};
        } else {
          if( _.isUndefined( currSamples[key].variables ) ) {
            currSamples[key].variables = {};
          }

          if( !_.isUndefined( currSamples[key].variables[ variable ] ) ) {
            // dummy work for the whole gang
            dataWasAdded = false;
            return false; // stop iteration
          }

          angular.extend( currSamples[key].variables, samp.variables );
        }
        return true;
      });
      return dataWasAdded;
    };

    var _createDatasetDimension = function () {
      if (!_.isUndefined(dimensions['_dataset'])) {
        return;
      }
      dimensions['_dataset'] = crossfilterInst.dimension(function (s) {
        return s.dataset;
      });
    };

    // rebuilds crossfilter instance (called after adding new variable data)
    this.rebuildInstance = function () {
      console.log("Crossfilter instance rebuild called");
      // called for the first time, create instance
      if (crossfilterInst === null) {
        crossfilterInst = crossfilter(_.values(currSamples));
        _createDatasetDimension();
      } else {
        // already defined, just need to reboot it
        // Important: remove ALL samples regardless of the current filters
        // (requires custom build of crossfilter.js, see:
        // https://github.com/square/crossfilter/issues/109#issuecomment-45359642)
        crossfilterInst.remove( function() { return false; } );
        crossfilterInst.add(_.values(currSamples));
      }
      $rootScope.$emit('dimension:crossfilter');
    };

    this.updateDatasetDimension = function () {

      if( _.isUndefined( dimensions['_dataset'] ) ) { return; }

      var DatasetFactory = $injector.get('DatasetFactory');
      var activeSets = DatasetFactory.activeSets();

      dimensions['_dataset'].filterFunction(function (dsetName) {
        return _.any(activeSets, function (set) { 
          return set.getName() === dsetName; 
        });
      });
      $rootScope.$emit('dimension:dataset');
    };

    this.deleteDimension = function(variable) {
      if( _.isUndefined( dimensions[variable] ) ) { return; }
      dimensions[variable].dispose();
      delete dimensions[variable];
    };

    // important! these values are not *necessarily* the same as the ones
    // currently shown: Example:
    // - plot variables A,B
    // - close windows for variables A,B
    // - plot something else involving variable C
    // now usedVariables would have A,B,C but only C is an *active* variable
    // This is because the once-fetched sample data is not purged, only the dimension
    this.getUsedVariables = function() {
      return usedVariables;
    };

    this.getDimensions = function() {
      return dimensions;
    };

    this.getFilters = function() {
      return dispFilters;
    };

    // if histogram is filtered, display/remove the filter in the display array
    $rootScope.$on('dc.histogram.filter', function(eve, info) {

        // could also be moved from one range to another
        var ind = Utils.indexOf( dispFilters, function(f,i) { 
          return _.isEqual( f.payload.dimension, info.payload.dimension );
        });
        if( ind != -1 ) {
          dispFilters.splice(ind,1);
        }

        if( info.action !== 'removed' ) { dispFilters.push(info); }
    });


    // start by initializing crossfilter
    that.rebuildInstance();


  // HELPER FUNCTIONS
  var _getSampleKey = function(dataset, id) {
    var separator = "|";
    return dataset + separator + id;
  };

  }
]);