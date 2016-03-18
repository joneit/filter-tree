'use strict';

var _ = require('object-iterators');
var popMenu = require('pop-menu');

var FilterTree = require('./js/FilterTree');
var conditionals = require('./js/conditionals');
var copy = require('./js/copy-input');

// expose some objects for plug-in access

FilterTree.conditionals = conditionals;

// FOLLOWING PROPERTIES ARE *** TEMPORARY ***,
// FOR THE DEMO TO ACCESS THESE NODE MODULES.

FilterTree._ = _;
FilterTree.popMenu = popMenu;
FilterTree.copy = copy;


module.exports = FilterTree;
