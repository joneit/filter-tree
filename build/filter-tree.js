(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/* eslint-env browser */

/** @namespace cssInjector */

/**
 * @summary Insert base stylesheet into DOM
 *
 * @desc Creates a new `<style>...</style>` element from the named text string(s) and inserts it but only if it does not already exist in the specified container as per `referenceElement`.
 *
 * > Caveat: If stylesheet is for use in a shadow DOM, you must specify a local `referenceElement`.
 *
 * @returns A reference to the newly created `<style>...</style>` element.
 *
 * @param {string|string[]} cssRules
 * @param {string} [ID]
 * @param {undefined|null|Element|string} [referenceElement] - Container for insertion. Overloads:
 * * `undefined` type (or omitted): injects stylesheet at top of `<head>...</head>` element
 * * `null` value: injects stylesheet at bottom of `<head>...</head>` element
 * * `Element` type: injects stylesheet immediately before given element, wherever it is found.
 * * `string` type: injects stylesheet immediately before given first element found that matches the given css selector.
 *
 * @memberOf cssInjector
 */
function cssInjector(cssRules, ID, referenceElement) {
    if (typeof referenceElement === 'string') {
        referenceElement = document.querySelector(referenceElement);
        if (!referenceElement) {
            throw 'Cannot find reference element for CSS injection.';
        }
    } else if (referenceElement && !(referenceElement instanceof Element)) {
        throw 'Given value not a reference element.';
    }

    var container = referenceElement && referenceElement.parentNode || document.head || document.getElementsByTagName('head')[0];

    if (ID) {
        ID = cssInjector.idPrefix + ID;

        if (container.querySelector('#' + ID)) {
            return; // stylesheet already in DOM
        }
    }

    var style = document.createElement('style');
    style.type = 'text/css';
    if (ID) {
        style.id = ID;
    }
    if (cssRules instanceof Array) {
        cssRules = cssRules.join('\n');
    }
    cssRules = '\n' + cssRules + '\n';
    if (style.styleSheet) {
        style.styleSheet.cssText = cssRules;
    } else {
        style.appendChild(document.createTextNode(cssRules));
    }

    if (referenceElement === undefined) {
        referenceElement = container.firstChild;
    }

    container.insertBefore(style, referenceElement);

    return style;
}

/**
 * @summary Optional prefix for `<style>` tag IDs.
 * @desc Defaults to `'injected-stylesheet-'`.
 * @type {string}
 * @memberOf cssInjector
 */
cssInjector.idPrefix = 'injected-stylesheet-';

// Interface
module.exports = cssInjector;

},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var FilterNode = require('./FilterNode');

var operators = {
    '<': { test: function(a, b) { return a < b; } },
    '≤': { test: function(a, b) { return a <= b; }, SQL: '<=' },
    '=': { test: function(a, b) { return a === b; } },
    '≥': { test: function(a, b) { return a >= b; }, SQL: '>=' },
    '>': { test: function(a, b) { return a > b; } },
    '≠': { test: function(a, b) { return a !== b; }, SQL: '<>' }
};

/** @constructor
 * @summary A terminal node in a filter tree, representing a conditional expression.
 * @desc Also known as a "filter."
 */
var FilterLeaf = FilterNode.extend('FilterLeaf', {

    newView: function() {
        var root = this.el = document.createElement('span');
        root.className = 'filter-tree-default';

        this.bindings = {
            field: makeElement(root, this.parent.nodeFields || this.fields),
            operator: makeElement(root, Object.keys(operators)),
            argument: makeElement(root)
        };

        root.appendChild(document.createElement('br'));
    },

    fromJSON: function(json) {
        var value, element, i;
        if (json) {
            for (var key in json) {
                if (key !== 'fields' && key !== 'type') {
                    value = json[key];
                    element = this.bindings[key];
                    switch (element.type) {
                        case 'checkbox':
                        case 'radio':
                            element = document.querySelectorAll('input[name=\'' + element.name + '\']');
                            for (i = 0; i < element.length; i++) {
                                element[i].checked = value.indexOf(element[i].value) >= 0;
                            }
                            break;
                        case 'select-multiple':
                            element = element.options;
                            for (i = 0; i < element.length; i++) {
                                element[i].selected = value.indexOf(element[i].value) >= 0;
                            }
                            break;
                        default:
                            element.value = value;
                    }
                }
            }
        }
    },

    testString: function(s) {
        return operators[this.bindings.operator.value].test(s, this.bindings.argument.value);
    },

    testNumber: function(Ls, Ln) {
        var test = operators[this.bindings.operator.value].test,
            Rs = this.bindings.argument.value,
            Rn;

        return isNaN(Ln) || isNaN(Rn = Number(Rs)) ? test(Ls, Rs) : test(Ln, Rn);
    },

    toJSON: function() {
        var element, value, i, key, json = {};
        if (this.type) {
            json.type = this.type;
        }
        for (key in this.bindings) {
            element = this.bindings[key];
            switch (element.type) {
                case 'checkbox':
                case 'radio':
                    element = document.querySelectorAll('input[name=\'' + element.name + '\']:enabled:checked');
                    for (value = [], i = 0; i < element.length; i++) {
                        value.push(element[i].value);
                    }
                    break;
                case 'select-multiple':
                    element = element.options;
                    for (value = [], i = 0; i < element.length; i++) {
                        if (!element.disabled && element.selected) {
                            value.push(element[i].value);
                        }
                    }
                    break;
                default:
                    value = element.value;
            }
            json[key] = value;
        }
        return json;
    },

    toSQL: function() {
        return [
            this.bindings.field.value,
            operators[this.bindings.operator.value].SQL || this.bindings.operator.value,
            ' \'' + this.bindings.argument.value.replace(/'/g, '\'\'') + '\''
        ].join(' ');
    }
});

/** @typedef valueOption
 * @property {string} value
 * @property {string} text
 */
/** @typedef optionGroup
 * @property {string} label
 * @property {fieldOption[]} options
 */
/** @typedef {string|valueOption|optionGroup|string[]} fieldOption
 * @desc If a simple array of string, you must add a `label` property to the array.
 */
/**
 * @summary HTML form control factory.
 * @desc Creates and appends a text box or a drop-down.
 * @returns The new element.
 * @param {Element} container - An element to which to append the new element.
 * @param {fieldOption|fieldOption[]} [options] - Overloads:
 * * If omitted, will create an `<input/>` (text box) element.
 * * If a single option (either as a scalar or as the only element in an array), will create a `<span>...</span>` element containing the string and a `<input type=hidden>` containing the value.
 * * Otherwise, creates a `<select>...</select>` element with these strings added as `<option>...</option>` elements. Option groups may be specified as nested arrays.
 * @param {null|string} [prompt=''] - Adds an initial `<option>...</option>` element to the drop-down with this value, parenthesized, as its `text`; and empty string as its `value`. Omitting creates a blank prompt; `null` suppresses.
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

/**
 * @summary Creates a new element and adds options to it.
 * @param {string} tagName - Must be one of:
 * * `'input'` for a text box
 * * `'select'` for a drop-down
 * * `'optgroup'` (for internal use only)
 * @param {fieldOption[]} [options] - Strings to add as `<option>...</option>` elements. Omit when creating a text box.
 * @param {null|string} [prompt=''] - Adds an initial `<option>...</option>` element to the drop-down with `text` this value in parentheses, as its `text`; and empty string as its `value`. Omitting creates a blank prompt; `null` suppresses.
 * @returns {Element} Either a `<select>` or `<optgroup>` element.
 */
function addOptions(tagName, options, prompt) {
    var el = document.createElement(tagName);
    if (options) {
        var add;
        if (tagName === 'select') {
            add = el.add;
            if (prompt !== null) {
                el.add(new Option(prompt ? '(' + prompt + ')' : ''), '');
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

    initialize: function(options) {
        var parent = this.parent = options && options.parent,
            json = this.json = options && options.json;

        this.nodeFields = json && json.nodeFields ||
            options && (options.nodeFields || options.nodeFields);

        this.fields =
            json && (json.fields || json.fields) ||
            options && (options.fields || options.fields) ||
            parent && parent.fields;

        if (!(this.nodeFields || this.fields)) {
            throw this.Error('Expected a fields list.');
        }

        this.type = json && json.type ||
            options && options.type;

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
        return new Error('filter-tree: ' + msg);
    },

    CHILDREN_TAG: 'OL',
    CHILD_TAG: 'LI',
    CSS_CLASS_NAME: 'filter-tree'

});

module.exports = FilterNode;
},{"./template":7,"extend-me":2}],6:[function(require,module,exports){
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
css = '.filter-tree{font-family:sans-serif;line-height:1.5em}.filter-tree ol{margin-top:0}.filter-tree-add,.filter-tree-add-filter,.filter-tree-remove{cursor:pointer}.filter-tree-add,.filter-tree-add-filter{font-size:smaller;font-style:italic;margin-left:3em}.filter-tree-add-filter:hover,.filter-tree-add:hover{text-decoration:underline}.filter-tree-add-filter>div,.filter-tree-add>div,.filter-tree-remove{display:inline-block;width:15px;height:15px;border-radius:8px;background-color:#8c8;font-size:11.5px;font-weight:700;color:#fff;text-align:center;line-height:normal;font-style:normal;font-family:sans-serif;text-shadow:0 0 1.5px grey;margin-right:4px}.filter-tree-add-filter>div:before,.filter-tree-add>div:before{content:\'\\ff0b\'}.filter-tree-remove{background-color:#e88;border:0}.filter-tree-remove:before{content:\'\\2212\'}.filter-tree li::after{font-size:70%;font-style:italic;font-weight:700;color:#900}.filter-tree>ol>li:last-child::after{display:none}.op-or>ol>li::after{content:\'\\A0— OR —\'}.op-and>ol>li::after{content:\'\\A0— AND —\'}.op-nor>ol>li::after{content:\'\\A0— NOR —\'}.filter-tree-default>*{margin:0 .4em}.filter-tree-chooser{position:absolute;font-style:italic;background-color:#8c8;color:#fff;font-size:11.5px;outline:0;box-shadow:5px 5px 10px grey}';
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

window.FilterTree = FilterTree;
},{"./FilterLeaf":4,"./FilterNode":5,"./template":7,"./tree-operators":8,"css-injector":1}],7:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var templex = require('templex');

