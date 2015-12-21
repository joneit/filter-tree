(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/** @namespace extend-me **/

/** @summary Extends an existing constructor into a new constructor.
 *
 * @returns {ChildConstructor} A new constructor, extended from the given context, possibly with some prototype additions.
 *
 * @desc Extends "objects" (constructors), with optional additional code, optional prototype additions, and optional prototype member aliases.
 *
 * > CAVEAT: Not to be confused with Underscore-style .extend() which is something else entirely. I've used the name "extend" here because other packages (like Backbone.js) use it this way. You are free to call it whatever you want when you "require" it, such as `var inherits = require('extend')`.
 *
 * Provide a constructor as the context and any prototype additions you require in the first argument.
 *
 * For example, if you wish to be able to extend `BaseConstructor` to a new constructor with prototype overrides and/or additions, basic usage is:
 *
 * ```javascript
 * var Base = require('extend-me').Base;
 * var BaseConstructor = Base.extend(basePrototype); // mixes in .extend
 * var ChildConstructor = BaseConstructor.extend(childPrototypeOverridesAndAdditions);
 * var GrandchildConstructor = ChildConstructor.extend(grandchildPrototypeOverridesAndAdditions);
 * ```
 *
 * This function (`extend()`) is added to the new extended object constructor as a property `.extend`, essentially making the object constructor itself easily "extendable." (Note: This is a property of each constructor and not a method of its prototype!)
 *
 * @param {string} [extendedClassName] - This is simply added to the prototype as $$CLASS_NAME. Useful for debugging because all derived constructors appear to have the same name ("Constructor") in the debugger. This property is ignored unless `extend.debug` is explicitly set to a truthy value.
 *
 * @param {extendedPrototypeAdditionsObject} [prototypeAdditions] - Object with members to copy to new constructor's prototype. Most members will be copied to the prototype. Some members, however, have special meanings as explained in the {@link extendedPrototypeAdditionsObject|type definition} (and may or may not be copied to the prototype).
 *
 * @property {boolean} [debug] - See parameter `extendedClassName` _(above)_.
 *
 * @property {object} Base - A convenient base class from which all other classes can be extended.
 *
 * @memberOf extend-me
 */
function extend(extendedClassName, prototypeAdditions) {
    switch (arguments.length) {
        case 0:
            prototypeAdditions = {};
            break;
        case 1:
            prototypeAdditions = extendedClassName;
            if (typeof prototypeAdditions !== 'object') {
                throw 'Single parameter overload must be object.';
            }
            extendedClassName = undefined;
            break;
        case 2:
            if (typeof extendedClassName !== 'string' || typeof prototypeAdditions !== 'object') {
                throw 'Two parameter overload must be string, object.';
            }
            break;
        default:
            throw 'Too many parameters';
    }

    function Constructor() {
        if (prototypeAdditions.preInitialize) {
            prototypeAdditions.preInitialize.apply(this, arguments);
        }

        initializePrototypeChain.apply(this, arguments);

        if (prototypeAdditions.postInitialize) {
            prototypeAdditions.postInitialize.apply(this, arguments);
        }
    }

    Constructor.extend = extend;

    var prototype = Constructor.prototype = Object.create(this.prototype);
    prototype.constructor = Constructor;

    if (extendedClassName && extend.debug) {
        prototype.$$CLASS_NAME = extendedClassName;
    }

    for (var key in prototypeAdditions) {
        if (prototypeAdditions.hasOwnProperty(key)) {
            var value = prototypeAdditions[key];
            switch (key) {
                case 'initializeOwn':
                    // already called above; not needed in prototype
                    break;
                case 'aliases':
                    for (var alias in value) {
                        if (value.hasOwnProperty(alias)) {
                            makeAlias(value[alias], alias);
                        }
                    }
                    break;
                default:
                    if (typeof value === 'string' && value[0] === '#') {
                        makeAlias(value, key.substr(1));
                    } else {
                        prototype[key] = value;
                    }
            }
        }
    }

    return Constructor;

    function makeAlias(value, key) { // eslint-disable-line no-shadow
        prototype[key] = prototypeAdditions[value];
    }
}

extend.Base = function () {};
extend.Base.extend = extend;

/** @typedef {function} extendedConstructor
 * @property prototype.super - A reference to the prototype this constructor was extended from.
 * @property [extend] - If `prototypeAdditions.extendable` was truthy, this will be a reference to {@link extend.extend|extend}.
 */

/** @typedef {object} extendedPrototypeAdditionsObject
 * @property {function} [initialize] - Additional constructor code for new object. This method is added to the new constructor's prototype. Gets passed new object as context + same args as constructor itself. Called on instantiation after similar function in all ancestors called with same signature.
 * @property {function} [initializeOwn] - Additional constructor code for new object. This method is added to the new constructor's prototype. Gets passed new object as context + same args as constructor itself. Called on instantiation after (all) the `initialize` function(s).
 * @property {object} [aliases] - Hash of aliases for prototype members in form `{ key: 'member', ... }` where `key` is the name of an alieas and `'member'` is the name of an existing member in the prototype. Each such key is added to the prototype as a reference to the named member. (The `aliases` object itself is *not* added to prototype.) Alternatively:
 * @property {string} [keys] - Arbitrary property names defined here with string values starting with a `#` character will alias the actual properties named in the strings (following the `#`). This is an alternative to providing an `aliases` hash, perhaps simpler (though subtler). (Use arbitrary identifiers here; don't use the name `keys`!)
 * @property {*} [arbitraryProperties] - Any additional arbitrary properties defined here will be added to the new constructor's prototype. (Use arbitrary identifiers here; don't use the name `aribitraryProperties`!)
 */

/** @summary Call all `initialize` methods found in prototype chain.
 * @desc This recursive routine is called by the constructor.
 * 1. Walks back the prototype chain to `Object`'s prototype
 * 2. Walks forward to new object, calling any `initialize` methods it finds along the way with the same context and arguments with which the constructor was called.
 * @private
 * @memberOf extend-me
 */
function initializePrototypeChain() {
    var term = this,
        args = arguments;
    recur(term);

    function recur(obj) {
        var proto = Object.getPrototypeOf(obj);
        if (proto.constructor !== Object) {
            recur(proto);
            if (proto.hasOwnProperty('initialize')) {
                proto.initialize.apply(term, args);
            }
        }
    }
}

module.exports = extend;

},{}],2:[function(require,module,exports){
// templex node module
// https://github.com/joneit/templex

/* eslint-env node */

/**
 * Merges values of execution context properties named in template by {prop1},
 * {prop2}, etc., or any javascript expression incorporating such prop names.
 * The context always includes the global object. In addition you can specify a single
 * context or an array of contexts to search (in the order given) before finally
 * searching the global context.
 *
 * Merge expressions consisting of simple numeric terms, such as {0}, {1}, etc., deref
 * the first context given, which is assumed to be an array. As a convenience feature,
 * if additional args are given after `template`, `arguments` is unshifted onto the context
 * array, thus making first additional arg available as {1}, second as {2}, etc., as in
 * `templex('Hello, {1}!', 'World')`. ({0} is the template so consider this to be 1-based.)
 *
 * If you prefer something other than braces, redefine `templex.regexp`.
 *
 * See tests for examples.
 *
 * @param {string} template
 * @param {...string} [args]
 */
function templex(template) {
    var contexts = this instanceof Array ? this : [this];
    if (arguments.length > 1) { contexts.unshift(arguments); }
    return template.replace(templex.regexp, templex.merger.bind(contexts));
}

templex.regexp = /\{(.*?)\}/g;

templex.with = function (i, s) {
    return 'with(this[' + i + ']){' + s + '}';
};

templex.cache = [];

templex.deref = function (key) {
    if (!(this.length in templex.cache)) {
        var code = 'return eval(expr)';

        for (var i = 0; i < this.length; ++i) {
            code = templex.with(i, code);
        }

        templex.cache[this.length] = eval('(function(expr){' + code + '})'); // eslint-disable-line no-eval
    }
    return templex.cache[this.length].call(this, key);
};

templex.merger = function (match, key) {
    // Advanced features: Context can be a list of contexts which are searched in order.
    var replacement;

    try {
        replacement = isNaN(key) ? templex.deref.call(this, key) : this[0][key];
    } catch (e) {
        replacement = '{' + key + '}';
    }

    return replacement;
};

// this interface consists solely of the templex function (and it's properties)
module.exports = templex;

},{}],3:[function(require,module,exports){
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

window.FilterTree = FilterTree;

},{"./js/FilterLeaf":4,"./js/FilterNode":5,"./js/template":6,"./js/tree-operators":7}],4:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var FilterNode = require('./FilterNode');

