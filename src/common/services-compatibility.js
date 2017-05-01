angular.module('services.compatibility', [
  'ext.lodash',
  'ui.bootstrap' // don't change this to submodule!
])

.constant('COMPATIBILITY_TEMPLATE', 'compatibility-inform.tpl.html')

.service('CompatibilityService', function CompatibilityService($window, $q, $timeout, $uibModal, usSpinnerService, $templateCache, $rootScope, 
  COMPATIBILITY_TEMPLATE, 
  _) {

  var that = this;

  //Modernizr.on('datauri', function(result) {
  //  _datauri = result;
  //});

  this.features = {
    webworkers: {
      name: 'Web workers, transferable objects, creation from blobs',
      supported: function() {
        try {
          return $window.Modernizr.webworkers && $window.Modernizr.transferables && 
          ($window.Modernizr.blobconstructor || $window.Modernizr.bloburls);
        }
        catch(err) {
          return false;
        }
     }
    },

    datauris: {
      name: 'Export figures',
      supported: function() {
        try {
          //return  $window.Modernizr.datauri && $window.Modernizr.datauri.over32kb &&
          //return _datauri && 
          return $window.Modernizr.atobbtoa;
        }
        catch(err) {
          return false;
        }
     }
    },

    svg: {
      name: 'Scalable Vector Graphics (SVG)',
      supported: function() {
        try {
          return $window.Modernizr.svg && $window.Modernizr.svgclippaths && 
          $window.Modernizr.inlinesvg && $window.Modernizr.svgfilters;
        }
        catch(err) {
          return false;
        }
      }
    },

    canvas: {
      name: 'HTML5 Canvas and Canvas export',
      supported: function() {
        try {
          return $window.Modernizr.canvas && $window.Modernizr.canvastext && 
          $window.Modernizr.todataurlpng && $window.Modernizr.todataurljpeg;
        }
        catch(err) {
          return false;
        }
      }
    },

    flexbox: {
      name: 'Flexbox (menus)',
      supported: function() {
        try {
          return $window.Modernizr.flexbox && $window.Modernizr.flexwrap;
        }
        catch(err) {
          return false;
        }
      }
    },

    browser: {
      name: 'Modern Web browser (Detect outdated Internet Explorer versions)',
      supported: function() {
        try {
          var modernBrowser;
          // Detecting IE
          var oldIE;
          if ($('html').is('.ie6, .ie7, .ie8, .ie9, .ie10')) {
            modernBrowser = false;
          } else {
            modernBrowser = true;
          }
          return modernBrowser;
        }
        catch(err) {
          return false;
        }
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
        that.modal.close();
        usSpinnerService.spin('main');
        defer.resolve();
      };

      that.modal = $uibModal.open({
        scope: that.scope,
        templateUrl: COMPATIBILITY_TEMPLATE,
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
        usSpinnerService.stop('main');
        createModal();
      } else {
        defer.resolve('Compatible');
      }

    }, 10);

    return defer.promise;
  };

});