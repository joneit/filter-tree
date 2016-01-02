/* eslint-env browser */

'use strict';

var extend = require('extend-me');
var Base = extend.Base;

var template = require('./template');

extend.debug = true;

var CHILDREN_TAG = 'OL',
    CHILD_TAG = 'LI';

/**
 * @constructor
 *
 * @description A filter tree represents a _complex conditional expression_ and consists of a single `FilterNode` object serving as the _root_ of an _n_-ary tree.
 *
 * Each `FilterNode` represents a node in tree. Each node is one of two types of objects extended from `FilterNode`:
 *
 * * The non-terminal (@link FilterTree} nodes represent _complex subexpressions_, each consisting of two or more _conditional_ (boolean expressions), all concatenated together with one of the _tree operators_.
 * * The terminal {@link FilterLeaf} nodes represent _simple expressions_.
 *
 * Tree operators currently include **_AND_** (labeled "all" in the UI; and "op-and" internally), **_OR_** ("any"; "op-or"), and **_NOR_** ("none"; "op-nor").
 *
 * Each conditional in a _subexpression_ (non-terminal node) is represented by a child node which may be either a _simple expression_ (terminal node) or another ("nested") subexpression non-terminal node.
 *
 * The `FilterLeaf` object is the default type of simple expression, which is in the form _field-property operator-property argument-property_ where:
 *
 * * _field-property_ - the name of a column, selected from a drop-down;
 * * _operator-property_ - an equality (=), inequality (<, ≤, ≠, ≥, >), or pattern operator (LIKE, NOT LIKE), also selected from a drop-down; and
 * * _argument-property_ is a constant typed into a text box.
 *
 * The `FilterTree` object has polymorphic methods that operate on the entire tree using recursion. When the recursion reaches a terminal node, it calls the methods on the `FilterLeaf` object instead. Calling `test()` on the root tree therefore returns a boolean that determines if the row passes through the entire filter expression (`true`) or is blocked by it (`false`).
 *
 * The programmer may define a new type of simple expression by extending from `FilterLeaf`. An example is the `FilterField` object. Such an implementation must include methods:
 *
 * * Save and subsequently reload the state of the conditional as entered by the user (`toJSON()` and `fromJSON()`, respectively).
 * * Create the DOM objects that represent the UI filter editor and render them to the UI (`newView()` and `render()`, respectively).
 * * Filter a table by implementing one or more of the following:
 *   * Apply the conditional logic to available table row data (`test()`).
 *   * Apply the conditional logic to a remote data-store by generating a **SQL** or **Q** _WHERE_ clause (`toSQL()` and `toQ()`, respectively).
 *
 * Some of the above-named methods as already implemented in `FilterLeaf` and/or `FilterNode` may be sufficient to handle your needs as is (without further code).
 *
 * @param {string[]} [options.fields] - A default list of column names for field drop-downs of all descendant terminal nodes. Overrides `options.json.fields` (see). May be defined for any node and pertains to all descendants of that node (including terminal nodes). If omitted (and no `nodeFields`), will use the nearest ancestor `fields` definition. However, descendants with their own definition of `types` will override any ancestor definition.
 *
 * > Typically only used by the caller for the top-level (root) tree.
 *
 * @param {string[]} [options.nodeFields] - A default list of column names for field drop-downs of immediate descendant terminal nodes _only_. Overrides `options.json.nodeFields` (see).
 *
 * Although both `options.fields` and `options.nodeFields` are notated as optional herein, by the time a terminal node tries to render a fields drop-down, a `fields` list _must_ be defined through (in order of priority):
 *
 * * Terminal node's own `options.fields` (or `options.json.fields`) definition.
 * * Terminal node's parent node's `option.nodeFields` (or `option.json.nodesFields`) definition.
 * * Any of terminal node's ancestor's `options.fields` (or `options.json.fields`) definition.
 *
 * @param {object} [options.datatypes] - A hash of field types for all descendant terminal nodes to use in their comparison logic. Overrides `options.json.types` (see). May be defined for any node and pertains to all descendants of that node (including terminal nodes). If omitted, will use the nearest ancestor `types` definition. However, descendants with their own definition of `types` will override any ancestor definition.
 *
 * @param {object} [options.json] - A data structure that describes a tree, subtree, or leaf:
 *
 * * May describe a terminal node with properties:
 *   * `type` - A string identifying the type of conditional. Must be in the tree's (see {@link FilterTree#editors|editors}) hash. If omitted, defaults to `'Default'`.
 *   * misc. - Other properties peculiar to this filter type (but typically including at least a `field` property).
 * * May describe a non-terminal node with properties:
 *   * `operator` - One of {@link treeOperators}.
 *   * `children` -  Array containing additional terminal and non-terminal nodes.
 *
 * Both types of nodes above may also contain the following properties, used when no other data is specified on instantiation:
 * * `fields` - Like `options.fields` (see above).
 * * `datatypes` - Like `options.types` (see above).
 *
 * If this `options.json` object is omitted altogether, loads an empty filter, which is a `FilterTree` node consisting the default `operator` value (`'op-and'`).
 *
 * > Note that this is a JSON object; not a JSON string (_i.e.,_ "parsed"; not "stringified").
 *
 *
 *
 * @param {function} [options.type='Default'] - Type of simple expression.
 *
 * @param {FilterTree} [options.parent] - Used internally to insert element when creating nested subtrees. For the top level tree, you don't give a value for `parent`; you are responsible for inserting the top-level `.el` into the DOM.
 */
