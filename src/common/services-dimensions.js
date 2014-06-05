var dimMod = angular.module('services.dimensions', ['services.dataset']);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
dimMod.service('DimensionService', ['$injector', 'constants', 
  function ($injector, constants) {

    // dimensions created in this tool
    var dimensions = {};

    // keep a record of added vars so dummy work is avoided
    var usedVariables = {};

    // initialized when samples arrive
    var crossfilterInst = null;

    // current samples, formatted for crossfilter
    var currSamples = {};

    // return one dimension. This is used for 
    this.getDimension = function (selection) {

      // call to return one dimension
      var _getDimension = function (variable) {
        var retDimension;
        // dimension does not exist
        if (_.isUndefined(dimensions[variable])) {
          console.log("Dimension for ", variable, " created");
          retDimension = crossfilterInst.dimension(function (d) {
            // a little checking to make sure NaN's are not returned
            return +d.variables[variable] || constants.nanValue;
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

    this.checkDimension = function (variables) {
      _.each( variables, function(variable) {
        --dimensions[variables].count;

        if( dimensions[variables].count === 0 ) {
          dimensions[variables].dimension.dispose();
          console.log('Deleting dimension', variable);
          delete dimensions[variables];
        }
      });

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

    // receives new variable data
    this.addVariableData = function (variable, samples) {

      var dataWasAdded = true;

      usedVariables[variable] = true;

      _.every(samples, function (samp, sampId) {

        var key = _getSampleKey(samp.dataset, sampId);

        if (_.isUndefined(currSamples[key])) {
          currSamples[ key ] = samp;
        } else {
          if( !_.isUndefined( currSamples[key].variables[ variable ] ) ) {
            // dummy work for the whole gang
            dataWasAdded = false;
            return false; // stop iteration
          }
          // pre-existing, extend:
          _.extend(currSamples[key].variables, samp.variables);
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
        crossfilterInst.remove();
        crossfilterInst.add(_.values(currSamples));
      }
      // redraw
      dc.redrawAll();
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

      dc.redrawAll();
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

    this.getActiveVariables = function() {
      // ensure xy-dimensions are split to two variables on return
      var flat = _.flatten( _.map( dimensions, function(value,key) { return key.split("|"); } ) );
      return _.without( flat, '_dataset' );
      //return _.without( _.keys(dimensions), '_dataset' );
    };


  // HELPER FUNCTIONS
  var _getSampleKey = function(dataset, id) {
    var separator = "|";
    return dataset + separator + id;
  };

  }
]);