/* eslint-env browser */

'use strict';

var extend = require('extend-me');
var _ = require('object-iterators');
var Base = extend.Base;

var template = require('./template');
var conditionals = require('./conditionals');
var sqlWhereParse = require('./sql-where-parse');

extend.debug = true;

var CHILDREN_TAG = 'OL',
    CHILD_TAG = 'LI';

/** @typedef {filterTreeNode|filterLeafNode} filterNode
 *
 * @property {filterNode} [parent] - Missing or falsy means this is the root node.
 *
 * @property {filterNode} root - Convenience reference to the root node.
 *
 * @property {fieldItem[]} fields - Column menu to be used by descendant leaf nodes (including this node if it is a leaf node).
 *
 * @property {string} [editor] - Name of filter editor used by descendant leaf nodes (including this node if it is a leaf node).
 *
 * @property {function} [eventHandler] - Event handler for UI events.
 *
 * @property {string} [type] - Identifies the type of node:
 * * `'filterNode'` - A generic filter tree node, either a {@link filterTreeNode} or a {@link filterLeafNode}
 * * `'columnFilters'` - A special {@link filterTreeNode} contaiing _column filter_ subexpressions ({@link filterTreeNode}s of type `'columnFilter'`
 * * `'columnFilter'` -  A special {@link filterTreeNode} containing homogeneous _column filter_ conditionals, all referencing the same column on the left side of their dyadic expressions.
 *
 * Used among other things to select a rendering template. (Note that {@link filterLeafNode} currently do not use rendering templates.)
 *
 * @property {menuItem[]} [treeOpMenu=conditionals.defaultOpMenu] -  Default operator menu for all descendant leaf nodes.
 *
 * @property {object} [typeOpMenu] - A hash of type names. Each member thus defined contains a specific operator menu for all descendant leaf nodes that:
 * 1. do not have an operator menu (`opMenu` property) of their own; and
 * 2. whose columns resolve to that type.
 *
 * The type is determined either by (in priority order):
 * 1. the `type` property of the {@link filterLeafNode}; or
 * 2. the `type` property of the element in the nearest node (including the leaf node itself) that has a defined `nodeFields` or `fields` array property with an element having a matching column name.
 *
 * @property {HTMLElement} el - The DOM element created by the `render` method to represent this node. Contains the `el`s for all child nodes.
 */