/** A "filter leaf" is a terminal node in a filter tree and represents a conditional expression.
 *
 */
var FilterLeaf = FilterNode.extend('FilterLeaf', {

    newView: function() {
        var root = this.el = document.createElement('span');
        root.className = 'filter-tree-default';

        this.bindings = {
            field: makeElement(root, this.fieldNames),
            operator: makeElement(root, ['=', '≠', '<', '>', '≤', '≥']),
            argument: makeElement(root)
        };

        root.appendChild(document.createElement('br'));
    },

    fromJSON: function(json) {
        if (json) {
            for (var key in json) {
                this.bindings[key].value = json[key];
            }
        }
    },

    toJSON: function() {
        var json = {};
        for (var key in this.bindings) {
            json[key] = this.bindings[key].value;
        }
        return json;
    }
});

FilterNode.prototype.filters.Default = FilterLeaf;

/** @typedef valueOption
 * @param value
 * @param text
 */
/** @typedef optionGroup
 * @param {string} label
 * @param {fieldOption[]} options
 */
/** @typedef {string|valueOption|optionGroup|string[]} fieldOption
 * @desc If a simple array of string, you must add a `label` property to the array.
 */
/**
 *
 * @param {Element} container
 * @param name
 * @param {fieldOption[]} options
 * @param {null|string} [prompt] - If omitted, blank prompt implied. `null` suppresses prompt altogether.
 */
function makeElement(container, options, prompt) {
    var el,
        tagName = options ? 'select' : 'input';

    if (options && options.length === 1) {
        var option = options[0];
        el = document.createElement('span');
        el.innerHTML = option.text || option;

        var input = document.createElement('input');
        input.type = 'hidden';
        input.value = option.value || option;
        el.appendChild(input);
    } else {
        el = addOptions(tagName, options, prompt);
    }
    container.appendChild(el);
    return el;
}

function addOptions(tagName, options, prompt) {
    var el = document.createElement(tagName);
    if (options) {
        var add;
        if (tagName === 'select') {
            add = el.add;
            if (prompt !== null) {
                el.add(new Option(prompt ? '(' + prompt + ')' : ''));
            }
        } else {
            add = el.appendChild;
            el.label = prompt;
        }
        options.forEach(function(option) {
            var newElement;
            if ((option.options || option) instanceof Array) {
                var optgroup = addOptions('optgroup', option.options || option, option.label);
                el.add(optgroup);
            } else {
                newElement = typeof option === 'object' ? new Option(option.text, option.value) : new Option(option);
                add.call(el, newElement);
            }
        });
    }
    return el;
}

module.exports = FilterLeaf;

},{"./FilterNode":5}],5:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var extend = require('extend-me');
var Base = extend.Base;

var template = require('./template');

extend.debug = true;

var FilterNode = Base.extend({

    initialize: function(fieldNames, json, parent) {
        if (!(fieldNames instanceof Array)) {
            // 1st param `fieldNames` omitted; shift other params
            parent = json;
            json = fieldNames;
            fieldNames = undefined;
        }

        this.parent = parent;

        this.fieldNames = fieldNames ||
            json && json.fieldNames ||
            parent && parent.fieldNames;

        if (!this.fieldNames) {
            throw this.Error('No field names list.');
        }

        this.newView();
        this.fromJSON(json);
        this.render();
    },

    render: function() {
        if (this.parent) {
            var newListItem = document.createElement(this.CHILD_TAG);
            newListItem.appendChild(template('removeButton'));
            newListItem.appendChild(this.el);
            this.parent.el.querySelector(this.CHILDREN_TAG).appendChild(newListItem);
        }
    },

    Error: function(msg) {
        return new Error('FilterTree: ' + msg);
    },

    CHILDREN_TAG: 'OL',
    CHILD_TAG: 'LI',
    CSS_CLASS_NAME: 'filter-tree',

    filters: { }

});

module.exports = FilterNode;

},{"./template":6,"extend-me":1}],6:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var templex = require('templex');

var templates = {

tree: function() {/*
<span class="filter-tree"">
    Match
    <label><input type="radio" class="filter-tree-choose-operator" name="treeOp{1}" value="op-or">any</label>
    <label><input type="radio" class="filter-tree-choose-operator" name="treeOp{1}" value="op-and">all</label>
    <label><input type="radio" class="filter-tree-choose-operator" name="treeOp{1}" value="op-nor">none</label>
    of:<br/>
    <span class="filter-tree-add-filter" title="Add a new conditional to this match.">
        <div></div>conditional
    </span>
    <span class="filter-tree-add" title="Add a new submatch under this match.">
        <div></div>subexpression
    </span>
    <ol></ol>
</span>
*/},

removeButton: function() {/*
<div class="filter-tree-remove" title="delete conditional"></div>
*/}

};

function getAll(templateName) {
    var temp = document.createElement('div');
    var text = templates[templateName].toString();
    var beg = text.indexOf('/*');
    var end = text.lastIndexOf('*/');
    if (beg === -1 || end === -1) {
        throw 'bad template';
    }
    beg += 2;
    text = text.substr(beg, end - beg);
    text = templex.apply(this, [text].concat(Array.prototype.slice.call(arguments, 1)));
    temp.innerHTML = text;
    return temp.children;
}

function getFirst() {
    return getAll.apply(this, arguments)[0];
}

getFirst.getAll = getAll;

