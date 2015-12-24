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

var chooser;

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
 * * a terninal node `Filter` (or an object inheriting from `Filter`) representing a simple conditional expression; or
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
 * @param {string[]} [localFields] - A list of field names for `Filter` objects to use. May be overridden by defining `json.localFields` here or in the `json` parameter of any descendant (including terminal nodes). If no such definition, will search up the tree for the first node with a defined `fields` member. In practice this parameter is not used herein; it may be used by the caller for the top-level (root) tree.
 * @param {JSON} [json] - If ommitted, loads an empty filter (a `FilterTree` consisting of a single terminal node and the default `operator` value (`'op-and'`).
 * @param {FilterTree} [parent] - Used internally to insert element when creating nested subtrees. For the top level tree, you don't give a value for `parent`; you are responsible for inserting the top-level `.el` into the DOM.
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
            FilterTree.prototype.editors = options.editors;
            chooser = makeChooser();
        } else if (!chooser) {
            chooser = makeChooser();
        }
    },

    editors: {
        Default: DefaultFilter
    },

    newView: function() {
        this.el = template('tree', ++ordinal);
        this.el.addEventListener('click', catchClick.bind(this));
    },

    fromJSON: function(json) {
        if (json) {
            // Validate the JSON object
            if (typeof json !== 'object') {
                var errMsg = 'Expected `json` parameter to be an object.';
                if (typeof json === 'string') {
                    errMsg += ' See `JSON.parse()`.';
                }
                throw this.Error(errMsg);
            }

            // Validate `json.children`
            if (!(json.children instanceof Array && json.children.length)) {
                throw this.Error('Expected `children` field to be a non-empty array.');
            }
            this.children = [];
            var self = this;
            json.children.forEach(function(json) { // eslint-disable-line no-shadow
                var Constructor;
                if (typeof json !== 'object') {
                    throw self.Error('Expected child to be an object containing either `children`, `type`, or neither.');
                }
                if (json.children) {
                    Constructor = FilterTree;
                } else {
                    Constructor = self.editors[json.type || 'Default'];
                }
                self.children.push(new Constructor({
                    json: json,
                    parent: self
                }));
            });

            // Validate `json.operator`
            if (!(operators[json.operator] || json.operator === undefined && json.children.length === 1)) {
                throw this.Error('Expected `operator` field to be one of: ' + Object.keys(operators));
            }
            this.operator = json.operator;
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
        this['filter-tree-choose-operator']({
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

    'filter-tree-choose-operator': function(evt) {
        var radioButton = evt.target;

        this.operator = radioButton.value;

        // display strike-through
        var radioButtons = this.el.querySelectorAll('label>input.filter-tree-choose-operator[name=' + radioButton.name + ']');
        Array.prototype.slice.call(radioButtons).forEach(function(radioButton) { // eslint-disable-line no-shadow
            radioButton.parentElement.style.textDecoration = radioButton.checked ? 'none' : 'line-through';
        });

        // display operator between filters by adding operator string as a CSS class of this tree
        for (var key in operators) {
            this.el.classList.remove(key);
        }
        this.el.classList.add(this.operator);
    },

    'filter-tree-add-filter': function(evt) { // eslint-disable-line
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

    test: function(string) {
        var number = Number(string),
            methodName = isNaN(number) ? 'testString' : 'testNumber';

        return test.call(this, string, number, methodName);
    },

    toJSON: function toJSON() {
        var result = {
            operator: this.operator,
            children: []
        };

        this.children.forEach(function(child) {
            var isTerminalNode = !(child instanceof FilterTree);
            if (isTerminalNode || child.children.length) {
                result.children.push(isTerminalNode ? child : toJSON.call(child));
            }
        });

        return result;
    },

    toSQL: function toSQL() {
        var SQL = operators[this.operator].SQL,
            result = SQL.beg;

        this.children.forEach(function(child, idx) {
            var isTerminalNode = !(child instanceof FilterTree);
            if (isTerminalNode || child.children.length) {
                if (idx) {
                    result += ' ' + SQL.op + ' ';
                }
                result += isTerminalNode ? child.toSQL() : toSQL.call(child);
            }
        });

        result += SQL.end;

        return result;
    }

});

function catchClick(evt) {
    var elt = evt.target;

    var handler = this[elt.className] || this[elt.parentNode.className];
    if (handler) {
        detachChooser();
        handler.call(this, evt);
        evt.stopPropagation();
    }
}

function test(s, n, methodName) {
    var operator = operators[this.operator],
        result = operator.seed;

    for (var i = 0; i < this.children.length && result !== operator.abort; ++i) {
        var child = this.children[i],
            isTerminalNode = !(child instanceof FilterTree);

        if (isTerminalNode || child.children.length) {
            var method = isTerminalNode ? child[methodName] : test;
            result = operator.reduce(result, method.call(child, s, n));
        }
    }

    if (operator.negate) {
        result = !result;
    }

    return result;
}

function makeChooser() {
    var $ = document.createElement('select'),
        editors = Object.keys(FilterTree.prototype.editors);

    $.className = 'filter-tree-chooser';
    $.size = editors.length;

    editors.forEach(function(key) {
        $.add(new Option(key));
    });

    $.onmouseover = function(evt) {
        evt.target.selected = true;
    };

    return $;
}

var chooserParent;

function attachChooser(evt) {
    var tree = this,
        rect = evt.target.getBoundingClientRect();

    if (!rect.width) {
        // not in DOM yet so try again later
        setTimeout(function() {
            attachChooser.call(tree, evt);
        }, 50);
        return;
    }

    chooser.style.left = rect.left + 19 + 'px';
    chooser.style.top = rect.bottom + 'px';

    window.addEventListener('click', detachChooser); // detach chooser if click outside

    chooser.onclick = function() {
        tree.children.push(new tree.editors[chooser.value]({
            parent: tree
        }));
        // click bubbles up to window where it detaches chooser
    };

    chooser.onmouseout = function() {
        chooser.selectedIndex = -1;
    };

    chooserParent = this.el;
    chooserParent.appendChild(chooser);
    var link = chooserParent.querySelector('.filter-tree-add-filter');
    link.style.backgroundColor = window.getComputedStyle(chooser).backgroundColor;
}

function detachChooser() {
    if (chooserParent) {
        chooser.selectedIndex = -1;
        chooserParent.querySelector('.filter-tree-add-filter').style.backgroundColor = null;
        chooserParent.removeChild(chooser);
        chooser.onclick = chooser.onmouseout = chooserParent = null;
        window.removeEventListener('click', detachChooser);
    }
}

module.exports = FilterTree;