/**
 * @constructor
 *
 * @summary A node in a filter tree.
 *
 * @description A filter tree represents a _complex conditional expression_ and consists of a single instance of a {@link FilterTree} as the _root_ of an _n_-ary tree.
 *
 * In general, each instance of a `FilterNode` may be:
 * * a {@link FilterTree}, an object that represents a non-terminal node in a filter tree;
 * * a {@link FilterLeaf}, an object that represents a terminal node in a filter tree; or
 * * any other object extended from either of the above.
 *
 * The `FilterLeaf` object is the default type of simple expression, which is
 *
 * The `FilterTree` object has polymorphic methods that operate on the entire tree using recursion. When the recursion reaches a terminal node, it calls the methods on the `FilterLeaf` object instead. Calling `test()` on the root tree therefore returns a boolean that determines if the row passes through the entire filter expression (`true`) or is blocked by it (`false`).
 *
 * The programmer may define a new type of simple expression by extending from `FilterLeaf`. An example is the `FilterField` object. Such an implementation must include methods:
 *
 * * Save and subsequently reload the state of the conditional as entered by the user (`toJSON()` and `setState()`, respectively).
 * * Create the DOM objects that represent the UI filter editor and render them to the UI (`createView()` and `render()`, respectively).
 * * Filter a table by implementing one or more of the following:
 *   * Apply the conditional logic to available table row data (`test()`).
 *   * Apply the conditional logic to a remote data-store by generating a **SQL** or **Q** _WHERE_ clause (`toSQL()` and `toQ()`, respectively).
 *
 * Some of the above-named methods as already implemented in `FilterLeaf` and/or `FilterNode` may be sufficient to handle your needs as is (without further code).
 *
 * @param {string[]} [options.fields] - A default list of column names for field drop-downs of all descendant terminal nodes. Overrides `options.state.fields` (see). May be defined for any node and pertains to all descendants of that node (including terminal nodes). If omitted (and no `nodeFields`), will use the nearest ancestor `fields` definition. However, descendants with their own definition of `types` will override any ancestor definition.
 *
 * > Typically only used by the caller for the top-level (root) tree.
 *
 * @param {string[]} [options.nodeFields] - A default list of column names for field drop-downs of immediate descendant terminal nodes _only_. Overrides `options.state.nodeFields` (see).
 *
 * Although both `options.fields` and `options.nodeFields` are notated as optional herein, by the time a terminal node tries to render a fields drop-down, a `fields` list _must_ be defined through (in order of priority):
 *
 * * Terminal node's own `options.fields` (or `options.state.fields`) definition.
 * * Terminal node's parent node's `option.nodeFields` (or `option.state.nodesFields`) definition.
 * * Any of terminal node's ancestor's `options.fields` (or `options.state.fields`) definition.
 *
 * @param {object|string} [options.state] - A data structure that describes a tree, subtree, or leaf (terminal node):
 *
 * * May describe a terminal node with properties:
 *   * `fields` - Overridden on instantiation by `options.fields`. If both unspecified, uses parent's definition.
 *   * `editor` - A string identifying the type of conditional. Must be in the parent node's {@link FilterTree#editors|editors} hash. If omitted, defaults to `'Default'`.
 *   * misc. - Other properties peculiar to this filter type (but typically including at least a `field` property).
 * * May describe a non-terminal node with properties:
 *   * `fields` - Overridden on instantiation by `options.fields`. If both unspecified, uses parent's definition.
 *   * `operator` - One of {@link treeOperators}.
 *   * `children` -  Array containing additional terminal and non-terminal nodes.
 *
 * If this `options.state` object is omitted altogether, loads an empty filter, which is a `FilterTree` node consisting the default `operator` value (`'op-and'`).
 *
 * The constructor auto-detects `state`'s type:
 *  * JSON string to be parsed by `JSON.parse()` into a plain object
 *  * SQL WHERE clause string to be parsed into a plain object
 *  * CSS selector of an Element whose `value` contains one of the above
 *  * plain object
 *
 * @param {function} [options.editor='Default'] - Type of simple expression; a key in the FilterTree.prototype.editors hash which maps to a simple expression constructor, which will be `FilterLeaf` or a constructor extended from `FilterLeaf`.
 *
 * @param {FilterTree} [options.parent] - Used internally to insert element when creating nested subtrees. Optional for the top level tree only. (Note that you are responsible for inserting the top-level `.el` into the DOM.)
 */
var FilterNode = Base.extend({

    initialize: function(options) {
        var self = this,
            state = options && options.state && detectState(options.state),
            parent = options && options.parent;

        this.state = state;
        this.parent = parent;
        this.root = parent && parent.root || this;

        // create each standard option from `options` or `state` or `parent` (wherever it's defined first, if anywhere)
        _(FilterNode.optionsSchema).each(function(schema, key) {
            if (!self.hasOwnProperty(key)) {
                var option = options && options[key] ||
                    state && state[key] ||
                    !schema.own && (
                        parent && parent[key] || // reference parent value now so we don't have to search up the tree later
                        schema.default
                    );

                if (option) {
                    self[key] = option;
                }
            }
        });

        // copy all remaining options directly to the new instance, overriding members of the same name in the prototype
        _(options).each(function(value, key) {
            if (!FilterNode.optionsSchema[key]) {
                self[key] = value;
            }
        });

        this.setState(state, options); // forward `options.beg` and `options.end` for use by `sqlWhereParse()`
    },

    /** Insert each subtree into its parent node along with a "delete" button.
     * > The root tree is has no parent and is inserted into the DOM by the instantiating code (without a delete button).
     */
    render: function() {
        if (this.parent) {
            var newListItem = document.createElement(CHILD_TAG);

            if (this.notesEl) {
                newListItem.appendChild(this.notesEl);
            }

            if (!(this.state && this.state.locked)) {
                newListItem.appendChild(template('removeButton'));
            }

            newListItem.appendChild(this.el);

            this.parent.el.querySelector(CHILDREN_TAG).appendChild(newListItem);
        }
    },

    setState: function(state, options) {
        var oldEl = this.el;
        this.state = detectState(state, options);
        this.createView();
        this.loadState();
        this.render();
        if (oldEl && !this.parent) {
            oldEl.parentNode.replaceChild(this.el, oldEl);
        }
    }
});

