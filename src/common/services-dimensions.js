var dimMod = angular.module('services.dimensions', ['services.dataset', 'ui.router.state']);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
dimMod.factory('DimensionService', ['$injector', 'constants', '$rootScope', '$state',
  function ($injector, constants, $rootScope, $state) {

    var _instances = {};

    function DimensionInstance(name) {
      // dimensions created in this tool
      var dimensions = {};

      // for displaying active sample count
      var dispSamples = {};

      // keep a record of added vars so dummy work is avoided
      var usedVariables = {};

      // initialized when samples arrive
      var crossfilterInst = null;

      // current samples, formatted for crossfilter
      var currSamples = {};

      var that = this;

      // instance name, should be unique
      var _name = name || '';

      this.getHash = function() {
        var re = /((?:\w+).(?:\w+))(?:.\w+)?/i;
        var current = $state.current.name;
        var parent = _.last( re.exec(current) );

        if( $injector.get('DimensionService').getPrimary().getName() == that.getName() ) { //parent ) {
          return that.getSampleDimension().groupAll().value();
        }
        else {
          return crossfilterInst.size();
        }
        // return String( crossfilterInst.size() ) + "|" + String( that.getSampleDimension().groupAll().value() );
        // return that.getSampleDimension().groupAll().value();
      };

      this.getName = function() {
        return _name;
      };

      // return one dimension. 
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

      this.getSOMDimension = function() {
        var somKey = "som";// + somId;
        if( _.isUndefined( dimensions[somKey] ) ) {
          dimensions[somKey] = {
            count: 1,
            filters: {},
            dimension: crossfilterInst.dimension( function(d) { 
              if( _.isEmpty( d['bmus'] ) ) {
                return {
                  x: NaN,
                  y: NaN,
                  valueOf: function() { return constants.nanValue; }
                };
              }
              return {
                x: d['bmus'].x,
                y: d['bmus'].y,
                valueOf: function() {
                  return ( d['bmus'].x + d['bmus'].y ) || constants.nanValue;
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

      this.updateSOMFilter = function(circleId, content) { //somId, circleId, content) {
        var somKey = "som"; // + somId;
        if( !dimensions[somKey].filters[circleId] ) {
          dimensions[somKey].filters[circleId] = [];
        }

        dimensions[somKey].filters[circleId] = content;
        _applySOMFilter(somKey);
      };

      var _applySOMFilter = function(somKey) {
        if( _checkSOMFilterEmpty(somKey) ) {
          // pass
        }
        else {
          dimensions[somKey].dimension.filterFunction( function(d) {
            // if( _.isNaN( d.x ) || _.isNaN( d.y ) ) {
            //   // sample is not in the dataset included in the SOM computation,
            //   // therefore do NOT filter it out
            //   return true;
            // }
            var combined = _.chain(dimensions[somKey].filters)
            .values()
            .flatten()
            .uniq( function(f) { return f.i + "|" + f.j; } )
            .value();

            if( _.isNaN( d.x ) || _.isNaN( d.y ) ) {
              // var retval = _.any( combined, function(h) {
              //   return ( (h.i === (d.y-1) ) && (h.j === (d.x-1) ) );
              // });
              console.log("!! nan encountered");
              return false;
            }

            return _.any( combined, function(h) {
              return ( (h.i === (d.y-1) ) && (h.j === (d.x-1) ) );
            });

          });
        }
        $rootScope.$emit('dimension:SOMFilter');
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
          return p;
        };

        var reduceRemove = function (p, v) {
          p.counts[v.dataset] = p.counts[v.dataset] - 1;
          p.counts.total = p.counts.total - 1;
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
          p.counts.total = 0;
          return p;
        };

        return dimensionGroup.reduce(reduceAdd, reduceRemove, reduceInitial);
      };

      this.getReducedGroupHistoDistributions = function (dimensionGroup) {
        var SOMService = $injector.get('SOMService');
        var totalBmus = SOMService.getBMUs();
        var circleFilters = $injector.get('FilterService').getSOMFilters();
        var groupNames = _.map( circleFilters, function(cf) { return cf.id(); } );
        var circleFiltersById = _.object( groupNames, circleFilters );

        var inWhatCircles = function(sample) {
          var includedInCircle = function(sample, circleId) {
            var circleBMUs = circleFiltersById[circleId];
            // var circleBMUs = circleFilters[circleId];
            var bmu = sample.bmus;
            return _.any( circleBMUs.hexagons(), function(b) { return b.j === (bmu.x-1) && b.i === (bmu.y-1); } );
          };

          // should usually be just one name, but it's possible that in several
          var names = [];

          for( var i = 0; i < groupNames.length; ++i ) {
            var name = groupNames[i];
            if( includedInCircle(sample, name) ) {
              names.push(name);
              // return name;
            }
          }
          return names;
          // return '';
        };


        var reduceAdd = function (p, v) {
          _.each( groupNames, function(name) {
            var inGroups = inWhatCircles(v);
            // var inGroup = inWhatCircle(v);
            if( inGroups.length === 0 ) {
              // pass
            }
            else {
              v.groups = inGroups;
              _.each(inGroups, function(name) {
                p.counts[name] = p.counts[name] + 1;
              });
            }
          });
          p.counts.total = p.counts.total + 1;
          return p;
        };

        var reduceRemove = function (p, v) {
          if( _.isUndefined(v.groups) ) {
            // console.log("WARNING, GROUP NOT DEFINED", v, p);
          }
          var inGroups = inWhatCircles(v);
          _.each( inGroups, function(name) {
            p.counts[name] = p.counts[name] - 1;
          });
          p.counts.total = p.counts.total - 1;


          // var inGroups = v.groups;
          // // var inGroup = inWhatCircle(v);
          // _.each( inGroups, function(name) {
          //   p.counts[name] = p.counts[name] - 1;
          // });
          // error here!
          // p.counts[inGroup] = p.counts[inGroup] - 1;
          // p.counts.total = p.counts.total - 1;
          return p;
        };

        var reduceInitial = function () {
          var p = {
            counts: { total: 0 }
          };

          _.each(groupNames, function (name) {
            p.counts[name] = 0;
          });
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
          currSamples[key]['bmus'] = { x: samp.x, y: samp.y };
        });

        this.rebuildInstance();
        // Context: datasets 1&3 have samples used to plot histogram.
        // SOM is constructed of using datasets 1&2. As a result,
        // DSETs 1&3 should be active, DSET2 is dummy and has no samples.
        // Update by applying datasetfilter function
        // this.updateDatasetDimension();
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

      var createDatasetDimension = _.once( function () {
        dimensions['_dataset'] = crossfilterInst.dimension(function (s) {
          return s.dataset;
        });
      } );

      var createCrossfilterInst = _.once( function() {
        crossfilterInst = crossfilter(_.values(currSamples));
      });

      var createSOMDimension = _.once( function() {
        that.getSOMDimension();
      });

      // rebuilds crossfilter instance (called after adding new variable data)
      this.rebuildInstance = function () {
        console.log("Crossfilter instance rebuild called on", this.getName());
        crossfilterInst.remove( function() { return false; } );
        crossfilterInst.add(_.values(currSamples));
        $rootScope.$emit('dimension:crossfilter');
      };

      this.updateDatasetDimension = function () {
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

      this.copy = function() {
        return angular.copy( this.getSampleDimension().top(Infinity) );
      };

      this.clearFilters = function() {
        _.each( dimensions, function(val, key) {
          if( key == '_dataset' ) { val.filterAll(); return; }
          val.dimension.filterAll();
        });
      };

      this.restart = function(copy) {
        var getKey = function(samp) {
          return samp.dataset + "|" + samp.sampleid;
        };

        currSamples = {};
        _.each( copy, function(samp) {
          currSamples[ getKey(samp) ] = samp;
        });

        this.rebuildInstance();
        this.clearFilters();
      };

      // start by initializing crossfilter
      createCrossfilterInst();
      createDatasetDimension();
      createSOMDimension();

      // HELPER FUNCTIONS
      var _getSampleKey = function(dataset, id) {
        var separator = "|";
        return dataset + separator + id;
      };

    } // DimensionInstance


    return {
      create: function(name, primary) {
        var instance = new DimensionInstance(name);
        _instances[name] = {
          instance: instance,
          primary: primary || false
        };
        console.log("creating a new DimensionService, name is ", instance.getName());
        return instance;
      },
      get: function(name) {
        return _instances[name].instance;
      },
      getAll: function() {
        return _instances;
      },
      // compare: function(nameA, nameB) {
      //   var a = _instances[nameA],
      //   b = _instances[nameB];

      //   if( !a || !b) {
      //     throw "Invalid name(s) provided";
      //   }

      //   return _.isEqual( a.instance.getHash(), b.istance.getHash() );
      // },
      getPrimary: function() {
        return _.chain(_instances)
        .values()
        .filter( function(obj, ind, arr) { return obj.primary === true; } )
        .first()
        .value()
        .instance;
      },
      equal: function(a, b) {
        console.log( "EQUAL = ", _.isEqual( a.getHash(), b.getHash() ), a.getHash(), b.getHash() );
        if( _.isUndefined( b.getHash() ) ) {
          console.log("UNDEFINED");
        }
        return _.isEqual( a.getHash(), b.getHash() );
      },
      restart: function(restartInstance, sourceInstance) {
        var copy = sourceInstance.copy();
        restartInstance.restart(copy);
        console.log("after restart:", restartInstance.getSampleDimension().top(Infinity).length);
      }

    };

  }
  ]);