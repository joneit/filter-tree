/* eslint-env browser */

'use strict';

var _ = require('object-iterators');
var extend = require('extend-me'), Base = extend.Base; extend.debug = true;
var popMenu = require('pop-menu');

var cssInjector = require('./css');
var Templates = require('./Templates');
var Conditionals = require('./Conditionals');
var ParserSQL = require('./parser-SQL');


var CHILDREN_TAG = 'OL',
    CHILD_TAG = 'LI';

// JSON-detector: begins _and_ ends with either [ and ] _or_ { and }
var reJSON = /^\s*((\[[^]*\])|(\{[^]*\}))\s*$/;

function FilterTreeError(message, node) {
    this.message = message;
    this.node = node;
}
FilterTreeError.prototype = Object.create(Error.prototype);
FilterTreeError.prototype.name = 'FilterTreeError';

/** @typedef {object} FilterTreeGetStateOptionsObject
 *
 * @summary Object containing options for producing a state object.
 *
 * @desc State is commonly used for two purposes:
 * 1. To persist the filter state so that it can be reloaded later.
 * 2. To send a query to a database engine.
 *
 * @property {boolean} [syntax='object'] - Specify output syntax. One of:
 * * `'object'` - The raw state object produced by {@link https://www.npmjs.com/package/unstrungify|unstrungify} (which calls the nodes' `toJSON()` methods). This is an "essential" version of the node objects themselves.
 * * `'JSON'` - The same "essential" object produced by `JSON.srtringify()` (which also calls the nodes' `toJSON()` methods).
 * * `'SQL'` - The subexpression in SQL conditional syntax. Intended for issuing a SQL query to a data store. This result has no meta-data; do not use to persist filter state.
 *
 * NOTE: Not all available syntaxes include the meta-data.
 */

/** @typedef {object} FilterTreeSetStateOptionsObject
 *
 * @property {boolean} [syntax='auto'] - Specify parser to use on `state`. One of:
 * * `'auto'` - Auto-detect; see {@link FilterNode~parseStateString} for algorithm.
 * * `'object'` - The raw state object produced by {@link https://www.npmjs.com/package/unstrungify|unstrungify} (which calls the nodes' `toJSON()` methods). This is an "essential" version of the node objects themselves.
 * * `'JSON'` - The same "essential" object produced by `JSON.srtringify()` (which also calls the nodes' `toJSON()` methods).
 * * `'SQL'` - The subexpression in SQL conditional syntax. Intended for issuing a SQL query to a data store. This result has no meta-data; do not use to persist filter state.
 *
 * @param {Element} [context] If defined, reassign input from the `value` property of the `HTMLElement` selected using the provided input as a selector.
 */

/** @typedef {object} FilterTreeOptionsObject
 *
 * @property {menuItem[]} [schema] - A default list of column names for field drop-downs of all descendant terminal nodes. Overrides `options.state.schema` (see). May be defined for any node and pertains to all descendants of that node (including terminal nodes). If omitted (and no `ownSchema`), will use the nearest ancestor `schema` definition. However, descendants with their own definition of `types` will override any ancestor definition.
 *
 * > Typically only used by the caller for the top-level (root) tree.
 *
 * @property {menuItem[]} [ownSchema] - A default list of column names for field drop-downs of immediate descendant terminal nodes _only_. Overrides `options.state.ownSchema` (see).
 *
 * Although both `options.schema` and `options.ownSchema` are notated as optional herein, by the time a terminal node tries to render a schema drop-down, a `schema` list should be defined through (in order of priority):
 *
 * * Terminal node's own `options.schema` (or `options.state.schema`) definition.
 * * Terminal node's parent node's `option.ownSchema` (or `option.state.nodesFields`) definition.
 * * Terminal node's parent (or any ancestor) node's `options.schema` (or `options.state.schema`) definition.
 *
 * @property {FilterTreeStateObject} [state] - A data structure that describes a tree, subtree, or leaf (terminal node). If undefined, loads an empty filter, which is a `FilterTree` node consisting the default `operator` value (`'op-and'`).
 *
 * @property {function} [editor='Default'] - The name of the conditional expression's UI "editor." This name must be registered in the parent node's {@link FilterTree#editors|editors} hash, where it maps to a leaf constructor (`FilterLeaf` or a descendant thereof). (Use {@link FilterTree#addEditor} to register new editors.)
 *
 * @property {FilterTree} [parent] - Used internally to insert element when creating nested subtrees. The only time it may be (and must be) omitted is when creating the root node.
 *
 * @property {string|HTMLElement} [cssStylesheetReferenceElement] - passed to cssInsert
 */

