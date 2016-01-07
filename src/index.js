/* eslint-env browser */

// This is the main file, usable as is, such as by /test/index.js.
// For npm: gulpfile.js copies this file to ../index.js, adjusting the require paths and defining the `css` local.
// For CDN: gulpfile.js then browserifies ../index.js with sourcemap to /build/filter-tree.js and uglified without sourcemap to /build/filter-tree.min.js. The CDN is https://joneit.github.io/filter-tree.

'use strict';

var cssInjector = require('./js/css');
var FilterNode = require('./js/FilterNode');
var DefaultFilter = require('./js/FilterLeaf');
var template = require('./js/template');
var operators = require('./js/tree-operators');

var ordinal = 0;
var reFilterTreeErrorString = /^filter-tree: /;

/** @constructor
 *
 * @summary A node in a filter tree (including the root node), representing a complex filter expression.
 *
 * @desc A `FilterTree` is an n-ary tree with a single `operator` to be applied to all its `children`.
 *
 * Also known as a "subtree" or a "subexpression".
 *
 * Each of the `children` can be either:
 *
 * * a terminal node `Filter` (or an object inheriting from `Filter`) representing a simple conditional expression; or
 * * a nested `FilterTree` representing a complex subexpression.
 *
 * The `operator` must be one of the {@link operators|tree operators} or may be left undefined iff there is only one child node.
 *
 * Notes:
 * 1. A `FilterTree` may consist of a single leaf, in which case the `operator` is not used and may be left undefined. However, if a second child is added and the operator is still undefined, it will be set to the default (`'op-and'`).
 * 2. The order of the children is undefined as all operators are commutative. For the '`op-or`' operator, evaluation ceases on the first positive result and for efficiency, all simple conditional expressions will be evaluated before any complex subexpressions.
 * 3. A nested `FilterTree` is distinguished in the JSON object from a `Filter` by the presence of a `children` member.
 * 4. Nesting a `FilterTree` containing a single child is valid (albeit pointless).
 *
 * See {@link FilterNode} for additional `options` properties.
 *
 * @param {object} [options.editors] - Editor hash to override prototype's. These are constructors for objects that extend from `FilterTree.prototype.editors.Default`. Typically, you would include the default editor itself: `{ Default: FilterTree.prototype.editors.Default, ... }`. Alternatively, before instantiating, you might add your additional editors to `FilterTree.prototype.editors` for use by all filter tree objects.
 *
 * @property {FilterTree} parent
 * @property {number} ordinal
 * @property {string} operator
 * @property {FilterNode[]} children - Each one is either a `Filter` (or an object inheriting from `Filter`) or another `FilterTree`..
 * @property {Element} el - The root element of this (sub)tree.
 */
