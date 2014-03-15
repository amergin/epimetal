var dimMod = angular.module('services.dimensions', ['services.dataset'] );

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
dimMod.service('DimensionService', ['$injector', function($injector) {

  // dimensions created in this tool
  var dimensions = {};

  // keep a record of added vars so dummy work is avoided
  var usedVariables = {};

  // initialized when samples arrive
  var crossfilterInst = null;

  // current samples, formatted for crossfilter
  // { 'SAMPID': {date: "2011-11-14T16:17:54Z", quantity: 2, total: 190, tip: 100, type: "tab"} }
  var currSamples = {};

  // return one dimension. This is used for 
  this.getDimension = function(selection) {

    // call to return one dimension
    var _getDimension = function(variable) {
      var retDimension;
      // dimension does not exist
      if( _.isUndefined( dimensions[variable] ) ) {
        retDimension = crossfilterInst.dimension( function(d) { 
          // a little checking to make sure NaN's are not returned
          return +d.variables[variable] || 0; 
        } );
         dimensions[variable] = { count: 1, dimension: retDimension };
      }
      else {
        // already defined earlier
        ++dimensions[variable].count;
        retDimension = dimensions[variable]['dimension'];
      }
      return retDimension;
    };

    // only x
    if( !_.isUndefined( selection.x ) ) {
      return _getDimension( selection.x);
    }
    else {
      console.log("Error at getting dimension!");
    }
  };


  // call this to get combined dimension for x-y scatterplots
  this.getXYDimension = function(selection) {
    var varComb = selection.x + "|" + selection.y;
    var _dim;

    // dimension does not exist, create one
    if( _.isUndefined( dimensions[varComb] ) ) {
       _dim = crossfilterInst.dimension( function(d) { 
        return {
          x: +d.variables[selection.x],
          y: +d.variables[selection.y],
          // override prototype function to ensure the object is naturally ordered
          valueOf : function() {
            return (+this.x) + (+this.y);
          }
        };
      });
      dimensions[varComb] = { count: 1, dimension: _dim };
    }
    else {
      // already defined earlier
      ++dimensions[varComb].count;
      _dim = dimensions[varComb]['dimension'];
    }
    return _dim;
  };

  this.checkDimension = function(variables) {
    console.log("check destroy ", variables);
  };


  // form a grouping using a custom reduce function
  // NB! reduce functions will only affect the 
  // grouping object VALUE part! (not the key part)  
  this.getReduceScatterplot = function(dimensionGroup) {

    var reduceAdd = function(p,v) {
      p.counts[v.dataset] = p.counts[v.dataset] + 1;
      p.dataset = v.dataset;
      p.sampleid = v.sampleid;
      return p;
    };

    var reduceRemove = function(p,v) {
      p.counts[v.dataset] = p.counts[v.dataset] - 1;
      p.dataset = v.dataset;
      p.sampleid = v.sampleid;
      return p;
    };

    var reduceInitial = function() {
      var DatasetFactory = $injector.get('DatasetFactory');
      var setNames = DatasetFactory.getSetNames();
      var p = {
        counts: {}
      };

      _.each( setNames, function(name) {
        p.counts[name] = 0;
      });
      return p;
    };

    return dimensionGroup.reduce( reduceAdd, reduceRemove, reduceInitial );
  };

  this.getReducedGroupHisto = function(dimensionGroup, variable) {

    var reduceAdd = function(p,v) {
      p.counts[v.dataset] = p.counts[v.dataset] + 1;
      p.counts.total = p.counts.total + 1;
      // p.sums[v.dataset] = p.sums[v.dataset] + v.variables[variable];
      // p.sums.total = p.sums.total + v.variables[variable];

      p.dataset = v.dataset;
      p.sampleid = v.sampleid;
      return p;
    };

    var reduceRemove = function(p,v) {
      p.counts[v.dataset] = p.counts[v.dataset] - 1;
      p.counts.total = p.counts.total - 1;
      // p.sums[v.dataset] = p.sums[v.dataset] - v.variables[variable];
      // p.sums.total = p.sums.total - v.variables[variable];

      p.dataset = v.dataset;
      p.sampleid = v.sampleid;
      return p;
    };

    var reduceInitial = function() {
      var DatasetFactory = $injector.get('DatasetFactory');
      var setNames = DatasetFactory.getSetNames();
      var p = {
        sums: {},
        counts: {}
      };

      _.each( setNames, function(name) {
        p.sums[name] = 0;
        p.counts[name] = 0;
      });
      p.sums.total = 0;
      p.counts.total = 0;
      return p;
    };

    return dimensionGroup.reduce( reduceAdd, reduceRemove, reduceInitial );    
  };

  // receives new variable data
  this.addVariableData = function(variable, samples) {

    // no dummy work
    if( !_.isUndefined( usedVariables[variable] ) ) { return; }

    usedVariables[variable] = true;

    _.each( samples, function(samp, sampId) {
      if( _.isUndefined( currSamples[sampId] ) ) {
        currSamples[sampId] = samp;
      }
      else {
        // pre-existing, extend:
        _.extend( currSamples[sampId].variables, samp.variables );
      }
    });
    console.log("currSamples");
  };


  var $sco = $injector.get('$rootScope');


  // rebuilds crossfilter instance (called after adding new variable data)
  this.rebuildInstance = function() {
    crossfilterInst = crossfilter( _.values(currSamples) );

    // create dataset dimension
    dimensions['dataset'] = crossfilterInst.dimension( function(d) { 
      return d.dataset;
    });

  };

}]);