var FilterNode = Base.extend({

    initialize: function(options) {
        var parent = this.parent = options && options.parent,
            json = this.json = options && options.json;

        /** Default list of fields only for direct child terminal-node drop-downs.
         * @name nodeFields
         * @type {string[]}
         * @memberOf FilterNode.prototype
         */
        setOption.call(this, options, 'nodeFields');

        /** Default list of fields for all descending terminal-node drop-downs.
         * @name fields
         * @type {string[]}
         * @memberOf FilterNode.prototype
         */
        setOption.call(this, options, 'fields', parent);

        /** Hash of field types.
         * @name types
         * @type {object}
         * @memberOf FilterNode.prototype
         */
        setOption.call(this, options, 'datatypes', parent);

        /** Type of filter editor.
         * @name type
         * @type {string}
         * @memberOf FilterNode.prototype
         */
        setOption.call(this, options, 'type', parent);

        this.newView();
        this.fromJSON(json);
        this.render();
    },

    /** Insert each subtree into its parent node along with a "delete" button.
     * > The root tree is has no parent and is inserted into the DOM by the instantiating code (without a delete button).
     */
    render: function() {
        if (this.parent) {
            var newListItem = document.createElement(CHILD_TAG);
            newListItem.appendChild(template('removeButton'));
            newListItem.appendChild(this.el);
            this.parent.el.querySelector(CHILDREN_TAG).appendChild(newListItem);
        }
    },

    toJSON: function toJSON() {
        var json = {};

        if (this.toJsonOptions) {
            var tree = this, metadata = [];
            if (this.toJsonOptions.fields) {
                metadata.push('fields');
                metadata.push('nodeFields');
            }
            if (this.toJsonOptions.datatypes) {
                metadata.push('datatypes');
            }
            if (this.toJsonOptions.type) {
                metadata.push('type');
            }
            metadata.forEach(function(prop) {
                if (!tree.parent || tree[prop] && tree[prop] !== tree.parent[prop]) {
                    json[prop] = tree[prop];
                }
            });
        }

        return json;
    },

    Error: function(msg) {
        return new Error('filter-tree: ' + msg);
    },

    SQL_QUOTED_IDENTIFIER: '"'

});

function setOption(options, key, parent) {
    this[key] =
        options && options[key] ||
        this.json && this.json[key] ||
        parent && parent[key]; // reference parent value now so we don't have to search up the tree later
}

FilterNode.clickIn = function(el) {
    if (el) {
        if (el.tagName === 'SELECT') {
            setTimeout(function() { el.dispatchEvent(new MouseEvent('mousedown')); }, 0);
        } else {
            el.focus();
        }
    }
};

module.exports = FilterNode;
