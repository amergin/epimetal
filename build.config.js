/**
 * This file/module contains all configuration for the build process.
 */
module.exports = {
  /**
   * The `build_dir` folder is where our projects are compiled during
   * development and the `compile_dir` folder is where our app resides once it's
   * completely built.
   */
  build_dir: 'build',
  compile_dir: 'bin',

  /**
   * This is a collection of file patterns that refer to our app code (the
   * stuff in `src/`). These file paths are used in the configuration of
   * build tasks. `js` is all project javascript, less tests. `ctpl` contains
   * our reusable components' (`src/common`) template HTML files, while
   * `atpl` contains the same, but for our app's code. `html` is just our
   * main HTML file, `less` is our main stylesheet, and `unit` contains our
   * app's unit tests.
   */
  app_files: {
    js: [ 'src/**/*.js', '!src/**/*.spec.js', '!src/assets/**/*.js' ],
    jsunit: [ 'src/**/*.spec.js' ],
    
    coffee: [ 'src/**/*.coffee', '!src/**/*.spec.coffee' ],
    coffeeunit: [ 'src/**/*.spec.coffee' ],

    atpl: [ 'src/app/**/*.tpl.html' ],
    ctpl: [ 'src/common/**/*.tpl.html' ],

    html: [ 'src/index.html' ],
    less: 'src/less/main.less'
  },

  /**
   * This is a collection of files used during testing only.
   */
  test_files: {
    js: [
      'vendor/angular-mocks/angular-mocks.js'
    ]
  },

  /**
   * This is the same as `app_files`, except it contains patterns that
   * reference vendor code (`vendor/`) that we need to place into the build
   * process somewhere. While the `app_files` property ensures all
   * standardized files are collected for compilation, it is the user's job
   * to ensure non-standardized (i.e. vendor-related) files are handled
   * appropriately in `vendor_files.js`.
   *
   * The `vendor_files.js` property holds files to be automatically
   * concatenated and minified with our project source files.
   *
   * The `vendor_files.css` property holds any CSS files to be automatically
   * included in our app.
   *
   * The `vendor_files.assets` property holds any assets to be copied along
   * with our app's assets. This structure is flattened, so it is not
   * recommended that you use wildcards.
   */
  vendor_files: {
    js: [
      // notice the order: jquery before angular!
      'vendor/jquery/dist/jquery.js',
      'vendor/javascript-detect-element-resize/jquery.resize.js',
      'vendor/angular/angular.js',
      // html sanitizer for notify service
      'vendor/angular-sanitize/angular-sanitize.js',
      // animation framework
      'vendor/angular-animate/angular-animate.js',
      // windowing
      'vendor/angular-gridster/src/angular-gridster.js',
      // routing
      'vendor/angular-ui-router/release/angular-ui-router.js',
      // 'vendor/ui-router-extras/release/ct-ui-router-extras.js',
      'vendor/ui-router-extras/release/modular/ct-ui-router-extras.core.js',
      'vendor/ui-router-extras/release/modular/ct-ui-router-extras.dsr.js',
      'vendor/ui-router-extras/release/modular/ct-ui-router-extras.sticky.js',
      'vendor/angular-ui-utils/modules/route/route.js',
      'vendor/crossfilter/patched/crossfilter.js',
      'vendor/d3/d3.js',
      'vendor/dcjs/dc-develop.js',
      'vendor/d3-tip/index.js',
      // Utilities
      'vendor/lodash/lodash.min.js',
      // core framework for UI
      'vendor/angular-strap/dist/angular-strap.js',
      'vendor/angular-strap/dist/angular-strap.tpl.js',
      // SOM figures
      'vendor/d3-plugins/hexbin/hexbin.js',
      // compatibility-service
      'vendor/modernizr/modernizr.custom.min.js',
      'vendor/spin.js/spin.js',
      'vendor/angular-spinner/angular-spinner.min.js',
      // customize this for release:
      'vendor/angular-bootstrap/custom-build/ui-bootstrap-custom-tpls-0.13.0.js',
      'vendor/angular-growl-2/build/angular-growl.js',
      'vendor/statistics-distributions-js/statistics-distributions-packaged.js',
      'vendor/SOM.js/src/services-compute-som.js',
      'vendor/SOM.js/src/utilities.som.js',
      'vendor/ngprogress/build/ngprogress.js',
      'vendor/ng-clip/dest/ng-clip.min.js',
      'vendor/zeroclipboard/dist/ZeroClipboard.js',
      'vendor/angular-resizable/angular-resizable.min.js',
      'vendor/ng-tags-input/ng-tags-input.js',
      'vendor/SparkMD5/spark-md5.js',
      // 'vendor/angular-workers/dist/angular-workers.js',
      'vendor/angular-svg-round-progressbar/build/roundProgress.js',
      // this is a hack to allow the subdirectories to be copied
      'build/assets/core-estimator/core-estimator.js'
    ],
    css: [
      'vendor/dcjs/dc.css',
      'vendor/angular-motion/dist/angular-motion.min.css',
      'vendor/bootstrap-additions/dist/bootstrap-additions.min.css',
      'vendor/angular-ui-layout/src/ui-layout.css',
      'vendor/angular-growl-2/build/angular-growl.min.css',
      'vendor/ngprogress/ngProgress.css',
      'vendor/angular-material/angular-material.css',
      'vendor/angular-resizable/angular-resizable.min.css',
      // preserve this order:
      'vendor/ng-tags-input/ng-tags-input.min.css',
      'vendor/ng-tags-input/ng-tags-input.bootstrap.min.css'
    ],
    assets: [
      'vendor/font-awesome/fonts/*',
      'vendor/bootstrap-chosen/chosen-sprite*',
      'vendor/zeroclipboard/dist/ZeroClipboard.swf',
      'src/common/utilities.math.js',
      'src/common/utilities.regression.js',
      'vendor/SOM.js/src/utilities.som.js',
      'vendor/lodash/lodash.min.js',
      'vendor/numericjs/lib/numeric.min.js',
      'vendor/mathjs/dist/math.min.js',
      'vendor/statistics-distributions-js/statistics-distributions-packaged.js'
    ]
  },
};
