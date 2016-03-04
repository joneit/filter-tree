'use strict';

var _ = require('object-iterators');

var FilterNode = require('./js/FilterNode');
var FilterTree = require('./js/FilterTree');

var conditionals = require('./js/conditionals');
var popMenu = require('./js/pop-menu'); // TODO: Put this in npm
var copy = require('./js/copy-input');
var template = require('./js/template');


// expose some objects for plug-in access

FilterTree.conditionals = conditionals;
FilterTree.FilterTreeError = FilterNode.FilterTreeError;

// FOLLOWING PROPERTIES ARE *** TEMPORARY ***,
// FOR THE DEMO TO ACCESS THESE NODE MODULES.

FilterTree._ = _;
FilterTree.popMenu = popMenu;
FilterTree.copy = copy;
FilterTree.template = template;


module.exports = FilterTree;