FilterNode.optionsSchema = {
    /** @summary Default list of fields only for direct child terminal-node drop-downs.
     * @desc > This docs entry describes a property in the FilterNode prototype. It does not describe the optionsSchema property (despite it's position in the source code).
     * @type {string[]}
     * @memberOf FilterNode.prototype
     */
    nodeFields: { own: true },

    /** @summary Default list of fields for all descendant terminal-node drop-downs.
     * @desc > This docs entry describes a property in the FilterNode prototype. It does not describe the optionsSchema property (despite it's position in the source code).
     * @type {menuItem[]}
     * @memberOf FilterNode.prototype
     */
    fields: {},

    /** @summary Type of filter editor.
     * @desc > This docs entry describes a property in the FilterNode prototype. It does not describe the optionsSchema property (despite it's position in the source code).
     * @type {string}
     * @memberOf FilterNode.prototype
     */
    editor: {},

    /** @summary Event handler for UI events.
     * @desc > This docs entry describes a property in the FilterNode prototype. It does not describe the optionsSchema property (despite it's position in the source code).
     * @type {string}
     * @memberOf FilterNode.prototype
     */
    eventHandler: {},

    /** @summary Template to use to generate the mark-up for this subtree.
     * @desc This identifies the type of the subtree and is used among other things to select a rendering template.
     *
     * Although not used for selecting a template in leaf nodes, it is still useful to see what kind of node a leaf belongs to.
     *
     * Possible values are:
     *
     * * `'filterNode'` - a normal filter tree node, containing conditionals (leaf nodes) or subexpressions (other subtree nodes)
     * * `'columnFilters'` - a filter tree node containing only column filter subexpressions (no conditionals)
     * * `'columnFilter'` - a filter tree node containing only conditionals for a specific column (no subexpressions)
     *
     * > This docs entry describes a property in the FilterNode prototype. It does not describe the optionsSchema property (despite it's position in the source code).
     * @type {string}
     * @default `parent.type` if defined, or `'filterNode'` if not.
     * @memberOf FilterNode.prototype
     */
    type: { default: 'filterNode' },

    /** @summary Override operator list at any node.
     * @desc > This docs entry describes a property in the FilterNode prototype. It does not describe the optionsSchema property (despite it's position in the source code).
     * @type {string[]}
     * @memberOf FilterNode.prototype
     */
    treeOpMenu: { default: conditionals.defaultOpMenu },

    typeOpMenu: {}
};

FilterNode.setWarningClass = function(el, value) {
    if (arguments.length < 2) {
        value = el.value;
    }
    el.classList[value ? 'remove' : 'add']('filter-tree-warning');
    return value;
};

function FilterTreeError(message, node) {
    this.message = message;
    this.node = node;
}
FilterTreeError.prototype = Object.create(Error.prototype);
FilterTreeError.prototype.name = 'FilterTreeError';
FilterNode.FilterTreeError = FilterTreeError;

FilterNode.clickIn = function(el) {
    if (el) {
        if (el.tagName === 'SELECT') {
            setTimeout(function() { el.dispatchEvent(new MouseEvent('mousedown')); }, 0);
        } else {
            el.focus();
        }
    }
};

var reSelector = /^[#\.]?\w+(\s*[ \.\-|*+#:~^$>]+\s*\w+.*)?$/;
var reJSON = /^\s*[\[\{]/;

function detectState(state, options) {
    switch (typeof state) {
        case 'object':
            return state;
        case 'string':
            if (reSelector.test(state)) {
                state = document.querySelector(state).value;
            }
            if (reJSON.test(state)) {
                try {
                    return JSON.parse(state);
                } catch (error) {
                    throw new FilterTreeError('JSON parser: ' + error);
                }
            } else {
                try {
                    return sqlWhereParse(state, options);
                } catch (error) {
                    throw new FilterTreeError('SQL WHERE clause parser: ' + error);
                }
            }
    }
}

module.exports = FilterNode;