module.exports = getFirst;

},{"templex":2}],7:[function(require,module,exports){
'use strict';

module.exports = {
    'op-and': { },
    'op-or': { },
    'op-nor': { }
};

},{}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL25vZGVfbW9kdWxlcy9leHRlbmQtbWUvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL3RlbXBsZXgvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvc3JjL2Zha2VfYmZlNWU3ODQuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvc3JjL2pzL0ZpbHRlckxlYWYuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvc3JjL2pzL0ZpbHRlck5vZGUuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvc3JjL2pzL3RlbXBsYXRlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy90cmVlLW9wZXJhdG9ycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuLyoqIEBuYW1lc3BhY2UgZXh0ZW5kLW1lICoqL1xuXG4vKiogQHN1bW1hcnkgRXh0ZW5kcyBhbiBleGlzdGluZyBjb25zdHJ1Y3RvciBpbnRvIGEgbmV3IGNvbnN0cnVjdG9yLlxuICpcbiAqIEByZXR1cm5zIHtDaGlsZENvbnN0cnVjdG9yfSBBIG5ldyBjb25zdHJ1Y3RvciwgZXh0ZW5kZWQgZnJvbSB0aGUgZ2l2ZW4gY29udGV4dCwgcG9zc2libHkgd2l0aCBzb21lIHByb3RvdHlwZSBhZGRpdGlvbnMuXG4gKlxuICogQGRlc2MgRXh0ZW5kcyBcIm9iamVjdHNcIiAoY29uc3RydWN0b3JzKSwgd2l0aCBvcHRpb25hbCBhZGRpdGlvbmFsIGNvZGUsIG9wdGlvbmFsIHByb3RvdHlwZSBhZGRpdGlvbnMsIGFuZCBvcHRpb25hbCBwcm90b3R5cGUgbWVtYmVyIGFsaWFzZXMuXG4gKlxuICogPiBDQVZFQVQ6IE5vdCB0byBiZSBjb25mdXNlZCB3aXRoIFVuZGVyc2NvcmUtc3R5bGUgLmV4dGVuZCgpIHdoaWNoIGlzIHNvbWV0aGluZyBlbHNlIGVudGlyZWx5LiBJJ3ZlIHVzZWQgdGhlIG5hbWUgXCJleHRlbmRcIiBoZXJlIGJlY2F1c2Ugb3RoZXIgcGFja2FnZXMgKGxpa2UgQmFja2JvbmUuanMpIHVzZSBpdCB0aGlzIHdheS4gWW91IGFyZSBmcmVlIHRvIGNhbGwgaXQgd2hhdGV2ZXIgeW91IHdhbnQgd2hlbiB5b3UgXCJyZXF1aXJlXCIgaXQsIHN1Y2ggYXMgYHZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2V4dGVuZCcpYC5cbiAqXG4gKiBQcm92aWRlIGEgY29uc3RydWN0b3IgYXMgdGhlIGNvbnRleHQgYW5kIGFueSBwcm90b3R5cGUgYWRkaXRpb25zIHlvdSByZXF1aXJlIGluIHRoZSBmaXJzdCBhcmd1bWVudC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgaWYgeW91IHdpc2ggdG8gYmUgYWJsZSB0byBleHRlbmQgYEJhc2VDb25zdHJ1Y3RvcmAgdG8gYSBuZXcgY29uc3RydWN0b3Igd2l0aCBwcm90b3R5cGUgb3ZlcnJpZGVzIGFuZC9vciBhZGRpdGlvbnMsIGJhc2ljIHVzYWdlIGlzOlxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIHZhciBCYXNlID0gcmVxdWlyZSgnZXh0ZW5kLW1lJykuQmFzZTtcbiAqIHZhciBCYXNlQ29uc3RydWN0b3IgPSBCYXNlLmV4dGVuZChiYXNlUHJvdG90eXBlKTsgLy8gbWl4ZXMgaW4gLmV4dGVuZFxuICogdmFyIENoaWxkQ29uc3RydWN0b3IgPSBCYXNlQ29uc3RydWN0b3IuZXh0ZW5kKGNoaWxkUHJvdG90eXBlT3ZlcnJpZGVzQW5kQWRkaXRpb25zKTtcbiAqIHZhciBHcmFuZGNoaWxkQ29uc3RydWN0b3IgPSBDaGlsZENvbnN0cnVjdG9yLmV4dGVuZChncmFuZGNoaWxkUHJvdG90eXBlT3ZlcnJpZGVzQW5kQWRkaXRpb25zKTtcbiAqIGBgYFxuICpcbiAqIFRoaXMgZnVuY3Rpb24gKGBleHRlbmQoKWApIGlzIGFkZGVkIHRvIHRoZSBuZXcgZXh0ZW5kZWQgb2JqZWN0IGNvbnN0cnVjdG9yIGFzIGEgcHJvcGVydHkgYC5leHRlbmRgLCBlc3NlbnRpYWxseSBtYWtpbmcgdGhlIG9iamVjdCBjb25zdHJ1Y3RvciBpdHNlbGYgZWFzaWx5IFwiZXh0ZW5kYWJsZS5cIiAoTm90ZTogVGhpcyBpcyBhIHByb3BlcnR5IG9mIGVhY2ggY29uc3RydWN0b3IgYW5kIG5vdCBhIG1ldGhvZCBvZiBpdHMgcHJvdG90eXBlISlcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gW2V4dGVuZGVkQ2xhc3NOYW1lXSAtIFRoaXMgaXMgc2ltcGx5IGFkZGVkIHRvIHRoZSBwcm90b3R5cGUgYXMgJCRDTEFTU19OQU1FLiBVc2VmdWwgZm9yIGRlYnVnZ2luZyBiZWNhdXNlIGFsbCBkZXJpdmVkIGNvbnN0cnVjdG9ycyBhcHBlYXIgdG8gaGF2ZSB0aGUgc2FtZSBuYW1lIChcIkNvbnN0cnVjdG9yXCIpIGluIHRoZSBkZWJ1Z2dlci4gVGhpcyBwcm9wZXJ0eSBpcyBpZ25vcmVkIHVubGVzcyBgZXh0ZW5kLmRlYnVnYCBpcyBleHBsaWNpdGx5IHNldCB0byBhIHRydXRoeSB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0ge2V4dGVuZGVkUHJvdG90eXBlQWRkaXRpb25zT2JqZWN0fSBbcHJvdG90eXBlQWRkaXRpb25zXSAtIE9iamVjdCB3aXRoIG1lbWJlcnMgdG8gY29weSB0byBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIE1vc3QgbWVtYmVycyB3aWxsIGJlIGNvcGllZCB0byB0aGUgcHJvdG90eXBlLiBTb21lIG1lbWJlcnMsIGhvd2V2ZXIsIGhhdmUgc3BlY2lhbCBtZWFuaW5ncyBhcyBleHBsYWluZWQgaW4gdGhlIHtAbGluayBleHRlbmRlZFByb3RvdHlwZUFkZGl0aW9uc09iamVjdHx0eXBlIGRlZmluaXRpb259IChhbmQgbWF5IG9yIG1heSBub3QgYmUgY29waWVkIHRvIHRoZSBwcm90b3R5cGUpLlxuICpcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2RlYnVnXSAtIFNlZSBwYXJhbWV0ZXIgYGV4dGVuZGVkQ2xhc3NOYW1lYCBfKGFib3ZlKV8uXG4gKlxuICogQHByb3BlcnR5IHtvYmplY3R9IEJhc2UgLSBBIGNvbnZlbmllbnQgYmFzZSBjbGFzcyBmcm9tIHdoaWNoIGFsbCBvdGhlciBjbGFzc2VzIGNhbiBiZSBleHRlbmRlZC5cbiAqXG4gKiBAbWVtYmVyT2YgZXh0ZW5kLW1lXG4gKi9cbmZ1bmN0aW9uIGV4dGVuZChleHRlbmRlZENsYXNzTmFtZSwgcHJvdG90eXBlQWRkaXRpb25zKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucyA9IHt9O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucyA9IGV4dGVuZGVkQ2xhc3NOYW1lO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm90b3R5cGVBZGRpdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ1NpbmdsZSBwYXJhbWV0ZXIgb3ZlcmxvYWQgbXVzdCBiZSBvYmplY3QuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGV4dGVuZGVkQ2xhc3NOYW1lID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0ZW5kZWRDbGFzc05hbWUgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBwcm90b3R5cGVBZGRpdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ1R3byBwYXJhbWV0ZXIgb3ZlcmxvYWQgbXVzdCBiZSBzdHJpbmcsIG9iamVjdC4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyAnVG9vIG1hbnkgcGFyYW1ldGVycyc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQ29uc3RydWN0b3IoKSB7XG4gICAgICAgIGlmIChwcm90b3R5cGVBZGRpdGlvbnMucHJlSW5pdGlhbGl6ZSkge1xuICAgICAgICAgICAgcHJvdG90eXBlQWRkaXRpb25zLnByZUluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluaXRpYWxpemVQcm90b3R5cGVDaGFpbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAgIGlmIChwcm90b3R5cGVBZGRpdGlvbnMucG9zdEluaXRpYWxpemUpIHtcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucy5wb3N0SW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgQ29uc3RydWN0b3IuZXh0ZW5kID0gZXh0ZW5kO1xuXG4gICAgdmFyIHByb3RvdHlwZSA9IENvbnN0cnVjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodGhpcy5wcm90b3R5cGUpO1xuICAgIHByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuXG4gICAgaWYgKGV4dGVuZGVkQ2xhc3NOYW1lICYmIGV4dGVuZC5kZWJ1Zykge1xuICAgICAgICBwcm90b3R5cGUuJCRDTEFTU19OQU1FID0gZXh0ZW5kZWRDbGFzc05hbWU7XG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIHByb3RvdHlwZUFkZGl0aW9ucykge1xuICAgICAgICBpZiAocHJvdG90eXBlQWRkaXRpb25zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3RvdHlwZUFkZGl0aW9uc1trZXldO1xuICAgICAgICAgICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdpbml0aWFsaXplT3duJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxyZWFkeSBjYWxsZWQgYWJvdmU7IG5vdCBuZWVkZWQgaW4gcHJvdG90eXBlXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2FsaWFzZXMnOlxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBhbGlhcyBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KGFsaWFzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ha2VBbGlhcyh2YWx1ZVthbGlhc10sIGFsaWFzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZVswXSA9PT0gJyMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYWtlQWxpYXModmFsdWUsIGtleS5zdWJzdHIoMSkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG90eXBlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIENvbnN0cnVjdG9yO1xuXG4gICAgZnVuY3Rpb24gbWFrZUFsaWFzKHZhbHVlLCBrZXkpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgICAgcHJvdG90eXBlW2tleV0gPSBwcm90b3R5cGVBZGRpdGlvbnNbdmFsdWVdO1xuICAgIH1cbn1cblxuZXh0ZW5kLkJhc2UgPSBmdW5jdGlvbiAoKSB7fTtcbmV4dGVuZC5CYXNlLmV4dGVuZCA9IGV4dGVuZDtcblxuLyoqIEB0eXBlZGVmIHtmdW5jdGlvbn0gZXh0ZW5kZWRDb25zdHJ1Y3RvclxuICogQHByb3BlcnR5IHByb3RvdHlwZS5zdXBlciAtIEEgcmVmZXJlbmNlIHRvIHRoZSBwcm90b3R5cGUgdGhpcyBjb25zdHJ1Y3RvciB3YXMgZXh0ZW5kZWQgZnJvbS5cbiAqIEBwcm9wZXJ0eSBbZXh0ZW5kXSAtIElmIGBwcm90b3R5cGVBZGRpdGlvbnMuZXh0ZW5kYWJsZWAgd2FzIHRydXRoeSwgdGhpcyB3aWxsIGJlIGEgcmVmZXJlbmNlIHRvIHtAbGluayBleHRlbmQuZXh0ZW5kfGV4dGVuZH0uXG4gKi9cblxuLyoqIEB0eXBlZGVmIHtvYmplY3R9IGV4dGVuZGVkUHJvdG90eXBlQWRkaXRpb25zT2JqZWN0XG4gKiBAcHJvcGVydHkge2Z1bmN0aW9ufSBbaW5pdGlhbGl6ZV0gLSBBZGRpdGlvbmFsIGNvbnN0cnVjdG9yIGNvZGUgZm9yIG5ldyBvYmplY3QuIFRoaXMgbWV0aG9kIGlzIGFkZGVkIHRvIHRoZSBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIEdldHMgcGFzc2VkIG5ldyBvYmplY3QgYXMgY29udGV4dCArIHNhbWUgYXJncyBhcyBjb25zdHJ1Y3RvciBpdHNlbGYuIENhbGxlZCBvbiBpbnN0YW50aWF0aW9uIGFmdGVyIHNpbWlsYXIgZnVuY3Rpb24gaW4gYWxsIGFuY2VzdG9ycyBjYWxsZWQgd2l0aCBzYW1lIHNpZ25hdHVyZS5cbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb259IFtpbml0aWFsaXplT3duXSAtIEFkZGl0aW9uYWwgY29uc3RydWN0b3IgY29kZSBmb3IgbmV3IG9iamVjdC4gVGhpcyBtZXRob2QgaXMgYWRkZWQgdG8gdGhlIG5ldyBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS4gR2V0cyBwYXNzZWQgbmV3IG9iamVjdCBhcyBjb250ZXh0ICsgc2FtZSBhcmdzIGFzIGNvbnN0cnVjdG9yIGl0c2VsZi4gQ2FsbGVkIG9uIGluc3RhbnRpYXRpb24gYWZ0ZXIgKGFsbCkgdGhlIGBpbml0aWFsaXplYCBmdW5jdGlvbihzKS5cbiAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBbYWxpYXNlc10gLSBIYXNoIG9mIGFsaWFzZXMgZm9yIHByb3RvdHlwZSBtZW1iZXJzIGluIGZvcm0gYHsga2V5OiAnbWVtYmVyJywgLi4uIH1gIHdoZXJlIGBrZXlgIGlzIHRoZSBuYW1lIG9mIGFuIGFsaWVhcyBhbmQgYCdtZW1iZXInYCBpcyB0aGUgbmFtZSBvZiBhbiBleGlzdGluZyBtZW1iZXIgaW4gdGhlIHByb3RvdHlwZS4gRWFjaCBzdWNoIGtleSBpcyBhZGRlZCB0byB0aGUgcHJvdG90eXBlIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBuYW1lZCBtZW1iZXIuIChUaGUgYGFsaWFzZXNgIG9iamVjdCBpdHNlbGYgaXMgKm5vdCogYWRkZWQgdG8gcHJvdG90eXBlLikgQWx0ZXJuYXRpdmVseTpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBba2V5c10gLSBBcmJpdHJhcnkgcHJvcGVydHkgbmFtZXMgZGVmaW5lZCBoZXJlIHdpdGggc3RyaW5nIHZhbHVlcyBzdGFydGluZyB3aXRoIGEgYCNgIGNoYXJhY3RlciB3aWxsIGFsaWFzIHRoZSBhY3R1YWwgcHJvcGVydGllcyBuYW1lZCBpbiB0aGUgc3RyaW5ncyAoZm9sbG93aW5nIHRoZSBgI2ApLiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHRvIHByb3ZpZGluZyBhbiBgYWxpYXNlc2AgaGFzaCwgcGVyaGFwcyBzaW1wbGVyICh0aG91Z2ggc3VidGxlcikuIChVc2UgYXJiaXRyYXJ5IGlkZW50aWZpZXJzIGhlcmU7IGRvbid0IHVzZSB0aGUgbmFtZSBga2V5c2AhKVxuICogQHByb3BlcnR5IHsqfSBbYXJiaXRyYXJ5UHJvcGVydGllc10gLSBBbnkgYWRkaXRpb25hbCBhcmJpdHJhcnkgcHJvcGVydGllcyBkZWZpbmVkIGhlcmUgd2lsbCBiZSBhZGRlZCB0byB0aGUgbmV3IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLiAoVXNlIGFyYml0cmFyeSBpZGVudGlmaWVycyBoZXJlOyBkb24ndCB1c2UgdGhlIG5hbWUgYGFyaWJpdHJhcnlQcm9wZXJ0aWVzYCEpXG4gKi9cblxuLyoqIEBzdW1tYXJ5IENhbGwgYWxsIGBpbml0aWFsaXplYCBtZXRob2RzIGZvdW5kIGluIHByb3RvdHlwZSBjaGFpbi5cbiAqIEBkZXNjIFRoaXMgcmVjdXJzaXZlIHJvdXRpbmUgaXMgY2FsbGVkIGJ5IHRoZSBjb25zdHJ1Y3Rvci5cbiAqIDEuIFdhbGtzIGJhY2sgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBgT2JqZWN0YCdzIHByb3RvdHlwZVxuICogMi4gV2Fsa3MgZm9yd2FyZCB0byBuZXcgb2JqZWN0LCBjYWxsaW5nIGFueSBgaW5pdGlhbGl6ZWAgbWV0aG9kcyBpdCBmaW5kcyBhbG9uZyB0aGUgd2F5IHdpdGggdGhlIHNhbWUgY29udGV4dCBhbmQgYXJndW1lbnRzIHdpdGggd2hpY2ggdGhlIGNvbnN0cnVjdG9yIHdhcyBjYWxsZWQuXG4gKiBAcHJpdmF0ZVxuICogQG1lbWJlck9mIGV4dGVuZC1tZVxuICovXG5mdW5jdGlvbiBpbml0aWFsaXplUHJvdG90eXBlQ2hhaW4oKSB7XG4gICAgdmFyIHRlcm0gPSB0aGlzLFxuICAgICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgIHJlY3VyKHRlcm0pO1xuXG4gICAgZnVuY3Rpb24gcmVjdXIob2JqKSB7XG4gICAgICAgIHZhciBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmopO1xuICAgICAgICBpZiAocHJvdG8uY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgICAgICAgcmVjdXIocHJvdG8pO1xuICAgICAgICAgICAgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdpbml0aWFsaXplJykpIHtcbiAgICAgICAgICAgICAgICBwcm90by5pbml0aWFsaXplLmFwcGx5KHRlcm0sIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4dGVuZDtcbiIsIi8vIHRlbXBsZXggbm9kZSBtb2R1bGVcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qb25laXQvdGVtcGxleFxuXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cblxuLyoqXG4gKiBNZXJnZXMgdmFsdWVzIG9mIGV4ZWN1dGlvbiBjb250ZXh0IHByb3BlcnRpZXMgbmFtZWQgaW4gdGVtcGxhdGUgYnkge3Byb3AxfSxcbiAqIHtwcm9wMn0sIGV0Yy4sIG9yIGFueSBqYXZhc2NyaXB0IGV4cHJlc3Npb24gaW5jb3Jwb3JhdGluZyBzdWNoIHByb3AgbmFtZXMuXG4gKiBUaGUgY29udGV4dCBhbHdheXMgaW5jbHVkZXMgdGhlIGdsb2JhbCBvYmplY3QuIEluIGFkZGl0aW9uIHlvdSBjYW4gc3BlY2lmeSBhIHNpbmdsZVxuICogY29udGV4dCBvciBhbiBhcnJheSBvZiBjb250ZXh0cyB0byBzZWFyY2ggKGluIHRoZSBvcmRlciBnaXZlbikgYmVmb3JlIGZpbmFsbHlcbiAqIHNlYXJjaGluZyB0aGUgZ2xvYmFsIGNvbnRleHQuXG4gKlxuICogTWVyZ2UgZXhwcmVzc2lvbnMgY29uc2lzdGluZyBvZiBzaW1wbGUgbnVtZXJpYyB0ZXJtcywgc3VjaCBhcyB7MH0sIHsxfSwgZXRjLiwgZGVyZWZcbiAqIHRoZSBmaXJzdCBjb250ZXh0IGdpdmVuLCB3aGljaCBpcyBhc3N1bWVkIHRvIGJlIGFuIGFycmF5LiBBcyBhIGNvbnZlbmllbmNlIGZlYXR1cmUsXG4gKiBpZiBhZGRpdGlvbmFsIGFyZ3MgYXJlIGdpdmVuIGFmdGVyIGB0ZW1wbGF0ZWAsIGBhcmd1bWVudHNgIGlzIHVuc2hpZnRlZCBvbnRvIHRoZSBjb250ZXh0XG4gKiBhcnJheSwgdGh1cyBtYWtpbmcgZmlyc3QgYWRkaXRpb25hbCBhcmcgYXZhaWxhYmxlIGFzIHsxfSwgc2Vjb25kIGFzIHsyfSwgZXRjLiwgYXMgaW5cbiAqIGB0ZW1wbGV4KCdIZWxsbywgezF9IScsICdXb3JsZCcpYC4gKHswfSBpcyB0aGUgdGVtcGxhdGUgc28gY29uc2lkZXIgdGhpcyB0byBiZSAxLWJhc2VkLilcbiAqXG4gKiBJZiB5b3UgcHJlZmVyIHNvbWV0aGluZyBvdGhlciB0aGFuIGJyYWNlcywgcmVkZWZpbmUgYHRlbXBsZXgucmVnZXhwYC5cbiAqXG4gKiBTZWUgdGVzdHMgZm9yIGV4YW1wbGVzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZW1wbGF0ZVxuICogQHBhcmFtIHsuLi5zdHJpbmd9IFthcmdzXVxuICovXG5mdW5jdGlvbiB0ZW1wbGV4KHRlbXBsYXRlKSB7XG4gICAgdmFyIGNvbnRleHRzID0gdGhpcyBpbnN0YW5jZW9mIEFycmF5ID8gdGhpcyA6IFt0aGlzXTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHsgY29udGV4dHMudW5zaGlmdChhcmd1bWVudHMpOyB9XG4gICAgcmV0dXJuIHRlbXBsYXRlLnJlcGxhY2UodGVtcGxleC5yZWdleHAsIHRlbXBsZXgubWVyZ2VyLmJpbmQoY29udGV4dHMpKTtcbn1cblxudGVtcGxleC5yZWdleHAgPSAvXFx7KC4qPylcXH0vZztcblxudGVtcGxleC53aXRoID0gZnVuY3Rpb24gKGksIHMpIHtcbiAgICByZXR1cm4gJ3dpdGgodGhpc1snICsgaSArICddKXsnICsgcyArICd9Jztcbn07XG5cbnRlbXBsZXguY2FjaGUgPSBbXTtcblxudGVtcGxleC5kZXJlZiA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBpZiAoISh0aGlzLmxlbmd0aCBpbiB0ZW1wbGV4LmNhY2hlKSkge1xuICAgICAgICB2YXIgY29kZSA9ICdyZXR1cm4gZXZhbChleHByKSc7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBjb2RlID0gdGVtcGxleC53aXRoKGksIGNvZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGVtcGxleC5jYWNoZVt0aGlzLmxlbmd0aF0gPSBldmFsKCcoZnVuY3Rpb24oZXhwcil7JyArIGNvZGUgKyAnfSknKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1ldmFsXG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGV4LmNhY2hlW3RoaXMubGVuZ3RoXS5jYWxsKHRoaXMsIGtleSk7XG59O1xuXG50ZW1wbGV4Lm1lcmdlciA9IGZ1bmN0aW9uIChtYXRjaCwga2V5KSB7XG4gICAgLy8gQWR2YW5jZWQgZmVhdHVyZXM6IENvbnRleHQgY2FuIGJlIGEgbGlzdCBvZiBjb250ZXh0cyB3aGljaCBhcmUgc2VhcmNoZWQgaW4gb3JkZXIuXG4gICAgdmFyIHJlcGxhY2VtZW50O1xuXG4gICAgdHJ5IHtcbiAgICAgICAgcmVwbGFjZW1lbnQgPSBpc05hTihrZXkpID8gdGVtcGxleC5kZXJlZi5jYWxsKHRoaXMsIGtleSkgOiB0aGlzWzBdW2tleV07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXBsYWNlbWVudCA9ICd7JyArIGtleSArICd9JztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVwbGFjZW1lbnQ7XG59O1xuXG4vLyB0aGlzIGludGVyZmFjZSBjb25zaXN0cyBzb2xlbHkgb2YgdGhlIHRlbXBsZXggZnVuY3Rpb24gKGFuZCBpdCdzIHByb3BlcnRpZXMpXG5tb2R1bGUuZXhwb3J0cyA9IHRlbXBsZXg7XG4iLCIvKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmlsdGVyTm9kZSA9IHJlcXVpcmUoJy4vanMvRmlsdGVyTm9kZScpO1xudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi9qcy90ZW1wbGF0ZScpO1xudmFyIG9wZXJhdG9ycyA9IHJlcXVpcmUoJy4vanMvdHJlZS1vcGVyYXRvcnMnKTtcbnJlcXVpcmUoJy4vanMvRmlsdGVyTGVhZicpOyAvLyBpbnNlcnRzIGl0c2VsZiBpbnRvIEZpbHRlck5vZGUucHJvdG90eXBlLmZpbHRlcnMgYXMgbWVtYmVyICdEZWZhdWx0J1xuXG52YXIgb3JkaW5hbCA9IDA7XG5cbi8qKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAc3VtbWFyeSBSZXByZXNlbnRzIGEgY29tcGxleCBmaWx0ZXIgZXhwcmVzc2lvbi5cbiAqXG4gKiBAZGVzYyBBIGBGaWx0ZXJUcmVlYCBpcyBhbiBuLWFyeSB0cmVlIHdpdGggYSBzaW5nbGUgYG9wZXJhdG9yYCB0byBiZSBhcHBsaWVkIHRvIGFsbCBpdHMgYGNoaWxkcmVuYC5cbiAqXG4gKiBFYWNoIG9mIHRoZSBgY2hpbGRyZW5gIGNhbiBiZSBlaXRoZXI6XG4gKlxuICogKiBhIHRlcm5pbmFsIG5vZGUgYEZpbHRlcmAgKG9yIGFuIG9iamVjdCBpbmhlcml0aW5nIGZyb20gYEZpbHRlcmApIHJlcHJlc2VudGluZyBhc2ltcGxlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb247IG9yXG4gKiAqIGEgbmVzdGVkIGBGaWx0ZXJUcmVlYCByZXByZXNlbnRpbmcgYSBjb21wbGV4IHN1YmV4cHJlc3Npb24uXG4gKlxuICogVGhlIGBvcGVyYXRvcmAgbXVzdCBiZSBvbmUgb2YgdGhlIHtAbGluayBvcGVyYXRvcnN8dHJlZSBvcGVyYXRvcnN9IG9yIG1heSBiZSBsZWZ0IHVuZGVmaW5lZCBpZmYgdGhlcmUgaXMgb25seSBvbmUgY2hpbGQgbm9kZS5cbiAqXG4gKiBOb3RlczpcbiAqIDEuIEEgYEZpbHRlclRyZWVgIG1heSBjb25zaXN0IG9mIGEgc2luZ2xlIGxlYWYsIGluIHdoaWNoIGNhc2UgdGhlIGBvcGVyYXRvcmAgaXMgbm90IHVzZWQgYW5kIG1heSBiZSBsZWZ0IHVuZGVmaW5lZC4gSG93ZXZlciwgaWYgYSBzZWNvbmQgY2hpbGQgaXMgYWRkZWQgYW5kIHRoZSBvcGVyYXRvciBpcyBzdGlsbCB1bmRlZmluZWQsIGl0IHdpbGwgYmUgc2V0IHRvIHRoZSBkZWZhdWx0IChgJ29wLWFuZCdgKS5cbiAqIDIuIEEgX25lc3RlZF8gYEZpbHRlclRyZWVgIGNvbnRhaW5pbmcgYSBzaW5nbGUgY2hpbGQgaXMgcG9pbnRsZXNzIGFuZCBpcyBzZW1hbnRpY2FsbHkgaWRlbnRpY2FsIHRvIGEgdGVybWluYWwgbm9kZS5cbiAqIDMuIFRoZSBvcmRlciBvZiB0aGUgY2hpbGRyZW4gaXMgdW5kZWZpbmVkIGFzIGFsbCBvcGVyYXRvcnMgYXJlIGNvbW11dGF0aXZlLiBGb3IgdGhlICdgb3Atb3JgJyBvcGVyYXRvciwgZXZhbHVhdGlvbiBjZWFzZXMgb24gdGhlIGZpcnN0IHBvc2l0aXZlIHJlc3VsdCBhbmQgZm9yIGVmZmljaWVuY3ksIGFsbCBzaW1wbGUgY29uZGl0aW9uYWwgZXhwcmVzc2lvbnMgd2lsbCBiZSBldmFsdWF0ZWQgYmVmb3JlIGFueSBjb21wbGV4IHN1YmV4cHJlc3Npb25zLlxuICogNC4gQSBuZXN0ZWQgYEZpbHRlclRyZWVgIGlzIGRpc3Rpbmd1aXNoZWQgaW4gdGhlIEpTT04gb2JqZWN0IGZyb20gYSBgRmlsdGVyYCBieSB0aGUgcHJlc2VuY2Ugb2YgYSBgY2hpbGRyZW5gIG1lbWJlci5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ1tdfSBbZmllbGROYW1lc10gLSBBIGxpc3Qgb2YgZmllbGQgbmFtZXMgZm9yIGBGaWx0ZXJgIG9iamVjdHMgdG8gdXNlLiBNYXkgYmUgb3ZlcnJpZGRlbiBieSBkZWZpbmluZyBganNvbi5maWVsZE5hbWVzYCBoZXJlIG9yIGluIHRoZSBganNvbmAgcGFyYW1ldGVyIG9mIGFueSBkZXNjZW5kYW50IChpbmNsdWRpbmcgdGVybWluYWwgbm9kZXMpLiBJZiBubyBzdWNoIGRlZmluaXRpb24sIHdpbGwgc2VhcmNoIHVwIHRoZSB0cmVlIGZvciB0aGUgZmlyc3Qgbm9kZSB3aXRoIGEgZGVmaW5lZCBgZmllbGROYW1lc2AgbWVtYmVyLiBJbiBwcmFjdGljZSB0aGlzIHBhcmFtZXRlciBpcyBub3QgdXNlZCBoZXJlaW47IGl0IG1heSBiZSB1c2VkIGJ5IHRoZSBjYWxsZXIgZm9yIHRoZSB0b3AtbGV2ZWwgKHJvb3QpIHRyZWUuXG4gKiBAcGFyYW0ge0pTT059IFtqc29uXSAtIElmIG9tbWl0dGVkLCBsb2FkcyBhbiBlbXB0eSBmaWx0ZXIgKGEgYEZpbHRlclRyZWVgIGNvbnNpc3Rpbmcgb2YgYSBzaW5nbGUgdGVybWluYWwgbm9kZSBhbmQgdGhlIGRlZmF1bHQgYG9wZXJhdG9yYCB2YWx1ZSAoYCdvcC1hbmQnYCkuXG4gKiBAcGFyYW0ge0ZpbHRlclRyZWV9IFtwYXJlbnRdIC0gVXNlZCBpbnRlcm5hbGx5IHRvIGluc2VydCBlbGVtZW50IHdoZW4gY3JlYXRpbmcgbmVzdGVkIHN1YnRyZWVzLiBGb3IgdGhlIHRvcCBsZXZlbCB0cmVlLCB5b3UgZG9uJ3QgZ2l2ZSBhIHZhbHVlIGZvciBgcGFyZW50YDsgeW91IGFyZSByZXNwb25zaWJsZSBmb3IgaW5zZXJ0aW5nIHRoZSB0b3AtbGV2ZWwgYC5lbGAgaW50byB0aGUgRE9NLlxuICpcbiAqIEBwcm9wZXJ0eSB7RmlsdGVyVHJlZX0gcGFyZW50XG4gKiBAcHJvcGVydHkge251bWJlcn0gb3JkaW5hbFxuICogQHByb3BlcnR5IHtzdHJpbmd9IG9wZXJhdG9yXG4gKiBAcHJvcGVydHkge0ZpbHRlck5vZGVbXX0gY2hpbGRyZW4gLSBFYWNoIG9uZSBpcyBlaXRoZXIgYSBgRmlsdGVyYCAob3IgYW4gb2JqZWN0IGluaGVyaXRpbmcgZnJvbSBgRmlsdGVyYCkgb3IgYW5vdGhlciBgRmlsdGVyVHJlZWAuLlxuICogQHByb3BlcnR5IHtFbGVtZW50fSBlbCAtIFRoZSByb290IGVsZW1lbnQgb2YgdGhpcyAoc3ViKXRyZWUuXG4gKi9cbnZhciBGaWx0ZXJUcmVlID0gRmlsdGVyTm9kZS5leHRlbmQoJ0ZpbHRlclRyZWUnLCB7XG5cbiAgICBuZXdWaWV3OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5lbCA9IHRlbXBsYXRlKCd0cmVlJywgKytvcmRpbmFsKTtcblxuICAgICAgICAvL2lmICghdGhpcy5wYXJlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYXRjaENsaWNrLmJpbmQodGhpcykpO1xuICAgICAgICAvL31cbiAgICB9LFxuXG4gICAgZnJvbUpTT046IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgaWYgKGpzb24pIHtcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBKU09OIG9iamVjdFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBqc29uICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHZhciBlcnJNc2cgPSAnRXhwZWN0ZWQgYGpzb25gIHBhcmFtZXRlciB0byBiZSBhbiBvYmplY3QuJztcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGpzb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGVyck1zZyArPSAnIFNlZSBgSlNPTi5wYXJzZSgpYC4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyB0aGlzLkVycm9yKGVyck1zZyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIGBqc29uLmNoaWxkcmVuYFxuICAgICAgICAgICAgaWYgKCEoanNvbi5jaGlsZHJlbiBpbnN0YW5jZW9mIEFycmF5ICYmIGpzb24uY2hpbGRyZW4ubGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IHRoaXMuRXJyb3IoJ0V4cGVjdGVkIGBjaGlsZHJlbmAgZmllbGQgdG8gYmUgYSBub24tZW1wdHkgYXJyYXkuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNoaWxkcmVuID0gW107XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBqc29uLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oanNvbikgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICAgICAgICAgIHZhciBDb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGpzb24gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IHNlbGYuRXJyb3IoJ0V4cGVjdGVkIGNoaWxkIHRvIGJlIGFuIG9iamVjdCBjb250YWluaW5nIGVpdGhlciBgY2hpbGRyZW5gLCBgdHlwZWAsIG9yIG5laXRoZXIuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChqc29uLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIENvbnN0cnVjdG9yID0gRmlsdGVyVHJlZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBDb25zdHJ1Y3RvciA9IHNlbGYuZmlsdGVyc1tqc29uLnR5cGUgfHwgJ0RlZmF1bHQnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5jaGlsZHJlbi5wdXNoKG5ldyBDb25zdHJ1Y3Rvcihqc29uLCBzZWxmKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgYGpzb24ub3BlcmF0b3JgXG4gICAgICAgICAgICBpZiAoIShvcGVyYXRvcnNbanNvbi5vcGVyYXRvcl0gfHwganNvbi5vcGVyYXRvciA9PT0gdW5kZWZpbmVkICYmIGpzb24uY2hpbGRyZW4ubGVuZ3RoID09PSAxKSkge1xuICAgICAgICAgICAgICAgIHRocm93IHRoaXMuRXJyb3IoJ0V4cGVjdGVkIGBvcGVyYXRvcmAgZmllbGQgdG8gYmUgb25lIG9mOiAnICsgT2JqZWN0LmtleXMob3BlcmF0b3JzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm9wZXJhdG9yID0ganNvbi5vcGVyYXRvcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4gPSBbbmV3IHRoaXMuZmlsdGVycy5EZWZhdWx0KHVuZGVmaW5lZCwgdGhpcyldO1xuICAgICAgICAgICAgdGhpcy5vcGVyYXRvciA9ICdvcC1hbmQnO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByYWRpb0J1dHRvbiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignaW5wdXRbdmFsdWU9JyArIHRoaXMub3BlcmF0b3IgKyAnXScpO1xuICAgICAgICByYWRpb0J1dHRvbi5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpc1snZmlsdGVyLXRyZWUtY2hvb3NlLW9wZXJhdG9yJ10ocmFkaW9CdXR0b24pO1xuXG4gICAgICAgIEZpbHRlck5vZGUucHJvdG90eXBlLnJlbmRlci5jYWxsKHRoaXMpO1xuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtY2hvb3NlLW9wZXJhdG9yJzogZnVuY3Rpb24ocmFkaW9CdXR0b24pIHtcbiAgICAgICAgdGhpcy5vcGVyYXRvciA9IHJhZGlvQnV0dG9uLnZhbHVlO1xuXG4gICAgICAgIHZhciByYWRpb0J1dHRvbnMgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xhYmVsPmlucHV0LmZpbHRlci10cmVlLWNob29zZS1vcGVyYXRvcltuYW1lPScgKyByYWRpb0J1dHRvbi5uYW1lICsgJ10nKTtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwocmFkaW9CdXR0b25zKS5mb3JFYWNoKGZ1bmN0aW9uKHJhZGlvQnV0dG9uKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICAgICAgICByYWRpb0J1dHRvbi5wYXJlbnRFbGVtZW50LnN0eWxlLnRleHREZWNvcmF0aW9uID0gcmFkaW9CdXR0b24uY2hlY2tlZCA/ICdub25lJyA6ICdsaW5lLXRocm91Z2gnO1xuICAgICAgICB9KTtcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb3BlcmF0b3JzKSB7IHRoaXMuZWwuY2xhc3NMaXN0LnJlbW92ZShrZXkpOyB9XG4gICAgICAgIHRoaXMuZWwuY2xhc3NMaXN0LmFkZCh0aGlzLm9wZXJhdG9yKTtcbiAgICB9LFxuXG4gICAgJ2ZpbHRlci10cmVlLWFkZC1maWx0ZXInOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jaGlsZHJlbi5wdXNoKG5ldyB0aGlzLmZpbHRlcnMuRGVmYXVsdCh1bmRlZmluZWQsIHRoaXMpKTtcbiAgICB9LFxuXG4gICAgJ2ZpbHRlci10cmVlLWFkZCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmNoaWxkcmVuLnB1c2gobmV3IEZpbHRlclRyZWUodW5kZWZpbmVkLCB0aGlzKSk7XG4gICAgfSxcblxuICAgICdmaWx0ZXItdHJlZS1yZW1vdmUnOiBmdW5jdGlvbihlbHQpIHtcbiAgICAgICAgdmFyIGxpc3RJdGVtID0gZWx0LnBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICBsaXN0ID0gbGlzdEl0ZW0ucGFyZW50RWxlbWVudDtcblxuICAgICAgICBpZiAobGlzdC5jaGlsZHJlbi5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIC8vVE9ET1xuICAgICAgICAgICAgYWxlcnQoJ3NvbGUgcmVtYWluaW5nIGNvbmRpdGlvbmFsIHRvIGJlIHJlc2V0IChjbGVhcmVkKSByYXRoZXIgdGhhbiByZW1vdmVkJyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tYWxlcnRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW4sXG4gICAgICAgICAgICAgICAgZWwgPSBlbHQubmV4dEVsZW1lbnRTaWJsaW5nO1xuXG4gICAgICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkLCBpZHgpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQuZWwgPT09IGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjaGlsZHJlbltpZHhdO1xuICAgICAgICAgICAgICAgICAgICBsaXN0SXRlbS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB0b0pTT046IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gd2Fsayh0aGlzKTtcbiAgICB9XG5cbn0pO1xuXG5mdW5jdGlvbiB3YWxrKHRyZWUpIHtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBvcGVyYXRvcjogdHJlZS5vcGVyYXRvcixcbiAgICAgICAgY2hpbGRyZW46IFtdXG4gICAgfTtcblxuICAgIHRyZWUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICByZXN1bHQuY2hpbGRyZW4ucHVzaChjaGlsZCBpbnN0YW5jZW9mIEZpbHRlclRyZWUgPyB3YWxrKGNoaWxkKSA6IGNoaWxkKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGNhdGNoQ2xpY2soZXZ0KSB7XG4gICAgdmFyIGVsdCA9IGV2dC50YXJnZXQ7XG4gICAgaWYgKHRoaXNbZWx0LmNsYXNzTmFtZV0pIHtcbiAgICAgICAgdGhpc1tlbHQuY2xhc3NOYW1lXShlbHQpO1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzW2VsdC5wYXJlbnROb2RlLmNsYXNzTmFtZV0pIHtcbiAgICAgICAgdGhpc1tlbHQucGFyZW50Tm9kZS5jbGFzc05hbWVdKGVsdCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9XG59XG5cbndpbmRvdy5GaWx0ZXJUcmVlID0gRmlsdGVyVHJlZTtcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBGaWx0ZXJOb2RlID0gcmVxdWlyZSgnLi9GaWx0ZXJOb2RlJyk7XG5cbi8qKiBBIFwiZmlsdGVyIGxlYWZcIiBpcyBhIHRlcm1pbmFsIG5vZGUgaW4gYSBmaWx0ZXIgdHJlZSBhbmQgcmVwcmVzZW50cyBhIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24uXG4gKlxuICovXG52YXIgRmlsdGVyTGVhZiA9IEZpbHRlck5vZGUuZXh0ZW5kKCdGaWx0ZXJMZWFmJywge1xuXG4gICAgbmV3VmlldzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByb290ID0gdGhpcy5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgcm9vdC5jbGFzc05hbWUgPSAnZmlsdGVyLXRyZWUtZGVmYXVsdCc7XG5cbiAgICAgICAgdGhpcy5iaW5kaW5ncyA9IHtcbiAgICAgICAgICAgIGZpZWxkOiBtYWtlRWxlbWVudChyb290LCB0aGlzLmZpZWxkTmFtZXMpLFxuICAgICAgICAgICAgb3BlcmF0b3I6IG1ha2VFbGVtZW50KHJvb3QsIFsnPScsICfiiaAnLCAnPCcsICc+JywgJ+KJpCcsICfiiaUnXSksXG4gICAgICAgICAgICBhcmd1bWVudDogbWFrZUVsZW1lbnQocm9vdClcbiAgICAgICAgfTtcblxuICAgICAgICByb290LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2JyJykpO1xuICAgIH0sXG5cbiAgICBmcm9tSlNPTjogZnVuY3Rpb24oanNvbikge1xuICAgICAgICBpZiAoanNvbikge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGpzb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJpbmRpbmdzW2tleV0udmFsdWUgPSBqc29uW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGpzb24gPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMuYmluZGluZ3MpIHtcbiAgICAgICAgICAgIGpzb25ba2V5XSA9IHRoaXMuYmluZGluZ3Nba2V5XS52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ganNvbjtcbiAgICB9XG59KTtcblxuRmlsdGVyTm9kZS5wcm90b3R5cGUuZmlsdGVycy5EZWZhdWx0ID0gRmlsdGVyTGVhZjtcblxuLyoqIEB0eXBlZGVmIHZhbHVlT3B0aW9uXG4gKiBAcGFyYW0gdmFsdWVcbiAqIEBwYXJhbSB0ZXh0XG4gKi9cbi8qKiBAdHlwZWRlZiBvcHRpb25Hcm91cFxuICogQHBhcmFtIHtzdHJpbmd9IGxhYmVsXG4gKiBAcGFyYW0ge2ZpZWxkT3B0aW9uW119IG9wdGlvbnNcbiAqL1xuLyoqIEB0eXBlZGVmIHtzdHJpbmd8dmFsdWVPcHRpb258b3B0aW9uR3JvdXB8c3RyaW5nW119IGZpZWxkT3B0aW9uXG4gKiBAZGVzYyBJZiBhIHNpbXBsZSBhcnJheSBvZiBzdHJpbmcsIHlvdSBtdXN0IGFkZCBhIGBsYWJlbGAgcHJvcGVydHkgdG8gdGhlIGFycmF5LlxuICovXG4vKipcbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGNvbnRhaW5lclxuICogQHBhcmFtIG5hbWVcbiAqIEBwYXJhbSB7ZmllbGRPcHRpb25bXX0gb3B0aW9uc1xuICogQHBhcmFtIHtudWxsfHN0cmluZ30gW3Byb21wdF0gLSBJZiBvbWl0dGVkLCBibGFuayBwcm9tcHQgaW1wbGllZC4gYG51bGxgIHN1cHByZXNzZXMgcHJvbXB0IGFsdG9nZXRoZXIuXG4gKi9cbmZ1bmN0aW9uIG1ha2VFbGVtZW50KGNvbnRhaW5lciwgb3B0aW9ucywgcHJvbXB0KSB7XG4gICAgdmFyIGVsLFxuICAgICAgICB0YWdOYW1lID0gb3B0aW9ucyA/ICdzZWxlY3QnIDogJ2lucHV0JztcblxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHZhciBvcHRpb24gPSBvcHRpb25zWzBdO1xuICAgICAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgZWwuaW5uZXJIVE1MID0gb3B0aW9uLnRleHQgfHwgb3B0aW9uO1xuXG4gICAgICAgIHZhciBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgIGlucHV0LnR5cGUgPSAnaGlkZGVuJztcbiAgICAgICAgaW5wdXQudmFsdWUgPSBvcHRpb24udmFsdWUgfHwgb3B0aW9uO1xuICAgICAgICBlbC5hcHBlbmRDaGlsZChpbnB1dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZWwgPSBhZGRPcHRpb25zKHRhZ05hbWUsIG9wdGlvbnMsIHByb21wdCk7XG4gICAgfVxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChlbCk7XG4gICAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiBhZGRPcHRpb25zKHRhZ05hbWUsIG9wdGlvbnMsIHByb21wdCkge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGFkZDtcbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdzZWxlY3QnKSB7XG4gICAgICAgICAgICBhZGQgPSBlbC5hZGQ7XG4gICAgICAgICAgICBpZiAocHJvbXB0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZWwuYWRkKG5ldyBPcHRpb24ocHJvbXB0ID8gJygnICsgcHJvbXB0ICsgJyknIDogJycpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZCA9IGVsLmFwcGVuZENoaWxkO1xuICAgICAgICAgICAgZWwubGFiZWwgPSBwcm9tcHQ7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKG9wdGlvbikge1xuICAgICAgICAgICAgdmFyIG5ld0VsZW1lbnQ7XG4gICAgICAgICAgICBpZiAoKG9wdGlvbi5vcHRpb25zIHx8IG9wdGlvbikgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgIHZhciBvcHRncm91cCA9IGFkZE9wdGlvbnMoJ29wdGdyb3VwJywgb3B0aW9uLm9wdGlvbnMgfHwgb3B0aW9uLCBvcHRpb24ubGFiZWwpO1xuICAgICAgICAgICAgICAgIGVsLmFkZChvcHRncm91cCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld0VsZW1lbnQgPSB0eXBlb2Ygb3B0aW9uID09PSAnb2JqZWN0JyA/IG5ldyBPcHRpb24ob3B0aW9uLnRleHQsIG9wdGlvbi52YWx1ZSkgOiBuZXcgT3B0aW9uKG9wdGlvbik7XG4gICAgICAgICAgICAgICAgYWRkLmNhbGwoZWwsIG5ld0VsZW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGVsO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbHRlckxlYWY7XG4iLCIvKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kLW1lJyk7XG52YXIgQmFzZSA9IGV4dGVuZC5CYXNlO1xuXG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJyk7XG5cbmV4dGVuZC5kZWJ1ZyA9IHRydWU7XG5cbnZhciBGaWx0ZXJOb2RlID0gQmFzZS5leHRlbmQoe1xuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oZmllbGROYW1lcywganNvbiwgcGFyZW50KSB7XG4gICAgICAgIGlmICghKGZpZWxkTmFtZXMgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIC8vIDFzdCBwYXJhbSBgZmllbGROYW1lc2Agb21pdHRlZDsgc2hpZnQgb3RoZXIgcGFyYW1zXG4gICAgICAgICAgICBwYXJlbnQgPSBqc29uO1xuICAgICAgICAgICAganNvbiA9IGZpZWxkTmFtZXM7XG4gICAgICAgICAgICBmaWVsZE5hbWVzID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG5cbiAgICAgICAgdGhpcy5maWVsZE5hbWVzID0gZmllbGROYW1lcyB8fFxuICAgICAgICAgICAganNvbiAmJiBqc29uLmZpZWxkTmFtZXMgfHxcbiAgICAgICAgICAgIHBhcmVudCAmJiBwYXJlbnQuZmllbGROYW1lcztcblxuICAgICAgICBpZiAoIXRoaXMuZmllbGROYW1lcykge1xuICAgICAgICAgICAgdGhyb3cgdGhpcy5FcnJvcignTm8gZmllbGQgbmFtZXMgbGlzdC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubmV3VmlldygpO1xuICAgICAgICB0aGlzLmZyb21KU09OKGpzb24pO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH0sXG5cbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5wYXJlbnQpIHtcbiAgICAgICAgICAgIHZhciBuZXdMaXN0SXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGhpcy5DSElMRF9UQUcpO1xuICAgICAgICAgICAgbmV3TGlzdEl0ZW0uYXBwZW5kQ2hpbGQodGVtcGxhdGUoJ3JlbW92ZUJ1dHRvbicpKTtcbiAgICAgICAgICAgIG5ld0xpc3RJdGVtLmFwcGVuZENoaWxkKHRoaXMuZWwpO1xuICAgICAgICAgICAgdGhpcy5wYXJlbnQuZWwucXVlcnlTZWxlY3Rvcih0aGlzLkNISUxEUkVOX1RBRykuYXBwZW5kQ2hpbGQobmV3TGlzdEl0ZW0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIEVycm9yOiBmdW5jdGlvbihtc2cpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBFcnJvcignRmlsdGVyVHJlZTogJyArIG1zZyk7XG4gICAgfSxcblxuICAgIENISUxEUkVOX1RBRzogJ09MJyxcbiAgICBDSElMRF9UQUc6ICdMSScsXG4gICAgQ1NTX0NMQVNTX05BTUU6ICdmaWx0ZXItdHJlZScsXG5cbiAgICBmaWx0ZXJzOiB7IH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsdGVyTm9kZTtcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB0ZW1wbGV4ID0gcmVxdWlyZSgndGVtcGxleCcpO1xuXG52YXIgdGVtcGxhdGVzID0ge1xuXG50cmVlOiBmdW5jdGlvbigpIHsvKlxuPHNwYW4gY2xhc3M9XCJmaWx0ZXItdHJlZVwiXCI+XG4gICAgTWF0Y2hcbiAgICA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwiZmlsdGVyLXRyZWUtY2hvb3NlLW9wZXJhdG9yXCIgbmFtZT1cInRyZWVPcHsxfVwiIHZhbHVlPVwib3Atb3JcIj5hbnk8L2xhYmVsPlxuICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgY2xhc3M9XCJmaWx0ZXItdHJlZS1jaG9vc2Utb3BlcmF0b3JcIiBuYW1lPVwidHJlZU9wezF9XCIgdmFsdWU9XCJvcC1hbmRcIj5hbGw8L2xhYmVsPlxuICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgY2xhc3M9XCJmaWx0ZXItdHJlZS1jaG9vc2Utb3BlcmF0b3JcIiBuYW1lPVwidHJlZU9wezF9XCIgdmFsdWU9XCJvcC1ub3JcIj5ub25lPC9sYWJlbD5cbiAgICBvZjo8YnIvPlxuICAgIDxzcGFuIGNsYXNzPVwiZmlsdGVyLXRyZWUtYWRkLWZpbHRlclwiIHRpdGxlPVwiQWRkIGEgbmV3IGNvbmRpdGlvbmFsIHRvIHRoaXMgbWF0Y2guXCI+XG4gICAgICAgIDxkaXY+PC9kaXY+Y29uZGl0aW9uYWxcbiAgICA8L3NwYW4+XG4gICAgPHNwYW4gY2xhc3M9XCJmaWx0ZXItdHJlZS1hZGRcIiB0aXRsZT1cIkFkZCBhIG5ldyBzdWJtYXRjaCB1bmRlciB0aGlzIG1hdGNoLlwiPlxuICAgICAgICA8ZGl2PjwvZGl2PnN1YmV4cHJlc3Npb25cbiAgICA8L3NwYW4+XG4gICAgPG9sPjwvb2w+XG48L3NwYW4+XG4qL30sXG5cbnJlbW92ZUJ1dHRvbjogZnVuY3Rpb24oKSB7LypcbjxkaXYgY2xhc3M9XCJmaWx0ZXItdHJlZS1yZW1vdmVcIiB0aXRsZT1cImRlbGV0ZSBjb25kaXRpb25hbFwiPjwvZGl2PlxuKi99XG5cbn07XG5cbmZ1bmN0aW9uIGdldEFsbCh0ZW1wbGF0ZU5hbWUpIHtcbiAgICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHZhciB0ZXh0ID0gdGVtcGxhdGVzW3RlbXBsYXRlTmFtZV0udG9TdHJpbmcoKTtcbiAgICB2YXIgYmVnID0gdGV4dC5pbmRleE9mKCcvKicpO1xuICAgIHZhciBlbmQgPSB0ZXh0Lmxhc3RJbmRleE9mKCcqLycpO1xuICAgIGlmIChiZWcgPT09IC0xIHx8IGVuZCA9PT0gLTEpIHtcbiAgICAgICAgdGhyb3cgJ2JhZCB0ZW1wbGF0ZSc7XG4gICAgfVxuICAgIGJlZyArPSAyO1xuICAgIHRleHQgPSB0ZXh0LnN1YnN0cihiZWcsIGVuZCAtIGJlZyk7XG4gICAgdGV4dCA9IHRlbXBsZXguYXBwbHkodGhpcywgW3RleHRdLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSk7XG4gICAgdGVtcC5pbm5lckhUTUwgPSB0ZXh0O1xuICAgIHJldHVybiB0ZW1wLmNoaWxkcmVuO1xufVxuXG5mdW5jdGlvbiBnZXRGaXJzdCgpIHtcbiAgICByZXR1cm4gZ2V0QWxsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylbMF07XG59XG5cbmdldEZpcnN0LmdldEFsbCA9IGdldEFsbDtcblxubW9kdWxlLmV4cG9ydHMgPSBnZXRGaXJzdDtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgJ29wLWFuZCc6IHsgfSxcbiAgICAnb3Atb3InOiB7IH0sXG4gICAgJ29wLW5vcic6IHsgfVxufTtcbiJdfQ==
