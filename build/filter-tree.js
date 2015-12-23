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

var operators = ['=', '≠', '<', '>', '≤', '≥'];
var opToSQL = {
    '≠': '<>',
    '≤': '<=',
    '≥': '>='
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
            field: makeElement(root, this.fields),
            operator: makeElement(root, operators),
            argument: makeElement(root)
        };

        root.appendChild(document.createElement('br'));
    },

    fromJSON: function(json) {
        var value, element, i;
        if (json) {
            for (var key in json) {
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
    },

    toJSON: function() {
        var element, value, i, key, json = {};
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
            opToSQL[this.bindings.operator.value] || this.bindings.operator.value,
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

        this.fields =
            options && options.fields ||
            json && json.fields ||
            parent && parent.fields;

        if (!this.fields) {
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
css = '.filter-tree{font-family:sans-serif;line-height:1.5em}.filter-tree ol{margin-top:0}.filter-tree-add,.filter-tree-add-filter,.filter-tree-remove{cursor:pointer}.filter-tree-add,.filter-tree-add-filter{font-size:smaller;font-style:italic;margin-left:3em}.filter-tree-add-filter:hover,.filter-tree-add:hover{text-decoration:underline}.filter-tree-add-filter>div,.filter-tree-add>div,.filter-tree-remove{display:inline-block;width:15px;height:15px;border-radius:8px;background-color:#8c8;font-size:11.5px;font-weight:700;color:#fff;text-align:center;line-height:normal;font-style:normal;font-family:sans-serif;text-shadow:0 0 1.5px grey;margin-right:4px}.filter-tree-add-filter>div:before,.filter-tree-add>div:before{content:\'\\ff0b\'}.filter-tree-remove{background-color:#e88;border:0}.filter-tree-remove:before{content:\'\\2212\'}.filter-tree li::after{font-size:70%;font-style:italic;font-weight:700;color:#900}.filter-tree>ol>li:last-child::after{display:none}.op-or>ol>li::after{content:\'\\A0— OR —\'}.op-and>ol>li::after{content:\'\\A0— AND —\'}.op-nor>ol>li::after{content:\'\\A0— NOR —\'}.filter-tree-default>*{margin:0 .4em}.filter-tree-chooser{position:absolute;font-style:italic;background-color:#ff0;box-shadow:5px 5px 10px grey}';
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
 * @param {string[]} [fields] - A list of field names for `Filter` objects to use. May be overridden by defining `json.fields` here or in the `json` parameter of any descendant (including terminal nodes). If no such definition, will search up the tree for the first node with a defined `fields` member. In practice this parameter is not used herein; it may be used by the caller for the top-level (root) tree.
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
        if (!chooser) {
            // one-time initializations:
            chooser = makeChooser();
            cssInjector(css, 'filter-tree-base', options && options.cssStylesheetReferenceElement);
        }
    },

    filterEditors: {
        Default: DefaultFilter,
        Bubbles: DefaultFilter
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
                    Constructor = self.filterEditors[json.type || 'Default'];
                }
                self.children.push(new Constructor({ json: json, parent: self }));
            });

            // Validate `json.operator`
            if (!(operators[json.operator] || json.operator === undefined && json.children.length === 1)) {
                throw this.Error('Expected `operator` field to be one of: ' + Object.keys(operators));
            }
            this.operator = json.operator;
        } else {
            var filterEditorNames = Object.keys(this.filterEditors),
                onlyOneFilterEditor = filterEditorNames.length === 1;
            this.children = onlyOneFilterEditor ? [new this.filterEditors[filterEditorNames[0]]({ parent: this })] : [];
            this.operator = 'op-and';
        }
    },

    render: function() {
        // simulate click on the operator to display strike-through and operator between filters
        var radioButton = this.el.querySelector('input[value=' + this.operator + ']');
        radioButton.checked = true;
        this['filter-tree-choose-operator']({ target: radioButton });

        // when multiple filter editors available, simulate click on the new "add conditional" link
        if (!this.children.length && Object.keys(this.filterEditors).length > 1) {
            var addFilterLink = this.el.querySelector('.filter-tree-add-filter');
            this['filter-tree-add-filter']({ target: addFilterLink });
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
        for (var key in operators) { this.el.classList.remove(key); }
        this.el.classList.add(this.operator);
    },

    'filter-tree-add-filter': function(evt) { // eslint-disable-line
        var filterEditorNames = Object.keys(this.filterEditors);
        if (filterEditorNames.length === 1) {
            this.children.push(new this.filterEditors[filterEditorNames[0]]({ parent: this }));
        } else {
            attachChooser.call(this, evt);
        }
    },

    'filter-tree-add': function() {
        this.children.push(new FilterTree({ parent: this }));
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
                if (idx) { result += ' ' + SQL.op + ' '; }
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

function makeChooser() {
    var $ = document.createElement('select'),
        filterEditors = Object.keys(FilterTree.prototype.filterEditors);

    $.className = 'filter-tree-chooser';
    $.size = filterEditors.length;

    filterEditors.forEach(function(key) { $.add(new Option(key)); });

    $.onmouseover = function(evt) { evt.target.selected = true; };

    return $;
}

var chooserParent;

function attachChooser(evt) {
    var tree = this,
        rect = evt.target.getBoundingClientRect();

    if (!rect.width) {
        // not in DOM yet so try again later
        setTimeout(function() { attachChooser.call(tree, evt); }, 50);
        return;
    }

    chooser.style.left = rect.left + 19 + 'px';
    chooser.style.top = rect.bottom + 'px';

    window.addEventListener('click', detachChooser); // detach chooser if click outside

    chooser.onclick = function() {
        tree.children.push(new tree.filterEditors[chooser.value]({ parent: tree }));
        // click bubbles up to window where it detaches chooser
    };

    chooser.onmouseout = function() {
        chooser.selectedIndex = -1;
    };

    chooserParent = this.el;
    chooserParent.appendChild(chooser);
    var link = chooserParent.querySelector('.filter-tree-add-filter'),
        linkWidth = link.getBoundingClientRect().width - 19;
    if (chooser.getBoundingClientRect().width < linkWidth) {
        chooser.style.width = linkWidth + 'px';
    }
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

},{"templex":3}],8:[function(require,module,exports){
'use strict';

module.exports = {
    'op-and': { SQL: { op: 'AND', beg: '(', end: ')' } },
    'op-or': { SQL: { op: 'OR', beg: '(', end: ')' } },
    'op-nor': { SQL: { op: 'AND', beg: 'NOT  (', end: ')' } }
};

},{}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL25vZGVfbW9kdWxlcy9jc3MtaW5qZWN0b3IvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL2V4dGVuZC1tZS9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvdGVtcGxleC9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvRmlsdGVyTGVhZi5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvRmlsdGVyTm9kZS5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvZmFrZV8yZDc3ODE0Ny5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvc3JjL2pzL3RyZWUtb3BlcmF0b3JzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuLyoqIEBuYW1lc3BhY2UgY3NzSW5qZWN0b3IgKi9cblxuLyoqXG4gKiBAc3VtbWFyeSBJbnNlcnQgYmFzZSBzdHlsZXNoZWV0IGludG8gRE9NXG4gKlxuICogQGRlc2MgQ3JlYXRlcyBhIG5ldyBgPHN0eWxlPi4uLjwvc3R5bGU+YCBlbGVtZW50IGZyb20gdGhlIG5hbWVkIHRleHQgc3RyaW5nKHMpIGFuZCBpbnNlcnRzIGl0IGJ1dCBvbmx5IGlmIGl0IGRvZXMgbm90IGFscmVhZHkgZXhpc3QgaW4gdGhlIHNwZWNpZmllZCBjb250YWluZXIgYXMgcGVyIGByZWZlcmVuY2VFbGVtZW50YC5cbiAqXG4gKiA+IENhdmVhdDogSWYgc3R5bGVzaGVldCBpcyBmb3IgdXNlIGluIGEgc2hhZG93IERPTSwgeW91IG11c3Qgc3BlY2lmeSBhIGxvY2FsIGByZWZlcmVuY2VFbGVtZW50YC5cbiAqXG4gKiBAcmV0dXJucyBBIHJlZmVyZW5jZSB0byB0aGUgbmV3bHkgY3JlYXRlZCBgPHN0eWxlPi4uLjwvc3R5bGU+YCBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBjc3NSdWxlc1xuICogQHBhcmFtIHtzdHJpbmd9IFtJRF1cbiAqIEBwYXJhbSB7dW5kZWZpbmVkfG51bGx8RWxlbWVudHxzdHJpbmd9IFtyZWZlcmVuY2VFbGVtZW50XSAtIENvbnRhaW5lciBmb3IgaW5zZXJ0aW9uLiBPdmVybG9hZHM6XG4gKiAqIGB1bmRlZmluZWRgIHR5cGUgKG9yIG9taXR0ZWQpOiBpbmplY3RzIHN0eWxlc2hlZXQgYXQgdG9wIG9mIGA8aGVhZD4uLi48L2hlYWQ+YCBlbGVtZW50XG4gKiAqIGBudWxsYCB2YWx1ZTogaW5qZWN0cyBzdHlsZXNoZWV0IGF0IGJvdHRvbSBvZiBgPGhlYWQ+Li4uPC9oZWFkPmAgZWxlbWVudFxuICogKiBgRWxlbWVudGAgdHlwZTogaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBlbGVtZW50LCB3aGVyZXZlciBpdCBpcyBmb3VuZC5cbiAqICogYHN0cmluZ2AgdHlwZTogaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBmaXJzdCBlbGVtZW50IGZvdW5kIHRoYXQgbWF0Y2hlcyB0aGUgZ2l2ZW4gY3NzIHNlbGVjdG9yLlxuICpcbiAqIEBtZW1iZXJPZiBjc3NJbmplY3RvclxuICovXG5mdW5jdGlvbiBjc3NJbmplY3Rvcihjc3NSdWxlcywgSUQsIHJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICBpZiAodHlwZW9mIHJlZmVyZW5jZUVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHJlZmVyZW5jZUVsZW1lbnQpO1xuICAgICAgICBpZiAoIXJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICAgICAgICAgIHRocm93ICdDYW5ub3QgZmluZCByZWZlcmVuY2UgZWxlbWVudCBmb3IgQ1NTIGluamVjdGlvbi4nO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChyZWZlcmVuY2VFbGVtZW50ICYmICEocmVmZXJlbmNlRWxlbWVudCBpbnN0YW5jZW9mIEVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93ICdHaXZlbiB2YWx1ZSBub3QgYSByZWZlcmVuY2UgZWxlbWVudC4nO1xuICAgIH1cblxuICAgIHZhciBjb250YWluZXIgPSByZWZlcmVuY2VFbGVtZW50ICYmIHJlZmVyZW5jZUVsZW1lbnQucGFyZW50Tm9kZSB8fCBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG5cbiAgICBpZiAoSUQpIHtcbiAgICAgICAgSUQgPSBjc3NJbmplY3Rvci5pZFByZWZpeCArIElEO1xuXG4gICAgICAgIGlmIChjb250YWluZXIucXVlcnlTZWxlY3RvcignIycgKyBJRCkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gc3R5bGVzaGVldCBhbHJlYWR5IGluIERPTVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbiAgICBpZiAoSUQpIHtcbiAgICAgICAgc3R5bGUuaWQgPSBJRDtcbiAgICB9XG4gICAgaWYgKGNzc1J1bGVzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgY3NzUnVsZXMgPSBjc3NSdWxlcy5qb2luKCdcXG4nKTtcbiAgICB9XG4gICAgY3NzUnVsZXMgPSAnXFxuJyArIGNzc1J1bGVzICsgJ1xcbic7XG4gICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzUnVsZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzUnVsZXMpKTtcbiAgICB9XG5cbiAgICBpZiAocmVmZXJlbmNlRWxlbWVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBjb250YWluZXIuZmlyc3RDaGlsZDtcbiAgICB9XG5cbiAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKHN0eWxlLCByZWZlcmVuY2VFbGVtZW50KTtcblxuICAgIHJldHVybiBzdHlsZTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBPcHRpb25hbCBwcmVmaXggZm9yIGA8c3R5bGU+YCB0YWcgSURzLlxuICogQGRlc2MgRGVmYXVsdHMgdG8gYCdpbmplY3RlZC1zdHlsZXNoZWV0LSdgLlxuICogQHR5cGUge3N0cmluZ31cbiAqIEBtZW1iZXJPZiBjc3NJbmplY3RvclxuICovXG5jc3NJbmplY3Rvci5pZFByZWZpeCA9ICdpbmplY3RlZC1zdHlsZXNoZWV0LSc7XG5cbi8vIEludGVyZmFjZVxubW9kdWxlLmV4cG9ydHMgPSBjc3NJbmplY3RvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqIEBuYW1lc3BhY2UgZXh0ZW5kLW1lICoqL1xuXG4vKiogQHN1bW1hcnkgRXh0ZW5kcyBhbiBleGlzdGluZyBjb25zdHJ1Y3RvciBpbnRvIGEgbmV3IGNvbnN0cnVjdG9yLlxuICpcbiAqIEByZXR1cm5zIHtDaGlsZENvbnN0cnVjdG9yfSBBIG5ldyBjb25zdHJ1Y3RvciwgZXh0ZW5kZWQgZnJvbSB0aGUgZ2l2ZW4gY29udGV4dCwgcG9zc2libHkgd2l0aCBzb21lIHByb3RvdHlwZSBhZGRpdGlvbnMuXG4gKlxuICogQGRlc2MgRXh0ZW5kcyBcIm9iamVjdHNcIiAoY29uc3RydWN0b3JzKSwgd2l0aCBvcHRpb25hbCBhZGRpdGlvbmFsIGNvZGUsIG9wdGlvbmFsIHByb3RvdHlwZSBhZGRpdGlvbnMsIGFuZCBvcHRpb25hbCBwcm90b3R5cGUgbWVtYmVyIGFsaWFzZXMuXG4gKlxuICogPiBDQVZFQVQ6IE5vdCB0byBiZSBjb25mdXNlZCB3aXRoIFVuZGVyc2NvcmUtc3R5bGUgLmV4dGVuZCgpIHdoaWNoIGlzIHNvbWV0aGluZyBlbHNlIGVudGlyZWx5LiBJJ3ZlIHVzZWQgdGhlIG5hbWUgXCJleHRlbmRcIiBoZXJlIGJlY2F1c2Ugb3RoZXIgcGFja2FnZXMgKGxpa2UgQmFja2JvbmUuanMpIHVzZSBpdCB0aGlzIHdheS4gWW91IGFyZSBmcmVlIHRvIGNhbGwgaXQgd2hhdGV2ZXIgeW91IHdhbnQgd2hlbiB5b3UgXCJyZXF1aXJlXCIgaXQsIHN1Y2ggYXMgYHZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2V4dGVuZCcpYC5cbiAqXG4gKiBQcm92aWRlIGEgY29uc3RydWN0b3IgYXMgdGhlIGNvbnRleHQgYW5kIGFueSBwcm90b3R5cGUgYWRkaXRpb25zIHlvdSByZXF1aXJlIGluIHRoZSBmaXJzdCBhcmd1bWVudC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgaWYgeW91IHdpc2ggdG8gYmUgYWJsZSB0byBleHRlbmQgYEJhc2VDb25zdHJ1Y3RvcmAgdG8gYSBuZXcgY29uc3RydWN0b3Igd2l0aCBwcm90b3R5cGUgb3ZlcnJpZGVzIGFuZC9vciBhZGRpdGlvbnMsIGJhc2ljIHVzYWdlIGlzOlxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIHZhciBCYXNlID0gcmVxdWlyZSgnZXh0ZW5kLW1lJykuQmFzZTtcbiAqIHZhciBCYXNlQ29uc3RydWN0b3IgPSBCYXNlLmV4dGVuZChiYXNlUHJvdG90eXBlKTsgLy8gbWl4ZXMgaW4gLmV4dGVuZFxuICogdmFyIENoaWxkQ29uc3RydWN0b3IgPSBCYXNlQ29uc3RydWN0b3IuZXh0ZW5kKGNoaWxkUHJvdG90eXBlT3ZlcnJpZGVzQW5kQWRkaXRpb25zKTtcbiAqIHZhciBHcmFuZGNoaWxkQ29uc3RydWN0b3IgPSBDaGlsZENvbnN0cnVjdG9yLmV4dGVuZChncmFuZGNoaWxkUHJvdG90eXBlT3ZlcnJpZGVzQW5kQWRkaXRpb25zKTtcbiAqIGBgYFxuICpcbiAqIFRoaXMgZnVuY3Rpb24gKGBleHRlbmQoKWApIGlzIGFkZGVkIHRvIHRoZSBuZXcgZXh0ZW5kZWQgb2JqZWN0IGNvbnN0cnVjdG9yIGFzIGEgcHJvcGVydHkgYC5leHRlbmRgLCBlc3NlbnRpYWxseSBtYWtpbmcgdGhlIG9iamVjdCBjb25zdHJ1Y3RvciBpdHNlbGYgZWFzaWx5IFwiZXh0ZW5kYWJsZS5cIiAoTm90ZTogVGhpcyBpcyBhIHByb3BlcnR5IG9mIGVhY2ggY29uc3RydWN0b3IgYW5kIG5vdCBhIG1ldGhvZCBvZiBpdHMgcHJvdG90eXBlISlcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gW2V4dGVuZGVkQ2xhc3NOYW1lXSAtIFRoaXMgaXMgc2ltcGx5IGFkZGVkIHRvIHRoZSBwcm90b3R5cGUgYXMgJCRDTEFTU19OQU1FLiBVc2VmdWwgZm9yIGRlYnVnZ2luZyBiZWNhdXNlIGFsbCBkZXJpdmVkIGNvbnN0cnVjdG9ycyBhcHBlYXIgdG8gaGF2ZSB0aGUgc2FtZSBuYW1lIChcIkNvbnN0cnVjdG9yXCIpIGluIHRoZSBkZWJ1Z2dlci4gVGhpcyBwcm9wZXJ0eSBpcyBpZ25vcmVkIHVubGVzcyBgZXh0ZW5kLmRlYnVnYCBpcyBleHBsaWNpdGx5IHNldCB0byBhIHRydXRoeSB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0ge2V4dGVuZGVkUHJvdG90eXBlQWRkaXRpb25zT2JqZWN0fSBbcHJvdG90eXBlQWRkaXRpb25zXSAtIE9iamVjdCB3aXRoIG1lbWJlcnMgdG8gY29weSB0byBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIE1vc3QgbWVtYmVycyB3aWxsIGJlIGNvcGllZCB0byB0aGUgcHJvdG90eXBlLiBTb21lIG1lbWJlcnMsIGhvd2V2ZXIsIGhhdmUgc3BlY2lhbCBtZWFuaW5ncyBhcyBleHBsYWluZWQgaW4gdGhlIHtAbGluayBleHRlbmRlZFByb3RvdHlwZUFkZGl0aW9uc09iamVjdHx0eXBlIGRlZmluaXRpb259IChhbmQgbWF5IG9yIG1heSBub3QgYmUgY29waWVkIHRvIHRoZSBwcm90b3R5cGUpLlxuICpcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2RlYnVnXSAtIFNlZSBwYXJhbWV0ZXIgYGV4dGVuZGVkQ2xhc3NOYW1lYCBfKGFib3ZlKV8uXG4gKlxuICogQHByb3BlcnR5IHtvYmplY3R9IEJhc2UgLSBBIGNvbnZlbmllbnQgYmFzZSBjbGFzcyBmcm9tIHdoaWNoIGFsbCBvdGhlciBjbGFzc2VzIGNhbiBiZSBleHRlbmRlZC5cbiAqXG4gKiBAbWVtYmVyT2YgZXh0ZW5kLW1lXG4gKi9cbmZ1bmN0aW9uIGV4dGVuZChleHRlbmRlZENsYXNzTmFtZSwgcHJvdG90eXBlQWRkaXRpb25zKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucyA9IHt9O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucyA9IGV4dGVuZGVkQ2xhc3NOYW1lO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm90b3R5cGVBZGRpdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ1NpbmdsZSBwYXJhbWV0ZXIgb3ZlcmxvYWQgbXVzdCBiZSBvYmplY3QuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGV4dGVuZGVkQ2xhc3NOYW1lID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0ZW5kZWRDbGFzc05hbWUgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBwcm90b3R5cGVBZGRpdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ1R3byBwYXJhbWV0ZXIgb3ZlcmxvYWQgbXVzdCBiZSBzdHJpbmcsIG9iamVjdC4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyAnVG9vIG1hbnkgcGFyYW1ldGVycyc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQ29uc3RydWN0b3IoKSB7XG4gICAgICAgIGlmIChwcm90b3R5cGVBZGRpdGlvbnMucHJlSW5pdGlhbGl6ZSkge1xuICAgICAgICAgICAgcHJvdG90eXBlQWRkaXRpb25zLnByZUluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluaXRpYWxpemVQcm90b3R5cGVDaGFpbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAgIGlmIChwcm90b3R5cGVBZGRpdGlvbnMucG9zdEluaXRpYWxpemUpIHtcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucy5wb3N0SW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgQ29uc3RydWN0b3IuZXh0ZW5kID0gZXh0ZW5kO1xuXG4gICAgdmFyIHByb3RvdHlwZSA9IENvbnN0cnVjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodGhpcy5wcm90b3R5cGUpO1xuICAgIHByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuXG4gICAgaWYgKGV4dGVuZGVkQ2xhc3NOYW1lICYmIGV4dGVuZC5kZWJ1Zykge1xuICAgICAgICBwcm90b3R5cGUuJCRDTEFTU19OQU1FID0gZXh0ZW5kZWRDbGFzc05hbWU7XG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIHByb3RvdHlwZUFkZGl0aW9ucykge1xuICAgICAgICBpZiAocHJvdG90eXBlQWRkaXRpb25zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3RvdHlwZUFkZGl0aW9uc1trZXldO1xuICAgICAgICAgICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdpbml0aWFsaXplT3duJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxyZWFkeSBjYWxsZWQgYWJvdmU7IG5vdCBuZWVkZWQgaW4gcHJvdG90eXBlXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2FsaWFzZXMnOlxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBhbGlhcyBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KGFsaWFzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ha2VBbGlhcyh2YWx1ZVthbGlhc10sIGFsaWFzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZVswXSA9PT0gJyMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYWtlQWxpYXModmFsdWUsIGtleS5zdWJzdHIoMSkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG90eXBlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIENvbnN0cnVjdG9yO1xuXG4gICAgZnVuY3Rpb24gbWFrZUFsaWFzKHZhbHVlLCBrZXkpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgICAgcHJvdG90eXBlW2tleV0gPSBwcm90b3R5cGVBZGRpdGlvbnNbdmFsdWVdO1xuICAgIH1cbn1cblxuZXh0ZW5kLkJhc2UgPSBmdW5jdGlvbiAoKSB7fTtcbmV4dGVuZC5CYXNlLmV4dGVuZCA9IGV4dGVuZDtcblxuLyoqIEB0eXBlZGVmIHtmdW5jdGlvbn0gZXh0ZW5kZWRDb25zdHJ1Y3RvclxuICogQHByb3BlcnR5IHByb3RvdHlwZS5zdXBlciAtIEEgcmVmZXJlbmNlIHRvIHRoZSBwcm90b3R5cGUgdGhpcyBjb25zdHJ1Y3RvciB3YXMgZXh0ZW5kZWQgZnJvbS5cbiAqIEBwcm9wZXJ0eSBbZXh0ZW5kXSAtIElmIGBwcm90b3R5cGVBZGRpdGlvbnMuZXh0ZW5kYWJsZWAgd2FzIHRydXRoeSwgdGhpcyB3aWxsIGJlIGEgcmVmZXJlbmNlIHRvIHtAbGluayBleHRlbmQuZXh0ZW5kfGV4dGVuZH0uXG4gKi9cblxuLyoqIEB0eXBlZGVmIHtvYmplY3R9IGV4dGVuZGVkUHJvdG90eXBlQWRkaXRpb25zT2JqZWN0XG4gKiBAcHJvcGVydHkge2Z1bmN0aW9ufSBbaW5pdGlhbGl6ZV0gLSBBZGRpdGlvbmFsIGNvbnN0cnVjdG9yIGNvZGUgZm9yIG5ldyBvYmplY3QuIFRoaXMgbWV0aG9kIGlzIGFkZGVkIHRvIHRoZSBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIEdldHMgcGFzc2VkIG5ldyBvYmplY3QgYXMgY29udGV4dCArIHNhbWUgYXJncyBhcyBjb25zdHJ1Y3RvciBpdHNlbGYuIENhbGxlZCBvbiBpbnN0YW50aWF0aW9uIGFmdGVyIHNpbWlsYXIgZnVuY3Rpb24gaW4gYWxsIGFuY2VzdG9ycyBjYWxsZWQgd2l0aCBzYW1lIHNpZ25hdHVyZS5cbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb259IFtpbml0aWFsaXplT3duXSAtIEFkZGl0aW9uYWwgY29uc3RydWN0b3IgY29kZSBmb3IgbmV3IG9iamVjdC4gVGhpcyBtZXRob2QgaXMgYWRkZWQgdG8gdGhlIG5ldyBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS4gR2V0cyBwYXNzZWQgbmV3IG9iamVjdCBhcyBjb250ZXh0ICsgc2FtZSBhcmdzIGFzIGNvbnN0cnVjdG9yIGl0c2VsZi4gQ2FsbGVkIG9uIGluc3RhbnRpYXRpb24gYWZ0ZXIgKGFsbCkgdGhlIGBpbml0aWFsaXplYCBmdW5jdGlvbihzKS5cbiAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBbYWxpYXNlc10gLSBIYXNoIG9mIGFsaWFzZXMgZm9yIHByb3RvdHlwZSBtZW1iZXJzIGluIGZvcm0gYHsga2V5OiAnbWVtYmVyJywgLi4uIH1gIHdoZXJlIGBrZXlgIGlzIHRoZSBuYW1lIG9mIGFuIGFsaWVhcyBhbmQgYCdtZW1iZXInYCBpcyB0aGUgbmFtZSBvZiBhbiBleGlzdGluZyBtZW1iZXIgaW4gdGhlIHByb3RvdHlwZS4gRWFjaCBzdWNoIGtleSBpcyBhZGRlZCB0byB0aGUgcHJvdG90eXBlIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBuYW1lZCBtZW1iZXIuIChUaGUgYGFsaWFzZXNgIG9iamVjdCBpdHNlbGYgaXMgKm5vdCogYWRkZWQgdG8gcHJvdG90eXBlLikgQWx0ZXJuYXRpdmVseTpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBba2V5c10gLSBBcmJpdHJhcnkgcHJvcGVydHkgbmFtZXMgZGVmaW5lZCBoZXJlIHdpdGggc3RyaW5nIHZhbHVlcyBzdGFydGluZyB3aXRoIGEgYCNgIGNoYXJhY3RlciB3aWxsIGFsaWFzIHRoZSBhY3R1YWwgcHJvcGVydGllcyBuYW1lZCBpbiB0aGUgc3RyaW5ncyAoZm9sbG93aW5nIHRoZSBgI2ApLiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHRvIHByb3ZpZGluZyBhbiBgYWxpYXNlc2AgaGFzaCwgcGVyaGFwcyBzaW1wbGVyICh0aG91Z2ggc3VidGxlcikuIChVc2UgYXJiaXRyYXJ5IGlkZW50aWZpZXJzIGhlcmU7IGRvbid0IHVzZSB0aGUgbmFtZSBga2V5c2AhKVxuICogQHByb3BlcnR5IHsqfSBbYXJiaXRyYXJ5UHJvcGVydGllc10gLSBBbnkgYWRkaXRpb25hbCBhcmJpdHJhcnkgcHJvcGVydGllcyBkZWZpbmVkIGhlcmUgd2lsbCBiZSBhZGRlZCB0byB0aGUgbmV3IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLiAoVXNlIGFyYml0cmFyeSBpZGVudGlmaWVycyBoZXJlOyBkb24ndCB1c2UgdGhlIG5hbWUgYGFyaWJpdHJhcnlQcm9wZXJ0aWVzYCEpXG4gKi9cblxuLyoqIEBzdW1tYXJ5IENhbGwgYWxsIGBpbml0aWFsaXplYCBtZXRob2RzIGZvdW5kIGluIHByb3RvdHlwZSBjaGFpbi5cbiAqIEBkZXNjIFRoaXMgcmVjdXJzaXZlIHJvdXRpbmUgaXMgY2FsbGVkIGJ5IHRoZSBjb25zdHJ1Y3Rvci5cbiAqIDEuIFdhbGtzIGJhY2sgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBgT2JqZWN0YCdzIHByb3RvdHlwZVxuICogMi4gV2Fsa3MgZm9yd2FyZCB0byBuZXcgb2JqZWN0LCBjYWxsaW5nIGFueSBgaW5pdGlhbGl6ZWAgbWV0aG9kcyBpdCBmaW5kcyBhbG9uZyB0aGUgd2F5IHdpdGggdGhlIHNhbWUgY29udGV4dCBhbmQgYXJndW1lbnRzIHdpdGggd2hpY2ggdGhlIGNvbnN0cnVjdG9yIHdhcyBjYWxsZWQuXG4gKiBAcHJpdmF0ZVxuICogQG1lbWJlck9mIGV4dGVuZC1tZVxuICovXG5mdW5jdGlvbiBpbml0aWFsaXplUHJvdG90eXBlQ2hhaW4oKSB7XG4gICAgdmFyIHRlcm0gPSB0aGlzLFxuICAgICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgIHJlY3VyKHRlcm0pO1xuXG4gICAgZnVuY3Rpb24gcmVjdXIob2JqKSB7XG4gICAgICAgIHZhciBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmopO1xuICAgICAgICBpZiAocHJvdG8uY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgICAgICAgcmVjdXIocHJvdG8pO1xuICAgICAgICAgICAgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdpbml0aWFsaXplJykpIHtcbiAgICAgICAgICAgICAgICBwcm90by5pbml0aWFsaXplLmFwcGx5KHRlcm0sIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4dGVuZDtcbiIsIi8vIHRlbXBsZXggbm9kZSBtb2R1bGVcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qb25laXQvdGVtcGxleFxuXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cblxuLyoqXG4gKiBNZXJnZXMgdmFsdWVzIG9mIGV4ZWN1dGlvbiBjb250ZXh0IHByb3BlcnRpZXMgbmFtZWQgaW4gdGVtcGxhdGUgYnkge3Byb3AxfSxcbiAqIHtwcm9wMn0sIGV0Yy4sIG9yIGFueSBqYXZhc2NyaXB0IGV4cHJlc3Npb24gaW5jb3Jwb3JhdGluZyBzdWNoIHByb3AgbmFtZXMuXG4gKiBUaGUgY29udGV4dCBhbHdheXMgaW5jbHVkZXMgdGhlIGdsb2JhbCBvYmplY3QuIEluIGFkZGl0aW9uIHlvdSBjYW4gc3BlY2lmeSBhIHNpbmdsZVxuICogY29udGV4dCBvciBhbiBhcnJheSBvZiBjb250ZXh0cyB0byBzZWFyY2ggKGluIHRoZSBvcmRlciBnaXZlbikgYmVmb3JlIGZpbmFsbHlcbiAqIHNlYXJjaGluZyB0aGUgZ2xvYmFsIGNvbnRleHQuXG4gKlxuICogTWVyZ2UgZXhwcmVzc2lvbnMgY29uc2lzdGluZyBvZiBzaW1wbGUgbnVtZXJpYyB0ZXJtcywgc3VjaCBhcyB7MH0sIHsxfSwgZXRjLiwgZGVyZWZcbiAqIHRoZSBmaXJzdCBjb250ZXh0IGdpdmVuLCB3aGljaCBpcyBhc3N1bWVkIHRvIGJlIGFuIGFycmF5LiBBcyBhIGNvbnZlbmllbmNlIGZlYXR1cmUsXG4gKiBpZiBhZGRpdGlvbmFsIGFyZ3MgYXJlIGdpdmVuIGFmdGVyIGB0ZW1wbGF0ZWAsIGBhcmd1bWVudHNgIGlzIHVuc2hpZnRlZCBvbnRvIHRoZSBjb250ZXh0XG4gKiBhcnJheSwgdGh1cyBtYWtpbmcgZmlyc3QgYWRkaXRpb25hbCBhcmcgYXZhaWxhYmxlIGFzIHsxfSwgc2Vjb25kIGFzIHsyfSwgZXRjLiwgYXMgaW5cbiAqIGB0ZW1wbGV4KCdIZWxsbywgezF9IScsICdXb3JsZCcpYC4gKHswfSBpcyB0aGUgdGVtcGxhdGUgc28gY29uc2lkZXIgdGhpcyB0byBiZSAxLWJhc2VkLilcbiAqXG4gKiBJZiB5b3UgcHJlZmVyIHNvbWV0aGluZyBvdGhlciB0aGFuIGJyYWNlcywgcmVkZWZpbmUgYHRlbXBsZXgucmVnZXhwYC5cbiAqXG4gKiBTZWUgdGVzdHMgZm9yIGV4YW1wbGVzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZW1wbGF0ZVxuICogQHBhcmFtIHsuLi5zdHJpbmd9IFthcmdzXVxuICovXG5mdW5jdGlvbiB0ZW1wbGV4KHRlbXBsYXRlKSB7XG4gICAgdmFyIGNvbnRleHRzID0gdGhpcyBpbnN0YW5jZW9mIEFycmF5ID8gdGhpcyA6IFt0aGlzXTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHsgY29udGV4dHMudW5zaGlmdChhcmd1bWVudHMpOyB9XG4gICAgcmV0dXJuIHRlbXBsYXRlLnJlcGxhY2UodGVtcGxleC5yZWdleHAsIHRlbXBsZXgubWVyZ2VyLmJpbmQoY29udGV4dHMpKTtcbn1cblxudGVtcGxleC5yZWdleHAgPSAvXFx7KC4qPylcXH0vZztcblxudGVtcGxleC53aXRoID0gZnVuY3Rpb24gKGksIHMpIHtcbiAgICByZXR1cm4gJ3dpdGgodGhpc1snICsgaSArICddKXsnICsgcyArICd9Jztcbn07XG5cbnRlbXBsZXguY2FjaGUgPSBbXTtcblxudGVtcGxleC5kZXJlZiA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBpZiAoISh0aGlzLmxlbmd0aCBpbiB0ZW1wbGV4LmNhY2hlKSkge1xuICAgICAgICB2YXIgY29kZSA9ICdyZXR1cm4gZXZhbChleHByKSc7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBjb2RlID0gdGVtcGxleC53aXRoKGksIGNvZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGVtcGxleC5jYWNoZVt0aGlzLmxlbmd0aF0gPSBldmFsKCcoZnVuY3Rpb24oZXhwcil7JyArIGNvZGUgKyAnfSknKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1ldmFsXG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGV4LmNhY2hlW3RoaXMubGVuZ3RoXS5jYWxsKHRoaXMsIGtleSk7XG59O1xuXG50ZW1wbGV4Lm1lcmdlciA9IGZ1bmN0aW9uIChtYXRjaCwga2V5KSB7XG4gICAgLy8gQWR2YW5jZWQgZmVhdHVyZXM6IENvbnRleHQgY2FuIGJlIGEgbGlzdCBvZiBjb250ZXh0cyB3aGljaCBhcmUgc2VhcmNoZWQgaW4gb3JkZXIuXG4gICAgdmFyIHJlcGxhY2VtZW50O1xuXG4gICAgdHJ5IHtcbiAgICAgICAgcmVwbGFjZW1lbnQgPSBpc05hTihrZXkpID8gdGVtcGxleC5kZXJlZi5jYWxsKHRoaXMsIGtleSkgOiB0aGlzWzBdW2tleV07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXBsYWNlbWVudCA9ICd7JyArIGtleSArICd9JztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVwbGFjZW1lbnQ7XG59O1xuXG4vLyB0aGlzIGludGVyZmFjZSBjb25zaXN0cyBzb2xlbHkgb2YgdGhlIHRlbXBsZXggZnVuY3Rpb24gKGFuZCBpdCdzIHByb3BlcnRpZXMpXG5tb2R1bGUuZXhwb3J0cyA9IHRlbXBsZXg7XG4iLCIvKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmlsdGVyTm9kZSA9IHJlcXVpcmUoJy4vRmlsdGVyTm9kZScpO1xuXG52YXIgb3BlcmF0b3JzID0gWyc9JywgJ+KJoCcsICc8JywgJz4nLCAn4omkJywgJ+KJpSddO1xudmFyIG9wVG9TUUwgPSB7XG4gICAgJ+KJoCc6ICc8PicsXG4gICAgJ+KJpCc6ICc8PScsXG4gICAgJ+KJpSc6ICc+PSdcbn07XG5cbi8qKiBAY29uc3RydWN0b3JcbiAqIEBzdW1tYXJ5IEEgdGVybWluYWwgbm9kZSBpbiBhIGZpbHRlciB0cmVlLCByZXByZXNlbnRpbmcgYSBjb25kaXRpb25hbCBleHByZXNzaW9uLlxuICogQGRlc2MgQWxzbyBrbm93biBhcyBhIFwiZmlsdGVyLlwiXG4gKi9cbnZhciBGaWx0ZXJMZWFmID0gRmlsdGVyTm9kZS5leHRlbmQoJ0ZpbHRlckxlYWYnLCB7XG5cbiAgICBuZXdWaWV3OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJvb3QgPSB0aGlzLmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICByb290LmNsYXNzTmFtZSA9ICdmaWx0ZXItdHJlZS1kZWZhdWx0JztcblxuICAgICAgICB0aGlzLmJpbmRpbmdzID0ge1xuICAgICAgICAgICAgZmllbGQ6IG1ha2VFbGVtZW50KHJvb3QsIHRoaXMuZmllbGRzKSxcbiAgICAgICAgICAgIG9wZXJhdG9yOiBtYWtlRWxlbWVudChyb290LCBvcGVyYXRvcnMpLFxuICAgICAgICAgICAgYXJndW1lbnQ6IG1ha2VFbGVtZW50KHJvb3QpXG4gICAgICAgIH07XG5cbiAgICAgICAgcm9vdC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdicicpKTtcbiAgICB9LFxuXG4gICAgZnJvbUpTT046IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgdmFyIHZhbHVlLCBlbGVtZW50LCBpO1xuICAgICAgICBpZiAoanNvbikge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGpzb24pIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGpzb25ba2V5XTtcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5iaW5kaW5nc1trZXldO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoZWxlbWVudC50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W25hbWU9XFwnJyArIGVsZW1lbnQubmFtZSArICdcXCddJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZWxlbWVudC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRbaV0uY2hlY2tlZCA9IHZhbHVlLmluZGV4T2YoZWxlbWVudFtpXS52YWx1ZSkgPj0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub3B0aW9ucztcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBlbGVtZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudFtpXS5zZWxlY3RlZCA9IHZhbHVlLmluZGV4T2YoZWxlbWVudFtpXS52YWx1ZSkgPj0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB0b0pTT046IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZWxlbWVudCwgdmFsdWUsIGksIGtleSwganNvbiA9IHt9O1xuICAgICAgICBmb3IgKGtleSBpbiB0aGlzLmJpbmRpbmdzKSB7XG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5iaW5kaW5nc1trZXldO1xuICAgICAgICAgICAgc3dpdGNoIChlbGVtZW50LnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbbmFtZT1cXCcnICsgZWxlbWVudC5uYW1lICsgJ1xcJ106ZW5hYmxlZDpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFsdWUgPSBbXSwgaSA9IDA7IGkgPCBlbGVtZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZS5wdXNoKGVsZW1lbnRbaV0udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9wdGlvbnM7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFsdWUgPSBbXSwgaSA9IDA7IGkgPCBlbGVtZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVsZW1lbnQuZGlzYWJsZWQgJiYgZWxlbWVudC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLnB1c2goZWxlbWVudFtpXS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBlbGVtZW50LnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAganNvbltrZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGpzb247XG4gICAgfSxcblxuICAgIHRvU1FMOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHRoaXMuYmluZGluZ3MuZmllbGQudmFsdWUsXG4gICAgICAgICAgICBvcFRvU1FMW3RoaXMuYmluZGluZ3Mub3BlcmF0b3IudmFsdWVdIHx8IHRoaXMuYmluZGluZ3Mub3BlcmF0b3IudmFsdWUsXG4gICAgICAgICAgICAnIFxcJycgKyB0aGlzLmJpbmRpbmdzLmFyZ3VtZW50LnZhbHVlLnJlcGxhY2UoLycvZywgJ1xcJ1xcJycpICsgJ1xcJydcbiAgICAgICAgXS5qb2luKCcgJyk7XG4gICAgfVxufSk7XG5cbi8qKiBAdHlwZWRlZiB2YWx1ZU9wdGlvblxuICogQHByb3BlcnR5IHtzdHJpbmd9IHZhbHVlXG4gKiBAcHJvcGVydHkge3N0cmluZ30gdGV4dFxuICovXG4vKiogQHR5cGVkZWYgb3B0aW9uR3JvdXBcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBsYWJlbFxuICogQHByb3BlcnR5IHtmaWVsZE9wdGlvbltdfSBvcHRpb25zXG4gKi9cbi8qKiBAdHlwZWRlZiB7c3RyaW5nfHZhbHVlT3B0aW9ufG9wdGlvbkdyb3VwfHN0cmluZ1tdfSBmaWVsZE9wdGlvblxuICogQGRlc2MgSWYgYSBzaW1wbGUgYXJyYXkgb2Ygc3RyaW5nLCB5b3UgbXVzdCBhZGQgYSBgbGFiZWxgIHByb3BlcnR5IHRvIHRoZSBhcnJheS5cbiAqL1xuLyoqXG4gKiBAc3VtbWFyeSBIVE1MIGZvcm0gY29udHJvbCBmYWN0b3J5LlxuICogQGRlc2MgQ3JlYXRlcyBhbmQgYXBwZW5kcyBhIHRleHQgYm94IG9yIGEgZHJvcC1kb3duLlxuICogQHJldHVybnMgVGhlIG5ldyBlbGVtZW50LlxuICogQHBhcmFtIHtFbGVtZW50fSBjb250YWluZXIgLSBBbiBlbGVtZW50IHRvIHdoaWNoIHRvIGFwcGVuZCB0aGUgbmV3IGVsZW1lbnQuXG4gKiBAcGFyYW0ge2ZpZWxkT3B0aW9ufGZpZWxkT3B0aW9uW119IFtvcHRpb25zXSAtIE92ZXJsb2FkczpcbiAqICogSWYgb21pdHRlZCwgd2lsbCBjcmVhdGUgYW4gYDxpbnB1dC8+YCAodGV4dCBib3gpIGVsZW1lbnQuXG4gKiAqIElmIGEgc2luZ2xlIG9wdGlvbiAoZWl0aGVyIGFzIGEgc2NhbGFyIG9yIGFzIHRoZSBvbmx5IGVsZW1lbnQgaW4gYW4gYXJyYXkpLCB3aWxsIGNyZWF0ZSBhIGA8c3Bhbj4uLi48L3NwYW4+YCBlbGVtZW50IGNvbnRhaW5pbmcgdGhlIHN0cmluZyBhbmQgYSBgPGlucHV0IHR5cGU9aGlkZGVuPmAgY29udGFpbmluZyB0aGUgdmFsdWUuXG4gKiAqIE90aGVyd2lzZSwgY3JlYXRlcyBhIGA8c2VsZWN0Pi4uLjwvc2VsZWN0PmAgZWxlbWVudCB3aXRoIHRoZXNlIHN0cmluZ3MgYWRkZWQgYXMgYDxvcHRpb24+Li4uPC9vcHRpb24+YCBlbGVtZW50cy4gT3B0aW9uIGdyb3VwcyBtYXkgYmUgc3BlY2lmaWVkIGFzIG5lc3RlZCBhcnJheXMuXG4gKiBAcGFyYW0ge251bGx8c3RyaW5nfSBbcHJvbXB0PScnXSAtIEFkZHMgYW4gaW5pdGlhbCBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnQgdG8gdGhlIGRyb3AtZG93biB3aXRoIHRoaXMgdmFsdWUsIHBhcmVudGhlc2l6ZWQsIGFzIGl0cyBgdGV4dGA7IGFuZCBlbXB0eSBzdHJpbmcgYXMgaXRzIGB2YWx1ZWAuIE9taXR0aW5nIGNyZWF0ZXMgYSBibGFuayBwcm9tcHQ7IGBudWxsYCBzdXBwcmVzc2VzLlxuICovXG5mdW5jdGlvbiBtYWtlRWxlbWVudChjb250YWluZXIsIG9wdGlvbnMsIHByb21wdCkge1xuICAgIHZhciBlbCxcbiAgICAgICAgdGFnTmFtZSA9IG9wdGlvbnMgPyAnc2VsZWN0JyA6ICdpbnB1dCc7XG5cbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICB2YXIgb3B0aW9uID0gb3B0aW9uc1swXTtcbiAgICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIGVsLmlubmVySFRNTCA9IG9wdGlvbi50ZXh0IHx8IG9wdGlvbjtcblxuICAgICAgICB2YXIgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICBpbnB1dC50eXBlID0gJ2hpZGRlbic7XG4gICAgICAgIGlucHV0LnZhbHVlID0gb3B0aW9uLnZhbHVlIHx8IG9wdGlvbjtcbiAgICAgICAgZWwuYXBwZW5kQ2hpbGQoaW5wdXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsID0gYWRkT3B0aW9ucyh0YWdOYW1lLCBvcHRpb25zLCBwcm9tcHQpO1xuICAgIH1cbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZWwpO1xuICAgIHJldHVybiBlbDtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBDcmVhdGVzIGEgbmV3IGVsZW1lbnQgYW5kIGFkZHMgb3B0aW9ucyB0byBpdC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWdOYW1lIC0gTXVzdCBiZSBvbmUgb2Y6XG4gKiAqIGAnaW5wdXQnYCBmb3IgYSB0ZXh0IGJveFxuICogKiBgJ3NlbGVjdCdgIGZvciBhIGRyb3AtZG93blxuICogKiBgJ29wdGdyb3VwJ2AgKGZvciBpbnRlcm5hbCB1c2Ugb25seSlcbiAqIEBwYXJhbSB7ZmllbGRPcHRpb25bXX0gW29wdGlvbnNdIC0gU3RyaW5ncyB0byBhZGQgYXMgYDxvcHRpb24+Li4uPC9vcHRpb24+YCBlbGVtZW50cy4gT21pdCB3aGVuIGNyZWF0aW5nIGEgdGV4dCBib3guXG4gKiBAcGFyYW0ge251bGx8c3RyaW5nfSBbcHJvbXB0PScnXSAtIEFkZHMgYW4gaW5pdGlhbCBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnQgdG8gdGhlIGRyb3AtZG93biB3aXRoIGB0ZXh0YCB0aGlzIHZhbHVlIGluIHBhcmVudGhlc2VzLCBhcyBpdHMgYHRleHRgOyBhbmQgZW1wdHkgc3RyaW5nIGFzIGl0cyBgdmFsdWVgLiBPbWl0dGluZyBjcmVhdGVzIGEgYmxhbmsgcHJvbXB0OyBgbnVsbGAgc3VwcHJlc3Nlcy5cbiAqIEByZXR1cm5zIHtFbGVtZW50fSBFaXRoZXIgYSBgPHNlbGVjdD5gIG9yIGA8b3B0Z3JvdXA+YCBlbGVtZW50LlxuICovXG5mdW5jdGlvbiBhZGRPcHRpb25zKHRhZ05hbWUsIG9wdGlvbnMsIHByb21wdCkge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGFkZDtcbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdzZWxlY3QnKSB7XG4gICAgICAgICAgICBhZGQgPSBlbC5hZGQ7XG4gICAgICAgICAgICBpZiAocHJvbXB0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZWwuYWRkKG5ldyBPcHRpb24ocHJvbXB0ID8gJygnICsgcHJvbXB0ICsgJyknIDogJycpLCAnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGQgPSBlbC5hcHBlbmRDaGlsZDtcbiAgICAgICAgICAgIGVsLmxhYmVsID0gcHJvbXB0O1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaChmdW5jdGlvbihvcHRpb24pIHtcbiAgICAgICAgICAgIHZhciBuZXdFbGVtZW50O1xuICAgICAgICAgICAgaWYgKChvcHRpb24ub3B0aW9ucyB8fCBvcHRpb24pIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0Z3JvdXAgPSBhZGRPcHRpb25zKCdvcHRncm91cCcsIG9wdGlvbi5vcHRpb25zIHx8IG9wdGlvbiwgb3B0aW9uLmxhYmVsKTtcbiAgICAgICAgICAgICAgICBlbC5hZGQob3B0Z3JvdXApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXdFbGVtZW50ID0gdHlwZW9mIG9wdGlvbiA9PT0gJ29iamVjdCcgPyBuZXcgT3B0aW9uKG9wdGlvbi50ZXh0LCBvcHRpb24udmFsdWUpIDogbmV3IE9wdGlvbihvcHRpb24pO1xuICAgICAgICAgICAgICAgIGFkZC5jYWxsKGVsLCBuZXdFbGVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWx0ZXJMZWFmO1xuIiwiLyogZXNsaW50LWVudiBicm93c2VyICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZC1tZScpO1xudmFyIEJhc2UgPSBleHRlbmQuQmFzZTtcblxudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZScpO1xuXG5leHRlbmQuZGVidWcgPSB0cnVlO1xuXG52YXIgRmlsdGVyTm9kZSA9IEJhc2UuZXh0ZW5kKHtcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50ID0gb3B0aW9ucyAmJiBvcHRpb25zLnBhcmVudCxcbiAgICAgICAgICAgIGpzb24gPSB0aGlzLmpzb24gPSBvcHRpb25zICYmIG9wdGlvbnMuanNvbjtcblxuICAgICAgICB0aGlzLmZpZWxkcyA9XG4gICAgICAgICAgICBvcHRpb25zICYmIG9wdGlvbnMuZmllbGRzIHx8XG4gICAgICAgICAgICBqc29uICYmIGpzb24uZmllbGRzIHx8XG4gICAgICAgICAgICBwYXJlbnQgJiYgcGFyZW50LmZpZWxkcztcblxuICAgICAgICBpZiAoIXRoaXMuZmllbGRzKSB7XG4gICAgICAgICAgICB0aHJvdyB0aGlzLkVycm9yKCdObyBmaWVsZCBuYW1lcyBsaXN0LicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5uZXdWaWV3KCk7XG4gICAgICAgIHRoaXMuZnJvbUpTT04oanNvbik7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfSxcblxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnBhcmVudCkge1xuICAgICAgICAgICAgdmFyIG5ld0xpc3RJdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0aGlzLkNISUxEX1RBRyk7XG4gICAgICAgICAgICBuZXdMaXN0SXRlbS5hcHBlbmRDaGlsZCh0ZW1wbGF0ZSgncmVtb3ZlQnV0dG9uJykpO1xuICAgICAgICAgICAgbmV3TGlzdEl0ZW0uYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICAgICAgICB0aGlzLnBhcmVudC5lbC5xdWVyeVNlbGVjdG9yKHRoaXMuQ0hJTERSRU5fVEFHKS5hcHBlbmRDaGlsZChuZXdMaXN0SXRlbSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgRXJyb3I6IGZ1bmN0aW9uKG1zZykge1xuICAgICAgICByZXR1cm4gbmV3IEVycm9yKCdGaWx0ZXJUcmVlOiAnICsgbXNnKTtcbiAgICB9LFxuXG4gICAgQ0hJTERSRU5fVEFHOiAnT0wnLFxuICAgIENISUxEX1RBRzogJ0xJJyxcbiAgICBDU1NfQ0xBU1NfTkFNRTogJ2ZpbHRlci10cmVlJ1xuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBGaWx0ZXJOb2RlO1xuIiwiLyogZXNsaW50LWVudiBicm93c2VyICovXG5cbi8vIFRoaXMgaXMgdGhlIG1haW4gZmlsZSwgdXNhYmxlIGFzIGlzLCBzdWNoIGFzIGJ5IC90ZXN0L2luZGV4LmpzLlxuLy8gRm9yIG5wbTogZ3VscGZpbGUuanMgY29waWVzIHRoaXMgZmlsZSB0byAuLi9pbmRleC5qcywgYWRqdXN0aW5nIHRoZSByZXF1aXJlIHBhdGhzIGFuZCBkZWZpbmluZyB0aGUgYGNzc2AgbG9jYWwuXG4vLyBGb3IgQ0ROOiBndWxwZmlsZS5qcyB0aGVuIGJyb3dzZXJpZmllcyAuLi9pbmRleC5qcyB3aXRoIHNvdXJjZW1hcCB0byAvYnVpbGQvZmlsdGVyLXRyZWUuanMgYW5kIHVnbGlmaWVkIHdpdGhvdXQgc291cmNlbWFwIHRvIC9idWlsZC9maWx0ZXItdHJlZS5taW4uanMuIFRoZSBDRE4gaXMgaHR0cHM6Ly9qb25laXQuZ2l0aHViLmlvL2ZpbHRlci10cmVlLlxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjc3NJbmplY3RvciA9IHJlcXVpcmUoJ2Nzcy1pbmplY3RvcicpO1xuXG52YXIgRmlsdGVyTm9kZSA9IHJlcXVpcmUoJy4vRmlsdGVyTm9kZScpO1xudmFyIERlZmF1bHRGaWx0ZXIgPSByZXF1aXJlKCcuL0ZpbHRlckxlYWYnKTtcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKTtcbnZhciBvcGVyYXRvcnMgPSByZXF1aXJlKCcuL3RyZWUtb3BlcmF0b3JzJyk7XG5cbnZhciBvcmRpbmFsID0gMDtcblxudmFyIGNob29zZXI7XG5cbnZhciBjc3M7IC8vIGRlZmluZWQgYnkgY29kZSBpbnNlcnRlZCBieSBndWxwZmlsZSBiZXR3ZWVuIGZvbGxvd2luZyBjb21tZW50c1xuLyogaW5qZWN0OmNzcyAqL1xuY3NzID0gJy5maWx0ZXItdHJlZXtmb250LWZhbWlseTpzYW5zLXNlcmlmO2xpbmUtaGVpZ2h0OjEuNWVtfS5maWx0ZXItdHJlZSBvbHttYXJnaW4tdG9wOjB9LmZpbHRlci10cmVlLWFkZCwuZmlsdGVyLXRyZWUtYWRkLWZpbHRlciwuZmlsdGVyLXRyZWUtcmVtb3Zle2N1cnNvcjpwb2ludGVyfS5maWx0ZXItdHJlZS1hZGQsLmZpbHRlci10cmVlLWFkZC1maWx0ZXJ7Zm9udC1zaXplOnNtYWxsZXI7Zm9udC1zdHlsZTppdGFsaWM7bWFyZ2luLWxlZnQ6M2VtfS5maWx0ZXItdHJlZS1hZGQtZmlsdGVyOmhvdmVyLC5maWx0ZXItdHJlZS1hZGQ6aG92ZXJ7dGV4dC1kZWNvcmF0aW9uOnVuZGVybGluZX0uZmlsdGVyLXRyZWUtYWRkLWZpbHRlcj5kaXYsLmZpbHRlci10cmVlLWFkZD5kaXYsLmZpbHRlci10cmVlLXJlbW92ZXtkaXNwbGF5OmlubGluZS1ibG9jazt3aWR0aDoxNXB4O2hlaWdodDoxNXB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQtY29sb3I6IzhjODtmb250LXNpemU6MTEuNXB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjojZmZmO3RleHQtYWxpZ246Y2VudGVyO2xpbmUtaGVpZ2h0Om5vcm1hbDtmb250LXN0eWxlOm5vcm1hbDtmb250LWZhbWlseTpzYW5zLXNlcmlmO3RleHQtc2hhZG93OjAgMCAxLjVweCBncmV5O21hcmdpbi1yaWdodDo0cHh9LmZpbHRlci10cmVlLWFkZC1maWx0ZXI+ZGl2OmJlZm9yZSwuZmlsdGVyLXRyZWUtYWRkPmRpdjpiZWZvcmV7Y29udGVudDpcXCdcXFxcZmYwYlxcJ30uZmlsdGVyLXRyZWUtcmVtb3Zle2JhY2tncm91bmQtY29sb3I6I2U4ODtib3JkZXI6MH0uZmlsdGVyLXRyZWUtcmVtb3ZlOmJlZm9yZXtjb250ZW50OlxcJ1xcXFwyMjEyXFwnfS5maWx0ZXItdHJlZSBsaTo6YWZ0ZXJ7Zm9udC1zaXplOjcwJTtmb250LXN0eWxlOml0YWxpYztmb250LXdlaWdodDo3MDA7Y29sb3I6IzkwMH0uZmlsdGVyLXRyZWU+b2w+bGk6bGFzdC1jaGlsZDo6YWZ0ZXJ7ZGlzcGxheTpub25lfS5vcC1vcj5vbD5saTo6YWZ0ZXJ7Y29udGVudDpcXCdcXFxcQTDigJQgT1Ig4oCUXFwnfS5vcC1hbmQ+b2w+bGk6OmFmdGVye2NvbnRlbnQ6XFwnXFxcXEEw4oCUIEFORCDigJRcXCd9Lm9wLW5vcj5vbD5saTo6YWZ0ZXJ7Y29udGVudDpcXCdcXFxcQTDigJQgTk9SIOKAlFxcJ30uZmlsdGVyLXRyZWUtZGVmYXVsdD4qe21hcmdpbjowIC40ZW19LmZpbHRlci10cmVlLWNob29zZXJ7cG9zaXRpb246YWJzb2x1dGU7Zm9udC1zdHlsZTppdGFsaWM7YmFja2dyb3VuZC1jb2xvcjojZmYwO2JveC1zaGFkb3c6NXB4IDVweCAxMHB4IGdyZXl9Jztcbi8qIGVuZGluamVjdCAqL1xuXG4vKiogQGNvbnN0cnVjdG9yXG4gKlxuICogQHN1bW1hcnkgQSBub2RlIGluIGEgZmlsdGVyIHRyZWUgKGluY2x1ZGluZyB0aGUgcm9vdCBub2RlKSwgcmVwcmVzZW50aW5nIGEgY29tcGxleCBmaWx0ZXIgZXhwcmVzc2lvbi5cbiAqXG4gKiBAZGVzYyBBIGBGaWx0ZXJUcmVlYCBpcyBhbiBuLWFyeSB0cmVlIHdpdGggYSBzaW5nbGUgYG9wZXJhdG9yYCB0byBiZSBhcHBsaWVkIHRvIGFsbCBpdHMgYGNoaWxkcmVuYC5cbiAqXG4gKiBBbHNvIGtub3duIGFzIGEgXCJzdWJ0cmVlXCIgb3IgYSBcInN1YmV4cHJlc3Npb25cIi5cbiAqXG4gKiBFYWNoIG9mIHRoZSBgY2hpbGRyZW5gIGNhbiBiZSBlaXRoZXI6XG4gKlxuICogKiBhIHRlcm5pbmFsIG5vZGUgYEZpbHRlcmAgKG9yIGFuIG9iamVjdCBpbmhlcml0aW5nIGZyb20gYEZpbHRlcmApIHJlcHJlc2VudGluZyBhIHNpbXBsZSBjb25kaXRpb25hbCBleHByZXNzaW9uOyBvclxuICogKiBhIG5lc3RlZCBgRmlsdGVyVHJlZWAgcmVwcmVzZW50aW5nIGEgY29tcGxleCBzdWJleHByZXNzaW9uLlxuICpcbiAqIFRoZSBgb3BlcmF0b3JgIG11c3QgYmUgb25lIG9mIHRoZSB7QGxpbmsgb3BlcmF0b3JzfHRyZWUgb3BlcmF0b3JzfSBvciBtYXkgYmUgbGVmdCB1bmRlZmluZWQgaWZmIHRoZXJlIGlzIG9ubHkgb25lIGNoaWxkIG5vZGUuXG4gKlxuICogTm90ZXM6XG4gKiAxLiBBIGBGaWx0ZXJUcmVlYCBtYXkgY29uc2lzdCBvZiBhIHNpbmdsZSBsZWFmLCBpbiB3aGljaCBjYXNlIHRoZSBgb3BlcmF0b3JgIGlzIG5vdCB1c2VkIGFuZCBtYXkgYmUgbGVmdCB1bmRlZmluZWQuIEhvd2V2ZXIsIGlmIGEgc2Vjb25kIGNoaWxkIGlzIGFkZGVkIGFuZCB0aGUgb3BlcmF0b3IgaXMgc3RpbGwgdW5kZWZpbmVkLCBpdCB3aWxsIGJlIHNldCB0byB0aGUgZGVmYXVsdCAoYCdvcC1hbmQnYCkuXG4gKiAyLiBUaGUgb3JkZXIgb2YgdGhlIGNoaWxkcmVuIGlzIHVuZGVmaW5lZCBhcyBhbGwgb3BlcmF0b3JzIGFyZSBjb21tdXRhdGl2ZS4gRm9yIHRoZSAnYG9wLW9yYCcgb3BlcmF0b3IsIGV2YWx1YXRpb24gY2Vhc2VzIG9uIHRoZSBmaXJzdCBwb3NpdGl2ZSByZXN1bHQgYW5kIGZvciBlZmZpY2llbmN5LCBhbGwgc2ltcGxlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb25zIHdpbGwgYmUgZXZhbHVhdGVkIGJlZm9yZSBhbnkgY29tcGxleCBzdWJleHByZXNzaW9ucy5cbiAqIDMuIEEgbmVzdGVkIGBGaWx0ZXJUcmVlYCBpcyBkaXN0aW5ndWlzaGVkIGluIHRoZSBKU09OIG9iamVjdCBmcm9tIGEgYEZpbHRlcmAgYnkgdGhlIHByZXNlbmNlIG9mIGEgYGNoaWxkcmVuYCBtZW1iZXIuXG4gKiA0LiBOZXN0aW5nIGEgYEZpbHRlclRyZWVgIGNvbnRhaW5pbmcgYSBzaW5nbGUgY2hpbGQgaXMgdmFsaWQgKGFsYmVpdCBwb2ludGxlc3MpLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nW119IFtmaWVsZHNdIC0gQSBsaXN0IG9mIGZpZWxkIG5hbWVzIGZvciBgRmlsdGVyYCBvYmplY3RzIHRvIHVzZS4gTWF5IGJlIG92ZXJyaWRkZW4gYnkgZGVmaW5pbmcgYGpzb24uZmllbGRzYCBoZXJlIG9yIGluIHRoZSBganNvbmAgcGFyYW1ldGVyIG9mIGFueSBkZXNjZW5kYW50IChpbmNsdWRpbmcgdGVybWluYWwgbm9kZXMpLiBJZiBubyBzdWNoIGRlZmluaXRpb24sIHdpbGwgc2VhcmNoIHVwIHRoZSB0cmVlIGZvciB0aGUgZmlyc3Qgbm9kZSB3aXRoIGEgZGVmaW5lZCBgZmllbGRzYCBtZW1iZXIuIEluIHByYWN0aWNlIHRoaXMgcGFyYW1ldGVyIGlzIG5vdCB1c2VkIGhlcmVpbjsgaXQgbWF5IGJlIHVzZWQgYnkgdGhlIGNhbGxlciBmb3IgdGhlIHRvcC1sZXZlbCAocm9vdCkgdHJlZS5cbiAqIEBwYXJhbSB7SlNPTn0gW2pzb25dIC0gSWYgb21taXR0ZWQsIGxvYWRzIGFuIGVtcHR5IGZpbHRlciAoYSBgRmlsdGVyVHJlZWAgY29uc2lzdGluZyBvZiBhIHNpbmdsZSB0ZXJtaW5hbCBub2RlIGFuZCB0aGUgZGVmYXVsdCBgb3BlcmF0b3JgIHZhbHVlIChgJ29wLWFuZCdgKS5cbiAqIEBwYXJhbSB7RmlsdGVyVHJlZX0gW3BhcmVudF0gLSBVc2VkIGludGVybmFsbHkgdG8gaW5zZXJ0IGVsZW1lbnQgd2hlbiBjcmVhdGluZyBuZXN0ZWQgc3VidHJlZXMuIEZvciB0aGUgdG9wIGxldmVsIHRyZWUsIHlvdSBkb24ndCBnaXZlIGEgdmFsdWUgZm9yIGBwYXJlbnRgOyB5b3UgYXJlIHJlc3BvbnNpYmxlIGZvciBpbnNlcnRpbmcgdGhlIHRvcC1sZXZlbCBgLmVsYCBpbnRvIHRoZSBET00uXG4gKlxuICogQHByb3BlcnR5IHtGaWx0ZXJUcmVlfSBwYXJlbnRcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBvcmRpbmFsXG4gKiBAcHJvcGVydHkge3N0cmluZ30gb3BlcmF0b3JcbiAqIEBwcm9wZXJ0eSB7RmlsdGVyTm9kZVtdfSBjaGlsZHJlbiAtIEVhY2ggb25lIGlzIGVpdGhlciBhIGBGaWx0ZXJgIChvciBhbiBvYmplY3QgaW5oZXJpdGluZyBmcm9tIGBGaWx0ZXJgKSBvciBhbm90aGVyIGBGaWx0ZXJUcmVlYC4uXG4gKiBAcHJvcGVydHkge0VsZW1lbnR9IGVsIC0gVGhlIHJvb3QgZWxlbWVudCBvZiB0aGlzIChzdWIpdHJlZS5cbiAqL1xudmFyIEZpbHRlclRyZWUgPSBGaWx0ZXJOb2RlLmV4dGVuZCgnRmlsdGVyVHJlZScsIHtcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFjaG9vc2VyKSB7XG4gICAgICAgICAgICAvLyBvbmUtdGltZSBpbml0aWFsaXphdGlvbnM6XG4gICAgICAgICAgICBjaG9vc2VyID0gbWFrZUNob29zZXIoKTtcbiAgICAgICAgICAgIGNzc0luamVjdG9yKGNzcywgJ2ZpbHRlci10cmVlLWJhc2UnLCBvcHRpb25zICYmIG9wdGlvbnMuY3NzU3R5bGVzaGVldFJlZmVyZW5jZUVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGZpbHRlckVkaXRvcnM6IHtcbiAgICAgICAgRGVmYXVsdDogRGVmYXVsdEZpbHRlcixcbiAgICAgICAgQnViYmxlczogRGVmYXVsdEZpbHRlclxuICAgIH0sXG5cbiAgICBuZXdWaWV3OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5lbCA9IHRlbXBsYXRlKCd0cmVlJywgKytvcmRpbmFsKTtcbiAgICAgICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNhdGNoQ2xpY2suYmluZCh0aGlzKSk7XG4gICAgfSxcblxuICAgIGZyb21KU09OOiBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIGlmIChqc29uKSB7XG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSB0aGUgSlNPTiBvYmplY3RcbiAgICAgICAgICAgIGlmICh0eXBlb2YganNvbiAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyTXNnID0gJ0V4cGVjdGVkIGBqc29uYCBwYXJhbWV0ZXIgdG8gYmUgYW4gb2JqZWN0Lic7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBqc29uID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBlcnJNc2cgKz0gJyBTZWUgYEpTT04ucGFyc2UoKWAuJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgdGhpcy5FcnJvcihlcnJNc2cpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBganNvbi5jaGlsZHJlbmBcbiAgICAgICAgICAgIGlmICghKGpzb24uY2hpbGRyZW4gaW5zdGFuY2VvZiBBcnJheSAmJiBqc29uLmNoaWxkcmVuLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0aGlzLkVycm9yKCdFeHBlY3RlZCBgY2hpbGRyZW5gIGZpZWxkIHRvIGJlIGEgbm9uLWVtcHR5IGFycmF5LicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAganNvbi5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGpzb24pIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgICAgICAgICAgICB2YXIgQ29uc3RydWN0b3I7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBqc29uICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBzZWxmLkVycm9yKCdFeHBlY3RlZCBjaGlsZCB0byBiZSBhbiBvYmplY3QgY29udGFpbmluZyBlaXRoZXIgYGNoaWxkcmVuYCwgYHR5cGVgLCBvciBuZWl0aGVyLicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoanNvbi5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICBDb25zdHJ1Y3RvciA9IEZpbHRlclRyZWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgQ29uc3RydWN0b3IgPSBzZWxmLmZpbHRlckVkaXRvcnNbanNvbi50eXBlIHx8ICdEZWZhdWx0J107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYuY2hpbGRyZW4ucHVzaChuZXcgQ29uc3RydWN0b3IoeyBqc29uOiBqc29uLCBwYXJlbnQ6IHNlbGYgfSkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIGBqc29uLm9wZXJhdG9yYFxuICAgICAgICAgICAgaWYgKCEob3BlcmF0b3JzW2pzb24ub3BlcmF0b3JdIHx8IGpzb24ub3BlcmF0b3IgPT09IHVuZGVmaW5lZCAmJiBqc29uLmNoaWxkcmVuLmxlbmd0aCA9PT0gMSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0aGlzLkVycm9yKCdFeHBlY3RlZCBgb3BlcmF0b3JgIGZpZWxkIHRvIGJlIG9uZSBvZjogJyArIE9iamVjdC5rZXlzKG9wZXJhdG9ycykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5vcGVyYXRvciA9IGpzb24ub3BlcmF0b3I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZmlsdGVyRWRpdG9yTmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLmZpbHRlckVkaXRvcnMpLFxuICAgICAgICAgICAgICAgIG9ubHlPbmVGaWx0ZXJFZGl0b3IgPSBmaWx0ZXJFZGl0b3JOYW1lcy5sZW5ndGggPT09IDE7XG4gICAgICAgICAgICB0aGlzLmNoaWxkcmVuID0gb25seU9uZUZpbHRlckVkaXRvciA/IFtuZXcgdGhpcy5maWx0ZXJFZGl0b3JzW2ZpbHRlckVkaXRvck5hbWVzWzBdXSh7IHBhcmVudDogdGhpcyB9KV0gOiBbXTtcbiAgICAgICAgICAgIHRoaXMub3BlcmF0b3IgPSAnb3AtYW5kJztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBzaW11bGF0ZSBjbGljayBvbiB0aGUgb3BlcmF0b3IgdG8gZGlzcGxheSBzdHJpa2UtdGhyb3VnaCBhbmQgb3BlcmF0b3IgYmV0d2VlbiBmaWx0ZXJzXG4gICAgICAgIHZhciByYWRpb0J1dHRvbiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignaW5wdXRbdmFsdWU9JyArIHRoaXMub3BlcmF0b3IgKyAnXScpO1xuICAgICAgICByYWRpb0J1dHRvbi5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpc1snZmlsdGVyLXRyZWUtY2hvb3NlLW9wZXJhdG9yJ10oeyB0YXJnZXQ6IHJhZGlvQnV0dG9uIH0pO1xuXG4gICAgICAgIC8vIHdoZW4gbXVsdGlwbGUgZmlsdGVyIGVkaXRvcnMgYXZhaWxhYmxlLCBzaW11bGF0ZSBjbGljayBvbiB0aGUgbmV3IFwiYWRkIGNvbmRpdGlvbmFsXCIgbGlua1xuICAgICAgICBpZiAoIXRoaXMuY2hpbGRyZW4ubGVuZ3RoICYmIE9iamVjdC5rZXlzKHRoaXMuZmlsdGVyRWRpdG9ycykubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdmFyIGFkZEZpbHRlckxpbmsgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJy5maWx0ZXItdHJlZS1hZGQtZmlsdGVyJyk7XG4gICAgICAgICAgICB0aGlzWydmaWx0ZXItdHJlZS1hZGQtZmlsdGVyJ10oeyB0YXJnZXQ6IGFkZEZpbHRlckxpbmsgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwcm9jZWVkIHdpdGggcmVuZGVyXG4gICAgICAgIEZpbHRlck5vZGUucHJvdG90eXBlLnJlbmRlci5jYWxsKHRoaXMpO1xuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtY2hvb3NlLW9wZXJhdG9yJzogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHZhciByYWRpb0J1dHRvbiA9IGV2dC50YXJnZXQ7XG5cbiAgICAgICAgdGhpcy5vcGVyYXRvciA9IHJhZGlvQnV0dG9uLnZhbHVlO1xuXG4gICAgICAgIC8vIGRpc3BsYXkgc3RyaWtlLXRocm91Z2hcbiAgICAgICAgdmFyIHJhZGlvQnV0dG9ucyA9IHRoaXMuZWwucXVlcnlTZWxlY3RvckFsbCgnbGFiZWw+aW5wdXQuZmlsdGVyLXRyZWUtY2hvb3NlLW9wZXJhdG9yW25hbWU9JyArIHJhZGlvQnV0dG9uLm5hbWUgKyAnXScpO1xuICAgICAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChyYWRpb0J1dHRvbnMpLmZvckVhY2goZnVuY3Rpb24ocmFkaW9CdXR0b24pIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgICAgICAgIHJhZGlvQnV0dG9uLnBhcmVudEVsZW1lbnQuc3R5bGUudGV4dERlY29yYXRpb24gPSByYWRpb0J1dHRvbi5jaGVja2VkID8gJ25vbmUnIDogJ2xpbmUtdGhyb3VnaCc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGRpc3BsYXkgb3BlcmF0b3IgYmV0d2VlbiBmaWx0ZXJzIGJ5IGFkZGluZyBvcGVyYXRvciBzdHJpbmcgYXMgYSBDU1MgY2xhc3Mgb2YgdGhpcyB0cmVlXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvcGVyYXRvcnMpIHsgdGhpcy5lbC5jbGFzc0xpc3QucmVtb3ZlKGtleSk7IH1cbiAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKHRoaXMub3BlcmF0b3IpO1xuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtYWRkLWZpbHRlcic6IGZ1bmN0aW9uKGV2dCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIHZhciBmaWx0ZXJFZGl0b3JOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuZmlsdGVyRWRpdG9ycyk7XG4gICAgICAgIGlmIChmaWx0ZXJFZGl0b3JOYW1lcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4ucHVzaChuZXcgdGhpcy5maWx0ZXJFZGl0b3JzW2ZpbHRlckVkaXRvck5hbWVzWzBdXSh7IHBhcmVudDogdGhpcyB9KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhdHRhY2hDaG9vc2VyLmNhbGwodGhpcywgZXZ0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtYWRkJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4ucHVzaChuZXcgRmlsdGVyVHJlZSh7IHBhcmVudDogdGhpcyB9KSk7XG4gICAgfSxcblxuICAgICdmaWx0ZXItdHJlZS1yZW1vdmUnOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgdmFyIGRlbGV0ZUJ1dHRvbiA9IGV2dC50YXJnZXQsXG4gICAgICAgICAgICBsaXN0SXRlbSA9IGRlbGV0ZUJ1dHRvbi5wYXJlbnRFbGVtZW50LFxuICAgICAgICAgICAgY2hpbGRyZW4gPSB0aGlzLmNoaWxkcmVuLFxuICAgICAgICAgICAgZWwgPSBkZWxldGVCdXR0b24ubmV4dEVsZW1lbnRTaWJsaW5nO1xuXG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQsIGlkeCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkLmVsID09PSBlbCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjaGlsZHJlbltpZHhdO1xuICAgICAgICAgICAgICAgIGxpc3RJdGVtLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgdG9KU09OOiBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICBvcGVyYXRvcjogdGhpcy5vcGVyYXRvcixcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgdmFyIGlzVGVybWluYWxOb2RlID0gIShjaGlsZCBpbnN0YW5jZW9mIEZpbHRlclRyZWUpO1xuICAgICAgICAgICAgaWYgKGlzVGVybWluYWxOb2RlIHx8IGNoaWxkLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5jaGlsZHJlbi5wdXNoKGlzVGVybWluYWxOb2RlID8gY2hpbGQgOiB0b0pTT04uY2FsbChjaGlsZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICB0b1NRTDogZnVuY3Rpb24gdG9TUUwoKSB7XG4gICAgICAgIHZhciBTUUwgPSBvcGVyYXRvcnNbdGhpcy5vcGVyYXRvcl0uU1FMLFxuICAgICAgICAgICAgcmVzdWx0ID0gU1FMLmJlZztcblxuICAgICAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQsIGlkeCkge1xuICAgICAgICAgICAgdmFyIGlzVGVybWluYWxOb2RlID0gIShjaGlsZCBpbnN0YW5jZW9mIEZpbHRlclRyZWUpO1xuICAgICAgICAgICAgaWYgKGlzVGVybWluYWxOb2RlIHx8IGNoaWxkLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChpZHgpIHsgcmVzdWx0ICs9ICcgJyArIFNRTC5vcCArICcgJzsgfVxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBpc1Rlcm1pbmFsTm9kZSA/IGNoaWxkLnRvU1FMKCkgOiB0b1NRTC5jYWxsKGNoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmVzdWx0ICs9IFNRTC5lbmQ7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbn0pO1xuXG5mdW5jdGlvbiBjYXRjaENsaWNrKGV2dCkge1xuICAgIHZhciBlbHQgPSBldnQudGFyZ2V0O1xuXG4gICAgdmFyIGhhbmRsZXIgPSB0aGlzW2VsdC5jbGFzc05hbWVdIHx8IHRoaXNbZWx0LnBhcmVudE5vZGUuY2xhc3NOYW1lXTtcbiAgICBpZiAoaGFuZGxlcikge1xuICAgICAgICBkZXRhY2hDaG9vc2VyKCk7XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBldnQpO1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBtYWtlQ2hvb3NlcigpIHtcbiAgICB2YXIgJCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NlbGVjdCcpLFxuICAgICAgICBmaWx0ZXJFZGl0b3JzID0gT2JqZWN0LmtleXMoRmlsdGVyVHJlZS5wcm90b3R5cGUuZmlsdGVyRWRpdG9ycyk7XG5cbiAgICAkLmNsYXNzTmFtZSA9ICdmaWx0ZXItdHJlZS1jaG9vc2VyJztcbiAgICAkLnNpemUgPSBmaWx0ZXJFZGl0b3JzLmxlbmd0aDtcblxuICAgIGZpbHRlckVkaXRvcnMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHsgJC5hZGQobmV3IE9wdGlvbihrZXkpKTsgfSk7XG5cbiAgICAkLm9ubW91c2VvdmVyID0gZnVuY3Rpb24oZXZ0KSB7IGV2dC50YXJnZXQuc2VsZWN0ZWQgPSB0cnVlOyB9O1xuXG4gICAgcmV0dXJuICQ7XG59XG5cbnZhciBjaG9vc2VyUGFyZW50O1xuXG5mdW5jdGlvbiBhdHRhY2hDaG9vc2VyKGV2dCkge1xuICAgIHZhciB0cmVlID0gdGhpcyxcbiAgICAgICAgcmVjdCA9IGV2dC50YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICBpZiAoIXJlY3Qud2lkdGgpIHtcbiAgICAgICAgLy8gbm90IGluIERPTSB5ZXQgc28gdHJ5IGFnYWluIGxhdGVyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGF0dGFjaENob29zZXIuY2FsbCh0cmVlLCBldnQpOyB9LCA1MCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjaG9vc2VyLnN0eWxlLmxlZnQgPSByZWN0LmxlZnQgKyAxOSArICdweCc7XG4gICAgY2hvb3Nlci5zdHlsZS50b3AgPSByZWN0LmJvdHRvbSArICdweCc7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBkZXRhY2hDaG9vc2VyKTsgLy8gZGV0YWNoIGNob29zZXIgaWYgY2xpY2sgb3V0c2lkZVxuXG4gICAgY2hvb3Nlci5vbmNsaWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRyZWUuY2hpbGRyZW4ucHVzaChuZXcgdHJlZS5maWx0ZXJFZGl0b3JzW2Nob29zZXIudmFsdWVdKHsgcGFyZW50OiB0cmVlIH0pKTtcbiAgICAgICAgLy8gY2xpY2sgYnViYmxlcyB1cCB0byB3aW5kb3cgd2hlcmUgaXQgZGV0YWNoZXMgY2hvb3NlclxuICAgIH07XG5cbiAgICBjaG9vc2VyLm9ubW91c2VvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY2hvb3Nlci5zZWxlY3RlZEluZGV4ID0gLTE7XG4gICAgfTtcblxuICAgIGNob29zZXJQYXJlbnQgPSB0aGlzLmVsO1xuICAgIGNob29zZXJQYXJlbnQuYXBwZW5kQ2hpbGQoY2hvb3Nlcik7XG4gICAgdmFyIGxpbmsgPSBjaG9vc2VyUGFyZW50LnF1ZXJ5U2VsZWN0b3IoJy5maWx0ZXItdHJlZS1hZGQtZmlsdGVyJyksXG4gICAgICAgIGxpbmtXaWR0aCA9IGxpbmsuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGggLSAxOTtcbiAgICBpZiAoY2hvb3Nlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aCA8IGxpbmtXaWR0aCkge1xuICAgICAgICBjaG9vc2VyLnN0eWxlLndpZHRoID0gbGlua1dpZHRoICsgJ3B4JztcbiAgICB9XG4gICAgbGluay5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShjaG9vc2VyKS5iYWNrZ3JvdW5kQ29sb3I7XG59XG5cbmZ1bmN0aW9uIGRldGFjaENob29zZXIoKSB7XG4gICAgaWYgKGNob29zZXJQYXJlbnQpIHtcbiAgICAgICAgY2hvb3Nlci5zZWxlY3RlZEluZGV4ID0gLTE7XG4gICAgICAgIGNob29zZXJQYXJlbnQucXVlcnlTZWxlY3RvcignLmZpbHRlci10cmVlLWFkZC1maWx0ZXInKS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBudWxsO1xuICAgICAgICBjaG9vc2VyUGFyZW50LnJlbW92ZUNoaWxkKGNob29zZXIpO1xuICAgICAgICBjaG9vc2VyLm9uY2xpY2sgPSBjaG9vc2VyLm9ubW91c2VvdXQgPSBjaG9vc2VyUGFyZW50ID0gbnVsbDtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZGV0YWNoQ2hvb3Nlcik7XG4gICAgfVxufVxuXG53aW5kb3cuRmlsdGVyVHJlZSA9IEZpbHRlclRyZWU7XG4iLCIvKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdGVtcGxleCA9IHJlcXVpcmUoJ3RlbXBsZXgnKTtcblxudmFyIHRlbXBsYXRlcyA9IHtcblxudHJlZTogZnVuY3Rpb24oKSB7LypcbjxzcGFuIGNsYXNzPVwiZmlsdGVyLXRyZWVcIlwiPlxuICAgIE1hdGNoXG4gICAgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBjbGFzcz1cImZpbHRlci10cmVlLWNob29zZS1vcGVyYXRvclwiIG5hbWU9XCJ0cmVlT3B7MX1cIiB2YWx1ZT1cIm9wLW9yXCI+YW55PC9sYWJlbD5cbiAgICA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwiZmlsdGVyLXRyZWUtY2hvb3NlLW9wZXJhdG9yXCIgbmFtZT1cInRyZWVPcHsxfVwiIHZhbHVlPVwib3AtYW5kXCI+YWxsPC9sYWJlbD5cbiAgICA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwiZmlsdGVyLXRyZWUtY2hvb3NlLW9wZXJhdG9yXCIgbmFtZT1cInRyZWVPcHsxfVwiIHZhbHVlPVwib3Atbm9yXCI+bm9uZTwvbGFiZWw+XG4gICAgb2Y6PGJyLz5cbiAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlLWFkZC1maWx0ZXJcIiB0aXRsZT1cIkFkZCBhIG5ldyBjb25kaXRpb25hbCB0byB0aGlzIG1hdGNoLlwiPlxuICAgICAgICA8ZGl2PjwvZGl2PmNvbmRpdGlvbmFsXG4gICAgPC9zcGFuPlxuICAgIDxzcGFuIGNsYXNzPVwiZmlsdGVyLXRyZWUtYWRkXCIgdGl0bGU9XCJBZGQgYSBuZXcgc3VibWF0Y2ggdW5kZXIgdGhpcyBtYXRjaC5cIj5cbiAgICAgICAgPGRpdj48L2Rpdj5zdWJleHByZXNzaW9uXG4gICAgPC9zcGFuPlxuICAgIDxvbD48L29sPlxuPC9zcGFuPlxuKi99LFxuXG5yZW1vdmVCdXR0b246IGZ1bmN0aW9uKCkgey8qXG48ZGl2IGNsYXNzPVwiZmlsdGVyLXRyZWUtcmVtb3ZlXCIgdGl0bGU9XCJkZWxldGUgY29uZGl0aW9uYWxcIj48L2Rpdj5cbiovfVxuXG59O1xuXG5mdW5jdGlvbiBnZXRBbGwodGVtcGxhdGVOYW1lKSB7XG4gICAgdmFyIHRlbXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB2YXIgdGV4dCA9IHRlbXBsYXRlc1t0ZW1wbGF0ZU5hbWVdLnRvU3RyaW5nKCk7XG4gICAgdmFyIGJlZyA9IHRleHQuaW5kZXhPZignLyonKTtcbiAgICB2YXIgZW5kID0gdGV4dC5sYXN0SW5kZXhPZignKi8nKTtcbiAgICBpZiAoYmVnID09PSAtMSB8fCBlbmQgPT09IC0xKSB7XG4gICAgICAgIHRocm93ICdiYWQgdGVtcGxhdGUnO1xuICAgIH1cbiAgICBiZWcgKz0gMjtcbiAgICB0ZXh0ID0gdGV4dC5zdWJzdHIoYmVnLCBlbmQgLSBiZWcpO1xuICAgIHRleHQgPSB0ZW1wbGV4LmFwcGx5KHRoaXMsIFt0ZXh0XS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xuICAgIHRlbXAuaW5uZXJIVE1MID0gdGV4dDtcbiAgICByZXR1cm4gdGVtcC5jaGlsZHJlbjtcbn1cblxuZnVuY3Rpb24gZ2V0Rmlyc3QoKSB7XG4gICAgcmV0dXJuIGdldEFsbC5hcHBseSh0aGlzLCBhcmd1bWVudHMpWzBdO1xufVxuXG5nZXRGaXJzdC5nZXRBbGwgPSBnZXRBbGw7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0Rmlyc3Q7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgICdvcC1hbmQnOiB7IFNRTDogeyBvcDogJ0FORCcsIGJlZzogJygnLCBlbmQ6ICcpJyB9IH0sXG4gICAgJ29wLW9yJzogeyBTUUw6IHsgb3A6ICdPUicsIGJlZzogJygnLCBlbmQ6ICcpJyB9IH0sXG4gICAgJ29wLW5vcic6IHsgU1FMOiB7IG9wOiAnQU5EJywgYmVnOiAnTk9UICAoJywgZW5kOiAnKScgfSB9XG59O1xuIl19
