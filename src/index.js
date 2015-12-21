/* eslint-env browser */

'use strict';

var FilterNode = require('./js/FilterNode');
var template = require('./js/template');
var operators = require('./js/tree-operators');
require('./js/FilterLeaf'); // inserts itself into FilterNode.prototype.filters as member 'Default'

var ordinal = 0;

/** @constructor
 *
 * @summary Represents a complex filter expression.
 *
 * @desc A `FilterTree` is an n-ary tree with a single `operator` to be applied to all its `children`.
 *
 * Each of the `children` can be either:
 *
 * * a terninal node `Filter` (or an object inheriting from `Filter`) representing asimple conditional expression; or
 * * a nested `FilterTree` representing a complex subexpression.
 *
 * The `operator` must be one of the {@link operators|tree operators} or may be left undefined iff there is only one child node.
 *
 * Notes:
 * 1. A `FilterTree` may consist of a single leaf, in which case the `operator` is not used and may be left undefined. However, if a second child is added and the operator is still undefined, it will be set to the default (`'op-and'`).
 * 2. A _nested_ `FilterTree` containing a single child is pointless and is semantically identical to a terminal node.
 * 3. The order of the children is undefined as all operators are commutative. For the '`op-or`' operator, evaluation ceases on the first positive result and for efficiency, all simple conditional expressions will be evaluated before any complex subexpressions.
 * 4. A nested `FilterTree` is distinguished in the JSON object from a `Filter` by the presence of a `children` member.
 *
 * @param {string[]} [fieldNames] - A list of field names for `Filter` objects to use. May be overridden by defining `json.fieldNames` here or in the `json` parameter of any descendant (including terminal nodes). If no such definition, will search up the tree for the first node with a defined `fieldNames` member. In practice this parameter is not used herein; it may be used by the caller for the top-level (root) tree.
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

    newView: function() {
        this.el = template('tree', ++ordinal);

        //if (!this.parent) {
            this.el.addEventListener('click', catchClick.bind(this));
        //}
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
                    Constructor = self.filters[json.type || 'Default'];
                }
                self.children.push(new Constructor(json, self));
            });

            // Validate `json.operator`
            if (!(operators[json.operator] || json.operator === undefined && json.children.length === 1)) {
                throw this.Error('Expected `operator` field to be one of: ' + Object.keys(operators));
            }
            this.operator = json.operator;
        } else {
            this.children = [new this.filters.Default(undefined, this)];
            this.operator = 'op-and';
        }
    },

    render: function() {
        var radioButton = this.el.querySelector('input[value=' + this.operator + ']');
        radioButton.checked = true;
        this['filter-tree-choose-operator'](radioButton);

        FilterNode.prototype.render.call(this);
    },

    'filter-tree-choose-operator': function(radioButton) {
        this.operator = radioButton.value;

        var radioButtons = this.el.querySelectorAll('label>input.filter-tree-choose-operator[name=' + radioButton.name + ']');
        Array.prototype.slice.call(radioButtons).forEach(function(radioButton) { // eslint-disable-line no-shadow
            radioButton.parentElement.style.textDecoration = radioButton.checked ? 'none' : 'line-through';
        });

        for (var key in operators) { this.el.classList.remove(key); }
        this.el.classList.add(this.operator);
    },

    'filter-tree-add-filter': function() {
        this.children.push(new this.filters.Default(undefined, this));
    },

    'filter-tree-add': function() {
        this.children.push(new FilterTree(undefined, this));
    },

    'filter-tree-remove': function(elt) {
        var listItem = elt.parentElement,
            list = listItem.parentElement;

        if (list.children.length === 1) {
            //TODO
            alert('sole remaining conditional to be reset (cleared) rather than removed'); // eslint-disable-line no-alert
        } else {
            var children = this.children,
                el = elt.nextElementSibling;

            children.forEach(function(child, idx) {
                if (child.el === el) {
                    delete children[idx];
                    listItem.remove();
                }
            });
        }
    },

    toJSON: function() {
        return walk(this);
    }

});

function walk(tree) {
    var result = {
        operator: tree.operator,
        children: []
    };

    tree.children.forEach(function(child) {
        result.children.push(child instanceof FilterTree ? walk(child) : child);
    });

    return result;
}

function catchClick(evt) {
    var elt = evt.target;
    if (this[elt.className]) {
        this[elt.className](elt);
        evt.stopPropagation();
    } else if (this[elt.parentNode.className]) {
        this[elt.parentNode.className](elt);
        evt.stopPropagation();
    }
}

module.exports = FilterTree;
