describe( 'AppCtrl', function() {
  describe( 'isCurrentUrl', function() {
    var AppCtrl, $location, $scope;

    beforeEach( module( 'plotter' ) );

    var Restangular;

    beforeEach( inject( function( $controller, _$location_, $rootScope, _Restangular_, _$httpBackend_ ) {
      $location = _$location_;
      $scope = $rootScope.$new();
      AppCtrl = $controller( 'AppCtrl', { $location: $location, $scope: $scope });
      Restangular = _Restangular_;
      $httpBackEnd = _$httpBackend_;
      $httpBackend.whenGET("/API/headers/NMR_results").respond({});
      $httpBackend.whenGET("/API/datasets").respond({});

    }));

    it( 'should pass a dummy test', inject( function() {

      $httpBackend.expectGET('/API/headers/NMR_results');
      // $httpBackend.flush();


      // $httpBackend.whenGET("/API/headers/NMR_results").respond(200, { hello: 'World' });
      // $httpBackend.expectGET('/API/headers/NMR_results');
      // $httpBackend.flush();

      // $httpBackend.whenGET("/API/datasets").respond(200, { hello: 'World' });
      $httpBackend.expectGET('/API/datasets');
      // $httpBackend.flush();

      expect( AppCtrl ).toBeFalsy(); //AppCtrl ).toBeTruthy();
    }));
  });
});
