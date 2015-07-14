angular.module('services.compatibility', [])

.service('CompatibilityService', ['$q', '$timeout', '$modal', '$rootScope',
  function CompatibilityService($q, $timeout, $modal, $rootScope) {

    var that = this;

    this.features = {
      websockets: {
        name: 'Websockets',
        supported: function() {
          return Modernizr.websockets;
        }
      },

      svg: {
        name: 'Scalable Vector Graphics (SVG)',
        supported: function() {
          return Modernizr.svg && Modernizr.svgclippaths && Modernizr.inlinesvg;
        }
      },

      canvas: {
        name: 'HTML5 Canvas',
        supported: function() {
          return Modernizr.canvas && Modernizr.canvastext;
        }
      },

      browser: {
        name: 'Modern Web browser (Detect outdated Internet Explorer versions)',
        supported: function() {
          var modernBrowser;
          // Detecting IE
          var oldIE;
          if ($('html').is('.ie6, .ie7, .ie8, .ie9')) {
              modernBrowser = false;
          }
          else {
              modernBrowser = true;
          }
          return modernBrowser;
        }
      }

    };

    this.getFeatures = function() {
      return that.features;
    };

    // how this function operates:
    // - this is called on 'vis' resolve
    // - if there are browser comp. issues, this function will open up a
    // modal instance. In the mean time, the 'vis' state will not be resolved
    // - after the modal has been closed, this function will resolve its promise
    // and the state loading will continue.
    this.browserCompatibility = function() {
      var defer = $q.defer();

      var createModal = function() {

        // isolated scope
        that.scope = $rootScope.$new(true);
        that.scope.features = that.features;
        that.scope.close = function() {
          that.modal.hide();
          defer.resolve();
        };

        that.modal = $modal({
          scope: that.scope, //$scope,
          contentTemplate: 'compatibility-inform.tpl.html',
          show: true,
          backdrop: 'static',
          keyboard: false,
          placement: 'center',
          animation: 'am-fade-and-scale'
        });
      };


      $timeout(function() {
        var _compatible = true;
        _.each(that.features, function(feat) {
          if (!feat.supported()) {
            _compatible = false;
          }
        });

        if (!_compatible) {
          createModal();
        } else {
          defer.resolve('Compatible');
        }

      }, 10);

      return defer.promise;
    };

  }
]);