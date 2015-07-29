angular.module('services.task-handler', ['services.correlation.ww', 'services.regression.ww', 'services.som'])

.factory('TaskHandlerService', ['$injector', '$rootScope', 'RegressionService', 'CorrelationService', 'SOMService',
  function ($injector, $rootScope, RegressionService, CorrelationService, SOMService) {

    var service = {};

    service.cancelAll = function() {
      if(SOMService.inProgress()) {
        // todo
      }
      if(RegressionService.inProgress()) {
        RegressionService.cancel();
      }
      if(CorrelationService.inProgress()) {
        CorrelationService.cancel();
      }

      return service;
    };

    service.hasTasks = function() {
      return SOMService.inProgress() ||
      RegressionService.inProgress() || 
      CorrelationService.inProgress();
    };

    return service;
  }
  ]);
