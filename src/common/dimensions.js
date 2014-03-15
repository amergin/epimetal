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

  // called whenever a plot is drawn
  // selection can be x&y or just x
  this.getDimension = function(selection) {

    console.log("getDimension for ", selection);
    var dim;

    // x & y
    if( !_.isUndefined( selection.x ) && !_.isUndefined( selection.y ) ) {
    }

    // only x
    else if( !_.isUndefined( selection.x ) ) {

      // dimension does not exist
      if( _.isUndefined( dimensions[selection.x] ) ) {
        dim = crossfilterInst.dimension( function(d) { 
          // a little checking to make sure NaN's are not returned
          return +d.variables[selection.x] || 0; 
        } );
         dimensions[selection.x] = { count: 1, dimension: dim };
      }
      else {
        // already defined earlier
        ++dimensions[selection.x].count;
        dim = dimensions[selection.x]['dimension'];
      }

    }

    return dim;
  };

  this.checkDimension = function(variables) {
    console.log("check destroy ", variables);
  };

  this.getReducedGroupHisto = function(dimensionGroup, variable) {

    var DatasetFactory = $injector.get('DatasetFactory');

    var reduceAdd = function(p,v) {
      p.counts[v.dataset] = p.counts[v.dataset] + 1;
      p.counts.total = p.counts.total + 1;
      p.sums[v.dataset] = p.sums[v.dataset] + v.variables[variable];
      p.sums.total = p.sums.total + v.variables[variable];

      p.dataset = v.dataset;
      p.sampleid = v.sampleid;
      return p;
    };

    var reduceRemove = function(p,v) {
      p.counts[v.dataset] = p.counts[v.dataset] - 1;
      p.sums[v.dataset] = p.sums[v.dataset] - v.variables[variable];
      p.sums.total = p.sums.total - v.variables[variable];
      p.counts.total = p.counts.total - 1;

      p.dataset = v.dataset;
      p.sampleid = v.sampleid;
      return p;
    };

    var reduceInitial = function() {
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
        _.extend( currSamples[sampId], samp );
      }
    });
    console.log("currSamples");
  };

  // rebuilds crossfilter instance (called after adding new variable data)
  this.rebuildInstance = function() {
    crossfilterInst = crossfilter( currSamples );
  };

}]);