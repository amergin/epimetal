var win = angular.module('plotter.vis.windowing', ['services.urlhandler', 'mgcrea.ngStrap.dropdown']);

// controller for Packery windowing system
win.controller('PackeryController', ['$scope', '$rootScope', '$timeout', function($scope, $rootScope, $timeout) {
  console.log("packery controller");
  $scope.$onRootScope('packery.add', function(event, config) { //selection, type, size, filter, pooled) {
    $scope.add( config ); //, type, size, filter, pooled);

    $rootScope.$emit('variable:add', config.type, config.variables);
  });

  $scope.$onRootScope('packery.layout', function() {
    console.log("packery layout triggered");
    $scope.packery.layout();
  });

  $scope.windows = [];
  $scope.windowRunningNumber = 0;

  // remove from grid
  $scope.remove = function(number, element) {
    $scope.windows = _.reject( $scope.windows, function(obj) { 
      return obj.number === number; 
    });
    // $scope.packery.remove( element[0] );
    // $scope.packery.layout();
  };

  // adds window to grid
  $scope.add = function(config) {
    var variablesCopy = {};
    angular.copy(config.variables, variablesCopy);

    var win = {
      number: ++$scope.windowRunningNumber
    };
    angular.extend(win, config);

    $scope.windows.push(win);
  };

}]);

// directive for Packery windowing system
win.directive('packery', [ function() {
  return {
    restrict: 'C',
    templateUrl : 'vis/windowing/packery.tpl.html',
    replace: true,
    controller: 'PackeryController',
    scope: {},
    link: function(scope, elm, attrs, controller) {


      console.log("postlink packery");
          // create a new empty grid system
          scope.packery = new Packery( elm[0], 
          {
          isResizeBound: true,
          // see https://github.com/metafizzy/packery/issues/7
          rowHeight: 400,
          itemSelector: '.window',
          gutter: '.gutter-sizer',
          columnWidth: 500
          // columnWidth: '.grid-sizer'
        } );

        }
      };

    }]);


