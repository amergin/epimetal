describe( 'AppCtrl', function() {
  describe( 'isCurrentUrl', function() {
    var AppCtrl, $location, $scope;

    beforeEach( module( 'plotter' ) );

    var Restangular;

    beforeEach( inject( function( $controller, _$location_, $rootScope ) { //, _$httpBackend_ ) { _Restangular_, 
      $location = _$location_;
      $scope = $rootScope.$new();
      AppCtrl = $controller( 'AppCtrl', { $location: $location, $scope: $scope });
      // Restangular = _Restangular_;
      // $httpBackEnd = _$httpBackend_;
      // $httpBackend.whenGET("/API/headers/NMR_results").respond({});
      // $httpBackend.whenGET("/API/datasets").respond({});

    }));

    it( 'should pass a dummy test', inject( function() {

      // $httpBackend.expectGET('/API/headers/NMR_results');
      // $httpBackend.expectGET('/API/datasets');

      expect( AppCtrl ).toBeTruthy(); //AppCtrl ).toBeTruthy();
    }));
  });
});
