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

        if( $injector.get('DimensionService').getPrimary().getName() == that.getName() ) {
          return crossfilterInst.size() > 0 ? that.getSampleDimension().groupAll().value() : 0;
        }
        else {
          return crossfilterInst.size();
        }
      };

      this.getName = function() {
        return _name;
      };

      this.getSize = function() {
        return crossfilterInst.size();
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
              dimension: retDimension,
              filterFn: null
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
        return dimensions['_dataset'].dimension;
      };

      this.getVariableBMUDimension = function() {
        var key = "variable|" + "bmu";
        if( _.isUndefined( dimensions[key] ) ) {
          dimensions[key] = {
            count: 1,
            dimension: crossfilterInst.dimension( function(d) {
              return {
                bmu: d.bmus,
                valueOf: function() {
                  var ret = _.isUndefined(d.bmus) ? String(constants.nanValue) + "|" + String(constants.nanValue) : d.bmus.x + "|" + d.bmus.y;
                  return ret;
                }
              };
            })
          };
        }
        else {
          ++dimensions[key].count;
        }
        return dimensions[key].dimension;
      };      

      this.getSOMDimension = function() {
        var somKey = "som";// + somId;
        if( _.isUndefined( dimensions[somKey] ) ) {
          dimensions[somKey] = {
            count: 1,
            filters: {},
            filterFn: null,
            dimension: crossfilterInst.dimension( function(d) { 
              if( _.isEmpty( d['bmus'] ) ) {
                return {
                  x: NaN,
                  y: NaN,
                  valueOf: function() { return String(constants.nanValue); }
                };
              }
              return {
                x: d['bmus'].x,
                y: d['bmus'].y,
                valueOf: function() {
                  // IMPORTANT!
                  return ( d['bmus'].x || String(constants.nanValue) ) + "|" + ( d['bmus'].y || String(constants.nanValue) );
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
          dimensions[somKey].filterFn = null;
          return true;
        }
        return false;
      };

      this.updateSOMFilter = function(circleId, content) {
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
          var filterFunction = function(d) {
            var combined = _.chain(dimensions[somKey].filters)
            .values()
            .flatten()
            .uniq( function(f) { return f.i + "|" + f.j; } )
            .value();

            if( _.isNaN( d.x ) || _.isNaN( d.y ) ) {
              return false;
            }

            return _.any( combined, function(h) {
              return ( (h.i === (d.y-1) ) && (h.j === (d.x-1) ) );
            });

          };

          dimensions[somKey].dimension.filterFn = filterFunction;
          dimensions[somKey].dimension.filterFunction( filterFunction );
        }
        $rootScope.$emit('dimension:SOMFilter');
      };

      this.getSampleDimension = function() {
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
          // p.dataset = v.dataset;
          // p.sampleid = v.sampleid;
          return p;
        };

        var reduceRemove = function (p, v) {
          p.counts[v.dataset] = p.counts[v.dataset] - 1;
          // p.dataset = v.dataset;
          // p.sampleid = v.sampleid;
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

      // this.getReducedBMUinCircle = function(dimensionGroup) {
      //   var getId = function(v) {
      //     return v.dataset + "|" + v.sampleid;
      //   };
      //   var circleFilters = $injector.get('FilterService').getSOMFilters();

      //   var getBMUstr = function(bmu) {
      //     return bmu.x + "|" + bmu.y;
      //   };

      //   var reduceAdd = function (p, v) {
      //     console.log("bmu-add");
      //     p.samples[getId(v)] = true;
      //     var bmuId = getBMUstr(v.bmus);
      //     if( _.isUndefined(p.bmus[bmuId]) ) {
      //       p.bmus[bmuId] = [];
      //       // determine in which circle(s) the bmu belongs to:
      //       _.each( circleFilters, function(circle) {
      //         if( circle.contains(v.bmus) ) {
      //           console.log( "hex = ", JSON.stringify(v.bmus), "belongs to circle = ", circle.id() );
      //           p.bmus[bmuId].push( circle.id() );
      //         }
      //       });

      //     }
      //     return p;
      //   };

      //   var reduceRemove = function (p, v) {
      //     console.log("bmu-remove");          
      //     p.samples[getId(v)] = false;
      //     return p;
      //   };

      //   var reduceInitial = function () {
      //     var p = {
      //       samples: {},
      //       bmus: {}
      //     };
      //     return p;
      //   };
      //   return dimensionGroup.reduce(reduceAdd, reduceRemove, reduceInitial);
      // };

      this.getReducedMean = function(dimensionGroup, variable) {
        // see https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Decremental_algorithm
        var reduceAdd = function (p, v) {
          p.n = p.n + 1;
          var varValue = +v.variables[variable];
          if( !_.isNaN(varValue) ) {
            var delta = varValue - p.mean;
            if( delta === 0 || p.n === 0 ) { return p; }
            p.mean = p.mean + delta/p.n;
          }
          return p;
        };

        var reduceRemove = function (p, v) {
          p.n = p.n - 1;
          var varValue = +v.variables[variable];
          if( !_.isNaN(varValue) ) { //_.isNumber(varValue) ) {
            var delta = varValue - p.mean;
            if( delta === 0 || p.n === 0 ) { return p; }            
            p.mean = p.mean - delta/p.n;
          }
          return p;
        };

        var reduceInitial = function () {
          var p = {
            n: 0,
            mean: 0,
            valueOf: function() {
              var p = this;
              return {
                mean: p.mean
              };
            }
          };
          return p;
        };
        return dimensionGroup.reduce(reduceAdd, reduceRemove, reduceInitial);
      };



      this.getReducedSTD = function(dimensionGroup, variable) {
        // see https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Decremental_algorithm
        var reduceAdd = function (p, v) {
          var obj = p;
          obj.n = obj.n + 1;
          var value = +v.variables[variable];
          if( _.isNaN(value) ) {
            //pass
          } else {
            var oldM2 = obj.M2;
            var delta = value - obj.mean;
            obj.mean = obj.mean + delta/obj.n;
            obj.M2 = obj.M2 + delta*(value - obj.mean);
            if( obj.M2 < 0 ) {
              // console.log("passed to negative");
            }
            // if( obj.M2 <= 0 ) {
            //   console.log("problem");
            // }
          }
          // console.log("--> ADD", JSON.stringify(p), "V = ", v);
          return p;
        };

        var reduceRemove = function (p, v) {
          var obj = p;
          obj.n = obj.n - 1;
          if( obj.n === 0 ) {
            obj.mean = 0;
            obj.M2 = 0;
          }
          else {
            var value = +v.variables[variable];
            if( _.isNaN(value) ) {
              //pass
            } else {
              var oldM2 = obj.M2;
              var delta = value - obj.mean;
              obj.mean = obj.mean - delta/obj.n;
              obj.M2 = obj.M2 - delta*(value - obj.mean);
              if( obj.M2 < 0 ) {
                // console.log("passed to negative");
              }

            }
          }
          // console.log("--> REMOVE", JSON.stringify(p), "V = ", v);
          return p;
        };

        var reduceInitial = function () {
          var p = {};
          var obj = p;
          obj.n = 0;
          obj.mean = 0;
          obj.M2 = 0;
          obj.valueOf = function() {
            var variance = obj.M2 / (obj.n-1),
            stddev = Math.sqrt(variance);
            return {
              variance: variance,
              stddev: stddev,
              mean: obj.mean
            };
          };
          return p;
        };
        return dimensionGroup.reduce(reduceAdd, reduceRemove, reduceInitial);
      };


      this.getReducedSTDMultiple = function(dimensionGroup, variables) {
        // see https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Decremental_algorithm
        var reduceAdd = function (p, v) {
          for(var i = 0; i < variables.length; ++i) {
            var variable = variables[i];
            var obj = p[variable];
            obj.n = obj.n + 1;
            var value = +v.variables[variable];
            if( _.isNaN(value) ) {
              //pass
            } else {
              var delta = value - obj.mean;
              obj.mean = obj.mean + delta/obj.n;
              obj.M2 = obj.M2 + delta*(value - obj.mean);
            }
          }
          console.log("--> ADD", JSON.stringify(p), "V = ", v);          
          return p;
        };

        var reduceRemove = function (p, v) {
          for(var i = 0; i < variables.length; ++i) {
            var variable = variables[i];
            var obj = p[variable];
            obj.n = obj.n - 1;
            if( obj.n === 0 ) {
              obj.mean = 0;
              obj.M2 = 0;
              continue;
            }
            var value = +v.variables[variable];
            if( _.isNaN(value) ) {
              //pass
            } else {
              var delta = value - obj.mean;
              obj.mean = obj.mean - delta/obj.n;
              obj.M2 = obj.M2 - delta*(value - obj.mean);
            }
          }
          console.log("--> REMOVE", JSON.stringify(p), "V = ", v);
          return p;
        };

        var reduceInitial = function () {
          var p = {};

          _.each(variables, function(variable) {
            var obj = p[variable] = {};
            obj.n = 0;
            obj.mean = 0;
            obj.M2 = 0;
            obj.valueOf = function() {
              var variance = obj.M2 / (obj.n-1),
              stddev = Math.sqrt(variance);
              return {
                variance: variance,
                stddev: stddev,
                mean: obj.mean
              };
            };
          });
          return p;
        };
        return dimensionGroup.reduce(reduceAdd, reduceRemove, reduceInitial);
      };

      this.getReducedGroupHistoDistributions = function (dimensionGroup, variable) {

        var bmuStrId = function(bmu) {
          if( !bmu || !bmu.x || !bmu.y ) { return constants.nanValue + "|" + constants.nanValue; }
          return bmu.x + "|" + bmu.y;
        };

        var reduceAdd = function(p, v) {
          if( _.isEmpty(v.bmus) || _.isUndefined(v.bmus) ) {
            return p;
          }
          var variableVal = +v.variables[variable];
          if( _.isNaN(variableVal) ) {
            // pass
          }
          else {
            var bmuId = bmuStrId(v.bmus);
            if( bmuId == '-1000|-1000' ) {
              console.log("here");
            }
            if( !p.counts[bmuId] ) { p.counts[bmuId] = { bmu: v.bmus, count: 0 }; }
            p.counts[bmuId].count = p.counts[bmuId].count + 1;
          }
          p.counts.total = p.counts.total + 1;
          // console.log("--> ADD, P = ", JSON.stringify(p));
          return p;
        };

        var reduceRemove = function(p, v) {
          // typically when service is restarted and bmu's have not yet
          // been received (som computation pending)
          if( _.isEmpty(v.bmus) || _.isUndefined(v.bmus) ) {
            return p;
          }
          var variableVal = +v.variables[variable];
          if( _.isNaN(variableVal) ) {
            // pass
          }
          else {
            var bmuId = bmuStrId(v.bmus);
            if( !_.isUndefined(p.counts[bmuId]) ) {
              // PROBLEM SPOT!
              p.counts[bmuId].count = p.counts[bmuId].count - 1;
            }
          } 
          p.counts.total = p.counts.total - 1;
          // console.log("--> REMOVE, P = ", JSON.stringify(p));
          return p;         
        };

        var reduceInitial = function () {
          var p = {
            counts: { total: 0 }
          };
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

        var addSamples;

        // workaround: for secondary, don't add samples not in your scope:
        if( _service.getPrimary() !== that ) {
          addSamples = _.filter(samples, function(s) { 
            var id = _getSampleKey(s.dataset, s.sampleid);
            return currSamples[id];
          });
        }
        else {
          addSamples = samples;
        }

        var dataWasAdded = true;

        usedVariables[variable] = true;

        _.every(addSamples, function (samp) {

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
        dimensions['_dataset'] = {
          dimension: crossfilterInst.dimension(function(s) {
            return s.dataset;
          }),
          filterFn: null
        };
      });

      var createSampleDimension = _.once( function() {
        dimensions['_samples'] = {
          dimension: crossfilterInst.dimension( function(d) { return d.dataset + "|" + d.sampleid; } ),
          filterFn: null
        };
      });

      var createCrossfilterInst = _.once( function() {
        crossfilterInst = crossfilter(_.values(currSamples));
      });

      var createSOMDimension = _.once( function() {
        that.getSOMDimension();
      });

      // rebuilds crossfilter instance (called after adding new variable data)
      this.rebuildInstance = function () {
        // see http://stackoverflow.com/a/23520094/1467417 for principle
        var removeFilters = function() {
          _.chain(dimensions)
          .values()
          .each(function(obj) {
            // remove current filter
            obj.dimension.filter(null);
          })
          .value();
        };

        var addFilterFunctions = function() {
          _.chain(dimensions)
          .values()
          .each(function(obj) {
            var filterFn = obj.filterFn;
            if( !_.isNull(filterFn) ) {
              obj.dimension.filter(filterFn);
            }
          })
          .value();
        };

        var addHistogramFilters = function() {
          _.each(dc.chartRegistry.list(constants.groups.histogram.interactive), function(chart) {
            var oldFilters = chart.filters();
            chart.filter(null);
            _.each(oldFilters, function(filter) {
              chart.filter(filter);
            });
          });
        };


        console.log("Crossfilter instance rebuild called on", this.getName());
        // removeFilters();
        // crossfilterInst.remove();//( function() { return false; } );
        // crossfilterInst.add(_.values(currSamples));
        // // $rootScope.$emit('dimension:crossfilter');
        // addFilterFunctions();
        // addHistogramFilters();
        crossfilterInst.remove(function() { return false; });
        crossfilterInst.add(_.values(currSamples));
        $injector.get('WindowHandler').reRenderVisible({ compute: true });
      };

      this.updateDatasetDimension = function () {
        var DatasetFactory = $injector.get('DatasetFactory');
        var activeSets = DatasetFactory.activeSets();

        var filterFunction = function (dsetName) {
          return _.any(activeSets, function (set) { 
            return set.getName() === dsetName; 
          });
        };

        dimensions['_dataset'].filterFn = filterFunction;
        dimensions['_dataset'].dimension.filterFunction(filterFunction);
        $rootScope.$emit('dimension:dataset');
      };

      // this.deleteDimension = function(variable) {
      //   if( _.isUndefined( dimensions[variable] ) ) { return; }
      //   dimensions[variable].dispose();
      //   delete dimensions[variable];
      // };

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
        // return this.getSampleDimension().top(Infinity);
        return angular.copy( this.getSampleDimension().top(Infinity) );
      };

      this.clearFilters = function() {
        _.each( dimensions, function(val, key) {
          // if( key == '_dataset' ) { val.filterAll(); return; }
          val.dimension.filterAll();
          val.filterFn = null;
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
      createSampleDimension();
      createSOMDimension();

      // HELPER FUNCTIONS
      var _getSampleKey = function(dataset, id) {
        var separator = "|";
        return dataset + separator + id;
      };

    } // DimensionInstance


    var _service = {
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
      getPrimary: function() {
        return _.chain(_instances)
        .values()
        .filter( function(obj, ind, arr) { return obj.primary === true; } )
        .first()
        .value()
        .instance;
      },
      equal: function(a, b) {
        return _.isEqual( a.getHash(), b.getHash() );
      },
      restart: function(restartInstance, sourceInstance) {
        var copy = sourceInstance.copy();
        restartInstance.restart(copy);
      }

    };
    return _service;

  }
  ]);