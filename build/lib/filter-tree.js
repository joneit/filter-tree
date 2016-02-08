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
/* object-iterators.js - Mini Underscore library
 * by Jonathan Eiten
 *
 * The methods below operate on objects (but not arrays) similarly
 * to Underscore (http://underscorejs.org/#collections).
 *
 * For more information:
 * https://github.com/joneit/object-iterators
 */

'use strict';

/**
 * @constructor
 * @summary Wrap an object for one method call.
 * @Desc Note that the `new` keyword is not necessary.
 * @param {object|null|undefined} object - `null` or `undefined` is treated as an empty plain object.
 * @return {Wrapper} The wrapped object.
 */
function Wrapper(object) {
    if (object instanceof Wrapper) {
        return object;
    }
    if (!(this instanceof Wrapper)) {
        return new Wrapper(object);
    }
    this.originalValue = object;
    this.o = object || {};
}

/**
 * @name Wrapper.chain
 * @summary Wrap an object for a chain of method calls.
 * @Desc Calls the constructor `Wrapper()` and modifies the wrapper for chaining.
 * @param {object} object
 * @return {Wrapper} The wrapped object.
 */
Wrapper.chain = function (object) {
    var wrapped = Wrapper(object); // eslint-disable-line new-cap
    wrapped.chaining = true;
    return wrapped;
};

Wrapper.prototype = {
    /**
     * Unwrap an object wrapped with {@link Wrapper.chain|Wrapper.chain()}.
     * @return {object|null|undefined} The value originally wrapped by the constructor.
     * @memberOf Wrapper.prototype
     */
    value: function () {
        return this.originalValue;
    },

    /**
     * @desc Mimics Underscore's [each](http://underscorejs.org/#each) method: Iterate over the members of the wrapped object, calling `iteratee()` with each.
     * @param {function} iteratee - For each member of the wrapped object, this function is called with three arguments: `(value, key, object)`. The return value of this function is undefined; an `.each` loop cannot be broken out of (use {@link Wrapper#find|.find} instead).
     * @param {object} [context] - If given, `iteratee` is bound to this object. In other words, this object becomes the `this` value in the calls to `iteratee`. (Otherwise, the `this` value will be the unwrapped object.)
     * @return {Wrapper} The wrapped object for chaining.
     * @memberOf Wrapper.prototype
     */
    each: function (iteratee, context) {
        var o = this.o;
        Object.keys(o).forEach(function (key) {
            iteratee.call(this, o[key], key, o);
        }, context || o);
        return this;
    },

    /**
     * @desc Mimics Underscore's [find](http://underscorejs.org/#find) method: Look through each member of the wrapped object, returning the first one that passes a truth test (`predicate`), or `undefined` if no value passes the test. The function returns the value of the first acceptable member, and doesn't necessarily traverse the entire object.
     * @param {function} predicate - For each member of the wrapped object, this function is called with three arguments: `(value, key, object)`. The return value of this function should be truthy if the member passes the test and falsy otherwise.
     * @param {object} [context] - If given, `predicate` is bound to this object. In other words, this object becomes the `this` value in the calls to `predicate`. (Otherwise, the `this` value will be the unwrapped object.)
     * @return {*} The found property's value, or undefined if not found.
     * @memberOf Wrapper.prototype
     */
    find: function (predicate, context) {
        var o = this.o;
        var result;
        if (o) {
            result = Object.keys(o).find(function (key) {
                return predicate.call(this, o[key], key, o);
            }, context || o);
            if (result !== undefined) {
                result = o[result];
            }
        }
        return result;
    },

    /**
     * @desc Mimics Underscore's [filter](http://underscorejs.org/#filter) method: Look through each member of the wrapped object, returning the values of all members that pass a truth test (`predicate`), or empty array if no value passes the test. The function always traverses the entire object.
     * @param {function} predicate - For each member of the wrapped object, this function is called with three arguments: `(value, key, object)`. The return value of this function should be truthy if the member passes the test and falsy otherwise.
     * @param {object} [context] - If given, `predicate` is bound to this object. In other words, this object becomes the `this` value in the calls to `predicate`. (Otherwise, the `this` value will be the unwrapped object.)
     * @return {*} An array containing the filtered values.
     * @memberOf Wrapper.prototype
     */
    filter: function (predicate, context) {
        var o = this.o;
        var result = [];
        if (o) {
            Object.keys(o).forEach(function (key) {
                if (predicate.call(this, o[key], key, o)) {
                    result.push(o[key]);
                }
            }, context || o);
        }
        return result;
    },

    /**
     * @desc Mimics Underscore's [map](http://underscorejs.org/#map) method: Produces a new array of values by mapping each value in list through a transformation function (`iteratee`). The function always traverses the entire object.
     * @param {function} iteratee - For each member of the wrapped object, this function is called with three arguments: `(value, key, object)`. The return value of this function is concatenated to the end of the new array.
     * @param {object} [context] - If given, `iteratee` is bound to this object. In other words, this object becomes the `this` value in the calls to `predicate`. (Otherwise, the `this` value will be the unwrapped object.)
     * @return {*} An array containing the filtered values.
     * @memberOf Wrapper.prototype
     */
    map: function (iteratee, context) {
        var o = this.o;
        var result = [];
        if (o) {
            Object.keys(o).forEach(function (key) {
                result.push(iteratee.call(this, o[key], key, o));
            }, context || o);
        }
        return result;
    },

    /**
     * @desc Mimics Underscore's [reduce](http://underscorejs.org/#reduce) method: Boil down the values of all the members of the wrapped object into a single value. `memo` is the initial state of the reduction, and each successive step of it should be returned by `iteratee()`.
     * @param {function} iteratee - For each member of the wrapped object, this function is called with four arguments: `(memo, value, key, object)`. The return value of this function becomes the new value of `memo` for the next iteration.
     * @param {*} [memo] - If no memo is passed to the initial invocation of reduce, the iteratee is not invoked on the first element of the list. The first element is instead passed as the memo in the invocation of the iteratee on the next element in the list.
     * @param {object} [context] - If given, `iteratee` is bound to this object. In other words, this object becomes the `this` value in the calls to `iteratee`. (Otherwise, the `this` value will be the unwrapped object.)
     * @return {*} The value of `memo` "reduced" as per `iteratee`.
     * @memberOf Wrapper.prototype
     */
    reduce: function (iteratee, memo, context) {
        var o = this.o;
        if (o) {
            Object.keys(o).forEach(function (key, idx) {
                memo = (!idx && memo === undefined) ? o[key] : iteratee(memo, o[key], key, o);
            }, context || o);
        }
        return memo;
    },

    /**
     * @desc Mimics Underscore's [extend](http://underscorejs.org/#extend) method: Copy all of the properties in each of the `source` object parameter(s) over to the (wrapped) destination object (thus mutating it). It's in-order, so the properties of the last `source` object will override properties with the same name in previous arguments or in the destination object.
     * > This method copies own members as well as members inherited from prototype chain.
     * @param {...object|null|undefined} source - Values of `null` or `undefined` are treated as empty plain objects.
     * @return {Wrapper|object} The wrapped destination object if chaining is in effect; otherwise the unwrapped destination object.
     * @memberOf Wrapper.prototype
     */
    extend: function (source) {
        var o = this.o;
        Array.prototype.slice.call(arguments).forEach(function (object) {
            if (object) {
                for (var key in object) {
                    o[key] = object[key];
                }
            }
        });
        return this.chaining ? this : o;
    },

    /**
     * @desc Mimics Underscore's [extendOwn](http://underscorejs.org/#extendOwn) method: Like {@link Wrapper#extend|extend}, but only copies its "own" properties over to the destination object.
     * @param {...object|null|undefined} source - Values of `null` or `undefined` are treated as empty plain objects.
     * @return {Wrapper|object} The wrapped destination object if chaining is in effect; otherwise the unwrapped destination object.
     * @memberOf Wrapper.prototype
     */
    extendOwn: function (source) {
        var o = this.o;
        Array.prototype.slice.call(arguments).forEach(function (object) {
            Wrapper(object).each(function (val, key) { // eslint-disable-line new-cap
                o[key] = val;
            });
        });
        return this.chaining ? this : o;
    }
};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) { // eslint-disable-line no-extend-native
        if (this === null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    };
}

