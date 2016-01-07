'use strict';

var cssInjector = require('css-injector');

var css; // defined by code inserted by gulpfile between following comments
/* inject:css */
/* endinject */

module.exports = cssInjector.bind(this, css);