// Directive for individual Window in Packery windowing system
win.directive('window', ['$compile', '$injector', '$timeout', function($compile, $injector, $timeout){
  return {
    scope: false,
    // must be within packery directive
    require: '^packery',
    restrict: 'C',
    controller: ['$scope', '$http', 'constants', 'DatasetFactory', '$q', function($scope, $http, constants, DatasetFactory, $q) {

      $scope.exportSVG = function(win) {
        var svg = $scope.element.find('svg')[0].cloneNode(true);
        setNameSpaceOnEl(svg);
        appendCSSRules(svg);
        var serializer = new XMLSerializer();
        var b64str = btoa(serializer.serializeToString(svg));
        var filename = win.type + "_of_" + (win.variables.x || win.variable) + "_on_" + 
        _.map( DatasetFactory.activeSets(), function(set) { return set.getName(); } ).join("_");

        var url = constants.export.svg;
        sendFile( b64str, url, filename );

        svg.remove();
      };


      var setNameSpaceOnEl = function(element) {
        element.setAttribute("version", "1.1");
        element.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        element.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      };

      var sendFile = function(b64, url, filename) {
        //create a hidden form that is submitted to get the file.
        var form = angular.element('<form/>')
        .attr('action', url)
        .attr('method', 'POST');
        //.attr('enctype', 'application/x-www-form-urlencoded');//'multipart/form-data'); 
        // action="' + constants.export.svg + '" method="POST"/>');
        var input = angular.element('<input/>')
        .attr('name', 'payload')
        .attr('value', b64 )
        .attr('type', 'hidden');
        var input2 = angular.element('<input/>')
        .attr('name', 'filename')
        .attr('type', 'text')
        .attr('value', filename)
        .attr('type', 'hidden');

        form.append(input);
        form.append(input2);
        $scope.element.append(form);
        form.submit();
        form.remove();
      };


      var appendCSSRules = function(dom) {
          var used = "";
          var sheets = document.styleSheets;
          for (var i = 0; i < sheets.length; i++) {
            var rules = sheets[i].cssRules;

            // don't loop angular rules!
            if( sheets[i].href == null ) { continue; }

            for (var j = 0; j < rules.length; j++) {
              var rule = rules[j];
              if (typeof(rule.style) != "undefined") {
                var elems = dom.querySelectorAll(rule.selectorText);
                if (elems.length > 0) {
                  used += rule.selectorText + " { " + rule.style.cssText + " }\n";
                }
              }
            }
          }

          var style = document.createElement('style');
          style.setAttribute('type', 'text/css');
          style.innerHTML =  "<![CDATA[\n" + used + "\n]]>";

          var defs = document.createElement('defs');
          defs.appendChild(style);
          dom.insertBefore(defs, dom.firstChild);
      };


      $scope.settingsDropdown = [
      ];

      switch( $scope.window.type ) {
        case 'heatmap':
        case 'scatterplot':
          $scope.settingsDropdown.push( { 'text': '<i class="fa fa-download"></i> Export as PNG', 'click': "exportPNG(window)" } );
          break;

        case 'histogram':
        case 'som':
          $scope.settingsDropdown.push( { 'text': '<i class="fa fa-download"></i> Export as PNG', 'click': "exportPNG(window)" } );
          $scope.settingsDropdown.push( { 'text': '<i class="fa fa-download"></i> Export as SVG', 'click': "exportSVG(window)" } );
          break;
      }

      $scope.exportPNG = function(win) {

        var svgToCanvas = function(svgElement) {
          setNameSpaceOnEl(svgElement);
            appendCSSRules(svgElement);

            var image = new Image();
            var svgXml = new XMLSerializer().serializeToString(svgElement);

            var defer = $q.defer();

            image.onload = function() {
              var canvas = document.createElement('canvas');
              canvas.width = image.width;
              canvas.height = image.height;
              var context = canvas.getContext('2d');
              context.drawImage(image, 0, 0);
              defer.resolve(canvas);
            };
            image.src = 'data:image/svg+xml;base64,' + btoa(unescape( encodeURIComponent(svgXml) ) );
            return defer.promise;
        };

        // sets background color from transparent to white
        // see http://www.mikechambers.com/blog/2011/01/31/setting-the-background-color-when-generating-images-from-canvas-todataurl/
        var canvasToBase64 = function(canvas, backgroundColor) {
            var w = canvas.width;
            var h = canvas.height;

            var context = canvas.getContext('2d');
            //get the current ImageData for the canvas.
            var data = context.getImageData(0, 0, w, h);

            //store the current globalCompositeOperation
            var compositeOperation = context.globalCompositeOperation;

            //set to draw behind current content
            context.globalCompositeOperation = "destination-over";

            //set background color
            context.fillStyle = backgroundColor;

            //draw background / rect on entire canvas
            context.fillRect(0,0,w,h);

            var regex = new RegExp('data:image\/png;base64,', 'g');
            return canvas.toDataURL("image/png").replace( regex, '');
        };

        var base64str,
        filename = win.type + "_of_",
        url = constants.export.png;

        var getCombined = function(element) {
          combinedEl = document.createElement('canvas');

          var combinedCtx = combinedEl.getContext('2d');
          _.each( element.find('canvas'), function(canvas, ind) {
            if( ind === 0 ) {
              combinedEl.setAttribute('width', canvas.width);
              combinedEl.setAttribute('height', canvas.height);
            }
            if( canvas.style.display !== 'none' ) {
              // dont draw hidden datasets
              combinedCtx.drawImage( canvas, 0, 0 );
            }
          });

          return canvasToBase64( combinedEl, '#FFFFFF' );
        };

        if( win.type == 'histogram' || win.type == 'som' ) {
          var svgElement = $scope.element.find('svg')[0].cloneNode(true);

          filename += (win.variables.x || win.variable) + "_on_" + _.map( DatasetFactory.activeSets(), function(set) { return set.getName(); } ).join("_");

          svgToCanvas( svgElement ).then( function(canvas) {
            base64str = canvasToBase64( canvas, '#FFFFFF' );
            sendFile(base64str, url, filename);
            svgElement.remove();
          });
        }
        else if( win.type == 'scatterplot' ) {
          // combine the canvas images:
          base64str = getCombined( $scope.element );

          filename += win.variables.x + "_and_" + win.variables.y + 
          "_on_" + _.map( DatasetFactory.activeSets(), function(set) { return set.getName(); } ).join("_");

          sendFile(base64str, url, filename);
        }



      };

    }],
    templateUrl : 'vis/windowing/window.tpl.html',
    replace: true,
    // transclude: true,
    link: function($scope, ele, iAttrs, controller) {
      console.log('window linker');
      $scope.element = ele;

      if($scope.window.size == 'double') {
        $scope.element.addClass('window-dbl');
      }
      else if($scope.window.size == 'double-normal') {
        $scope.element.addClass('window-dbl-norm');
      }

      $timeout(function() {
        $scope.packery.appended( ele[0] );
      });
      var draggable = new Draggabilly( ele[0], { handle : '.handle' } );

      // create window and let Packery know
      $scope.packery.bindDraggabillyEvents( draggable );

      var newEl = angular.element('<div/>')
      .attr('class', $scope.window.type)
      .attr('window', 'window' + $scope.window.number);

      $scope.element.append( newEl );
      $compile( newEl )($scope);

      $timeout(function() {
          $scope.packery.layout();
      });

      // catch window destroys
      $scope.$on('$destroy', function() {
        $scope.packery.remove( $scope.element[0] );
        $scope.packery.layout();

        $rootScope.$emit('variable:remove', $scope.window.type, $scope.window.variables);
        $injector.get('UrlHandler').removeWindow($scope.window.type, $scope.window.variables, $scope.window.filter);
      });
    }
  };
}]);