 var vis = 
 angular.module( 'plotter.vis', [ 
  'ui.router.state',
  'ui.router.util',
  'ct.ui.router.extras',
  'services.dataset', 
  'services.notify',
  'services.window',
  // 'wu.packery',
  'plotter.vis.explore',
  'plotter.vis.som',
  'plotter.vis.som.distributions',
  'plotter.vis.regression',
  'plotter.vis.menucomponents',
  'services.urlhandler',
  'plotter.vis.filterinfo',
  'plotter.vis.sampleinfo',
  'mgcrea.ngStrap.popover',
  'services.som',
  'services.tab',
  'services.notify',
  // 'ui.layout',
  'ngProgress',
  'progressBarInterceptor',
  'angularResizable',
  'pageslide-directive',
  'plotter.vis.menucomponents.sidenav'
  ] );

 vis.config(['$stateProvider', '$urlRouterProvider', 'ngProgressProvider', function ($stateProvider, $urlRouterProvider, ngProgressProvider) {

  var vis = {
    name: 'vis',
    url: '/vis/?state',
    abstract: true,
    // don't reload state when query parameter is modified
    reloadOnSearch: false,
    data: { pageTitle: 'Visualization' },
    params: {
      state: undefined
    },
    // templateUrl: 'vis/vis.tpl.html',
    // important: the app will NOT change state to 'vis' until
    // these object promises have been resolved. Failure is generally indication
    // that the user is not logged in -> redirect to 'login' state.
    resolve: {
      variables: ['DatasetFactory', function(DatasetFactory) {
        return DatasetFactory.getVariables();
      }],
      datasets: ['DatasetFactory', '$stateParams', '$state', function(DatasetFactory, $stateParams, $state) {
        return DatasetFactory.getDatasets();
      }],
      compatibility: ['CompatibilityService', function(CompatibilityService) {
        return CompatibilityService.browserCompatibility();
      }],
      dimensionServices: ['DimensionService', 'DatasetFactory', 'SOMService', 'WindowHandler', function(DimensionService, DatasetFactory, SOMService, WindowHandler) {
        var primaryDim = DimensionService.create('vis.explore', true);
        DatasetFactory.setDimensionService(primaryDim);
        var somDim = DimensionService.create('vis.som');
        SOMService.setDimensionService(somDim);
        var regression = DimensionService.create('vis.regression');

        var exploreHandler = WindowHandler.create('vis.explore');
        exploreHandler.setDimensionService( DimensionService.get('vis.explore') );

        var somBottomHandler = WindowHandler.create('vis.som.plane');
        somBottomHandler.setDimensionService( somDim );

        var somContentHandler = WindowHandler.create('vis.som.content');
        somContentHandler.setDimensionService( somDim );

        var regressionHandler = WindowHandler.create('vis.regression');
        regressionHandler.setDimensionService( primaryDim );

      }],
      loadState: ['UrlHandler', '$stateParams', '$state', 'variables', 'datasets', 'compatibility', 'dimensionServices', 
      function(UrlHandler, $stateParams, $state, variables, datasets, compatibility, dimensionServices) {
        var stateHash = $stateParams.state;
        return UrlHandler.load(stateHash);
      }]
    },
    views: {
      'content@': {
        templateUrl: 'vis/vis.content.tpl.html',
        controller: 'VisCtrl',
      },
      'header@': {
        templateUrl: 'vis/vis.header.tpl.html',
        controller: 'HeaderCtrl'
      },
      'sidenav@': {
        templateUrl: 'vis/vis.sidenav.tpl.html',
        controller: 'SidenavCtrl'
      }
    }
  };

  var explore = {
    name: 'vis.explore',
    url: 'explore',
    parent: 'vis',
    reloadOnSearch: false,
    data: { pageTitle: 'Explore datasets and filter | Visualization' },
    resolve: {
      windowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        // var handler = WindowHandler.create('vis.explore');
        // handler.setDimensionService( DimensionService.get('vis.explore') );
        // return handler;
        return WindowHandler.get('vis.explore');
      }]
    },
    views: {
      'explore@vis': {
        controller: 'ExploreController',
        templateUrl: 'vis/explore/explore.tpl.html'
      }
    },
    deepStateRedirect: true,
    sticky: true
  };

  var som = {
    name: 'vis.som',
    url: 'som',
    // parent: 'vis',
    // abstract: true,
    reloadOnSearch: false,
    data: { pageTitle: 'Self-organizing maps | Visualization' },
    resolve: {
      // bottom portion of the page only!
      bottomWindowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        // var handler = WindowHandler.create('vis.som');
        // handler.setDimensionService( DimensionService.get('vis.som') );
        // return handler;
        return WindowHandler.get('vis.som.plane');
      }],

      contentWindowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        return WindowHandler.get('vis.som.content');
      }]
    },
    views: {
      'som@vis': {
        templateUrl: 'vis/som/vis.som.content.tpl.html',
        controller: 'SOMContentCtrl'
      },

      'bottom@': {
        templateUrl: 'vis/som/vis.som.bottom.tpl.html',
        controller: 'SOMBottomContentCtrl'
      }
      // 'submenu-som@vis': {
      //   templateUrl: 'vis/som/som.submenu.tpl.html'
      // },
      // 'som@vis': {
      //   templateUrl: 'vis/som/som.tpl.html'
      //   // controller: 'ExploreMenuCtrl'
      // },

      // 'som-bottom-menu@vis.som': {
      //   controller: 'SOMBottomMenuController',
      //   templateUrl: 'vis/som/som.bottom.menu.tpl.html'
      // },
      // 'som-bottom-content@vis.som': {
      //   controller: 'SOMBottomContentController',
      //   templateUrl: 'vis/som/som.bottom.content.tpl.html'
      // }
    },
    // deepStateRedirect: {
    //   default: { state: 'vis.som.profiles', params: {} },
    //   params: ['state']
    // },
    deepStateRedirect: true,
    sticky: true
  };
  // abstract-like state, route elsewhere
  // $urlRouterProvider.when('/vis/som', '/vis/som/distributions');

  // var somDistributions = {
  //   name: 'vis.som.distributions',
  //   url: '/distributions',
  //   // parent: 'vis.som',
  //   reloadOnSearch: false,
  //   data: { pageTitle: 'Compare distributions | Self-organizing maps | Visualization' },
  //   resolve: {
  //     windowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
  //       // var handler = WindowHandler.create('vis.som.distributions');
  //       // handler.setDimensionService( DimensionService.get('vis.som') );
  //       // return handler;
  //       return WindowHandler.get('vis.som.distributions');
  //     }]
  //   },
  //   views: {
  //     'submenu-distributions@vis.som': {
  //       controller: 'SOMMenuController',
  //       templateUrl: 'vis/som/distributions/som.submenu.tpl.html'
  //     },
  //     'top-distributions@vis.som': {
  //       controller: 'SOMDistributionsController',
  //       templateUrl: 'vis/som/distributions/som.top.tpl.html'
  //     }
  //   },
  //   deepStateRedirect: true,
  //   sticky: true
  // };

  // var somProfiles = {
  //   name: 'vis.som.profiles',
  //   url: '/profiles',
  //   // parent: 'vis.som',
  //   data: { pageTitle: 'Compare profiles | Self-organizing maps | Visualization' },
  //   resolve: {
  //     windowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
  //       // var handler = WindowHandler.create('vis.som.profiles');
  //       // handler.setDimensionService( DimensionService.get('vis.som') );
  //       // return handler;
  //       return WindowHandler.get('vis.som.profiles');
  //     }]
  //   },
  //   views: {
  //     'submenu-profiles@vis.som': {
  //       controller: 'SOMProfilesMenuController',
  //       templateUrl: 'vis/som/profiles/som.submenu.tpl.html'
  //     },
  //     'top-profiles@vis.som': {
  //       controller: 'SOMProfilesController',
  //       templateUrl: 'vis/som/profiles/som.top.tpl.html'
  //     }
  //   },
  //   deepStateRedirect: true,
  //   sticky: true
  // };   

  var regression = {
    name: 'vis.regression',
    url: 'regression',
    // parent: 'vis',
    reloadOnSearch: false,
    data: { pageTitle: 'Regression analysis | Visualization' },
    views: {
      // 'submenu-regression@vis': {
      //   templateUrl: 'vis/regression/regression.submenu.tpl.html',
      //   controller: 'RegressionSubmenuController'
      // },
      'regression@vis': {
        templateUrl: 'vis/regression/regression.tpl.html',
        controller: 'RegressionController'
      }
    },
    resolve: {
      windowHandler: ['WindowHandler', 'DimensionService', function(WindowHandler, DimensionService) {
        // var handler = WindowHandler.create('vis.regression');
        // handler.setDimensionService( DimensionService.getPrimary() );
        // return handler;
        return WindowHandler.get('vis.regression');
      }]
    },
    sticky: true,
    deepStateRedirect: true
  };


  $stateProvider.state(vis);
  $stateProvider.state(explore);
  $stateProvider.state(som);
  $stateProvider.state(regression);

  // progress bar settings
  ngProgressProvider.setHeight('3px');
}]);


 vis.controller( 'HeaderCtrl', ['$scope', '$stateParams', '$injector', '$state', 'TabService', 'plSidenav',
  function ($scope, $stateParams, $injector, $state, TabService, plSidenav) {

    $scope.tabs = [
    { 'title': 'Explore and filter', 'name': 'explore' },
    { 'title': 'Self-organizing maps', 'name': 'som' },
    { 'title': 'Regression analysis & associations', 'name': 'regression' }
    ];

    function getTabInd() {
      var state = TabService.activeState();
      if(state.name == 'vis.explore') {
        return 0;
      } else if( _.startsWith(state.name, 'vis.som') ) {
        return 1;
      } else if( state.name == 'vis.regression' ) {
        return 2;
      }
    }

    $scope.headerTabInd = getTabInd();

    // quickfix: http://stackoverflow.com/questions/22054391/angular-ui-router-how-do-i-get-parent-view-to-be-active-when-navigating-to-ne
    $scope.$state = $state;

    console.log("header ctrl");

    $scope.toggleSidenav = function() {
      plSidenav.toggle();
    };

    $scope.sideNavOpen = function() {
      return plSidenav.isOpen();
    };

  }]);

  vis.controller('SidenavCtrl', ['$scope', 'TabService', '$rootScope', 'NotifyService', '$mdSidenav', '$injector', '$mdMedia', 'WindowHandler', 'PlotService', 'RegressionService', 'plSidenav', 'SOMService',
    function ($scope, TabService, $rootScope, NotifyService, $mdSidenav, $injector, $mdMedia, WindowHandler, PlotService, RegressionService, plSidenav, SOMService) {

      $scope.toggleSidenav = function() {
        plSidenav.toggle();
      };


      $scope.openGraphModal = function(ev) {
        var diagScope = $rootScope.$new(true);

        diagScope.config = {
          title: 'Create a new graph',
          template: 'vis/menucomponents/new.graph.tpl.html',
          actions: {
            submit: 'Create a graph',
            cancel: 'Cancel and close'
          }
        };

        var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', diagScope, {
          controller: 'ModalCtrl'
        }, ev);

        promise.then(function(config) {
          var winHandler = WindowHandler.getVisible()[0];

          function postHistogram(array) {
            _.each(array, function(variable) {
              PlotService.drawHistogram({
                variables: {
                  x: variable.name
                }, 
                pooled: false,
                somSpecial: false
              }, winHandler);
            });
          }

          function postHeatmap(array) {
            function processVariables(array) {
              return _.chain(array)
              .map(function(v) {
                return v.name;
              }).value();
            }

            PlotService.drawHeatmap({
              variables: {
                x: processVariables(array)
              }, 
              separate: config.config.separate
            }, winHandler);
          }

          function postScatterplot(selection) {
            PlotService.drawScatter({
              variables: {
                x: _.first(selection.x).name,
                y: _.first(selection.y).name
              }, 
              pooled: false
            }, winHandler);
          }

          switch(config.type) {
            case 'histogram':
              postHistogram(config.selection);
              break;

            case 'scatterplot':
              postScatterplot(config.selection);
              break;

            case 'heatmap':
              postHeatmap(config.selection);
              break;
          }

        });
    };

    $scope.openSOMModal = function(ev) {
      var diagScope = $rootScope.$new(true);
      $scope.selection = null;

      diagScope.config = {
        title: 'Add SOM figures',
        template: 'vis/menucomponents/som.modal.tpl.html',
        actions: {
          submit: 'Create',
          cancel: 'Cancel and close'
        }
      };

      var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', diagScope, {
        controller: 'ModalCtrl'
      }, ev);

      promise.then(function succFn(variables) {

      }, function errFn() {

      });

    };

    $scope.canOpen = function() {
      return !TabService.lock();
    };

    $scope.canOpenSOM = function() {
      return !SOMService.inProgress();
    };

    $scope.openSOMInputModal = function(ev) {

      var diagScope = $rootScope.$new(true);

      $scope.selection = null;

      diagScope.config = {
        title: 'Select Self-organizing Map input variables',
        template: 'vis/menucomponents/som.input.tpl.html',
        actions: {
          submit: 'Update input variables',
          cancel: 'Cancel and close'
        }
      };

      var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', diagScope, {
        controller: 'ModalCtrl'
      }, ev);

      promise.then(function succFn(result) {
      }, function errFn() {
      });

    };

    $scope.openRegressionModal = function(ev) {
      var diagScope = $rootScope.$new(true);

      diagScope.config = {
        title: 'Create a regression view',
        template: 'vis/menucomponents/new.regression.tpl.html',
        actions: {
          submit: 'Compute regression',
          cancel: 'Cancel and close'
        }        
      };

      var promise = NotifyService.addClosableModal('vis/menucomponents/new.modal.tpl.html', diagScope, {
        controller: 'ModalCtrl'
      }, ev);

      promise.then(function(result) {
        function pickVariables(value) {
          if( _.isArray(value) ) {
            return _.map(value, function(d) { return d.name; });
          } else {
            return value.name;
          }
        }

        function getVariablesFormatted(selection) {
          return _.chain(selection)
          .map(function(v,k) {
            return [k, pickVariables(v)];
          })
          .zipObject()
          .value();
        }

        var winHandler = WindowHandler.getVisible()[0],
        config = {
          variables: getVariablesFormatted(result.selection),
          source: result.source
        };

        RegressionService.selectedVariables(config.variables);
        PlotService.drawRegression(config, winHandler);
      });      
    };

    $scope.getMenuButtonType = function() {
      var state = TabService.activeState();
      if(state.name === 'vis.regression') {
        return 'regression';
      } else if(state.name === 'vis.som') {
        return 'som';
      }
      else {
        return 'default';
      }
    };     
  }
  ]);


 vis.controller( 'ModalCtrl', ['$scope', '$modal', 'DatasetFactory',
  function ($scope, $modal, DatasetFactory) {

    $scope.canSubmit = {
      initial: function() {
        return _.isNull($scope.canSubmit.inherited) ? true : $scope.canSubmit.inherited();
      },
      inherited: null
    };

    $scope.submit = {
      initial: function() {
        var retval = $scope.submit.inherited();
        if(retval === false) { return; }
        else {
          $scope.$close(retval);
        }
      },
      inherited: null
    };

    $scope.cancel = {
      initial: function() {
        $scope.$dismiss( !$scope.cancel.inherited ? {} : $scope.cancel.inherited() );
      },
      inherited: null
    };

  }]); 


 vis.controller( 'VisCtrl', ['$scope', 'DimensionService', 'DatasetFactory', '$stateParams', 'PlotService', 'UrlHandler', '$injector', 'WindowHandler', 'variables', 'datasets', '$q', 'SOMService', 'TabService', 'NotifyService', 'plSidenav', '$state',
  function VisController( $scope, DimensionService, DatasetFactory, $stateParams, PlotService, UrlHandler, $injector, WindowHandler, variables, datasets, $q, SOMService, TabService, NotifyService, plSidenav, $state) {
    console.log("viscontroller");

    var $rootScope = $injector.get('$rootScope');

    $rootScope.tabChangeEnabled = function(tab) {
      var locked = !TabService.lock(),
      canChange = TabService.canChangeTo('vis.' + tab.name);

      if(!locked) { 
        NotifyService.addTransient(
          'Please wait until the computation has been completed', 
          'Tabs cannot be switched during computational tasks.', 'warn');
      } else if(!canChange) {
        NotifyService.addTransient(
          'Please navigate between the tabs in consecutive order', 
          'Please navigate between the tabs in consecutive order.', 'warn');        
      }
      return locked && canChange;
    };

    $scope.menuDatasets = datasets;
    $scope.menuVariables = variables;

    $scope.dimensionService = DimensionService.getPrimary();


    // for debugging
    // $scope.usedVariables = $scope.dimensionService.getUsedVariables();
    $scope.activeVariables = $scope.dimensionService.getDimensions();

    $rootScope.sideMenuVisible = function() {
      return plSidenav.isOpen();
    };

    $rootScope.showBottomContainer = function() {
      return _.startsWith($state.current.name, 'vis.som');
    };

  }]);
