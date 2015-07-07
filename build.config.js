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
      // 'vendor/jquery-ui/jquery-ui.min.js',
      // 'vendor/jquery-ui/ui/minified/core.min.js',
      // 'vendor/jquery-ui/ui/minified/widget.min.js',
      // 'vendor/jquery-ui/ui/minified/mouse.min.js',
      // 'vendor/jquery-ui/ui/minified/resizable.min.js',
      'vendor/javascript-detect-element-resize/jquery.resize.js',
      // resizeable x4
      // 'vendor/jquery-ui/ui/minified/core.min.js',
      // 'vendor/jquery-ui/ui/minified/widget.min.js',
      // 'vendor/jquery-ui/ui/minified/mouse.min.js',
      // 'vendor/jquery-ui/ui/minified/resizable.min.js',
      'vendor/angular/angular.js',
      // html sanitizer for notify service
      'vendor/angular-sanitize/angular-sanitize.js',
      // animation framework
      'vendor/angular-animate/angular-animate.js',
      // windowing
      'vendor/angular-gridster/src/angular-gridster.js',
      // 'vendor/packery/dist/packery.pkgd.js',
      // 'vendor/draggabilly/draggabilly.js',
      // dropdowns x2
      'vendor/chosen/chosen.jquery.js',
      'vendor/angular-chosen-localytics/chosen.js',
      // routing
      'vendor/angular-ui-router/release/angular-ui-router.js',
      'vendor/ui-router-extras/release/ct-ui-router-extras.js',
      'vendor/angular-ui-utils/modules/route/route.js',
      // 'vendor/crossfilter/crossfilter-new-unmodified.js',
      'vendor/crossfilter/crossfilter.new.js',//crossfilter.custom.old.js', //crossfilter.custom.js',
      'vendor/d3/d3.js',
      'vendor/dcjs/dc.js',
      'vendor/d3-tip/index.js',
      // utilities
      // 'vendor/underscore/underscore.js',
      // 'vendor/lodash/lodash.js',
      'vendor/lodash/lodash.min.js',
      // core framework for UI
      'vendor/angular-strap/dist/angular-strap.js',
      'vendor/angular-strap/dist/angular-strap.tpl.js',
      // SOM figures
      'vendor/d3-plugins/hexbin/hexbin.js',
      // compatibility-service
      'vendor/modernizr/modernizr.custom.min.js',
      'vendor/angular-ui-layout/src/ui-layout.js',
      'vendor/spin.js/spin.js',
      'vendor/angular-spinner/angular-spinner.min.js',
      // customize this for release:
      // 'vendor/angular-bootstrap/custom/ui-bootstrap-custom-tpls-0.12.1.js',
      'vendor/angular-bootstrap/custom2/ui-bootstrap-custom-tpls-0.13.0.js',
      'vendor/paralleljs/lib/parallel.js',
      'vendor/numericjs/lib/numeric.min.js',
      'vendor/angular-growl-2/build/angular-growl.js',
      'vendor/statistics-distributions-js/statistics-distributions-packaged.js',
      'vendor/hor-boxplot/horizontalboxplot.js',
      'vendor/SOM.js/SOM.js',
      'vendor/ngprogress/build/ngProgress.js',
      'vendor/spark-md5/spark-md5.js',
      'vendor/ng-clip/dest/ng-clip.min.js',
      'vendor/zeroclipboard/dist/ZeroClipboard.js',
      // material x2
      'vendor/angular-material/angular-material.js',
      'vendor/angular-aria/angular-aria.js',
      'vendor/angular-resizable/angular-resizable.min.js',
      'vendor/ng-pageslide/dist/angular-pageslide-directive.min.js'
    ],
    css: [
      'vendor/dcjs/dc.css',
      'vendor/angular-motion/dist/angular-motion.min.css',
      'vendor/bootstrap-additions/dist/bootstrap-additions.min.css',
      'vendor/angular-ui-layout/src/ui-layout.css',
      'vendor/angular-growl-2/build/angular-growl.min.css',
      'vendor/ngprogress/ngProgress.css',
      'vendor/angular-material/angular-material.css',
      'vendor/angular-resizable/angular-resizable.min.css'
    ],
    assets: [
      'vendor/font-awesome/fonts/*',
      'vendor/bootstrap-chosen/chosen-sprite*',
      'vendor/zeroclipboard/dist/ZeroClipboard.swf'
    ]
  },
};