var FilterTree = FilterNode.extend('FilterTree', {

    preInitialize: function(options) {
        cssInjector('filter-tree-base', options && options.cssStylesheetReferenceElement);

        if (options.editors) {
            this.editors = options.editors;
        }
    },

    destroy: function() {
        detachChooser.call(this);
    },

    editors: {
        Default: DefaultFilter
    },

    addEditor: function(key, overrides) {
        if (overrides) {
            this.editors[key] = DefaultFilter.extend(overrides);
        } else {
            delete this.editors[key];
        }
    },

    newView: function() {
        this.el = template('tree', ++ordinal);
        this.el.addEventListener('click', catchClick.bind(this));
    },

    /** @summary Walk tree like `JSON.stringify`.
     * @desc Functionally identical to `JSON.parse(JSON.stringify(this))` but far more efficient, performing `JSON.stringify()`'s [toJSON behavior](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON()_behavior) but skipping the serialization and parse steps.
     * @returns {object} A new object representing `this`.
     */
    getState: function state() {
        var clone, object = typeof this.toJSON === 'function' ? this.toJSON() : this;
        if (object instanceof Array) {
            clone = [];
            object.forEach(function(obj) {
                clone.push(state.call(obj));
            });
        } else  if (typeof object === 'object') {
            clone = {};
            Object.keys(object).forEach(function(key) {
                clone[key] = state.call(object[key]);
            });
        } else {
            clone = object;
        }
        return clone;
    },

    getJSON: function() {
        return JSON.stringify(this, null, this.JSONspace);
    },

    setJSON: function(json) {
        this.setState(JSON.parse(json));
    },

    load: function(state) {
        if (!state) {
            var filterEditorNames = Object.keys(this.editors),
                onlyOneFilterEditor = filterEditorNames.length === 1;
            this.children = onlyOneFilterEditor ? [new this.editors[filterEditorNames[0]]({
                parent: this
            })] : [];
            this.operator = 'op-and';
        } else {
            throwIfJSON(state);

            // Validate `state.operator`
            if (!(operators[state.operator] || state.operator === undefined && state.children.length === 1)) {
                throw FilterNode.Error('Expected `operator` property to be one of: ' + Object.keys(operators));
            }
            this.operator = state.operator;

            // Validate `state.children`
            if (!(state.children instanceof Array && state.children.length)) {
                throw FilterNode.Error('Expected `children` property to be a non-empty array.');
            }
            this.children = [];
            var self = this;
            state.children.forEach(function(state) { // eslint-disable-line no-shadow
                var Constructor;
                if (typeof state !== 'object') {
                    throw self.Error('Expected child to be an object containing either `children`, `editor`, or neither.');
                }
                if (state.children) {
                    Constructor = FilterTree;
                } else {
                    Constructor = self.editors[state.editor || 'Default'];
                }
                self.children.push(new Constructor({
                    state: state,
                    parent: self
                }));
            });
        }
    },

    render: function() {
        // simulate click on the operator to display strike-through and operator between filters
        var radioButton = this.el.querySelector('input[value=' + this.operator + ']');
        radioButton.checked = true;
        this['filter-tree-op-choice']({
            target: radioButton
        });

        // when multiple filter editors available, simulate click on the new "add conditional" link
        if (!this.children.length && Object.keys(this.editors).length > 1) {
            var addFilterLink = this.el.querySelector('.filter-tree-add-filter');
            this['filter-tree-add-filter']({
                target: addFilterLink
            });
        }

        // proceed with render
        FilterNode.prototype.render.call(this);
    },

    'filter-tree-op-choice': function(evt) {
        var radioButton = evt.target;

        this.operator = radioButton.value;

        // display strike-through
        var radioButtons = this.el.querySelectorAll('label>input.filter-tree-op-choice[name=' + radioButton.name + ']');
        Array.prototype.slice.call(radioButtons).forEach(function(radioButton) { // eslint-disable-line no-shadow
            radioButton.parentElement.style.textDecoration = radioButton.checked ? 'none' : 'line-through';
        });

        // display operator between filters by adding operator string as a CSS class of this tree
        for (var key in operators) {
            this.el.classList.remove(key);
        }
        this.el.classList.add(this.operator);
    },

    'filter-tree-add-filter': function(evt) {
        var filterEditorNames = Object.keys(this.editors);
        if (filterEditorNames.length === 1) {
            this.children.push(new this.editors[filterEditorNames[0]]({
                parent: this
            }));
        } else {
            attachChooser.call(this, evt);
        }
    },

    'filter-tree-add': function() {
        this.children.push(new FilterTree({
            parent: this
        }));
    },

    'filter-tree-remove': function(evt) {
        var deleteButton = evt.target,
            listItem = deleteButton.parentElement,
            children = this.children,
            el = deleteButton.nextElementSibling;

        children.forEach(function(child, idx) {
            if (child.el === el) {
                delete children[idx];
                listItem.remove();
            }
        });
    },

    /**
     * @param {boolean} [object.rethrow=false] - Catch (do not throw) the error.
     * @param {boolean} [object.alert=true] - Announce error via window.alert() before returning.
     * @param {boolean} [object.focus=true] - Place the focus on the offending control and give it error color.
     * @returns {undefined|string} `undefined` means valid or string containing error message.
     */
    validate: function(options) {
        options = options || {};

        var focus = options.focus === undefined || options.focus,
            alert = options.alert === undefined || options.alert,
            rethrow = options.rethrow === true,
            result;

        try {
            validate.call(this, focus);
        } catch (err) {
            result = err.message;

            // Throw when not a filter tree error
            if (rethrow || !reFilterTreeErrorString.test(result)) {
                throw err;
            }

            if (alert) {
                result = result.replace(reFilterTreeErrorString, '');
                window.alert(result); // eslint-disable-line no-alert
            }
        }

        return result;
    },

    test: function test(dataRow) {
        var operator = operators[this.operator],
            result = operator.seed,
            noChildrenDefined = true;

        this.children.find(function(child) {
            if (child) {
                noChildrenDefined = false;
                if (child instanceof DefaultFilter) {
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

    toJSON: function toJSON() {
        var state = {
            operator: this.operator,
            children: []
        };

        this.children.forEach(function(child) {
            if (child) {
                if (child instanceof DefaultFilter) {
                    state.children.push(child);
                } else if (child.children.length) {
                    state.children.push(toJSON.call(child));
                }
            }
        });

        var metadata = FilterNode.prototype.toJSON.call(this);
        Object.keys(metadata).forEach(function(key) {
            state[key] = metadata[key];
        });

        return state;
    },

    getSqlWhereClause: function getSqlWhereClause() {
        var lexeme = operators[this.operator].SQL,
            where = lexeme.beg;

        this.children.forEach(function(child, idx) {
            var op = idx ? ' ' + lexeme.op + ' ' : '';
            if (child) {
                if (child instanceof DefaultFilter) {
                    where += op + child.getSqlWhereClause();
                } else if (child.children.length) {
                    where += op + getSqlWhereClause.call(child);
                }
            }
        });

        where += lexeme.end;

        return where;
    }

});

/**
 * Checks to make sure `state` is defined as a plain object and not a JSON string.
 * If not, throws error and does not return.
 * @param {object} state
 * @private
 */
function throwIfJSON(state) {
    if (typeof state !== 'object') {
        var errMsg = 'Expected `state` parameter to be an object.';
        if (typeof state === 'string') {
            errMsg += ' See `JSON.parse()`.';
        }
        throw FilterNode.Error(errMsg);
    }
}

function catchClick(evt) { // must be called with context
    var elt = evt.target;

    var handler = this[elt.className] || this[elt.parentNode.className];
    if (handler) {
        if (this.detachChooser) {
            this.detachChooser();
        }
        handler.call(this, evt);
        evt.stopPropagation();
    }

    if (this.eventHandler) {
        this.eventHandler(evt);
    }
}

/**
 * Throws error if invalid expression tree.
 * Caught by {@link FilterTree#validate|FilterTree.prototype.validate()}.
 * @param {boolean} focus - Move focus to offending control.
 * @returns {undefined} if valid
 * @private
 */
function validate(focus) { // must be called with context
    if (this instanceof FilterTree && !this.children.length) {
        throw new FilterNode.Error('Empty subexpression (no filters).');
    }

    this.children.forEach(function(child) {
        if (child instanceof DefaultFilter) {
            child.validate(focus);
        } else if (child.children.length) {
            validate.call(child, focus);
        }
    });
}

function attachChooser(evt) { // must be called with context
    var tree = this,
        rect = evt.target.getBoundingClientRect();

    if (!rect.width) {
        // not in DOM yet so try again later
        setTimeout(function() {
            attachChooser.call(tree, evt);
        }, 50);
        return;
    }

    // Create it
    var editors = Object.keys(FilterTree.prototype.editors),
        chooser = this.chooser = document.createElement('select');

    chooser.className = 'filter-tree-chooser';
    chooser.size = editors.length;

    editors.forEach(function(key) {
        var name = tree.editors[key].prototype.name || key;
        name = name.replace('?', '\u225F'); // make question mark into "? over equals" UNICODE char
        chooser.add(new Option(name, key));
    });

    chooser.onmouseover = function(evt) { // eslint-disable-line no-shadow
        evt.target.selected = true;
    };

    // Position it
    chooser.style.left = rect.left + 19 + 'px';
    chooser.style.top = rect.bottom + 'px';

    this.detachChooser = detachChooser.bind(this);
    window.addEventListener('click', this.detachChooser); // detach chooser if click outside

    chooser.onclick = function() {
        tree.children.push(new tree.editors[chooser.value]({
            parent: tree
        }));
        // click bubbles up to window where it detaches chooser
    };

    chooser.onmouseout = function() {
        chooser.selectedIndex = -1;
    };

    // Add it to the DOM
    this.el.appendChild(chooser);

    // Color the link similarly
    this.chooserTarget = evt.target;
    this.chooserTarget.classList.add('as-menu-header');
}

function detachChooser() { // must be called with context
    var chooser = this.chooser;
    if (chooser) {
        this.el.removeChild(chooser);
        this.chooserTarget.classList.remove('as-menu-header');

        chooser.onclick = chooser.onmouseout = null;
        window.removeEventListener('click', this.detachChooser);

        delete this.detachChooser;
        delete this.chooser;
    }
}

module.exports = FilterTree;