module.exports = Wrapper;

},{}],4:[function(require,module,exports){
'use strict';

var // a regex search pattern that matches all the reserved chars of a regex search pattern
    reserved = /([\.\\\+\*\?\^\$\(\)\{\}\=\!\<\>\|\:\[\]])/g,

    // regex wildcard search patterns
    REGEXP_WILDCARD = '.*',
    REGEXP_WILDCHAR = '.',
    REGEXP_WILDCARD_MATCHER = '(' + REGEXP_WILDCARD + ')',

    // LIKE search patterns
    LIKE_WILDCHAR = '_',
    LIKE_WILDCARD = '%',

    // regex search patterns that match LIKE search patterns
    REGEXP_LIKE_PATTERN_MATCHER = new RegExp('(' + [
        LIKE_WILDCHAR,
        LIKE_WILDCARD,
        '\\[\\^?[^-\\]]+]', // matches a LIKE set (same syntax as a RegExp set)
        '\\[\\^?[^-\\]]\\-[^\\]]]' // matches a LIKE range (same syntax as a RegExp range)
    ].join('|') + ')', 'g');

function regExpLIKE(pattern, ignoreCase) {
    var i, parts;

    // Find all LIKE patterns
    parts = pattern.match(REGEXP_LIKE_PATTERN_MATCHER);

    if (parts) {
        // Translate found LIKE patterns to regex patterns, escaped intervening non-patterns, and interleave the two

        for (i = 0; i < parts.length; ++i) {
            // Escape left brackets (unpaired right brackets are OK)
            if (parts[i][0] === '[') {
                parts[i] = regExpLIKE.reserve(parts[i]);
            }

            // Make each found pattern matchable by enclosing in parentheses
            parts[i] = '(' + parts[i] + ')';
        }

        // Match these precise patterns again with their intervening non-patterns (i.e., text)
        parts = pattern.match(new RegExp(
            REGEXP_WILDCARD_MATCHER +
            parts.join(REGEXP_WILDCARD_MATCHER)  +
            REGEXP_WILDCARD_MATCHER
        ));

        // Discard first match of non-global search (which is the whole string)
        parts.shift();

        // For each re-found pattern part, translate % and _ to regex equivalent
        for (i = 1; i < parts.length; i += 2) {
            var part = parts[i];
            switch (part) {
                case LIKE_WILDCARD: part = REGEXP_WILDCARD; break;
                case LIKE_WILDCHAR: part = REGEXP_WILDCHAR; break;
                default:
                    var j = part[1] === '^' ? 2 : 1;
                    part = '[' + regExpLIKE.reserve(part.substr(j, part.length - (j + 1))) + ']';
            }
            parts[i] = part;
        }
    } else {
        parts = [pattern];
    }

    // For each surrounding text part, escape reserved regex chars
    for (i = 0; i < parts.length; i += 2) {
        parts[i] = regExpLIKE.reserve(parts[i]);
    }

    // Join all the interleaved parts
    parts = parts.join('');

    // Optimize or anchor the pattern at each end as needed
    if (parts.substr(0, 2) === REGEXP_WILDCARD) { parts = parts.substr(2); } else { parts = '^' + parts; }
    if (parts.substr(-2, 2) === REGEXP_WILDCARD) { parts = parts.substr(0, parts.length - 2); } else { parts += '$'; }

    // Return the new regex
    return new RegExp(parts, ignoreCase ? 'i' : undefined);
}

regExpLIKE.reserve = function (s) {
    return s.replace(reserved, '\\$1');
};

var cache, size;

/**
 * @summary Delete a pattern from the cache; or clear the whole cache.
 * @param {string} [pattern] - The LIKE pattern to remove from the cache. Fails silently if not found in the cache. If pattern omitted, clears whole cache.
 */
(regExpLIKE.clearCache = function (pattern) {
    if (!pattern) {
        cache = {};
        size = 0;
    } else if (cache[pattern]) {
        delete cache[pattern];
        size--;
    }
    return size;
})(); // init the cache

regExpLIKE.getCacheSize = function () { return size; };

/**
 * @summary Cached version of `regExpLIKE()`.
 * @desc Cached entries are subject to garbage collection if `keep` is `undefined` or `false` on insertion or `false` on most recent reference. Garbage collection will occur iff `regExpLIKE.cacheMax` is defined and it equals the number of cached patterns. The garbage collector sorts the patterns based on most recent reference; the oldest 10% of the entries are deleted. Alternatively, you can manage the cache yourself to a limited extent (see {@link regeExpLIKE.clearCache|clearCache}).
 * @param pattern - the LIKE pattern (to be) converted to a RegExp
 * @param [keep] - If given, changes the keep status for this pattern as follows:
 * * `true` permanently caches the pattern (not subject to garbage collection) until `false` is given on a subsequent call
 * * `false` allows garbage collection on the cached pattern
 * * `undefined` no change to keep status
 * @returns {RegExp}
 */
regExpLIKE.cached = function (keep, pattern, ignoreCase) {
    if (typeof keep === 'string') {
        ignoreCase = pattern;
        pattern = keep;
        keep = false;
    }
    var patternAndCase = pattern + (ignoreCase ? 'i' : 'c'),
        item = cache[patternAndCase];
    if (item) {
        item.when = new Date().getTime();
        if (keep !== undefined) {
            item.keep = keep;
        }
    } else {
        if (size === regExpLIKE.cacheMax) {
            var age = [], ages = 0, key, i;
            for (key in cache) {
                item = cache[key];
                if (!item.keep) {
                    for (i = 0; i < ages; ++i) {
                        if (item.when < age[i].item.when) {
                            break;
                        }
                    }
                    age.splice(i, 0, { key: key, item: item });
                    ages++;
                }
            }
            if (!age.length) {
                return regExpLIKE(pattern, ignoreCase); // cache is full!
            }
            i = Math.ceil(age.length / 10); // will always be at least 1
            size -= i;
            while (i--) {
                delete cache[age[i].key];
            }
        }
        item = cache[patternAndCase] = {
            regex: regExpLIKE(pattern, ignoreCase),
            keep: keep,
            when: new Date().getTime()
        };
        size++;
    }
    return item.regex;
};

module.exports = regExpLIKE;

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
// Created by Jonathan Eiten on 1/7/16.

'use strict';


/**
 * @summary Walk a hierarchical object as JSON.stringify does but without serializing.
 *
 * @desc Usage:
 * * var myDistilledObject = unstrungify.call(myObject);
 * * var myDistilledObject = myApi.getState(); // where myApi.prototype.getState = unstrungify
 *
 * Result equivalent to `JSON.parse(JSON.stringify(this))`.
 *
 * > Do not use this function to get a JSON string; use `JSON.stringify(this)` instead.
 *
 * @this {*|object|*[]} - Object to walk; typically an object or array.
 *
 * @param {boolean} [options.preserve=false] - Preserve undefined array elements as `null`s.
 * Use this when precise index matters (not merely the order of the elements).
 *
 * @returns {object} - Distilled object.
 */
function unstrungify(options) {
    var clone, value,
        object = (typeof this.toJSON === 'function') ? this.toJSON() : this,
        preserve = options && options.preserve;

    if (unstrungify.isArray(object)) {
        clone = [];
        object.forEach(function(obj) {
            value = unstrungify.call(obj);
            if (value !== undefined) {
                clone.push(value);
            } else if (preserve) {
                clone.push(null); // undefined not a valid JSON value
            }
        });
    } else  if (typeof object === 'object') {
        clone = {};
        Object.keys(object).forEach(function(key) {
            value = unstrungify.call(object[key]);
            if (value !== undefined) {
                clone[key] = value;
            }
        });
    } else {
        clone = object;
    }

    return clone;
}

/**
 * Very fast array test.
 * For cross-frame scripting; use `crossFramesIsArray` instead.
 * @param {*} arr - The object to test.
 * @returns {boolean}
 */
function isArray(arr) { return arr.constructor === Array; }
unstrungify.isArray = isArray;

var toString = Object.prototype.toString, arrString = '[object Array]';

/**
 * Very slow array test. Suitable for cross-frame scripting.
 *
 * Suggestion: If you need this and have jQuery loaded, use `jQuery.isArray` instead which is reasonably fast.
 *
 * @param {*} arr - The object to test.
 * @returns {boolean}
 */
function crossFramesIsArray(arr) { return toString.call(arr) === arrString; } // eslint-disable-line no-unused-vars

module.exports = unstrungify;

},{}],7:[function(require,module,exports){
/* eslint-env browser */

// This is the main file, usable as is, such as by /test/index.js.
// For npm: require this file
// For CDN: gulpfile.js browserifies this file with sourcemap to /build/filter-tree.js and uglified without sourcemap to /build/filter-tree.min.js. The CDN is https://joneit.github.io/filter-tree.

'use strict';

var unstrungify = require('unstrungify');

var cssInjector = require('./js/css');
var FilterNode = require('./js/FilterNode');
var TerminalNode = require('./js/FilterLeaf');
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

        if (options && options.editors) {
            this.editors = options.editors;
        }
    },

    destroy: function() {
        detachChooser.call(this);
    },

    editors: {
        Default: TerminalNode
    },

    addEditor: function(key, overrides) {
        if (overrides) {
            this.editors[key] = TerminalNode.extend(overrides);
        } else {
            delete this.editors[key];
        }
    },

    createView: function() {
        this.el = template(this.isColumnFilters ? 'columnFilters' : 'tree', ++ordinal);
        this.el.addEventListener('click', catchClick.bind(this));
    },

    loadState: function() {
        var state = this.state;

        this.operator = 'op-and';
        this.children = [];

        if (!state) {
            this.add();
        } else {
            throwIfJSON(state);

            // Validate `state.children` (required)
            if (!(state.children instanceof Array && state.children.length)) {
                throw FilterNode.Error('Expected `children` property to be a non-empty array.');
            }

            // Validate `state.operator` (if given)
            if (state.operator) {
                if (!operators[state.operator]) {
                    throw FilterNode.Error('Expected `operator` property to be one of: ' + Object.keys(operators));
                }

                this.operator = state.operator;
            }

            state.children.forEach(this.add.bind(this));
        }
    },

    render: function() {
        // simulate click on the operator to display strike-through and operator between filters
        var radioButton = this.el.querySelector('input[value=' + this.operator + ']'),
            addFilterLink = this.el.querySelector('.filter-tree-add-filter');

        if (radioButton) {
            radioButton.checked = true;
            this['filter-tree-op-choice']({
                target: radioButton
            });
        }

        // when multiple filter editors available, simulate click on the new "add conditional" link
        if (addFilterLink && !this.children.length && Object.keys(this.editors).length > 1) {
            this['filter-tree-add-filter']({
                target: addFilterLink
            });
        }

        // proceed with render
        FilterNode.prototype.render.call(this);
    },

    /**
     * Creates a new node as per `state`.
     * @param {object} [state]
     * * If `state` has a `children` property, will attempt to add a new subtree.
     * * If `state` has an `editor` property, will create one (`this.editors[state.editor]`).
     * * If `state` has neither (or was omitted), will create a new default editor (`this.editors.Default`).
     */
    add: function(state) {
        var Constructor;

        if (state && state.children) {
            Constructor = FilterTree;
        } else if (state && state.editor) {
            Constructor = this.editors[state.editor];
        } else {
            Constructor = this.editors.Default;
        }

        this.children.push(new Constructor({
            state: state,
            parent: this
        }));
    },

    /**
     * Search the expression tree for a node with certain characteristics as described by the type of search (`type`) and the search args.
     * @param {string} [type='find'] - Name of method to use on terminal nodes; characterizes the type of search. Must exist in your terminal node object.
     * @param {boolean} [deep=false] - Must be explicit `true` or `false` (not merely truthy or falsy); or omitted.
     * @param {*} firstSearchArg - May not be boolean type (accommodation to overload logic).
     * @param {...*} [additionalSearchArgs]
     * @returns {boolean|FilterLeaf|FilterTree}
     * * `false` - Not found. (`true` is never returned.)
     * * `FilterLeaf` (or instance of an object extended from same) - Sought node (typical).
     * * 'FilterTree` - Sought node (rare).
     */
    find: function find(type, deep) {
        var result, n, treeArgs = arguments, leafArgs;

        if (arguments.length > 1 && typeof type === 'string') {
            n = 1;
        } else {
            n = 0;
            deep = type;
            type = 'find';
        }

        if (typeof deep === 'boolean') {
            n += 1;
        } else {
            deep = false;
        }

        leafArgs = Array.prototype.slice.call(arguments, n);

        // TODO: Following could be broken out into separate method (like FilterLeaf)
        if (type === 'findByEl' && this.el === leafArgs[0]) {
            return this;
        }

        // walk tree recursively, ending on defined `result` (first node found)
        return this.children.find(function(child) {
            if (child) { // only recurse on undead children
                if (child instanceof TerminalNode) {
                    // always recurse on terminal nodes
                    result = child[type].apply(child, leafArgs);
                } else if (deep && child.children.length) {
                    // only recurse on subtrees if going `deep` and not childless
                    result = find.apply(child, treeArgs);
                }
                return result; // truthiness aborts find loop if set above
            }

            return false; // keep going // TODO: Couldn't this just be "return result" making the return above unnecessary?
        });
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
        if (Object.keys(this.editors).length === 1) {
            this.add();
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
        this.remove(evt.target.nextElementSibling, true);
    },

    /** Removes a child node and it's .el; or vice-versa
     * @param {Element|FilterNode} node
     */
    remove: function(node, deep) {
        if (node instanceof Element) {
            node = this.find('findByEl', !!deep, node);
        }

        delete this.children[this.children.indexOf(node)];

        node.el.parentElement.remove(node.el);
    },

    /**
     * @param {boolean} [object.rethrow=false] - Catch (do not throw) the error.
     * @param {boolean} [object.alert=true] - Announce error via window.alert() before returning.
     * @param {boolean} [object.focus=true] - Place the focus on the offending control and give it error color.
     * @returns {undefined|string} `undefined` means valid or string containing error message.
     */
    validate: function(options) {
        options = options || {};

        var alert = options.alert === undefined || options.alert,
            rethrow = options.rethrow === true,
            result;

        try {
            validate.call(this, options);
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
                if (child instanceof TerminalNode) {
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

    setJSON: function(json) {
        this.setState(JSON.parse(json));
    },

    getState: unstrungify,

    getJSON: function() {
        var ready = JSON.stringify(this, null, this.JSONspace);
        return ready ? ready : '';
    },

    toJSON: function toJSON() {
        var state = {
            operator: this.operator,
            children: []
        };

        this.children.forEach(function(child) {
            if (child) {
                if (child instanceof TerminalNode) {
                    state.children.push(child);
                } else if (child.children.length) {
                    var ready = toJSON.call(child);
                    if (child.isColumnFilters) {
                        ready.isColumnFilters = true;
                    }
                    if (child.fields !== child.parent.fields) {
                        ready.fields = child.fields;
                    }
                    if (ready) {
                        state.children.push(ready);
                    }
                }
            }
        });

        var metadata = FilterNode.prototype.toJSON.call(this);
        Object.keys(metadata).forEach(function(key) {
            state[key] = metadata[key];
        });

        return state.children.length ? state : undefined;
    },

    getSqlWhereClause: function getSqlWhereClause() {
        var lexeme = operators[this.operator].SQL,
            where = '';

        this.children.forEach(function(child, idx) {
            var op = idx ? ' ' + lexeme.op + ' ' : '';
            if (child) {
                if (child instanceof TerminalNode) {
                    where += op + child.getSqlWhereClause();
                } else if (child.children.length) {
                    where += op + getSqlWhereClause.call(child);
                }
            }
        });

        if (!where) {
            where = 'NULL IS NULL';
        }

        return lexeme.beg + where + lexeme.end;
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
function validate(options) { // must be called with context
    if (this instanceof FilterTree && !this.children.length) {
        throw new FilterNode.Error('Empty subexpression (no filters).');
    }

    this.children.forEach(function(child) {
        if (child instanceof TerminalNode) {
            child.validate(options);
        } else if (child.children.length) {
            validate.call(child, options);
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

window.FilterTree = FilterTree;

},{"./js/FilterLeaf":8,"./js/FilterNode":9,"./js/css":11,"./js/template":12,"./js/tree-operators":13,"unstrungify":6}],8:[function(require,module,exports){
/* eslint-env browser */
/* eslint-disable key-spacing */

'use strict';

var FilterNode = require('./FilterNode');
var template = require('./template');
var conditionals = require('./conditionals');


/** @typedef {object} converter
 * @property {function} to - Returns input value converted to type. Fails silently.
 * @property {function} not - Tests input value against type, returning `false if type or `true` if not type.
 */
/** @type {converter} */
var numberConverter = { to: Number, not: isNaN };

/** @type {converter} */
var dateConverter = { to: function(s) { return new Date(s); }, not: isNaN };

/** @constructor
 * @summary A terminal node in a filter tree, representing a conditional expression.
 * @desc Also known as a "filter."
 */
var FilterLeaf = FilterNode.extend('FilterLeaf', {

    name: 'Compare a column to a value',

    postInitialize: function() {
        var el = this.view.column;
        if (!el.value) {
            // For empty (i.e., new) controls, simulate a click a beat after rendering
            setTimeout(function() { FilterNode.clickIn(el); }, 700);
        }
    },

    destroy: function() {
        if (this.view) {
            for (var key in this.view) {
                this.view[key].removeEventListener('change', this.onChange);
            }
        }
    },

    /** @summary Create a new view in `this.view`.
     * @desc This new "view" is a group of HTML `Element` controls that completely describe the conditional expression this object represents. This method creates the following object properties:
     *
     * * `this.el` - a `<span>...</span>` element to contain the controls as child nodes
     * * `this.view` - a hash containing direct references to the controls.
     *
     * The view for this base `FilterLeaf` object consists of the following controls:
     *
     * * `this.view.column` - A drop-down with options from `this.fields`. Value is the name of the column being tested (i.e., the column to which this conditional expression applies).
     * * `this.view.operator` - A drop-down with options from {@link leafOperators}. Value is one of the keys therein.
     * * `this.view.literal` - A text box.
     *
     *  > Prototypes extended from `FilterLeaf` may have different controls as needed. The only required control is `column`, which all such "editors" must support.
     */
    createView: function() {
        var fields = this.parent.nodeFields || this.fields;

        if (!fields) {
            throw FilterNode.Error('Terminal node requires a fields list.');
        }

        var root = this.el = document.createElement('span');
        root.className = 'filter-tree-editor filter-tree-default';

        this.view = {
            column: this.makeElement(root, fields, 'column', true),
            operator: this.makeElement(root, this.operatorOptions, 'operator'),
            literal: this.makeElement(root)
        };

        root.appendChild(document.createElement('br'));
    },

    /** @typedef {object} valueOption
     * You should supply both `name` and `alias` but you could omit one or the other and whichever you provide will be used for both. (In such case you might as well just give a string for {@link fieldOption} rather than this object.)
     * @property {string} [name]
     * @property {string} [alias]
     * @property {string} [type] One of the keys of `this.converters`. If not one of these (including `undefined`), field values will be tested with a string comparison.
     * @property {boolean} [hidden=false]
     */
    /** @typedef {object} optionGroup
     * @property {string} label
     * @property {fieldOption[]} options
     */
    /** @typedef {string|valueOption|optionGroup} fieldOption
     * The three possible types specify either an `<option>....</option>` element or an `<optgroup>....</optgroup>` element as follows:
     * * `string` - specifies only the text of an `<option>....</option>` element (the value naturally defaults to the text)
     * * {@link valueOption} - specifies both the text (`.name`) and the value (`.alias`) of an `<option....</option>` element
     * * {@link optionGroup} - specifies an `<optgroup>....</optgroup>` element
     */
    /**
     * @summary HTML form controls factory.
     * @desc Creates and appends a text box or a drop-down.
     * @returns The new element.
     * @param {Element} container - An element to which to append the new element.
     * @param {fieldOption[]} [options] - Overloads:
     * * If omitted, will create an `<input/>` (text box) element.
     * * If contains only a single option, will create a `<span>...</span>` element containing the string and a `<input type=hidden>` containing the value.
     * * Otherwise, creates a `<select>...</select>` element with these options.
     * @param {null|string} [prompt=''] - Adds an initial `<option>...</option>` element to the drop-down with this value, parenthesized, as its `text`; and empty string as its `value`. Omitting creates a blank prompt; `null` suppresses.
     */
    makeElement: function(container, options, prompt, sort) {
        var el, option, hidden,
            tagName = options ? 'select' : 'input';

        if (options && options.length === 1) {
            // hard text when there would be only 1 option in the dropdown
            option = options[0];

            hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.value = option.name || option.alias || option;

            el = document.createElement('span');
            el.innerHTML = option.alias || option.name || option;
            el.appendChild(hidden);
        } else {
            el = addOptions(tagName, options, prompt, sort);
            if (el.type === 'text' && this.eventHandler) {
                this.el.addEventListener('keyup', this.eventHandler);
            }
            this.el.addEventListener('change', this.onChange = this.onChange || cleanUpAndMoveOn.bind(this));
            FilterNode.setWarningClass(el);
        }

        container.appendChild(el);

        return el;
    },

    loadState: function() {
        var state = this.state;

        if (state) {
            var value, el, i, b, selected, notes = [];
            for (var key in state) {
                if (!FilterNode.optionsSchema[key]) {
                    value = state[key];
                    el = this.view[key];
                    switch (el.type) {
                        case 'checkbox':
                        case 'radio':
                            el = document.querySelectorAll('input[name=\'' + el.name + '\']');
                            for (i = 0; i < el.length; i++) {
                                el[i].checked = value.indexOf(el[i].value) >= 0;
                            }
                            break;
                        case 'select-multiple':
                            el = el.options;
                            for (i = 0, b = false; i < el.length; i++, b = b || selected) {
                                selected = value.indexOf(el[i].value) >= 0;
                                el[i].selected = selected;
                            }
                            FilterNode.setWarningClass(el, b);
                            break;
                        default:
                            el.value = value;
                            if (!FilterNode.setWarningClass(el) && el.value !== value) {
                                notes.push({ key: key, value: value });
                            }
                    }
                }
            }
            if (notes.length) {
                var multiple = notes.length > 1,
                    footnotes = template(multiple ? 'notes' : 'note'),
                    inner = footnotes.lastElementChild;
                notes.forEach(function(note) {
                    var footnote = multiple ? document.createElement('li') : inner;
                    note = template('optionMissing', note.key, note.value);
                    while (note.length) { footnote.appendChild(note[0]); }
                    if (multiple) { inner.appendChild(footnote); }
                });
                el.parentNode.replaceChild(footnotes, el.parentNode.lastElementChild);
            }
        }
    },

    /**
     * @property {converter} number
     * @property {converter} date
     */
    converters: {
        number: numberConverter,
        int: numberConverter, // pseudo-type: really just a Number
        float: numberConverter, // pseudo-type: really just a Number
        date: dateConverter
    },

    /**
     * Throws error if invalid expression.
     * Caught by {@link FilterTree#validate|FilterTree.prototype.validate()}.
     *
     * Also performs the following compilation actions:
     * * Copies all `this.view`' values from the DOM to similarly named properties of `this`.
     * * Pre-sets `this.op` and `this.converter` for use in `test`'s tree walk.
     *
     * @param {boolean} [options.focus=false] - Move focus to offending control.
     * @returns {undefined} if valid
     */
    validate: function(options) {
        var elementName, fields, field;

        for (elementName in this.view) {
            var el = this.view[elementName],
                value = controlValue(el).trim();

            if (value === '') {
                var focus = options && options.focus;
                if (focus || focus === undefined) { clickIn(el); }
                throw new FilterNode.Error('Blank ' + elementName + ' control.\nComplete the filter or delete it.');
            } else {
                // Copy each controls's value as a new similarly named property of this object.
                this[elementName] = value;
            }
        }

        this.op = conditionals.operators[this.operator];

        this.converter = undefined; // remains undefined when neither operator nor column is typed
        if (this.op.type) {
            this.converter = this.converters[this.op.type];
        } else {
            for (elementName in this.view) {
                if (/^column/.test(elementName)) {
                    fields = this.parent.nodeFields || this.fields;
                    field = findField(fields, this[elementName]);
                    if (field && field.type) {
                        this.converter = this.converters[field.type];
                    }
                }
            }
        }
    },

    p: function(dataRow) { return dataRow[this.column]; },
    q: function() { return this.literal; },

    test: function(dataRow) {
        var p, q, // untyped versions of args
            P, Q, // typed versions of p and q
            convert;

        return (p = this.p(dataRow)) === undefined || (q = this.q(dataRow)) === undefined
            ? false
            : (
                (convert = this.converter) &&
                !convert.not(P = convert.to(p)) &&
                !convert.not(Q = convert.to(q))
            )
                ? this.op.test(P, Q)
                : this.op.test(p, q);
    },

    /** Tests this leaf node for given column name.
     * > This is the default "find" function.
     * @param {string} fieldName
     * @returns {boolean}
     */
    find: function(fieldName) {
        return this.column === fieldName;
    },

    /** Tests this leaf node for given column `Element` ownership.
     * @param {function} Editor (leaf constructor)
     * @returns {boolean}
     */
    findByEl: function(el) {
        return this.el === el;
    },

    toJSON: function() {
        var state = {};
        if (this.editor) {
            state.editor = this.editor;
        }
        for (var key in this.view) {
            state[key] = this[key];
        }
        if (!this.parent.nodeFields && this.fields !== this.parent.fields) {
            state.fields = this.fields;
        }
        return state;
    },

    getSqlWhereClause: function() {
        return this.op.sql(this.column, this.literal);
    }
});

function findField(fields, name) {
    var complex, simple;

    simple = fields.find(function(field) {
        if ((field.options || field) instanceof Array) {
            return (complex = findField(field.options || field, name));
        } else {
            return field.name === name;
        }
    });

    return complex || simple;
}

/** `change` or `click` event handler for all form controls.
 * Removes error CSS class from control.
 * Adds warning CSS class from control if blank; removes if not blank.
 * Moves focus to next non-blank sibling control.
 */
function cleanUpAndMoveOn(evt) {
    var el = evt.target;

    // remove `error` CSS class, which may have been added by `FilterLeaf.prototype.validate`
    el.classList.remove('filter-tree-error');

    // set or remove 'warning' CSS class, as per el.value
    FilterNode.setWarningClass(el);

    if (el.value) {
        // find next sibling control, if any
        if (!el.multiple) {
            while ((el = el.nextElementSibling) && (!('name' in el) || el.value.trim() !== '')); // eslint-disable-line curly
        }

        // and click in it (opens select list)
        if (el && el.value.trim() === '') {
            el.value = ''; // rid of any white space
            FilterNode.clickIn(el);
        }
    }

    if (this.eventHandler) {
        this.eventHandler(evt);
    }
}

function clickIn(el) {
    setTimeout(function() {
        el.classList.add('filter-tree-error');
        FilterNode.clickIn(el);
    }, 0);
}

function controlValue(el) {
    var value, i;

    switch (el.type) {
        case 'checkbox':
        case 'radio':
            el = document.querySelectorAll('input[name=\'' + el.name + '\']:enabled:checked');
            for (value = [], i = 0; i < el.length; i++) {
                value.push(el[i].value);
            }
            break;

        case 'select-multiple':
            el = el.options;
            for (value = [], i = 0; i < el.length; i++) {
                if (!el.disabled && el.selected) {
                    value.push(el[i].value);
                }
            }
            break;

        default:
            value = el.value;
    }

    return value;
}

/**
 * @summary Creates a new element and adds options to it.
 * @param {string} tagName - Must be one of:
 * * `'input'` for a text box
 * * `'select'` for a drop-down
 * * `'optgroup'` (for internal use only)
 * @param {fieldOption[]} [options] - Strings to add as `<option>...</option>` elements. Omit to create a text box.
 * @param {null|string} [prompt=''] - Adds an initial `<option>...</option>` element to the drop-down with this value in parentheses as its `text`; and empty string as its `value`. Default is empty string, which creates a blank prompt; `null` suppresses prompt altogether.
 * @returns {Element} Either a `<select>` or `<optgroup>` element.
 */
function addOptions(tagName, options, prompt, sort) {
    var el = document.createElement(tagName);

    if (options) {
        var add, newOption;
        if (tagName === 'select') {
            add = el.add;
            if (prompt) {
                newOption = new Option('(' + prompt, '');
                newOption.innerHTML += '&hellip;)';
                el.add(newOption);
            } else if (prompt !== null) {
                el.add(new Option());
            }
        } else {
            add = el.appendChild;
            el.label = prompt;
        }

        if (sort) {
            options = options.slice().sort(fieldComparator); // clone it and sort the clone
        }

        options.forEach(function(option) {
            if ((option.options || option) instanceof Array) {
                var optgroup = addOptions('optgroup', option.options || option, option.label);
                el.add(optgroup);
            } else {
                var newElement = typeof option !== 'object'
                    ? new Option(option)
                    : new Option(
                        option.alias || option.name,
                        option.name || option.alias
                    );
                add.call(el, newElement);
            }
        });
    } else {
        el.type = 'text';
    }

    return el;
}

function fieldComparator(a, b) {
    a = a.alias || a.name || a.label || a;
    b = b.alias || b.name || b.label || b;
    return a < b ? -1 : a > b ? 1 : 0;
}

module.exports = FilterLeaf;

},{"./FilterNode":9,"./conditionals":10,"./template":12}],9:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var extend = require('extend-me');
var _ = require('object-iterators');
var Base = extend.Base;

var template = require('./template');
var conditionals = require('./conditionals');

extend.debug = true;

var CHILDREN_TAG = 'OL',
    CHILD_TAG = 'LI';

/**
 * @constructor
 *
 * @description A filter tree represents a _complex conditional expression_ and consists of a single `FilterNode` object serving as the _root_ of an _n_-ary tree.
 *
 * Each `FilterNode` represents a node in tree. Each node is one of two types of objects extended from `FilterNode`:
 *
 * * The non-terminal (@link FilterTree} nodes represent _complex subexpressions_, each consisting of two or more _conditional_ (boolean expressions), all concatenated together with one of the _tree operators_.
 * * The terminal {@link FilterLeaf} nodes represent _simple expressions_.
 *
 * Tree operators currently include **_AND_** (labeled "all" in the UI; and "op-and" internally), **_OR_** ("any"; "op-or"), and **_NOR_** ("none"; "op-nor").
 *
 * Each conditional in a _subexpression_ (non-terminal node) is represented by a child node which may be either a _simple expression_ (terminal node) or another ("nested") subexpression non-terminal node.
 *
 * The `FilterLeaf` object is the default type of simple expression, which is in the form _field-property operator-property argument-property_ where:
 *
 * * _field-property_ - the name of a column, selected from a drop-down;
 * * _operator-property_ - an equality (=), inequality (<, ≤, ≠, ≥, >), or pattern operator (LIKE, NOT LIKE), also selected from a drop-down; and
 * * _argument-property_ is a constant typed into a text box.
 *
 * The `FilterTree` object has polymorphic methods that operate on the entire tree using recursion. When the recursion reaches a terminal node, it calls the methods on the `FilterLeaf` object instead. Calling `test()` on the root tree therefore returns a boolean that determines if the row passes through the entire filter expression (`true`) or is blocked by it (`false`).
 *
 * The programmer may define a new type of simple expression by extending from `FilterLeaf`. An example is the `FilterField` object. Such an implementation must include methods:
 *
 * * Save and subsequently reload the state of the conditional as entered by the user (`toJSON()` and `setState()`, respectively).
 * * Create the DOM objects that represent the UI filter editor and render them to the UI (`createView()` and `render()`, respectively).
 * * Filter a table by implementing one or more of the following:
 *   * Apply the conditional logic to available table row data (`test()`).
 *   * Apply the conditional logic to a remote data-store by generating a **SQL** or **Q** _WHERE_ clause (`toSQL()` and `toQ()`, respectively).
 *
 * Some of the above-named methods as already implemented in `FilterLeaf` and/or `FilterNode` may be sufficient to handle your needs as is (without further code).
 *
 * @param {string[]} [options.fields] - A default list of column names for field drop-downs of all descendant terminal nodes. Overrides `options.state.fields` (see). May be defined for any node and pertains to all descendants of that node (including terminal nodes). If omitted (and no `nodeFields`), will use the nearest ancestor `fields` definition. However, descendants with their own definition of `types` will override any ancestor definition.
 *
 * > Typically only used by the caller for the top-level (root) tree.
 *
 * @param {string[]} [options.nodeFields] - A default list of column names for field drop-downs of immediate descendant terminal nodes _only_. Overrides `options.state.nodeFields` (see).
 *
 * Although both `options.fields` and `options.nodeFields` are notated as optional herein, by the time a terminal node tries to render a fields drop-down, a `fields` list _must_ be defined through (in order of priority):
 *
 * * Terminal node's own `options.fields` (or `options.state.fields`) definition.
 * * Terminal node's parent node's `option.nodeFields` (or `option.state.nodesFields`) definition.
 * * Any of terminal node's ancestor's `options.fields` (or `options.state.fields`) definition.
 *
 * @param {object} [options.state] - A data structure that describes a tree, subtree, or leaf:
 *
 * * May describe a terminal node with properties:
 *   * `fields` - Overridden on instantiation by `options.fields`. If both unspecified, uses parent's definition.
 *   * `editor` - A string identifying the type of conditional. Must be in the tree's (see {@link FilterTree#editors|editors}) hash. If omitted, defaults to `'Default'`.
 *   * misc. - Other properties peculiar to this filter type (but typically including at least a `field` property).
 * * May describe a non-terminal node with properties:
 *   * `fields` - Overridden on instantiation by `options.fields`. If both unspecified, uses parent's definition.
 *   * `operator` - One of {@link treeOperators}.
 *   * `children` -  Array containing additional terminal and non-terminal nodes.
 *
 * If this `options.state` object is omitted altogether, loads an empty filter, which is a `FilterTree` node consisting the default `operator` value (`'op-and'`).
 *
 * > Note that this is a JSON object; not a JSON string (_i.e.,_ "parsed"; not "stringified").
 *
 * @param {function} [options.editor='Default'] - Type of simple expression.
 *
 * @param {FilterTree} [options.parent] - Used internally to insert element when creating nested subtrees. For the top level tree, you don't give a value for `parent`; you are responsible for inserting the top-level `.el` into the DOM.
 */
var FilterNode = Base.extend({

    initialize: function(options) {
        var self = this,
            parent = options && options.parent,
            state = options && (
                options.state ||
                options.json && JSON.parse(options.json)
            );

        this.parent = parent;

        // create each option standard option from options, state, or parent
        _(FilterNode.optionsSchema).each(function(schema, key) {
            var option = options && options[key] ||
                state && state[key] ||
                !schema.own && (
                    parent && parent[key] || // reference parent value now so we don't have to search up the tree later
                    schema.default
                );


            if (option) {
                self[key] = option;
            }
        });

        // transform conditionals with '@' as first char to reference to group of name
        this.operatorOptions.forEach(function(option, index) {
            if (typeof option === 'string' && option[0] === '@') {
                self.operatorOptions[index] = conditionals.groups[option.substr(1)];
            }
        });

        this.setState(state);
    },

    /** Insert each subtree into its parent node along with a "delete" button.
     * > The root tree is has no parent and is inserted into the DOM by the instantiating code (without a delete button).
     */
    render: function() {
        if (this.parent) {
            var newListItem = document.createElement(CHILD_TAG);

            if (!(this.state && this.state.locked)) {
                newListItem.appendChild(template('removeButton'));
            }

            newListItem.appendChild(this.el);
            this.parent.el.querySelector(CHILDREN_TAG).appendChild(newListItem);
        }
    },

    setState: function(state) {
        var oldEl = this.el;
        this.state = state;
        this.createView();
        this.loadState();
        this.render();
        if (oldEl && !this.parent) {
            oldEl.parentNode.replaceChild(this.el, oldEl);
        }
    },

    toJSON: function toJSON() {
        var state = {};

        if (this.toJsonOptions) {
            var tree = this, metadata = [];
            if (this.toJsonOptions.fields) {
                metadata.push('fields');
                metadata.push('nodeFields');
            }
            if (this.toJsonOptions.editor) {
                metadata.push('editor');
            }
            metadata.forEach(function(prop) {
                if (!tree.parent || tree[prop] && tree[prop] !== tree.parent[prop]) {
                    state[prop] = tree[prop];
                }
            });
        }

        return state;
    },

    SQL_QUOTED_IDENTIFIER: '"'

});

FilterNode.optionsSchema = {
    /** Default list of fields only for direct child terminal-node drop-downs.
     * @type {string[]}
     * @memberOf FilterNode.prototype
     */
    nodeFields: { own: true },

    /** Default list of fields for all descendant terminal-node drop-downs.
     * @type {string[]}
     * @memberOf FilterNode.prototype
     */
    fields: {},

    /** Type of filter editor.
     * @type {string}
     * @memberOf FilterNode.prototype
     */
    editor: {},

    /** Event handler for UI events.
     * @type {string}
     * @memberOf FilterNode.prototype
     */
    eventHandler: {},

    /** If this is the column filters subtree.
     * Should only ever be first child of root tree.
     * @type {boolean}
     * @memberOf FilterNode.prototype
     */
    isColumnFilters: { own: true },

    operatorOptions: { default: conditionals.options }
};

FilterNode.setWarningClass = function(el, value) {
    if (arguments.length < 2) {
        value = el.value;
    }
    el.classList[value ? 'remove' : 'add']('filter-tree-warning');
    return value;

};

FilterNode.Error = function(msg) {
    return new Error('filter-tree: ' + msg);
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

},{"./conditionals":10,"./template":12,"extend-me":2,"object-iterators":3}],10:[function(require,module,exports){
'use strict';


var _ = require('object-iterators');
var regExpLIKE = require('regexp-like');

var LIKE = 'LIKE ',
    NOT_LIKE = 'NOT ' + LIKE,
    LIKE_WILD_CARD = '%';

var operators = {
    '<': {
        test: function(a, b) { return a < b; },
        sql: sqlDiadic.bind(this, '<')
    },
    '\u2264': {
        test: function(a, b) { return a <= b; },
        sql: sqlDiadic.bind(this, '<=')
    },
    '=': {
        test: function(a, b) { return a === b; },
        sql: sqlDiadic.bind(this, '=')
    },
    '\u2265': {
        test: function(a, b) { return a >= b; },
        sql: sqlDiadic.bind(this, '>=')
    },
    '>': {
        test: function(a, b) { return a > b; },
        sql: sqlDiadic.bind(this, '>')
    },
    '\u2260': {
        test: function(a, b) { return a !== b; },
        sql: sqlDiadic.bind(this, '<>')
    },
    LIKE: {
        test: function(a, b) { return regExpLIKE.cached(b, true).test(a); },
        sql: sqlDiadic.bind(this, 'LIKE'),
        type: 'string'
    },
    'NOT LIKE': {
        test: function(a, b) { return !regExpLIKE.cached(b, true).test(a); },
        sql: sqlDiadic.bind(this, 'NOT LIKE'),
        type: 'string'
    },
    IN: { // TODO: currently forcing string typing; rework calling code to respect column type
        test: function(a, b) { return inOp(a, b) >= 0; },
        sql: sqlIN.bind(this, 'IN'),
        type: 'string'
    },
    'NOT IN': { // TODO: currently forcing string typing; rework calling code to respect column type
        test: function(a, b) { return inOp(a, b) < 0; },
        sql: sqlIN.bind(this, 'NOT IN'),
        type: 'string'
    },
    CONTAINS: {
        test: function(a, b) { return containsOp(a, b) >= 0; },
        sql: sqlLIKE.bind(this, LIKE_WILD_CARD, LIKE_WILD_CARD, LIKE),
        type: 'string'
    },
    'NOT CONTAINS': {
        test: function(a, b) { return containsOp(a, b) < 0; },
        sql: sqlLIKE.bind(this, LIKE_WILD_CARD, LIKE_WILD_CARD, NOT_LIKE),
        type: 'string'
    },
    BEGINS: {
        test: function(a, b) { b = b.toString().toLowerCase(); return beginsOp(a, b.length) === b; },
        sql: sqlLIKE.bind(this, '', LIKE_WILD_CARD, LIKE),
        type: 'string'
    },
    'NOT BEGINS': {
        test: function(a, b) { b = b.toString().toLowerCase(); return beginsOp(a, b.length) !== b; },
        sql: sqlLIKE.bind(this, '', LIKE_WILD_CARD, NOT_LIKE),
        type: 'string'
    },
    ENDS: {
        test: function(a, b) { b = b.toString().toLowerCase(); return endsOp(a, b.length) === b; },
        sql: sqlLIKE.bind(this, LIKE_WILD_CARD, '', LIKE),
        type: 'string'
    },
    'NOT ENDS': {
        test: function(a, b) { b = b.toString().toLowerCase(); return endsOp(a, b.length) !== b; },
        sql: sqlLIKE.bind(this, LIKE_WILD_CARD, '', NOT_LIKE),
        type: 'string'
    }
};

function inOp(a, b) {
    return b
        .trim() // remove leading and trailing space chars
        .replace(/\s*,\s*/g, ',') // remove any white-space chars from around commas
        .split(',') // put in an array
        .indexOf(a.toString()); // search array whole matches
}

function containsOp(a, b) {
    return a.toString().toLowerCase().indexOf(b.toString().toLowerCase());
}

function beginsOp(a, length) {
    return a.toString().toLowerCase().substr(0, length);
}

function endsOp(a, length) {
    return a.toString().toLowerCase().substr(-length, length);
}

function sqlLIKE(beg, end, LIKE_OR_NOT_LIKE, a, likePattern) {
    var escaped = likePattern.replace(/([\[_%\]])/g, '[$1]'); // escape all LIKE reserved chars
    return identifier(a) + ' ' + LIKE_OR_NOT_LIKE + ' ' + getSqlString(beg + escaped + end);
}

function sqlIN(op, a, b) {
    return identifier(a) + ' ' + op + ' (\'' + sqEsc(b).replace(/\s*,\s*/g, '\', \'') + '\')';
}

function identifier(s) {
    return s.literal ? getSqlString(s.literal) : getSqlIdentifier(s.identifier ? s.identifier : s);
}

function literal(s) {
    return s.identifier ? getSqlIdentifier(s.identifier) : getSqlString(s.literal ? s.literal : s);
}

function sqlDiadic(op, a, b) {
    return identifier(a) + op + literal(b);
}

function sqEsc(string) {
    return string.replace(/'/g, '\'\'');
}

function getSqlString(string) {
    return '\'' + sqEsc(string) + '\'';
}

function getSqlIdentifier(id) {
    return '\"' + sqEsc(id) + '\"';
}

// List the operators as drop-down options in an hierarchical array (rendered as option groups):

var groups = {
    equality: {
        label: 'Equality',
        options: ['=']
    },
    inequalities: {
        label: 'Inequality',
        options: ['<', '\u2264', '\u2260', '\u2265', '>']
    },
    sets: {
        label: 'Set scan',
        options: ['IN', 'NOT IN']
    },
    strings: {
        label: 'String scan',
        options: [
            'CONTAINS', 'NOT CONTAINS',
            'BEGINS', 'NOT BEGINS',
            'ENDS', 'NOT ENDS'
        ]
    },
    patterns: {
        label: 'Pattern matching',
        options: ['LIKE', 'NOT LIKE']
    }
};

// add a `name` prop to each group to guide insertion of new groups into `.options`
_(groups).each(function(group, key) { group.name = key; });

module.exports = {
    operators: operators,
    groups: groups,
    options: [
        groups.equality,
        groups.inequalities,
        groups.sets,
        groups.strings,
        groups.patterns
    ]
};

},{"object-iterators":3,"regexp-like":4}],11:[function(require,module,exports){
'use strict';

var cssInjector = require('css-injector');

var css; // defined by code inserted by gulpfile between following comments
/* inject:css */
css = '.filter-tree{font-family:sans-serif;font-size:10pt;line-height:1.5em}.filter-tree label{font-weight:400}.filter-tree input[type=checkbox],.filter-tree input[type=radio]{left:3px;margin-right:3px}.filter-tree ol{margin-top:0}.filter-tree-add,.filter-tree-add-filter,.filter-tree-remove{cursor:pointer}.filter-tree-add,.filter-tree-add-filter{font-style:italic;color:#444;font-size:90%}.filter-tree-add-filter{margin:3px 0;display:inline-block}.filter-tree-add-filter:hover,.filter-tree-add:hover{text-decoration:underline}.filter-tree-add-filter.as-menu-header,.filter-tree-add.as-menu-header{background-color:#fff;font-weight:700;font-style:normal}.filter-tree-add-filter.as-menu-header:hover{text-decoration:inherit}.filter-tree-add-filter>div,.filter-tree-add>div,.filter-tree-remove{display:inline-block;width:15px;height:15px;border-radius:8px;background-color:#8c8;font-size:11.5px;font-weight:700;color:#fff;text-align:center;line-height:normal;font-style:normal;font-family:sans-serif;text-shadow:0 0 1.5px grey;margin-right:4px}.filter-tree-add-filter>div:before,.filter-tree-add>div:before{content:\'\\ff0b\'}.filter-tree-remove{background-color:#e88;border:0}.filter-tree-remove:before{content:\'\\2212\'}.filter-tree li::after{font-size:70%;font-style:italic;font-weight:700;color:#080}.filter-tree>ol>li:last-child::after{display:none}.filter-tree-add,.filter-tree-add-filter,.op-and>ol,.op-nor>ol,.op-or>ol{padding-left:32px}.op-or>ol>li::after{margin-left:2.5em;content:\'— OR —\'}.op-and>ol>li::after{margin-left:2.5em;content:\'— AND —\'}.op-nor>ol>li::after{margin-left:2.5em;content:\'— NOR —\'}.filter-tree-editor>*{font-weight:700}.filter-tree-editor>span{font-size:smaller}.filter-tree-editor>input[type=text]{width:8em;padding:1px 5px 2px}.filter-tree-default>:enabled{margin:0 .4em;background-color:#ddd;border:0}.filter-tree-default>select{border:0}.filter-tree-default>.filter-tree-warning{background-color:#ffc}.filter-tree-default>.filter-tree-error{background-color:#Fcc}.filter-tree .footnotes{font-size:6pt;margin:2px 0 0;line-height:normal;white-space:normal;color:#999}.filter-tree .footnotes>ol{margin:0;padding-left:2em}.filter-tree .footnotes>ol>li{margin:2px 0}.filter-tree .footnotes .field-name,.filter-tree .footnotes .field-value{font-weight:700;color:#777}.filter-tree .footnotes .field-value:after,.filter-tree .footnotes .field-value:before{content:\'\"\'}.filter-tree .footnotes .field-value{font-family:monospace}.filter-tree-chooser{position:absolute;font-size:9pt;outline:0;box-shadow:5px 5px 10px grey}';
/* endinject */

module.exports = cssInjector.bind(this, css);

},{"css-injector":1}],12:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var templex = require('templex');

var templates = {

    tree: function() {
        /*
         <span class="filter-tree">
             Match
             <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-or">any</label>
             <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-and">all</label>
             <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-nor">none</label>
             of the following conditionals:<br/>
             <span class="filter-tree-add-filter" title="Add a new conditional to this match.">
                <div></div>conditional
             </span>
             <span class="filter-tree-add" title="Add a new sub-match under this match.">
                <div></div>subexpression
             </span>
             <ol></ol>
         </span>
         */
    },

    columnFilters: function() {
        /*
        <span class="filter-tree op-and">
            <strong>This permanent subexpression is reserved for the grid's <em>column filters.</em></strong><br/>
            <em style="white-space: normal; font-size:smaller; line-height: normal; display: block; margin:.5em 1em; padding-left: 1em; border-left: .7em solid lightgrey;">
                Each subexpression in this section represents the contents of a column's filter cell (below header cell).
            </em>
            Row data must match <strong>all</strong> of the following conditionals:<br/>
            <span class="filter-tree-add-filter" title="Add a new conditional to this match.">
               <div></div>conditional
            </span>
            <span class="filter-tree-add" title="Add a new sub-match under this match.">
               <div></div>column filter subexpression
            </span>
            <ol></ol>
        </span>
        */
    },

    removeButton: function() {
        /*
        <div class="filter-tree-remove" title="delete conditional"></div>
        */
    },

    note: function() {
        /*
        <div class="footnotes">
            <em>Note regarding the above expression:</em>
            <span></span>
            Select a new value or delete the expression altogether.
        </div>
        */
    },

    notes: function() {
        /*
         <div class="footnotes">
            <em>Notes regarding the above expression:</em>
            <ol></ol>
            Select new values or delete the expression altogether.
         </div>
         */
    },

    optionMissing: function() {
        /*
        The previous <span class="field-name">{1:encode}</span>
        value <span class="field-value">{2:encode}</span>
        is no longer valid.
        */
    }

};

var extract = /\/\*\s*([^]+?)\s+\*\//; // finds the string inside the /* ... */; the group excludes the whitespace
var encoders = /\{(\d+)\:encode\}/g;

function get(templateName) {
    var temp = document.createElement('div');
    var text = templates[templateName].toString().match(extract)[1];
    var templexArgs = [text].concat(Array.prototype.slice.call(arguments, 1));
    var keys, encoder = {};

    encoders.lastIndex = 0;
    while ((keys = encoders.exec(text))) {
        encoder[keys[1]] = true;
    }
    keys = Object.keys(encoder);
    if (keys.length) {
        keys.forEach(function(key) {
            temp.textContent = templexArgs[key];
            templexArgs[key] = temp.innerHTML;
        });
        templexArgs[0] = text.replace(encoders, '{$1}');
    }

    temp.innerHTML = templex.apply(this, templexArgs);

    // if only one HTMLElement, return it; otherwise entire list of nodes
    return temp.children.length === 1 && temp.childNodes.length === 1 ? temp.firstChild : temp.childNodes;
}

module.exports = get;

},{"templex":5}],13:[function(require,module,exports){
'use strict';

/** @typedef {function} operationReducer
 * @param {boolean} p
 * @param {boolean} q
 * @returns {boolean} The result of applying the operator to the two parameters.
 */

/**
 * @private
 * @type {operationReducer}
 */
function AND(p, q) {
    return p && q;
}

/**
 * @private
 * @type {operationReducer}
 */
function OR(p, q) {
    return p || q;
}

/** @typedef {obejct} treeOperator
 * @desc Each `treeOperator` object describes two things:
 *
 * 1. How to take the test results of _n_ child nodes by applying the operator to all the results to "reduce" it down to a single result.
 * 2. How to generate SQL WHERE clause syntax that applies the operator to _n_ child nodes.
 *
 * @property {operationReducer} reduce
 * @property {boolean} seed -
 * @property {boolean} abort -
 * @property {boolean} negate -
 * @property {string} SQL.op -
 * @property {string} SQL.beg -
 * @property {string} SQL.end -
 */

/** A hash of {@link treeOperator} objects.
 * @type {object}
 */
var treeOperators = {
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
            beg: 'NOT (',
            end: ')'
        }
    }
};

module.exports = treeOperators;

},{}]},{},[7])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL25vZGVfbW9kdWxlcy9jc3MtaW5qZWN0b3IvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL2V4dGVuZC1tZS9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvb2JqZWN0LWl0ZXJhdG9ycy9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvcmVnZXhwLWxpa2UvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL3RlbXBsZXgvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL3Vuc3RydW5naWZ5L2luZGV4LmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9mYWtlXzk3ZGMwM2ZmLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy9GaWx0ZXJMZWFmLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy9GaWx0ZXJOb2RlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy9jb25kaXRpb25hbHMuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvc3JjL2pzL2Nzcy5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvdGVtcGxhdGUuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvc3JjL2pzL3RyZWUtb3BlcmF0b3JzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcGJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4vKiogQG5hbWVzcGFjZSBjc3NJbmplY3RvciAqL1xuXG4vKipcbiAqIEBzdW1tYXJ5IEluc2VydCBiYXNlIHN0eWxlc2hlZXQgaW50byBET01cbiAqXG4gKiBAZGVzYyBDcmVhdGVzIGEgbmV3IGA8c3R5bGU+Li4uPC9zdHlsZT5gIGVsZW1lbnQgZnJvbSB0aGUgbmFtZWQgdGV4dCBzdHJpbmcocykgYW5kIGluc2VydHMgaXQgYnV0IG9ubHkgaWYgaXQgZG9lcyBub3QgYWxyZWFkeSBleGlzdCBpbiB0aGUgc3BlY2lmaWVkIGNvbnRhaW5lciBhcyBwZXIgYHJlZmVyZW5jZUVsZW1lbnRgLlxuICpcbiAqID4gQ2F2ZWF0OiBJZiBzdHlsZXNoZWV0IGlzIGZvciB1c2UgaW4gYSBzaGFkb3cgRE9NLCB5b3UgbXVzdCBzcGVjaWZ5IGEgbG9jYWwgYHJlZmVyZW5jZUVsZW1lbnRgLlxuICpcbiAqIEByZXR1cm5zIEEgcmVmZXJlbmNlIHRvIHRoZSBuZXdseSBjcmVhdGVkIGA8c3R5bGU+Li4uPC9zdHlsZT5gIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IGNzc1J1bGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gW0lEXVxuICogQHBhcmFtIHt1bmRlZmluZWR8bnVsbHxFbGVtZW50fHN0cmluZ30gW3JlZmVyZW5jZUVsZW1lbnRdIC0gQ29udGFpbmVyIGZvciBpbnNlcnRpb24uIE92ZXJsb2FkczpcbiAqICogYHVuZGVmaW5lZGAgdHlwZSAob3Igb21pdHRlZCk6IGluamVjdHMgc3R5bGVzaGVldCBhdCB0b3Agb2YgYDxoZWFkPi4uLjwvaGVhZD5gIGVsZW1lbnRcbiAqICogYG51bGxgIHZhbHVlOiBpbmplY3RzIHN0eWxlc2hlZXQgYXQgYm90dG9tIG9mIGA8aGVhZD4uLi48L2hlYWQ+YCBlbGVtZW50XG4gKiAqIGBFbGVtZW50YCB0eXBlOiBpbmplY3RzIHN0eWxlc2hlZXQgaW1tZWRpYXRlbHkgYmVmb3JlIGdpdmVuIGVsZW1lbnQsIHdoZXJldmVyIGl0IGlzIGZvdW5kLlxuICogKiBgc3RyaW5nYCB0eXBlOiBpbmplY3RzIHN0eWxlc2hlZXQgaW1tZWRpYXRlbHkgYmVmb3JlIGdpdmVuIGZpcnN0IGVsZW1lbnQgZm91bmQgdGhhdCBtYXRjaGVzIHRoZSBnaXZlbiBjc3Mgc2VsZWN0b3IuXG4gKlxuICogQG1lbWJlck9mIGNzc0luamVjdG9yXG4gKi9cbmZ1bmN0aW9uIGNzc0luamVjdG9yKGNzc1J1bGVzLCBJRCwgcmVmZXJlbmNlRWxlbWVudCkge1xuICAgIGlmICh0eXBlb2YgcmVmZXJlbmNlRWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmVmZXJlbmNlRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IocmVmZXJlbmNlRWxlbWVudCk7XG4gICAgICAgIGlmICghcmVmZXJlbmNlRWxlbWVudCkge1xuICAgICAgICAgICAgdGhyb3cgJ0Nhbm5vdCBmaW5kIHJlZmVyZW5jZSBlbGVtZW50IGZvciBDU1MgaW5qZWN0aW9uLic7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZUVsZW1lbnQgJiYgIShyZWZlcmVuY2VFbGVtZW50IGluc3RhbmNlb2YgRWxlbWVudCkpIHtcbiAgICAgICAgdGhyb3cgJ0dpdmVuIHZhbHVlIG5vdCBhIHJlZmVyZW5jZSBlbGVtZW50Lic7XG4gICAgfVxuXG4gICAgdmFyIGNvbnRhaW5lciA9IHJlZmVyZW5jZUVsZW1lbnQgJiYgcmVmZXJlbmNlRWxlbWVudC5wYXJlbnROb2RlIHx8IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTtcblxuICAgIGlmIChJRCkge1xuICAgICAgICBJRCA9IGNzc0luamVjdG9yLmlkUHJlZml4ICsgSUQ7XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcjJyArIElEKSkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBzdHlsZXNoZWV0IGFscmVhZHkgaW4gRE9NXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuICAgIGlmIChJRCkge1xuICAgICAgICBzdHlsZS5pZCA9IElEO1xuICAgIH1cbiAgICBpZiAoY3NzUnVsZXMgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBjc3NSdWxlcyA9IGNzc1J1bGVzLmpvaW4oJ1xcbicpO1xuICAgIH1cbiAgICBjc3NSdWxlcyA9ICdcXG4nICsgY3NzUnVsZXMgKyAnXFxuJztcbiAgICBpZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3NSdWxlcztcbiAgICB9IGVsc2Uge1xuICAgICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3NSdWxlcykpO1xuICAgIH1cblxuICAgIGlmIChyZWZlcmVuY2VFbGVtZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVmZXJlbmNlRWxlbWVudCA9IGNvbnRhaW5lci5maXJzdENoaWxkO1xuICAgIH1cblxuICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoc3R5bGUsIHJlZmVyZW5jZUVsZW1lbnQpO1xuXG4gICAgcmV0dXJuIHN0eWxlO1xufVxuXG4vKipcbiAqIEBzdW1tYXJ5IE9wdGlvbmFsIHByZWZpeCBmb3IgYDxzdHlsZT5gIHRhZyBJRHMuXG4gKiBAZGVzYyBEZWZhdWx0cyB0byBgJ2luamVjdGVkLXN0eWxlc2hlZXQtJ2AuXG4gKiBAdHlwZSB7c3RyaW5nfVxuICogQG1lbWJlck9mIGNzc0luamVjdG9yXG4gKi9cbmNzc0luamVjdG9yLmlkUHJlZml4ID0gJ2luamVjdGVkLXN0eWxlc2hlZXQtJztcblxuLy8gSW50ZXJmYWNlXG5tb2R1bGUuZXhwb3J0cyA9IGNzc0luamVjdG9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiogQG5hbWVzcGFjZSBleHRlbmQtbWUgKiovXG5cbi8qKiBAc3VtbWFyeSBFeHRlbmRzIGFuIGV4aXN0aW5nIGNvbnN0cnVjdG9yIGludG8gYSBuZXcgY29uc3RydWN0b3IuXG4gKlxuICogQHJldHVybnMge0NoaWxkQ29uc3RydWN0b3J9IEEgbmV3IGNvbnN0cnVjdG9yLCBleHRlbmRlZCBmcm9tIHRoZSBnaXZlbiBjb250ZXh0LCBwb3NzaWJseSB3aXRoIHNvbWUgcHJvdG90eXBlIGFkZGl0aW9ucy5cbiAqXG4gKiBAZGVzYyBFeHRlbmRzIFwib2JqZWN0c1wiIChjb25zdHJ1Y3RvcnMpLCB3aXRoIG9wdGlvbmFsIGFkZGl0aW9uYWwgY29kZSwgb3B0aW9uYWwgcHJvdG90eXBlIGFkZGl0aW9ucywgYW5kIG9wdGlvbmFsIHByb3RvdHlwZSBtZW1iZXIgYWxpYXNlcy5cbiAqXG4gKiA+IENBVkVBVDogTm90IHRvIGJlIGNvbmZ1c2VkIHdpdGggVW5kZXJzY29yZS1zdHlsZSAuZXh0ZW5kKCkgd2hpY2ggaXMgc29tZXRoaW5nIGVsc2UgZW50aXJlbHkuIEkndmUgdXNlZCB0aGUgbmFtZSBcImV4dGVuZFwiIGhlcmUgYmVjYXVzZSBvdGhlciBwYWNrYWdlcyAobGlrZSBCYWNrYm9uZS5qcykgdXNlIGl0IHRoaXMgd2F5LiBZb3UgYXJlIGZyZWUgdG8gY2FsbCBpdCB3aGF0ZXZlciB5b3Ugd2FudCB3aGVuIHlvdSBcInJlcXVpcmVcIiBpdCwgc3VjaCBhcyBgdmFyIGluaGVyaXRzID0gcmVxdWlyZSgnZXh0ZW5kJylgLlxuICpcbiAqIFByb3ZpZGUgYSBjb25zdHJ1Y3RvciBhcyB0aGUgY29udGV4dCBhbmQgYW55IHByb3RvdHlwZSBhZGRpdGlvbnMgeW91IHJlcXVpcmUgaW4gdGhlIGZpcnN0IGFyZ3VtZW50LlxuICpcbiAqIEZvciBleGFtcGxlLCBpZiB5b3Ugd2lzaCB0byBiZSBhYmxlIHRvIGV4dGVuZCBgQmFzZUNvbnN0cnVjdG9yYCB0byBhIG5ldyBjb25zdHJ1Y3RvciB3aXRoIHByb3RvdHlwZSBvdmVycmlkZXMgYW5kL29yIGFkZGl0aW9ucywgYmFzaWMgdXNhZ2UgaXM6XG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogdmFyIEJhc2UgPSByZXF1aXJlKCdleHRlbmQtbWUnKS5CYXNlO1xuICogdmFyIEJhc2VDb25zdHJ1Y3RvciA9IEJhc2UuZXh0ZW5kKGJhc2VQcm90b3R5cGUpOyAvLyBtaXhlcyBpbiAuZXh0ZW5kXG4gKiB2YXIgQ2hpbGRDb25zdHJ1Y3RvciA9IEJhc2VDb25zdHJ1Y3Rvci5leHRlbmQoY2hpbGRQcm90b3R5cGVPdmVycmlkZXNBbmRBZGRpdGlvbnMpO1xuICogdmFyIEdyYW5kY2hpbGRDb25zdHJ1Y3RvciA9IENoaWxkQ29uc3RydWN0b3IuZXh0ZW5kKGdyYW5kY2hpbGRQcm90b3R5cGVPdmVycmlkZXNBbmRBZGRpdGlvbnMpO1xuICogYGBgXG4gKlxuICogVGhpcyBmdW5jdGlvbiAoYGV4dGVuZCgpYCkgaXMgYWRkZWQgdG8gdGhlIG5ldyBleHRlbmRlZCBvYmplY3QgY29uc3RydWN0b3IgYXMgYSBwcm9wZXJ0eSBgLmV4dGVuZGAsIGVzc2VudGlhbGx5IG1ha2luZyB0aGUgb2JqZWN0IGNvbnN0cnVjdG9yIGl0c2VsZiBlYXNpbHkgXCJleHRlbmRhYmxlLlwiIChOb3RlOiBUaGlzIGlzIGEgcHJvcGVydHkgb2YgZWFjaCBjb25zdHJ1Y3RvciBhbmQgbm90IGEgbWV0aG9kIG9mIGl0cyBwcm90b3R5cGUhKVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBbZXh0ZW5kZWRDbGFzc05hbWVdIC0gVGhpcyBpcyBzaW1wbHkgYWRkZWQgdG8gdGhlIHByb3RvdHlwZSBhcyAkJENMQVNTX05BTUUuIFVzZWZ1bCBmb3IgZGVidWdnaW5nIGJlY2F1c2UgYWxsIGRlcml2ZWQgY29uc3RydWN0b3JzIGFwcGVhciB0byBoYXZlIHRoZSBzYW1lIG5hbWUgKFwiQ29uc3RydWN0b3JcIikgaW4gdGhlIGRlYnVnZ2VyLiBUaGlzIHByb3BlcnR5IGlzIGlnbm9yZWQgdW5sZXNzIGBleHRlbmQuZGVidWdgIGlzIGV4cGxpY2l0bHkgc2V0IHRvIGEgdHJ1dGh5IHZhbHVlLlxuICpcbiAqIEBwYXJhbSB7ZXh0ZW5kZWRQcm90b3R5cGVBZGRpdGlvbnNPYmplY3R9IFtwcm90b3R5cGVBZGRpdGlvbnNdIC0gT2JqZWN0IHdpdGggbWVtYmVycyB0byBjb3B5IHRvIG5ldyBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS4gTW9zdCBtZW1iZXJzIHdpbGwgYmUgY29waWVkIHRvIHRoZSBwcm90b3R5cGUuIFNvbWUgbWVtYmVycywgaG93ZXZlciwgaGF2ZSBzcGVjaWFsIG1lYW5pbmdzIGFzIGV4cGxhaW5lZCBpbiB0aGUge0BsaW5rIGV4dGVuZGVkUHJvdG90eXBlQWRkaXRpb25zT2JqZWN0fHR5cGUgZGVmaW5pdGlvbn0gKGFuZCBtYXkgb3IgbWF5IG5vdCBiZSBjb3BpZWQgdG8gdGhlIHByb3RvdHlwZSkuXG4gKlxuICogQHByb3BlcnR5IHtib29sZWFufSBbZGVidWddIC0gU2VlIHBhcmFtZXRlciBgZXh0ZW5kZWRDbGFzc05hbWVgIF8oYWJvdmUpXy5cbiAqXG4gKiBAcHJvcGVydHkge29iamVjdH0gQmFzZSAtIEEgY29udmVuaWVudCBiYXNlIGNsYXNzIGZyb20gd2hpY2ggYWxsIG90aGVyIGNsYXNzZXMgY2FuIGJlIGV4dGVuZGVkLlxuICpcbiAqIEBtZW1iZXJPZiBleHRlbmQtbWVcbiAqL1xuZnVuY3Rpb24gZXh0ZW5kKGV4dGVuZGVkQ2xhc3NOYW1lLCBwcm90b3R5cGVBZGRpdGlvbnMpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgcHJvdG90eXBlQWRkaXRpb25zID0ge307XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgcHJvdG90eXBlQWRkaXRpb25zID0gZXh0ZW5kZWRDbGFzc05hbWU7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHByb3RvdHlwZUFkZGl0aW9ucyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyAnU2luZ2xlIHBhcmFtZXRlciBvdmVybG9hZCBtdXN0IGJlIG9iamVjdC4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXh0ZW5kZWRDbGFzc05hbWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRlbmRlZENsYXNzTmFtZSAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHByb3RvdHlwZUFkZGl0aW9ucyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyAnVHdvIHBhcmFtZXRlciBvdmVybG9hZCBtdXN0IGJlIHN0cmluZywgb2JqZWN0Lic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93ICdUb28gbWFueSBwYXJhbWV0ZXJzJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBDb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgaWYgKHByb3RvdHlwZUFkZGl0aW9ucy5wcmVJbml0aWFsaXplKSB7XG4gICAgICAgICAgICBwcm90b3R5cGVBZGRpdGlvbnMucHJlSW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5pdGlhbGl6ZVByb3RvdHlwZUNoYWluLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgaWYgKHByb3RvdHlwZUFkZGl0aW9ucy5wb3N0SW5pdGlhbGl6ZSkge1xuICAgICAgICAgICAgcHJvdG90eXBlQWRkaXRpb25zLnBvc3RJbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBDb25zdHJ1Y3Rvci5leHRlbmQgPSBleHRlbmQ7XG5cbiAgICB2YXIgcHJvdG90eXBlID0gQ29uc3RydWN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnByb3RvdHlwZSk7XG4gICAgcHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG5cbiAgICBpZiAoZXh0ZW5kZWRDbGFzc05hbWUgJiYgZXh0ZW5kLmRlYnVnKSB7XG4gICAgICAgIHByb3RvdHlwZS4kJENMQVNTX05BTUUgPSBleHRlbmRlZENsYXNzTmFtZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gcHJvdG90eXBlQWRkaXRpb25zKSB7XG4gICAgICAgIGlmIChwcm90b3R5cGVBZGRpdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gcHJvdG90eXBlQWRkaXRpb25zW2tleV07XG4gICAgICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2luaXRpYWxpemVPd24nOlxuICAgICAgICAgICAgICAgICAgICAvLyBhbHJlYWR5IGNhbGxlZCBhYm92ZTsgbm90IG5lZWRlZCBpbiBwcm90b3R5cGVcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnYWxpYXNlcyc6XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGFsaWFzIGluIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoYWxpYXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFrZUFsaWFzKHZhbHVlW2FsaWFzXSwgYWxpYXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIHZhbHVlWzBdID09PSAnIycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ha2VBbGlhcyh2YWx1ZSwga2V5LnN1YnN0cigxKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b3R5cGVba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gQ29uc3RydWN0b3I7XG5cbiAgICBmdW5jdGlvbiBtYWtlQWxpYXModmFsdWUsIGtleSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICBwcm90b3R5cGVba2V5XSA9IHByb3RvdHlwZUFkZGl0aW9uc1t2YWx1ZV07XG4gICAgfVxufVxuXG5leHRlbmQuQmFzZSA9IGZ1bmN0aW9uICgpIHt9O1xuZXh0ZW5kLkJhc2UuZXh0ZW5kID0gZXh0ZW5kO1xuXG4vKiogQHR5cGVkZWYge2Z1bmN0aW9ufSBleHRlbmRlZENvbnN0cnVjdG9yXG4gKiBAcHJvcGVydHkgcHJvdG90eXBlLnN1cGVyIC0gQSByZWZlcmVuY2UgdG8gdGhlIHByb3RvdHlwZSB0aGlzIGNvbnN0cnVjdG9yIHdhcyBleHRlbmRlZCBmcm9tLlxuICogQHByb3BlcnR5IFtleHRlbmRdIC0gSWYgYHByb3RvdHlwZUFkZGl0aW9ucy5leHRlbmRhYmxlYCB3YXMgdHJ1dGh5LCB0aGlzIHdpbGwgYmUgYSByZWZlcmVuY2UgdG8ge0BsaW5rIGV4dGVuZC5leHRlbmR8ZXh0ZW5kfS5cbiAqL1xuXG4vKiogQHR5cGVkZWYge29iamVjdH0gZXh0ZW5kZWRQcm90b3R5cGVBZGRpdGlvbnNPYmplY3RcbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb259IFtpbml0aWFsaXplXSAtIEFkZGl0aW9uYWwgY29uc3RydWN0b3IgY29kZSBmb3IgbmV3IG9iamVjdC4gVGhpcyBtZXRob2QgaXMgYWRkZWQgdG8gdGhlIG5ldyBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS4gR2V0cyBwYXNzZWQgbmV3IG9iamVjdCBhcyBjb250ZXh0ICsgc2FtZSBhcmdzIGFzIGNvbnN0cnVjdG9yIGl0c2VsZi4gQ2FsbGVkIG9uIGluc3RhbnRpYXRpb24gYWZ0ZXIgc2ltaWxhciBmdW5jdGlvbiBpbiBhbGwgYW5jZXN0b3JzIGNhbGxlZCB3aXRoIHNhbWUgc2lnbmF0dXJlLlxuICogQHByb3BlcnR5IHtmdW5jdGlvbn0gW2luaXRpYWxpemVPd25dIC0gQWRkaXRpb25hbCBjb25zdHJ1Y3RvciBjb2RlIGZvciBuZXcgb2JqZWN0LiBUaGlzIG1ldGhvZCBpcyBhZGRlZCB0byB0aGUgbmV3IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLiBHZXRzIHBhc3NlZCBuZXcgb2JqZWN0IGFzIGNvbnRleHQgKyBzYW1lIGFyZ3MgYXMgY29uc3RydWN0b3IgaXRzZWxmLiBDYWxsZWQgb24gaW5zdGFudGlhdGlvbiBhZnRlciAoYWxsKSB0aGUgYGluaXRpYWxpemVgIGZ1bmN0aW9uKHMpLlxuICogQHByb3BlcnR5IHtvYmplY3R9IFthbGlhc2VzXSAtIEhhc2ggb2YgYWxpYXNlcyBmb3IgcHJvdG90eXBlIG1lbWJlcnMgaW4gZm9ybSBgeyBrZXk6ICdtZW1iZXInLCAuLi4gfWAgd2hlcmUgYGtleWAgaXMgdGhlIG5hbWUgb2YgYW4gYWxpZWFzIGFuZCBgJ21lbWJlcidgIGlzIHRoZSBuYW1lIG9mIGFuIGV4aXN0aW5nIG1lbWJlciBpbiB0aGUgcHJvdG90eXBlLiBFYWNoIHN1Y2gga2V5IGlzIGFkZGVkIHRvIHRoZSBwcm90b3R5cGUgYXMgYSByZWZlcmVuY2UgdG8gdGhlIG5hbWVkIG1lbWJlci4gKFRoZSBgYWxpYXNlc2Agb2JqZWN0IGl0c2VsZiBpcyAqbm90KiBhZGRlZCB0byBwcm90b3R5cGUuKSBBbHRlcm5hdGl2ZWx5OlxuICogQHByb3BlcnR5IHtzdHJpbmd9IFtrZXlzXSAtIEFyYml0cmFyeSBwcm9wZXJ0eSBuYW1lcyBkZWZpbmVkIGhlcmUgd2l0aCBzdHJpbmcgdmFsdWVzIHN0YXJ0aW5nIHdpdGggYSBgI2AgY2hhcmFjdGVyIHdpbGwgYWxpYXMgdGhlIGFjdHVhbCBwcm9wZXJ0aWVzIG5hbWVkIGluIHRoZSBzdHJpbmdzIChmb2xsb3dpbmcgdGhlIGAjYCkuIFRoaXMgaXMgYW4gYWx0ZXJuYXRpdmUgdG8gcHJvdmlkaW5nIGFuIGBhbGlhc2VzYCBoYXNoLCBwZXJoYXBzIHNpbXBsZXIgKHRob3VnaCBzdWJ0bGVyKS4gKFVzZSBhcmJpdHJhcnkgaWRlbnRpZmllcnMgaGVyZTsgZG9uJ3QgdXNlIHRoZSBuYW1lIGBrZXlzYCEpXG4gKiBAcHJvcGVydHkgeyp9IFthcmJpdHJhcnlQcm9wZXJ0aWVzXSAtIEFueSBhZGRpdGlvbmFsIGFyYml0cmFyeSBwcm9wZXJ0aWVzIGRlZmluZWQgaGVyZSB3aWxsIGJlIGFkZGVkIHRvIHRoZSBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIChVc2UgYXJiaXRyYXJ5IGlkZW50aWZpZXJzIGhlcmU7IGRvbid0IHVzZSB0aGUgbmFtZSBgYXJpYml0cmFyeVByb3BlcnRpZXNgISlcbiAqL1xuXG4vKiogQHN1bW1hcnkgQ2FsbCBhbGwgYGluaXRpYWxpemVgIG1ldGhvZHMgZm91bmQgaW4gcHJvdG90eXBlIGNoYWluLlxuICogQGRlc2MgVGhpcyByZWN1cnNpdmUgcm91dGluZSBpcyBjYWxsZWQgYnkgdGhlIGNvbnN0cnVjdG9yLlxuICogMS4gV2Fsa3MgYmFjayB0aGUgcHJvdG90eXBlIGNoYWluIHRvIGBPYmplY3RgJ3MgcHJvdG90eXBlXG4gKiAyLiBXYWxrcyBmb3J3YXJkIHRvIG5ldyBvYmplY3QsIGNhbGxpbmcgYW55IGBpbml0aWFsaXplYCBtZXRob2RzIGl0IGZpbmRzIGFsb25nIHRoZSB3YXkgd2l0aCB0aGUgc2FtZSBjb250ZXh0IGFuZCBhcmd1bWVudHMgd2l0aCB3aGljaCB0aGUgY29uc3RydWN0b3Igd2FzIGNhbGxlZC5cbiAqIEBwcml2YXRlXG4gKiBAbWVtYmVyT2YgZXh0ZW5kLW1lXG4gKi9cbmZ1bmN0aW9uIGluaXRpYWxpemVQcm90b3R5cGVDaGFpbigpIHtcbiAgICB2YXIgdGVybSA9IHRoaXMsXG4gICAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgcmVjdXIodGVybSk7XG5cbiAgICBmdW5jdGlvbiByZWN1cihvYmopIHtcbiAgICAgICAgdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iaik7XG4gICAgICAgIGlmIChwcm90by5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KSB7XG4gICAgICAgICAgICByZWN1cihwcm90byk7XG4gICAgICAgICAgICBpZiAocHJvdG8uaGFzT3duUHJvcGVydHkoJ2luaXRpYWxpemUnKSkge1xuICAgICAgICAgICAgICAgIHByb3RvLmluaXRpYWxpemUuYXBwbHkodGVybSwgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kO1xuIiwiLyogb2JqZWN0LWl0ZXJhdG9ycy5qcyAtIE1pbmkgVW5kZXJzY29yZSBsaWJyYXJ5XG4gKiBieSBKb25hdGhhbiBFaXRlblxuICpcbiAqIFRoZSBtZXRob2RzIGJlbG93IG9wZXJhdGUgb24gb2JqZWN0cyAoYnV0IG5vdCBhcnJheXMpIHNpbWlsYXJseVxuICogdG8gVW5kZXJzY29yZSAoaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvI2NvbGxlY3Rpb25zKS5cbiAqXG4gKiBGb3IgbW9yZSBpbmZvcm1hdGlvbjpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qb25laXQvb2JqZWN0LWl0ZXJhdG9yc1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzdW1tYXJ5IFdyYXAgYW4gb2JqZWN0IGZvciBvbmUgbWV0aG9kIGNhbGwuXG4gKiBARGVzYyBOb3RlIHRoYXQgdGhlIGBuZXdgIGtleXdvcmQgaXMgbm90IG5lY2Vzc2FyeS5cbiAqIEBwYXJhbSB7b2JqZWN0fG51bGx8dW5kZWZpbmVkfSBvYmplY3QgLSBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgaXMgdHJlYXRlZCBhcyBhbiBlbXB0eSBwbGFpbiBvYmplY3QuXG4gKiBAcmV0dXJuIHtXcmFwcGVyfSBUaGUgd3JhcHBlZCBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIFdyYXBwZXIob2JqZWN0KSB7XG4gICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIFdyYXBwZXIpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdyYXBwZXIpKSB7XG4gICAgICAgIHJldHVybiBuZXcgV3JhcHBlcihvYmplY3QpO1xuICAgIH1cbiAgICB0aGlzLm9yaWdpbmFsVmFsdWUgPSBvYmplY3Q7XG4gICAgdGhpcy5vID0gb2JqZWN0IHx8IHt9O1xufVxuXG4vKipcbiAqIEBuYW1lIFdyYXBwZXIuY2hhaW5cbiAqIEBzdW1tYXJ5IFdyYXAgYW4gb2JqZWN0IGZvciBhIGNoYWluIG9mIG1ldGhvZCBjYWxscy5cbiAqIEBEZXNjIENhbGxzIHRoZSBjb25zdHJ1Y3RvciBgV3JhcHBlcigpYCBhbmQgbW9kaWZpZXMgdGhlIHdyYXBwZXIgZm9yIGNoYWluaW5nLlxuICogQHBhcmFtIHtvYmplY3R9IG9iamVjdFxuICogQHJldHVybiB7V3JhcHBlcn0gVGhlIHdyYXBwZWQgb2JqZWN0LlxuICovXG5XcmFwcGVyLmNoYWluID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHZhciB3cmFwcGVkID0gV3JhcHBlcihvYmplY3QpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5ldy1jYXBcbiAgICB3cmFwcGVkLmNoYWluaW5nID0gdHJ1ZTtcbiAgICByZXR1cm4gd3JhcHBlZDtcbn07XG5cbldyYXBwZXIucHJvdG90eXBlID0ge1xuICAgIC8qKlxuICAgICAqIFVud3JhcCBhbiBvYmplY3Qgd3JhcHBlZCB3aXRoIHtAbGluayBXcmFwcGVyLmNoYWlufFdyYXBwZXIuY2hhaW4oKX0uXG4gICAgICogQHJldHVybiB7b2JqZWN0fG51bGx8dW5kZWZpbmVkfSBUaGUgdmFsdWUgb3JpZ2luYWxseSB3cmFwcGVkIGJ5IHRoZSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAbWVtYmVyT2YgV3JhcHBlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICB2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcmlnaW5hbFZhbHVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBNaW1pY3MgVW5kZXJzY29yZSdzIFtlYWNoXShodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jZWFjaCkgbWV0aG9kOiBJdGVyYXRlIG92ZXIgdGhlIG1lbWJlcnMgb2YgdGhlIHdyYXBwZWQgb2JqZWN0LCBjYWxsaW5nIGBpdGVyYXRlZSgpYCB3aXRoIGVhY2guXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gaXRlcmF0ZWUgLSBGb3IgZWFjaCBtZW1iZXIgb2YgdGhlIHdyYXBwZWQgb2JqZWN0LCB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogYCh2YWx1ZSwga2V5LCBvYmplY3QpYC4gVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIGZ1bmN0aW9uIGlzIHVuZGVmaW5lZDsgYW4gYC5lYWNoYCBsb29wIGNhbm5vdCBiZSBicm9rZW4gb3V0IG9mICh1c2Uge0BsaW5rIFdyYXBwZXIjZmluZHwuZmluZH0gaW5zdGVhZCkuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtjb250ZXh0XSAtIElmIGdpdmVuLCBgaXRlcmF0ZWVgIGlzIGJvdW5kIHRvIHRoaXMgb2JqZWN0LiBJbiBvdGhlciB3b3JkcywgdGhpcyBvYmplY3QgYmVjb21lcyB0aGUgYHRoaXNgIHZhbHVlIGluIHRoZSBjYWxscyB0byBgaXRlcmF0ZWVgLiAoT3RoZXJ3aXNlLCB0aGUgYHRoaXNgIHZhbHVlIHdpbGwgYmUgdGhlIHVud3JhcHBlZCBvYmplY3QuKVxuICAgICAqIEByZXR1cm4ge1dyYXBwZXJ9IFRoZSB3cmFwcGVkIG9iamVjdCBmb3IgY2hhaW5pbmcuXG4gICAgICogQG1lbWJlck9mIFdyYXBwZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgZWFjaDogZnVuY3Rpb24gKGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICBPYmplY3Qua2V5cyhvKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIGl0ZXJhdGVlLmNhbGwodGhpcywgb1trZXldLCBrZXksIG8pO1xuICAgICAgICB9LCBjb250ZXh0IHx8IG8pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgTWltaWNzIFVuZGVyc2NvcmUncyBbZmluZF0oaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvI2ZpbmQpIG1ldGhvZDogTG9vayB0aHJvdWdoIGVhY2ggbWVtYmVyIG9mIHRoZSB3cmFwcGVkIG9iamVjdCwgcmV0dXJuaW5nIHRoZSBmaXJzdCBvbmUgdGhhdCBwYXNzZXMgYSB0cnV0aCB0ZXN0IChgcHJlZGljYXRlYCksIG9yIGB1bmRlZmluZWRgIGlmIG5vIHZhbHVlIHBhc3NlcyB0aGUgdGVzdC4gVGhlIGZ1bmN0aW9uIHJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBhY2NlcHRhYmxlIG1lbWJlciwgYW5kIGRvZXNuJ3QgbmVjZXNzYXJpbHkgdHJhdmVyc2UgdGhlIGVudGlyZSBvYmplY3QuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gcHJlZGljYXRlIC0gRm9yIGVhY2ggbWVtYmVyIG9mIHRoZSB3cmFwcGVkIG9iamVjdCwgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM6IGAodmFsdWUsIGtleSwgb2JqZWN0KWAuIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgdHJ1dGh5IGlmIHRoZSBtZW1iZXIgcGFzc2VzIHRoZSB0ZXN0IGFuZCBmYWxzeSBvdGhlcndpc2UuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtjb250ZXh0XSAtIElmIGdpdmVuLCBgcHJlZGljYXRlYCBpcyBib3VuZCB0byB0aGlzIG9iamVjdC4gSW4gb3RoZXIgd29yZHMsIHRoaXMgb2JqZWN0IGJlY29tZXMgdGhlIGB0aGlzYCB2YWx1ZSBpbiB0aGUgY2FsbHMgdG8gYHByZWRpY2F0ZWAuIChPdGhlcndpc2UsIHRoZSBgdGhpc2AgdmFsdWUgd2lsbCBiZSB0aGUgdW53cmFwcGVkIG9iamVjdC4pXG4gICAgICogQHJldHVybiB7Kn0gVGhlIGZvdW5kIHByb3BlcnR5J3MgdmFsdWUsIG9yIHVuZGVmaW5lZCBpZiBub3QgZm91bmQuXG4gICAgICogQG1lbWJlck9mIFdyYXBwZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgZmluZDogZnVuY3Rpb24gKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgICB2YXIgbyA9IHRoaXMubztcbiAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgaWYgKG8pIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IE9iamVjdC5rZXlzKG8pLmZpbmQoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcmVkaWNhdGUuY2FsbCh0aGlzLCBvW2tleV0sIGtleSwgbyk7XG4gICAgICAgICAgICB9LCBjb250ZXh0IHx8IG8pO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gb1tyZXN1bHRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBkZXNjIE1pbWljcyBVbmRlcnNjb3JlJ3MgW2ZpbHRlcl0oaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvI2ZpbHRlcikgbWV0aG9kOiBMb29rIHRocm91Z2ggZWFjaCBtZW1iZXIgb2YgdGhlIHdyYXBwZWQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHZhbHVlcyBvZiBhbGwgbWVtYmVycyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0IChgcHJlZGljYXRlYCksIG9yIGVtcHR5IGFycmF5IGlmIG5vIHZhbHVlIHBhc3NlcyB0aGUgdGVzdC4gVGhlIGZ1bmN0aW9uIGFsd2F5cyB0cmF2ZXJzZXMgdGhlIGVudGlyZSBvYmplY3QuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gcHJlZGljYXRlIC0gRm9yIGVhY2ggbWVtYmVyIG9mIHRoZSB3cmFwcGVkIG9iamVjdCwgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM6IGAodmFsdWUsIGtleSwgb2JqZWN0KWAuIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgdHJ1dGh5IGlmIHRoZSBtZW1iZXIgcGFzc2VzIHRoZSB0ZXN0IGFuZCBmYWxzeSBvdGhlcndpc2UuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtjb250ZXh0XSAtIElmIGdpdmVuLCBgcHJlZGljYXRlYCBpcyBib3VuZCB0byB0aGlzIG9iamVjdC4gSW4gb3RoZXIgd29yZHMsIHRoaXMgb2JqZWN0IGJlY29tZXMgdGhlIGB0aGlzYCB2YWx1ZSBpbiB0aGUgY2FsbHMgdG8gYHByZWRpY2F0ZWAuIChPdGhlcndpc2UsIHRoZSBgdGhpc2AgdmFsdWUgd2lsbCBiZSB0aGUgdW53cmFwcGVkIG9iamVjdC4pXG4gICAgICogQHJldHVybiB7Kn0gQW4gYXJyYXkgY29udGFpbmluZyB0aGUgZmlsdGVyZWQgdmFsdWVzLlxuICAgICAqIEBtZW1iZXJPZiBXcmFwcGVyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGZpbHRlcjogZnVuY3Rpb24gKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgICB2YXIgbyA9IHRoaXMubztcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgICBpZiAobykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMobykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXMsIG9ba2V5XSwga2V5LCBvKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChvW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGNvbnRleHQgfHwgbyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgTWltaWNzIFVuZGVyc2NvcmUncyBbbWFwXShodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jbWFwKSBtZXRob2Q6IFByb2R1Y2VzIGEgbmV3IGFycmF5IG9mIHZhbHVlcyBieSBtYXBwaW5nIGVhY2ggdmFsdWUgaW4gbGlzdCB0aHJvdWdoIGEgdHJhbnNmb3JtYXRpb24gZnVuY3Rpb24gKGBpdGVyYXRlZWApLiBUaGUgZnVuY3Rpb24gYWx3YXlzIHRyYXZlcnNlcyB0aGUgZW50aXJlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBpdGVyYXRlZSAtIEZvciBlYWNoIG1lbWJlciBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggdGhyZWUgYXJndW1lbnRzOiBgKHZhbHVlLCBrZXksIG9iamVjdClgLiBUaGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgZnVuY3Rpb24gaXMgY29uY2F0ZW5hdGVkIHRvIHRoZSBlbmQgb2YgdGhlIG5ldyBhcnJheS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIC0gSWYgZ2l2ZW4sIGBpdGVyYXRlZWAgaXMgYm91bmQgdG8gdGhpcyBvYmplY3QuIEluIG90aGVyIHdvcmRzLCB0aGlzIG9iamVjdCBiZWNvbWVzIHRoZSBgdGhpc2AgdmFsdWUgaW4gdGhlIGNhbGxzIHRvIGBwcmVkaWNhdGVgLiAoT3RoZXJ3aXNlLCB0aGUgYHRoaXNgIHZhbHVlIHdpbGwgYmUgdGhlIHVud3JhcHBlZCBvYmplY3QuKVxuICAgICAqIEByZXR1cm4geyp9IEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIGZpbHRlcmVkIHZhbHVlcy5cbiAgICAgKiBAbWVtYmVyT2YgV3JhcHBlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBtYXA6IGZ1bmN0aW9uIChpdGVyYXRlZSwgY29udGV4dCkge1xuICAgICAgICB2YXIgbyA9IHRoaXMubztcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgICBpZiAobykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMobykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goaXRlcmF0ZWUuY2FsbCh0aGlzLCBvW2tleV0sIGtleSwgbykpO1xuICAgICAgICAgICAgfSwgY29udGV4dCB8fCBvKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBNaW1pY3MgVW5kZXJzY29yZSdzIFtyZWR1Y2VdKGh0dHA6Ly91bmRlcnNjb3JlanMub3JnLyNyZWR1Y2UpIG1ldGhvZDogQm9pbCBkb3duIHRoZSB2YWx1ZXMgb2YgYWxsIHRoZSBtZW1iZXJzIG9mIHRoZSB3cmFwcGVkIG9iamVjdCBpbnRvIGEgc2luZ2xlIHZhbHVlLiBgbWVtb2AgaXMgdGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjdGlvbiwgYW5kIGVhY2ggc3VjY2Vzc2l2ZSBzdGVwIG9mIGl0IHNob3VsZCBiZSByZXR1cm5lZCBieSBgaXRlcmF0ZWUoKWAuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gaXRlcmF0ZWUgLSBGb3IgZWFjaCBtZW1iZXIgb2YgdGhlIHdyYXBwZWQgb2JqZWN0LCB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGZvdXIgYXJndW1lbnRzOiBgKG1lbW8sIHZhbHVlLCBrZXksIG9iamVjdClgLiBUaGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgZnVuY3Rpb24gYmVjb21lcyB0aGUgbmV3IHZhbHVlIG9mIGBtZW1vYCBmb3IgdGhlIG5leHQgaXRlcmF0aW9uLlxuICAgICAqIEBwYXJhbSB7Kn0gW21lbW9dIC0gSWYgbm8gbWVtbyBpcyBwYXNzZWQgdG8gdGhlIGluaXRpYWwgaW52b2NhdGlvbiBvZiByZWR1Y2UsIHRoZSBpdGVyYXRlZSBpcyBub3QgaW52b2tlZCBvbiB0aGUgZmlyc3QgZWxlbWVudCBvZiB0aGUgbGlzdC4gVGhlIGZpcnN0IGVsZW1lbnQgaXMgaW5zdGVhZCBwYXNzZWQgYXMgdGhlIG1lbW8gaW4gdGhlIGludm9jYXRpb24gb2YgdGhlIGl0ZXJhdGVlIG9uIHRoZSBuZXh0IGVsZW1lbnQgaW4gdGhlIGxpc3QuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtjb250ZXh0XSAtIElmIGdpdmVuLCBgaXRlcmF0ZWVgIGlzIGJvdW5kIHRvIHRoaXMgb2JqZWN0LiBJbiBvdGhlciB3b3JkcywgdGhpcyBvYmplY3QgYmVjb21lcyB0aGUgYHRoaXNgIHZhbHVlIGluIHRoZSBjYWxscyB0byBgaXRlcmF0ZWVgLiAoT3RoZXJ3aXNlLCB0aGUgYHRoaXNgIHZhbHVlIHdpbGwgYmUgdGhlIHVud3JhcHBlZCBvYmplY3QuKVxuICAgICAqIEByZXR1cm4geyp9IFRoZSB2YWx1ZSBvZiBgbWVtb2AgXCJyZWR1Y2VkXCIgYXMgcGVyIGBpdGVyYXRlZWAuXG4gICAgICogQG1lbWJlck9mIFdyYXBwZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgcmVkdWNlOiBmdW5jdGlvbiAoaXRlcmF0ZWUsIG1lbW8sIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIG8gPSB0aGlzLm87XG4gICAgICAgIGlmIChvKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhvKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXksIGlkeCkge1xuICAgICAgICAgICAgICAgIG1lbW8gPSAoIWlkeCAmJiBtZW1vID09PSB1bmRlZmluZWQpID8gb1trZXldIDogaXRlcmF0ZWUobWVtbywgb1trZXldLCBrZXksIG8pO1xuICAgICAgICAgICAgfSwgY29udGV4dCB8fCBvKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWVtbztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgTWltaWNzIFVuZGVyc2NvcmUncyBbZXh0ZW5kXShodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jZXh0ZW5kKSBtZXRob2Q6IENvcHkgYWxsIG9mIHRoZSBwcm9wZXJ0aWVzIGluIGVhY2ggb2YgdGhlIGBzb3VyY2VgIG9iamVjdCBwYXJhbWV0ZXIocykgb3ZlciB0byB0aGUgKHdyYXBwZWQpIGRlc3RpbmF0aW9uIG9iamVjdCAodGh1cyBtdXRhdGluZyBpdCkuIEl0J3MgaW4tb3JkZXIsIHNvIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBsYXN0IGBzb3VyY2VgIG9iamVjdCB3aWxsIG92ZXJyaWRlIHByb3BlcnRpZXMgd2l0aCB0aGUgc2FtZSBuYW1lIGluIHByZXZpb3VzIGFyZ3VtZW50cyBvciBpbiB0aGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICAgICAqID4gVGhpcyBtZXRob2QgY29waWVzIG93biBtZW1iZXJzIGFzIHdlbGwgYXMgbWVtYmVycyBpbmhlcml0ZWQgZnJvbSBwcm90b3R5cGUgY2hhaW4uXG4gICAgICogQHBhcmFtIHsuLi5vYmplY3R8bnVsbHx1bmRlZmluZWR9IHNvdXJjZSAtIFZhbHVlcyBvZiBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgYXJlIHRyZWF0ZWQgYXMgZW1wdHkgcGxhaW4gb2JqZWN0cy5cbiAgICAgKiBAcmV0dXJuIHtXcmFwcGVyfG9iamVjdH0gVGhlIHdyYXBwZWQgZGVzdGluYXRpb24gb2JqZWN0IGlmIGNoYWluaW5nIGlzIGluIGVmZmVjdDsgb3RoZXJ3aXNlIHRoZSB1bndyYXBwZWQgZGVzdGluYXRpb24gb2JqZWN0LlxuICAgICAqIEBtZW1iZXJPZiBXcmFwcGVyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGV4dGVuZDogZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgICAgICB2YXIgbyA9IHRoaXMubztcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKS5mb3JFYWNoKGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIG9ba2V5XSA9IG9iamVjdFtrZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLmNoYWluaW5nID8gdGhpcyA6IG87XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBkZXNjIE1pbWljcyBVbmRlcnNjb3JlJ3MgW2V4dGVuZE93bl0oaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvI2V4dGVuZE93bikgbWV0aG9kOiBMaWtlIHtAbGluayBXcmFwcGVyI2V4dGVuZHxleHRlbmR9LCBidXQgb25seSBjb3BpZXMgaXRzIFwib3duXCIgcHJvcGVydGllcyBvdmVyIHRvIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogQHBhcmFtIHsuLi5vYmplY3R8bnVsbHx1bmRlZmluZWR9IHNvdXJjZSAtIFZhbHVlcyBvZiBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgYXJlIHRyZWF0ZWQgYXMgZW1wdHkgcGxhaW4gb2JqZWN0cy5cbiAgICAgKiBAcmV0dXJuIHtXcmFwcGVyfG9iamVjdH0gVGhlIHdyYXBwZWQgZGVzdGluYXRpb24gb2JqZWN0IGlmIGNoYWluaW5nIGlzIGluIGVmZmVjdDsgb3RoZXJ3aXNlIHRoZSB1bndyYXBwZWQgZGVzdGluYXRpb24gb2JqZWN0LlxuICAgICAqIEBtZW1iZXJPZiBXcmFwcGVyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGV4dGVuZE93bjogZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgICAgICB2YXIgbyA9IHRoaXMubztcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKS5mb3JFYWNoKGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgICAgIFdyYXBwZXIob2JqZWN0KS5lYWNoKGZ1bmN0aW9uICh2YWwsIGtleSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5ldy1jYXBcbiAgICAgICAgICAgICAgICBvW2tleV0gPSB2YWw7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLmNoYWluaW5nID8gdGhpcyA6IG87XG4gICAgfVxufTtcblxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvZmluZFxuaWYgKCFBcnJheS5wcm90b3R5cGUuZmluZCkge1xuICAgIEFycmF5LnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKHByZWRpY2F0ZSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWV4dGVuZC1uYXRpdmVcbiAgICAgICAgaWYgKHRoaXMgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5LnByb3RvdHlwZS5maW5kIGNhbGxlZCBvbiBudWxsIG9yIHVuZGVmaW5lZCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgcHJlZGljYXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxpc3QgPSBPYmplY3QodGhpcyk7XG4gICAgICAgIHZhciBsZW5ndGggPSBsaXN0Lmxlbmd0aCA+Pj4gMDtcbiAgICAgICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgdmFsdWUsIGksIGxpc3QpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBXcmFwcGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgLy8gYSByZWdleCBzZWFyY2ggcGF0dGVybiB0aGF0IG1hdGNoZXMgYWxsIHRoZSByZXNlcnZlZCBjaGFycyBvZiBhIHJlZ2V4IHNlYXJjaCBwYXR0ZXJuXG4gICAgcmVzZXJ2ZWQgPSAvKFtcXC5cXFxcXFwrXFwqXFw/XFxeXFwkXFwoXFwpXFx7XFx9XFw9XFwhXFw8XFw+XFx8XFw6XFxbXFxdXSkvZyxcblxuICAgIC8vIHJlZ2V4IHdpbGRjYXJkIHNlYXJjaCBwYXR0ZXJuc1xuICAgIFJFR0VYUF9XSUxEQ0FSRCA9ICcuKicsXG4gICAgUkVHRVhQX1dJTERDSEFSID0gJy4nLFxuICAgIFJFR0VYUF9XSUxEQ0FSRF9NQVRDSEVSID0gJygnICsgUkVHRVhQX1dJTERDQVJEICsgJyknLFxuXG4gICAgLy8gTElLRSBzZWFyY2ggcGF0dGVybnNcbiAgICBMSUtFX1dJTERDSEFSID0gJ18nLFxuICAgIExJS0VfV0lMRENBUkQgPSAnJScsXG5cbiAgICAvLyByZWdleCBzZWFyY2ggcGF0dGVybnMgdGhhdCBtYXRjaCBMSUtFIHNlYXJjaCBwYXR0ZXJuc1xuICAgIFJFR0VYUF9MSUtFX1BBVFRFUk5fTUFUQ0hFUiA9IG5ldyBSZWdFeHAoJygnICsgW1xuICAgICAgICBMSUtFX1dJTERDSEFSLFxuICAgICAgICBMSUtFX1dJTERDQVJELFxuICAgICAgICAnXFxcXFtcXFxcXj9bXi1cXFxcXV0rXScsIC8vIG1hdGNoZXMgYSBMSUtFIHNldCAoc2FtZSBzeW50YXggYXMgYSBSZWdFeHAgc2V0KVxuICAgICAgICAnXFxcXFtcXFxcXj9bXi1cXFxcXV1cXFxcLVteXFxcXF1dXScgLy8gbWF0Y2hlcyBhIExJS0UgcmFuZ2UgKHNhbWUgc3ludGF4IGFzIGEgUmVnRXhwIHJhbmdlKVxuICAgIF0uam9pbignfCcpICsgJyknLCAnZycpO1xuXG5mdW5jdGlvbiByZWdFeHBMSUtFKHBhdHRlcm4sIGlnbm9yZUNhc2UpIHtcbiAgICB2YXIgaSwgcGFydHM7XG5cbiAgICAvLyBGaW5kIGFsbCBMSUtFIHBhdHRlcm5zXG4gICAgcGFydHMgPSBwYXR0ZXJuLm1hdGNoKFJFR0VYUF9MSUtFX1BBVFRFUk5fTUFUQ0hFUik7XG5cbiAgICBpZiAocGFydHMpIHtcbiAgICAgICAgLy8gVHJhbnNsYXRlIGZvdW5kIExJS0UgcGF0dGVybnMgdG8gcmVnZXggcGF0dGVybnMsIGVzY2FwZWQgaW50ZXJ2ZW5pbmcgbm9uLXBhdHRlcm5zLCBhbmQgaW50ZXJsZWF2ZSB0aGUgdHdvXG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAvLyBFc2NhcGUgbGVmdCBicmFja2V0cyAodW5wYWlyZWQgcmlnaHQgYnJhY2tldHMgYXJlIE9LKVxuICAgICAgICAgICAgaWYgKHBhcnRzW2ldWzBdID09PSAnWycpIHtcbiAgICAgICAgICAgICAgICBwYXJ0c1tpXSA9IHJlZ0V4cExJS0UucmVzZXJ2ZShwYXJ0c1tpXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgZWFjaCBmb3VuZCBwYXR0ZXJuIG1hdGNoYWJsZSBieSBlbmNsb3NpbmcgaW4gcGFyZW50aGVzZXNcbiAgICAgICAgICAgIHBhcnRzW2ldID0gJygnICsgcGFydHNbaV0gKyAnKSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXRjaCB0aGVzZSBwcmVjaXNlIHBhdHRlcm5zIGFnYWluIHdpdGggdGhlaXIgaW50ZXJ2ZW5pbmcgbm9uLXBhdHRlcm5zIChpLmUuLCB0ZXh0KVxuICAgICAgICBwYXJ0cyA9IHBhdHRlcm4ubWF0Y2gobmV3IFJlZ0V4cChcbiAgICAgICAgICAgIFJFR0VYUF9XSUxEQ0FSRF9NQVRDSEVSICtcbiAgICAgICAgICAgIHBhcnRzLmpvaW4oUkVHRVhQX1dJTERDQVJEX01BVENIRVIpICArXG4gICAgICAgICAgICBSRUdFWFBfV0lMRENBUkRfTUFUQ0hFUlxuICAgICAgICApKTtcblxuICAgICAgICAvLyBEaXNjYXJkIGZpcnN0IG1hdGNoIG9mIG5vbi1nbG9iYWwgc2VhcmNoICh3aGljaCBpcyB0aGUgd2hvbGUgc3RyaW5nKVxuICAgICAgICBwYXJ0cy5zaGlmdCgpO1xuXG4gICAgICAgIC8vIEZvciBlYWNoIHJlLWZvdW5kIHBhdHRlcm4gcGFydCwgdHJhbnNsYXRlICUgYW5kIF8gdG8gcmVnZXggZXF1aXZhbGVudFxuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgcGFydHMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgICAgIHZhciBwYXJ0ID0gcGFydHNbaV07XG4gICAgICAgICAgICBzd2l0Y2ggKHBhcnQpIHtcbiAgICAgICAgICAgICAgICBjYXNlIExJS0VfV0lMRENBUkQ6IHBhcnQgPSBSRUdFWFBfV0lMRENBUkQ7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgTElLRV9XSUxEQ0hBUjogcGFydCA9IFJFR0VYUF9XSUxEQ0hBUjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgdmFyIGogPSBwYXJ0WzFdID09PSAnXicgPyAyIDogMTtcbiAgICAgICAgICAgICAgICAgICAgcGFydCA9ICdbJyArIHJlZ0V4cExJS0UucmVzZXJ2ZShwYXJ0LnN1YnN0cihqLCBwYXJ0Lmxlbmd0aCAtIChqICsgMSkpKSArICddJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhcnRzW2ldID0gcGFydDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnRzID0gW3BhdHRlcm5dO1xuICAgIH1cblxuICAgIC8vIEZvciBlYWNoIHN1cnJvdW5kaW5nIHRleHQgcGFydCwgZXNjYXBlIHJlc2VydmVkIHJlZ2V4IGNoYXJzXG4gICAgZm9yIChpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgIHBhcnRzW2ldID0gcmVnRXhwTElLRS5yZXNlcnZlKHBhcnRzW2ldKTtcbiAgICB9XG5cbiAgICAvLyBKb2luIGFsbCB0aGUgaW50ZXJsZWF2ZWQgcGFydHNcbiAgICBwYXJ0cyA9IHBhcnRzLmpvaW4oJycpO1xuXG4gICAgLy8gT3B0aW1pemUgb3IgYW5jaG9yIHRoZSBwYXR0ZXJuIGF0IGVhY2ggZW5kIGFzIG5lZWRlZFxuICAgIGlmIChwYXJ0cy5zdWJzdHIoMCwgMikgPT09IFJFR0VYUF9XSUxEQ0FSRCkgeyBwYXJ0cyA9IHBhcnRzLnN1YnN0cigyKTsgfSBlbHNlIHsgcGFydHMgPSAnXicgKyBwYXJ0czsgfVxuICAgIGlmIChwYXJ0cy5zdWJzdHIoLTIsIDIpID09PSBSRUdFWFBfV0lMRENBUkQpIHsgcGFydHMgPSBwYXJ0cy5zdWJzdHIoMCwgcGFydHMubGVuZ3RoIC0gMik7IH0gZWxzZSB7IHBhcnRzICs9ICckJzsgfVxuXG4gICAgLy8gUmV0dXJuIHRoZSBuZXcgcmVnZXhcbiAgICByZXR1cm4gbmV3IFJlZ0V4cChwYXJ0cywgaWdub3JlQ2FzZSA/ICdpJyA6IHVuZGVmaW5lZCk7XG59XG5cbnJlZ0V4cExJS0UucmVzZXJ2ZSA9IGZ1bmN0aW9uIChzKSB7XG4gICAgcmV0dXJuIHMucmVwbGFjZShyZXNlcnZlZCwgJ1xcXFwkMScpO1xufTtcblxudmFyIGNhY2hlLCBzaXplO1xuXG4vKipcbiAqIEBzdW1tYXJ5IERlbGV0ZSBhIHBhdHRlcm4gZnJvbSB0aGUgY2FjaGU7IG9yIGNsZWFyIHRoZSB3aG9sZSBjYWNoZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbcGF0dGVybl0gLSBUaGUgTElLRSBwYXR0ZXJuIHRvIHJlbW92ZSBmcm9tIHRoZSBjYWNoZS4gRmFpbHMgc2lsZW50bHkgaWYgbm90IGZvdW5kIGluIHRoZSBjYWNoZS4gSWYgcGF0dGVybiBvbWl0dGVkLCBjbGVhcnMgd2hvbGUgY2FjaGUuXG4gKi9cbihyZWdFeHBMSUtFLmNsZWFyQ2FjaGUgPSBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIGlmICghcGF0dGVybikge1xuICAgICAgICBjYWNoZSA9IHt9O1xuICAgICAgICBzaXplID0gMDtcbiAgICB9IGVsc2UgaWYgKGNhY2hlW3BhdHRlcm5dKSB7XG4gICAgICAgIGRlbGV0ZSBjYWNoZVtwYXR0ZXJuXTtcbiAgICAgICAgc2l6ZS0tO1xuICAgIH1cbiAgICByZXR1cm4gc2l6ZTtcbn0pKCk7IC8vIGluaXQgdGhlIGNhY2hlXG5cbnJlZ0V4cExJS0UuZ2V0Q2FjaGVTaXplID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gc2l6ZTsgfTtcblxuLyoqXG4gKiBAc3VtbWFyeSBDYWNoZWQgdmVyc2lvbiBvZiBgcmVnRXhwTElLRSgpYC5cbiAqIEBkZXNjIENhY2hlZCBlbnRyaWVzIGFyZSBzdWJqZWN0IHRvIGdhcmJhZ2UgY29sbGVjdGlvbiBpZiBga2VlcGAgaXMgYHVuZGVmaW5lZGAgb3IgYGZhbHNlYCBvbiBpbnNlcnRpb24gb3IgYGZhbHNlYCBvbiBtb3N0IHJlY2VudCByZWZlcmVuY2UuIEdhcmJhZ2UgY29sbGVjdGlvbiB3aWxsIG9jY3VyIGlmZiBgcmVnRXhwTElLRS5jYWNoZU1heGAgaXMgZGVmaW5lZCBhbmQgaXQgZXF1YWxzIHRoZSBudW1iZXIgb2YgY2FjaGVkIHBhdHRlcm5zLiBUaGUgZ2FyYmFnZSBjb2xsZWN0b3Igc29ydHMgdGhlIHBhdHRlcm5zIGJhc2VkIG9uIG1vc3QgcmVjZW50IHJlZmVyZW5jZTsgdGhlIG9sZGVzdCAxMCUgb2YgdGhlIGVudHJpZXMgYXJlIGRlbGV0ZWQuIEFsdGVybmF0aXZlbHksIHlvdSBjYW4gbWFuYWdlIHRoZSBjYWNoZSB5b3Vyc2VsZiB0byBhIGxpbWl0ZWQgZXh0ZW50IChzZWUge0BsaW5rIHJlZ2VFeHBMSUtFLmNsZWFyQ2FjaGV8Y2xlYXJDYWNoZX0pLlxuICogQHBhcmFtIHBhdHRlcm4gLSB0aGUgTElLRSBwYXR0ZXJuICh0byBiZSkgY29udmVydGVkIHRvIGEgUmVnRXhwXG4gKiBAcGFyYW0gW2tlZXBdIC0gSWYgZ2l2ZW4sIGNoYW5nZXMgdGhlIGtlZXAgc3RhdHVzIGZvciB0aGlzIHBhdHRlcm4gYXMgZm9sbG93czpcbiAqICogYHRydWVgIHBlcm1hbmVudGx5IGNhY2hlcyB0aGUgcGF0dGVybiAobm90IHN1YmplY3QgdG8gZ2FyYmFnZSBjb2xsZWN0aW9uKSB1bnRpbCBgZmFsc2VgIGlzIGdpdmVuIG9uIGEgc3Vic2VxdWVudCBjYWxsXG4gKiAqIGBmYWxzZWAgYWxsb3dzIGdhcmJhZ2UgY29sbGVjdGlvbiBvbiB0aGUgY2FjaGVkIHBhdHRlcm5cbiAqICogYHVuZGVmaW5lZGAgbm8gY2hhbmdlIHRvIGtlZXAgc3RhdHVzXG4gKiBAcmV0dXJucyB7UmVnRXhwfVxuICovXG5yZWdFeHBMSUtFLmNhY2hlZCA9IGZ1bmN0aW9uIChrZWVwLCBwYXR0ZXJuLCBpZ25vcmVDYXNlKSB7XG4gICAgaWYgKHR5cGVvZiBrZWVwID09PSAnc3RyaW5nJykge1xuICAgICAgICBpZ25vcmVDYXNlID0gcGF0dGVybjtcbiAgICAgICAgcGF0dGVybiA9IGtlZXA7XG4gICAgICAgIGtlZXAgPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIHBhdHRlcm5BbmRDYXNlID0gcGF0dGVybiArIChpZ25vcmVDYXNlID8gJ2knIDogJ2MnKSxcbiAgICAgICAgaXRlbSA9IGNhY2hlW3BhdHRlcm5BbmRDYXNlXTtcbiAgICBpZiAoaXRlbSkge1xuICAgICAgICBpdGVtLndoZW4gPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgaWYgKGtlZXAgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaXRlbS5rZWVwID0ga2VlcDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChzaXplID09PSByZWdFeHBMSUtFLmNhY2hlTWF4KSB7XG4gICAgICAgICAgICB2YXIgYWdlID0gW10sIGFnZXMgPSAwLCBrZXksIGk7XG4gICAgICAgICAgICBmb3IgKGtleSBpbiBjYWNoZSkge1xuICAgICAgICAgICAgICAgIGl0ZW0gPSBjYWNoZVtrZXldO1xuICAgICAgICAgICAgICAgIGlmICghaXRlbS5rZWVwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBhZ2VzOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLndoZW4gPCBhZ2VbaV0uaXRlbS53aGVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYWdlLnNwbGljZShpLCAwLCB7IGtleToga2V5LCBpdGVtOiBpdGVtIH0pO1xuICAgICAgICAgICAgICAgICAgICBhZ2VzKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFhZ2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlZ0V4cExJS0UocGF0dGVybiwgaWdub3JlQ2FzZSk7IC8vIGNhY2hlIGlzIGZ1bGwhXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpID0gTWF0aC5jZWlsKGFnZS5sZW5ndGggLyAxMCk7IC8vIHdpbGwgYWx3YXlzIGJlIGF0IGxlYXN0IDFcbiAgICAgICAgICAgIHNpemUgLT0gaTtcbiAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgY2FjaGVbYWdlW2ldLmtleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXRlbSA9IGNhY2hlW3BhdHRlcm5BbmRDYXNlXSA9IHtcbiAgICAgICAgICAgIHJlZ2V4OiByZWdFeHBMSUtFKHBhdHRlcm4sIGlnbm9yZUNhc2UpLFxuICAgICAgICAgICAga2VlcDoga2VlcCxcbiAgICAgICAgICAgIHdoZW46IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gICAgICAgIH07XG4gICAgICAgIHNpemUrKztcbiAgICB9XG4gICAgcmV0dXJuIGl0ZW0ucmVnZXg7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlZ0V4cExJS0U7XG4iLCIvLyB0ZW1wbGV4IG5vZGUgbW9kdWxlXG4vLyBodHRwczovL2dpdGh1Yi5jb20vam9uZWl0L3RlbXBsZXhcblxuLyogZXNsaW50LWVudiBub2RlICovXG5cbi8qKlxuICogTWVyZ2VzIHZhbHVlcyBvZiBleGVjdXRpb24gY29udGV4dCBwcm9wZXJ0aWVzIG5hbWVkIGluIHRlbXBsYXRlIGJ5IHtwcm9wMX0sXG4gKiB7cHJvcDJ9LCBldGMuLCBvciBhbnkgamF2YXNjcmlwdCBleHByZXNzaW9uIGluY29ycG9yYXRpbmcgc3VjaCBwcm9wIG5hbWVzLlxuICogVGhlIGNvbnRleHQgYWx3YXlzIGluY2x1ZGVzIHRoZSBnbG9iYWwgb2JqZWN0LiBJbiBhZGRpdGlvbiB5b3UgY2FuIHNwZWNpZnkgYSBzaW5nbGVcbiAqIGNvbnRleHQgb3IgYW4gYXJyYXkgb2YgY29udGV4dHMgdG8gc2VhcmNoIChpbiB0aGUgb3JkZXIgZ2l2ZW4pIGJlZm9yZSBmaW5hbGx5XG4gKiBzZWFyY2hpbmcgdGhlIGdsb2JhbCBjb250ZXh0LlxuICpcbiAqIE1lcmdlIGV4cHJlc3Npb25zIGNvbnNpc3Rpbmcgb2Ygc2ltcGxlIG51bWVyaWMgdGVybXMsIHN1Y2ggYXMgezB9LCB7MX0sIGV0Yy4sIGRlcmVmXG4gKiB0aGUgZmlyc3QgY29udGV4dCBnaXZlbiwgd2hpY2ggaXMgYXNzdW1lZCB0byBiZSBhbiBhcnJheS4gQXMgYSBjb252ZW5pZW5jZSBmZWF0dXJlLFxuICogaWYgYWRkaXRpb25hbCBhcmdzIGFyZSBnaXZlbiBhZnRlciBgdGVtcGxhdGVgLCBgYXJndW1lbnRzYCBpcyB1bnNoaWZ0ZWQgb250byB0aGUgY29udGV4dFxuICogYXJyYXksIHRodXMgbWFraW5nIGZpcnN0IGFkZGl0aW9uYWwgYXJnIGF2YWlsYWJsZSBhcyB7MX0sIHNlY29uZCBhcyB7Mn0sIGV0Yy4sIGFzIGluXG4gKiBgdGVtcGxleCgnSGVsbG8sIHsxfSEnLCAnV29ybGQnKWAuICh7MH0gaXMgdGhlIHRlbXBsYXRlIHNvIGNvbnNpZGVyIHRoaXMgdG8gYmUgMS1iYXNlZC4pXG4gKlxuICogSWYgeW91IHByZWZlciBzb21ldGhpbmcgb3RoZXIgdGhhbiBicmFjZXMsIHJlZGVmaW5lIGB0ZW1wbGV4LnJlZ2V4cGAuXG4gKlxuICogU2VlIHRlc3RzIGZvciBleGFtcGxlcy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGVtcGxhdGVcbiAqIEBwYXJhbSB7Li4uc3RyaW5nfSBbYXJnc11cbiAqL1xuZnVuY3Rpb24gdGVtcGxleCh0ZW1wbGF0ZSkge1xuICAgIHZhciBjb250ZXh0cyA9IHRoaXMgaW5zdGFuY2VvZiBBcnJheSA/IHRoaXMgOiBbdGhpc107XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7IGNvbnRleHRzLnVuc2hpZnQoYXJndW1lbnRzKTsgfVxuICAgIHJldHVybiB0ZW1wbGF0ZS5yZXBsYWNlKHRlbXBsZXgucmVnZXhwLCB0ZW1wbGV4Lm1lcmdlci5iaW5kKGNvbnRleHRzKSk7XG59XG5cbnRlbXBsZXgucmVnZXhwID0gL1xceyguKj8pXFx9L2c7XG5cbnRlbXBsZXgud2l0aCA9IGZ1bmN0aW9uIChpLCBzKSB7XG4gICAgcmV0dXJuICd3aXRoKHRoaXNbJyArIGkgKyAnXSl7JyArIHMgKyAnfSc7XG59O1xuXG50ZW1wbGV4LmNhY2hlID0gW107XG5cbnRlbXBsZXguZGVyZWYgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgaWYgKCEodGhpcy5sZW5ndGggaW4gdGVtcGxleC5jYWNoZSkpIHtcbiAgICAgICAgdmFyIGNvZGUgPSAncmV0dXJuIGV2YWwoZXhwciknO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgY29kZSA9IHRlbXBsZXgud2l0aChpLCBjb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRlbXBsZXguY2FjaGVbdGhpcy5sZW5ndGhdID0gZXZhbCgnKGZ1bmN0aW9uKGV4cHIpeycgKyBjb2RlICsgJ30pJyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZXZhbFxuICAgIH1cbiAgICByZXR1cm4gdGVtcGxleC5jYWNoZVt0aGlzLmxlbmd0aF0uY2FsbCh0aGlzLCBrZXkpO1xufTtcblxudGVtcGxleC5tZXJnZXIgPSBmdW5jdGlvbiAobWF0Y2gsIGtleSkge1xuICAgIC8vIEFkdmFuY2VkIGZlYXR1cmVzOiBDb250ZXh0IGNhbiBiZSBhIGxpc3Qgb2YgY29udGV4dHMgd2hpY2ggYXJlIHNlYXJjaGVkIGluIG9yZGVyLlxuICAgIHZhciByZXBsYWNlbWVudDtcblxuICAgIHRyeSB7XG4gICAgICAgIHJlcGxhY2VtZW50ID0gaXNOYU4oa2V5KSA/IHRlbXBsZXguZGVyZWYuY2FsbCh0aGlzLCBrZXkpIDogdGhpc1swXVtrZXldO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVwbGFjZW1lbnQgPSAneycgKyBrZXkgKyAnfSc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcGxhY2VtZW50O1xufTtcblxuLy8gdGhpcyBpbnRlcmZhY2UgY29uc2lzdHMgc29sZWx5IG9mIHRoZSB0ZW1wbGV4IGZ1bmN0aW9uIChhbmQgaXQncyBwcm9wZXJ0aWVzKVxubW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGV4O1xuIiwiLy8gQ3JlYXRlZCBieSBKb25hdGhhbiBFaXRlbiBvbiAxLzcvMTYuXG5cbid1c2Ugc3RyaWN0JztcblxuXG4vKipcbiAqIEBzdW1tYXJ5IFdhbGsgYSBoaWVyYXJjaGljYWwgb2JqZWN0IGFzIEpTT04uc3RyaW5naWZ5IGRvZXMgYnV0IHdpdGhvdXQgc2VyaWFsaXppbmcuXG4gKlxuICogQGRlc2MgVXNhZ2U6XG4gKiAqIHZhciBteURpc3RpbGxlZE9iamVjdCA9IHVuc3RydW5naWZ5LmNhbGwobXlPYmplY3QpO1xuICogKiB2YXIgbXlEaXN0aWxsZWRPYmplY3QgPSBteUFwaS5nZXRTdGF0ZSgpOyAvLyB3aGVyZSBteUFwaS5wcm90b3R5cGUuZ2V0U3RhdGUgPSB1bnN0cnVuZ2lmeVxuICpcbiAqIFJlc3VsdCBlcXVpdmFsZW50IHRvIGBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMpKWAuXG4gKlxuICogPiBEbyBub3QgdXNlIHRoaXMgZnVuY3Rpb24gdG8gZ2V0IGEgSlNPTiBzdHJpbmc7IHVzZSBgSlNPTi5zdHJpbmdpZnkodGhpcylgIGluc3RlYWQuXG4gKlxuICogQHRoaXMgeyp8b2JqZWN0fCpbXX0gLSBPYmplY3QgdG8gd2FsazsgdHlwaWNhbGx5IGFuIG9iamVjdCBvciBhcnJheS5cbiAqXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnByZXNlcnZlPWZhbHNlXSAtIFByZXNlcnZlIHVuZGVmaW5lZCBhcnJheSBlbGVtZW50cyBhcyBgbnVsbGBzLlxuICogVXNlIHRoaXMgd2hlbiBwcmVjaXNlIGluZGV4IG1hdHRlcnMgKG5vdCBtZXJlbHkgdGhlIG9yZGVyIG9mIHRoZSBlbGVtZW50cykuXG4gKlxuICogQHJldHVybnMge29iamVjdH0gLSBEaXN0aWxsZWQgb2JqZWN0LlxuICovXG5mdW5jdGlvbiB1bnN0cnVuZ2lmeShvcHRpb25zKSB7XG4gICAgdmFyIGNsb25lLCB2YWx1ZSxcbiAgICAgICAgb2JqZWN0ID0gKHR5cGVvZiB0aGlzLnRvSlNPTiA9PT0gJ2Z1bmN0aW9uJykgPyB0aGlzLnRvSlNPTigpIDogdGhpcyxcbiAgICAgICAgcHJlc2VydmUgPSBvcHRpb25zICYmIG9wdGlvbnMucHJlc2VydmU7XG5cbiAgICBpZiAodW5zdHJ1bmdpZnkuaXNBcnJheShvYmplY3QpKSB7XG4gICAgICAgIGNsb25lID0gW107XG4gICAgICAgIG9iamVjdC5mb3JFYWNoKGZ1bmN0aW9uKG9iaikge1xuICAgICAgICAgICAgdmFsdWUgPSB1bnN0cnVuZ2lmeS5jYWxsKG9iaik7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNsb25lLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmVzZXJ2ZSkge1xuICAgICAgICAgICAgICAgIGNsb25lLnB1c2gobnVsbCk7IC8vIHVuZGVmaW5lZCBub3QgYSB2YWxpZCBKU09OIHZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSAgaWYgKHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNsb25lID0ge307XG4gICAgICAgIE9iamVjdC5rZXlzKG9iamVjdCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdW5zdHJ1bmdpZnkuY2FsbChvYmplY3Rba2V5XSk7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNsb25lW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2xvbmUgPSBvYmplY3Q7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsb25lO1xufVxuXG4vKipcbiAqIFZlcnkgZmFzdCBhcnJheSB0ZXN0LlxuICogRm9yIGNyb3NzLWZyYW1lIHNjcmlwdGluZzsgdXNlIGBjcm9zc0ZyYW1lc0lzQXJyYXlgIGluc3RlYWQuXG4gKiBAcGFyYW0geyp9IGFyciAtIFRoZSBvYmplY3QgdG8gdGVzdC5cbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5KGFycikgeyByZXR1cm4gYXJyLmNvbnN0cnVjdG9yID09PSBBcnJheTsgfVxudW5zdHJ1bmdpZnkuaXNBcnJheSA9IGlzQXJyYXk7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsIGFyclN0cmluZyA9ICdbb2JqZWN0IEFycmF5XSc7XG5cbi8qKlxuICogVmVyeSBzbG93IGFycmF5IHRlc3QuIFN1aXRhYmxlIGZvciBjcm9zcy1mcmFtZSBzY3JpcHRpbmcuXG4gKlxuICogU3VnZ2VzdGlvbjogSWYgeW91IG5lZWQgdGhpcyBhbmQgaGF2ZSBqUXVlcnkgbG9hZGVkLCB1c2UgYGpRdWVyeS5pc0FycmF5YCBpbnN0ZWFkIHdoaWNoIGlzIHJlYXNvbmFibHkgZmFzdC5cbiAqXG4gKiBAcGFyYW0geyp9IGFyciAtIFRoZSBvYmplY3QgdG8gdGVzdC5cbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBjcm9zc0ZyYW1lc0lzQXJyYXkoYXJyKSB7IHJldHVybiB0b1N0cmluZy5jYWxsKGFycikgPT09IGFyclN0cmluZzsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVudXNlZC12YXJzXG5cbm1vZHVsZS5leHBvcnRzID0gdW5zdHJ1bmdpZnk7XG4iLCIvKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuLy8gVGhpcyBpcyB0aGUgbWFpbiBmaWxlLCB1c2FibGUgYXMgaXMsIHN1Y2ggYXMgYnkgL3Rlc3QvaW5kZXguanMuXG4vLyBGb3IgbnBtOiByZXF1aXJlIHRoaXMgZmlsZVxuLy8gRm9yIENETjogZ3VscGZpbGUuanMgYnJvd3NlcmlmaWVzIHRoaXMgZmlsZSB3aXRoIHNvdXJjZW1hcCB0byAvYnVpbGQvZmlsdGVyLXRyZWUuanMgYW5kIHVnbGlmaWVkIHdpdGhvdXQgc291cmNlbWFwIHRvIC9idWlsZC9maWx0ZXItdHJlZS5taW4uanMuIFRoZSBDRE4gaXMgaHR0cHM6Ly9qb25laXQuZ2l0aHViLmlvL2ZpbHRlci10cmVlLlxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1bnN0cnVuZ2lmeSA9IHJlcXVpcmUoJ3Vuc3RydW5naWZ5Jyk7XG5cbnZhciBjc3NJbmplY3RvciA9IHJlcXVpcmUoJy4vanMvY3NzJyk7XG52YXIgRmlsdGVyTm9kZSA9IHJlcXVpcmUoJy4vanMvRmlsdGVyTm9kZScpO1xudmFyIFRlcm1pbmFsTm9kZSA9IHJlcXVpcmUoJy4vanMvRmlsdGVyTGVhZicpO1xudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi9qcy90ZW1wbGF0ZScpO1xudmFyIG9wZXJhdG9ycyA9IHJlcXVpcmUoJy4vanMvdHJlZS1vcGVyYXRvcnMnKTtcblxudmFyIG9yZGluYWwgPSAwO1xudmFyIHJlRmlsdGVyVHJlZUVycm9yU3RyaW5nID0gL15maWx0ZXItdHJlZTogLztcblxuLyoqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBzdW1tYXJ5IEEgbm9kZSBpbiBhIGZpbHRlciB0cmVlIChpbmNsdWRpbmcgdGhlIHJvb3Qgbm9kZSksIHJlcHJlc2VudGluZyBhIGNvbXBsZXggZmlsdGVyIGV4cHJlc3Npb24uXG4gKlxuICogQGRlc2MgQSBgRmlsdGVyVHJlZWAgaXMgYW4gbi1hcnkgdHJlZSB3aXRoIGEgc2luZ2xlIGBvcGVyYXRvcmAgdG8gYmUgYXBwbGllZCB0byBhbGwgaXRzIGBjaGlsZHJlbmAuXG4gKlxuICogQWxzbyBrbm93biBhcyBhIFwic3VidHJlZVwiIG9yIGEgXCJzdWJleHByZXNzaW9uXCIuXG4gKlxuICogRWFjaCBvZiB0aGUgYGNoaWxkcmVuYCBjYW4gYmUgZWl0aGVyOlxuICpcbiAqICogYSB0ZXJtaW5hbCBub2RlIGBGaWx0ZXJgIChvciBhbiBvYmplY3QgaW5oZXJpdGluZyBmcm9tIGBGaWx0ZXJgKSByZXByZXNlbnRpbmcgYSBzaW1wbGUgY29uZGl0aW9uYWwgZXhwcmVzc2lvbjsgb3JcbiAqICogYSBuZXN0ZWQgYEZpbHRlclRyZWVgIHJlcHJlc2VudGluZyBhIGNvbXBsZXggc3ViZXhwcmVzc2lvbi5cbiAqXG4gKiBUaGUgYG9wZXJhdG9yYCBtdXN0IGJlIG9uZSBvZiB0aGUge0BsaW5rIG9wZXJhdG9yc3x0cmVlIG9wZXJhdG9yc30gb3IgbWF5IGJlIGxlZnQgdW5kZWZpbmVkIGlmZiB0aGVyZSBpcyBvbmx5IG9uZSBjaGlsZCBub2RlLlxuICpcbiAqIE5vdGVzOlxuICogMS4gQSBgRmlsdGVyVHJlZWAgbWF5IGNvbnNpc3Qgb2YgYSBzaW5nbGUgbGVhZiwgaW4gd2hpY2ggY2FzZSB0aGUgYG9wZXJhdG9yYCBpcyBub3QgdXNlZCBhbmQgbWF5IGJlIGxlZnQgdW5kZWZpbmVkLiBIb3dldmVyLCBpZiBhIHNlY29uZCBjaGlsZCBpcyBhZGRlZCBhbmQgdGhlIG9wZXJhdG9yIGlzIHN0aWxsIHVuZGVmaW5lZCwgaXQgd2lsbCBiZSBzZXQgdG8gdGhlIGRlZmF1bHQgKGAnb3AtYW5kJ2ApLlxuICogMi4gVGhlIG9yZGVyIG9mIHRoZSBjaGlsZHJlbiBpcyB1bmRlZmluZWQgYXMgYWxsIG9wZXJhdG9ycyBhcmUgY29tbXV0YXRpdmUuIEZvciB0aGUgJ2BvcC1vcmAnIG9wZXJhdG9yLCBldmFsdWF0aW9uIGNlYXNlcyBvbiB0aGUgZmlyc3QgcG9zaXRpdmUgcmVzdWx0IGFuZCBmb3IgZWZmaWNpZW5jeSwgYWxsIHNpbXBsZSBjb25kaXRpb25hbCBleHByZXNzaW9ucyB3aWxsIGJlIGV2YWx1YXRlZCBiZWZvcmUgYW55IGNvbXBsZXggc3ViZXhwcmVzc2lvbnMuXG4gKiAzLiBBIG5lc3RlZCBgRmlsdGVyVHJlZWAgaXMgZGlzdGluZ3Vpc2hlZCBpbiB0aGUgSlNPTiBvYmplY3QgZnJvbSBhIGBGaWx0ZXJgIGJ5IHRoZSBwcmVzZW5jZSBvZiBhIGBjaGlsZHJlbmAgbWVtYmVyLlxuICogNC4gTmVzdGluZyBhIGBGaWx0ZXJUcmVlYCBjb250YWluaW5nIGEgc2luZ2xlIGNoaWxkIGlzIHZhbGlkIChhbGJlaXQgcG9pbnRsZXNzKS5cbiAqXG4gKiBTZWUge0BsaW5rIEZpbHRlck5vZGV9IGZvciBhZGRpdGlvbmFsIGBvcHRpb25zYCBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9ucy5lZGl0b3JzXSAtIEVkaXRvciBoYXNoIHRvIG92ZXJyaWRlIHByb3RvdHlwZSdzLiBUaGVzZSBhcmUgY29uc3RydWN0b3JzIGZvciBvYmplY3RzIHRoYXQgZXh0ZW5kIGZyb20gYEZpbHRlclRyZWUucHJvdG90eXBlLmVkaXRvcnMuRGVmYXVsdGAuIFR5cGljYWxseSwgeW91IHdvdWxkIGluY2x1ZGUgdGhlIGRlZmF1bHQgZWRpdG9yIGl0c2VsZjogYHsgRGVmYXVsdDogRmlsdGVyVHJlZS5wcm90b3R5cGUuZWRpdG9ycy5EZWZhdWx0LCAuLi4gfWAuIEFsdGVybmF0aXZlbHksIGJlZm9yZSBpbnN0YW50aWF0aW5nLCB5b3UgbWlnaHQgYWRkIHlvdXIgYWRkaXRpb25hbCBlZGl0b3JzIHRvIGBGaWx0ZXJUcmVlLnByb3RvdHlwZS5lZGl0b3JzYCBmb3IgdXNlIGJ5IGFsbCBmaWx0ZXIgdHJlZSBvYmplY3RzLlxuICpcbiAqIEBwcm9wZXJ0eSB7RmlsdGVyVHJlZX0gcGFyZW50XG4gKiBAcHJvcGVydHkge251bWJlcn0gb3JkaW5hbFxuICogQHByb3BlcnR5IHtzdHJpbmd9IG9wZXJhdG9yXG4gKiBAcHJvcGVydHkge0ZpbHRlck5vZGVbXX0gY2hpbGRyZW4gLSBFYWNoIG9uZSBpcyBlaXRoZXIgYSBgRmlsdGVyYCAob3IgYW4gb2JqZWN0IGluaGVyaXRpbmcgZnJvbSBgRmlsdGVyYCkgb3IgYW5vdGhlciBgRmlsdGVyVHJlZWAuLlxuICogQHByb3BlcnR5IHtFbGVtZW50fSBlbCAtIFRoZSByb290IGVsZW1lbnQgb2YgdGhpcyAoc3ViKXRyZWUuXG4gKi9cbnZhciBGaWx0ZXJUcmVlID0gRmlsdGVyTm9kZS5leHRlbmQoJ0ZpbHRlclRyZWUnLCB7XG5cbiAgICBwcmVJbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIGNzc0luamVjdG9yKCdmaWx0ZXItdHJlZS1iYXNlJywgb3B0aW9ucyAmJiBvcHRpb25zLmNzc1N0eWxlc2hlZXRSZWZlcmVuY2VFbGVtZW50KTtcblxuICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmVkaXRvcnMpIHtcbiAgICAgICAgICAgIHRoaXMuZWRpdG9ycyA9IG9wdGlvbnMuZWRpdG9ycztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICAgICAgZGV0YWNoQ2hvb3Nlci5jYWxsKHRoaXMpO1xuICAgIH0sXG5cbiAgICBlZGl0b3JzOiB7XG4gICAgICAgIERlZmF1bHQ6IFRlcm1pbmFsTm9kZVxuICAgIH0sXG5cbiAgICBhZGRFZGl0b3I6IGZ1bmN0aW9uKGtleSwgb3ZlcnJpZGVzKSB7XG4gICAgICAgIGlmIChvdmVycmlkZXMpIHtcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yc1trZXldID0gVGVybWluYWxOb2RlLmV4dGVuZChvdmVycmlkZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZWRpdG9yc1trZXldO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZVZpZXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmVsID0gdGVtcGxhdGUodGhpcy5pc0NvbHVtbkZpbHRlcnMgPyAnY29sdW1uRmlsdGVycycgOiAndHJlZScsICsrb3JkaW5hbCk7XG4gICAgICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYXRjaENsaWNrLmJpbmQodGhpcykpO1xuICAgIH0sXG5cbiAgICBsb2FkU3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc3RhdGUgPSB0aGlzLnN0YXRlO1xuXG4gICAgICAgIHRoaXMub3BlcmF0b3IgPSAnb3AtYW5kJztcbiAgICAgICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuXG4gICAgICAgIGlmICghc3RhdGUpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvd0lmSlNPTihzdGF0ZSk7XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIGBzdGF0ZS5jaGlsZHJlbmAgKHJlcXVpcmVkKVxuICAgICAgICAgICAgaWYgKCEoc3RhdGUuY2hpbGRyZW4gaW5zdGFuY2VvZiBBcnJheSAmJiBzdGF0ZS5jaGlsZHJlbi5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgRmlsdGVyTm9kZS5FcnJvcignRXhwZWN0ZWQgYGNoaWxkcmVuYCBwcm9wZXJ0eSB0byBiZSBhIG5vbi1lbXB0eSBhcnJheS4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgYHN0YXRlLm9wZXJhdG9yYCAoaWYgZ2l2ZW4pXG4gICAgICAgICAgICBpZiAoc3RhdGUub3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9wZXJhdG9yc1tzdGF0ZS5vcGVyYXRvcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRmlsdGVyTm9kZS5FcnJvcignRXhwZWN0ZWQgYG9wZXJhdG9yYCBwcm9wZXJ0eSB0byBiZSBvbmUgb2Y6ICcgKyBPYmplY3Qua2V5cyhvcGVyYXRvcnMpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLm9wZXJhdG9yID0gc3RhdGUub3BlcmF0b3I7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN0YXRlLmNoaWxkcmVuLmZvckVhY2godGhpcy5hZGQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gc2ltdWxhdGUgY2xpY2sgb24gdGhlIG9wZXJhdG9yIHRvIGRpc3BsYXkgc3RyaWtlLXRocm91Z2ggYW5kIG9wZXJhdG9yIGJldHdlZW4gZmlsdGVyc1xuICAgICAgICB2YXIgcmFkaW9CdXR0b24gPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3ZhbHVlPScgKyB0aGlzLm9wZXJhdG9yICsgJ10nKSxcbiAgICAgICAgICAgIGFkZEZpbHRlckxpbmsgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJy5maWx0ZXItdHJlZS1hZGQtZmlsdGVyJyk7XG5cbiAgICAgICAgaWYgKHJhZGlvQnV0dG9uKSB7XG4gICAgICAgICAgICByYWRpb0J1dHRvbi5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXNbJ2ZpbHRlci10cmVlLW9wLWNob2ljZSddKHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHJhZGlvQnV0dG9uXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHdoZW4gbXVsdGlwbGUgZmlsdGVyIGVkaXRvcnMgYXZhaWxhYmxlLCBzaW11bGF0ZSBjbGljayBvbiB0aGUgbmV3IFwiYWRkIGNvbmRpdGlvbmFsXCIgbGlua1xuICAgICAgICBpZiAoYWRkRmlsdGVyTGluayAmJiAhdGhpcy5jaGlsZHJlbi5sZW5ndGggJiYgT2JqZWN0LmtleXModGhpcy5lZGl0b3JzKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0aGlzWydmaWx0ZXItdHJlZS1hZGQtZmlsdGVyJ10oe1xuICAgICAgICAgICAgICAgIHRhcmdldDogYWRkRmlsdGVyTGlua1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwcm9jZWVkIHdpdGggcmVuZGVyXG4gICAgICAgIEZpbHRlck5vZGUucHJvdG90eXBlLnJlbmRlci5jYWxsKHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IG5vZGUgYXMgcGVyIGBzdGF0ZWAuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtzdGF0ZV1cbiAgICAgKiAqIElmIGBzdGF0ZWAgaGFzIGEgYGNoaWxkcmVuYCBwcm9wZXJ0eSwgd2lsbCBhdHRlbXB0IHRvIGFkZCBhIG5ldyBzdWJ0cmVlLlxuICAgICAqICogSWYgYHN0YXRlYCBoYXMgYW4gYGVkaXRvcmAgcHJvcGVydHksIHdpbGwgY3JlYXRlIG9uZSAoYHRoaXMuZWRpdG9yc1tzdGF0ZS5lZGl0b3JdYCkuXG4gICAgICogKiBJZiBgc3RhdGVgIGhhcyBuZWl0aGVyIChvciB3YXMgb21pdHRlZCksIHdpbGwgY3JlYXRlIGEgbmV3IGRlZmF1bHQgZWRpdG9yIChgdGhpcy5lZGl0b3JzLkRlZmF1bHRgKS5cbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICAgIHZhciBDb25zdHJ1Y3RvcjtcblxuICAgICAgICBpZiAoc3RhdGUgJiYgc3RhdGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIENvbnN0cnVjdG9yID0gRmlsdGVyVHJlZTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSAmJiBzdGF0ZS5lZGl0b3IpIHtcbiAgICAgICAgICAgIENvbnN0cnVjdG9yID0gdGhpcy5lZGl0b3JzW3N0YXRlLmVkaXRvcl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBDb25zdHJ1Y3RvciA9IHRoaXMuZWRpdG9ycy5EZWZhdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jaGlsZHJlbi5wdXNoKG5ldyBDb25zdHJ1Y3Rvcih7XG4gICAgICAgICAgICBzdGF0ZTogc3RhdGUsXG4gICAgICAgICAgICBwYXJlbnQ6IHRoaXNcbiAgICAgICAgfSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZWFyY2ggdGhlIGV4cHJlc3Npb24gdHJlZSBmb3IgYSBub2RlIHdpdGggY2VydGFpbiBjaGFyYWN0ZXJpc3RpY3MgYXMgZGVzY3JpYmVkIGJ5IHRoZSB0eXBlIG9mIHNlYXJjaCAoYHR5cGVgKSBhbmQgdGhlIHNlYXJjaCBhcmdzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbdHlwZT0nZmluZCddIC0gTmFtZSBvZiBtZXRob2QgdG8gdXNlIG9uIHRlcm1pbmFsIG5vZGVzOyBjaGFyYWN0ZXJpemVzIHRoZSB0eXBlIG9mIHNlYXJjaC4gTXVzdCBleGlzdCBpbiB5b3VyIHRlcm1pbmFsIG5vZGUgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2RlZXA9ZmFsc2VdIC0gTXVzdCBiZSBleHBsaWNpdCBgdHJ1ZWAgb3IgYGZhbHNlYCAobm90IG1lcmVseSB0cnV0aHkgb3IgZmFsc3kpOyBvciBvbWl0dGVkLlxuICAgICAqIEBwYXJhbSB7Kn0gZmlyc3RTZWFyY2hBcmcgLSBNYXkgbm90IGJlIGJvb2xlYW4gdHlwZSAoYWNjb21tb2RhdGlvbiB0byBvdmVybG9hZCBsb2dpYykuXG4gICAgICogQHBhcmFtIHsuLi4qfSBbYWRkaXRpb25hbFNlYXJjaEFyZ3NdXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58RmlsdGVyTGVhZnxGaWx0ZXJUcmVlfVxuICAgICAqICogYGZhbHNlYCAtIE5vdCBmb3VuZC4gKGB0cnVlYCBpcyBuZXZlciByZXR1cm5lZC4pXG4gICAgICogKiBgRmlsdGVyTGVhZmAgKG9yIGluc3RhbmNlIG9mIGFuIG9iamVjdCBleHRlbmRlZCBmcm9tIHNhbWUpIC0gU291Z2h0IG5vZGUgKHR5cGljYWwpLlxuICAgICAqICogJ0ZpbHRlclRyZWVgIC0gU291Z2h0IG5vZGUgKHJhcmUpLlxuICAgICAqL1xuICAgIGZpbmQ6IGZ1bmN0aW9uIGZpbmQodHlwZSwgZGVlcCkge1xuICAgICAgICB2YXIgcmVzdWx0LCBuLCB0cmVlQXJncyA9IGFyZ3VtZW50cywgbGVhZkFyZ3M7XG5cbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgbiA9IDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuID0gMDtcbiAgICAgICAgICAgIGRlZXAgPSB0eXBlO1xuICAgICAgICAgICAgdHlwZSA9ICdmaW5kJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgZGVlcCA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICBuICs9IDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWVwID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBsZWFmQXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgbik7XG5cbiAgICAgICAgLy8gVE9ETzogRm9sbG93aW5nIGNvdWxkIGJlIGJyb2tlbiBvdXQgaW50byBzZXBhcmF0ZSBtZXRob2QgKGxpa2UgRmlsdGVyTGVhZilcbiAgICAgICAgaWYgKHR5cGUgPT09ICdmaW5kQnlFbCcgJiYgdGhpcy5lbCA9PT0gbGVhZkFyZ3NbMF0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gd2FsayB0cmVlIHJlY3Vyc2l2ZWx5LCBlbmRpbmcgb24gZGVmaW5lZCBgcmVzdWx0YCAoZmlyc3Qgbm9kZSBmb3VuZClcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hpbGRyZW4uZmluZChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkKSB7IC8vIG9ubHkgcmVjdXJzZSBvbiB1bmRlYWQgY2hpbGRyZW5cbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQgaW5zdGFuY2VvZiBUZXJtaW5hbE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYWx3YXlzIHJlY3Vyc2Ugb24gdGVybWluYWwgbm9kZXNcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gY2hpbGRbdHlwZV0uYXBwbHkoY2hpbGQsIGxlYWZBcmdzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRlZXAgJiYgY2hpbGQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgcmVjdXJzZSBvbiBzdWJ0cmVlcyBpZiBnb2luZyBgZGVlcGAgYW5kIG5vdCBjaGlsZGxlc3NcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZmluZC5hcHBseShjaGlsZCwgdHJlZUFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0OyAvLyB0cnV0aGluZXNzIGFib3J0cyBmaW5kIGxvb3AgaWYgc2V0IGFib3ZlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8ga2VlcCBnb2luZyAvLyBUT0RPOiBDb3VsZG4ndCB0aGlzIGp1c3QgYmUgXCJyZXR1cm4gcmVzdWx0XCIgbWFraW5nIHRoZSByZXR1cm4gYWJvdmUgdW5uZWNlc3Nhcnk/XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtb3AtY2hvaWNlJzogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHZhciByYWRpb0J1dHRvbiA9IGV2dC50YXJnZXQ7XG5cbiAgICAgICAgdGhpcy5vcGVyYXRvciA9IHJhZGlvQnV0dG9uLnZhbHVlO1xuXG4gICAgICAgIC8vIGRpc3BsYXkgc3RyaWtlLXRocm91Z2hcbiAgICAgICAgdmFyIHJhZGlvQnV0dG9ucyA9IHRoaXMuZWwucXVlcnlTZWxlY3RvckFsbCgnbGFiZWw+aW5wdXQuZmlsdGVyLXRyZWUtb3AtY2hvaWNlW25hbWU9JyArIHJhZGlvQnV0dG9uLm5hbWUgKyAnXScpO1xuICAgICAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChyYWRpb0J1dHRvbnMpLmZvckVhY2goZnVuY3Rpb24ocmFkaW9CdXR0b24pIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgICAgICAgIHJhZGlvQnV0dG9uLnBhcmVudEVsZW1lbnQuc3R5bGUudGV4dERlY29yYXRpb24gPSByYWRpb0J1dHRvbi5jaGVja2VkID8gJ25vbmUnIDogJ2xpbmUtdGhyb3VnaCc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGRpc3BsYXkgb3BlcmF0b3IgYmV0d2VlbiBmaWx0ZXJzIGJ5IGFkZGluZyBvcGVyYXRvciBzdHJpbmcgYXMgYSBDU1MgY2xhc3Mgb2YgdGhpcyB0cmVlXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvcGVyYXRvcnMpIHtcbiAgICAgICAgICAgIHRoaXMuZWwuY2xhc3NMaXN0LnJlbW92ZShrZXkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZWwuY2xhc3NMaXN0LmFkZCh0aGlzLm9wZXJhdG9yKTtcbiAgICB9LFxuXG4gICAgJ2ZpbHRlci10cmVlLWFkZC1maWx0ZXInOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuZWRpdG9ycykubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB0aGlzLmFkZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXR0YWNoQ2hvb3Nlci5jYWxsKHRoaXMsIGV2dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgJ2ZpbHRlci10cmVlLWFkZCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmNoaWxkcmVuLnB1c2gobmV3IEZpbHRlclRyZWUoe1xuICAgICAgICAgICAgcGFyZW50OiB0aGlzXG4gICAgICAgIH0pKTtcbiAgICB9LFxuXG4gICAgJ2ZpbHRlci10cmVlLXJlbW92ZSc6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICB0aGlzLnJlbW92ZShldnQudGFyZ2V0Lm5leHRFbGVtZW50U2libGluZywgdHJ1ZSk7XG4gICAgfSxcblxuICAgIC8qKiBSZW1vdmVzIGEgY2hpbGQgbm9kZSBhbmQgaXQncyAuZWw7IG9yIHZpY2UtdmVyc2FcbiAgICAgKiBAcGFyYW0ge0VsZW1lbnR8RmlsdGVyTm9kZX0gbm9kZVxuICAgICAqL1xuICAgIHJlbW92ZTogZnVuY3Rpb24obm9kZSwgZGVlcCkge1xuICAgICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICAgICAgICAgIG5vZGUgPSB0aGlzLmZpbmQoJ2ZpbmRCeUVsJywgISFkZWVwLCBub2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNoaWxkcmVuW3RoaXMuY2hpbGRyZW4uaW5kZXhPZihub2RlKV07XG5cbiAgICAgICAgbm9kZS5lbC5wYXJlbnRFbGVtZW50LnJlbW92ZShub2RlLmVsKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb2JqZWN0LnJldGhyb3c9ZmFsc2VdIC0gQ2F0Y2ggKGRvIG5vdCB0aHJvdykgdGhlIGVycm9yLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29iamVjdC5hbGVydD10cnVlXSAtIEFubm91bmNlIGVycm9yIHZpYSB3aW5kb3cuYWxlcnQoKSBiZWZvcmUgcmV0dXJuaW5nLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29iamVjdC5mb2N1cz10cnVlXSAtIFBsYWNlIHRoZSBmb2N1cyBvbiB0aGUgb2ZmZW5kaW5nIGNvbnRyb2wgYW5kIGdpdmUgaXQgZXJyb3IgY29sb3IuXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZHxzdHJpbmd9IGB1bmRlZmluZWRgIG1lYW5zIHZhbGlkIG9yIHN0cmluZyBjb250YWluaW5nIGVycm9yIG1lc3NhZ2UuXG4gICAgICovXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgdmFyIGFsZXJ0ID0gb3B0aW9ucy5hbGVydCA9PT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMuYWxlcnQsXG4gICAgICAgICAgICByZXRocm93ID0gb3B0aW9ucy5yZXRocm93ID09PSB0cnVlLFxuICAgICAgICAgICAgcmVzdWx0O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YWxpZGF0ZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGVyci5tZXNzYWdlO1xuXG4gICAgICAgICAgICAvLyBUaHJvdyB3aGVuIG5vdCBhIGZpbHRlciB0cmVlIGVycm9yXG4gICAgICAgICAgICBpZiAocmV0aHJvdyB8fCAhcmVGaWx0ZXJUcmVlRXJyb3JTdHJpbmcudGVzdChyZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYWxlcnQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHQucmVwbGFjZShyZUZpbHRlclRyZWVFcnJvclN0cmluZywgJycpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hbGVydChyZXN1bHQpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWFsZXJ0XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICB0ZXN0OiBmdW5jdGlvbiB0ZXN0KGRhdGFSb3cpIHtcbiAgICAgICAgdmFyIG9wZXJhdG9yID0gb3BlcmF0b3JzW3RoaXMub3BlcmF0b3JdLFxuICAgICAgICAgICAgcmVzdWx0ID0gb3BlcmF0b3Iuc2VlZCxcbiAgICAgICAgICAgIG5vQ2hpbGRyZW5EZWZpbmVkID0gdHJ1ZTtcblxuICAgICAgICB0aGlzLmNoaWxkcmVuLmZpbmQoZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICAgICAgICAgIG5vQ2hpbGRyZW5EZWZpbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgVGVybWluYWxOb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG9wZXJhdG9yLnJlZHVjZShyZXN1bHQsIGNoaWxkLnRlc3QoZGF0YVJvdykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hpbGQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG9wZXJhdG9yLnJlZHVjZShyZXN1bHQsIHRlc3QuY2FsbChjaGlsZCwgZGF0YVJvdykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0ID09PSBvcGVyYXRvci5hYm9ydDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gbm9DaGlsZHJlbkRlZmluZWQgfHwgKG9wZXJhdG9yLm5lZ2F0ZSA/ICFyZXN1bHQgOiByZXN1bHQpO1xuICAgIH0sXG5cbiAgICBzZXRKU09OOiBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoSlNPTi5wYXJzZShqc29uKSk7XG4gICAgfSxcblxuICAgIGdldFN0YXRlOiB1bnN0cnVuZ2lmeSxcblxuICAgIGdldEpTT046IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVhZHkgPSBKU09OLnN0cmluZ2lmeSh0aGlzLCBudWxsLCB0aGlzLkpTT05zcGFjZSk7XG4gICAgICAgIHJldHVybiByZWFkeSA/IHJlYWR5IDogJyc7XG4gICAgfSxcblxuICAgIHRvSlNPTjogZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICB2YXIgc3RhdGUgPSB7XG4gICAgICAgICAgICBvcGVyYXRvcjogdGhpcy5vcGVyYXRvcixcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgVGVybWluYWxOb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLmNoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hpbGQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWFkeSA9IHRvSlNPTi5jYWxsKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkLmlzQ29sdW1uRmlsdGVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZHkuaXNDb2x1bW5GaWx0ZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGQuZmllbGRzICE9PSBjaGlsZC5wYXJlbnQuZmllbGRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkeS5maWVsZHMgPSBjaGlsZC5maWVsZHM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5jaGlsZHJlbi5wdXNoKHJlYWR5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIG1ldGFkYXRhID0gRmlsdGVyTm9kZS5wcm90b3R5cGUudG9KU09OLmNhbGwodGhpcyk7XG4gICAgICAgIE9iamVjdC5rZXlzKG1ldGFkYXRhKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgc3RhdGVba2V5XSA9IG1ldGFkYXRhW2tleV07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzdGF0ZS5jaGlsZHJlbi5sZW5ndGggPyBzdGF0ZSA6IHVuZGVmaW5lZDtcbiAgICB9LFxuXG4gICAgZ2V0U3FsV2hlcmVDbGF1c2U6IGZ1bmN0aW9uIGdldFNxbFdoZXJlQ2xhdXNlKCkge1xuICAgICAgICB2YXIgbGV4ZW1lID0gb3BlcmF0b3JzW3RoaXMub3BlcmF0b3JdLlNRTCxcbiAgICAgICAgICAgIHdoZXJlID0gJyc7XG5cbiAgICAgICAgdGhpcy5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkLCBpZHgpIHtcbiAgICAgICAgICAgIHZhciBvcCA9IGlkeCA/ICcgJyArIGxleGVtZS5vcCArICcgJyA6ICcnO1xuICAgICAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgVGVybWluYWxOb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoZXJlICs9IG9wICsgY2hpbGQuZ2V0U3FsV2hlcmVDbGF1c2UoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoaWxkLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB3aGVyZSArPSBvcCArIGdldFNxbFdoZXJlQ2xhdXNlLmNhbGwoY2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF3aGVyZSkge1xuICAgICAgICAgICAgd2hlcmUgPSAnTlVMTCBJUyBOVUxMJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBsZXhlbWUuYmVnICsgd2hlcmUgKyBsZXhlbWUuZW5kO1xuICAgIH1cblxufSk7XG5cbi8qKlxuICogQ2hlY2tzIHRvIG1ha2Ugc3VyZSBgc3RhdGVgIGlzIGRlZmluZWQgYXMgYSBwbGFpbiBvYmplY3QgYW5kIG5vdCBhIEpTT04gc3RyaW5nLlxuICogSWYgbm90LCB0aHJvd3MgZXJyb3IgYW5kIGRvZXMgbm90IHJldHVybi5cbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gdGhyb3dJZkpTT04oc3RhdGUpIHtcbiAgICBpZiAodHlwZW9mIHN0YXRlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICB2YXIgZXJyTXNnID0gJ0V4cGVjdGVkIGBzdGF0ZWAgcGFyYW1ldGVyIHRvIGJlIGFuIG9iamVjdC4nO1xuICAgICAgICBpZiAodHlwZW9mIHN0YXRlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZXJyTXNnICs9ICcgU2VlIGBKU09OLnBhcnNlKClgLic7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgRmlsdGVyTm9kZS5FcnJvcihlcnJNc2cpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY2F0Y2hDbGljayhldnQpIHsgLy8gbXVzdCBiZSBjYWxsZWQgd2l0aCBjb250ZXh0XG4gICAgdmFyIGVsdCA9IGV2dC50YXJnZXQ7XG5cbiAgICB2YXIgaGFuZGxlciA9IHRoaXNbZWx0LmNsYXNzTmFtZV0gfHwgdGhpc1tlbHQucGFyZW50Tm9kZS5jbGFzc05hbWVdO1xuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICAgIGlmICh0aGlzLmRldGFjaENob29zZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZGV0YWNoQ2hvb3NlcigpO1xuICAgICAgICB9XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBldnQpO1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZXZlbnRIYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuZXZlbnRIYW5kbGVyKGV2dCk7XG4gICAgfVxufVxuXG4vKipcbiAqIFRocm93cyBlcnJvciBpZiBpbnZhbGlkIGV4cHJlc3Npb24gdHJlZS5cbiAqIENhdWdodCBieSB7QGxpbmsgRmlsdGVyVHJlZSN2YWxpZGF0ZXxGaWx0ZXJUcmVlLnByb3RvdHlwZS52YWxpZGF0ZSgpfS5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gZm9jdXMgLSBNb3ZlIGZvY3VzIHRvIG9mZmVuZGluZyBjb250cm9sLlxuICogQHJldHVybnMge3VuZGVmaW5lZH0gaWYgdmFsaWRcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlKG9wdGlvbnMpIHsgLy8gbXVzdCBiZSBjYWxsZWQgd2l0aCBjb250ZXh0XG4gICAgaWYgKHRoaXMgaW5zdGFuY2VvZiBGaWx0ZXJUcmVlICYmICF0aGlzLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRmlsdGVyTm9kZS5FcnJvcignRW1wdHkgc3ViZXhwcmVzc2lvbiAobm8gZmlsdGVycykuJyk7XG4gICAgfVxuXG4gICAgdGhpcy5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgIGlmIChjaGlsZCBpbnN0YW5jZW9mIFRlcm1pbmFsTm9kZSkge1xuICAgICAgICAgICAgY2hpbGQudmFsaWRhdGUob3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSBpZiAoY2hpbGQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YWxpZGF0ZS5jYWxsKGNoaWxkLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBhdHRhY2hDaG9vc2VyKGV2dCkgeyAvLyBtdXN0IGJlIGNhbGxlZCB3aXRoIGNvbnRleHRcbiAgICB2YXIgdHJlZSA9IHRoaXMsXG4gICAgICAgIHJlY3QgPSBldnQudGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgaWYgKCFyZWN0LndpZHRoKSB7XG4gICAgICAgIC8vIG5vdCBpbiBET00geWV0IHNvIHRyeSBhZ2FpbiBsYXRlclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgYXR0YWNoQ2hvb3Nlci5jYWxsKHRyZWUsIGV2dCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBpdFxuICAgIHZhciBlZGl0b3JzID0gT2JqZWN0LmtleXMoRmlsdGVyVHJlZS5wcm90b3R5cGUuZWRpdG9ycyksXG4gICAgICAgIGNob29zZXIgPSB0aGlzLmNob29zZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzZWxlY3QnKTtcblxuICAgIGNob29zZXIuY2xhc3NOYW1lID0gJ2ZpbHRlci10cmVlLWNob29zZXInO1xuICAgIGNob29zZXIuc2l6ZSA9IGVkaXRvcnMubGVuZ3RoO1xuXG4gICAgZWRpdG9ycy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgbmFtZSA9IHRyZWUuZWRpdG9yc1trZXldLnByb3RvdHlwZS5uYW1lIHx8IGtleTtcbiAgICAgICAgY2hvb3Nlci5hZGQobmV3IE9wdGlvbihuYW1lLCBrZXkpKTtcbiAgICB9KTtcblxuICAgIGNob29zZXIub25tb3VzZW92ZXIgPSBmdW5jdGlvbihldnQpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgICAgZXZ0LnRhcmdldC5zZWxlY3RlZCA9IHRydWU7XG4gICAgfTtcblxuICAgIC8vIFBvc2l0aW9uIGl0XG4gICAgY2hvb3Nlci5zdHlsZS5sZWZ0ID0gcmVjdC5sZWZ0ICsgMTkgKyAncHgnO1xuICAgIGNob29zZXIuc3R5bGUudG9wID0gcmVjdC5ib3R0b20gKyAncHgnO1xuXG4gICAgdGhpcy5kZXRhY2hDaG9vc2VyID0gZGV0YWNoQ2hvb3Nlci5iaW5kKHRoaXMpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuZGV0YWNoQ2hvb3Nlcik7IC8vIGRldGFjaCBjaG9vc2VyIGlmIGNsaWNrIG91dHNpZGVcblxuICAgIGNob29zZXIub25jbGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0cmVlLmNoaWxkcmVuLnB1c2gobmV3IHRyZWUuZWRpdG9yc1tjaG9vc2VyLnZhbHVlXSh7XG4gICAgICAgICAgICBwYXJlbnQ6IHRyZWVcbiAgICAgICAgfSkpO1xuICAgICAgICAvLyBjbGljayBidWJibGVzIHVwIHRvIHdpbmRvdyB3aGVyZSBpdCBkZXRhY2hlcyBjaG9vc2VyXG4gICAgfTtcblxuICAgIGNob29zZXIub25tb3VzZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjaG9vc2VyLnNlbGVjdGVkSW5kZXggPSAtMTtcbiAgICB9O1xuXG4gICAgLy8gQWRkIGl0IHRvIHRoZSBET01cbiAgICB0aGlzLmVsLmFwcGVuZENoaWxkKGNob29zZXIpO1xuXG4gICAgLy8gQ29sb3IgdGhlIGxpbmsgc2ltaWxhcmx5XG4gICAgdGhpcy5jaG9vc2VyVGFyZ2V0ID0gZXZ0LnRhcmdldDtcbiAgICB0aGlzLmNob29zZXJUYXJnZXQuY2xhc3NMaXN0LmFkZCgnYXMtbWVudS1oZWFkZXInKTtcbn1cblxuZnVuY3Rpb24gZGV0YWNoQ2hvb3NlcigpIHsgLy8gbXVzdCBiZSBjYWxsZWQgd2l0aCBjb250ZXh0XG4gICAgdmFyIGNob29zZXIgPSB0aGlzLmNob29zZXI7XG4gICAgaWYgKGNob29zZXIpIHtcbiAgICAgICAgdGhpcy5lbC5yZW1vdmVDaGlsZChjaG9vc2VyKTtcbiAgICAgICAgdGhpcy5jaG9vc2VyVGFyZ2V0LmNsYXNzTGlzdC5yZW1vdmUoJ2FzLW1lbnUtaGVhZGVyJyk7XG5cbiAgICAgICAgY2hvb3Nlci5vbmNsaWNrID0gY2hvb3Nlci5vbm1vdXNlb3V0ID0gbnVsbDtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5kZXRhY2hDaG9vc2VyKTtcblxuICAgICAgICBkZWxldGUgdGhpcy5kZXRhY2hDaG9vc2VyO1xuICAgICAgICBkZWxldGUgdGhpcy5jaG9vc2VyO1xuICAgIH1cbn1cblxud2luZG93LkZpbHRlclRyZWUgPSBGaWx0ZXJUcmVlO1xuIiwiLyogZXNsaW50LWVudiBicm93c2VyICovXG4vKiBlc2xpbnQtZGlzYWJsZSBrZXktc3BhY2luZyAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBGaWx0ZXJOb2RlID0gcmVxdWlyZSgnLi9GaWx0ZXJOb2RlJyk7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJyk7XG52YXIgY29uZGl0aW9uYWxzID0gcmVxdWlyZSgnLi9jb25kaXRpb25hbHMnKTtcblxuXG4vKiogQHR5cGVkZWYge29iamVjdH0gY29udmVydGVyXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9ufSB0byAtIFJldHVybnMgaW5wdXQgdmFsdWUgY29udmVydGVkIHRvIHR5cGUuIEZhaWxzIHNpbGVudGx5LlxuICogQHByb3BlcnR5IHtmdW5jdGlvbn0gbm90IC0gVGVzdHMgaW5wdXQgdmFsdWUgYWdhaW5zdCB0eXBlLCByZXR1cm5pbmcgYGZhbHNlIGlmIHR5cGUgb3IgYHRydWVgIGlmIG5vdCB0eXBlLlxuICovXG4vKiogQHR5cGUge2NvbnZlcnRlcn0gKi9cbnZhciBudW1iZXJDb252ZXJ0ZXIgPSB7IHRvOiBOdW1iZXIsIG5vdDogaXNOYU4gfTtcblxuLyoqIEB0eXBlIHtjb252ZXJ0ZXJ9ICovXG52YXIgZGF0ZUNvbnZlcnRlciA9IHsgdG86IGZ1bmN0aW9uKHMpIHsgcmV0dXJuIG5ldyBEYXRlKHMpOyB9LCBub3Q6IGlzTmFOIH07XG5cbi8qKiBAY29uc3RydWN0b3JcbiAqIEBzdW1tYXJ5IEEgdGVybWluYWwgbm9kZSBpbiBhIGZpbHRlciB0cmVlLCByZXByZXNlbnRpbmcgYSBjb25kaXRpb25hbCBleHByZXNzaW9uLlxuICogQGRlc2MgQWxzbyBrbm93biBhcyBhIFwiZmlsdGVyLlwiXG4gKi9cbnZhciBGaWx0ZXJMZWFmID0gRmlsdGVyTm9kZS5leHRlbmQoJ0ZpbHRlckxlYWYnLCB7XG5cbiAgICBuYW1lOiAnQ29tcGFyZSBhIGNvbHVtbiB0byBhIHZhbHVlJyxcblxuICAgIHBvc3RJbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3LmNvbHVtbjtcbiAgICAgICAgaWYgKCFlbC52YWx1ZSkge1xuICAgICAgICAgICAgLy8gRm9yIGVtcHR5IChpLmUuLCBuZXcpIGNvbnRyb2xzLCBzaW11bGF0ZSBhIGNsaWNrIGEgYmVhdCBhZnRlciByZW5kZXJpbmdcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IEZpbHRlck5vZGUuY2xpY2tJbihlbCk7IH0sIDcwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdba2V5XS5yZW1vdmVFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLm9uQ2hhbmdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKiogQHN1bW1hcnkgQ3JlYXRlIGEgbmV3IHZpZXcgaW4gYHRoaXMudmlld2AuXG4gICAgICogQGRlc2MgVGhpcyBuZXcgXCJ2aWV3XCIgaXMgYSBncm91cCBvZiBIVE1MIGBFbGVtZW50YCBjb250cm9scyB0aGF0IGNvbXBsZXRlbHkgZGVzY3JpYmUgdGhlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gdGhpcyBvYmplY3QgcmVwcmVzZW50cy4gVGhpcyBtZXRob2QgY3JlYXRlcyB0aGUgZm9sbG93aW5nIG9iamVjdCBwcm9wZXJ0aWVzOlxuICAgICAqXG4gICAgICogKiBgdGhpcy5lbGAgLSBhIGA8c3Bhbj4uLi48L3NwYW4+YCBlbGVtZW50IHRvIGNvbnRhaW4gdGhlIGNvbnRyb2xzIGFzIGNoaWxkIG5vZGVzXG4gICAgICogKiBgdGhpcy52aWV3YCAtIGEgaGFzaCBjb250YWluaW5nIGRpcmVjdCByZWZlcmVuY2VzIHRvIHRoZSBjb250cm9scy5cbiAgICAgKlxuICAgICAqIFRoZSB2aWV3IGZvciB0aGlzIGJhc2UgYEZpbHRlckxlYWZgIG9iamVjdCBjb25zaXN0cyBvZiB0aGUgZm9sbG93aW5nIGNvbnRyb2xzOlxuICAgICAqXG4gICAgICogKiBgdGhpcy52aWV3LmNvbHVtbmAgLSBBIGRyb3AtZG93biB3aXRoIG9wdGlvbnMgZnJvbSBgdGhpcy5maWVsZHNgLiBWYWx1ZSBpcyB0aGUgbmFtZSBvZiB0aGUgY29sdW1uIGJlaW5nIHRlc3RlZCAoaS5lLiwgdGhlIGNvbHVtbiB0byB3aGljaCB0aGlzIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gYXBwbGllcykuXG4gICAgICogKiBgdGhpcy52aWV3Lm9wZXJhdG9yYCAtIEEgZHJvcC1kb3duIHdpdGggb3B0aW9ucyBmcm9tIHtAbGluayBsZWFmT3BlcmF0b3JzfS4gVmFsdWUgaXMgb25lIG9mIHRoZSBrZXlzIHRoZXJlaW4uXG4gICAgICogKiBgdGhpcy52aWV3LmxpdGVyYWxgIC0gQSB0ZXh0IGJveC5cbiAgICAgKlxuICAgICAqICA+IFByb3RvdHlwZXMgZXh0ZW5kZWQgZnJvbSBgRmlsdGVyTGVhZmAgbWF5IGhhdmUgZGlmZmVyZW50IGNvbnRyb2xzIGFzIG5lZWRlZC4gVGhlIG9ubHkgcmVxdWlyZWQgY29udHJvbCBpcyBgY29sdW1uYCwgd2hpY2ggYWxsIHN1Y2ggXCJlZGl0b3JzXCIgbXVzdCBzdXBwb3J0LlxuICAgICAqL1xuICAgIGNyZWF0ZVZpZXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZmllbGRzID0gdGhpcy5wYXJlbnQubm9kZUZpZWxkcyB8fCB0aGlzLmZpZWxkcztcblxuICAgICAgICBpZiAoIWZpZWxkcykge1xuICAgICAgICAgICAgdGhyb3cgRmlsdGVyTm9kZS5FcnJvcignVGVybWluYWwgbm9kZSByZXF1aXJlcyBhIGZpZWxkcyBsaXN0LicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJvb3QgPSB0aGlzLmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICByb290LmNsYXNzTmFtZSA9ICdmaWx0ZXItdHJlZS1lZGl0b3IgZmlsdGVyLXRyZWUtZGVmYXVsdCc7XG5cbiAgICAgICAgdGhpcy52aWV3ID0ge1xuICAgICAgICAgICAgY29sdW1uOiB0aGlzLm1ha2VFbGVtZW50KHJvb3QsIGZpZWxkcywgJ2NvbHVtbicsIHRydWUpLFxuICAgICAgICAgICAgb3BlcmF0b3I6IHRoaXMubWFrZUVsZW1lbnQocm9vdCwgdGhpcy5vcGVyYXRvck9wdGlvbnMsICdvcGVyYXRvcicpLFxuICAgICAgICAgICAgbGl0ZXJhbDogdGhpcy5tYWtlRWxlbWVudChyb290KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJvb3QuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnInKSk7XG4gICAgfSxcblxuICAgIC8qKiBAdHlwZWRlZiB7b2JqZWN0fSB2YWx1ZU9wdGlvblxuICAgICAqIFlvdSBzaG91bGQgc3VwcGx5IGJvdGggYG5hbWVgIGFuZCBgYWxpYXNgIGJ1dCB5b3UgY291bGQgb21pdCBvbmUgb3IgdGhlIG90aGVyIGFuZCB3aGljaGV2ZXIgeW91IHByb3ZpZGUgd2lsbCBiZSB1c2VkIGZvciBib3RoLiAoSW4gc3VjaCBjYXNlIHlvdSBtaWdodCBhcyB3ZWxsIGp1c3QgZ2l2ZSBhIHN0cmluZyBmb3Ige0BsaW5rIGZpZWxkT3B0aW9ufSByYXRoZXIgdGhhbiB0aGlzIG9iamVjdC4pXG4gICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFtuYW1lXVxuICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbYWxpYXNdXG4gICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFt0eXBlXSBPbmUgb2YgdGhlIGtleXMgb2YgYHRoaXMuY29udmVydGVyc2AuIElmIG5vdCBvbmUgb2YgdGhlc2UgKGluY2x1ZGluZyBgdW5kZWZpbmVkYCksIGZpZWxkIHZhbHVlcyB3aWxsIGJlIHRlc3RlZCB3aXRoIGEgc3RyaW5nIGNvbXBhcmlzb24uXG4gICAgICogQHByb3BlcnR5IHtib29sZWFufSBbaGlkZGVuPWZhbHNlXVxuICAgICAqL1xuICAgIC8qKiBAdHlwZWRlZiB7b2JqZWN0fSBvcHRpb25Hcm91cFxuICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBsYWJlbFxuICAgICAqIEBwcm9wZXJ0eSB7ZmllbGRPcHRpb25bXX0gb3B0aW9uc1xuICAgICAqL1xuICAgIC8qKiBAdHlwZWRlZiB7c3RyaW5nfHZhbHVlT3B0aW9ufG9wdGlvbkdyb3VwfSBmaWVsZE9wdGlvblxuICAgICAqIFRoZSB0aHJlZSBwb3NzaWJsZSB0eXBlcyBzcGVjaWZ5IGVpdGhlciBhbiBgPG9wdGlvbj4uLi4uPC9vcHRpb24+YCBlbGVtZW50IG9yIGFuIGA8b3B0Z3JvdXA+Li4uLjwvb3B0Z3JvdXA+YCBlbGVtZW50IGFzIGZvbGxvd3M6XG4gICAgICogKiBgc3RyaW5nYCAtIHNwZWNpZmllcyBvbmx5IHRoZSB0ZXh0IG9mIGFuIGA8b3B0aW9uPi4uLi48L29wdGlvbj5gIGVsZW1lbnQgKHRoZSB2YWx1ZSBuYXR1cmFsbHkgZGVmYXVsdHMgdG8gdGhlIHRleHQpXG4gICAgICogKiB7QGxpbmsgdmFsdWVPcHRpb259IC0gc3BlY2lmaWVzIGJvdGggdGhlIHRleHQgKGAubmFtZWApIGFuZCB0aGUgdmFsdWUgKGAuYWxpYXNgKSBvZiBhbiBgPG9wdGlvbi4uLi48L29wdGlvbj5gIGVsZW1lbnRcbiAgICAgKiAqIHtAbGluayBvcHRpb25Hcm91cH0gLSBzcGVjaWZpZXMgYW4gYDxvcHRncm91cD4uLi4uPC9vcHRncm91cD5gIGVsZW1lbnRcbiAgICAgKi9cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBIVE1MIGZvcm0gY29udHJvbHMgZmFjdG9yeS5cbiAgICAgKiBAZGVzYyBDcmVhdGVzIGFuZCBhcHBlbmRzIGEgdGV4dCBib3ggb3IgYSBkcm9wLWRvd24uXG4gICAgICogQHJldHVybnMgVGhlIG5ldyBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7RWxlbWVudH0gY29udGFpbmVyIC0gQW4gZWxlbWVudCB0byB3aGljaCB0byBhcHBlbmQgdGhlIG5ldyBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7ZmllbGRPcHRpb25bXX0gW29wdGlvbnNdIC0gT3ZlcmxvYWRzOlxuICAgICAqICogSWYgb21pdHRlZCwgd2lsbCBjcmVhdGUgYW4gYDxpbnB1dC8+YCAodGV4dCBib3gpIGVsZW1lbnQuXG4gICAgICogKiBJZiBjb250YWlucyBvbmx5IGEgc2luZ2xlIG9wdGlvbiwgd2lsbCBjcmVhdGUgYSBgPHNwYW4+Li4uPC9zcGFuPmAgZWxlbWVudCBjb250YWluaW5nIHRoZSBzdHJpbmcgYW5kIGEgYDxpbnB1dCB0eXBlPWhpZGRlbj5gIGNvbnRhaW5pbmcgdGhlIHZhbHVlLlxuICAgICAqICogT3RoZXJ3aXNlLCBjcmVhdGVzIGEgYDxzZWxlY3Q+Li4uPC9zZWxlY3Q+YCBlbGVtZW50IHdpdGggdGhlc2Ugb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge251bGx8c3RyaW5nfSBbcHJvbXB0PScnXSAtIEFkZHMgYW4gaW5pdGlhbCBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnQgdG8gdGhlIGRyb3AtZG93biB3aXRoIHRoaXMgdmFsdWUsIHBhcmVudGhlc2l6ZWQsIGFzIGl0cyBgdGV4dGA7IGFuZCBlbXB0eSBzdHJpbmcgYXMgaXRzIGB2YWx1ZWAuIE9taXR0aW5nIGNyZWF0ZXMgYSBibGFuayBwcm9tcHQ7IGBudWxsYCBzdXBwcmVzc2VzLlxuICAgICAqL1xuICAgIG1ha2VFbGVtZW50OiBmdW5jdGlvbihjb250YWluZXIsIG9wdGlvbnMsIHByb21wdCwgc29ydCkge1xuICAgICAgICB2YXIgZWwsIG9wdGlvbiwgaGlkZGVuLFxuICAgICAgICAgICAgdGFnTmFtZSA9IG9wdGlvbnMgPyAnc2VsZWN0JyA6ICdpbnB1dCc7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIC8vIGhhcmQgdGV4dCB3aGVuIHRoZXJlIHdvdWxkIGJlIG9ubHkgMSBvcHRpb24gaW4gdGhlIGRyb3Bkb3duXG4gICAgICAgICAgICBvcHRpb24gPSBvcHRpb25zWzBdO1xuXG4gICAgICAgICAgICBoaWRkZW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICAgICAgaGlkZGVuLnR5cGUgPSAnaGlkZGVuJztcbiAgICAgICAgICAgIGhpZGRlbi52YWx1ZSA9IG9wdGlvbi5uYW1lIHx8IG9wdGlvbi5hbGlhcyB8fCBvcHRpb247XG5cbiAgICAgICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgZWwuaW5uZXJIVE1MID0gb3B0aW9uLmFsaWFzIHx8IG9wdGlvbi5uYW1lIHx8IG9wdGlvbjtcbiAgICAgICAgICAgIGVsLmFwcGVuZENoaWxkKGhpZGRlbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbCA9IGFkZE9wdGlvbnModGFnTmFtZSwgb3B0aW9ucywgcHJvbXB0LCBzb3J0KTtcbiAgICAgICAgICAgIGlmIChlbC50eXBlID09PSAndGV4dCcgJiYgdGhpcy5ldmVudEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdGhpcy5ldmVudEhhbmRsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLm9uQ2hhbmdlID0gdGhpcy5vbkNoYW5nZSB8fCBjbGVhblVwQW5kTW92ZU9uLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgRmlsdGVyTm9kZS5zZXRXYXJuaW5nQ2xhc3MoZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGVsKTtcblxuICAgICAgICByZXR1cm4gZWw7XG4gICAgfSxcblxuICAgIGxvYWRTdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGF0ZSA9IHRoaXMuc3RhdGU7XG5cbiAgICAgICAgaWYgKHN0YXRlKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUsIGVsLCBpLCBiLCBzZWxlY3RlZCwgbm90ZXMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzdGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmICghRmlsdGVyTm9kZS5vcHRpb25zU2NoZW1hW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBzdGF0ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICBlbCA9IHRoaXMudmlld1trZXldO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGVsLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W25hbWU9XFwnJyArIGVsLm5hbWUgKyAnXFwnXScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBlbC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbFtpXS5jaGVja2VkID0gdmFsdWUuaW5kZXhPZihlbFtpXS52YWx1ZSkgPj0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsID0gZWwub3B0aW9ucztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwLCBiID0gZmFsc2U7IGkgPCBlbC5sZW5ndGg7IGkrKywgYiA9IGIgfHwgc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQgPSB2YWx1ZS5pbmRleE9mKGVsW2ldLnZhbHVlKSA+PSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbFtpXS5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGaWx0ZXJOb2RlLnNldFdhcm5pbmdDbGFzcyhlbCwgYik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFGaWx0ZXJOb2RlLnNldFdhcm5pbmdDbGFzcyhlbCkgJiYgZWwudmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdGVzLnB1c2goeyBrZXk6IGtleSwgdmFsdWU6IHZhbHVlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChub3Rlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBub3Rlcy5sZW5ndGggPiAxLFxuICAgICAgICAgICAgICAgICAgICBmb290bm90ZXMgPSB0ZW1wbGF0ZShtdWx0aXBsZSA/ICdub3RlcycgOiAnbm90ZScpLFxuICAgICAgICAgICAgICAgICAgICBpbm5lciA9IGZvb3Rub3Rlcy5sYXN0RWxlbWVudENoaWxkO1xuICAgICAgICAgICAgICAgIG5vdGVzLmZvckVhY2goZnVuY3Rpb24obm90ZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm9vdG5vdGUgPSBtdWx0aXBsZSA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJykgOiBpbm5lcjtcbiAgICAgICAgICAgICAgICAgICAgbm90ZSA9IHRlbXBsYXRlKCdvcHRpb25NaXNzaW5nJywgbm90ZS5rZXksIG5vdGUudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAobm90ZS5sZW5ndGgpIHsgZm9vdG5vdGUuYXBwZW5kQ2hpbGQobm90ZVswXSk7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG11bHRpcGxlKSB7IGlubmVyLmFwcGVuZENoaWxkKGZvb3Rub3RlKTsgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGVsLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGZvb3Rub3RlcywgZWwucGFyZW50Tm9kZS5sYXN0RWxlbWVudENoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcHJvcGVydHkge2NvbnZlcnRlcn0gbnVtYmVyXG4gICAgICogQHByb3BlcnR5IHtjb252ZXJ0ZXJ9IGRhdGVcbiAgICAgKi9cbiAgICBjb252ZXJ0ZXJzOiB7XG4gICAgICAgIG51bWJlcjogbnVtYmVyQ29udmVydGVyLFxuICAgICAgICBpbnQ6IG51bWJlckNvbnZlcnRlciwgLy8gcHNldWRvLXR5cGU6IHJlYWxseSBqdXN0IGEgTnVtYmVyXG4gICAgICAgIGZsb2F0OiBudW1iZXJDb252ZXJ0ZXIsIC8vIHBzZXVkby10eXBlOiByZWFsbHkganVzdCBhIE51bWJlclxuICAgICAgICBkYXRlOiBkYXRlQ29udmVydGVyXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRocm93cyBlcnJvciBpZiBpbnZhbGlkIGV4cHJlc3Npb24uXG4gICAgICogQ2F1Z2h0IGJ5IHtAbGluayBGaWx0ZXJUcmVlI3ZhbGlkYXRlfEZpbHRlclRyZWUucHJvdG90eXBlLnZhbGlkYXRlKCl9LlxuICAgICAqXG4gICAgICogQWxzbyBwZXJmb3JtcyB0aGUgZm9sbG93aW5nIGNvbXBpbGF0aW9uIGFjdGlvbnM6XG4gICAgICogKiBDb3BpZXMgYWxsIGB0aGlzLnZpZXdgJyB2YWx1ZXMgZnJvbSB0aGUgRE9NIHRvIHNpbWlsYXJseSBuYW1lZCBwcm9wZXJ0aWVzIG9mIGB0aGlzYC5cbiAgICAgKiAqIFByZS1zZXRzIGB0aGlzLm9wYCBhbmQgYHRoaXMuY29udmVydGVyYCBmb3IgdXNlIGluIGB0ZXN0YCdzIHRyZWUgd2Fsay5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuZm9jdXM9ZmFsc2VdIC0gTW92ZSBmb2N1cyB0byBvZmZlbmRpbmcgY29udHJvbC5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfSBpZiB2YWxpZFxuICAgICAqL1xuICAgIHZhbGlkYXRlOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBlbGVtZW50TmFtZSwgZmllbGRzLCBmaWVsZDtcblxuICAgICAgICBmb3IgKGVsZW1lbnROYW1lIGluIHRoaXMudmlldykge1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3W2VsZW1lbnROYW1lXSxcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGNvbnRyb2xWYWx1ZShlbCkudHJpbSgpO1xuXG4gICAgICAgICAgICBpZiAodmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZvY3VzID0gb3B0aW9ucyAmJiBvcHRpb25zLmZvY3VzO1xuICAgICAgICAgICAgICAgIGlmIChmb2N1cyB8fCBmb2N1cyA9PT0gdW5kZWZpbmVkKSB7IGNsaWNrSW4oZWwpOyB9XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEZpbHRlck5vZGUuRXJyb3IoJ0JsYW5rICcgKyBlbGVtZW50TmFtZSArICcgY29udHJvbC5cXG5Db21wbGV0ZSB0aGUgZmlsdGVyIG9yIGRlbGV0ZSBpdC4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQ29weSBlYWNoIGNvbnRyb2xzJ3MgdmFsdWUgYXMgYSBuZXcgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IG9mIHRoaXMgb2JqZWN0LlxuICAgICAgICAgICAgICAgIHRoaXNbZWxlbWVudE5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm9wID0gY29uZGl0aW9uYWxzLm9wZXJhdG9yc1t0aGlzLm9wZXJhdG9yXTtcblxuICAgICAgICB0aGlzLmNvbnZlcnRlciA9IHVuZGVmaW5lZDsgLy8gcmVtYWlucyB1bmRlZmluZWQgd2hlbiBuZWl0aGVyIG9wZXJhdG9yIG5vciBjb2x1bW4gaXMgdHlwZWRcbiAgICAgICAgaWYgKHRoaXMub3AudHlwZSkge1xuICAgICAgICAgICAgdGhpcy5jb252ZXJ0ZXIgPSB0aGlzLmNvbnZlcnRlcnNbdGhpcy5vcC50eXBlXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoZWxlbWVudE5hbWUgaW4gdGhpcy52aWV3KSB7XG4gICAgICAgICAgICAgICAgaWYgKC9eY29sdW1uLy50ZXN0KGVsZW1lbnROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBmaWVsZHMgPSB0aGlzLnBhcmVudC5ub2RlRmllbGRzIHx8IHRoaXMuZmllbGRzO1xuICAgICAgICAgICAgICAgICAgICBmaWVsZCA9IGZpbmRGaWVsZChmaWVsZHMsIHRoaXNbZWxlbWVudE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkICYmIGZpZWxkLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29udmVydGVyID0gdGhpcy5jb252ZXJ0ZXJzW2ZpZWxkLnR5cGVdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIHA6IGZ1bmN0aW9uKGRhdGFSb3cpIHsgcmV0dXJuIGRhdGFSb3dbdGhpcy5jb2x1bW5dOyB9LFxuICAgIHE6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5saXRlcmFsOyB9LFxuXG4gICAgdGVzdDogZnVuY3Rpb24oZGF0YVJvdykge1xuICAgICAgICB2YXIgcCwgcSwgLy8gdW50eXBlZCB2ZXJzaW9ucyBvZiBhcmdzXG4gICAgICAgICAgICBQLCBRLCAvLyB0eXBlZCB2ZXJzaW9ucyBvZiBwIGFuZCBxXG4gICAgICAgICAgICBjb252ZXJ0O1xuXG4gICAgICAgIHJldHVybiAocCA9IHRoaXMucChkYXRhUm93KSkgPT09IHVuZGVmaW5lZCB8fCAocSA9IHRoaXMucShkYXRhUm93KSkgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBmYWxzZVxuICAgICAgICAgICAgOiAoXG4gICAgICAgICAgICAgICAgKGNvbnZlcnQgPSB0aGlzLmNvbnZlcnRlcikgJiZcbiAgICAgICAgICAgICAgICAhY29udmVydC5ub3QoUCA9IGNvbnZlcnQudG8ocCkpICYmXG4gICAgICAgICAgICAgICAgIWNvbnZlcnQubm90KFEgPSBjb252ZXJ0LnRvKHEpKVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgID8gdGhpcy5vcC50ZXN0KFAsIFEpXG4gICAgICAgICAgICAgICAgOiB0aGlzLm9wLnRlc3QocCwgcSk7XG4gICAgfSxcblxuICAgIC8qKiBUZXN0cyB0aGlzIGxlYWYgbm9kZSBmb3IgZ2l2ZW4gY29sdW1uIG5hbWUuXG4gICAgICogPiBUaGlzIGlzIHRoZSBkZWZhdWx0IFwiZmluZFwiIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWVcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmaW5kOiBmdW5jdGlvbihmaWVsZE5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sdW1uID09PSBmaWVsZE5hbWU7XG4gICAgfSxcblxuICAgIC8qKiBUZXN0cyB0aGlzIGxlYWYgbm9kZSBmb3IgZ2l2ZW4gY29sdW1uIGBFbGVtZW50YCBvd25lcnNoaXAuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gRWRpdG9yIChsZWFmIGNvbnN0cnVjdG9yKVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZpbmRCeUVsOiBmdW5jdGlvbihlbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5lbCA9PT0gZWw7XG4gICAgfSxcblxuICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGF0ZSA9IHt9O1xuICAgICAgICBpZiAodGhpcy5lZGl0b3IpIHtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgIHN0YXRlW2tleV0gPSB0aGlzW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnBhcmVudC5ub2RlRmllbGRzICYmIHRoaXMuZmllbGRzICE9PSB0aGlzLnBhcmVudC5maWVsZHMpIHtcbiAgICAgICAgICAgIHN0YXRlLmZpZWxkcyA9IHRoaXMuZmllbGRzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9LFxuXG4gICAgZ2V0U3FsV2hlcmVDbGF1c2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcC5zcWwodGhpcy5jb2x1bW4sIHRoaXMubGl0ZXJhbCk7XG4gICAgfVxufSk7XG5cbmZ1bmN0aW9uIGZpbmRGaWVsZChmaWVsZHMsIG5hbWUpIHtcbiAgICB2YXIgY29tcGxleCwgc2ltcGxlO1xuXG4gICAgc2ltcGxlID0gZmllbGRzLmZpbmQoZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgaWYgKChmaWVsZC5vcHRpb25zIHx8IGZpZWxkKSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICByZXR1cm4gKGNvbXBsZXggPSBmaW5kRmllbGQoZmllbGQub3B0aW9ucyB8fCBmaWVsZCwgbmFtZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZpZWxkLm5hbWUgPT09IG5hbWU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBjb21wbGV4IHx8IHNpbXBsZTtcbn1cblxuLyoqIGBjaGFuZ2VgIG9yIGBjbGlja2AgZXZlbnQgaGFuZGxlciBmb3IgYWxsIGZvcm0gY29udHJvbHMuXG4gKiBSZW1vdmVzIGVycm9yIENTUyBjbGFzcyBmcm9tIGNvbnRyb2wuXG4gKiBBZGRzIHdhcm5pbmcgQ1NTIGNsYXNzIGZyb20gY29udHJvbCBpZiBibGFuazsgcmVtb3ZlcyBpZiBub3QgYmxhbmsuXG4gKiBNb3ZlcyBmb2N1cyB0byBuZXh0IG5vbi1ibGFuayBzaWJsaW5nIGNvbnRyb2wuXG4gKi9cbmZ1bmN0aW9uIGNsZWFuVXBBbmRNb3ZlT24oZXZ0KSB7XG4gICAgdmFyIGVsID0gZXZ0LnRhcmdldDtcblxuICAgIC8vIHJlbW92ZSBgZXJyb3JgIENTUyBjbGFzcywgd2hpY2ggbWF5IGhhdmUgYmVlbiBhZGRlZCBieSBgRmlsdGVyTGVhZi5wcm90b3R5cGUudmFsaWRhdGVgXG4gICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnZmlsdGVyLXRyZWUtZXJyb3InKTtcblxuICAgIC8vIHNldCBvciByZW1vdmUgJ3dhcm5pbmcnIENTUyBjbGFzcywgYXMgcGVyIGVsLnZhbHVlXG4gICAgRmlsdGVyTm9kZS5zZXRXYXJuaW5nQ2xhc3MoZWwpO1xuXG4gICAgaWYgKGVsLnZhbHVlKSB7XG4gICAgICAgIC8vIGZpbmQgbmV4dCBzaWJsaW5nIGNvbnRyb2wsIGlmIGFueVxuICAgICAgICBpZiAoIWVsLm11bHRpcGxlKSB7XG4gICAgICAgICAgICB3aGlsZSAoKGVsID0gZWwubmV4dEVsZW1lbnRTaWJsaW5nKSAmJiAoISgnbmFtZScgaW4gZWwpIHx8IGVsLnZhbHVlLnRyaW0oKSAhPT0gJycpKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjdXJseVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gYW5kIGNsaWNrIGluIGl0IChvcGVucyBzZWxlY3QgbGlzdClcbiAgICAgICAgaWYgKGVsICYmIGVsLnZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIGVsLnZhbHVlID0gJyc7IC8vIHJpZCBvZiBhbnkgd2hpdGUgc3BhY2VcbiAgICAgICAgICAgIEZpbHRlck5vZGUuY2xpY2tJbihlbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5ldmVudEhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5ldmVudEhhbmRsZXIoZXZ0KTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNsaWNrSW4oZWwpIHtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBlbC5jbGFzc0xpc3QuYWRkKCdmaWx0ZXItdHJlZS1lcnJvcicpO1xuICAgICAgICBGaWx0ZXJOb2RlLmNsaWNrSW4oZWwpO1xuICAgIH0sIDApO1xufVxuXG5mdW5jdGlvbiBjb250cm9sVmFsdWUoZWwpIHtcbiAgICB2YXIgdmFsdWUsIGk7XG5cbiAgICBzd2l0Y2ggKGVsLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W25hbWU9XFwnJyArIGVsLm5hbWUgKyAnXFwnXTplbmFibGVkOmNoZWNrZWQnKTtcbiAgICAgICAgICAgIGZvciAodmFsdWUgPSBbXSwgaSA9IDA7IGkgPCBlbC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhbHVlLnB1c2goZWxbaV0udmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgICAgIGVsID0gZWwub3B0aW9ucztcbiAgICAgICAgICAgIGZvciAodmFsdWUgPSBbXSwgaSA9IDA7IGkgPCBlbC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICghZWwuZGlzYWJsZWQgJiYgZWwuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUucHVzaChlbFtpXS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHZhbHVlID0gZWwudmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEBzdW1tYXJ5IENyZWF0ZXMgYSBuZXcgZWxlbWVudCBhbmQgYWRkcyBvcHRpb25zIHRvIGl0LlxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ05hbWUgLSBNdXN0IGJlIG9uZSBvZjpcbiAqICogYCdpbnB1dCdgIGZvciBhIHRleHQgYm94XG4gKiAqIGAnc2VsZWN0J2AgZm9yIGEgZHJvcC1kb3duXG4gKiAqIGAnb3B0Z3JvdXAnYCAoZm9yIGludGVybmFsIHVzZSBvbmx5KVxuICogQHBhcmFtIHtmaWVsZE9wdGlvbltdfSBbb3B0aW9uc10gLSBTdHJpbmdzIHRvIGFkZCBhcyBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnRzLiBPbWl0IHRvIGNyZWF0ZSBhIHRleHQgYm94LlxuICogQHBhcmFtIHtudWxsfHN0cmluZ30gW3Byb21wdD0nJ10gLSBBZGRzIGFuIGluaXRpYWwgYDxvcHRpb24+Li4uPC9vcHRpb24+YCBlbGVtZW50IHRvIHRoZSBkcm9wLWRvd24gd2l0aCB0aGlzIHZhbHVlIGluIHBhcmVudGhlc2VzIGFzIGl0cyBgdGV4dGA7IGFuZCBlbXB0eSBzdHJpbmcgYXMgaXRzIGB2YWx1ZWAuIERlZmF1bHQgaXMgZW1wdHkgc3RyaW5nLCB3aGljaCBjcmVhdGVzIGEgYmxhbmsgcHJvbXB0OyBgbnVsbGAgc3VwcHJlc3NlcyBwcm9tcHQgYWx0b2dldGhlci5cbiAqIEByZXR1cm5zIHtFbGVtZW50fSBFaXRoZXIgYSBgPHNlbGVjdD5gIG9yIGA8b3B0Z3JvdXA+YCBlbGVtZW50LlxuICovXG5mdW5jdGlvbiBhZGRPcHRpb25zKHRhZ05hbWUsIG9wdGlvbnMsIHByb21wdCwgc29ydCkge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgICB2YXIgYWRkLCBuZXdPcHRpb247XG4gICAgICAgIGlmICh0YWdOYW1lID09PSAnc2VsZWN0Jykge1xuICAgICAgICAgICAgYWRkID0gZWwuYWRkO1xuICAgICAgICAgICAgaWYgKHByb21wdCkge1xuICAgICAgICAgICAgICAgIG5ld09wdGlvbiA9IG5ldyBPcHRpb24oJygnICsgcHJvbXB0LCAnJyk7XG4gICAgICAgICAgICAgICAgbmV3T3B0aW9uLmlubmVySFRNTCArPSAnJmhlbGxpcDspJztcbiAgICAgICAgICAgICAgICBlbC5hZGQobmV3T3B0aW9uKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvbXB0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZWwuYWRkKG5ldyBPcHRpb24oKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGQgPSBlbC5hcHBlbmRDaGlsZDtcbiAgICAgICAgICAgIGVsLmxhYmVsID0gcHJvbXB0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNvcnQpIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zLnNsaWNlKCkuc29ydChmaWVsZENvbXBhcmF0b3IpOyAvLyBjbG9uZSBpdCBhbmQgc29ydCB0aGUgY2xvbmVcbiAgICAgICAgfVxuXG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaChmdW5jdGlvbihvcHRpb24pIHtcbiAgICAgICAgICAgIGlmICgob3B0aW9uLm9wdGlvbnMgfHwgb3B0aW9uKSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdGdyb3VwID0gYWRkT3B0aW9ucygnb3B0Z3JvdXAnLCBvcHRpb24ub3B0aW9ucyB8fCBvcHRpb24sIG9wdGlvbi5sYWJlbCk7XG4gICAgICAgICAgICAgICAgZWwuYWRkKG9wdGdyb3VwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0VsZW1lbnQgPSB0eXBlb2Ygb3B0aW9uICE9PSAnb2JqZWN0J1xuICAgICAgICAgICAgICAgICAgICA/IG5ldyBPcHRpb24ob3B0aW9uKVxuICAgICAgICAgICAgICAgICAgICA6IG5ldyBPcHRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb24uYWxpYXMgfHwgb3B0aW9uLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb24ubmFtZSB8fCBvcHRpb24uYWxpYXNcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBhZGQuY2FsbChlbCwgbmV3RWxlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsLnR5cGUgPSAndGV4dCc7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiBmaWVsZENvbXBhcmF0b3IoYSwgYikge1xuICAgIGEgPSBhLmFsaWFzIHx8IGEubmFtZSB8fCBhLmxhYmVsIHx8IGE7XG4gICAgYiA9IGIuYWxpYXMgfHwgYi5uYW1lIHx8IGIubGFiZWwgfHwgYjtcbiAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsdGVyTGVhZjtcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBleHRlbmQgPSByZXF1aXJlKCdleHRlbmQtbWUnKTtcbnZhciBfID0gcmVxdWlyZSgnb2JqZWN0LWl0ZXJhdG9ycycpO1xudmFyIEJhc2UgPSBleHRlbmQuQmFzZTtcblxudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZScpO1xudmFyIGNvbmRpdGlvbmFscyA9IHJlcXVpcmUoJy4vY29uZGl0aW9uYWxzJyk7XG5cbmV4dGVuZC5kZWJ1ZyA9IHRydWU7XG5cbnZhciBDSElMRFJFTl9UQUcgPSAnT0wnLFxuICAgIENISUxEX1RBRyA9ICdMSSc7XG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGRlc2NyaXB0aW9uIEEgZmlsdGVyIHRyZWUgcmVwcmVzZW50cyBhIF9jb21wbGV4IGNvbmRpdGlvbmFsIGV4cHJlc3Npb25fIGFuZCBjb25zaXN0cyBvZiBhIHNpbmdsZSBgRmlsdGVyTm9kZWAgb2JqZWN0IHNlcnZpbmcgYXMgdGhlIF9yb290XyBvZiBhbiBfbl8tYXJ5IHRyZWUuXG4gKlxuICogRWFjaCBgRmlsdGVyTm9kZWAgcmVwcmVzZW50cyBhIG5vZGUgaW4gdHJlZS4gRWFjaCBub2RlIGlzIG9uZSBvZiB0d28gdHlwZXMgb2Ygb2JqZWN0cyBleHRlbmRlZCBmcm9tIGBGaWx0ZXJOb2RlYDpcbiAqXG4gKiAqIFRoZSBub24tdGVybWluYWwgKEBsaW5rIEZpbHRlclRyZWV9IG5vZGVzIHJlcHJlc2VudCBfY29tcGxleCBzdWJleHByZXNzaW9uc18sIGVhY2ggY29uc2lzdGluZyBvZiB0d28gb3IgbW9yZSBfY29uZGl0aW9uYWxfIChib29sZWFuIGV4cHJlc3Npb25zKSwgYWxsIGNvbmNhdGVuYXRlZCB0b2dldGhlciB3aXRoIG9uZSBvZiB0aGUgX3RyZWUgb3BlcmF0b3JzXy5cbiAqICogVGhlIHRlcm1pbmFsIHtAbGluayBGaWx0ZXJMZWFmfSBub2RlcyByZXByZXNlbnQgX3NpbXBsZSBleHByZXNzaW9uc18uXG4gKlxuICogVHJlZSBvcGVyYXRvcnMgY3VycmVudGx5IGluY2x1ZGUgKipfQU5EXyoqIChsYWJlbGVkIFwiYWxsXCIgaW4gdGhlIFVJOyBhbmQgXCJvcC1hbmRcIiBpbnRlcm5hbGx5KSwgKipfT1JfKiogKFwiYW55XCI7IFwib3Atb3JcIiksIGFuZCAqKl9OT1JfKiogKFwibm9uZVwiOyBcIm9wLW5vclwiKS5cbiAqXG4gKiBFYWNoIGNvbmRpdGlvbmFsIGluIGEgX3N1YmV4cHJlc3Npb25fIChub24tdGVybWluYWwgbm9kZSkgaXMgcmVwcmVzZW50ZWQgYnkgYSBjaGlsZCBub2RlIHdoaWNoIG1heSBiZSBlaXRoZXIgYSBfc2ltcGxlIGV4cHJlc3Npb25fICh0ZXJtaW5hbCBub2RlKSBvciBhbm90aGVyIChcIm5lc3RlZFwiKSBzdWJleHByZXNzaW9uIG5vbi10ZXJtaW5hbCBub2RlLlxuICpcbiAqIFRoZSBgRmlsdGVyTGVhZmAgb2JqZWN0IGlzIHRoZSBkZWZhdWx0IHR5cGUgb2Ygc2ltcGxlIGV4cHJlc3Npb24sIHdoaWNoIGlzIGluIHRoZSBmb3JtIF9maWVsZC1wcm9wZXJ0eSBvcGVyYXRvci1wcm9wZXJ0eSBhcmd1bWVudC1wcm9wZXJ0eV8gd2hlcmU6XG4gKlxuICogKiBfZmllbGQtcHJvcGVydHlfIC0gdGhlIG5hbWUgb2YgYSBjb2x1bW4sIHNlbGVjdGVkIGZyb20gYSBkcm9wLWRvd247XG4gKiAqIF9vcGVyYXRvci1wcm9wZXJ0eV8gLSBhbiBlcXVhbGl0eSAoPSksIGluZXF1YWxpdHkgKDwsIOKJpCwg4omgLCDiiaUsID4pLCBvciBwYXR0ZXJuIG9wZXJhdG9yIChMSUtFLCBOT1QgTElLRSksIGFsc28gc2VsZWN0ZWQgZnJvbSBhIGRyb3AtZG93bjsgYW5kXG4gKiAqIF9hcmd1bWVudC1wcm9wZXJ0eV8gaXMgYSBjb25zdGFudCB0eXBlZCBpbnRvIGEgdGV4dCBib3guXG4gKlxuICogVGhlIGBGaWx0ZXJUcmVlYCBvYmplY3QgaGFzIHBvbHltb3JwaGljIG1ldGhvZHMgdGhhdCBvcGVyYXRlIG9uIHRoZSBlbnRpcmUgdHJlZSB1c2luZyByZWN1cnNpb24uIFdoZW4gdGhlIHJlY3Vyc2lvbiByZWFjaGVzIGEgdGVybWluYWwgbm9kZSwgaXQgY2FsbHMgdGhlIG1ldGhvZHMgb24gdGhlIGBGaWx0ZXJMZWFmYCBvYmplY3QgaW5zdGVhZC4gQ2FsbGluZyBgdGVzdCgpYCBvbiB0aGUgcm9vdCB0cmVlIHRoZXJlZm9yZSByZXR1cm5zIGEgYm9vbGVhbiB0aGF0IGRldGVybWluZXMgaWYgdGhlIHJvdyBwYXNzZXMgdGhyb3VnaCB0aGUgZW50aXJlIGZpbHRlciBleHByZXNzaW9uIChgdHJ1ZWApIG9yIGlzIGJsb2NrZWQgYnkgaXQgKGBmYWxzZWApLlxuICpcbiAqIFRoZSBwcm9ncmFtbWVyIG1heSBkZWZpbmUgYSBuZXcgdHlwZSBvZiBzaW1wbGUgZXhwcmVzc2lvbiBieSBleHRlbmRpbmcgZnJvbSBgRmlsdGVyTGVhZmAuIEFuIGV4YW1wbGUgaXMgdGhlIGBGaWx0ZXJGaWVsZGAgb2JqZWN0LiBTdWNoIGFuIGltcGxlbWVudGF0aW9uIG11c3QgaW5jbHVkZSBtZXRob2RzOlxuICpcbiAqICogU2F2ZSBhbmQgc3Vic2VxdWVudGx5IHJlbG9hZCB0aGUgc3RhdGUgb2YgdGhlIGNvbmRpdGlvbmFsIGFzIGVudGVyZWQgYnkgdGhlIHVzZXIgKGB0b0pTT04oKWAgYW5kIGBzZXRTdGF0ZSgpYCwgcmVzcGVjdGl2ZWx5KS5cbiAqICogQ3JlYXRlIHRoZSBET00gb2JqZWN0cyB0aGF0IHJlcHJlc2VudCB0aGUgVUkgZmlsdGVyIGVkaXRvciBhbmQgcmVuZGVyIHRoZW0gdG8gdGhlIFVJIChgY3JlYXRlVmlldygpYCBhbmQgYHJlbmRlcigpYCwgcmVzcGVjdGl2ZWx5KS5cbiAqICogRmlsdGVyIGEgdGFibGUgYnkgaW1wbGVtZW50aW5nIG9uZSBvciBtb3JlIG9mIHRoZSBmb2xsb3dpbmc6XG4gKiAgICogQXBwbHkgdGhlIGNvbmRpdGlvbmFsIGxvZ2ljIHRvIGF2YWlsYWJsZSB0YWJsZSByb3cgZGF0YSAoYHRlc3QoKWApLlxuICogICAqIEFwcGx5IHRoZSBjb25kaXRpb25hbCBsb2dpYyB0byBhIHJlbW90ZSBkYXRhLXN0b3JlIGJ5IGdlbmVyYXRpbmcgYSAqKlNRTCoqIG9yICoqUSoqIF9XSEVSRV8gY2xhdXNlIChgdG9TUUwoKWAgYW5kIGB0b1EoKWAsIHJlc3BlY3RpdmVseSkuXG4gKlxuICogU29tZSBvZiB0aGUgYWJvdmUtbmFtZWQgbWV0aG9kcyBhcyBhbHJlYWR5IGltcGxlbWVudGVkIGluIGBGaWx0ZXJMZWFmYCBhbmQvb3IgYEZpbHRlck5vZGVgIG1heSBiZSBzdWZmaWNpZW50IHRvIGhhbmRsZSB5b3VyIG5lZWRzIGFzIGlzICh3aXRob3V0IGZ1cnRoZXIgY29kZSkuXG4gKlxuICogQHBhcmFtIHtzdHJpbmdbXX0gW29wdGlvbnMuZmllbGRzXSAtIEEgZGVmYXVsdCBsaXN0IG9mIGNvbHVtbiBuYW1lcyBmb3IgZmllbGQgZHJvcC1kb3ducyBvZiBhbGwgZGVzY2VuZGFudCB0ZXJtaW5hbCBub2Rlcy4gT3ZlcnJpZGVzIGBvcHRpb25zLnN0YXRlLmZpZWxkc2AgKHNlZSkuIE1heSBiZSBkZWZpbmVkIGZvciBhbnkgbm9kZSBhbmQgcGVydGFpbnMgdG8gYWxsIGRlc2NlbmRhbnRzIG9mIHRoYXQgbm9kZSAoaW5jbHVkaW5nIHRlcm1pbmFsIG5vZGVzKS4gSWYgb21pdHRlZCAoYW5kIG5vIGBub2RlRmllbGRzYCksIHdpbGwgdXNlIHRoZSBuZWFyZXN0IGFuY2VzdG9yIGBmaWVsZHNgIGRlZmluaXRpb24uIEhvd2V2ZXIsIGRlc2NlbmRhbnRzIHdpdGggdGhlaXIgb3duIGRlZmluaXRpb24gb2YgYHR5cGVzYCB3aWxsIG92ZXJyaWRlIGFueSBhbmNlc3RvciBkZWZpbml0aW9uLlxuICpcbiAqID4gVHlwaWNhbGx5IG9ubHkgdXNlZCBieSB0aGUgY2FsbGVyIGZvciB0aGUgdG9wLWxldmVsIChyb290KSB0cmVlLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nW119IFtvcHRpb25zLm5vZGVGaWVsZHNdIC0gQSBkZWZhdWx0IGxpc3Qgb2YgY29sdW1uIG5hbWVzIGZvciBmaWVsZCBkcm9wLWRvd25zIG9mIGltbWVkaWF0ZSBkZXNjZW5kYW50IHRlcm1pbmFsIG5vZGVzIF9vbmx5Xy4gT3ZlcnJpZGVzIGBvcHRpb25zLnN0YXRlLm5vZGVGaWVsZHNgIChzZWUpLlxuICpcbiAqIEFsdGhvdWdoIGJvdGggYG9wdGlvbnMuZmllbGRzYCBhbmQgYG9wdGlvbnMubm9kZUZpZWxkc2AgYXJlIG5vdGF0ZWQgYXMgb3B0aW9uYWwgaGVyZWluLCBieSB0aGUgdGltZSBhIHRlcm1pbmFsIG5vZGUgdHJpZXMgdG8gcmVuZGVyIGEgZmllbGRzIGRyb3AtZG93biwgYSBgZmllbGRzYCBsaXN0IF9tdXN0XyBiZSBkZWZpbmVkIHRocm91Z2ggKGluIG9yZGVyIG9mIHByaW9yaXR5KTpcbiAqXG4gKiAqIFRlcm1pbmFsIG5vZGUncyBvd24gYG9wdGlvbnMuZmllbGRzYCAob3IgYG9wdGlvbnMuc3RhdGUuZmllbGRzYCkgZGVmaW5pdGlvbi5cbiAqICogVGVybWluYWwgbm9kZSdzIHBhcmVudCBub2RlJ3MgYG9wdGlvbi5ub2RlRmllbGRzYCAob3IgYG9wdGlvbi5zdGF0ZS5ub2Rlc0ZpZWxkc2ApIGRlZmluaXRpb24uXG4gKiAqIEFueSBvZiB0ZXJtaW5hbCBub2RlJ3MgYW5jZXN0b3IncyBgb3B0aW9ucy5maWVsZHNgIChvciBgb3B0aW9ucy5zdGF0ZS5maWVsZHNgKSBkZWZpbml0aW9uLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9ucy5zdGF0ZV0gLSBBIGRhdGEgc3RydWN0dXJlIHRoYXQgZGVzY3JpYmVzIGEgdHJlZSwgc3VidHJlZSwgb3IgbGVhZjpcbiAqXG4gKiAqIE1heSBkZXNjcmliZSBhIHRlcm1pbmFsIG5vZGUgd2l0aCBwcm9wZXJ0aWVzOlxuICogICAqIGBmaWVsZHNgIC0gT3ZlcnJpZGRlbiBvbiBpbnN0YW50aWF0aW9uIGJ5IGBvcHRpb25zLmZpZWxkc2AuIElmIGJvdGggdW5zcGVjaWZpZWQsIHVzZXMgcGFyZW50J3MgZGVmaW5pdGlvbi5cbiAqICAgKiBgZWRpdG9yYCAtIEEgc3RyaW5nIGlkZW50aWZ5aW5nIHRoZSB0eXBlIG9mIGNvbmRpdGlvbmFsLiBNdXN0IGJlIGluIHRoZSB0cmVlJ3MgKHNlZSB7QGxpbmsgRmlsdGVyVHJlZSNlZGl0b3JzfGVkaXRvcnN9KSBoYXNoLiBJZiBvbWl0dGVkLCBkZWZhdWx0cyB0byBgJ0RlZmF1bHQnYC5cbiAqICAgKiBtaXNjLiAtIE90aGVyIHByb3BlcnRpZXMgcGVjdWxpYXIgdG8gdGhpcyBmaWx0ZXIgdHlwZSAoYnV0IHR5cGljYWxseSBpbmNsdWRpbmcgYXQgbGVhc3QgYSBgZmllbGRgIHByb3BlcnR5KS5cbiAqICogTWF5IGRlc2NyaWJlIGEgbm9uLXRlcm1pbmFsIG5vZGUgd2l0aCBwcm9wZXJ0aWVzOlxuICogICAqIGBmaWVsZHNgIC0gT3ZlcnJpZGRlbiBvbiBpbnN0YW50aWF0aW9uIGJ5IGBvcHRpb25zLmZpZWxkc2AuIElmIGJvdGggdW5zcGVjaWZpZWQsIHVzZXMgcGFyZW50J3MgZGVmaW5pdGlvbi5cbiAqICAgKiBgb3BlcmF0b3JgIC0gT25lIG9mIHtAbGluayB0cmVlT3BlcmF0b3JzfS5cbiAqICAgKiBgY2hpbGRyZW5gIC0gIEFycmF5IGNvbnRhaW5pbmcgYWRkaXRpb25hbCB0ZXJtaW5hbCBhbmQgbm9uLXRlcm1pbmFsIG5vZGVzLlxuICpcbiAqIElmIHRoaXMgYG9wdGlvbnMuc3RhdGVgIG9iamVjdCBpcyBvbWl0dGVkIGFsdG9nZXRoZXIsIGxvYWRzIGFuIGVtcHR5IGZpbHRlciwgd2hpY2ggaXMgYSBgRmlsdGVyVHJlZWAgbm9kZSBjb25zaXN0aW5nIHRoZSBkZWZhdWx0IGBvcGVyYXRvcmAgdmFsdWUgKGAnb3AtYW5kJ2ApLlxuICpcbiAqID4gTm90ZSB0aGF0IHRoaXMgaXMgYSBKU09OIG9iamVjdDsgbm90IGEgSlNPTiBzdHJpbmcgKF9pLmUuLF8gXCJwYXJzZWRcIjsgbm90IFwic3RyaW5naWZpZWRcIikuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gW29wdGlvbnMuZWRpdG9yPSdEZWZhdWx0J10gLSBUeXBlIG9mIHNpbXBsZSBleHByZXNzaW9uLlxuICpcbiAqIEBwYXJhbSB7RmlsdGVyVHJlZX0gW29wdGlvbnMucGFyZW50XSAtIFVzZWQgaW50ZXJuYWxseSB0byBpbnNlcnQgZWxlbWVudCB3aGVuIGNyZWF0aW5nIG5lc3RlZCBzdWJ0cmVlcy4gRm9yIHRoZSB0b3AgbGV2ZWwgdHJlZSwgeW91IGRvbid0IGdpdmUgYSB2YWx1ZSBmb3IgYHBhcmVudGA7IHlvdSBhcmUgcmVzcG9uc2libGUgZm9yIGluc2VydGluZyB0aGUgdG9wLWxldmVsIGAuZWxgIGludG8gdGhlIERPTS5cbiAqL1xudmFyIEZpbHRlck5vZGUgPSBCYXNlLmV4dGVuZCh7XG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIHBhcmVudCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5wYXJlbnQsXG4gICAgICAgICAgICBzdGF0ZSA9IG9wdGlvbnMgJiYgKFxuICAgICAgICAgICAgICAgIG9wdGlvbnMuc3RhdGUgfHxcbiAgICAgICAgICAgICAgICBvcHRpb25zLmpzb24gJiYgSlNPTi5wYXJzZShvcHRpb25zLmpzb24pXG4gICAgICAgICAgICApO1xuXG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuXG4gICAgICAgIC8vIGNyZWF0ZSBlYWNoIG9wdGlvbiBzdGFuZGFyZCBvcHRpb24gZnJvbSBvcHRpb25zLCBzdGF0ZSwgb3IgcGFyZW50XG4gICAgICAgIF8oRmlsdGVyTm9kZS5vcHRpb25zU2NoZW1hKS5lYWNoKGZ1bmN0aW9uKHNjaGVtYSwga2V5KSB7XG4gICAgICAgICAgICB2YXIgb3B0aW9uID0gb3B0aW9ucyAmJiBvcHRpb25zW2tleV0gfHxcbiAgICAgICAgICAgICAgICBzdGF0ZSAmJiBzdGF0ZVtrZXldIHx8XG4gICAgICAgICAgICAgICAgIXNjaGVtYS5vd24gJiYgKFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQgJiYgcGFyZW50W2tleV0gfHwgLy8gcmVmZXJlbmNlIHBhcmVudCB2YWx1ZSBub3cgc28gd2UgZG9uJ3QgaGF2ZSB0byBzZWFyY2ggdXAgdGhlIHRyZWUgbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgc2NoZW1hLmRlZmF1bHRcbiAgICAgICAgICAgICAgICApO1xuXG5cbiAgICAgICAgICAgIGlmIChvcHRpb24pIHtcbiAgICAgICAgICAgICAgICBzZWxmW2tleV0gPSBvcHRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHRyYW5zZm9ybSBjb25kaXRpb25hbHMgd2l0aCAnQCcgYXMgZmlyc3QgY2hhciB0byByZWZlcmVuY2UgdG8gZ3JvdXAgb2YgbmFtZVxuICAgICAgICB0aGlzLm9wZXJhdG9yT3B0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKG9wdGlvbiwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9uID09PSAnc3RyaW5nJyAmJiBvcHRpb25bMF0gPT09ICdAJykge1xuICAgICAgICAgICAgICAgIHNlbGYub3BlcmF0b3JPcHRpb25zW2luZGV4XSA9IGNvbmRpdGlvbmFscy5ncm91cHNbb3B0aW9uLnN1YnN0cigxKV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoc3RhdGUpO1xuICAgIH0sXG5cbiAgICAvKiogSW5zZXJ0IGVhY2ggc3VidHJlZSBpbnRvIGl0cyBwYXJlbnQgbm9kZSBhbG9uZyB3aXRoIGEgXCJkZWxldGVcIiBidXR0b24uXG4gICAgICogPiBUaGUgcm9vdCB0cmVlIGlzIGhhcyBubyBwYXJlbnQgYW5kIGlzIGluc2VydGVkIGludG8gdGhlIERPTSBieSB0aGUgaW5zdGFudGlhdGluZyBjb2RlICh3aXRob3V0IGEgZGVsZXRlIGJ1dHRvbikuXG4gICAgICovXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMucGFyZW50KSB7XG4gICAgICAgICAgICB2YXIgbmV3TGlzdEl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KENISUxEX1RBRyk7XG5cbiAgICAgICAgICAgIGlmICghKHRoaXMuc3RhdGUgJiYgdGhpcy5zdGF0ZS5sb2NrZWQpKSB7XG4gICAgICAgICAgICAgICAgbmV3TGlzdEl0ZW0uYXBwZW5kQ2hpbGQodGVtcGxhdGUoJ3JlbW92ZUJ1dHRvbicpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV3TGlzdEl0ZW0uYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICAgICAgICB0aGlzLnBhcmVudC5lbC5xdWVyeVNlbGVjdG9yKENISUxEUkVOX1RBRykuYXBwZW5kQ2hpbGQobmV3TGlzdEl0ZW0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNldFN0YXRlOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgICB2YXIgb2xkRWwgPSB0aGlzLmVsO1xuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgICAgIHRoaXMuY3JlYXRlVmlldygpO1xuICAgICAgICB0aGlzLmxvYWRTdGF0ZSgpO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICBpZiAob2xkRWwgJiYgIXRoaXMucGFyZW50KSB7XG4gICAgICAgICAgICBvbGRFbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZCh0aGlzLmVsLCBvbGRFbCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdG9KU09OOiBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgIHZhciBzdGF0ZSA9IHt9O1xuXG4gICAgICAgIGlmICh0aGlzLnRvSnNvbk9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciB0cmVlID0gdGhpcywgbWV0YWRhdGEgPSBbXTtcbiAgICAgICAgICAgIGlmICh0aGlzLnRvSnNvbk9wdGlvbnMuZmllbGRzKSB7XG4gICAgICAgICAgICAgICAgbWV0YWRhdGEucHVzaCgnZmllbGRzJyk7XG4gICAgICAgICAgICAgICAgbWV0YWRhdGEucHVzaCgnbm9kZUZpZWxkcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMudG9Kc29uT3B0aW9ucy5lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBtZXRhZGF0YS5wdXNoKCdlZGl0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1ldGFkYXRhLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgICAgICAgICAgIGlmICghdHJlZS5wYXJlbnQgfHwgdHJlZVtwcm9wXSAmJiB0cmVlW3Byb3BdICE9PSB0cmVlLnBhcmVudFtwcm9wXSkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVtwcm9wXSA9IHRyZWVbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfSxcblxuICAgIFNRTF9RVU9URURfSURFTlRJRklFUjogJ1wiJ1xuXG59KTtcblxuRmlsdGVyTm9kZS5vcHRpb25zU2NoZW1hID0ge1xuICAgIC8qKiBEZWZhdWx0IGxpc3Qgb2YgZmllbGRzIG9ubHkgZm9yIGRpcmVjdCBjaGlsZCB0ZXJtaW5hbC1ub2RlIGRyb3AtZG93bnMuXG4gICAgICogQHR5cGUge3N0cmluZ1tdfVxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlLnByb3RvdHlwZVxuICAgICAqL1xuICAgIG5vZGVGaWVsZHM6IHsgb3duOiB0cnVlIH0sXG5cbiAgICAvKiogRGVmYXVsdCBsaXN0IG9mIGZpZWxkcyBmb3IgYWxsIGRlc2NlbmRhbnQgdGVybWluYWwtbm9kZSBkcm9wLWRvd25zLlxuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTm9kZS5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBmaWVsZHM6IHt9LFxuXG4gICAgLyoqIFR5cGUgb2YgZmlsdGVyIGVkaXRvci5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGVkaXRvcjoge30sXG5cbiAgICAvKiogRXZlbnQgaGFuZGxlciBmb3IgVUkgZXZlbnRzLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICogQG1lbWJlck9mIEZpbHRlck5vZGUucHJvdG90eXBlXG4gICAgICovXG4gICAgZXZlbnRIYW5kbGVyOiB7fSxcblxuICAgIC8qKiBJZiB0aGlzIGlzIHRoZSBjb2x1bW4gZmlsdGVycyBzdWJ0cmVlLlxuICAgICAqIFNob3VsZCBvbmx5IGV2ZXIgYmUgZmlyc3QgY2hpbGQgb2Ygcm9vdCB0cmVlLlxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGlzQ29sdW1uRmlsdGVyczogeyBvd246IHRydWUgfSxcblxuICAgIG9wZXJhdG9yT3B0aW9uczogeyBkZWZhdWx0OiBjb25kaXRpb25hbHMub3B0aW9ucyB9XG59O1xuXG5GaWx0ZXJOb2RlLnNldFdhcm5pbmdDbGFzcyA9IGZ1bmN0aW9uKGVsLCB2YWx1ZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgICB2YWx1ZSA9IGVsLnZhbHVlO1xuICAgIH1cbiAgICBlbC5jbGFzc0xpc3RbdmFsdWUgPyAncmVtb3ZlJyA6ICdhZGQnXSgnZmlsdGVyLXRyZWUtd2FybmluZycpO1xuICAgIHJldHVybiB2YWx1ZTtcblxufTtcblxuRmlsdGVyTm9kZS5FcnJvciA9IGZ1bmN0aW9uKG1zZykge1xuICAgIHJldHVybiBuZXcgRXJyb3IoJ2ZpbHRlci10cmVlOiAnICsgbXNnKTtcbn07XG5cbkZpbHRlck5vZGUuY2xpY2tJbiA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgaWYgKGVsKSB7XG4gICAgICAgIGlmIChlbC50YWdOYW1lID09PSAnU0VMRUNUJykge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgZWwuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudCgnbW91c2Vkb3duJykpOyB9LCAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbHRlck5vZGU7XG4iLCIndXNlIHN0cmljdCc7XG5cblxudmFyIF8gPSByZXF1aXJlKCdvYmplY3QtaXRlcmF0b3JzJyk7XG52YXIgcmVnRXhwTElLRSA9IHJlcXVpcmUoJ3JlZ2V4cC1saWtlJyk7XG5cbnZhciBMSUtFID0gJ0xJS0UgJyxcbiAgICBOT1RfTElLRSA9ICdOT1QgJyArIExJS0UsXG4gICAgTElLRV9XSUxEX0NBUkQgPSAnJSc7XG5cbnZhciBvcGVyYXRvcnMgPSB7XG4gICAgJzwnOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPCBiOyB9LFxuICAgICAgICBzcWw6IHNxbERpYWRpYy5iaW5kKHRoaXMsICc8JylcbiAgICB9LFxuICAgICdcXHUyMjY0Jzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhIDw9IGI7IH0sXG4gICAgICAgIHNxbDogc3FsRGlhZGljLmJpbmQodGhpcywgJzw9JylcbiAgICB9LFxuICAgICc9Jzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhID09PSBiOyB9LFxuICAgICAgICBzcWw6IHNxbERpYWRpYy5iaW5kKHRoaXMsICc9JylcbiAgICB9LFxuICAgICdcXHUyMjY1Jzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhID49IGI7IH0sXG4gICAgICAgIHNxbDogc3FsRGlhZGljLmJpbmQodGhpcywgJz49JylcbiAgICB9LFxuICAgICc+Jzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhID4gYjsgfSxcbiAgICAgICAgc3FsOiBzcWxEaWFkaWMuYmluZCh0aGlzLCAnPicpXG4gICAgfSxcbiAgICAnXFx1MjI2MCc6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYSAhPT0gYjsgfSxcbiAgICAgICAgc3FsOiBzcWxEaWFkaWMuYmluZCh0aGlzLCAnPD4nKVxuICAgIH0sXG4gICAgTElLRToge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiByZWdFeHBMSUtFLmNhY2hlZChiLCB0cnVlKS50ZXN0KGEpOyB9LFxuICAgICAgICBzcWw6IHNxbERpYWRpYy5iaW5kKHRoaXMsICdMSUtFJyksXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfSxcbiAgICAnTk9UIExJS0UnOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuICFyZWdFeHBMSUtFLmNhY2hlZChiLCB0cnVlKS50ZXN0KGEpOyB9LFxuICAgICAgICBzcWw6IHNxbERpYWRpYy5iaW5kKHRoaXMsICdOT1QgTElLRScpLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG4gICAgSU46IHsgLy8gVE9ETzogY3VycmVudGx5IGZvcmNpbmcgc3RyaW5nIHR5cGluZzsgcmV3b3JrIGNhbGxpbmcgY29kZSB0byByZXNwZWN0IGNvbHVtbiB0eXBlXG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGluT3AoYSwgYikgPj0gMDsgfSxcbiAgICAgICAgc3FsOiBzcWxJTi5iaW5kKHRoaXMsICdJTicpLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG4gICAgJ05PVCBJTic6IHsgLy8gVE9ETzogY3VycmVudGx5IGZvcmNpbmcgc3RyaW5nIHR5cGluZzsgcmV3b3JrIGNhbGxpbmcgY29kZSB0byByZXNwZWN0IGNvbHVtbiB0eXBlXG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGluT3AoYSwgYikgPCAwOyB9LFxuICAgICAgICBzcWw6IHNxbElOLmJpbmQodGhpcywgJ05PVCBJTicpLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG4gICAgQ09OVEFJTlM6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gY29udGFpbnNPcChhLCBiKSA+PSAwOyB9LFxuICAgICAgICBzcWw6IHNxbExJS0UuYmluZCh0aGlzLCBMSUtFX1dJTERfQ0FSRCwgTElLRV9XSUxEX0NBUkQsIExJS0UpLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG4gICAgJ05PVCBDT05UQUlOUyc6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gY29udGFpbnNPcChhLCBiKSA8IDA7IH0sXG4gICAgICAgIHNxbDogc3FsTElLRS5iaW5kKHRoaXMsIExJS0VfV0lMRF9DQVJELCBMSUtFX1dJTERfQ0FSRCwgTk9UX0xJS0UpLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG4gICAgQkVHSU5TOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgYiA9IGIudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpOyByZXR1cm4gYmVnaW5zT3AoYSwgYi5sZW5ndGgpID09PSBiOyB9LFxuICAgICAgICBzcWw6IHNxbExJS0UuYmluZCh0aGlzLCAnJywgTElLRV9XSUxEX0NBUkQsIExJS0UpLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG4gICAgJ05PVCBCRUdJTlMnOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgYiA9IGIudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpOyByZXR1cm4gYmVnaW5zT3AoYSwgYi5sZW5ndGgpICE9PSBiOyB9LFxuICAgICAgICBzcWw6IHNxbExJS0UuYmluZCh0aGlzLCAnJywgTElLRV9XSUxEX0NBUkQsIE5PVF9MSUtFKSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuICAgIEVORFM6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyBiID0gYi50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7IHJldHVybiBlbmRzT3AoYSwgYi5sZW5ndGgpID09PSBiOyB9LFxuICAgICAgICBzcWw6IHNxbExJS0UuYmluZCh0aGlzLCBMSUtFX1dJTERfQ0FSRCwgJycsIExJS0UpLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG4gICAgJ05PVCBFTkRTJzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IGIgPSBiLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTsgcmV0dXJuIGVuZHNPcChhLCBiLmxlbmd0aCkgIT09IGI7IH0sXG4gICAgICAgIHNxbDogc3FsTElLRS5iaW5kKHRoaXMsIExJS0VfV0lMRF9DQVJELCAnJywgTk9UX0xJS0UpLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGluT3AoYSwgYikge1xuICAgIHJldHVybiBiXG4gICAgICAgIC50cmltKCkgLy8gcmVtb3ZlIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNwYWNlIGNoYXJzXG4gICAgICAgIC5yZXBsYWNlKC9cXHMqLFxccyovZywgJywnKSAvLyByZW1vdmUgYW55IHdoaXRlLXNwYWNlIGNoYXJzIGZyb20gYXJvdW5kIGNvbW1hc1xuICAgICAgICAuc3BsaXQoJywnKSAvLyBwdXQgaW4gYW4gYXJyYXlcbiAgICAgICAgLmluZGV4T2YoYS50b1N0cmluZygpKTsgLy8gc2VhcmNoIGFycmF5IHdob2xlIG1hdGNoZXNcbn1cblxuZnVuY3Rpb24gY29udGFpbnNPcChhLCBiKSB7XG4gICAgcmV0dXJuIGEudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpLmluZGV4T2YoYi50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkpO1xufVxuXG5mdW5jdGlvbiBiZWdpbnNPcChhLCBsZW5ndGgpIHtcbiAgICByZXR1cm4gYS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkuc3Vic3RyKDAsIGxlbmd0aCk7XG59XG5cbmZ1bmN0aW9uIGVuZHNPcChhLCBsZW5ndGgpIHtcbiAgICByZXR1cm4gYS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkuc3Vic3RyKC1sZW5ndGgsIGxlbmd0aCk7XG59XG5cbmZ1bmN0aW9uIHNxbExJS0UoYmVnLCBlbmQsIExJS0VfT1JfTk9UX0xJS0UsIGEsIGxpa2VQYXR0ZXJuKSB7XG4gICAgdmFyIGVzY2FwZWQgPSBsaWtlUGF0dGVybi5yZXBsYWNlKC8oW1xcW18lXFxdXSkvZywgJ1skMV0nKTsgLy8gZXNjYXBlIGFsbCBMSUtFIHJlc2VydmVkIGNoYXJzXG4gICAgcmV0dXJuIGlkZW50aWZpZXIoYSkgKyAnICcgKyBMSUtFX09SX05PVF9MSUtFICsgJyAnICsgZ2V0U3FsU3RyaW5nKGJlZyArIGVzY2FwZWQgKyBlbmQpO1xufVxuXG5mdW5jdGlvbiBzcWxJTihvcCwgYSwgYikge1xuICAgIHJldHVybiBpZGVudGlmaWVyKGEpICsgJyAnICsgb3AgKyAnIChcXCcnICsgc3FFc2MoYikucmVwbGFjZSgvXFxzKixcXHMqL2csICdcXCcsIFxcJycpICsgJ1xcJyknO1xufVxuXG5mdW5jdGlvbiBpZGVudGlmaWVyKHMpIHtcbiAgICByZXR1cm4gcy5saXRlcmFsID8gZ2V0U3FsU3RyaW5nKHMubGl0ZXJhbCkgOiBnZXRTcWxJZGVudGlmaWVyKHMuaWRlbnRpZmllciA/IHMuaWRlbnRpZmllciA6IHMpO1xufVxuXG5mdW5jdGlvbiBsaXRlcmFsKHMpIHtcbiAgICByZXR1cm4gcy5pZGVudGlmaWVyID8gZ2V0U3FsSWRlbnRpZmllcihzLmlkZW50aWZpZXIpIDogZ2V0U3FsU3RyaW5nKHMubGl0ZXJhbCA/IHMubGl0ZXJhbCA6IHMpO1xufVxuXG5mdW5jdGlvbiBzcWxEaWFkaWMob3AsIGEsIGIpIHtcbiAgICByZXR1cm4gaWRlbnRpZmllcihhKSArIG9wICsgbGl0ZXJhbChiKTtcbn1cblxuZnVuY3Rpb24gc3FFc2Moc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC8nL2csICdcXCdcXCcnKTtcbn1cblxuZnVuY3Rpb24gZ2V0U3FsU3RyaW5nKHN0cmluZykge1xuICAgIHJldHVybiAnXFwnJyArIHNxRXNjKHN0cmluZykgKyAnXFwnJztcbn1cblxuZnVuY3Rpb24gZ2V0U3FsSWRlbnRpZmllcihpZCkge1xuICAgIHJldHVybiAnXFxcIicgKyBzcUVzYyhpZCkgKyAnXFxcIic7XG59XG5cbi8vIExpc3QgdGhlIG9wZXJhdG9ycyBhcyBkcm9wLWRvd24gb3B0aW9ucyBpbiBhbiBoaWVyYXJjaGljYWwgYXJyYXkgKHJlbmRlcmVkIGFzIG9wdGlvbiBncm91cHMpOlxuXG52YXIgZ3JvdXBzID0ge1xuICAgIGVxdWFsaXR5OiB7XG4gICAgICAgIGxhYmVsOiAnRXF1YWxpdHknLFxuICAgICAgICBvcHRpb25zOiBbJz0nXVxuICAgIH0sXG4gICAgaW5lcXVhbGl0aWVzOiB7XG4gICAgICAgIGxhYmVsOiAnSW5lcXVhbGl0eScsXG4gICAgICAgIG9wdGlvbnM6IFsnPCcsICdcXHUyMjY0JywgJ1xcdTIyNjAnLCAnXFx1MjI2NScsICc+J11cbiAgICB9LFxuICAgIHNldHM6IHtcbiAgICAgICAgbGFiZWw6ICdTZXQgc2NhbicsXG4gICAgICAgIG9wdGlvbnM6IFsnSU4nLCAnTk9UIElOJ11cbiAgICB9LFxuICAgIHN0cmluZ3M6IHtcbiAgICAgICAgbGFiZWw6ICdTdHJpbmcgc2NhbicsXG4gICAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgICAgICdDT05UQUlOUycsICdOT1QgQ09OVEFJTlMnLFxuICAgICAgICAgICAgJ0JFR0lOUycsICdOT1QgQkVHSU5TJyxcbiAgICAgICAgICAgICdFTkRTJywgJ05PVCBFTkRTJ1xuICAgICAgICBdXG4gICAgfSxcbiAgICBwYXR0ZXJuczoge1xuICAgICAgICBsYWJlbDogJ1BhdHRlcm4gbWF0Y2hpbmcnLFxuICAgICAgICBvcHRpb25zOiBbJ0xJS0UnLCAnTk9UIExJS0UnXVxuICAgIH1cbn07XG5cbi8vIGFkZCBhIGBuYW1lYCBwcm9wIHRvIGVhY2ggZ3JvdXAgdG8gZ3VpZGUgaW5zZXJ0aW9uIG9mIG5ldyBncm91cHMgaW50byBgLm9wdGlvbnNgXG5fKGdyb3VwcykuZWFjaChmdW5jdGlvbihncm91cCwga2V5KSB7IGdyb3VwLm5hbWUgPSBrZXk7IH0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBvcGVyYXRvcnM6IG9wZXJhdG9ycyxcbiAgICBncm91cHM6IGdyb3VwcyxcbiAgICBvcHRpb25zOiBbXG4gICAgICAgIGdyb3Vwcy5lcXVhbGl0eSxcbiAgICAgICAgZ3JvdXBzLmluZXF1YWxpdGllcyxcbiAgICAgICAgZ3JvdXBzLnNldHMsXG4gICAgICAgIGdyb3Vwcy5zdHJpbmdzLFxuICAgICAgICBncm91cHMucGF0dGVybnNcbiAgICBdXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3NzSW5qZWN0b3IgPSByZXF1aXJlKCdjc3MtaW5qZWN0b3InKTtcblxudmFyIGNzczsgLy8gZGVmaW5lZCBieSBjb2RlIGluc2VydGVkIGJ5IGd1bHBmaWxlIGJldHdlZW4gZm9sbG93aW5nIGNvbW1lbnRzXG4vKiBpbmplY3Q6Y3NzICovXG5jc3MgPSAnLmZpbHRlci10cmVle2ZvbnQtZmFtaWx5OnNhbnMtc2VyaWY7Zm9udC1zaXplOjEwcHQ7bGluZS1oZWlnaHQ6MS41ZW19LmZpbHRlci10cmVlIGxhYmVse2ZvbnQtd2VpZ2h0OjQwMH0uZmlsdGVyLXRyZWUgaW5wdXRbdHlwZT1jaGVja2JveF0sLmZpbHRlci10cmVlIGlucHV0W3R5cGU9cmFkaW9de2xlZnQ6M3B4O21hcmdpbi1yaWdodDozcHh9LmZpbHRlci10cmVlIG9se21hcmdpbi10b3A6MH0uZmlsdGVyLXRyZWUtYWRkLC5maWx0ZXItdHJlZS1hZGQtZmlsdGVyLC5maWx0ZXItdHJlZS1yZW1vdmV7Y3Vyc29yOnBvaW50ZXJ9LmZpbHRlci10cmVlLWFkZCwuZmlsdGVyLXRyZWUtYWRkLWZpbHRlcntmb250LXN0eWxlOml0YWxpYztjb2xvcjojNDQ0O2ZvbnQtc2l6ZTo5MCV9LmZpbHRlci10cmVlLWFkZC1maWx0ZXJ7bWFyZ2luOjNweCAwO2Rpc3BsYXk6aW5saW5lLWJsb2NrfS5maWx0ZXItdHJlZS1hZGQtZmlsdGVyOmhvdmVyLC5maWx0ZXItdHJlZS1hZGQ6aG92ZXJ7dGV4dC1kZWNvcmF0aW9uOnVuZGVybGluZX0uZmlsdGVyLXRyZWUtYWRkLWZpbHRlci5hcy1tZW51LWhlYWRlciwuZmlsdGVyLXRyZWUtYWRkLmFzLW1lbnUtaGVhZGVye2JhY2tncm91bmQtY29sb3I6I2ZmZjtmb250LXdlaWdodDo3MDA7Zm9udC1zdHlsZTpub3JtYWx9LmZpbHRlci10cmVlLWFkZC1maWx0ZXIuYXMtbWVudS1oZWFkZXI6aG92ZXJ7dGV4dC1kZWNvcmF0aW9uOmluaGVyaXR9LmZpbHRlci10cmVlLWFkZC1maWx0ZXI+ZGl2LC5maWx0ZXItdHJlZS1hZGQ+ZGl2LC5maWx0ZXItdHJlZS1yZW1vdmV7ZGlzcGxheTppbmxpbmUtYmxvY2s7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kLWNvbG9yOiM4Yzg7Zm9udC1zaXplOjExLjVweDtmb250LXdlaWdodDo3MDA7Y29sb3I6I2ZmZjt0ZXh0LWFsaWduOmNlbnRlcjtsaW5lLWhlaWdodDpub3JtYWw7Zm9udC1zdHlsZTpub3JtYWw7Zm9udC1mYW1pbHk6c2Fucy1zZXJpZjt0ZXh0LXNoYWRvdzowIDAgMS41cHggZ3JleTttYXJnaW4tcmlnaHQ6NHB4fS5maWx0ZXItdHJlZS1hZGQtZmlsdGVyPmRpdjpiZWZvcmUsLmZpbHRlci10cmVlLWFkZD5kaXY6YmVmb3Jle2NvbnRlbnQ6XFwnXFxcXGZmMGJcXCd9LmZpbHRlci10cmVlLXJlbW92ZXtiYWNrZ3JvdW5kLWNvbG9yOiNlODg7Ym9yZGVyOjB9LmZpbHRlci10cmVlLXJlbW92ZTpiZWZvcmV7Y29udGVudDpcXCdcXFxcMjIxMlxcJ30uZmlsdGVyLXRyZWUgbGk6OmFmdGVye2ZvbnQtc2l6ZTo3MCU7Zm9udC1zdHlsZTppdGFsaWM7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOiMwODB9LmZpbHRlci10cmVlPm9sPmxpOmxhc3QtY2hpbGQ6OmFmdGVye2Rpc3BsYXk6bm9uZX0uZmlsdGVyLXRyZWUtYWRkLC5maWx0ZXItdHJlZS1hZGQtZmlsdGVyLC5vcC1hbmQ+b2wsLm9wLW5vcj5vbCwub3Atb3I+b2x7cGFkZGluZy1sZWZ0OjMycHh9Lm9wLW9yPm9sPmxpOjphZnRlcnttYXJnaW4tbGVmdDoyLjVlbTtjb250ZW50OlxcJ+KAlCBPUiDigJRcXCd9Lm9wLWFuZD5vbD5saTo6YWZ0ZXJ7bWFyZ2luLWxlZnQ6Mi41ZW07Y29udGVudDpcXCfigJQgQU5EIOKAlFxcJ30ub3Atbm9yPm9sPmxpOjphZnRlcnttYXJnaW4tbGVmdDoyLjVlbTtjb250ZW50OlxcJ+KAlCBOT1Ig4oCUXFwnfS5maWx0ZXItdHJlZS1lZGl0b3I+Kntmb250LXdlaWdodDo3MDB9LmZpbHRlci10cmVlLWVkaXRvcj5zcGFue2ZvbnQtc2l6ZTpzbWFsbGVyfS5maWx0ZXItdHJlZS1lZGl0b3I+aW5wdXRbdHlwZT10ZXh0XXt3aWR0aDo4ZW07cGFkZGluZzoxcHggNXB4IDJweH0uZmlsdGVyLXRyZWUtZGVmYXVsdD46ZW5hYmxlZHttYXJnaW46MCAuNGVtO2JhY2tncm91bmQtY29sb3I6I2RkZDtib3JkZXI6MH0uZmlsdGVyLXRyZWUtZGVmYXVsdD5zZWxlY3R7Ym9yZGVyOjB9LmZpbHRlci10cmVlLWRlZmF1bHQ+LmZpbHRlci10cmVlLXdhcm5pbmd7YmFja2dyb3VuZC1jb2xvcjojZmZjfS5maWx0ZXItdHJlZS1kZWZhdWx0Pi5maWx0ZXItdHJlZS1lcnJvcntiYWNrZ3JvdW5kLWNvbG9yOiNGY2N9LmZpbHRlci10cmVlIC5mb290bm90ZXN7Zm9udC1zaXplOjZwdDttYXJnaW46MnB4IDAgMDtsaW5lLWhlaWdodDpub3JtYWw7d2hpdGUtc3BhY2U6bm9ybWFsO2NvbG9yOiM5OTl9LmZpbHRlci10cmVlIC5mb290bm90ZXM+b2x7bWFyZ2luOjA7cGFkZGluZy1sZWZ0OjJlbX0uZmlsdGVyLXRyZWUgLmZvb3Rub3Rlcz5vbD5saXttYXJnaW46MnB4IDB9LmZpbHRlci10cmVlIC5mb290bm90ZXMgLmZpZWxkLW5hbWUsLmZpbHRlci10cmVlIC5mb290bm90ZXMgLmZpZWxkLXZhbHVle2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjojNzc3fS5maWx0ZXItdHJlZSAuZm9vdG5vdGVzIC5maWVsZC12YWx1ZTphZnRlciwuZmlsdGVyLXRyZWUgLmZvb3Rub3RlcyAuZmllbGQtdmFsdWU6YmVmb3Jle2NvbnRlbnQ6XFwnXFxcIlxcJ30uZmlsdGVyLXRyZWUgLmZvb3Rub3RlcyAuZmllbGQtdmFsdWV7Zm9udC1mYW1pbHk6bW9ub3NwYWNlfS5maWx0ZXItdHJlZS1jaG9vc2Vye3Bvc2l0aW9uOmFic29sdXRlO2ZvbnQtc2l6ZTo5cHQ7b3V0bGluZTowO2JveC1zaGFkb3c6NXB4IDVweCAxMHB4IGdyZXl9Jztcbi8qIGVuZGluamVjdCAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNzc0luamVjdG9yLmJpbmQodGhpcywgY3NzKTtcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB0ZW1wbGV4ID0gcmVxdWlyZSgndGVtcGxleCcpO1xuXG52YXIgdGVtcGxhdGVzID0ge1xuXG4gICAgdHJlZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8qXG4gICAgICAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlXCI+XG4gICAgICAgICAgICAgTWF0Y2hcbiAgICAgICAgICAgICA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwiZmlsdGVyLXRyZWUtb3AtY2hvaWNlXCIgbmFtZT1cInRyZWVPcHsxfVwiIHZhbHVlPVwib3Atb3JcIj5hbnk8L2xhYmVsPlxuICAgICAgICAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgY2xhc3M9XCJmaWx0ZXItdHJlZS1vcC1jaG9pY2VcIiBuYW1lPVwidHJlZU9wezF9XCIgdmFsdWU9XCJvcC1hbmRcIj5hbGw8L2xhYmVsPlxuICAgICAgICAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgY2xhc3M9XCJmaWx0ZXItdHJlZS1vcC1jaG9pY2VcIiBuYW1lPVwidHJlZU9wezF9XCIgdmFsdWU9XCJvcC1ub3JcIj5ub25lPC9sYWJlbD5cbiAgICAgICAgICAgICBvZiB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbmFsczo8YnIvPlxuICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiZmlsdGVyLXRyZWUtYWRkLWZpbHRlclwiIHRpdGxlPVwiQWRkIGEgbmV3IGNvbmRpdGlvbmFsIHRvIHRoaXMgbWF0Y2guXCI+XG4gICAgICAgICAgICAgICAgPGRpdj48L2Rpdj5jb25kaXRpb25hbFxuICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlLWFkZFwiIHRpdGxlPVwiQWRkIGEgbmV3IHN1Yi1tYXRjaCB1bmRlciB0aGlzIG1hdGNoLlwiPlxuICAgICAgICAgICAgICAgIDxkaXY+PC9kaXY+c3ViZXhwcmVzc2lvblxuICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICA8b2w+PC9vbD5cbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICovXG4gICAgfSxcblxuICAgIGNvbHVtbkZpbHRlcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvKlxuICAgICAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlIG9wLWFuZFwiPlxuICAgICAgICAgICAgPHN0cm9uZz5UaGlzIHBlcm1hbmVudCBzdWJleHByZXNzaW9uIGlzIHJlc2VydmVkIGZvciB0aGUgZ3JpZCdzIDxlbT5jb2x1bW4gZmlsdGVycy48L2VtPjwvc3Ryb25nPjxici8+XG4gICAgICAgICAgICA8ZW0gc3R5bGU9XCJ3aGl0ZS1zcGFjZTogbm9ybWFsOyBmb250LXNpemU6c21hbGxlcjsgbGluZS1oZWlnaHQ6IG5vcm1hbDsgZGlzcGxheTogYmxvY2s7IG1hcmdpbjouNWVtIDFlbTsgcGFkZGluZy1sZWZ0OiAxZW07IGJvcmRlci1sZWZ0OiAuN2VtIHNvbGlkIGxpZ2h0Z3JleTtcIj5cbiAgICAgICAgICAgICAgICBFYWNoIHN1YmV4cHJlc3Npb24gaW4gdGhpcyBzZWN0aW9uIHJlcHJlc2VudHMgdGhlIGNvbnRlbnRzIG9mIGEgY29sdW1uJ3MgZmlsdGVyIGNlbGwgKGJlbG93IGhlYWRlciBjZWxsKS5cbiAgICAgICAgICAgIDwvZW0+XG4gICAgICAgICAgICBSb3cgZGF0YSBtdXN0IG1hdGNoIDxzdHJvbmc+YWxsPC9zdHJvbmc+IG9mIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uYWxzOjxici8+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlLWFkZC1maWx0ZXJcIiB0aXRsZT1cIkFkZCBhIG5ldyBjb25kaXRpb25hbCB0byB0aGlzIG1hdGNoLlwiPlxuICAgICAgICAgICAgICAgPGRpdj48L2Rpdj5jb25kaXRpb25hbFxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJmaWx0ZXItdHJlZS1hZGRcIiB0aXRsZT1cIkFkZCBhIG5ldyBzdWItbWF0Y2ggdW5kZXIgdGhpcyBtYXRjaC5cIj5cbiAgICAgICAgICAgICAgIDxkaXY+PC9kaXY+Y29sdW1uIGZpbHRlciBzdWJleHByZXNzaW9uXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8b2w+PC9vbD5cbiAgICAgICAgPC9zcGFuPlxuICAgICAgICAqL1xuICAgIH0sXG5cbiAgICByZW1vdmVCdXR0b246IGZ1bmN0aW9uKCkge1xuICAgICAgICAvKlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZmlsdGVyLXRyZWUtcmVtb3ZlXCIgdGl0bGU9XCJkZWxldGUgY29uZGl0aW9uYWxcIj48L2Rpdj5cbiAgICAgICAgKi9cbiAgICB9LFxuXG4gICAgbm90ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8qXG4gICAgICAgIDxkaXYgY2xhc3M9XCJmb290bm90ZXNcIj5cbiAgICAgICAgICAgIDxlbT5Ob3RlIHJlZ2FyZGluZyB0aGUgYWJvdmUgZXhwcmVzc2lvbjo8L2VtPlxuICAgICAgICAgICAgPHNwYW4+PC9zcGFuPlxuICAgICAgICAgICAgU2VsZWN0IGEgbmV3IHZhbHVlIG9yIGRlbGV0ZSB0aGUgZXhwcmVzc2lvbiBhbHRvZ2V0aGVyLlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgKi9cbiAgICB9LFxuXG4gICAgbm90ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvKlxuICAgICAgICAgPGRpdiBjbGFzcz1cImZvb3Rub3Rlc1wiPlxuICAgICAgICAgICAgPGVtPk5vdGVzIHJlZ2FyZGluZyB0aGUgYWJvdmUgZXhwcmVzc2lvbjo8L2VtPlxuICAgICAgICAgICAgPG9sPjwvb2w+XG4gICAgICAgICAgICBTZWxlY3QgbmV3IHZhbHVlcyBvciBkZWxldGUgdGhlIGV4cHJlc3Npb24gYWx0b2dldGhlci5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgICAgKi9cbiAgICB9LFxuXG4gICAgb3B0aW9uTWlzc2luZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8qXG4gICAgICAgIFRoZSBwcmV2aW91cyA8c3BhbiBjbGFzcz1cImZpZWxkLW5hbWVcIj57MTplbmNvZGV9PC9zcGFuPlxuICAgICAgICB2YWx1ZSA8c3BhbiBjbGFzcz1cImZpZWxkLXZhbHVlXCI+ezI6ZW5jb2RlfTwvc3Bhbj5cbiAgICAgICAgaXMgbm8gbG9uZ2VyIHZhbGlkLlxuICAgICAgICAqL1xuICAgIH1cblxufTtcblxudmFyIGV4dHJhY3QgPSAvXFwvXFwqXFxzKihbXl0rPylcXHMrXFwqXFwvLzsgLy8gZmluZHMgdGhlIHN0cmluZyBpbnNpZGUgdGhlIC8qIC4uLiAqLzsgdGhlIGdyb3VwIGV4Y2x1ZGVzIHRoZSB3aGl0ZXNwYWNlXG52YXIgZW5jb2RlcnMgPSAvXFx7KFxcZCspXFw6ZW5jb2RlXFx9L2c7XG5cbmZ1bmN0aW9uIGdldCh0ZW1wbGF0ZU5hbWUpIHtcbiAgICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHZhciB0ZXh0ID0gdGVtcGxhdGVzW3RlbXBsYXRlTmFtZV0udG9TdHJpbmcoKS5tYXRjaChleHRyYWN0KVsxXTtcbiAgICB2YXIgdGVtcGxleEFyZ3MgPSBbdGV4dF0uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIHZhciBrZXlzLCBlbmNvZGVyID0ge307XG5cbiAgICBlbmNvZGVycy5sYXN0SW5kZXggPSAwO1xuICAgIHdoaWxlICgoa2V5cyA9IGVuY29kZXJzLmV4ZWModGV4dCkpKSB7XG4gICAgICAgIGVuY29kZXJba2V5c1sxXV0gPSB0cnVlO1xuICAgIH1cbiAgICBrZXlzID0gT2JqZWN0LmtleXMoZW5jb2Rlcik7XG4gICAgaWYgKGtleXMubGVuZ3RoKSB7XG4gICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHRlbXAudGV4dENvbnRlbnQgPSB0ZW1wbGV4QXJnc1trZXldO1xuICAgICAgICAgICAgdGVtcGxleEFyZ3Nba2V5XSA9IHRlbXAuaW5uZXJIVE1MO1xuICAgICAgICB9KTtcbiAgICAgICAgdGVtcGxleEFyZ3NbMF0gPSB0ZXh0LnJlcGxhY2UoZW5jb2RlcnMsICd7JDF9Jyk7XG4gICAgfVxuXG4gICAgdGVtcC5pbm5lckhUTUwgPSB0ZW1wbGV4LmFwcGx5KHRoaXMsIHRlbXBsZXhBcmdzKTtcblxuICAgIC8vIGlmIG9ubHkgb25lIEhUTUxFbGVtZW50LCByZXR1cm4gaXQ7IG90aGVyd2lzZSBlbnRpcmUgbGlzdCBvZiBub2Rlc1xuICAgIHJldHVybiB0ZW1wLmNoaWxkcmVuLmxlbmd0aCA9PT0gMSAmJiB0ZW1wLmNoaWxkTm9kZXMubGVuZ3RoID09PSAxID8gdGVtcC5maXJzdENoaWxkIDogdGVtcC5jaGlsZE5vZGVzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqIEB0eXBlZGVmIHtmdW5jdGlvbn0gb3BlcmF0aW9uUmVkdWNlclxuICogQHBhcmFtIHtib29sZWFufSBwXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHFcbiAqIEByZXR1cm5zIHtib29sZWFufSBUaGUgcmVzdWx0IG9mIGFwcGx5aW5nIHRoZSBvcGVyYXRvciB0byB0aGUgdHdvIHBhcmFtZXRlcnMuXG4gKi9cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQHR5cGUge29wZXJhdGlvblJlZHVjZXJ9XG4gKi9cbmZ1bmN0aW9uIEFORChwLCBxKSB7XG4gICAgcmV0dXJuIHAgJiYgcTtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQHR5cGUge29wZXJhdGlvblJlZHVjZXJ9XG4gKi9cbmZ1bmN0aW9uIE9SKHAsIHEpIHtcbiAgICByZXR1cm4gcCB8fCBxO1xufVxuXG4vKiogQHR5cGVkZWYge29iZWpjdH0gdHJlZU9wZXJhdG9yXG4gKiBAZGVzYyBFYWNoIGB0cmVlT3BlcmF0b3JgIG9iamVjdCBkZXNjcmliZXMgdHdvIHRoaW5nczpcbiAqXG4gKiAxLiBIb3cgdG8gdGFrZSB0aGUgdGVzdCByZXN1bHRzIG9mIF9uXyBjaGlsZCBub2RlcyBieSBhcHBseWluZyB0aGUgb3BlcmF0b3IgdG8gYWxsIHRoZSByZXN1bHRzIHRvIFwicmVkdWNlXCIgaXQgZG93biB0byBhIHNpbmdsZSByZXN1bHQuXG4gKiAyLiBIb3cgdG8gZ2VuZXJhdGUgU1FMIFdIRVJFIGNsYXVzZSBzeW50YXggdGhhdCBhcHBsaWVzIHRoZSBvcGVyYXRvciB0byBfbl8gY2hpbGQgbm9kZXMuXG4gKlxuICogQHByb3BlcnR5IHtvcGVyYXRpb25SZWR1Y2VyfSByZWR1Y2VcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gc2VlZCAtXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IGFib3J0IC1cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gbmVnYXRlIC1cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBTUUwub3AgLVxuICogQHByb3BlcnR5IHtzdHJpbmd9IFNRTC5iZWcgLVxuICogQHByb3BlcnR5IHtzdHJpbmd9IFNRTC5lbmQgLVxuICovXG5cbi8qKiBBIGhhc2ggb2Yge0BsaW5rIHRyZWVPcGVyYXRvcn0gb2JqZWN0cy5cbiAqIEB0eXBlIHtvYmplY3R9XG4gKi9cbnZhciB0cmVlT3BlcmF0b3JzID0ge1xuICAgICdvcC1hbmQnOiB7XG4gICAgICAgIHJlZHVjZTogQU5ELFxuICAgICAgICBzZWVkOiB0cnVlLFxuICAgICAgICBhYm9ydDogZmFsc2UsXG4gICAgICAgIG5lZ2F0ZTogZmFsc2UsXG4gICAgICAgIFNRTDoge1xuICAgICAgICAgICAgb3A6ICdBTkQnLFxuICAgICAgICAgICAgYmVnOiAnKCcsXG4gICAgICAgICAgICBlbmQ6ICcpJ1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnb3Atb3InOiB7XG4gICAgICAgIHJlZHVjZTogT1IsXG4gICAgICAgIHNlZWQ6IGZhbHNlLFxuICAgICAgICBhYm9ydDogdHJ1ZSxcbiAgICAgICAgbmVnYXRlOiBmYWxzZSxcbiAgICAgICAgU1FMOiB7XG4gICAgICAgICAgICBvcDogJ09SJyxcbiAgICAgICAgICAgIGJlZzogJygnLFxuICAgICAgICAgICAgZW5kOiAnKSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ29wLW5vcic6IHtcbiAgICAgICAgcmVkdWNlOiBPUixcbiAgICAgICAgc2VlZDogZmFsc2UsXG4gICAgICAgIGFib3J0OiB0cnVlLFxuICAgICAgICBuZWdhdGU6IHRydWUsXG4gICAgICAgIFNRTDoge1xuICAgICAgICAgICAgb3A6ICdPUicsXG4gICAgICAgICAgICBiZWc6ICdOT1QgKCcsXG4gICAgICAgICAgICBlbmQ6ICcpJ1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB0cmVlT3BlcmF0b3JzO1xuIl19