var templates = {

    tree: function() {
        /*
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
        */
    },

    removeButton: function() {
        /*
        <div class="filter-tree-remove" title="delete conditional"></div>
        */
    }

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
},{"templex":3}],8:[function(require,module,exports){
'use strict';

function AND(p, q) {
    return p && q;
}

function OR(p, q) {
    return p || q;
}

module.exports = {
    'op-and': {
        reduce: AND,
        seed: true,
        abort: false,
        negate: false,
        SQL: {
            op: 'AND',
            beg: '(',
            end: ')'
        }
    },
    'op-or': {
        reduce: OR,
        seed: false,
        abort: true,
        negate: false,
        SQL: {
            op: 'OR',
            beg: '(',
            end: ')'
        }
    },
    'op-nor': {
        reduce: OR,
        seed: false,
        abort: true,
        negate: true,
        SQL: {
            op: 'OR',
            beg: 'NOT  (',
            end: ')'
        }
    }
};
},{}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL25vZGVfbW9kdWxlcy9jc3MtaW5qZWN0b3IvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL2V4dGVuZC1tZS9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvdGVtcGxleC9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvRmlsdGVyTGVhZi5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvRmlsdGVyTm9kZS5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvZmFrZV8zYmZhMzM4Yi5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvc3JjL2pzL3RyZWUtb3BlcmF0b3JzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuLyoqIEBuYW1lc3BhY2UgY3NzSW5qZWN0b3IgKi9cblxuLyoqXG4gKiBAc3VtbWFyeSBJbnNlcnQgYmFzZSBzdHlsZXNoZWV0IGludG8gRE9NXG4gKlxuICogQGRlc2MgQ3JlYXRlcyBhIG5ldyBgPHN0eWxlPi4uLjwvc3R5bGU+YCBlbGVtZW50IGZyb20gdGhlIG5hbWVkIHRleHQgc3RyaW5nKHMpIGFuZCBpbnNlcnRzIGl0IGJ1dCBvbmx5IGlmIGl0IGRvZXMgbm90IGFscmVhZHkgZXhpc3QgaW4gdGhlIHNwZWNpZmllZCBjb250YWluZXIgYXMgcGVyIGByZWZlcmVuY2VFbGVtZW50YC5cbiAqXG4gKiA+IENhdmVhdDogSWYgc3R5bGVzaGVldCBpcyBmb3IgdXNlIGluIGEgc2hhZG93IERPTSwgeW91IG11c3Qgc3BlY2lmeSBhIGxvY2FsIGByZWZlcmVuY2VFbGVtZW50YC5cbiAqXG4gKiBAcmV0dXJucyBBIHJlZmVyZW5jZSB0byB0aGUgbmV3bHkgY3JlYXRlZCBgPHN0eWxlPi4uLjwvc3R5bGU+YCBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBjc3NSdWxlc1xuICogQHBhcmFtIHtzdHJpbmd9IFtJRF1cbiAqIEBwYXJhbSB7dW5kZWZpbmVkfG51bGx8RWxlbWVudHxzdHJpbmd9IFtyZWZlcmVuY2VFbGVtZW50XSAtIENvbnRhaW5lciBmb3IgaW5zZXJ0aW9uLiBPdmVybG9hZHM6XG4gKiAqIGB1bmRlZmluZWRgIHR5cGUgKG9yIG9taXR0ZWQpOiBpbmplY3RzIHN0eWxlc2hlZXQgYXQgdG9wIG9mIGA8aGVhZD4uLi48L2hlYWQ+YCBlbGVtZW50XG4gKiAqIGBudWxsYCB2YWx1ZTogaW5qZWN0cyBzdHlsZXNoZWV0IGF0IGJvdHRvbSBvZiBgPGhlYWQ+Li4uPC9oZWFkPmAgZWxlbWVudFxuICogKiBgRWxlbWVudGAgdHlwZTogaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBlbGVtZW50LCB3aGVyZXZlciBpdCBpcyBmb3VuZC5cbiAqICogYHN0cmluZ2AgdHlwZTogaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBmaXJzdCBlbGVtZW50IGZvdW5kIHRoYXQgbWF0Y2hlcyB0aGUgZ2l2ZW4gY3NzIHNlbGVjdG9yLlxuICpcbiAqIEBtZW1iZXJPZiBjc3NJbmplY3RvclxuICovXG5mdW5jdGlvbiBjc3NJbmplY3Rvcihjc3NSdWxlcywgSUQsIHJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICBpZiAodHlwZW9mIHJlZmVyZW5jZUVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHJlZmVyZW5jZUVsZW1lbnQpO1xuICAgICAgICBpZiAoIXJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICAgICAgICAgIHRocm93ICdDYW5ub3QgZmluZCByZWZlcmVuY2UgZWxlbWVudCBmb3IgQ1NTIGluamVjdGlvbi4nO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChyZWZlcmVuY2VFbGVtZW50ICYmICEocmVmZXJlbmNlRWxlbWVudCBpbnN0YW5jZW9mIEVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93ICdHaXZlbiB2YWx1ZSBub3QgYSByZWZlcmVuY2UgZWxlbWVudC4nO1xuICAgIH1cblxuICAgIHZhciBjb250YWluZXIgPSByZWZlcmVuY2VFbGVtZW50ICYmIHJlZmVyZW5jZUVsZW1lbnQucGFyZW50Tm9kZSB8fCBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG5cbiAgICBpZiAoSUQpIHtcbiAgICAgICAgSUQgPSBjc3NJbmplY3Rvci5pZFByZWZpeCArIElEO1xuXG4gICAgICAgIGlmIChjb250YWluZXIucXVlcnlTZWxlY3RvcignIycgKyBJRCkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gc3R5bGVzaGVldCBhbHJlYWR5IGluIERPTVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbiAgICBpZiAoSUQpIHtcbiAgICAgICAgc3R5bGUuaWQgPSBJRDtcbiAgICB9XG4gICAgaWYgKGNzc1J1bGVzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgY3NzUnVsZXMgPSBjc3NSdWxlcy5qb2luKCdcXG4nKTtcbiAgICB9XG4gICAgY3NzUnVsZXMgPSAnXFxuJyArIGNzc1J1bGVzICsgJ1xcbic7XG4gICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzUnVsZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzUnVsZXMpKTtcbiAgICB9XG5cbiAgICBpZiAocmVmZXJlbmNlRWxlbWVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBjb250YWluZXIuZmlyc3RDaGlsZDtcbiAgICB9XG5cbiAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKHN0eWxlLCByZWZlcmVuY2VFbGVtZW50KTtcblxuICAgIHJldHVybiBzdHlsZTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBPcHRpb25hbCBwcmVmaXggZm9yIGA8c3R5bGU+YCB0YWcgSURzLlxuICogQGRlc2MgRGVmYXVsdHMgdG8gYCdpbmplY3RlZC1zdHlsZXNoZWV0LSdgLlxuICogQHR5cGUge3N0cmluZ31cbiAqIEBtZW1iZXJPZiBjc3NJbmplY3RvclxuICovXG5jc3NJbmplY3Rvci5pZFByZWZpeCA9ICdpbmplY3RlZC1zdHlsZXNoZWV0LSc7XG5cbi8vIEludGVyZmFjZVxubW9kdWxlLmV4cG9ydHMgPSBjc3NJbmplY3RvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqIEBuYW1lc3BhY2UgZXh0ZW5kLW1lICoqL1xuXG4vKiogQHN1bW1hcnkgRXh0ZW5kcyBhbiBleGlzdGluZyBjb25zdHJ1Y3RvciBpbnRvIGEgbmV3IGNvbnN0cnVjdG9yLlxuICpcbiAqIEByZXR1cm5zIHtDaGlsZENvbnN0cnVjdG9yfSBBIG5ldyBjb25zdHJ1Y3RvciwgZXh0ZW5kZWQgZnJvbSB0aGUgZ2l2ZW4gY29udGV4dCwgcG9zc2libHkgd2l0aCBzb21lIHByb3RvdHlwZSBhZGRpdGlvbnMuXG4gKlxuICogQGRlc2MgRXh0ZW5kcyBcIm9iamVjdHNcIiAoY29uc3RydWN0b3JzKSwgd2l0aCBvcHRpb25hbCBhZGRpdGlvbmFsIGNvZGUsIG9wdGlvbmFsIHByb3RvdHlwZSBhZGRpdGlvbnMsIGFuZCBvcHRpb25hbCBwcm90b3R5cGUgbWVtYmVyIGFsaWFzZXMuXG4gKlxuICogPiBDQVZFQVQ6IE5vdCB0byBiZSBjb25mdXNlZCB3aXRoIFVuZGVyc2NvcmUtc3R5bGUgLmV4dGVuZCgpIHdoaWNoIGlzIHNvbWV0aGluZyBlbHNlIGVudGlyZWx5LiBJJ3ZlIHVzZWQgdGhlIG5hbWUgXCJleHRlbmRcIiBoZXJlIGJlY2F1c2Ugb3RoZXIgcGFja2FnZXMgKGxpa2UgQmFja2JvbmUuanMpIHVzZSBpdCB0aGlzIHdheS4gWW91IGFyZSBmcmVlIHRvIGNhbGwgaXQgd2hhdGV2ZXIgeW91IHdhbnQgd2hlbiB5b3UgXCJyZXF1aXJlXCIgaXQsIHN1Y2ggYXMgYHZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2V4dGVuZCcpYC5cbiAqXG4gKiBQcm92aWRlIGEgY29uc3RydWN0b3IgYXMgdGhlIGNvbnRleHQgYW5kIGFueSBwcm90b3R5cGUgYWRkaXRpb25zIHlvdSByZXF1aXJlIGluIHRoZSBmaXJzdCBhcmd1bWVudC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgaWYgeW91IHdpc2ggdG8gYmUgYWJsZSB0byBleHRlbmQgYEJhc2VDb25zdHJ1Y3RvcmAgdG8gYSBuZXcgY29uc3RydWN0b3Igd2l0aCBwcm90b3R5cGUgb3ZlcnJpZGVzIGFuZC9vciBhZGRpdGlvbnMsIGJhc2ljIHVzYWdlIGlzOlxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIHZhciBCYXNlID0gcmVxdWlyZSgnZXh0ZW5kLW1lJykuQmFzZTtcbiAqIHZhciBCYXNlQ29uc3RydWN0b3IgPSBCYXNlLmV4dGVuZChiYXNlUHJvdG90eXBlKTsgLy8gbWl4ZXMgaW4gLmV4dGVuZFxuICogdmFyIENoaWxkQ29uc3RydWN0b3IgPSBCYXNlQ29uc3RydWN0b3IuZXh0ZW5kKGNoaWxkUHJvdG90eXBlT3ZlcnJpZGVzQW5kQWRkaXRpb25zKTtcbiAqIHZhciBHcmFuZGNoaWxkQ29uc3RydWN0b3IgPSBDaGlsZENvbnN0cnVjdG9yLmV4dGVuZChncmFuZGNoaWxkUHJvdG90eXBlT3ZlcnJpZGVzQW5kQWRkaXRpb25zKTtcbiAqIGBgYFxuICpcbiAqIFRoaXMgZnVuY3Rpb24gKGBleHRlbmQoKWApIGlzIGFkZGVkIHRvIHRoZSBuZXcgZXh0ZW5kZWQgb2JqZWN0IGNvbnN0cnVjdG9yIGFzIGEgcHJvcGVydHkgYC5leHRlbmRgLCBlc3NlbnRpYWxseSBtYWtpbmcgdGhlIG9iamVjdCBjb25zdHJ1Y3RvciBpdHNlbGYgZWFzaWx5IFwiZXh0ZW5kYWJsZS5cIiAoTm90ZTogVGhpcyBpcyBhIHByb3BlcnR5IG9mIGVhY2ggY29uc3RydWN0b3IgYW5kIG5vdCBhIG1ldGhvZCBvZiBpdHMgcHJvdG90eXBlISlcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gW2V4dGVuZGVkQ2xhc3NOYW1lXSAtIFRoaXMgaXMgc2ltcGx5IGFkZGVkIHRvIHRoZSBwcm90b3R5cGUgYXMgJCRDTEFTU19OQU1FLiBVc2VmdWwgZm9yIGRlYnVnZ2luZyBiZWNhdXNlIGFsbCBkZXJpdmVkIGNvbnN0cnVjdG9ycyBhcHBlYXIgdG8gaGF2ZSB0aGUgc2FtZSBuYW1lIChcIkNvbnN0cnVjdG9yXCIpIGluIHRoZSBkZWJ1Z2dlci4gVGhpcyBwcm9wZXJ0eSBpcyBpZ25vcmVkIHVubGVzcyBgZXh0ZW5kLmRlYnVnYCBpcyBleHBsaWNpdGx5IHNldCB0byBhIHRydXRoeSB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0ge2V4dGVuZGVkUHJvdG90eXBlQWRkaXRpb25zT2JqZWN0fSBbcHJvdG90eXBlQWRkaXRpb25zXSAtIE9iamVjdCB3aXRoIG1lbWJlcnMgdG8gY29weSB0byBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIE1vc3QgbWVtYmVycyB3aWxsIGJlIGNvcGllZCB0byB0aGUgcHJvdG90eXBlLiBTb21lIG1lbWJlcnMsIGhvd2V2ZXIsIGhhdmUgc3BlY2lhbCBtZWFuaW5ncyBhcyBleHBsYWluZWQgaW4gdGhlIHtAbGluayBleHRlbmRlZFByb3RvdHlwZUFkZGl0aW9uc09iamVjdHx0eXBlIGRlZmluaXRpb259IChhbmQgbWF5IG9yIG1heSBub3QgYmUgY29waWVkIHRvIHRoZSBwcm90b3R5cGUpLlxuICpcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2RlYnVnXSAtIFNlZSBwYXJhbWV0ZXIgYGV4dGVuZGVkQ2xhc3NOYW1lYCBfKGFib3ZlKV8uXG4gKlxuICogQHByb3BlcnR5IHtvYmplY3R9IEJhc2UgLSBBIGNvbnZlbmllbnQgYmFzZSBjbGFzcyBmcm9tIHdoaWNoIGFsbCBvdGhlciBjbGFzc2VzIGNhbiBiZSBleHRlbmRlZC5cbiAqXG4gKiBAbWVtYmVyT2YgZXh0ZW5kLW1lXG4gKi9cbmZ1bmN0aW9uIGV4dGVuZChleHRlbmRlZENsYXNzTmFtZSwgcHJvdG90eXBlQWRkaXRpb25zKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucyA9IHt9O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucyA9IGV4dGVuZGVkQ2xhc3NOYW1lO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm90b3R5cGVBZGRpdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ1NpbmdsZSBwYXJhbWV0ZXIgb3ZlcmxvYWQgbXVzdCBiZSBvYmplY3QuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGV4dGVuZGVkQ2xhc3NOYW1lID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0ZW5kZWRDbGFzc05hbWUgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBwcm90b3R5cGVBZGRpdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ1R3byBwYXJhbWV0ZXIgb3ZlcmxvYWQgbXVzdCBiZSBzdHJpbmcsIG9iamVjdC4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyAnVG9vIG1hbnkgcGFyYW1ldGVycyc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQ29uc3RydWN0b3IoKSB7XG4gICAgICAgIGlmIChwcm90b3R5cGVBZGRpdGlvbnMucHJlSW5pdGlhbGl6ZSkge1xuICAgICAgICAgICAgcHJvdG90eXBlQWRkaXRpb25zLnByZUluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluaXRpYWxpemVQcm90b3R5cGVDaGFpbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAgIGlmIChwcm90b3R5cGVBZGRpdGlvbnMucG9zdEluaXRpYWxpemUpIHtcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucy5wb3N0SW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgQ29uc3RydWN0b3IuZXh0ZW5kID0gZXh0ZW5kO1xuXG4gICAgdmFyIHByb3RvdHlwZSA9IENvbnN0cnVjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodGhpcy5wcm90b3R5cGUpO1xuICAgIHByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuXG4gICAgaWYgKGV4dGVuZGVkQ2xhc3NOYW1lICYmIGV4dGVuZC5kZWJ1Zykge1xuICAgICAgICBwcm90b3R5cGUuJCRDTEFTU19OQU1FID0gZXh0ZW5kZWRDbGFzc05hbWU7XG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIHByb3RvdHlwZUFkZGl0aW9ucykge1xuICAgICAgICBpZiAocHJvdG90eXBlQWRkaXRpb25zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3RvdHlwZUFkZGl0aW9uc1trZXldO1xuICAgICAgICAgICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdpbml0aWFsaXplT3duJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxyZWFkeSBjYWxsZWQgYWJvdmU7IG5vdCBuZWVkZWQgaW4gcHJvdG90eXBlXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2FsaWFzZXMnOlxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBhbGlhcyBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KGFsaWFzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ha2VBbGlhcyh2YWx1ZVthbGlhc10sIGFsaWFzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZVswXSA9PT0gJyMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYWtlQWxpYXModmFsdWUsIGtleS5zdWJzdHIoMSkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG90eXBlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIENvbnN0cnVjdG9yO1xuXG4gICAgZnVuY3Rpb24gbWFrZUFsaWFzKHZhbHVlLCBrZXkpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgICAgcHJvdG90eXBlW2tleV0gPSBwcm90b3R5cGVBZGRpdGlvbnNbdmFsdWVdO1xuICAgIH1cbn1cblxuZXh0ZW5kLkJhc2UgPSBmdW5jdGlvbiAoKSB7fTtcbmV4dGVuZC5CYXNlLmV4dGVuZCA9IGV4dGVuZDtcblxuLyoqIEB0eXBlZGVmIHtmdW5jdGlvbn0gZXh0ZW5kZWRDb25zdHJ1Y3RvclxuICogQHByb3BlcnR5IHByb3RvdHlwZS5zdXBlciAtIEEgcmVmZXJlbmNlIHRvIHRoZSBwcm90b3R5cGUgdGhpcyBjb25zdHJ1Y3RvciB3YXMgZXh0ZW5kZWQgZnJvbS5cbiAqIEBwcm9wZXJ0eSBbZXh0ZW5kXSAtIElmIGBwcm90b3R5cGVBZGRpdGlvbnMuZXh0ZW5kYWJsZWAgd2FzIHRydXRoeSwgdGhpcyB3aWxsIGJlIGEgcmVmZXJlbmNlIHRvIHtAbGluayBleHRlbmQuZXh0ZW5kfGV4dGVuZH0uXG4gKi9cblxuLyoqIEB0eXBlZGVmIHtvYmplY3R9IGV4dGVuZGVkUHJvdG90eXBlQWRkaXRpb25zT2JqZWN0XG4gKiBAcHJvcGVydHkge2Z1bmN0aW9ufSBbaW5pdGlhbGl6ZV0gLSBBZGRpdGlvbmFsIGNvbnN0cnVjdG9yIGNvZGUgZm9yIG5ldyBvYmplY3QuIFRoaXMgbWV0aG9kIGlzIGFkZGVkIHRvIHRoZSBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIEdldHMgcGFzc2VkIG5ldyBvYmplY3QgYXMgY29udGV4dCArIHNhbWUgYXJncyBhcyBjb25zdHJ1Y3RvciBpdHNlbGYuIENhbGxlZCBvbiBpbnN0YW50aWF0aW9uIGFmdGVyIHNpbWlsYXIgZnVuY3Rpb24gaW4gYWxsIGFuY2VzdG9ycyBjYWxsZWQgd2l0aCBzYW1lIHNpZ25hdHVyZS5cbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb259IFtpbml0aWFsaXplT3duXSAtIEFkZGl0aW9uYWwgY29uc3RydWN0b3IgY29kZSBmb3IgbmV3IG9iamVjdC4gVGhpcyBtZXRob2QgaXMgYWRkZWQgdG8gdGhlIG5ldyBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS4gR2V0cyBwYXNzZWQgbmV3IG9iamVjdCBhcyBjb250ZXh0ICsgc2FtZSBhcmdzIGFzIGNvbnN0cnVjdG9yIGl0c2VsZi4gQ2FsbGVkIG9uIGluc3RhbnRpYXRpb24gYWZ0ZXIgKGFsbCkgdGhlIGBpbml0aWFsaXplYCBmdW5jdGlvbihzKS5cbiAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBbYWxpYXNlc10gLSBIYXNoIG9mIGFsaWFzZXMgZm9yIHByb3RvdHlwZSBtZW1iZXJzIGluIGZvcm0gYHsga2V5OiAnbWVtYmVyJywgLi4uIH1gIHdoZXJlIGBrZXlgIGlzIHRoZSBuYW1lIG9mIGFuIGFsaWVhcyBhbmQgYCdtZW1iZXInYCBpcyB0aGUgbmFtZSBvZiBhbiBleGlzdGluZyBtZW1iZXIgaW4gdGhlIHByb3RvdHlwZS4gRWFjaCBzdWNoIGtleSBpcyBhZGRlZCB0byB0aGUgcHJvdG90eXBlIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBuYW1lZCBtZW1iZXIuIChUaGUgYGFsaWFzZXNgIG9iamVjdCBpdHNlbGYgaXMgKm5vdCogYWRkZWQgdG8gcHJvdG90eXBlLikgQWx0ZXJuYXRpdmVseTpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBba2V5c10gLSBBcmJpdHJhcnkgcHJvcGVydHkgbmFtZXMgZGVmaW5lZCBoZXJlIHdpdGggc3RyaW5nIHZhbHVlcyBzdGFydGluZyB3aXRoIGEgYCNgIGNoYXJhY3RlciB3aWxsIGFsaWFzIHRoZSBhY3R1YWwgcHJvcGVydGllcyBuYW1lZCBpbiB0aGUgc3RyaW5ncyAoZm9sbG93aW5nIHRoZSBgI2ApLiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHRvIHByb3ZpZGluZyBhbiBgYWxpYXNlc2AgaGFzaCwgcGVyaGFwcyBzaW1wbGVyICh0aG91Z2ggc3VidGxlcikuIChVc2UgYXJiaXRyYXJ5IGlkZW50aWZpZXJzIGhlcmU7IGRvbid0IHVzZSB0aGUgbmFtZSBga2V5c2AhKVxuICogQHByb3BlcnR5IHsqfSBbYXJiaXRyYXJ5UHJvcGVydGllc10gLSBBbnkgYWRkaXRpb25hbCBhcmJpdHJhcnkgcHJvcGVydGllcyBkZWZpbmVkIGhlcmUgd2lsbCBiZSBhZGRlZCB0byB0aGUgbmV3IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLiAoVXNlIGFyYml0cmFyeSBpZGVudGlmaWVycyBoZXJlOyBkb24ndCB1c2UgdGhlIG5hbWUgYGFyaWJpdHJhcnlQcm9wZXJ0aWVzYCEpXG4gKi9cblxuLyoqIEBzdW1tYXJ5IENhbGwgYWxsIGBpbml0aWFsaXplYCBtZXRob2RzIGZvdW5kIGluIHByb3RvdHlwZSBjaGFpbi5cbiAqIEBkZXNjIFRoaXMgcmVjdXJzaXZlIHJvdXRpbmUgaXMgY2FsbGVkIGJ5IHRoZSBjb25zdHJ1Y3Rvci5cbiAqIDEuIFdhbGtzIGJhY2sgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBgT2JqZWN0YCdzIHByb3RvdHlwZVxuICogMi4gV2Fsa3MgZm9yd2FyZCB0byBuZXcgb2JqZWN0LCBjYWxsaW5nIGFueSBgaW5pdGlhbGl6ZWAgbWV0aG9kcyBpdCBmaW5kcyBhbG9uZyB0aGUgd2F5IHdpdGggdGhlIHNhbWUgY29udGV4dCBhbmQgYXJndW1lbnRzIHdpdGggd2hpY2ggdGhlIGNvbnN0cnVjdG9yIHdhcyBjYWxsZWQuXG4gKiBAcHJpdmF0ZVxuICogQG1lbWJlck9mIGV4dGVuZC1tZVxuICovXG5mdW5jdGlvbiBpbml0aWFsaXplUHJvdG90eXBlQ2hhaW4oKSB7XG4gICAgdmFyIHRlcm0gPSB0aGlzLFxuICAgICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgIHJlY3VyKHRlcm0pO1xuXG4gICAgZnVuY3Rpb24gcmVjdXIob2JqKSB7XG4gICAgICAgIHZhciBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmopO1xuICAgICAgICBpZiAocHJvdG8uY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgICAgICAgcmVjdXIocHJvdG8pO1xuICAgICAgICAgICAgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdpbml0aWFsaXplJykpIHtcbiAgICAgICAgICAgICAgICBwcm90by5pbml0aWFsaXplLmFwcGx5KHRlcm0sIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4dGVuZDtcbiIsIi8vIHRlbXBsZXggbm9kZSBtb2R1bGVcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qb25laXQvdGVtcGxleFxuXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cblxuLyoqXG4gKiBNZXJnZXMgdmFsdWVzIG9mIGV4ZWN1dGlvbiBjb250ZXh0IHByb3BlcnRpZXMgbmFtZWQgaW4gdGVtcGxhdGUgYnkge3Byb3AxfSxcbiAqIHtwcm9wMn0sIGV0Yy4sIG9yIGFueSBqYXZhc2NyaXB0IGV4cHJlc3Npb24gaW5jb3Jwb3JhdGluZyBzdWNoIHByb3AgbmFtZXMuXG4gKiBUaGUgY29udGV4dCBhbHdheXMgaW5jbHVkZXMgdGhlIGdsb2JhbCBvYmplY3QuIEluIGFkZGl0aW9uIHlvdSBjYW4gc3BlY2lmeSBhIHNpbmdsZVxuICogY29udGV4dCBvciBhbiBhcnJheSBvZiBjb250ZXh0cyB0byBzZWFyY2ggKGluIHRoZSBvcmRlciBnaXZlbikgYmVmb3JlIGZpbmFsbHlcbiAqIHNlYXJjaGluZyB0aGUgZ2xvYmFsIGNvbnRleHQuXG4gKlxuICogTWVyZ2UgZXhwcmVzc2lvbnMgY29uc2lzdGluZyBvZiBzaW1wbGUgbnVtZXJpYyB0ZXJtcywgc3VjaCBhcyB7MH0sIHsxfSwgZXRjLiwgZGVyZWZcbiAqIHRoZSBmaXJzdCBjb250ZXh0IGdpdmVuLCB3aGljaCBpcyBhc3N1bWVkIHRvIGJlIGFuIGFycmF5LiBBcyBhIGNvbnZlbmllbmNlIGZlYXR1cmUsXG4gKiBpZiBhZGRpdGlvbmFsIGFyZ3MgYXJlIGdpdmVuIGFmdGVyIGB0ZW1wbGF0ZWAsIGBhcmd1bWVudHNgIGlzIHVuc2hpZnRlZCBvbnRvIHRoZSBjb250ZXh0XG4gKiBhcnJheSwgdGh1cyBtYWtpbmcgZmlyc3QgYWRkaXRpb25hbCBhcmcgYXZhaWxhYmxlIGFzIHsxfSwgc2Vjb25kIGFzIHsyfSwgZXRjLiwgYXMgaW5cbiAqIGB0ZW1wbGV4KCdIZWxsbywgezF9IScsICdXb3JsZCcpYC4gKHswfSBpcyB0aGUgdGVtcGxhdGUgc28gY29uc2lkZXIgdGhpcyB0byBiZSAxLWJhc2VkLilcbiAqXG4gKiBJZiB5b3UgcHJlZmVyIHNvbWV0aGluZyBvdGhlciB0aGFuIGJyYWNlcywgcmVkZWZpbmUgYHRlbXBsZXgucmVnZXhwYC5cbiAqXG4gKiBTZWUgdGVzdHMgZm9yIGV4YW1wbGVzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZW1wbGF0ZVxuICogQHBhcmFtIHsuLi5zdHJpbmd9IFthcmdzXVxuICovXG5mdW5jdGlvbiB0ZW1wbGV4KHRlbXBsYXRlKSB7XG4gICAgdmFyIGNvbnRleHRzID0gdGhpcyBpbnN0YW5jZW9mIEFycmF5ID8gdGhpcyA6IFt0aGlzXTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHsgY29udGV4dHMudW5zaGlmdChhcmd1bWVudHMpOyB9XG4gICAgcmV0dXJuIHRlbXBsYXRlLnJlcGxhY2UodGVtcGxleC5yZWdleHAsIHRlbXBsZXgubWVyZ2VyLmJpbmQoY29udGV4dHMpKTtcbn1cblxudGVtcGxleC5yZWdleHAgPSAvXFx7KC4qPylcXH0vZztcblxudGVtcGxleC53aXRoID0gZnVuY3Rpb24gKGksIHMpIHtcbiAgICByZXR1cm4gJ3dpdGgodGhpc1snICsgaSArICddKXsnICsgcyArICd9Jztcbn07XG5cbnRlbXBsZXguY2FjaGUgPSBbXTtcblxudGVtcGxleC5kZXJlZiA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBpZiAoISh0aGlzLmxlbmd0aCBpbiB0ZW1wbGV4LmNhY2hlKSkge1xuICAgICAgICB2YXIgY29kZSA9ICdyZXR1cm4gZXZhbChleHByKSc7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBjb2RlID0gdGVtcGxleC53aXRoKGksIGNvZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGVtcGxleC5jYWNoZVt0aGlzLmxlbmd0aF0gPSBldmFsKCcoZnVuY3Rpb24oZXhwcil7JyArIGNvZGUgKyAnfSknKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1ldmFsXG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGV4LmNhY2hlW3RoaXMubGVuZ3RoXS5jYWxsKHRoaXMsIGtleSk7XG59O1xuXG50ZW1wbGV4Lm1lcmdlciA9IGZ1bmN0aW9uIChtYXRjaCwga2V5KSB7XG4gICAgLy8gQWR2YW5jZWQgZmVhdHVyZXM6IENvbnRleHQgY2FuIGJlIGEgbGlzdCBvZiBjb250ZXh0cyB3aGljaCBhcmUgc2VhcmNoZWQgaW4gb3JkZXIuXG4gICAgdmFyIHJlcGxhY2VtZW50O1xuXG4gICAgdHJ5IHtcbiAgICAgICAgcmVwbGFjZW1lbnQgPSBpc05hTihrZXkpID8gdGVtcGxleC5kZXJlZi5jYWxsKHRoaXMsIGtleSkgOiB0aGlzWzBdW2tleV07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXBsYWNlbWVudCA9ICd7JyArIGtleSArICd9JztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVwbGFjZW1lbnQ7XG59O1xuXG4vLyB0aGlzIGludGVyZmFjZSBjb25zaXN0cyBzb2xlbHkgb2YgdGhlIHRlbXBsZXggZnVuY3Rpb24gKGFuZCBpdCdzIHByb3BlcnRpZXMpXG5tb2R1bGUuZXhwb3J0cyA9IHRlbXBsZXg7XG4iLCIvKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmlsdGVyTm9kZSA9IHJlcXVpcmUoJy4vRmlsdGVyTm9kZScpO1xuXG52YXIgb3BlcmF0b3JzID0ge1xuICAgICc8JzogeyB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhIDwgYjsgfSB9LFxuICAgICfiiaQnOiB7IHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPD0gYjsgfSwgU1FMOiAnPD0nIH0sXG4gICAgJz0nOiB7IHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPT09IGI7IH0gfSxcbiAgICAn4omlJzogeyB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhID49IGI7IH0sIFNRTDogJz49JyB9LFxuICAgICc+JzogeyB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhID4gYjsgfSB9LFxuICAgICfiiaAnOiB7IHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgIT09IGI7IH0sIFNRTDogJzw+JyB9XG59O1xuXG4vKiogQGNvbnN0cnVjdG9yXG4gKiBAc3VtbWFyeSBBIHRlcm1pbmFsIG5vZGUgaW4gYSBmaWx0ZXIgdHJlZSwgcmVwcmVzZW50aW5nIGEgY29uZGl0aW9uYWwgZXhwcmVzc2lvbi5cbiAqIEBkZXNjIEFsc28ga25vd24gYXMgYSBcImZpbHRlci5cIlxuICovXG52YXIgRmlsdGVyTGVhZiA9IEZpbHRlck5vZGUuZXh0ZW5kKCdGaWx0ZXJMZWFmJywge1xuXG4gICAgbmV3VmlldzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByb290ID0gdGhpcy5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgcm9vdC5jbGFzc05hbWUgPSAnZmlsdGVyLXRyZWUtZGVmYXVsdCc7XG5cbiAgICAgICAgdGhpcy5iaW5kaW5ncyA9IHtcbiAgICAgICAgICAgIGZpZWxkOiBtYWtlRWxlbWVudChyb290LCB0aGlzLnBhcmVudC5ub2RlRmllbGRzIHx8IHRoaXMuZmllbGRzKSxcbiAgICAgICAgICAgIG9wZXJhdG9yOiBtYWtlRWxlbWVudChyb290LCBPYmplY3Qua2V5cyhvcGVyYXRvcnMpKSxcbiAgICAgICAgICAgIGFyZ3VtZW50OiBtYWtlRWxlbWVudChyb290KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJvb3QuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnInKSk7XG4gICAgfSxcblxuICAgIGZyb21KU09OOiBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIHZhciB2YWx1ZSwgZWxlbWVudCwgaTtcbiAgICAgICAgaWYgKGpzb24pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBqc29uKSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gJ2ZpZWxkcycgJiYga2V5ICE9PSAndHlwZScpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBqc29uW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLmJpbmRpbmdzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZWxlbWVudC50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W25hbWU9XFwnJyArIGVsZW1lbnQubmFtZSArICdcXCddJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGVsZW1lbnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudFtpXS5jaGVja2VkID0gdmFsdWUuaW5kZXhPZihlbGVtZW50W2ldLnZhbHVlKSA+PSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub3B0aW9ucztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZWxlbWVudC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50W2ldLnNlbGVjdGVkID0gdmFsdWUuaW5kZXhPZihlbGVtZW50W2ldLnZhbHVlKSA+PSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIHRlc3RTdHJpbmc6IGZ1bmN0aW9uKHMpIHtcbiAgICAgICAgcmV0dXJuIG9wZXJhdG9yc1t0aGlzLmJpbmRpbmdzLm9wZXJhdG9yLnZhbHVlXS50ZXN0KHMsIHRoaXMuYmluZGluZ3MuYXJndW1lbnQudmFsdWUpO1xuICAgIH0sXG5cbiAgICB0ZXN0TnVtYmVyOiBmdW5jdGlvbihMcywgTG4pIHtcbiAgICAgICAgdmFyIHRlc3QgPSBvcGVyYXRvcnNbdGhpcy5iaW5kaW5ncy5vcGVyYXRvci52YWx1ZV0udGVzdCxcbiAgICAgICAgICAgIFJzID0gdGhpcy5iaW5kaW5ncy5hcmd1bWVudC52YWx1ZSxcbiAgICAgICAgICAgIFJuO1xuXG4gICAgICAgIHJldHVybiBpc05hTihMbikgfHwgaXNOYU4oUm4gPSBOdW1iZXIoUnMpKSA/IHRlc3QoTHMsIFJzKSA6IHRlc3QoTG4sIFJuKTtcbiAgICB9LFxuXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQsIHZhbHVlLCBpLCBrZXksIGpzb24gPSB7fTtcbiAgICAgICAgaWYgKHRoaXMudHlwZSkge1xuICAgICAgICAgICAganNvbi50eXBlID0gdGhpcy50eXBlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoa2V5IGluIHRoaXMuYmluZGluZ3MpIHtcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLmJpbmRpbmdzW2tleV07XG4gICAgICAgICAgICBzd2l0Y2ggKGVsZW1lbnQudHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFtuYW1lPVxcJycgKyBlbGVtZW50Lm5hbWUgKyAnXFwnXTplbmFibGVkOmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YWx1ZSA9IFtdLCBpID0gMDsgaSA8IGVsZW1lbnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLnB1c2goZWxlbWVudFtpXS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub3B0aW9ucztcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YWx1ZSA9IFtdLCBpID0gMDsgaSA8IGVsZW1lbnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZWxlbWVudC5kaXNhYmxlZCAmJiBlbGVtZW50LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUucHVzaChlbGVtZW50W2ldLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGVsZW1lbnQudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqc29uW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ganNvbjtcbiAgICB9LFxuXG4gICAgdG9TUUw6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgdGhpcy5iaW5kaW5ncy5maWVsZC52YWx1ZSxcbiAgICAgICAgICAgIG9wZXJhdG9yc1t0aGlzLmJpbmRpbmdzLm9wZXJhdG9yLnZhbHVlXS5TUUwgfHwgdGhpcy5iaW5kaW5ncy5vcGVyYXRvci52YWx1ZSxcbiAgICAgICAgICAgICcgXFwnJyArIHRoaXMuYmluZGluZ3MuYXJndW1lbnQudmFsdWUucmVwbGFjZSgvJy9nLCAnXFwnXFwnJykgKyAnXFwnJ1xuICAgICAgICBdLmpvaW4oJyAnKTtcbiAgICB9XG59KTtcblxuLyoqIEB0eXBlZGVmIHZhbHVlT3B0aW9uXG4gKiBAcHJvcGVydHkge3N0cmluZ30gdmFsdWVcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0ZXh0XG4gKi9cbi8qKiBAdHlwZWRlZiBvcHRpb25Hcm91cFxuICogQHByb3BlcnR5IHtzdHJpbmd9IGxhYmVsXG4gKiBAcHJvcGVydHkge2ZpZWxkT3B0aW9uW119IG9wdGlvbnNcbiAqL1xuLyoqIEB0eXBlZGVmIHtzdHJpbmd8dmFsdWVPcHRpb258b3B0aW9uR3JvdXB8c3RyaW5nW119IGZpZWxkT3B0aW9uXG4gKiBAZGVzYyBJZiBhIHNpbXBsZSBhcnJheSBvZiBzdHJpbmcsIHlvdSBtdXN0IGFkZCBhIGBsYWJlbGAgcHJvcGVydHkgdG8gdGhlIGFycmF5LlxuICovXG4vKipcbiAqIEBzdW1tYXJ5IEhUTUwgZm9ybSBjb250cm9sIGZhY3RvcnkuXG4gKiBAZGVzYyBDcmVhdGVzIGFuZCBhcHBlbmRzIGEgdGV4dCBib3ggb3IgYSBkcm9wLWRvd24uXG4gKiBAcmV0dXJucyBUaGUgbmV3IGVsZW1lbnQuXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGNvbnRhaW5lciAtIEFuIGVsZW1lbnQgdG8gd2hpY2ggdG8gYXBwZW5kIHRoZSBuZXcgZWxlbWVudC5cbiAqIEBwYXJhbSB7ZmllbGRPcHRpb258ZmllbGRPcHRpb25bXX0gW29wdGlvbnNdIC0gT3ZlcmxvYWRzOlxuICogKiBJZiBvbWl0dGVkLCB3aWxsIGNyZWF0ZSBhbiBgPGlucHV0Lz5gICh0ZXh0IGJveCkgZWxlbWVudC5cbiAqICogSWYgYSBzaW5nbGUgb3B0aW9uIChlaXRoZXIgYXMgYSBzY2FsYXIgb3IgYXMgdGhlIG9ubHkgZWxlbWVudCBpbiBhbiBhcnJheSksIHdpbGwgY3JlYXRlIGEgYDxzcGFuPi4uLjwvc3Bhbj5gIGVsZW1lbnQgY29udGFpbmluZyB0aGUgc3RyaW5nIGFuZCBhIGA8aW5wdXQgdHlwZT1oaWRkZW4+YCBjb250YWluaW5nIHRoZSB2YWx1ZS5cbiAqICogT3RoZXJ3aXNlLCBjcmVhdGVzIGEgYDxzZWxlY3Q+Li4uPC9zZWxlY3Q+YCBlbGVtZW50IHdpdGggdGhlc2Ugc3RyaW5ncyBhZGRlZCBhcyBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnRzLiBPcHRpb24gZ3JvdXBzIG1heSBiZSBzcGVjaWZpZWQgYXMgbmVzdGVkIGFycmF5cy5cbiAqIEBwYXJhbSB7bnVsbHxzdHJpbmd9IFtwcm9tcHQ9JyddIC0gQWRkcyBhbiBpbml0aWFsIGA8b3B0aW9uPi4uLjwvb3B0aW9uPmAgZWxlbWVudCB0byB0aGUgZHJvcC1kb3duIHdpdGggdGhpcyB2YWx1ZSwgcGFyZW50aGVzaXplZCwgYXMgaXRzIGB0ZXh0YDsgYW5kIGVtcHR5IHN0cmluZyBhcyBpdHMgYHZhbHVlYC4gT21pdHRpbmcgY3JlYXRlcyBhIGJsYW5rIHByb21wdDsgYG51bGxgIHN1cHByZXNzZXMuXG4gKi9cbmZ1bmN0aW9uIG1ha2VFbGVtZW50KGNvbnRhaW5lciwgb3B0aW9ucywgcHJvbXB0KSB7XG4gICAgdmFyIGVsLFxuICAgICAgICB0YWdOYW1lID0gb3B0aW9ucyA/ICdzZWxlY3QnIDogJ2lucHV0JztcblxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHZhciBvcHRpb24gPSBvcHRpb25zWzBdO1xuICAgICAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgZWwuaW5uZXJIVE1MID0gb3B0aW9uLnRleHQgfHwgb3B0aW9uO1xuXG4gICAgICAgIHZhciBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgIGlucHV0LnR5cGUgPSAnaGlkZGVuJztcbiAgICAgICAgaW5wdXQudmFsdWUgPSBvcHRpb24udmFsdWUgfHwgb3B0aW9uO1xuICAgICAgICBlbC5hcHBlbmRDaGlsZChpbnB1dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZWwgPSBhZGRPcHRpb25zKHRhZ05hbWUsIG9wdGlvbnMsIHByb21wdCk7XG4gICAgfVxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChlbCk7XG4gICAgcmV0dXJuIGVsO1xufVxuXG4vKipcbiAqIEBzdW1tYXJ5IENyZWF0ZXMgYSBuZXcgZWxlbWVudCBhbmQgYWRkcyBvcHRpb25zIHRvIGl0LlxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ05hbWUgLSBNdXN0IGJlIG9uZSBvZjpcbiAqICogYCdpbnB1dCdgIGZvciBhIHRleHQgYm94XG4gKiAqIGAnc2VsZWN0J2AgZm9yIGEgZHJvcC1kb3duXG4gKiAqIGAnb3B0Z3JvdXAnYCAoZm9yIGludGVybmFsIHVzZSBvbmx5KVxuICogQHBhcmFtIHtmaWVsZE9wdGlvbltdfSBbb3B0aW9uc10gLSBTdHJpbmdzIHRvIGFkZCBhcyBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnRzLiBPbWl0IHdoZW4gY3JlYXRpbmcgYSB0ZXh0IGJveC5cbiAqIEBwYXJhbSB7bnVsbHxzdHJpbmd9IFtwcm9tcHQ9JyddIC0gQWRkcyBhbiBpbml0aWFsIGA8b3B0aW9uPi4uLjwvb3B0aW9uPmAgZWxlbWVudCB0byB0aGUgZHJvcC1kb3duIHdpdGggYHRleHRgIHRoaXMgdmFsdWUgaW4gcGFyZW50aGVzZXMsIGFzIGl0cyBgdGV4dGA7IGFuZCBlbXB0eSBzdHJpbmcgYXMgaXRzIGB2YWx1ZWAuIE9taXR0aW5nIGNyZWF0ZXMgYSBibGFuayBwcm9tcHQ7IGBudWxsYCBzdXBwcmVzc2VzLlxuICogQHJldHVybnMge0VsZW1lbnR9IEVpdGhlciBhIGA8c2VsZWN0PmAgb3IgYDxvcHRncm91cD5gIGVsZW1lbnQuXG4gKi9cbmZ1bmN0aW9uIGFkZE9wdGlvbnModGFnTmFtZSwgb3B0aW9ucywgcHJvbXB0KSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgICB2YXIgYWRkO1xuICAgICAgICBpZiAodGFnTmFtZSA9PT0gJ3NlbGVjdCcpIHtcbiAgICAgICAgICAgIGFkZCA9IGVsLmFkZDtcbiAgICAgICAgICAgIGlmIChwcm9tcHQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBlbC5hZGQobmV3IE9wdGlvbihwcm9tcHQgPyAnKCcgKyBwcm9tcHQgKyAnKScgOiAnJyksICcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZCA9IGVsLmFwcGVuZENoaWxkO1xuICAgICAgICAgICAgZWwubGFiZWwgPSBwcm9tcHQ7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKG9wdGlvbikge1xuICAgICAgICAgICAgdmFyIG5ld0VsZW1lbnQ7XG4gICAgICAgICAgICBpZiAoKG9wdGlvbi5vcHRpb25zIHx8IG9wdGlvbikgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgIHZhciBvcHRncm91cCA9IGFkZE9wdGlvbnMoJ29wdGdyb3VwJywgb3B0aW9uLm9wdGlvbnMgfHwgb3B0aW9uLCBvcHRpb24ubGFiZWwpO1xuICAgICAgICAgICAgICAgIGVsLmFkZChvcHRncm91cCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld0VsZW1lbnQgPSB0eXBlb2Ygb3B0aW9uID09PSAnb2JqZWN0JyA/IG5ldyBPcHRpb24ob3B0aW9uLnRleHQsIG9wdGlvbi52YWx1ZSkgOiBuZXcgT3B0aW9uKG9wdGlvbik7XG4gICAgICAgICAgICAgICAgYWRkLmNhbGwoZWwsIG5ld0VsZW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGVsO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbHRlckxlYWY7XG4iLCIvKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kLW1lJyk7XG52YXIgQmFzZSA9IGV4dGVuZC5CYXNlO1xuXG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJyk7XG5cbmV4dGVuZC5kZWJ1ZyA9IHRydWU7XG5cbnZhciBGaWx0ZXJOb2RlID0gQmFzZS5leHRlbmQoe1xuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnQgPSBvcHRpb25zICYmIG9wdGlvbnMucGFyZW50LFxuICAgICAgICAgICAganNvbiA9IHRoaXMuanNvbiA9IG9wdGlvbnMgJiYgb3B0aW9ucy5qc29uO1xuXG4gICAgICAgIHRoaXMubm9kZUZpZWxkcyA9IGpzb24gJiYganNvbi5ub2RlRmllbGRzIHx8XG4gICAgICAgICAgICBvcHRpb25zICYmIChvcHRpb25zLm5vZGVGaWVsZHMgfHwgb3B0aW9ucy5ub2RlRmllbGRzKTtcblxuICAgICAgICB0aGlzLmZpZWxkcyA9XG4gICAgICAgICAgICBqc29uICYmIChqc29uLmZpZWxkcyB8fCBqc29uLmZpZWxkcykgfHxcbiAgICAgICAgICAgIG9wdGlvbnMgJiYgKG9wdGlvbnMuZmllbGRzIHx8IG9wdGlvbnMuZmllbGRzKSB8fFxuICAgICAgICAgICAgcGFyZW50ICYmIHBhcmVudC5maWVsZHM7XG5cbiAgICAgICAgaWYgKCEodGhpcy5ub2RlRmllbGRzIHx8IHRoaXMuZmllbGRzKSkge1xuICAgICAgICAgICAgdGhyb3cgdGhpcy5FcnJvcignRXhwZWN0ZWQgYSBmaWVsZHMgbGlzdC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHlwZSA9IGpzb24gJiYganNvbi50eXBlIHx8XG4gICAgICAgICAgICBvcHRpb25zICYmIG9wdGlvbnMudHlwZTtcblxuICAgICAgICB0aGlzLm5ld1ZpZXcoKTtcbiAgICAgICAgdGhpcy5mcm9tSlNPTihqc29uKTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9LFxuXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMucGFyZW50KSB7XG4gICAgICAgICAgICB2YXIgbmV3TGlzdEl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRoaXMuQ0hJTERfVEFHKTtcbiAgICAgICAgICAgIG5ld0xpc3RJdGVtLmFwcGVuZENoaWxkKHRlbXBsYXRlKCdyZW1vdmVCdXR0b24nKSk7XG4gICAgICAgICAgICBuZXdMaXN0SXRlbS5hcHBlbmRDaGlsZCh0aGlzLmVsKTtcbiAgICAgICAgICAgIHRoaXMucGFyZW50LmVsLnF1ZXJ5U2VsZWN0b3IodGhpcy5DSElMRFJFTl9UQUcpLmFwcGVuZENoaWxkKG5ld0xpc3RJdGVtKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBFcnJvcjogZnVuY3Rpb24obXNnKSB7XG4gICAgICAgIHJldHVybiBuZXcgRXJyb3IoJ2ZpbHRlci10cmVlOiAnICsgbXNnKTtcbiAgICB9LFxuXG4gICAgQ0hJTERSRU5fVEFHOiAnT0wnLFxuICAgIENISUxEX1RBRzogJ0xJJyxcbiAgICBDU1NfQ0xBU1NfTkFNRTogJ2ZpbHRlci10cmVlJ1xuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBGaWx0ZXJOb2RlOyIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4vLyBUaGlzIGlzIHRoZSBtYWluIGZpbGUsIHVzYWJsZSBhcyBpcywgc3VjaCBhcyBieSAvdGVzdC9pbmRleC5qcy5cbi8vIEZvciBucG06IGd1bHBmaWxlLmpzIGNvcGllcyB0aGlzIGZpbGUgdG8gLi4vaW5kZXguanMsIGFkanVzdGluZyB0aGUgcmVxdWlyZSBwYXRocyBhbmQgZGVmaW5pbmcgdGhlIGBjc3NgIGxvY2FsLlxuLy8gRm9yIENETjogZ3VscGZpbGUuanMgdGhlbiBicm93c2VyaWZpZXMgLi4vaW5kZXguanMgd2l0aCBzb3VyY2VtYXAgdG8gL2J1aWxkL2ZpbHRlci10cmVlLmpzIGFuZCB1Z2xpZmllZCB3aXRob3V0IHNvdXJjZW1hcCB0byAvYnVpbGQvZmlsdGVyLXRyZWUubWluLmpzLiBUaGUgQ0ROIGlzIGh0dHBzOi8vam9uZWl0LmdpdGh1Yi5pby9maWx0ZXItdHJlZS5cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3NzSW5qZWN0b3IgPSByZXF1aXJlKCdjc3MtaW5qZWN0b3InKTtcblxudmFyIEZpbHRlck5vZGUgPSByZXF1aXJlKCcuL0ZpbHRlck5vZGUnKTtcbnZhciBEZWZhdWx0RmlsdGVyID0gcmVxdWlyZSgnLi9GaWx0ZXJMZWFmJyk7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJyk7XG52YXIgb3BlcmF0b3JzID0gcmVxdWlyZSgnLi90cmVlLW9wZXJhdG9ycycpO1xuXG52YXIgb3JkaW5hbCA9IDA7XG5cbnZhciBjaG9vc2VyO1xuXG52YXIgY3NzOyAvLyBkZWZpbmVkIGJ5IGNvZGUgaW5zZXJ0ZWQgYnkgZ3VscGZpbGUgYmV0d2VlbiBmb2xsb3dpbmcgY29tbWVudHNcbi8qIGluamVjdDpjc3MgKi9cbmNzcyA9ICcuZmlsdGVyLXRyZWV7Zm9udC1mYW1pbHk6c2Fucy1zZXJpZjtsaW5lLWhlaWdodDoxLjVlbX0uZmlsdGVyLXRyZWUgb2x7bWFyZ2luLXRvcDowfS5maWx0ZXItdHJlZS1hZGQsLmZpbHRlci10cmVlLWFkZC1maWx0ZXIsLmZpbHRlci10cmVlLXJlbW92ZXtjdXJzb3I6cG9pbnRlcn0uZmlsdGVyLXRyZWUtYWRkLC5maWx0ZXItdHJlZS1hZGQtZmlsdGVye2ZvbnQtc2l6ZTpzbWFsbGVyO2ZvbnQtc3R5bGU6aXRhbGljO21hcmdpbi1sZWZ0OjNlbX0uZmlsdGVyLXRyZWUtYWRkLWZpbHRlcjpob3ZlciwuZmlsdGVyLXRyZWUtYWRkOmhvdmVye3RleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmV9LmZpbHRlci10cmVlLWFkZC1maWx0ZXI+ZGl2LC5maWx0ZXItdHJlZS1hZGQ+ZGl2LC5maWx0ZXItdHJlZS1yZW1vdmV7ZGlzcGxheTppbmxpbmUtYmxvY2s7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kLWNvbG9yOiM4Yzg7Zm9udC1zaXplOjExLjVweDtmb250LXdlaWdodDo3MDA7Y29sb3I6I2ZmZjt0ZXh0LWFsaWduOmNlbnRlcjtsaW5lLWhlaWdodDpub3JtYWw7Zm9udC1zdHlsZTpub3JtYWw7Zm9udC1mYW1pbHk6c2Fucy1zZXJpZjt0ZXh0LXNoYWRvdzowIDAgMS41cHggZ3JleTttYXJnaW4tcmlnaHQ6NHB4fS5maWx0ZXItdHJlZS1hZGQtZmlsdGVyPmRpdjpiZWZvcmUsLmZpbHRlci10cmVlLWFkZD5kaXY6YmVmb3Jle2NvbnRlbnQ6XFwnXFxcXGZmMGJcXCd9LmZpbHRlci10cmVlLXJlbW92ZXtiYWNrZ3JvdW5kLWNvbG9yOiNlODg7Ym9yZGVyOjB9LmZpbHRlci10cmVlLXJlbW92ZTpiZWZvcmV7Y29udGVudDpcXCdcXFxcMjIxMlxcJ30uZmlsdGVyLXRyZWUgbGk6OmFmdGVye2ZvbnQtc2l6ZTo3MCU7Zm9udC1zdHlsZTppdGFsaWM7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOiM5MDB9LmZpbHRlci10cmVlPm9sPmxpOmxhc3QtY2hpbGQ6OmFmdGVye2Rpc3BsYXk6bm9uZX0ub3Atb3I+b2w+bGk6OmFmdGVye2NvbnRlbnQ6XFwnXFxcXEEw4oCUIE9SIOKAlFxcJ30ub3AtYW5kPm9sPmxpOjphZnRlcntjb250ZW50OlxcJ1xcXFxBMOKAlCBBTkQg4oCUXFwnfS5vcC1ub3I+b2w+bGk6OmFmdGVye2NvbnRlbnQ6XFwnXFxcXEEw4oCUIE5PUiDigJRcXCd9LmZpbHRlci10cmVlLWRlZmF1bHQ+KnttYXJnaW46MCAuNGVtfS5maWx0ZXItdHJlZS1jaG9vc2Vye3Bvc2l0aW9uOmFic29sdXRlO2ZvbnQtc3R5bGU6aXRhbGljO2JhY2tncm91bmQtY29sb3I6IzhjODtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxMS41cHg7b3V0bGluZTowO2JveC1zaGFkb3c6NXB4IDVweCAxMHB4IGdyZXl9Jztcbi8qIGVuZGluamVjdCAqL1xuXG4vKiogQGNvbnN0cnVjdG9yXG4gKlxuICogQHN1bW1hcnkgQSBub2RlIGluIGEgZmlsdGVyIHRyZWUgKGluY2x1ZGluZyB0aGUgcm9vdCBub2RlKSwgcmVwcmVzZW50aW5nIGEgY29tcGxleCBmaWx0ZXIgZXhwcmVzc2lvbi5cbiAqXG4gKiBAZGVzYyBBIGBGaWx0ZXJUcmVlYCBpcyBhbiBuLWFyeSB0cmVlIHdpdGggYSBzaW5nbGUgYG9wZXJhdG9yYCB0byBiZSBhcHBsaWVkIHRvIGFsbCBpdHMgYGNoaWxkcmVuYC5cbiAqXG4gKiBBbHNvIGtub3duIGFzIGEgXCJzdWJ0cmVlXCIgb3IgYSBcInN1YmV4cHJlc3Npb25cIi5cbiAqXG4gKiBFYWNoIG9mIHRoZSBgY2hpbGRyZW5gIGNhbiBiZSBlaXRoZXI6XG4gKlxuICogKiBhIHRlcm5pbmFsIG5vZGUgYEZpbHRlcmAgKG9yIGFuIG9iamVjdCBpbmhlcml0aW5nIGZyb20gYEZpbHRlcmApIHJlcHJlc2VudGluZyBhIHNpbXBsZSBjb25kaXRpb25hbCBleHByZXNzaW9uOyBvclxuICogKiBhIG5lc3RlZCBgRmlsdGVyVHJlZWAgcmVwcmVzZW50aW5nIGEgY29tcGxleCBzdWJleHByZXNzaW9uLlxuICpcbiAqIFRoZSBgb3BlcmF0b3JgIG11c3QgYmUgb25lIG9mIHRoZSB7QGxpbmsgb3BlcmF0b3JzfHRyZWUgb3BlcmF0b3JzfSBvciBtYXkgYmUgbGVmdCB1bmRlZmluZWQgaWZmIHRoZXJlIGlzIG9ubHkgb25lIGNoaWxkIG5vZGUuXG4gKlxuICogTm90ZXM6XG4gKiAxLiBBIGBGaWx0ZXJUcmVlYCBtYXkgY29uc2lzdCBvZiBhIHNpbmdsZSBsZWFmLCBpbiB3aGljaCBjYXNlIHRoZSBgb3BlcmF0b3JgIGlzIG5vdCB1c2VkIGFuZCBtYXkgYmUgbGVmdCB1bmRlZmluZWQuIEhvd2V2ZXIsIGlmIGEgc2Vjb25kIGNoaWxkIGlzIGFkZGVkIGFuZCB0aGUgb3BlcmF0b3IgaXMgc3RpbGwgdW5kZWZpbmVkLCBpdCB3aWxsIGJlIHNldCB0byB0aGUgZGVmYXVsdCAoYCdvcC1hbmQnYCkuXG4gKiAyLiBUaGUgb3JkZXIgb2YgdGhlIGNoaWxkcmVuIGlzIHVuZGVmaW5lZCBhcyBhbGwgb3BlcmF0b3JzIGFyZSBjb21tdXRhdGl2ZS4gRm9yIHRoZSAnYG9wLW9yYCcgb3BlcmF0b3IsIGV2YWx1YXRpb24gY2Vhc2VzIG9uIHRoZSBmaXJzdCBwb3NpdGl2ZSByZXN1bHQgYW5kIGZvciBlZmZpY2llbmN5LCBhbGwgc2ltcGxlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb25zIHdpbGwgYmUgZXZhbHVhdGVkIGJlZm9yZSBhbnkgY29tcGxleCBzdWJleHByZXNzaW9ucy5cbiAqIDMuIEEgbmVzdGVkIGBGaWx0ZXJUcmVlYCBpcyBkaXN0aW5ndWlzaGVkIGluIHRoZSBKU09OIG9iamVjdCBmcm9tIGEgYEZpbHRlcmAgYnkgdGhlIHByZXNlbmNlIG9mIGEgYGNoaWxkcmVuYCBtZW1iZXIuXG4gKiA0LiBOZXN0aW5nIGEgYEZpbHRlclRyZWVgIGNvbnRhaW5pbmcgYSBzaW5nbGUgY2hpbGQgaXMgdmFsaWQgKGFsYmVpdCBwb2ludGxlc3MpLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nW119IFtsb2NhbEZpZWxkc10gLSBBIGxpc3Qgb2YgZmllbGQgbmFtZXMgZm9yIGBGaWx0ZXJgIG9iamVjdHMgdG8gdXNlLiBNYXkgYmUgb3ZlcnJpZGRlbiBieSBkZWZpbmluZyBganNvbi5sb2NhbEZpZWxkc2AgaGVyZSBvciBpbiB0aGUgYGpzb25gIHBhcmFtZXRlciBvZiBhbnkgZGVzY2VuZGFudCAoaW5jbHVkaW5nIHRlcm1pbmFsIG5vZGVzKS4gSWYgbm8gc3VjaCBkZWZpbml0aW9uLCB3aWxsIHNlYXJjaCB1cCB0aGUgdHJlZSBmb3IgdGhlIGZpcnN0IG5vZGUgd2l0aCBhIGRlZmluZWQgYGZpZWxkc2AgbWVtYmVyLiBJbiBwcmFjdGljZSB0aGlzIHBhcmFtZXRlciBpcyBub3QgdXNlZCBoZXJlaW47IGl0IG1heSBiZSB1c2VkIGJ5IHRoZSBjYWxsZXIgZm9yIHRoZSB0b3AtbGV2ZWwgKHJvb3QpIHRyZWUuXG4gKiBAcGFyYW0ge0pTT059IFtqc29uXSAtIElmIG9tbWl0dGVkLCBsb2FkcyBhbiBlbXB0eSBmaWx0ZXIgKGEgYEZpbHRlclRyZWVgIGNvbnNpc3Rpbmcgb2YgYSBzaW5nbGUgdGVybWluYWwgbm9kZSBhbmQgdGhlIGRlZmF1bHQgYG9wZXJhdG9yYCB2YWx1ZSAoYCdvcC1hbmQnYCkuXG4gKiBAcGFyYW0ge0ZpbHRlclRyZWV9IFtwYXJlbnRdIC0gVXNlZCBpbnRlcm5hbGx5IHRvIGluc2VydCBlbGVtZW50IHdoZW4gY3JlYXRpbmcgbmVzdGVkIHN1YnRyZWVzLiBGb3IgdGhlIHRvcCBsZXZlbCB0cmVlLCB5b3UgZG9uJ3QgZ2l2ZSBhIHZhbHVlIGZvciBgcGFyZW50YDsgeW91IGFyZSByZXNwb25zaWJsZSBmb3IgaW5zZXJ0aW5nIHRoZSB0b3AtbGV2ZWwgYC5lbGAgaW50byB0aGUgRE9NLlxuICpcbiAqIEBwcm9wZXJ0eSB7RmlsdGVyVHJlZX0gcGFyZW50XG4gKiBAcHJvcGVydHkge251bWJlcn0gb3JkaW5hbFxuICogQHByb3BlcnR5IHtzdHJpbmd9IG9wZXJhdG9yXG4gKiBAcHJvcGVydHkge0ZpbHRlck5vZGVbXX0gY2hpbGRyZW4gLSBFYWNoIG9uZSBpcyBlaXRoZXIgYSBgRmlsdGVyYCAob3IgYW4gb2JqZWN0IGluaGVyaXRpbmcgZnJvbSBgRmlsdGVyYCkgb3IgYW5vdGhlciBgRmlsdGVyVHJlZWAuLlxuICogQHByb3BlcnR5IHtFbGVtZW50fSBlbCAtIFRoZSByb290IGVsZW1lbnQgb2YgdGhpcyAoc3ViKXRyZWUuXG4gKi9cbnZhciBGaWx0ZXJUcmVlID0gRmlsdGVyTm9kZS5leHRlbmQoJ0ZpbHRlclRyZWUnLCB7XG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIGNzc0luamVjdG9yKGNzcywgJ2ZpbHRlci10cmVlLWJhc2UnLCBvcHRpb25zICYmIG9wdGlvbnMuY3NzU3R5bGVzaGVldFJlZmVyZW5jZUVsZW1lbnQpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLmVkaXRvcnMpIHtcbiAgICAgICAgICAgIEZpbHRlclRyZWUucHJvdG90eXBlLmVkaXRvcnMgPSBvcHRpb25zLmVkaXRvcnM7XG4gICAgICAgICAgICBjaG9vc2VyID0gbWFrZUNob29zZXIoKTtcbiAgICAgICAgfSBlbHNlIGlmICghY2hvb3Nlcikge1xuICAgICAgICAgICAgY2hvb3NlciA9IG1ha2VDaG9vc2VyKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZWRpdG9yczoge1xuICAgICAgICBEZWZhdWx0OiBEZWZhdWx0RmlsdGVyXG4gICAgfSxcblxuICAgIG5ld1ZpZXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmVsID0gdGVtcGxhdGUoJ3RyZWUnLCArK29yZGluYWwpO1xuICAgICAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2F0Y2hDbGljay5iaW5kKHRoaXMpKTtcbiAgICB9LFxuXG4gICAgZnJvbUpTT046IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgaWYgKGpzb24pIHtcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBKU09OIG9iamVjdFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBqc29uICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHZhciBlcnJNc2cgPSAnRXhwZWN0ZWQgYGpzb25gIHBhcmFtZXRlciB0byBiZSBhbiBvYmplY3QuJztcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGpzb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGVyck1zZyArPSAnIFNlZSBgSlNPTi5wYXJzZSgpYC4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyB0aGlzLkVycm9yKGVyck1zZyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIGBqc29uLmNoaWxkcmVuYFxuICAgICAgICAgICAgaWYgKCEoanNvbi5jaGlsZHJlbiBpbnN0YW5jZW9mIEFycmF5ICYmIGpzb24uY2hpbGRyZW4ubGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IHRoaXMuRXJyb3IoJ0V4cGVjdGVkIGBjaGlsZHJlbmAgZmllbGQgdG8gYmUgYSBub24tZW1wdHkgYXJyYXkuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNoaWxkcmVuID0gW107XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBqc29uLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oanNvbikgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICAgICAgICAgIHZhciBDb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGpzb24gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IHNlbGYuRXJyb3IoJ0V4cGVjdGVkIGNoaWxkIHRvIGJlIGFuIG9iamVjdCBjb250YWluaW5nIGVpdGhlciBgY2hpbGRyZW5gLCBgdHlwZWAsIG9yIG5laXRoZXIuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChqc29uLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIENvbnN0cnVjdG9yID0gRmlsdGVyVHJlZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBDb25zdHJ1Y3RvciA9IHNlbGYuZWRpdG9yc1tqc29uLnR5cGUgfHwgJ0RlZmF1bHQnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5jaGlsZHJlbi5wdXNoKG5ldyBDb25zdHJ1Y3Rvcih7XG4gICAgICAgICAgICAgICAgICAgIGpzb246IGpzb24sXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogc2VsZlxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBganNvbi5vcGVyYXRvcmBcbiAgICAgICAgICAgIGlmICghKG9wZXJhdG9yc1tqc29uLm9wZXJhdG9yXSB8fCBqc29uLm9wZXJhdG9yID09PSB1bmRlZmluZWQgJiYganNvbi5jaGlsZHJlbi5sZW5ndGggPT09IDEpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdGhpcy5FcnJvcignRXhwZWN0ZWQgYG9wZXJhdG9yYCBmaWVsZCB0byBiZSBvbmUgb2Y6ICcgKyBPYmplY3Qua2V5cyhvcGVyYXRvcnMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMub3BlcmF0b3IgPSBqc29uLm9wZXJhdG9yO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGZpbHRlckVkaXRvck5hbWVzID0gT2JqZWN0LmtleXModGhpcy5lZGl0b3JzKSxcbiAgICAgICAgICAgICAgICBvbmx5T25lRmlsdGVyRWRpdG9yID0gZmlsdGVyRWRpdG9yTmFtZXMubGVuZ3RoID09PSAxO1xuICAgICAgICAgICAgdGhpcy5jaGlsZHJlbiA9IG9ubHlPbmVGaWx0ZXJFZGl0b3IgPyBbbmV3IHRoaXMuZWRpdG9yc1tmaWx0ZXJFZGl0b3JOYW1lc1swXV0oe1xuICAgICAgICAgICAgICAgIHBhcmVudDogdGhpc1xuICAgICAgICAgICAgfSldIDogW107XG4gICAgICAgICAgICB0aGlzLm9wZXJhdG9yID0gJ29wLWFuZCc7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gc2ltdWxhdGUgY2xpY2sgb24gdGhlIG9wZXJhdG9yIHRvIGRpc3BsYXkgc3RyaWtlLXRocm91Z2ggYW5kIG9wZXJhdG9yIGJldHdlZW4gZmlsdGVyc1xuICAgICAgICB2YXIgcmFkaW9CdXR0b24gPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3ZhbHVlPScgKyB0aGlzLm9wZXJhdG9yICsgJ10nKTtcbiAgICAgICAgcmFkaW9CdXR0b24uY2hlY2tlZCA9IHRydWU7XG4gICAgICAgIHRoaXNbJ2ZpbHRlci10cmVlLWNob29zZS1vcGVyYXRvciddKHtcbiAgICAgICAgICAgIHRhcmdldDogcmFkaW9CdXR0b25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gd2hlbiBtdWx0aXBsZSBmaWx0ZXIgZWRpdG9ycyBhdmFpbGFibGUsIHNpbXVsYXRlIGNsaWNrIG9uIHRoZSBuZXcgXCJhZGQgY29uZGl0aW9uYWxcIiBsaW5rXG4gICAgICAgIGlmICghdGhpcy5jaGlsZHJlbi5sZW5ndGggJiYgT2JqZWN0LmtleXModGhpcy5lZGl0b3JzKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB2YXIgYWRkRmlsdGVyTGluayA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignLmZpbHRlci10cmVlLWFkZC1maWx0ZXInKTtcbiAgICAgICAgICAgIHRoaXNbJ2ZpbHRlci10cmVlLWFkZC1maWx0ZXInXSh7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBhZGRGaWx0ZXJMaW5rXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHByb2NlZWQgd2l0aCByZW5kZXJcbiAgICAgICAgRmlsdGVyTm9kZS5wcm90b3R5cGUucmVuZGVyLmNhbGwodGhpcyk7XG4gICAgfSxcblxuICAgICdmaWx0ZXItdHJlZS1jaG9vc2Utb3BlcmF0b3InOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgdmFyIHJhZGlvQnV0dG9uID0gZXZ0LnRhcmdldDtcblxuICAgICAgICB0aGlzLm9wZXJhdG9yID0gcmFkaW9CdXR0b24udmFsdWU7XG5cbiAgICAgICAgLy8gZGlzcGxheSBzdHJpa2UtdGhyb3VnaFxuICAgICAgICB2YXIgcmFkaW9CdXR0b25zID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yQWxsKCdsYWJlbD5pbnB1dC5maWx0ZXItdHJlZS1jaG9vc2Utb3BlcmF0b3JbbmFtZT0nICsgcmFkaW9CdXR0b24ubmFtZSArICddJyk7XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHJhZGlvQnV0dG9ucykuZm9yRWFjaChmdW5jdGlvbihyYWRpb0J1dHRvbikgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICAgICAgcmFkaW9CdXR0b24ucGFyZW50RWxlbWVudC5zdHlsZS50ZXh0RGVjb3JhdGlvbiA9IHJhZGlvQnV0dG9uLmNoZWNrZWQgPyAnbm9uZScgOiAnbGluZS10aHJvdWdoJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gZGlzcGxheSBvcGVyYXRvciBiZXR3ZWVuIGZpbHRlcnMgYnkgYWRkaW5nIG9wZXJhdG9yIHN0cmluZyBhcyBhIENTUyBjbGFzcyBvZiB0aGlzIHRyZWVcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9wZXJhdG9ycykge1xuICAgICAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QucmVtb3ZlKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKHRoaXMub3BlcmF0b3IpO1xuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtYWRkLWZpbHRlcic6IGZ1bmN0aW9uKGV2dCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIHZhciBmaWx0ZXJFZGl0b3JOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuZWRpdG9ycyk7XG4gICAgICAgIGlmIChmaWx0ZXJFZGl0b3JOYW1lcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4ucHVzaChuZXcgdGhpcy5lZGl0b3JzW2ZpbHRlckVkaXRvck5hbWVzWzBdXSh7XG4gICAgICAgICAgICAgICAgcGFyZW50OiB0aGlzXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhdHRhY2hDaG9vc2VyLmNhbGwodGhpcywgZXZ0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtYWRkJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4ucHVzaChuZXcgRmlsdGVyVHJlZSh7XG4gICAgICAgICAgICBwYXJlbnQ6IHRoaXNcbiAgICAgICAgfSkpO1xuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtcmVtb3ZlJzogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHZhciBkZWxldGVCdXR0b24gPSBldnQudGFyZ2V0LFxuICAgICAgICAgICAgbGlzdEl0ZW0gPSBkZWxldGVCdXR0b24ucGFyZW50RWxlbWVudCxcbiAgICAgICAgICAgIGNoaWxkcmVuID0gdGhpcy5jaGlsZHJlbixcbiAgICAgICAgICAgIGVsID0gZGVsZXRlQnV0dG9uLm5leHRFbGVtZW50U2libGluZztcblxuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkLCBpZHgpIHtcbiAgICAgICAgICAgIGlmIChjaGlsZC5lbCA9PT0gZWwpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgY2hpbGRyZW5baWR4XTtcbiAgICAgICAgICAgICAgICBsaXN0SXRlbS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgICB2YXIgbnVtYmVyID0gTnVtYmVyKHN0cmluZyksXG4gICAgICAgICAgICBtZXRob2ROYW1lID0gaXNOYU4obnVtYmVyKSA/ICd0ZXN0U3RyaW5nJyA6ICd0ZXN0TnVtYmVyJztcblxuICAgICAgICByZXR1cm4gdGVzdC5jYWxsKHRoaXMsIHN0cmluZywgbnVtYmVyLCBtZXRob2ROYW1lKTtcbiAgICB9LFxuXG4gICAgdG9KU09OOiBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICBvcGVyYXRvcjogdGhpcy5vcGVyYXRvcixcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgdmFyIGlzVGVybWluYWxOb2RlID0gIShjaGlsZCBpbnN0YW5jZW9mIEZpbHRlclRyZWUpO1xuICAgICAgICAgICAgaWYgKGlzVGVybWluYWxOb2RlIHx8IGNoaWxkLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5jaGlsZHJlbi5wdXNoKGlzVGVybWluYWxOb2RlID8gY2hpbGQgOiB0b0pTT04uY2FsbChjaGlsZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICB0b1NRTDogZnVuY3Rpb24gdG9TUUwoKSB7XG4gICAgICAgIHZhciBTUUwgPSBvcGVyYXRvcnNbdGhpcy5vcGVyYXRvcl0uU1FMLFxuICAgICAgICAgICAgcmVzdWx0ID0gU1FMLmJlZztcblxuICAgICAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQsIGlkeCkge1xuICAgICAgICAgICAgdmFyIGlzVGVybWluYWxOb2RlID0gIShjaGlsZCBpbnN0YW5jZW9mIEZpbHRlclRyZWUpO1xuICAgICAgICAgICAgaWYgKGlzVGVybWluYWxOb2RlIHx8IGNoaWxkLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChpZHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ICs9ICcgJyArIFNRTC5vcCArICcgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGlzVGVybWluYWxOb2RlID8gY2hpbGQudG9TUUwoKSA6IHRvU1FMLmNhbGwoY2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXN1bHQgKz0gU1FMLmVuZDtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxufSk7XG5cbmZ1bmN0aW9uIGNhdGNoQ2xpY2soZXZ0KSB7XG4gICAgdmFyIGVsdCA9IGV2dC50YXJnZXQ7XG5cbiAgICB2YXIgaGFuZGxlciA9IHRoaXNbZWx0LmNsYXNzTmFtZV0gfHwgdGhpc1tlbHQucGFyZW50Tm9kZS5jbGFzc05hbWVdO1xuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICAgIGRldGFjaENob29zZXIoKTtcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGV2dCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRlc3QocywgbiwgbWV0aG9kTmFtZSkge1xuICAgIHZhciBvcGVyYXRvciA9IG9wZXJhdG9yc1t0aGlzLm9wZXJhdG9yXSxcbiAgICAgICAgcmVzdWx0ID0gb3BlcmF0b3Iuc2VlZDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jaGlsZHJlbi5sZW5ndGggJiYgcmVzdWx0ICE9PSBvcGVyYXRvci5hYm9ydDsgKytpKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IHRoaXMuY2hpbGRyZW5baV0sXG4gICAgICAgICAgICBpc1Rlcm1pbmFsTm9kZSA9ICEoY2hpbGQgaW5zdGFuY2VvZiBGaWx0ZXJUcmVlKTtcblxuICAgICAgICBpZiAoaXNUZXJtaW5hbE5vZGUgfHwgY2hpbGQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gaXNUZXJtaW5hbE5vZGUgPyBjaGlsZFttZXRob2ROYW1lXSA6IHRlc3Q7XG4gICAgICAgICAgICByZXN1bHQgPSBvcGVyYXRvci5yZWR1Y2UocmVzdWx0LCBtZXRob2QuY2FsbChjaGlsZCwgcywgbikpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9wZXJhdG9yLm5lZ2F0ZSkge1xuICAgICAgICByZXN1bHQgPSAhcmVzdWx0O1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIG1ha2VDaG9vc2VyKCkge1xuICAgIHZhciAkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2VsZWN0JyksXG4gICAgICAgIGVkaXRvcnMgPSBPYmplY3Qua2V5cyhGaWx0ZXJUcmVlLnByb3RvdHlwZS5lZGl0b3JzKTtcblxuICAgICQuY2xhc3NOYW1lID0gJ2ZpbHRlci10cmVlLWNob29zZXInO1xuICAgICQuc2l6ZSA9IGVkaXRvcnMubGVuZ3RoO1xuXG4gICAgZWRpdG9ycy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAkLmFkZChuZXcgT3B0aW9uKGtleSkpO1xuICAgIH0pO1xuXG4gICAgJC5vbm1vdXNlb3ZlciA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBldnQudGFyZ2V0LnNlbGVjdGVkID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuICQ7XG59XG5cbnZhciBjaG9vc2VyUGFyZW50O1xuXG5mdW5jdGlvbiBhdHRhY2hDaG9vc2VyKGV2dCkge1xuICAgIHZhciB0cmVlID0gdGhpcyxcbiAgICAgICAgcmVjdCA9IGV2dC50YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICBpZiAoIXJlY3Qud2lkdGgpIHtcbiAgICAgICAgLy8gbm90IGluIERPTSB5ZXQgc28gdHJ5IGFnYWluIGxhdGVyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhdHRhY2hDaG9vc2VyLmNhbGwodHJlZSwgZXZ0KTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY2hvb3Nlci5zdHlsZS5sZWZ0ID0gcmVjdC5sZWZ0ICsgMTkgKyAncHgnO1xuICAgIGNob29zZXIuc3R5bGUudG9wID0gcmVjdC5ib3R0b20gKyAncHgnO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZGV0YWNoQ2hvb3Nlcik7IC8vIGRldGFjaCBjaG9vc2VyIGlmIGNsaWNrIG91dHNpZGVcblxuICAgIGNob29zZXIub25jbGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0cmVlLmNoaWxkcmVuLnB1c2gobmV3IHRyZWUuZWRpdG9yc1tjaG9vc2VyLnZhbHVlXSh7XG4gICAgICAgICAgICBwYXJlbnQ6IHRyZWVcbiAgICAgICAgfSkpO1xuICAgICAgICAvLyBjbGljayBidWJibGVzIHVwIHRvIHdpbmRvdyB3aGVyZSBpdCBkZXRhY2hlcyBjaG9vc2VyXG4gICAgfTtcblxuICAgIGNob29zZXIub25tb3VzZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjaG9vc2VyLnNlbGVjdGVkSW5kZXggPSAtMTtcbiAgICB9O1xuXG4gICAgY2hvb3NlclBhcmVudCA9IHRoaXMuZWw7XG4gICAgY2hvb3NlclBhcmVudC5hcHBlbmRDaGlsZChjaG9vc2VyKTtcbiAgICB2YXIgbGluayA9IGNob29zZXJQYXJlbnQucXVlcnlTZWxlY3RvcignLmZpbHRlci10cmVlLWFkZC1maWx0ZXInKTtcbiAgICBsaW5rLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGNob29zZXIpLmJhY2tncm91bmRDb2xvcjtcbn1cblxuZnVuY3Rpb24gZGV0YWNoQ2hvb3NlcigpIHtcbiAgICBpZiAoY2hvb3NlclBhcmVudCkge1xuICAgICAgICBjaG9vc2VyLnNlbGVjdGVkSW5kZXggPSAtMTtcbiAgICAgICAgY2hvb3NlclBhcmVudC5xdWVyeVNlbGVjdG9yKCcuZmlsdGVyLXRyZWUtYWRkLWZpbHRlcicpLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IG51bGw7XG4gICAgICAgIGNob29zZXJQYXJlbnQucmVtb3ZlQ2hpbGQoY2hvb3Nlcik7XG4gICAgICAgIGNob29zZXIub25jbGljayA9IGNob29zZXIub25tb3VzZW91dCA9IGNob29zZXJQYXJlbnQgPSBudWxsO1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBkZXRhY2hDaG9vc2VyKTtcbiAgICB9XG59XG5cbndpbmRvdy5GaWx0ZXJUcmVlID0gRmlsdGVyVHJlZTsiLCIvKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdGVtcGxleCA9IHJlcXVpcmUoJ3RlbXBsZXgnKTtcblxudmFyIHRlbXBsYXRlcyA9IHtcblxuICAgIHRyZWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvKlxuICAgICAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlXCJcIj5cbiAgICAgICAgICAgIE1hdGNoXG4gICAgICAgICAgICA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwiZmlsdGVyLXRyZWUtY2hvb3NlLW9wZXJhdG9yXCIgbmFtZT1cInRyZWVPcHsxfVwiIHZhbHVlPVwib3Atb3JcIj5hbnk8L2xhYmVsPlxuICAgICAgICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBjbGFzcz1cImZpbHRlci10cmVlLWNob29zZS1vcGVyYXRvclwiIG5hbWU9XCJ0cmVlT3B7MX1cIiB2YWx1ZT1cIm9wLWFuZFwiPmFsbDwvbGFiZWw+XG4gICAgICAgICAgICA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwiZmlsdGVyLXRyZWUtY2hvb3NlLW9wZXJhdG9yXCIgbmFtZT1cInRyZWVPcHsxfVwiIHZhbHVlPVwib3Atbm9yXCI+bm9uZTwvbGFiZWw+XG4gICAgICAgICAgICBvZjo8YnIvPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJmaWx0ZXItdHJlZS1hZGQtZmlsdGVyXCIgdGl0bGU9XCJBZGQgYSBuZXcgY29uZGl0aW9uYWwgdG8gdGhpcyBtYXRjaC5cIj5cbiAgICAgICAgICAgICAgICA8ZGl2PjwvZGl2PmNvbmRpdGlvbmFsXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlLWFkZFwiIHRpdGxlPVwiQWRkIGEgbmV3IHN1Ym1hdGNoIHVuZGVyIHRoaXMgbWF0Y2guXCI+XG4gICAgICAgICAgICAgICAgPGRpdj48L2Rpdj5zdWJleHByZXNzaW9uXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8b2w+PC9vbD5cbiAgICAgICAgPC9zcGFuPlxuICAgICAgICAqL1xuICAgIH0sXG5cbiAgICByZW1vdmVCdXR0b246IGZ1bmN0aW9uKCkge1xuICAgICAgICAvKlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZmlsdGVyLXRyZWUtcmVtb3ZlXCIgdGl0bGU9XCJkZWxldGUgY29uZGl0aW9uYWxcIj48L2Rpdj5cbiAgICAgICAgKi9cbiAgICB9XG5cbn07XG5cbmZ1bmN0aW9uIGdldEFsbCh0ZW1wbGF0ZU5hbWUpIHtcbiAgICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHZhciB0ZXh0ID0gdGVtcGxhdGVzW3RlbXBsYXRlTmFtZV0udG9TdHJpbmcoKTtcbiAgICB2YXIgYmVnID0gdGV4dC5pbmRleE9mKCcvKicpO1xuICAgIHZhciBlbmQgPSB0ZXh0Lmxhc3RJbmRleE9mKCcqLycpO1xuICAgIGlmIChiZWcgPT09IC0xIHx8IGVuZCA9PT0gLTEpIHtcbiAgICAgICAgdGhyb3cgJ2JhZCB0ZW1wbGF0ZSc7XG4gICAgfVxuICAgIGJlZyArPSAyO1xuICAgIHRleHQgPSB0ZXh0LnN1YnN0cihiZWcsIGVuZCAtIGJlZyk7XG4gICAgdGV4dCA9IHRlbXBsZXguYXBwbHkodGhpcywgW3RleHRdLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSk7XG4gICAgdGVtcC5pbm5lckhUTUwgPSB0ZXh0O1xuICAgIHJldHVybiB0ZW1wLmNoaWxkcmVuO1xufVxuXG5mdW5jdGlvbiBnZXRGaXJzdCgpIHtcbiAgICByZXR1cm4gZ2V0QWxsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylbMF07XG59XG5cbmdldEZpcnN0LmdldEFsbCA9IGdldEFsbDtcblxubW9kdWxlLmV4cG9ydHMgPSBnZXRGaXJzdDsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEFORChwLCBxKSB7XG4gICAgcmV0dXJuIHAgJiYgcTtcbn1cblxuZnVuY3Rpb24gT1IocCwgcSkge1xuICAgIHJldHVybiBwIHx8IHE7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgICdvcC1hbmQnOiB7XG4gICAgICAgIHJlZHVjZTogQU5ELFxuICAgICAgICBzZWVkOiB0cnVlLFxuICAgICAgICBhYm9ydDogZmFsc2UsXG4gICAgICAgIG5lZ2F0ZTogZmFsc2UsXG4gICAgICAgIFNRTDoge1xuICAgICAgICAgICAgb3A6ICdBTkQnLFxuICAgICAgICAgICAgYmVnOiAnKCcsXG4gICAgICAgICAgICBlbmQ6ICcpJ1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnb3Atb3InOiB7XG4gICAgICAgIHJlZHVjZTogT1IsXG4gICAgICAgIHNlZWQ6IGZhbHNlLFxuICAgICAgICBhYm9ydDogdHJ1ZSxcbiAgICAgICAgbmVnYXRlOiBmYWxzZSxcbiAgICAgICAgU1FMOiB7XG4gICAgICAgICAgICBvcDogJ09SJyxcbiAgICAgICAgICAgIGJlZzogJygnLFxuICAgICAgICAgICAgZW5kOiAnKSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ29wLW5vcic6IHtcbiAgICAgICAgcmVkdWNlOiBPUixcbiAgICAgICAgc2VlZDogZmFsc2UsXG4gICAgICAgIGFib3J0OiB0cnVlLFxuICAgICAgICBuZWdhdGU6IHRydWUsXG4gICAgICAgIFNRTDoge1xuICAgICAgICAgICAgb3A6ICdPUicsXG4gICAgICAgICAgICBiZWc6ICdOT1QgICgnLFxuICAgICAgICAgICAgZW5kOiAnKSdcbiAgICAgICAgfVxuICAgIH1cbn07Il19
