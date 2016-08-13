/* eslint-env browser */

// This is the main file, usable as is, such as by /test/index.js.

// For npm: require this file
// For CDN: gulpfile.js browserifies this file with sourcemap to /build/filter-tree.js and uglified without sourcemap to /build/filter-tree.min.js. The CDN is https://joneit.github.io/filter-tree.

'use strict';

var popMenu = require('pop-menu');
var unstrungify = require('unstrungify');

var _ = require('object-iterators');
var FilterNode = require('./FilterNode');
var FilterLeaf = require('./FilterLeaf');
var operators = require('./tree-operators');


var ordinal = 0;

/** @constructor
 * @summary An object that represents the root node or a branch node in a filter tree.
 * @desc A node representing a subexpression in the filter expression. May be thought of as a parenthesized subexpression in algebraic expression syntax. As discussed under {@link FilterNode}, a `FilterTree` instance's child nodes may be either:
 * * Other (nested) `FilterTree` (or subclass thereof) nodes representing subexpressions.
 * * {@link FilterLeaf} (or subclass thereof) terminal nodes representing conditional expressions.
 *
 * The `FilterTree` object also has methods, some of which operate on a specific subtree instance, and some of which recurse through all the subtree's child nodes and all their descendants, _etc._
 *
 * The recursive methods are interesting. They all work similarly, looping through the list of child nodes, recursing when the child node is a nested subtree (which will recurse further when it has its own nested subtrees); and calling the polymorphic method when the child node is a `FilterLeaf` object, which is a terminal node. Such polymorphic methods include `setState()`, `getState()`, `invalid()`, and `test()`.
 *
 * For example, calling `test(dataRow)` on the root tree recurses through any subtrees eventually calling `test(dataRow)` on each of its leaf nodes and concatenating the results together using the subtree's `operator`. The subtree's `test(dataRow)` call then returns the result to it's parent's `test()` call, _etc.,_ eventually bubbling up to the root node's `test(dataRow)` call, which returns the final result to the original caller. This result determines if the given data row passed through the entire filter expression successfully (`true`) and should be displayed, or was blocked somewhere (`false`) and should not be displayed.
 *
 * Note that in practice:
 * 1. `children` may be empty. This represents a an empty subexpression. Normally pointless, empty subexpressions could be pruned. Filter-tree allows them however as harmless placeholders.
 * 1. `operator` may be omitted in which case it defaults to AND.
 * 1. A `false` result from a child node will short-stop an AND operation; a `true` result will short-stop an OR or NOR operation.
 *
 * Additional notes:
 * 1. A `FilterTree` may consist of a single leaf, in which case the concatenation `operator` is not needed and may be left undefined. However, if a second child is added and the operator is still undefined, it will be set to the default (`'op-and'`).
 * 2. The order of the children is undefined as all operators are commutative. For the '`op-or`' operator, evaluation ceases on the first positive result and for efficiency, all simple conditional expressions will be evaluated before any complex subexpressions.
 * 3. A nested `FilterTree` is distinguished (duck-typed) from a leaf node by the presence of a `children` member.
 * 4. Nesting a `FilterTree` containing a single child is valid (albeit pointless).
 *
 * **See also the properties of the superclass:** {@link FilterNode}
 *
 * @property {string} [operator='op-and'] - The operator that concatentates the test results from all the node's `children` (child nodes). Must be one of:
 * * `'op-and'`
 * * `'op-or'`
 * * `'op-nor'`
 *
 * Note that there is only one `operator` per subexpression. If you need to mix operators, create a subordinate subexpression as one of the child nodes.
 *
 * @property {FilterNode[]} children - A list of descendants of this node. As noted, these may be other `FilterTree` (or subclass thereof) nodes; or may be terminal `FilterLeaf` (or subclass thereof) nodes. May be any length including 0 (none; empty).
 *
 * @property {boolean} [keep=false] - Do not automatically prune when last child removed.
 *
 * @property {fieldItem[]} [ownSchema] - Column menu to be used only by leaf nodes that are children (direct descendants) of this node.
 *
 * @property {string} [type='subtree'] - Type of node, for rendering purposes; names the rendering template to use to generate the node's UI representation.
 */