/** @typedef {object|string} FilterTreeStateObject
 *
 * @summary State with which to create a new node or replace an existing node.
 *
 * @desc A string or plain object that describes a filter-tree node. If a string, it is parsed into an object by {@link FilterNode~parseStateString}. (See, for available overloads.)
 *
 * The resulting object may be a flat object that describes a terminal node or a childless root or branch node; or may be a hierarchical object to define an entire tree or subtree.
 *
 * In any case, the resulting object may have any of the following properties:
 *
 * @property {menuItem[]} [schema] - See `schema` property of {@link FilterTreeOptionsObject}.
 *
 * @property {string} [editor='Default'] - See `editor` property of {@link FilterTreeOptionsObject}.
 *
 * @property misc - Other miscellaneous properties will be copied directly to the new `FitlerNode` object. (The name "misc" here is just a stand-in; there is no specific property called "misc".)
 *
 * * May describe a non-terminal node with properties:
 *   * `schema` - Overridden on instantiation by `options.schema`. If both unspecified, uses parent's definition.
 *   * `operator` - One of {@link treeOperators}.
 *   * `children` -  Array containing additional terminal and non-terminal nodes.
 *
 * The constructor auto-detects `state`'s type:
 *  * JSON string to be parsed by `JSON.parse()` into a plain object
 *  * SQL WHERE clause string to be parsed into a plain object
 *  * CSS selector of an Element whose `value` contains one of the above
 *  * plain object
 */

/**
 * @constructor
 *
 * @summary A node in a filter tree.
 *
 * @description A filter tree represents a _complex conditional expression_ and consists of a single instance of a {@link FilterTree} object as the _root_ of an _n_-ary tree.
 *
 * Filter trees are comprised of instances of `FilterNode` objects. However, the `FilterNode` constructor is an "abstract class"; filter node objects are never instantiated directly from this constructor. A filter tree is actually comprised of instances of two "subclasses" of `FilterNode` objects:
 * * {@link FilterTree} (or subclass thereof) objects, instances of which represent the root node and all the branch nodes:
 *   * There is always exactly one root node, containing the whole filter tree, which represents the filter expression in its entirety. The root node is distinguished by having no parent node.
 *   * There are zero or more branch nodes, or subtrees, which are child nodes of the root or other branches higher up in the tree, representing subexpressions within the larger filter expression. Each branch node has exactly one parent node.
 *   * These nodes point to zero or more child nodes which are either nested subtrees, or:
 * * {@link FilterLeaf} (or subclass thereof) objects, each instance of which represents a single simple conditional expression. These are terminal nodes, having exactly one parent node, and no child nodes.
 *
 * The programmer may extend the semantics of filter trees by extending the above objects.
 *
 * @property {FilterNode} [parent] - Undefined means this is the root node.
 *
 * @property {FilterNode} root - Convenience reference to the root node.
 *
 * @property {menuItem[]} schema - Column schema used by descendant leaf nodes (including this node if it is a leaf node) to render a column choice drop-down.
 *
 * @property {string} [editor] - Name of filter editor used by descendant leaf nodes (including this node if it is a leaf node).
 *
 * @property {function} [eventHandler] - Event handler for UI events. See *Events* in the {@link http://joneit.github.io/filter-tree/index.html|readme} for more information.
 *
 * @property {menuItem[]} [treeOpMenu=Conditionals.defaultOpMenu] - Default operator menu for all descendant leaf nodes. Only used if the leaf node has no defined `opMenu` property _and_ there is no menu defined in `typeOpMenus` keyed to the column's `type`.
 *
 * @property {object} [typeOpMenu] - A hash of type names. Each member thus defined contains a specific operator menu for all descendant leaf nodes that:
 * 1. do not have their own operator menu (`opMenu` property) of their own; and
 * 2. whose columns resolve to that type.
 *
 * The type is determined by (in priority order):
 * 1. the `type` property of the {@link FilterLeaf}; or
 * 2. the `type` property of the element in the nearest node (including the leaf node itself) that has a defined `ownSchema` or `schema` array property with an element having a matching column name.
 *
 * @property {sqlIdQtsObject} [sqlIdQts={beg:'"',end:'"'}] - Quote characters for SQL identifiers. Used for both parsing and generating SQL. Should be placed on the root node.
 *
 * @property {HTMLElement} el - The DOM element created by the `render` method to represent this node. Contains the `el`s for all child nodes (which are themselves pointed to by those nodes). This is always generated but is only in the page DOM if you put it there.
 */

