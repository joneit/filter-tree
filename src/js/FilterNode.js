/* eslint-env browser */

'use strict';

var _ = require('object-iterators');
var extend = require('extend-me'), Base = extend.Base; extend.debug = true;

var cssInjector = require('./css');
var template = require('./template');
var conditionals = require('./conditionals');
var sqlWhereParse = require('./sql-where-parse');


var CHILDREN_TAG = 'OL',
    CHILD_TAG = 'LI';

/** @typedef {object} FilterTreeOptionsObject
 *
 * @property {string[]} [schema] - A default list of column names for field drop-downs of all descendant terminal nodes. Overrides `options.state.schema` (see). May be defined for any node and pertains to all descendants of that node (including terminal nodes). If omitted (and no `ownSchema`), will use the nearest ancestor `schema` definition. However, descendants with their own definition of `types` will override any ancestor definition.
 *
 * > Typically only used by the caller for the top-level (root) tree.
 *
 * @property {string[]} [ownSchema] - A default list of column names for field drop-downs of immediate descendant terminal nodes _only_. Overrides `options.state.ownSchema` (see).
 *
 * Although both `options.schema` and `options.ownSchema` are notated as optional herein, by the time a terminal node tries to render a schema drop-down, a `schema` list _must_ be defined through (in order of priority):
 *
 * * Terminal node's own `options.schema` (or `options.state.schema`) definition.
 * * Terminal node's parent node's `option.ownSchema` (or `option.state.nodesFields`) definition.
 * * Any of terminal node's ancestor's `options.schema` (or `options.state.schema`) definition.
 *
 * @property {object|string} [state] - A data structure that describes a tree, subtree, or leaf (terminal node):
 *
 * * May describe a terminal node with properties:
 *   * `schema` - Overridden on instantiation by `options.schema`. If both unspecified, uses parent's definition.
 *   * `editor` - A string identifying the type of conditional. Must be in the parent node's {@link FilterTree#editors|editors} hash. If omitted, defaults to `'Default'`.
 *   * misc. - Other properties peculiar to this filter type (but typically including at least a `field` property).
 * * May describe a non-terminal node with properties:
 *   * `schema` - Overridden on instantiation by `options.schema`. If both unspecified, uses parent's definition.
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
 * @property {function} [editor='Default'] - Type of simple expression; a key in the FilterTree.prototype.editors hash which maps to a simple expression constructor, which will be `FilterLeaf` or a constructor extended from `FilterLeaf`.
 *
 * @property {FilterTree} [parent] - Used internally to insert element when creating nested subtrees. Optional for the top level tree only. (Note that you are responsible for inserting the top-level `.el` into the DOM.)
 *
 * @property {string|HTMLElement} [cssStylesheetReferenceElement] - passed to cssInsert
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
 * The `FilterTree` object has polymorphic methods that operate on the entire tree using recursion. When the recursion reaches a terminal node, it calls the methods on the `FilterLeaf` object instead. Calling `test()` on the root tree therefore returns a boolean that determines if the row passes through the entire filter expression (`true`) or is blocked by it (`false`).
 *
 * The `FilterLeaf` object is the default type of simple expression, which is
 *
 * The programmer may define a new type of simple expression by extending from `FilterLeaf`. An example is the `FilterField` object. Such an implementation must include methods:
 *
 * * Save and subsequently reload the state of the conditional as entered by the user (`getState()` and `setState()`, respectively).
 * * Create the DOM objects that represent the UI filter editor and render them to the UI (`createView()` and `render()`, respectively).
 * * Filter a table by implementing one or more of the following:
 *   * Apply the conditional logic to available table row data (`test()`).
 *   * Apply the conditional logic to a remote data-store by generating a **SQL** or **Q** _WHERE_ clause (`toSQL()` and `toQ()`, respectively).
 *
 * @property {FilterNode} [parent] - Undefined means this is the root node.
 *
 * @property {FilterNode} root - Convenience reference to the root node.
 *
 * @property {menuItem[]} schema - Column schema used by descendant leaf nodes (including this node if it is a leaf node) to render a column choice drop-down.
 *
 * @property {string} [editor] - Name of filter editor used by descendant leaf nodes (including this node if it is a leaf node).
 *
 * @property {function} [eventHandler] - Event handler for UI events.
 *
 * @property {string} [template] - Identifies either:
 * 1. The type of a {@link FilterTree} node, used among other things to select a rendering template:
 *    * `undefined` (or omitted) - A generic filter tree node,
 *    * `'columnFilters'` - A special {@link FilterTree} containing _column filter_ subexpressions
 *    * `'columnFilter'` -  A special {@link FilterTree} containing homogeneous _column filter_ expressions (all referencing the same column on the left side of their dyadic expressions).
 * 2. The data type of a {@link FilterLeaf} (terminal) node.
 *
 * @property {menuItem[]} [treeOpMenu=conditionals.defaultOpMenu] -  Default operator menu for all descendant leaf nodes.
 *
 * @property {object} [typeOpMenu] - A hash of type names. Each member thus defined contains a specific operator menu for all descendant leaf nodes that:
 * 1. do not have their own operator menu (`opMenu` property) of their own; and
 * 2. whose columns resolve to that type.
 *
 * The type is determined by (in priority order):
 * 1. the `type` property of the {@link FilterLeaf}; or
 * 2. the `type` property of the element in the nearest node (including the leaf node itself) that has a defined `ownSchema` or `schema` array property with an element having a matching column name.
 *
 * @property {HTMLElement} el - The DOM element created by the `render` method to represent this node. Contains the `el`s for all child nodes (which are themselves pointed to by those nodes). This is always generated but is only in the page DOM if you put it there.
 */

