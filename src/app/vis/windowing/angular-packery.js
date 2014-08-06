/*!
 * angular-packery
 * Forked from angular-masonry 
 * by Jussi Ekholm, github.com/amergin
 * License: MIT
 */
(function () {
  'use strict';
  angular.module('wu.packery', []).controller('PackeryCtrl', [
    '$scope',
    '$element',
    '$timeout',
    '$rootScope',
    function controller($scope, $element, $timeout, $rootScope) {

      this.drag = false;
      this.dragOptions = {};
      this.resize = false;
      this.resizeOptions = {};
      this.options = {};

      var bricks = {};
      var schedule = [];
      var destroyed = false;
      var self = this;
      var timeout = null;
      this.preserveOrder = false;
      this.loadImages = true;
      this.schedulePackeryOnce = function schedulePackeryOnce() {
        var args = arguments;
        var found = schedule.filter(function filterFn(item) {
            return item[0] === args[0];
          }).length > 0;
        if (!found) {
          this.schedulePackery.apply(null, arguments);
        }
      };
      // Make sure it's only executed once within a reasonable time-frame in
      // case multiple elements are removed or added at once.
      this.schedulePackery = function schedulePackery() {
        if (timeout) {
          $timeout.cancel(timeout);
        }
        schedule.push([].slice.call(arguments));
        timeout = $timeout(function runPackery() {
          if (destroyed) {
            return;
          }
          schedule.forEach(function scheduleForEach(args) {
            $element.packery.apply($element, args);
          });
          schedule = [];
        }, 30);

      };
      function defaultLoaded($element) {
        $element.addClass('loaded');
      }
      this.appendBrick = function appendBrick(element, id) {
        if (destroyed) {
          return;
        }
        function _append() {
          if (Object.keys(bricks).length === 0) {
            $element.packery('resize');
          }
          if (bricks[id] === undefined) {
            // Keep track of added elements.
            bricks[id] = true;
            defaultLoaded(element);

            $element.packery('appended', element, true);

            // add draggable
            if( self.drag ) {
              $element.packery('bindDraggabillyEvents', new Draggabilly(element[0], self.dragOptions));
            }

            // resizing of brick
            if( self.resize ) {
              var resizeObj = angular.extend( self.resizeOptions, {
                start: function(event, ui) {
                  if ($(event.target).hasClass( self.options.itemSelector.slice(1) ) ) {
                    $(event.target).css('z-index', 1000);
                  }
                },
                resize: function(event, ui) {
                  $element.packery('fit', event.target, ui.position.left, ui.position.top);
                },
                stop: function(event, ui) {
                  $(event.target).css('z-index', 'auto');
                  self.schedulePackeryOnce('layout');
                  //$scope.packery.layout();
                }
              });
              element.resizable(resizeObj);
            }

          }

          $timeout( function() {
            $rootScope.$emit('packery.added', element);
          });


        }
        function _layout() {
          // I wanted to make this dynamic but ran into huuuge memory leaks
          // that I couldn't fix. If you know how to dynamically add a
          // callback so one could say <packery loaded="callback($element)">
          // please submit a pull request!
          self.schedulePackeryOnce('layout');
        }

        $rootScope.$on('packery.layout', function() {
          self.schedulePackeryOnce('layout');
        });

        _append();
        _layout();

      };
      this.removeBrick = function removeBrick(id, element) {
        if (destroyed) {
          return;
        }
        delete bricks[id];
        $element.packery('remove', element);
        this.schedulePackeryOnce('layout');
      };
      this.destroy = function destroy() {
        destroyed = true;
        if ($element.data('packery')) {
          // Gently uninitialize if still present
          $element.packery('destroy');
        }
        $scope.$emit('packery.destroyed');
        bricks = [];
      };
      this.reload = function reload() {
        $element.packery();
        $scope.$emit('packery.reloaded');
      };
    }
  ]).directive('packery', function packeryDirective() {
    return {
      restrict: 'AE',
      scope: {},
      controller: 'PackeryCtrl',
      link: {
        pre: function preLink(scope, element, attrs, ctrl) {
          var attrOptions = scope.$eval(attrs.packery || attrs.packeryOptions);
          var options = angular.extend({
              itemSelector: attrs.itemSelector || '.packery-brick',
              columnWidth: parseInt(attrs.columnWidth, 10) || attrs.columnWidth
            }, attrOptions || {});
          element.packery(options);
          ctrl.options = options;

          if( Draggabilly && attrs.packeryDrag ) {
            var dragOptions = scope.$eval( attrs.packeryDrag );
            ctrl.dragOptions = angular.extend( ctrl.dragOptions, dragOptions || {});
            ctrl.drag = true;
          }
          if( $.ui && attrs.packeryResize ) {
            var resizeOptions = scope.$eval( attrs.packeryResize );
            ctrl.resizeOptions = angular.extend(ctrl.resizeOptions, resizeOptions || {});
            ctrl.resize = true;
          }

          var loadImages = scope.$eval(attrs.loadImages);
          ctrl.loadImages = loadImages !== false;
          var preserveOrder = scope.$eval(attrs.preserveOrder);
          ctrl.preserveOrder = preserveOrder !== false && attrs.preserveOrder !== undefined;
          scope.$emit('packery.created', element);
          scope.$on('$destroy', ctrl.destroy);
        }
      }
    };
  }).directive('packeryBrick', ['$compile', '$timeout', '$rootScope', function packeryBrickDirective($compile, $timeout, $rootScope) {
    return {
      restrict: 'AC',
      require: '^packery',
      scope: true,
      link: {
        pre: function preLink(scope, element, attrs, ctrl) {
          var id = scope.$id, index;
          ctrl.appendBrick(element, id);
          element.on('$destroy', function () {
            ctrl.removeBrick(id, element);
          });
          scope.$on('packery.reload', function () {
            ctrl.schedulePackeryOnce('reloadItems');
            ctrl.schedulePackeryOnce('layout');
          });
          scope.$watch('$index', function () {
            if (index !== undefined && index !== scope.$index) {
              ctrl.schedulePackeryOnce('reloadItems');
              ctrl.schedulePackeryOnce('layout');
            }
            index = scope.$index;
          });
        },
        post: function postLink(scope, element, attrs, ctrl) {
          $timeout( function() {
            var el = angular.element('<div/>')
            .addClass(scope.window.type)
            .addClass('figure');
            element.append(el);
            $compile(el)(scope);

          }, 650);
        }
      }
    };
  }]);
}());