var FilterNode = Base.extend('FilterNode', {

    /**
     * @summary Create a new node or subtree.
     * @desc Typically used by the application layer to create the entire filter tree.
     *
     * If your app wants to make use of the generated UI, you are responsible for inserting the top-level `.el` into the DOM.
     *
     * @param {FilterTreeStateObject|FilterTreeOptionsObject} [optionsOrState] - The node state; or an options object possibly containing `state` among other options. Although you can instantiate a filter without specifying any options, this is generally not be very useful. See *Instantiating a filter* in the {@link http://joneit.github.io/filter-tree/index.html|readme} for a practical discussion of minimum options.
     *
     * * @memberOf FilterNode.prototype
     */
    initialize: function(optionsOrState) {
        var self = this,
            isObject = typeof optionsOrState === 'object',
            isOptions = isObject && !optionsOrState.children,
            options = isOptions && optionsOrState || {},
            state = isOptions && options.state || // options object with state property
                (!isObject || optionsOrState.children) && optionsOrState, // state string or object
            parent = this.parent = options.parent;

        this.root = parent && parent.root || this;

        if (state) {
            this.state = this.parseStateString(state, options);
        }

        this.root.stylesheet = this.root.stylesheet ||
            cssInjector(options.cssStylesheetReferenceElement);

        // Create each standard option from `options` or `state` or `parent` in that priority order.
        _(FilterNode.optionsSchema).each(function(optionSchema, key) {
            if (!self.hasOwnProperty(key) && !optionSchema.ignore) {
                var option = options[key] ||
                    state && state[key] ||
                    !optionSchema.own && (
                        parent && parent[key] || // reference parent value now so we don't have to search up the tree later
                        optionSchema.default
                    );

                if (option) {
                    if (key === 'schema') {
                        // attach the `walk` and `find` convenience methods to the `schema` array
                        option.walk = popMenu.walk.bind(option);
                        option.findItem = popMenu.findItem.bind(option);
                    }
                    self[key] = option;
                }
            }
        });

        // copy all remaining options directly to the new instance, overriding prototype members of the same name
        _(options).each(function(value, key) {
            if (!FilterNode.optionsSchema[key]) {
                self[key] = value;
            }
        });

        if (this === this.root) {
            var options = {};

            if (this.sqlIdQts) {
                options.sqlIdQts = this.sqlIdQts;
            }

            this.conditionals = new Conditionals(options);

            options.schema = this.schema;
            options.resolveAliases = true;
            this.ParserSQL = new ParserSQL(options);
        }

        this.setState(state, options);
    },

    /** Insert each subtree into its parent node along with a "delete" button.
     * > The root tree (which has no parent) is inserted into the DOM by the instantiating code (without a delete button).
     * @memberOf FilterNode.prototype
     */
    render: function() {
        if (this.parent) {
            var newListItem = document.createElement(CHILD_TAG);

            if (this.notesEl) {
                newListItem.appendChild(this.notesEl);
            }

            if (!(this.state && this.state.locked)) {
                var el = this.templates.get('removeButton');
                el.addEventListener('click', this.remove.bind(this));
                newListItem.appendChild(el);
            }

            newListItem.appendChild(this.el);

            this.parent.el.querySelector(CHILDREN_TAG).appendChild(newListItem);
        }
    },

    /**
     *
     * @param {FilterTreeStateObject} state
     * @param {FilterTreeSetStateOptionsObject} [options]
     * @memberOf FilterNode.prototype
     */
    setState: function(state, options) {
        var oldEl = this.el;
        this.state = this.parseStateString(state, options);
        this.createView();
        this.loadState();
        this.render();
        if (oldEl) {
            var newEl = this.el;
            if (this.parent && oldEl.parentElement.tagName === 'LI') {
                oldEl = oldEl.parentNode;
                newEl = newEl.parentNode;
            }
            oldEl.parentNode.replaceChild(newEl, oldEl);
        }
    },


    /**
     * @summary Convert a string to a state object.
     *
     * @desc They string's syntax is inferred as follows:
     * 1. If state is undefined or already an object, return as is.
     * 2. If `options.context` is defined, `state` is assumed to be a CSS selector string (auto-detected) pointing to an HTML form control with a `value` property, such as a {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement HTMLInputElement} or a {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLTextAreaElement HTMLTextAreaElement}. The element is selected and if found, its value is fetched from the DOM and assigned to `state`.
     * 3. If `options.syntax` is `'auto'`, JSON syntax is detected if `state` begins _and_ ends with either `[` and `]` _or_ `{` and `}` (ignoring leading and trailing white space).
     * 4. If JSON syntax, parse the string into an actual `FilterTreeStateObject` using {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse|JSON.parse} and throw an error if unparsable.
     * 5. If not JSON, parse the string as SQL into an actual `FilterTreeStateObject` using parser-SQL's {@link ParserSQL#parser|parser} and throw an error if unparsable.
     *
     * @param {FilterTreeStateObject} [state]
     * @param {FilterTreeSetStateOptionsObject} [options]
     *
     * @returns {FilterTreeStateObject} The unmolested `state` parameter. Throws an error if `state` is unknown or invalid syntax.
     *
     * @memberOf FilterNode
     * @inner
     */
    parseStateString: function(state, options) {
        if (state) {
            if (typeof state === 'string') {
                var context = options && options.context,
                    syntax = options && options.syntax || 'auto'; // default is 'auto'

                if (context) {
                    state = context.querySelector(state).value;
                }

                if (syntax === 'auto') {
                    syntax = reJSON.test(state) ? 'JSON' : 'SQL';
                }

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
                            state = this.root.ParserSQL.parse(state);
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
    },

    /** Remove both:
     * * `this` filter node from it's `parent`'s `children` collection; and
     * * `this` filter node's `el`'s container (always a `<li>` element) from its parent element.
     * @memberOf FilterNode.prototype
     */
    remove: function() {
        var avert,
            parent = this.parent;

        if (parent) {
            if (this.eventHandler) {
                this.eventHandler.call(parent, {
                    type: 'delete',
                    preventDefault: function() { avert = true; }
                });
            }
            if (!avert) {
                if (
                    parent.keep || // never "prune" (remove if empty) this particular subexpression
                    parent.children.length > 1 // this node has siblings so will not be empty after this remove
                ) {
                    // proceed with remove
                    this.el.parentNode.remove(); // the parent is always the containing <li> tag
                    parent.children.splice(parent.children.indexOf(this), 1);
                } else {
                    // recurse to prune entire subexpression because it's prune-able and would end up empty (childless)
                    parent.remove();
                }
            }
        }
    },

    Error: FilterTreeError,

    templates: new Templates()
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

    keep: { own: true },

    /** @summary Override operator list at any node.
     * @desc > This docs entry describes a property in the FilterNode prototype. It does not describe the optionsSchema property (despite it's position in the source code).
     * @type {string[]}
     * @memberOf FilterNode.prototype
     */
    treeOpMenu: { default: Conditionals.defaultOpMenu },

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
