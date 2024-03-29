angular.module('services.dimensions', [
  'services.dataset',
  'services.variable',
  'ui.router.state',
  'ext.dc',
  'ext.lodash',
  'ext.mathjs'
])

.constant('DIMENSIONS_MAX_COUNT', 32)

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
.factory('DimensionService', function($injector, $q, constants, $rootScope, VariableService, DIMENSIONS_MAX_COUNT, dc, _) {

  var _instances = {};

  function DimensionInstance(name) {
      // dimensions created in this tool
      var dimensions = {};

      // for displaying active sample count
      var dispSamples = {};

      // initialized when samples arrive
      var crossfilterInst = null;

      // current samples, formatted for crossfilter
      var currSamples = {};

      var that = this;

      // instance name, should be unique
      var _name = name || '';

      this.getHash = function() {
        var isPrimary = $injector.get('DimensionService').getPrimary().getName() == that.getName(),
          isSecondary = $injector.get('DimensionService').getSecondary() == that;

        if (isPrimary) {
          return crossfilterInst.size() > 0 ? that.getSampleDimension().get().groupAll().value() : 0;
        } else if (isSecondary) {
          return crossfilterInst.size();
        }
      };

      this.getName = function() {
        return _name;
      };

      this.getSize = function() {
        return crossfilterInst.size();
      };

      // for primary
      this.activeVariables = function() {
        var ret = [];
        _.each(dimensions, function(dim) {
          if (dim.type() == 'normal') {
            // flattens the array, useful when scatterplots are present
            ret = ret.concat(dim.variable());
          }
        });
        return ret;
      };

      var getDimensionKey = function() {
        return _.chain(arguments)
        .toArray()
        .map(function(d) {
          if(_.isObject(d)) {
            return d.name();
          } else {
            return d;
          }
        })
        .value()
        .join("|");
      };

      // return one dimension. 
      this.getDimension = function(variable) {
        var creationFn = function(d) {
          if (_(d.variables).isUndefined()) {
            return constants.nanValue;
          } else {
            // a little checking to make sure NaN's are not returned
            var value = +d.variables[variable.name()];
            return _.isNaN(value) ? constants.nanValue : value;
          }
        };

        var key = getDimensionKey('normal', variable);
        if (dimensions[key]) {
          //pass, dimension already created
        } else {
          var destructFn = _.once(function() {
            delete dimensions[key];
          });
          dimensions[key] = 
          new CrossfilterDimension()
          .type('normal')
          .variable(variable)
          .injector($injector)
          .instance(crossfilterInst)
          .creationFunction(creationFn)
          .destructFunction(destructFn)
          .create();
        }
        return dimensions[key];
      };

      this.classHistogramDimension = function(classvar) {
        var creationFn = function(d) {
          return {
            classed: d.variables[classvar.name()],
            dataset: d.dataset,
            valueOf: function() {
              return _.isUndefined(this.classed) ? String(constants.nanValue) : this.classed + "|" + this.dataset;
            }
          };
        };

        var key = getDimensionKey('normal', classvar);
        if (dimensions[key]) {
          //pass
        } else {
          var destructFn = _.once(function() {
            delete dimensions[key];
          });
          dimensions[key] = 
          new CrossfilterDimension()
          .type('normal')
          .variable(classvar)
          .injector($injector)
          .instance(crossfilterInst)
          .creationFunction(creationFn)
          .destructFunction(destructFn)
          .create();          
        }
        return dimensions[key];
      };

      this.getVariableBMUDimension = function() {
        var creationFn = function(d) {
          return {
            bmu: d.bmus,
            valueOf: function() {
              var ret = _.isUndefined(d.bmus) ? String(constants.nanValue) + "|" + String(constants.nanValue) : d.bmus.x + "|" + d.bmus.y;
              return ret;
            }
          };
        };

        var key = getDimensionKey('bmu', null);
        if (dimensions[key]) {
          //pass
        } else {
          var destructFn = _.once(function() {
            delete dimensions[key];
          });
          dimensions[key] = 
          new CrossfilterDimension()
          .type('bmu')
          .variable(null)
          .injector($injector)
          .instance(crossfilterInst)
          .creationFunction(creationFn)
          .destructFunction(destructFn)
          .create();
        }
        return dimensions[key];

      };

      this.getSOMDimension = function() {

        var creationFn = function(d) {
          if (_.isEmpty(d['bmus'])) {
            return {
              x: NaN,
              y: NaN,
              valueOf: function() {
                return String(constants.nanValue);
              }
            };
          }
          return {
            x: d['bmus'].x,
            y: d['bmus'].y,
            valueOf: function() {
              // IMPORTANT!
              if (_.isUndefined(d.bmus.x) || _.isUndefined(d.bmus.y)) {
                return String(constants.nanValue);
              } else {
                return String(d.bmus.x) + "|" + String(d.bmus.y);
              }
            }
          };
        };

        var key = getDimensionKey('som', null);
        if (dimensions[key]) {
          //pass
        } else {
          var destructFn = _.once(function() {
            delete dimensions[key];
          });
          dimensions[key] = 
          new CrossfilterDimension()
          .type('som')
          .variable(null)
          .injector($injector)
          .instance(crossfilterInst)
          .creationFunction(creationFn)
          .destructFunction(destructFn)
          .sticky(true)
          .create();
        }
        return dimensions[key];

      };

      this.updateSOMFilter = function(circleId, content) {
        var key = getDimensionKey('som', null),
          dimension = dimensions[key] || that.getSOMDimension();

        var filterFn = function(d) {
          var combined = _.chain(dimensions[key].hexagons())
            .values()
            .flatten(true)
            .uniq(function(f) {
              return f.i + "|" + f.j;
            })
            .value();

          if (_.isNaN(d.x) || _.isNaN(d.y)) {
            return false;
          }

          return _.any(combined, function(h) {
            return ((h.i === d.y) && (h.j === d.x));
          });

        };

        dimension.filter(filterFn).hexagons(circleId, content);

      };

      this.getDatasetDimension = function() {
        var key = getDimensionKey('dataset', null);
        var creationFn = function(s) {
          return s.dataset;
        };

        if (dimensions[key]) {
          //pass
        } else {
          var destructFn = _.once(function() {
            delete dimensions[key];
          });
          dimensions[key] = 
          new CrossfilterDimension()
          .type('dataset')
          .variable(null)
          .injector($injector)
          .instance(crossfilterInst)
          .creationFunction(creationFn)
          .destructFunction(destructFn)
          .sticky(true)
          .create();
        }
        return dimensions[key];
      };

      this.updateDatasetDimension = function() {
        var DatasetFactory = $injector.get('DatasetFactory');
        var activeSets = DatasetFactory.activeSets();

        var filterFunction = function(dsetName) {
          return _.any(activeSets, function(set) {
            return set.name() === dsetName;
          });
        };

        that.getDatasetDimension().filter(filterFunction);
        $rootScope.$emit('dimension:dataset');
      };

      this.getDerivedDimension = function() {
        var key = getDimensionKey('normal', null);
        var creationFn = function(d) {
          return !_.isUndefined(d.originalDataset);
        };

        if (dimensions[key]) {
          //pass
        } else {
          var destructFn = _.once(function() {
            delete dimensions[key];
          });
          dimensions[key] = 
          new CrossfilterDimension()
          .type('normal')
          .variable(null)
          .injector($injector)
          .instance(crossfilterInst)
          .creationFunction(creationFn)
          .destructFunction(destructFn)
          .sticky(false)
          .create();
        }
        return dimensions[key];
      };

      this.getSampleDimension = function() {
        var key = getDimensionKey('samples', null);
        var creationFn = function(d) {
          return d.dataset + "|" + d.sampleid;
        };

        if (dimensions[key]) {
          //pass
        } else {
          var destructFn = _.once(function() {
            delete dimensions[key];
          });
          dimensions[key] = 
          new CrossfilterDimension()
          .type('samples')
          .variable(null)
          .injector($injector)
          .instance(crossfilterInst)
          .creationFunction(creationFn)
          .destructFunction(destructFn)
          .sticky(false)
          .create();
        }
        return dimensions[key];
      };


      this.getSampleInfo = function() {
        _updateSampleInfo();
        return dispSamples;

      };

      var _updateSampleInfo = function() {
        angular.copy({
            'active': crossfilterInst.groupAll().value()
          },
          dispSamples);
      };

      var sampleUpdates = ['dc.histogram.filter', 'dimension:dataset',
        'dimension:SOMFilter', 'dimension:crossfilter'
      ];

      _.each(sampleUpdates, function(name) {
        $rootScope.$on(name, function() {
          _updateSampleInfo();
        });
      });

      // call this to get combined dimension for x-y scatterplots
      this.getXYDimension = function(xVariable, yVariable) {
        var key = getDimensionKey('normal', xVariable, yVariable);
        var creationFn = function(d) {
          return {
            x: +d.variables[xVariable.name()],
            y: +d.variables[yVariable.name()],
            // override prototype function to ensure the object is naturally ordered
            valueOf: function() {
              // the value is not important, only the resulting ordering is. 
              // NaNs screw up ordering which will foil crossfilter instance!
              return (+this.x) + (+this.y) || constants.nanValue;
            }
          };
        };

        if (dimensions[key]) {
          //pass
        } else {
          var destructFn = _.once(function() {
            delete dimensions[key];
          });
          dimensions[key] = 
          new CrossfilterDimension()
          .type('normal')
          .variable([xVariable, yVariable])
          .injector($injector)
          .instance(crossfilterInst)
          .creationFunction(creationFn)
          .destructFunction(destructFn)
          .sticky(false)
          .create();

          new CrossfilterDimension('normal', [xVariable, yVariable], $injector, crossfilterInst, creationFn, destructFn);
        }
        return dimensions[key];
      };

      // form a grouping using a custom reduce function
      // NB! reduce functions will only affect the 
      // grouping object VALUE part! (not the key part)  
      this.getReduceScatterplot = function(dimensionGroup) {

        var reduceAdd = function(p, v) {
          if (_.isUndefined(p.counts[v.dataset])) {
            p.counts[v.dataset] = 0;
          }
          p.counts[v.dataset] = p.counts[v.dataset] + 1;
          return p;
        };

        var reduceRemove = function(p, v) {
          p.counts[v.dataset] = p.counts[v.dataset] - 1;
          return p;
        };

        var reduceInitial = function() {
          var DatasetFactory = $injector.get('DatasetFactory');
          var setNames = DatasetFactory.getSetNames();
          var p = {
            counts: {}
          };

          _.each(setNames, function(name) {
            p.counts[name] = 0;
          });
          return p;
        };

        dimensionGroup.reduce({
          add: reduceAdd,
          remove: reduceRemove,
          initial: reduceInitial
        });
        return dimensionGroup;
      };

      this.getReducedGroupHisto = function(dimensionGroup) {
        var getKey = function(samp) {
          return [samp.originalDataset || samp.dataset, samp.sampleid].join("|");
        };

        function hasBeenAdded(key, samp, p) {
          var value = p.samples[key];
          return !_.isUndefined(value) && (value > 0);
        }

        function add(key, p) {
          var val = p.samples[key];
          p.samples[key] = _.isUndefined(val) ? 1 : ++val;
        }

        function remove(key, p) {
          p.samples[key] -= 1;
        }

        var reduceAdd = function(p, v) {
          p.counts[v.dataset] = p.counts[v.dataset] + 1;

          var key = getKey(v),
          added = hasBeenAdded(key, v, p);
          add(key, p);
          if(!added) {
            p.counts.total = p.counts.total + 1;
          }
          return p;
        };

        var reduceRemove = function(p, v) {
          p.counts[v.dataset] = p.counts[v.dataset] - 1;

          var key = getKey(v);
          remove(key, p);
          var sampsLeft = hasBeenAdded(key, v, p);
          if(!sampsLeft) {
            p.counts.total = p.counts.total - 1;
          }
          return p;
        };

        var reduceInitial = function() {
          var DatasetFactory = $injector.get('DatasetFactory');
          var setNames = DatasetFactory.getSetNames();
          var p = {
            counts: {},
            samples: {}
          };

          _.each(setNames, function(name) {
            p.counts[name] = 0;
          });
          p.counts.total = 0;
          return p;
        };
        dimensionGroup.reduce({
          add: reduceAdd,
          remove: reduceRemove,
          initial: reduceInitial
        });
        return dimensionGroup;
      };

      this.getReducedMean = function(dimensionGroup, variable) {
        var getKey = function(samp) {
          return [samp.originalDataset || samp.dataset, samp.sampleid].join("|");
        };

        function hasBeenAdded(key, samp, p) {
          var value = p.samples[key];
          return !_.isUndefined(value) && (value > 0);
        }

        function add(key, p) {
          var val = p.samples[key];
          p.samples[key] = _.isUndefined(val) ? 1 : ++val;
        }

        function remove(key, p) {
          p.samples[key] -= 1;
        }

        // see https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Decremental_algorithm
        var reduceAdd = function(p, v) {
          p.n = p.n + 1;
          var varValue = +v.variables[variable.name()];
          if (!_.isNaN(varValue)) {
            var key = getKey(v),
            added = hasBeenAdded(key, v, p);
            add(key, p);

            var delta = varValue - p.mean;
            if (delta === 0 || p.n === 0 || added) {
              return p;
            }
            p.mean = p.mean + delta / p.n;
          }
          return p;
        };

        var reduceRemove = function(p, v) {
          p.n = p.n - 1;
          var varValue = +v.variables[variable.name()];
          if (!_.isNaN(varValue)) { //_.isNumber(varValue) ) {
            var delta = varValue - p.mean;

            var key = getKey(v);
            remove(key, p);
            var sampsLeft = hasBeenAdded(key, v, p);

            if (delta === 0 || p.n === 0 || sampsLeft) {
              return p;
            }
            p.mean = p.mean - delta / p.n;
          }
          return p;
        };

        var reduceInitial = function() {
          var p = {
            samples: {},
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
        dimensionGroup.reduce({
          add: reduceAdd,
          remove: reduceRemove,
          initial: reduceInitial
        });
        return dimensionGroup;
      };

      this.getReducedDeduplicated = function(dimensionGroup) {
        var getKey = function(samp) {
          return [samp.originalDataset || samp.dataset, samp.sampleid].join("|");
        };

        function hasBeenAdded(key, samp, p) {
          var value = p.samples[key];
          return !_.isUndefined(value) && (value > 0);
        }

        function add(key, p) {
          var val = p.samples[key];
          p.samples[key] = _.isUndefined(val) ? 1 : ++val;
        }

        function remove(key, p) {
          p.samples[key] -= 1;
        }

        var reduceAdd = function(p, v) {
          var key = getKey(v),
          added = hasBeenAdded(key, v, p);
          add(key, p);
          if (added) {
            //pass
          } else {
            p.dedupCount += 1;
          }
          return p;
        };

        var reduceRemove = function(p, v) {
          var key = getKey(v);
          remove(key, p);
          var sampsLeft = hasBeenAdded(key, v, p);
          if(!sampsLeft) {
            // there are no datasets left that hold this sample ->
            // decrease total count
            p.dedupCount -= 1;
          }
          return p;
        };

        var reduceInitial = function() {
          var p = {
            samples: {},
            dedupCount: 0,
            valueOf: function() {
              return p.dedupCount;
            }
          };
          return p;
        };

        dimensionGroup.reduce({
          add: reduceAdd,
          remove: reduceRemove,
          initial: reduceInitial
        });
        return dimensionGroup;
      };

      this.getReducedSTD = function(dimensionGroup, variable) {
        var getKey = function(samp) {
          return [samp.originalDataset || samp.dataset, samp.sampleid].join("|");
        };

        function hasBeenAdded(key, samp, p) {
          var value = p.samples[key];
          return !_.isUndefined(value) && (value > 0);
        }

        function add(key, p) {
          var val = p.samples[key];
          p.samples[key] = _.isUndefined(val) ? 1 : ++val;
        }

        function remove(key, p) {
          p.samples[key] -= 1;
        }

        // see https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Decremental_algorithm
        var reduceAdd = function(p, v) {
          var obj = p,
          value = +v.variables[variable.name()],
          key = getKey(v),
          added = hasBeenAdded(key, v, p);
          add(key, p);
          if (_.isNaN(value) || added) {
            //pass
          } else {
            obj.n = obj.n + 1;
            var delta = value - obj.mean;
            obj.mean = obj.mean + delta / obj.n;
            obj.M2 = obj.M2 + delta * (value - obj.mean);
            add(key, p);
          }
          return p;
        };

        var reduceRemove = function(p, v) {
          var obj = p,
          value = +v.variables[variable.name()],
          key = getKey(v);
          remove(key, p);
          var sampsLeft = hasBeenAdded(key, v, p);
          if (_.isNaN(value) || obj.n < 2 || sampsLeft) {
            //pass
          } else {
            obj.n = obj.n - 1;
            var delta = value - obj.mean;
            obj.mean = obj.mean - delta / obj.n;
            obj.M2 = obj.M2 - delta * (value - obj.mean);
          }
          return p;
        };

        var reduceInitial = function() {
          var p = {
            samples: {}
          };
          var obj = p;
          obj.n = 0;
          obj.mean = 0;
          obj.M2 = 0;
          obj.valueOf = function() {
            var variance = (obj.n < 2) ? 0 : obj.M2 / (obj.n - 1),
              stddev = Math.sqrt(variance);
            return {
              variance: variance,
              stddev: stddev,
              mean: obj.mean
            };
          };
          console.log("initial");
          return p;
        };

        dimensionGroup.reduce({
          add: reduceAdd,
          remove: reduceRemove,
          initial: reduceInitial
        });
        return dimensionGroup;
      };

      this.getReducedBoxplot = function(dimensionGroup, variable) {
        var reduceAdd = function(p, v) {
          var variableVal = +v.variables[variable.name()];
          if (_.isNaN(variableVal) || variableVal == constants.nanValue) {
            // pass
          } else {
            p.splice(d3.bisectLeft(p, variableVal), 0, variableVal);
          }
          return p;
        };

        var reduceRemove = function(p, v) {
          var variableVal = +v.variables[variable.name()];
          if (_.isNaN(variableVal) || variableVal == constants.nanValue) {
            // pass
          } else {
            p.splice(_.indexOf(p, variableVal, true), 1);
          }
          return p;
        };

        var reduceInitial = function() {
          var p = [];
          return p;
        };
        dimensionGroup.reduce({
          add: reduceAdd,
          remove: reduceRemove,
          initial: reduceInitial
        });
        return dimensionGroup;
      };


      this.getReducedBoxplotBMU = function(dimensionGroup, variable) {
        var getKey = function(samp) {
          return [samp.originalDataset || samp.dataset, samp.sampleid].join("|");
        };

        function hasBeenAdded(key, samp, p) {
          var value = p.samples[key];
          return !_.isUndefined(value) && (value > 0);
        }

        function add(key, p) {
          var val = p.samples[key];
          p.samples[key] = _.isUndefined(val) ? 1 : ++val;
        }

        function remove(key, p) {
          p.samples[key] -= 1;
        }

        var bmuStrId = function(bmu) {
          if (!bmu || !bmu.x || !bmu.y) {
            return constants.nanValue + "|" + constants.nanValue;
          }
          return bmu.x + "|" + bmu.y;
        };

        var reduceAdd = function(p, v) {
          if (_.isEmpty(v.bmus) || _.isUndefined(v.bmus)) {
            return p;
          }
          var variableVal = +v.variables[variable.name()];
          if (_.isNaN(variableVal) || constants.nanValue == variableVal) {
            // pass
          } else {
            var key = getKey(v),
            added = hasBeenAdded(key, v, p);
            add(key, p);
            if (added) {
              //pass
            } else {
              // add, don't be confused by the splice fn
              p.values.splice(d3.bisectLeft(p, variableVal), 0, variableVal);
            }
          }
          return p;
        };

        var reduceRemove = function(p, v) {
          // typically when service is restarted and bmu's have not yet
          // been received (som computation pending)
          if (_.isEmpty(v.bmus) || _.isUndefined(v.bmus)) {
            return p;
          }
          var variableVal = +v.variables[variable.name()];
          if (_.isNaN(variableVal) || variableVal == constants.nanValue) {
            // pass
          } 
          else {
            var key = getKey(v);
            remove(key, p);
            var sampsLeft = hasBeenAdded(key, v, p);
            if(!sampsLeft) {
              p.values.splice(_.indexOf(p, variableVal, true), 1);
            }
          }
          return p;
        };

        var reduceInitial = function() {
          var p = {
            samples: {},
            values: []
          };
          return p;
        };

        dimensionGroup.reduce({
          add: reduceAdd,
          remove: reduceRemove,
          initial: reduceInitial
        });
        return dimensionGroup;
      };



      this.getReducedGroupHistoDistributions = function(dimensionGroup, variable) {
        var getKey = function(samp) {
          return [samp.originalDataset || samp.dataset, samp.sampleid].join("|");
        };

        function hasBeenAdded(key, samp, p) {
          var value = p.samples[key];
          return !_.isUndefined(value) && (value > 0);
        }

        function add(key, p) {
          var val = p.samples[key];
          p.samples[key] = _.isUndefined(val) ? 1 : ++val;
        }

        function remove(key, p) {
          p.samples[key] -= 1;
        }

        var bmuStrId = function(bmu) {
          if (!bmu || !bmu.x || !bmu.y) {
            return constants.nanValue + "|" + constants.nanValue;
          }
          return bmu.x + "|" + bmu.y;
        };

        var reduceAdd = function(p, v) {
          if (_.isEmpty(v.bmus) || _.isUndefined(v.bmus)) {
            return p;
          }
          var variableVal = +v.variables[variable.name()];
          if (_.isNaN(variableVal)) {
            // pass
          } else {
            var bmuId = bmuStrId(v.bmus);
            if (!p.counts[bmuId]) {
              p.counts[bmuId] = {
                bmu: v.bmus,
                count: 0
              };
            }
            var key = getKey(v),
            added = hasBeenAdded(key, v, p);
            add(key, p);
            if (added) {
              //pass
            } else {
              p.counts[bmuId].count = p.counts[bmuId].count + 1;
            }
          }
          // p.counts.total = p.counts.total + 1;
          return p;
        };

        var reduceRemove = function(p, v) {
          // typically when service is restarted and bmu's have not yet
          // been received (som computation pending)
          if (_.isEmpty(v.bmus) || _.isUndefined(v.bmus)) {
            return p;
          }
          var variableVal = +v.variables[variable.name()];
          if (_.isNaN(variableVal)) {
            // pass
          } else {
            var bmuId = bmuStrId(v.bmus);
            var key = getKey(v);
            remove(key, p);
            var sampsLeft = hasBeenAdded(key, v, p);
            if (!_.isUndefined(p.counts[bmuId]) && !sampsLeft) {
              p.counts[bmuId].count = p.counts[bmuId].count - 1;
            }
          }
          // p.counts.total = p.counts.total - 1;
          return p;
        };

        var reduceInitial = function() {
          var p = {
            counts: {
              // total: 0
            },
            samples: {}
          };
          return p;
        };

        dimensionGroup.reduce({
          add: reduceAdd,
          remove: reduceRemove,
          initial: reduceInitial
        });
        return dimensionGroup;
      };



      // adds BMU information for each sample in SOM
      this.addBMUs = function(bmuSamples) {
        _.each(bmuSamples, function(samp) {
          var key = _getSampleKey(samp.sample.dataset, samp.sample.sampleid);
          if (_.isUndefined(currSamples[key])) {
            currSamples[key] = {};

            // add dataset and sampleid fields
            angular.extend(currSamples[key], samp.sample);
          }
          if (_.isUndefined(currSamples[key]['bmus'])) {
            currSamples[key]['bmus'] = {};
          }
          // add bmu info
          currSamples[key]['bmus'] = {
            x: samp.x,
            y: samp.y
          };
        });

        this.rebuildInstance();
        // Context: datasets 1&3 have samples used to plot histogram.
        // SOM is constructed of using datasets 1&2. As a result,
        // DSETs 1&3 should be active, DSET2 is dummy and has no samples.
        // Update by applying datasetfilter function
        // this.updateDatasetDimension();
      };

      this.removeVariableData = function(config) {
        var dataRemoved = false,
          sampleKey;

        _.each(config.samples, function(samp, id) {
          sampleKey = _getSampleKey(samp.dataset, samp.sampleid);
          if (!_.isUndefined(currSamples[sampleKey])) {
            delete currSamples[sampleKey];
            dataRemoved = true;
          }
        });
        return dataRemoved;
      };

      this.removeCustomVariable = function(variable) {
        var name = variable.name(), samp;
        for(var sampid in currSamples) {
          samp = currSamples[sampid];
          if(samp.variables[name]) {
            delete samp.variables[name];
          }
        }
      };

      // receives new variable data. The function is called once for each dataset
      // receiving data, and therefore the additions have to operate on a dataset-basis
      this.addVariableData = function(config) {
        var addSamples,
          samples = config.samples.all;
        // workaround: for secondary, don't add samples not in your scope:
        if (_service.getPrimary() !== that && config.bypassLimit === true && crossfilterInst.size() > 0) {
          addSamples = _.filter(samples, function(s) {
            var id = _getSampleKey(s.dataset, s.sampleid);
            return _.isUndefined(currSamples[id]) ? false : true;
          });
        } else {
          addSamples = samples;
        }

        var dataWasAdded = false,
          newVariables = config.variables.added,
          currentDatasets = _getCurrentDatasets(),
          newDatasets = _.difference([config.dataset.name()], currentDatasets),
          forcedUpdate = !_.isUndefined(config.force) && config.force;

        if (_.isEmpty(newVariables) && _.isEmpty(newDatasets) && !forcedUpdate) {
          // nothing new to add
        } else {
          // something new to process:
          dataWasAdded = true;
          _.each(addSamples, function(samp) {

            var key = _getSampleKey(samp.dataset, samp.sampleid);

            if (_.isUndefined(currSamples[key])) {
              // sample has not been previously seen
              currSamples[key] = samp;
              _.defaults(currSamples[key], {
                'bmus': {}
              });
            } else {
              if (_.isUndefined(currSamples[key].variables)) {
                // for some reason the variables is empty (unlikely)
                currSamples[key].variables = {};
              }
              _.extend(currSamples[key].variables, samp.variables);
            }
          });
        }
        return dataWasAdded;
      };

      var createCrossfilterInst = _.once(function() {
        crossfilterInst = crossfilter(_.values(currSamples));
      });

      var createDatasetDimension = _.once(function() {
        that.getDatasetDimension();
      });

      var createSampleDimension = _.once(function() {
        that.getSampleDimension();
      });

      var createSOMDimension = _.once(function() {
        that.getSOMDimension();
      });

      // rebuilds crossfilter instance (called after adding new variable data)
      this.rebuildInstance = function() {
        var addFilterFunctions = function() {
          _.chain(dimensions)
            .values()
            .each(function(dim) {
              var oldFilterFn = dim.oldFilter();
              if (!_.isNull(oldFilterFn)) {
                dim.filter(oldFilterFn);
              }
            })
            .value();
        };

        var addHistogramFilters = function() {
          if (_service.getPrimary() !== that) {
            // interactive histograms are only in primary
            return;
          }
          _.each(dc.chartRegistry.list(constants.groups.histogram.interactive), function(chart) {
            var oldFilters = chart.filters();
            chart.filter(null);
            _.each(oldFilters, function(filter) {
              chart.filter(filter);
            });
          });
        };


        // with vanilla crossfilter
        console.log("Crossfilter instance rebuild called on", this.getName());
        // this.clearFilters();
        // crossfilterInst.remove();
        // crossfilterInst.add(_.values(currSamples));
        // addFilterFunctions();
        // addHistogramFilters();

        // with forked crossfilter:
        crossfilterInst.remove(function() {
          return false;
        });
        crossfilterInst.add(_.values(currSamples));
        // $injector.get('WindowHandler').reRenderVisible({ compute: true });
      };

      this.getDimensions = function() {
        return dimensions;
      };

      this.availableDimensionsCount = function() {
        var currentNo = _.chain(dimensions).keys().value().length;
        return DIMENSIONS_MAX_COUNT - currentNo;
      };

      this.copy = function() {
        // careful: you're not supposed to modify these...
        return this.getSampleDimension().get().top(Infinity);
        // return angular.copy( this.getSampleDimension().get().top(Infinity) );
      };

      this.clearFilters = function() {
        _.each(dimensions, function(dimension, id) {
          dimension.filterAll();
        });
      };

      function _getCurrentKeys() {
        return _.chain(currSamples)
          .sample(4)
          .values()
          .map(function(d) {
            return _.keys(d.variables);
          })
          .flatten()
          .uniq()
          .value();
      }

      function _getCurrentDatasets() {
        return _.chain(currSamples)
          .sample(4)
          .values()
          .map(function(d) {
            return d.dataset;
          })
          .flatten()
          .uniq()
          .value();
      }

      this.restart = function(primarySamples) {
        var getKey = function(samp) {
          return samp.dataset + "|" + samp.sampleid;
        };

        var clearBMUFilter = function() {
          that.getSOMDimension().filterAll();
        };

        function finish(primarySamples, samplesLookup) {
          _.each(primarySamples, function(samp) {
            var key = getKey(samp);
            if (samplesLookup) {
              currSamples[key] = samplesLookup[key];
            } else {
              currSamples[key] = samp;
            }
          });
          that.rebuildInstance();
          that.clearFilters();
          // clearBMUFilter();
        }

        var defer = $q.defer();

        // what keys have been used in the past?
        VariableService.getVariables(_getCurrentKeys()).then(function(currentVariables) {
          if (_.isEmpty(currentVariables)) {
            // first transition to som, nothing pre-existing
            finish(primarySamples);
            defer.resolve();
          } else {
            var DatasetFactory = $injector.get('DatasetFactory');
            DatasetFactory.getVariableData(currentVariables, null, {
                addToDimensionService: false,
                getRawData: true
              })
              .then(function succFn(result) {
                currSamples = {};
                finish(primarySamples, result.samples);
                defer.resolve();
              }, function errFn(result) {
                console.log("DatasetFactory variable fetch failed!");
                defer.reject();
              });
          }
        });


        return defer.promise;
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
        .filter(function(obj, ind, arr) {
          return obj.primary === true;
        })
        .first()
        .value()
        .instance;
    },
    getSecondary: function() {
      return _service.get('vis.som');
    },
    equal: function(a, b) {
      return _.isEqual(a.getHash(), b.getHash());
    },
    restart: function(restartInstance, sourceInstance) {
      var copy = sourceInstance.copy();
      return restartInstance.restart(copy);
    }

  };
  return _service;

});