var FilterTree = FilterNode.extend('FilterTree', {

    /**
     * Hash of constructors for objects that extend from {@link FilterLeaf}, which is the `Default` member here.
     *
     * Add additional editors to this object (in the prototype) prior to instantiating a leaf node that refers to it. This object exists in the prototype and additions to it will affect all nodes that don't have their an "own" hash.
     *
     * If you create an "own" hash in your instance be sure to include the default editor, for example: `{ Default: FilterTree.prototype.editors.Default, ... }`. (One way of overriding would be to include such an object in an `editors` member of the options object passed to the constructor on instantiation. This works because all miscellaneous members are simply copied to the new instance. Not to be confused with the standard option `editor` which is a string containing a key from this hash and tells the leaf node what type to use.)
     */
    editors: {
        Default: FilterLeaf
    },

    /**
     * An extension is a hash of prototype overrides (methods, properties) used to extend the default editor.
     * @param {string} [key='Default'] - Nme of the new extension given in `ext` or name of an existing extension in `FilterTree.extensions`. As a constructor, should have an initial capital. If omitted, replaces the default editor (FilterLeaf).
     * @param {object} [ext] An extension hash
     * @param {FilerLeaf} [BaseEditor=this.editors.Default] - Constructor to extend from.
     * @returns {FillterLeaf} A new class extended from `BaseEditor` -- which is initially `FilterLeaf` but may itself have been extended by a call to `.addEditor('Default', extension)`.
     */
    addEditor: function(key, ext, BaseEditor) {
        if (typeof key === 'object') {
            // `key` (string) was omitted
            BaseEditor = ext;
            ext = key;
            key = 'Default';
        }
        BaseEditor = BaseEditor || this.editors.Default;
        ext = ext || FilterTree.extensions[key];
        return (this.editors[key] = BaseEditor.extend(key, ext));
    },

    /**
     * @param {string} key - The name of the existing editor to remove.
     * @memberOf FilterTree#
     */
    removeEditor: function(key) {
        if (key === 'Default') {
            throw 'Cannot remove default editor.';
        }
        delete this.editors[key];
    },

    /**
     *
     * @memberOf FilterTree#
     */
    createView: function() {
        this.el = this.templates.get(
            this.type || 'subtree',
            ++ordinal,
            this.schema[0] && popMenu.formatItem(this.schema[0])
        );

        // Add the expression editors to the "add new" drop-down
        var addNewCtrl = this.el.querySelector(':scope>select');
        if (addNewCtrl) {
            var submenu, optgroup,
                editors = this.editors;

            if (addNewCtrl.length === 1 && this.editors.length === 1) {
                // this editor is the only option besides the null prompt option
                // so make it th eonly item i the drop-down
                submenu = addNewCtrl;
            } else {
                // there are already options and/or multiple editors
                submenu = optgroup = document.createElement('optgroup');
                optgroup.label = 'Conditional Expressions';
            }
            Object.keys(editors).forEach(function(key) {
                var name = editors[key].prototype.name || key;
                submenu.appendChild(new Option(name, key));
            });
            if (optgroup) {
                addNewCtrl.add(optgroup);
            }
            this.el.addEventListener('change', onchange.bind(this));
        }

        this.el.addEventListener('click', onTreeOpClick.bind(this));
    },

    /**
     *
     * @memberOf FilterTree#
     */
    loadState: function(state) {
        this.operator = 'op-and';
        this.children = [];

        if (!state) {
            this.add();
        } else {
            // Validate `state.children` (required)
            if (!(state.children instanceof Array)) {
                throw new this.Error('Expected `children` property to be an array.');
            }

            // Validate `state.operator` (if given)
            if (state.operator) {
                if (!operators[state.operator]) {
                    throw new this.Error('Expected `operator` property to be one of: ' + Object.keys(operators));
                }

                this.operator = state.operator;
            }

            state.children.forEach(this.add.bind(this));
        }
    },

    /**
     *
     * @memberOf FilterTree#
     */
    render: function() {
        var radioButton = this.el.querySelector(':scope > label > input[value=' + this.operator + ']'),
            addFilterLink = this.el.querySelector('.filter-tree-add-conditional');

        if (radioButton) {
            radioButton.checked = true;
            onTreeOpClick.call(this, {
                target: radioButton
            });
        }

        // when multiple filter editors available, simulate click on the new "add conditional" link
        if (addFilterLink && !this.children.length && Object.keys(this.editors).length > 1) {
            this['filter-tree-add-conditional']({
                target: addFilterLink
            });
        }

        // proceed with render
        FilterNode.prototype.render.call(this);
    },

    /**
     * @summary Create a new node as per `state`.
     *
     * @param {object} [options={state:{}}] - May be one of:
     *
     * * an `options` object containing a `state` property
     * * a `state` object (in which case there is no `options` object)
     *
     * In any case, resulting `state` object may be either...
     * * A new subtree (has a `children` property):
     *   Add a new `FilterTree` node.
     * * A new leaf (no `children` property): add a new `FilterLeaf` node:
     *   * If there is an `editor` property:
     *     Add leaf using `this.editors[state.editor]`.
     *   * Otherwise (including the case where `state` is undefined):
     *     Add leaf using `this.editors.Default`.
     *
     * @param {boolean} [options.focus=false] Call invalid() after inserting to focus on first blank control (if any).
     *
     * @returns {FilterNode} The new node.
     *
     * @memberOf FilterTree#
     */
    add: function(options) {
        var Constructor, newNode;

        options = options || {};

        if (!options.state) {
            options = { state: options };
        }

        if (options.state.children) {
            Constructor = this.constructor;
        } else {
            Constructor = this.editors[options.state.editor || 'Default'];
        }

        options.parent = this;
        newNode = new Constructor(options);
        this.children.push(newNode);

        if (options.focus) {
            // focus on blank control a beat after adding it
            setTimeout(function() { newNode.invalid(options); }, 750);
        }

        return newNode;
    },

    /** @typedef {object} FilterTreeValidationOptionsObject
     * @property {boolean} [throw=false] - Throw (do not catch) `FilterTreeError`s.
     * @property {boolean} [alert=false] - Announce error via window.alert() before returning.
     * @property {boolean} [focus=false] - Place the focus on the offending control and give it error color.
     */

    /**
     * @param {FilterTreeValidationOptionsObject} [options]
     * @returns {undefined|FilterTreeError} `undefined` if valid; or the caught `FilterTreeError` if error.
     * @memberOf FilterTree#
     */
    invalid: function(options) {
        options = options || {};

        var result, throwWas;

        throwWas = options.throw;
        options.throw = true;

        try {
            invalid.call(this, options);
        } catch (err) {
            result = err;

            // Throw when unexpected (not a filter tree error)
            if (!(err instanceof this.Error)) {
                throw err;
            }
        }

        options.throw = throwWas;

        // Alter and/or throw when requested
        if (result) {
            if (options.alert) {
                window.alert(result.message || result); // eslint-disable-line no-alert
            }
            if (options.throw) {
                throw result;
            }
        }

        return result;
    },

    /**
     *
     * @param dataRow
     * @returns {boolean}
     * @memberOf FilterTree#
     */
    test: function test(dataRow) {
        var operator = operators[this.operator],
            result = operator.seed,
            noChildrenDefined = true;

        this.children.find(function(child) {
            if (child) {
                noChildrenDefined = false;
                if (child instanceof FilterLeaf) {
                    result = operator.reduce(result, child.test(dataRow));
                } else if (child.children.length) {
                    result = operator.reduce(result, test.call(child, dataRow));
                }
                return result === operator.abort;
            }

            return false;
        });

        return noChildrenDefined || (operator.negate ? !result : result);
    },

    /**
     * @returns {number} Number of filters (terminal nodes) defined in this subtree.
     */
    filterCount: function filterCount() {
        var n = 0;

        this.children.forEach(function(child) {
            n += child instanceof FilterLeaf ? 1 : filterCount.call(child);
        });

        return n;
    },

    /** @typedef {object} FilterTreeGetStateOptionsObject
     *
     * @summary Object containing options for producing a state object.
     *
     * @desc State is commonly used for two purposes:
     * 1. To persist the filter state so that it can be reloaded later.
     * 2. To send a query to a database engine.
     *
     * @property {boolean} [syntax='object'] - A case-sensitive string indicating the expected type and format of a state object to be generated from a filter tree. One of:
     * * `'object'` (default) A raw state object produced by walking the tree using `{@link https://www.npmjs.com/package/unstrungify|unstrungify()}`, respecting `JSON.stringify()`'s "{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON()_behavior|toJSON() behavior}," and returning a plain object suitable for resubmitting to {@link FilterNode#setState|setState}. This is an "essential" version of the actual node objects in the tree.
     * * `'JSON'` - A stringified state object produced by walking the tree using `{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON()_behavior|JSON.stringify()}`, returning a JSON string by calling `toJSON` at every node. This is a string representation of the same "essential" object as that produced by the `'object'` option, but "stringified" and therefore suitable for text-based storage media.
     * * `'SQL'` - The subexpression in SQL conditional syntax produced by walking the tree and returning a SQL [search condition expression]{@link https://msdn.microsoft.com/en-us/library/ms173545.aspx}. Suitable for use in the WHERE clause of a SQL `SELECT` statement used to query a database for a filtered result set.
     *
     * @param {number|string} [space] - When `options.syntax === 'JSON'`, forwarded to `JSON.stringify` as the third parameter, `space` (see).
     *
     * NOTE: The SQL syntax result cannot accommodate node meta-data. While meta-data such as `type` typically comes from the column schema, meta-data can be installed directly on a node. Such meta-data will not be part of the resulting SQL expression. For this reason, SQL should not be used to persist filter state but rather its use should be limited to generating a filter query for a remote data server.
     */

    /**
     * @summary Get a representation of filter state.
     * @desc Calling this on the root will get the entire tree's state; calling this on any subtree will get just that subtree's state.
     *
     * Only _essential_ properties will be output:
     *
     * 1. `FilterTree` nodes will output at least 2 properties:
     *    * `operator`
     *    * `children`
     * 2. `FilterLeaf` nodes will output (via {@link FilterLeaf#getState|getState}) at least 3 properties, one property for each item in it's `view`:
     *    * `column`
     *    * `operator`
     *    * `operand`
     * 3. Additional node properties will be output when:
     *    1. When the property was **NOT** externally sourced:
     *       1. Did *not* come from the `options` object on node instantiation.
     *       2. Did *not* come from the options schema `default` object, if any.
     *    2. **AND** at least one of the following is true:
     *       1. When it's an "own" property.
     *       2. When its value differs from it's parent's.
     *       3. When this is the root node.
     *
     * @param {FilterTreeGetStateOptionsObject} [options]
     * @param {object} [options.sqlIdQts] - When `options.syntax === 'SQL'`, forwarded to `conditionals.pushSqlIdQts()`.
     * @returns {object|string} Returns object when `options.syntax === 'object'`; otherwise returns string.
     * @memberOf FilterTree#
     */
    getState: function getState(options) {
        var result = '',
            syntax = options && options.syntax || 'object';

        switch (syntax) {
            case 'object':
                result = unstrungify.call(this);
                break;

            case 'JSON':
                result = JSON.stringify(this, null, options && options.space) || '';
                break;

            case 'SQL':
                var lexeme = operators[this.operator].SQL;

                this.children.forEach(function(child, idx) {
                    var op = idx ? ' ' + lexeme.op + ' ' : '';
                    if (child instanceof FilterLeaf) {
                        result += op + child.getState(options);
                    } else if (child.children.length) {
                        result += op + getState.call(child, options);
                    }
                });

                if (result) {
                    result = lexeme.beg + result + lexeme.end;
                }
                break;

            default:
                throw new this.Error('Unknown syntax option "' + syntax + '"');
        }

        return result;
    },

    toJSON: function toJSON() {
        var self = this,
            state = {
                operator: this.operator,
                children: []
            };

        this.children.forEach(function(child) {
            state.children.push(child instanceof FilterLeaf ? child : toJSON.call(child));
        });

        _(FilterNode.optionsSchema).each(function(optionSchema, key) {
            if (
                self[key] && // there is a standard option on the node which may need to be output
                !self.dontPersist[key] && (
                    optionSchema.own || // output because it's an "own" option (belongs to the node)
                    !self.parent || // output because it's the root node
                    self[key] !== self.parent[key] // output because it differs from its parent's version
                )
            ) {
                state[key] = self[key];
            }
        });

        return state;
    },

    /**
     * @summary Set the case sensitivity of filter tests against data.
     * @desc Case sensitivity pertains to string compares only. This includes untyped columns, columns typed as strings, typed columns containing data that cannot be coerced to type or when the filter expression operand cannot be coerced.
     *
     * NOTE: This is a shared property and affects all filter-tree instances constructed by this code instance.
     * @param {boolean} isSensitive
     * @memberOf Filtertree#.prototype
     */
    setCaseSensitivity: function(isSensitive) {
        var toString = isSensitive ? toStringCaseSensitive : toStringCaseInsensitive;
        FilterLeaf.setToString(toString);
    }

});