var FilterNode = Base.extend({

    initialize: function(options) {
        var self = this,
            state = options && options.state && parseStateString(options.state),
            parent = options && options.parent;

        this.state = state;
        this.parent = parent;
        this.root = parent && parent.root || this;

        this.root.stylesheet = this.root.stylesheet ||
            cssInjector(options && options.cssStylesheetReferenceElement);

        // create each standard option from `options` or `state` or `parent` (wherever it's defined first, if anywhere)
        _(FilterNode.optionsSchema).each(function(optionSchema, key) {
            if (!self.hasOwnProperty(key) && !optionSchema.ignore) {
                var option = options && options[key] ||
                    state && state[key] ||
                    !optionSchema.own && (
                        parent && parent[key] || // reference parent value now so we don't have to search up the tree later
                        optionSchema.default
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
                var el = template('removeButton');
                el.addEventListener('click', this.remove.bind(this));
                newListItem.appendChild(el);
            }

            newListItem.appendChild(this.el);

            this.parent.el.querySelector(CHILDREN_TAG).appendChild(newListItem);
        }
    },

    setState: function(state, options) {
        var oldEl = this.el;
        this.state = parseStateString(state, options);
        this.createView();
        this.loadState();
        this.render();
        if (oldEl) {
            var newEl = this.el;
            if (this.parent) {
                oldEl = oldEl.parentNode;
                newEl = newEl.parentNode;
            }
            oldEl.parentNode.replaceChild(newEl, oldEl);
        }
    },

    /** Remove both:
     * * `this` filter node from it's `parent`'s `children` collection; and
     * * `this` filter node's `el`'s container (always a `<li>` element) from its parent element.
     */
    remove: function() {
        var node = this.parent;
        if (node) {
            if (this.eventHandler) {
                this.eventHandler({ type: 'delete' });
            }
            if (node.persist || node.children.length > 1) {
                this.el.parentNode.remove(); // always the containing <li> tag
                node.children.splice(node.children.indexOf(this), 1);
            } else {
                node.remove();
            }
        }
    }
});

FilterNode.optionsSchema = {

    cssStylesheetReferenceElement: { ignore: true },

    /** @summary Default column schema for column drop-downs of direct descendant leaf nodes only.
     * @desc > This docs entry describes a property in the FilterNode prototype. It does not describe the optionsSchema property (despite it's position in the source code).
     * @type {string[]}
     * @memberOf FilterNode.prototype
     */
    ownSchema: { own: true },

    /** @summary Default column schema for column drop-downs of all descendant leaf nodes.
     * @desc > This docs entry describes a property in the FilterNode prototype. It does not describe the optionsSchema property (despite it's position in the source code).
     * @type {menuItem[]}
     * @memberOf FilterNode.prototype
     */
    schema: {},

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

    type: { own: true },

    persist: { own: true },

    /** @summary Override operator list at any node.
     * @desc > This docs entry describes a property in the FilterNode prototype. It does not describe the optionsSchema property (despite it's position in the source code).
     * @type {string[]}
     * @memberOf FilterNode.prototype
     */
    treeOpMenu: { default: conditionals.defaultOpMenu },

    typeOpMenu: {},

    sortColumnMenu: {}
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

/**
 *
 * @param {undefined|string|object} state - May be one of:
 * * Filter-tree state object:
 *   Return as is.
 * * String representation of filter-tree state object (JSON or SQL, auto-detected):
 *   Parse the string and return an actual filter-tree state object.
 * * String CSS selector (auto-detected) of a HTML form control with a `value` containing the above:
 *   Parse `value` and return an actual filter-tree state object.
 * * `undefined` (or any other falsy value):
 *   Return as is. (Undefined state represents an new empty FilterNode object.)
 *
 * @param {object} [options.syntax] - May be `'JSON'` or `'SQL'` to override auto-detection
 *
 * @returns {object} filter-tree state object; or throws error if unknown or invalid syntax
 */
function parseStateString(state, options) {
    if (state) {
        if (typeof state === 'string') {
            if (reSelector.test(state)) {
                state = document.querySelector(state).value;
            }

            var syntax = options && options.syntax ||
                reJSON.test(state) && 'JSON';

            switch (syntax) {
                case 'JSON':
                    try {
                        state = JSON.parse(state);
                    } catch (error) {
                        throw new FilterTreeError('JSON parser: ' + error);
                    }
                    break;
                case 'SQL':
                    try {
                        state = sqlWhereParse(state, options);
                    } catch (error) {
                        throw new FilterTreeError('SQL WHERE clause parser: ' + error);
                    }
                    break;
            }
        }

        if (typeof state !== 'object') {
            throw new FilterTreeError('Unexpected input state.');
        }
    }

    return state;
}

module.exports = FilterNode;
