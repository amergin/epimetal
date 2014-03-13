var dim = angular.module('services.dimensions', [] );

// handles crossfilter.js dimensions and keeps them up-to-date
dim.service('DimensionService', function() {
    this.sayHello = function() {
        return "Hello, World!";
    };
});