function toStringCaseInsensitive(s) { return (s + '').toUpperCase(); }
function toStringCaseSensitive(s) { return s + ''; }

// Some event handlers bound to FilterTree object

function onchange(evt) { // called in context
    var ctrl = evt.target;
    if (ctrl.parentElement === this.el) {
        if (ctrl.value === 'subexp') {
            this.children.push(new FilterTree({
                parent: this
            }));
        } else {
            this.add({
                state: { editor: ctrl.value },
                focus: true
            });
        }
        ctrl.selectedIndex = 0;
    }
}

function onTreeOpClick(evt) { // called in context
    var ctrl = evt.target;

    if (ctrl.className === 'filter-tree-op-choice') {
        this.operator = ctrl.value;

        // display strike-through
        var radioButtons = this.el.querySelectorAll('label>input.filter-tree-op-choice[name=' + ctrl.name + ']');
        Array.prototype.forEach.call(radioButtons, function(ctrl) {
            ctrl.parentElement.style.textDecoration = ctrl.checked ? 'none' : 'line-through';
        });

        // display operator between filters by adding operator string as a CSS class of this tree
        for (var key in operators) {
            this.el.classList.remove(key);
        }
        this.el.classList.add(this.operator);
    }
}

/**
 * Throws error if invalid expression tree.
 * Caught by {@link FilterTree#invalid|FilterTree.prototype.invalid()}.
 * @param {boolean} [options.focus=false] - Move focus to offending control.
 * @returns {undefined} if valid
 * @private
 */
function invalid(options) { // called in context
    //if (this instanceof FilterTree && !this.children.length) {
    //    throw new this.Error('Empty subexpression (no filters).');
    //}

    this.children.forEach(function(child) {
        if (child instanceof FilterLeaf) {
            child.invalid(options);
        } else if (child.children.length) {
            invalid.call(child, options);
        }
    });
}

FilterTree.extensions = {
    Columns: require('./extensions/columns')
};

// module initialization
FilterTree.prototype.setCaseSensitivity(true);  // default is case-sensitive which is more efficient; may be reset at will


module.exports = FilterTree;
