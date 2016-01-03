/* eslint-env browser */

// This is the main file, usable as is, such as by /test/index.js.
// For npm: gulpfile.js copies this file to ../index.js, adjusting the require paths and defining the `css` local.
// For CDN: gulpfile.js then browserifies ../index.js with sourcemap to /build/filter-tree.js and uglified without sourcemap to /build/filter-tree.min.js. The CDN is https://joneit.github.io/filter-tree.

'use strict';

var cssInjector = require('css-injector');

var FilterNode = require('./FilterNode');
var DefaultFilter = require('./FilterLeaf');
var template = require('./template');
var operators = require('./tree-operators');

var ordinal = 0;

var css; // defined by code inserted by gulpfile between following comments
/* inject:css */
/* endinject */

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

    initialize: function(options) {
        cssInjector(css, 'filter-tree-base', options && options.cssStylesheetReferenceElement);

        if (options.editors) {
            this.editors = options.editors;
        }

        if (!this.parent) {
            // we are instantiating the root node
            this.el.addEventListener('change', removeErrorClassAndMoveFocusToNextControl);
            this.el.addEventListener('click', removeErrorClassAndMoveFocusToNextControl);
        }
    },

    destroy: function() {
        if (!this.parent) {
            // we are instantiating the root node
            this.el.removeEventListener('change', removeErrorClassAndMoveFocusToNextControl);
            this.el.removeEventListener('click', removeErrorClassAndMoveFocusToNextControl);
        }

        detachChooser.call(this);
    },

    editors: {
        Default: DefaultFilter
    },

    addEditor: function(name, editor) {
        if (editor) {
            this.editors[name] = editor;
        } else {
            delete this.editors[name];
        }
    },

    newView: function() {
        this.el = template('tree', ++ordinal);
        this.el.addEventListener('click', catchClick.bind(this));
    },

    load: function(json) {
        if (json) {
            // Validate the JSON object
            if (typeof json !== 'object') {
                var errMsg = 'Expected `json` parameter to be an object.';
                if (typeof json === 'string') {
                    errMsg += ' See `JSON.parse()`.';
                }
                throw this.Error(errMsg);
            }

            // Validate `json.operator`
            if (!(operators[json.operator] || json.operator === undefined && json.children.length === 1)) {
                throw this.Error('Expected `operator` property to be one of: ' + Object.keys(operators));
            }
            this.operator = json.operator;

            // Validate `json.children`
            if (!(json.children instanceof Array && json.children.length)) {
                throw this.Error('Expected `children` property to be a non-empty array.');
            }
            this.children = [];
            var self = this;
            json.children.forEach(function(json) { // eslint-disable-line no-shadow
                var Constructor;
                if (typeof json !== 'object') {
                    throw self.Error('Expected child to be an object containing either `children`, `editor`, or neither.');
                }
                if (json.children) {
                    Constructor = FilterTree;
                } else {
                    Constructor = self.editors[json.editor || 'Default'];
                }
                self.children.push(new Constructor({
                    json: json,
                    parent: self
                }));
            });
        } else {
            var filterEditorNames = Object.keys(this.editors),
                onlyOneFilterEditor = filterEditorNames.length === 1;
            this.children = onlyOneFilterEditor ? [new this.editors[filterEditorNames[0]]({
                parent: this
            })] : [];
            this.operator = 'op-and';
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
     * @param {boolean} [noAlert=false] - Suppress alert.
     * @returns {undefined|string} where `undefined` means valid and string contains error message.
     */
    validate: function(noAlert) {
        var result;
        try {
            validate.call(this);
        } catch (err) {
            result = err.message;
            if (!/^filter-tree/.test(result)) {
                throw err;
            }
            if (!noAlert) {
                alert(result); // eslint-disable-line no-alert
            }
        }
        return result;
    },

    test: function test(dataRow) {
        var operator = operators[this.operator],
            result = operator.seed;

        this.children.find(function(child) {
            if (child) {
                if (child instanceof DefaultFilter) {
                    result = operator.reduce(result, child.test.call(child, dataRow));
                } else if (child.children.length) {
                    result = operator.reduce(result, test.call(child, dataRow));
                }
                return result === operator.abort;
            }

            return false;
        });

        return operator.negate ? !result : result;
    },

    toJSON: function toJSON() {
        var json = {
            operator: this.operator,
            children: []
        };

        this.children.forEach(function(child) {
            if (child) {
                if (child instanceof DefaultFilter) {
                    json.children.push(child);
                } else if (child.children.length) {
                    json.children.push(toJSON.call(child));
                }
            }
        });

        var metadata = FilterNode.prototype.toJSON.call(this);
        Object.keys(metadata).forEach(function(key) {
            json[key] = metadata[key];
        });

        return json;
    },

    toSQL: function toSQL() {
        var lexeme = operators[this.operator].SQL,
            where = lexeme.beg;

        this.children.forEach(function(child, idx) {
            var op = idx ? ' ' + lexeme.op + ' ' : '';
            if (child) {
                if (child instanceof DefaultFilter) {
                    where += op + child.toSQL();
                } else if (child.children.length) {
                    where += op + toSQL.call(child);
                }
            }
        });

        where += lexeme.end;

        return where;
    }

});

/** `change` or `click` event handler for all form controls.
 */
function removeErrorClassAndMoveFocusToNextControl(evt) {
    var el = evt.target;

    if (
        // a click or change event on a tree operator radio button
        el.className === 'filter-tree-op-choice'
            ||
        // a click or change event on a text toggle, such as a hidden columns checkbox
        el.className === 'text-toggle'
            ||
        // a click event on some a non-checkable el
        evt.type === 'click' &&  !('checked' in el)
            ||
        // a click event on a non-selectable el
        evt.type === 'change' &&  el.tagName !== 'SELECT'
    ) {
        return; // ignore this `click` event
    }

    // remove `error` CSS class, which may have been added by `FilterLeaf.prototype.validate`
    el.classList.remove('error');

    // find next sibling control, if any
    while ((el = el.nextElementSibling) && !('name' in el)); // eslint-disable-line curly

    // and click in it (opens select list)
    FilterNode.clickIn(el);
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
}

/**
 * Either returns (valid) or throws error (invalid) which is caught by FilterTree.prototype.validate().
 */
function validate() { // must be called with context
    if (this instanceof FilterTree && !this.children.length) {
        throw new Error('Empty subexpression (no filters).');
    }

    this.children.forEach(function(child) {
        if (child) {
            child.validate();
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
        chooser = this.chooser = document.createElement('select'),
        target = this.chooserTarget = evt.target;

    chooser.className = 'filter-tree-chooser';
    chooser.size = editors.length;

    editors.forEach(function(key) {
        chooser.add(new Option(key));
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
    target.style.backgroundColor = window.getComputedStyle(chooser).backgroundColor;
}

function detachChooser() { // must be called with context
    var chooser = this.chooser;
    if (chooser) {
        this.el.removeChild(chooser);
        this.chooserTarget.style.backgroundColor = null;

        chooser.onclick = chooser.onmouseout = null;
        window.removeEventListener('click', this.detachChooser);

        delete this.detachChooser;
        delete this.chooser;
    }
}

module.exports = FilterTree;
