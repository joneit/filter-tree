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
        this.el = template('tree', ++ordinal);
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

},{"./js/FilterLeaf":8,"./js/FilterNode":9,"./js/css":10,"./js/template":12,"./js/tree-operators":13,"unstrungify":6}],8:[function(require,module,exports){
/* eslint-env browser */
/* eslint-disable key-spacing */

'use strict';

var FilterNode = require('./FilterNode');
var template = require('./template');
var operators = require('./leaf-operators');


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

    operators: operators,
    operatorOptions: operators.options,

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
        root.className = 'filter-tree-default';

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
        var el, option, span,
            tagName = options ? 'select' : 'input';

        if (options && options.length === 1) {
            // hard text when there would be only 1 option in the dropdown
            option = options[0];

            el = document.createElement('input');
            el.type = 'hidden';
            el.value = option.name || option.alias || option;

            span = document.createElement('span');
            span.innerHTML = option.alias || option.name || option;
            span.appendChild(el);

            container.appendChild(span);
        } else {
            el = addOptions(tagName, options, prompt, sort);
            if (el.type === 'text' && this.eventHandler) {
                this.el.addEventListener('keyup', this.eventHandler);
            }
            this.el.addEventListener('change', this.onChange = this.onChange || cleanUpAndMoveOn.bind(this));
            FilterNode.setWarningClass(el);
            container.appendChild(el);
        }

        return el;
    },

    loadState: function() {
        var state = this.state;

        if (state) {
            var value, el, i, b, selected, notes = [];
            for (var key in state) {
                if (key !== 'fields' && key !== 'editor') {
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

        this.op = this.operators[this.operator];

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
 * @param {null|string} [prompt=''] - Adds an initial `<option>...</option>` element to the drop-down with this value in parentheses as its `text`; and empty string as its `value`. Omitting creates a blank prompt; `null` suppresses.
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

},{"./FilterNode":9,"./leaf-operators":11,"./template":12}],9:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var extend = require('extend-me');
var _ = require('object-iterators');
var Base = extend.Base;

var template = require('./template');

extend.debug = true;

var CHILDREN_TAG = 'OL',
    CHILD_TAG = 'LI';

var optionsSchema = {
    /** Default list of fields only for direct child terminal-node drop-downs.
     * @type {string[]}
     * @memberOf FilterNode.prototype
     */
    nodeFields: { own: true },

    /** Default list of fields for all descending terminal-node drop-downs.
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
    eventHandler: {}
};

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

        // create each option
        _(optionsSchema).each(function(optionOptions, key) {
            self[key] = (
                options && options[key] ||
                state && state[key] ||
                parent && !optionOptions.own && parent[key] // reference parent value now so we don't have to search up the tree later
            );
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

},{"./template":12,"extend-me":2,"object-iterators":3}],10:[function(require,module,exports){
'use strict';

var cssInjector = require('css-injector');

var css; // defined by code inserted by gulpfile between following comments
/* inject:css */
css = '.filter-tree{font-family:sans-serif;font-size:10pt;line-height:1.5em}.filter-tree label{font-weight:400}.filter-tree input[type=checkbox],.filter-tree input[type=radio]{left:3px;margin-right:3px}.filter-tree ol{margin-top:0}.filter-tree-add,.filter-tree-add-filter,.filter-tree-remove{cursor:pointer}.filter-tree-add,.filter-tree-add-filter{font-style:italic;color:#444;font-size:90%}.filter-tree-add-filter{margin:3px 0;display:inline-block}.filter-tree-add-filter:hover,.filter-tree-add:hover{text-decoration:underline}.filter-tree-add-filter.as-menu-header,.filter-tree-add.as-menu-header{background-color:#fff;font-weight:700;font-style:normal}.filter-tree-add-filter.as-menu-header:hover{text-decoration:inherit}.filter-tree-add-filter>div,.filter-tree-add>div,.filter-tree-remove{display:inline-block;width:15px;height:15px;border-radius:8px;background-color:#8c8;font-size:11.5px;font-weight:700;color:#fff;text-align:center;line-height:normal;font-style:normal;font-family:sans-serif;text-shadow:0 0 1.5px grey;margin-right:4px}.filter-tree-add-filter>div:before,.filter-tree-add>div:before{content:\'\\ff0b\'}.filter-tree-remove{background-color:#e88;border:0}.filter-tree-remove:before{content:\'\\2212\'}.filter-tree li::after{font-size:70%;font-style:italic;font-weight:700;color:#080}.filter-tree>ol>li:last-child::after{display:none}.filter-tree-add,.filter-tree-add-filter,.op-and>ol,.op-nor>ol,.op-or>ol{padding-left:32px}.op-or>ol>li::after{margin-left:2.5em;content:\'— OR —\'}.op-and>ol>li::after{margin-left:2.5em;content:\'— AND —\'}.op-nor>ol>li::after{margin-left:2.5em;content:\'— NOR —\'}.filter-tree-default>:enabled{margin:0 .4em;background-color:#ddd;border:0}.filter-tree-default>input[type=text]{width:8em;padding:0 5px}.filter-tree-default>select{border:0}.filter-tree-default>.filter-tree-warning{background-color:#ffc}.filter-tree-default>.filter-tree-error{background-color:#Fcc}.filter-tree .footnotes{font-size:6pt;margin:2px 0 0;line-height:normal;white-space:normal;color:#999}.filter-tree .footnotes>ol{margin:0;padding-left:2em}.filter-tree .footnotes>ol>li{margin:2px 0}.filter-tree .footnotes .field-name,.filter-tree .footnotes .field-value{font-weight:700;color:#777}.filter-tree .footnotes .field-value:after,.filter-tree .footnotes .field-value:before{content:\'\"\'}.filter-tree .footnotes .field-value{font-family:monospace}.filter-tree-chooser{position:absolute;font-size:9pt;outline:0;box-shadow:5px 5px 10px grey}';
/* endinject */

module.exports = cssInjector.bind(this, css);

},{"css-injector":1}],11:[function(require,module,exports){
'use strict';

var regExpLIKE = require('regexp-like');

var LIKE = 'LIKE ',
    NOT_LIKE = 'NOT ' + LIKE,
    LIKE_WILD_CARD = '%';

var leafOperators = {
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
        sql: sqlIN.bind('IN'),
        type: 'string'
    },
    'NOT IN': { // TODO: currently forcing string typing; rework calling code to respect column type
        test: function(a, b) { return inOp(a, b) < 0; },
        sql: sqlIN.bind('NOT IN'),
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

var equality, inequalities, sets, strings, patterns;

equality = ['='];
equality.label = 'Equality';

inequalities = ['<', '\u2264', '\u2260', '\u2265', '>'];
inequalities.label = 'Inquality';

sets = ['IN', 'NOT IN'];
sets.label = 'Set scan';

strings = [
    'CONTAINS', 'NOT CONTAINS',
    'BEGINS', 'NOT BEGINS',
    'ENDS', 'NOT ENDS'
];
strings.label = 'String scan';

// Alternatively, option groups can also be set up as an object with .options and .label properties:

patterns = { options: ['LIKE', 'NOT LIKE'], label: 'Pattern matching' };

leafOperators.options = [
    equality,
    inequalities,
    sets,
    strings,
    patterns
];

module.exports = leafOperators;

},{"regexp-like":4}],12:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL25vZGVfbW9kdWxlcy9jc3MtaW5qZWN0b3IvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL2V4dGVuZC1tZS9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvb2JqZWN0LWl0ZXJhdG9ycy9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvcmVnZXhwLWxpa2UvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL3RlbXBsZXgvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL3Vuc3RydW5naWZ5L2luZGV4LmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9mYWtlXzhhMGQ0YzZmLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy9GaWx0ZXJMZWFmLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy9GaWx0ZXJOb2RlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy9jc3MuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvc3JjL2pzL2xlYWYtb3BlcmF0b3JzLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy90ZW1wbGF0ZS5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvdHJlZS1vcGVyYXRvcnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuLyoqIEBuYW1lc3BhY2UgY3NzSW5qZWN0b3IgKi9cblxuLyoqXG4gKiBAc3VtbWFyeSBJbnNlcnQgYmFzZSBzdHlsZXNoZWV0IGludG8gRE9NXG4gKlxuICogQGRlc2MgQ3JlYXRlcyBhIG5ldyBgPHN0eWxlPi4uLjwvc3R5bGU+YCBlbGVtZW50IGZyb20gdGhlIG5hbWVkIHRleHQgc3RyaW5nKHMpIGFuZCBpbnNlcnRzIGl0IGJ1dCBvbmx5IGlmIGl0IGRvZXMgbm90IGFscmVhZHkgZXhpc3QgaW4gdGhlIHNwZWNpZmllZCBjb250YWluZXIgYXMgcGVyIGByZWZlcmVuY2VFbGVtZW50YC5cbiAqXG4gKiA+IENhdmVhdDogSWYgc3R5bGVzaGVldCBpcyBmb3IgdXNlIGluIGEgc2hhZG93IERPTSwgeW91IG11c3Qgc3BlY2lmeSBhIGxvY2FsIGByZWZlcmVuY2VFbGVtZW50YC5cbiAqXG4gKiBAcmV0dXJucyBBIHJlZmVyZW5jZSB0byB0aGUgbmV3bHkgY3JlYXRlZCBgPHN0eWxlPi4uLjwvc3R5bGU+YCBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBjc3NSdWxlc1xuICogQHBhcmFtIHtzdHJpbmd9IFtJRF1cbiAqIEBwYXJhbSB7dW5kZWZpbmVkfG51bGx8RWxlbWVudHxzdHJpbmd9IFtyZWZlcmVuY2VFbGVtZW50XSAtIENvbnRhaW5lciBmb3IgaW5zZXJ0aW9uLiBPdmVybG9hZHM6XG4gKiAqIGB1bmRlZmluZWRgIHR5cGUgKG9yIG9taXR0ZWQpOiBpbmplY3RzIHN0eWxlc2hlZXQgYXQgdG9wIG9mIGA8aGVhZD4uLi48L2hlYWQ+YCBlbGVtZW50XG4gKiAqIGBudWxsYCB2YWx1ZTogaW5qZWN0cyBzdHlsZXNoZWV0IGF0IGJvdHRvbSBvZiBgPGhlYWQ+Li4uPC9oZWFkPmAgZWxlbWVudFxuICogKiBgRWxlbWVudGAgdHlwZTogaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBlbGVtZW50LCB3aGVyZXZlciBpdCBpcyBmb3VuZC5cbiAqICogYHN0cmluZ2AgdHlwZTogaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBmaXJzdCBlbGVtZW50IGZvdW5kIHRoYXQgbWF0Y2hlcyB0aGUgZ2l2ZW4gY3NzIHNlbGVjdG9yLlxuICpcbiAqIEBtZW1iZXJPZiBjc3NJbmplY3RvclxuICovXG5mdW5jdGlvbiBjc3NJbmplY3Rvcihjc3NSdWxlcywgSUQsIHJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICBpZiAodHlwZW9mIHJlZmVyZW5jZUVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHJlZmVyZW5jZUVsZW1lbnQpO1xuICAgICAgICBpZiAoIXJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICAgICAgICAgIHRocm93ICdDYW5ub3QgZmluZCByZWZlcmVuY2UgZWxlbWVudCBmb3IgQ1NTIGluamVjdGlvbi4nO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChyZWZlcmVuY2VFbGVtZW50ICYmICEocmVmZXJlbmNlRWxlbWVudCBpbnN0YW5jZW9mIEVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93ICdHaXZlbiB2YWx1ZSBub3QgYSByZWZlcmVuY2UgZWxlbWVudC4nO1xuICAgIH1cblxuICAgIHZhciBjb250YWluZXIgPSByZWZlcmVuY2VFbGVtZW50ICYmIHJlZmVyZW5jZUVsZW1lbnQucGFyZW50Tm9kZSB8fCBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG5cbiAgICBpZiAoSUQpIHtcbiAgICAgICAgSUQgPSBjc3NJbmplY3Rvci5pZFByZWZpeCArIElEO1xuXG4gICAgICAgIGlmIChjb250YWluZXIucXVlcnlTZWxlY3RvcignIycgKyBJRCkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gc3R5bGVzaGVldCBhbHJlYWR5IGluIERPTVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbiAgICBpZiAoSUQpIHtcbiAgICAgICAgc3R5bGUuaWQgPSBJRDtcbiAgICB9XG4gICAgaWYgKGNzc1J1bGVzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgY3NzUnVsZXMgPSBjc3NSdWxlcy5qb2luKCdcXG4nKTtcbiAgICB9XG4gICAgY3NzUnVsZXMgPSAnXFxuJyArIGNzc1J1bGVzICsgJ1xcbic7XG4gICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzUnVsZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzUnVsZXMpKTtcbiAgICB9XG5cbiAgICBpZiAocmVmZXJlbmNlRWxlbWVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBjb250YWluZXIuZmlyc3RDaGlsZDtcbiAgICB9XG5cbiAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKHN0eWxlLCByZWZlcmVuY2VFbGVtZW50KTtcblxuICAgIHJldHVybiBzdHlsZTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBPcHRpb25hbCBwcmVmaXggZm9yIGA8c3R5bGU+YCB0YWcgSURzLlxuICogQGRlc2MgRGVmYXVsdHMgdG8gYCdpbmplY3RlZC1zdHlsZXNoZWV0LSdgLlxuICogQHR5cGUge3N0cmluZ31cbiAqIEBtZW1iZXJPZiBjc3NJbmplY3RvclxuICovXG5jc3NJbmplY3Rvci5pZFByZWZpeCA9ICdpbmplY3RlZC1zdHlsZXNoZWV0LSc7XG5cbi8vIEludGVyZmFjZVxubW9kdWxlLmV4cG9ydHMgPSBjc3NJbmplY3RvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqIEBuYW1lc3BhY2UgZXh0ZW5kLW1lICoqL1xuXG4vKiogQHN1bW1hcnkgRXh0ZW5kcyBhbiBleGlzdGluZyBjb25zdHJ1Y3RvciBpbnRvIGEgbmV3IGNvbnN0cnVjdG9yLlxuICpcbiAqIEByZXR1cm5zIHtDaGlsZENvbnN0cnVjdG9yfSBBIG5ldyBjb25zdHJ1Y3RvciwgZXh0ZW5kZWQgZnJvbSB0aGUgZ2l2ZW4gY29udGV4dCwgcG9zc2libHkgd2l0aCBzb21lIHByb3RvdHlwZSBhZGRpdGlvbnMuXG4gKlxuICogQGRlc2MgRXh0ZW5kcyBcIm9iamVjdHNcIiAoY29uc3RydWN0b3JzKSwgd2l0aCBvcHRpb25hbCBhZGRpdGlvbmFsIGNvZGUsIG9wdGlvbmFsIHByb3RvdHlwZSBhZGRpdGlvbnMsIGFuZCBvcHRpb25hbCBwcm90b3R5cGUgbWVtYmVyIGFsaWFzZXMuXG4gKlxuICogPiBDQVZFQVQ6IE5vdCB0byBiZSBjb25mdXNlZCB3aXRoIFVuZGVyc2NvcmUtc3R5bGUgLmV4dGVuZCgpIHdoaWNoIGlzIHNvbWV0aGluZyBlbHNlIGVudGlyZWx5LiBJJ3ZlIHVzZWQgdGhlIG5hbWUgXCJleHRlbmRcIiBoZXJlIGJlY2F1c2Ugb3RoZXIgcGFja2FnZXMgKGxpa2UgQmFja2JvbmUuanMpIHVzZSBpdCB0aGlzIHdheS4gWW91IGFyZSBmcmVlIHRvIGNhbGwgaXQgd2hhdGV2ZXIgeW91IHdhbnQgd2hlbiB5b3UgXCJyZXF1aXJlXCIgaXQsIHN1Y2ggYXMgYHZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2V4dGVuZCcpYC5cbiAqXG4gKiBQcm92aWRlIGEgY29uc3RydWN0b3IgYXMgdGhlIGNvbnRleHQgYW5kIGFueSBwcm90b3R5cGUgYWRkaXRpb25zIHlvdSByZXF1aXJlIGluIHRoZSBmaXJzdCBhcmd1bWVudC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgaWYgeW91IHdpc2ggdG8gYmUgYWJsZSB0byBleHRlbmQgYEJhc2VDb25zdHJ1Y3RvcmAgdG8gYSBuZXcgY29uc3RydWN0b3Igd2l0aCBwcm90b3R5cGUgb3ZlcnJpZGVzIGFuZC9vciBhZGRpdGlvbnMsIGJhc2ljIHVzYWdlIGlzOlxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIHZhciBCYXNlID0gcmVxdWlyZSgnZXh0ZW5kLW1lJykuQmFzZTtcbiAqIHZhciBCYXNlQ29uc3RydWN0b3IgPSBCYXNlLmV4dGVuZChiYXNlUHJvdG90eXBlKTsgLy8gbWl4ZXMgaW4gLmV4dGVuZFxuICogdmFyIENoaWxkQ29uc3RydWN0b3IgPSBCYXNlQ29uc3RydWN0b3IuZXh0ZW5kKGNoaWxkUHJvdG90eXBlT3ZlcnJpZGVzQW5kQWRkaXRpb25zKTtcbiAqIHZhciBHcmFuZGNoaWxkQ29uc3RydWN0b3IgPSBDaGlsZENvbnN0cnVjdG9yLmV4dGVuZChncmFuZGNoaWxkUHJvdG90eXBlT3ZlcnJpZGVzQW5kQWRkaXRpb25zKTtcbiAqIGBgYFxuICpcbiAqIFRoaXMgZnVuY3Rpb24gKGBleHRlbmQoKWApIGlzIGFkZGVkIHRvIHRoZSBuZXcgZXh0ZW5kZWQgb2JqZWN0IGNvbnN0cnVjdG9yIGFzIGEgcHJvcGVydHkgYC5leHRlbmRgLCBlc3NlbnRpYWxseSBtYWtpbmcgdGhlIG9iamVjdCBjb25zdHJ1Y3RvciBpdHNlbGYgZWFzaWx5IFwiZXh0ZW5kYWJsZS5cIiAoTm90ZTogVGhpcyBpcyBhIHByb3BlcnR5IG9mIGVhY2ggY29uc3RydWN0b3IgYW5kIG5vdCBhIG1ldGhvZCBvZiBpdHMgcHJvdG90eXBlISlcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gW2V4dGVuZGVkQ2xhc3NOYW1lXSAtIFRoaXMgaXMgc2ltcGx5IGFkZGVkIHRvIHRoZSBwcm90b3R5cGUgYXMgJCRDTEFTU19OQU1FLiBVc2VmdWwgZm9yIGRlYnVnZ2luZyBiZWNhdXNlIGFsbCBkZXJpdmVkIGNvbnN0cnVjdG9ycyBhcHBlYXIgdG8gaGF2ZSB0aGUgc2FtZSBuYW1lIChcIkNvbnN0cnVjdG9yXCIpIGluIHRoZSBkZWJ1Z2dlci4gVGhpcyBwcm9wZXJ0eSBpcyBpZ25vcmVkIHVubGVzcyBgZXh0ZW5kLmRlYnVnYCBpcyBleHBsaWNpdGx5IHNldCB0byBhIHRydXRoeSB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0ge2V4dGVuZGVkUHJvdG90eXBlQWRkaXRpb25zT2JqZWN0fSBbcHJvdG90eXBlQWRkaXRpb25zXSAtIE9iamVjdCB3aXRoIG1lbWJlcnMgdG8gY29weSB0byBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIE1vc3QgbWVtYmVycyB3aWxsIGJlIGNvcGllZCB0byB0aGUgcHJvdG90eXBlLiBTb21lIG1lbWJlcnMsIGhvd2V2ZXIsIGhhdmUgc3BlY2lhbCBtZWFuaW5ncyBhcyBleHBsYWluZWQgaW4gdGhlIHtAbGluayBleHRlbmRlZFByb3RvdHlwZUFkZGl0aW9uc09iamVjdHx0eXBlIGRlZmluaXRpb259IChhbmQgbWF5IG9yIG1heSBub3QgYmUgY29waWVkIHRvIHRoZSBwcm90b3R5cGUpLlxuICpcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2RlYnVnXSAtIFNlZSBwYXJhbWV0ZXIgYGV4dGVuZGVkQ2xhc3NOYW1lYCBfKGFib3ZlKV8uXG4gKlxuICogQHByb3BlcnR5IHtvYmplY3R9IEJhc2UgLSBBIGNvbnZlbmllbnQgYmFzZSBjbGFzcyBmcm9tIHdoaWNoIGFsbCBvdGhlciBjbGFzc2VzIGNhbiBiZSBleHRlbmRlZC5cbiAqXG4gKiBAbWVtYmVyT2YgZXh0ZW5kLW1lXG4gKi9cbmZ1bmN0aW9uIGV4dGVuZChleHRlbmRlZENsYXNzTmFtZSwgcHJvdG90eXBlQWRkaXRpb25zKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucyA9IHt9O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucyA9IGV4dGVuZGVkQ2xhc3NOYW1lO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm90b3R5cGVBZGRpdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ1NpbmdsZSBwYXJhbWV0ZXIgb3ZlcmxvYWQgbXVzdCBiZSBvYmplY3QuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGV4dGVuZGVkQ2xhc3NOYW1lID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0ZW5kZWRDbGFzc05hbWUgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBwcm90b3R5cGVBZGRpdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ1R3byBwYXJhbWV0ZXIgb3ZlcmxvYWQgbXVzdCBiZSBzdHJpbmcsIG9iamVjdC4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyAnVG9vIG1hbnkgcGFyYW1ldGVycyc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQ29uc3RydWN0b3IoKSB7XG4gICAgICAgIGlmIChwcm90b3R5cGVBZGRpdGlvbnMucHJlSW5pdGlhbGl6ZSkge1xuICAgICAgICAgICAgcHJvdG90eXBlQWRkaXRpb25zLnByZUluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluaXRpYWxpemVQcm90b3R5cGVDaGFpbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAgIGlmIChwcm90b3R5cGVBZGRpdGlvbnMucG9zdEluaXRpYWxpemUpIHtcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucy5wb3N0SW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgQ29uc3RydWN0b3IuZXh0ZW5kID0gZXh0ZW5kO1xuXG4gICAgdmFyIHByb3RvdHlwZSA9IENvbnN0cnVjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodGhpcy5wcm90b3R5cGUpO1xuICAgIHByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuXG4gICAgaWYgKGV4dGVuZGVkQ2xhc3NOYW1lICYmIGV4dGVuZC5kZWJ1Zykge1xuICAgICAgICBwcm90b3R5cGUuJCRDTEFTU19OQU1FID0gZXh0ZW5kZWRDbGFzc05hbWU7XG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIHByb3RvdHlwZUFkZGl0aW9ucykge1xuICAgICAgICBpZiAocHJvdG90eXBlQWRkaXRpb25zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3RvdHlwZUFkZGl0aW9uc1trZXldO1xuICAgICAgICAgICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdpbml0aWFsaXplT3duJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxyZWFkeSBjYWxsZWQgYWJvdmU7IG5vdCBuZWVkZWQgaW4gcHJvdG90eXBlXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2FsaWFzZXMnOlxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBhbGlhcyBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KGFsaWFzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ha2VBbGlhcyh2YWx1ZVthbGlhc10sIGFsaWFzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZVswXSA9PT0gJyMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYWtlQWxpYXModmFsdWUsIGtleS5zdWJzdHIoMSkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG90eXBlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIENvbnN0cnVjdG9yO1xuXG4gICAgZnVuY3Rpb24gbWFrZUFsaWFzKHZhbHVlLCBrZXkpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgICAgcHJvdG90eXBlW2tleV0gPSBwcm90b3R5cGVBZGRpdGlvbnNbdmFsdWVdO1xuICAgIH1cbn1cblxuZXh0ZW5kLkJhc2UgPSBmdW5jdGlvbiAoKSB7fTtcbmV4dGVuZC5CYXNlLmV4dGVuZCA9IGV4dGVuZDtcblxuLyoqIEB0eXBlZGVmIHtmdW5jdGlvbn0gZXh0ZW5kZWRDb25zdHJ1Y3RvclxuICogQHByb3BlcnR5IHByb3RvdHlwZS5zdXBlciAtIEEgcmVmZXJlbmNlIHRvIHRoZSBwcm90b3R5cGUgdGhpcyBjb25zdHJ1Y3RvciB3YXMgZXh0ZW5kZWQgZnJvbS5cbiAqIEBwcm9wZXJ0eSBbZXh0ZW5kXSAtIElmIGBwcm90b3R5cGVBZGRpdGlvbnMuZXh0ZW5kYWJsZWAgd2FzIHRydXRoeSwgdGhpcyB3aWxsIGJlIGEgcmVmZXJlbmNlIHRvIHtAbGluayBleHRlbmQuZXh0ZW5kfGV4dGVuZH0uXG4gKi9cblxuLyoqIEB0eXBlZGVmIHtvYmplY3R9IGV4dGVuZGVkUHJvdG90eXBlQWRkaXRpb25zT2JqZWN0XG4gKiBAcHJvcGVydHkge2Z1bmN0aW9ufSBbaW5pdGlhbGl6ZV0gLSBBZGRpdGlvbmFsIGNvbnN0cnVjdG9yIGNvZGUgZm9yIG5ldyBvYmplY3QuIFRoaXMgbWV0aG9kIGlzIGFkZGVkIHRvIHRoZSBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIEdldHMgcGFzc2VkIG5ldyBvYmplY3QgYXMgY29udGV4dCArIHNhbWUgYXJncyBhcyBjb25zdHJ1Y3RvciBpdHNlbGYuIENhbGxlZCBvbiBpbnN0YW50aWF0aW9uIGFmdGVyIHNpbWlsYXIgZnVuY3Rpb24gaW4gYWxsIGFuY2VzdG9ycyBjYWxsZWQgd2l0aCBzYW1lIHNpZ25hdHVyZS5cbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb259IFtpbml0aWFsaXplT3duXSAtIEFkZGl0aW9uYWwgY29uc3RydWN0b3IgY29kZSBmb3IgbmV3IG9iamVjdC4gVGhpcyBtZXRob2QgaXMgYWRkZWQgdG8gdGhlIG5ldyBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS4gR2V0cyBwYXNzZWQgbmV3IG9iamVjdCBhcyBjb250ZXh0ICsgc2FtZSBhcmdzIGFzIGNvbnN0cnVjdG9yIGl0c2VsZi4gQ2FsbGVkIG9uIGluc3RhbnRpYXRpb24gYWZ0ZXIgKGFsbCkgdGhlIGBpbml0aWFsaXplYCBmdW5jdGlvbihzKS5cbiAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBbYWxpYXNlc10gLSBIYXNoIG9mIGFsaWFzZXMgZm9yIHByb3RvdHlwZSBtZW1iZXJzIGluIGZvcm0gYHsga2V5OiAnbWVtYmVyJywgLi4uIH1gIHdoZXJlIGBrZXlgIGlzIHRoZSBuYW1lIG9mIGFuIGFsaWVhcyBhbmQgYCdtZW1iZXInYCBpcyB0aGUgbmFtZSBvZiBhbiBleGlzdGluZyBtZW1iZXIgaW4gdGhlIHByb3RvdHlwZS4gRWFjaCBzdWNoIGtleSBpcyBhZGRlZCB0byB0aGUgcHJvdG90eXBlIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBuYW1lZCBtZW1iZXIuIChUaGUgYGFsaWFzZXNgIG9iamVjdCBpdHNlbGYgaXMgKm5vdCogYWRkZWQgdG8gcHJvdG90eXBlLikgQWx0ZXJuYXRpdmVseTpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBba2V5c10gLSBBcmJpdHJhcnkgcHJvcGVydHkgbmFtZXMgZGVmaW5lZCBoZXJlIHdpdGggc3RyaW5nIHZhbHVlcyBzdGFydGluZyB3aXRoIGEgYCNgIGNoYXJhY3RlciB3aWxsIGFsaWFzIHRoZSBhY3R1YWwgcHJvcGVydGllcyBuYW1lZCBpbiB0aGUgc3RyaW5ncyAoZm9sbG93aW5nIHRoZSBgI2ApLiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHRvIHByb3ZpZGluZyBhbiBgYWxpYXNlc2AgaGFzaCwgcGVyaGFwcyBzaW1wbGVyICh0aG91Z2ggc3VidGxlcikuIChVc2UgYXJiaXRyYXJ5IGlkZW50aWZpZXJzIGhlcmU7IGRvbid0IHVzZSB0aGUgbmFtZSBga2V5c2AhKVxuICogQHByb3BlcnR5IHsqfSBbYXJiaXRyYXJ5UHJvcGVydGllc10gLSBBbnkgYWRkaXRpb25hbCBhcmJpdHJhcnkgcHJvcGVydGllcyBkZWZpbmVkIGhlcmUgd2lsbCBiZSBhZGRlZCB0byB0aGUgbmV3IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLiAoVXNlIGFyYml0cmFyeSBpZGVudGlmaWVycyBoZXJlOyBkb24ndCB1c2UgdGhlIG5hbWUgYGFyaWJpdHJhcnlQcm9wZXJ0aWVzYCEpXG4gKi9cblxuLyoqIEBzdW1tYXJ5IENhbGwgYWxsIGBpbml0aWFsaXplYCBtZXRob2RzIGZvdW5kIGluIHByb3RvdHlwZSBjaGFpbi5cbiAqIEBkZXNjIFRoaXMgcmVjdXJzaXZlIHJvdXRpbmUgaXMgY2FsbGVkIGJ5IHRoZSBjb25zdHJ1Y3Rvci5cbiAqIDEuIFdhbGtzIGJhY2sgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBgT2JqZWN0YCdzIHByb3RvdHlwZVxuICogMi4gV2Fsa3MgZm9yd2FyZCB0byBuZXcgb2JqZWN0LCBjYWxsaW5nIGFueSBgaW5pdGlhbGl6ZWAgbWV0aG9kcyBpdCBmaW5kcyBhbG9uZyB0aGUgd2F5IHdpdGggdGhlIHNhbWUgY29udGV4dCBhbmQgYXJndW1lbnRzIHdpdGggd2hpY2ggdGhlIGNvbnN0cnVjdG9yIHdhcyBjYWxsZWQuXG4gKiBAcHJpdmF0ZVxuICogQG1lbWJlck9mIGV4dGVuZC1tZVxuICovXG5mdW5jdGlvbiBpbml0aWFsaXplUHJvdG90eXBlQ2hhaW4oKSB7XG4gICAgdmFyIHRlcm0gPSB0aGlzLFxuICAgICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgIHJlY3VyKHRlcm0pO1xuXG4gICAgZnVuY3Rpb24gcmVjdXIob2JqKSB7XG4gICAgICAgIHZhciBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmopO1xuICAgICAgICBpZiAocHJvdG8uY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgICAgICAgcmVjdXIocHJvdG8pO1xuICAgICAgICAgICAgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdpbml0aWFsaXplJykpIHtcbiAgICAgICAgICAgICAgICBwcm90by5pbml0aWFsaXplLmFwcGx5KHRlcm0sIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4dGVuZDtcbiIsIi8qIG9iamVjdC1pdGVyYXRvcnMuanMgLSBNaW5pIFVuZGVyc2NvcmUgbGlicmFyeVxuICogYnkgSm9uYXRoYW4gRWl0ZW5cbiAqXG4gKiBUaGUgbWV0aG9kcyBiZWxvdyBvcGVyYXRlIG9uIG9iamVjdHMgKGJ1dCBub3QgYXJyYXlzKSBzaW1pbGFybHlcbiAqIHRvIFVuZGVyc2NvcmUgKGh0dHA6Ly91bmRlcnNjb3JlanMub3JnLyNjb2xsZWN0aW9ucykuXG4gKlxuICogRm9yIG1vcmUgaW5mb3JtYXRpb246XG4gKiBodHRwczovL2dpdGh1Yi5jb20vam9uZWl0L29iamVjdC1pdGVyYXRvcnNcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAc3VtbWFyeSBXcmFwIGFuIG9iamVjdCBmb3Igb25lIG1ldGhvZCBjYWxsLlxuICogQERlc2MgTm90ZSB0aGF0IHRoZSBgbmV3YCBrZXl3b3JkIGlzIG5vdCBuZWNlc3NhcnkuXG4gKiBAcGFyYW0ge29iamVjdHxudWxsfHVuZGVmaW5lZH0gb2JqZWN0IC0gYG51bGxgIG9yIGB1bmRlZmluZWRgIGlzIHRyZWF0ZWQgYXMgYW4gZW1wdHkgcGxhaW4gb2JqZWN0LlxuICogQHJldHVybiB7V3JhcHBlcn0gVGhlIHdyYXBwZWQgb2JqZWN0LlxuICovXG5mdW5jdGlvbiBXcmFwcGVyKG9iamVjdCkge1xuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBXcmFwcGVyKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXcmFwcGVyKSkge1xuICAgICAgICByZXR1cm4gbmV3IFdyYXBwZXIob2JqZWN0KTtcbiAgICB9XG4gICAgdGhpcy5vcmlnaW5hbFZhbHVlID0gb2JqZWN0O1xuICAgIHRoaXMubyA9IG9iamVjdCB8fCB7fTtcbn1cblxuLyoqXG4gKiBAbmFtZSBXcmFwcGVyLmNoYWluXG4gKiBAc3VtbWFyeSBXcmFwIGFuIG9iamVjdCBmb3IgYSBjaGFpbiBvZiBtZXRob2QgY2FsbHMuXG4gKiBARGVzYyBDYWxscyB0aGUgY29uc3RydWN0b3IgYFdyYXBwZXIoKWAgYW5kIG1vZGlmaWVzIHRoZSB3cmFwcGVyIGZvciBjaGFpbmluZy5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmplY3RcbiAqIEByZXR1cm4ge1dyYXBwZXJ9IFRoZSB3cmFwcGVkIG9iamVjdC5cbiAqL1xuV3JhcHBlci5jaGFpbiA9IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICB2YXIgd3JhcHBlZCA9IFdyYXBwZXIob2JqZWN0KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuZXctY2FwXG4gICAgd3JhcHBlZC5jaGFpbmluZyA9IHRydWU7XG4gICAgcmV0dXJuIHdyYXBwZWQ7XG59O1xuXG5XcmFwcGVyLnByb3RvdHlwZSA9IHtcbiAgICAvKipcbiAgICAgKiBVbndyYXAgYW4gb2JqZWN0IHdyYXBwZWQgd2l0aCB7QGxpbmsgV3JhcHBlci5jaGFpbnxXcmFwcGVyLmNoYWluKCl9LlxuICAgICAqIEByZXR1cm4ge29iamVjdHxudWxsfHVuZGVmaW5lZH0gVGhlIHZhbHVlIG9yaWdpbmFsbHkgd3JhcHBlZCBieSB0aGUgY29uc3RydWN0b3IuXG4gICAgICogQG1lbWJlck9mIFdyYXBwZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgdmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3JpZ2luYWxWYWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgTWltaWNzIFVuZGVyc2NvcmUncyBbZWFjaF0oaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvI2VhY2gpIG1ldGhvZDogSXRlcmF0ZSBvdmVyIHRoZSBtZW1iZXJzIG9mIHRoZSB3cmFwcGVkIG9iamVjdCwgY2FsbGluZyBgaXRlcmF0ZWUoKWAgd2l0aCBlYWNoLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGl0ZXJhdGVlIC0gRm9yIGVhY2ggbWVtYmVyIG9mIHRoZSB3cmFwcGVkIG9iamVjdCwgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM6IGAodmFsdWUsIGtleSwgb2JqZWN0KWAuIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBmdW5jdGlvbiBpcyB1bmRlZmluZWQ7IGFuIGAuZWFjaGAgbG9vcCBjYW5ub3QgYmUgYnJva2VuIG91dCBvZiAodXNlIHtAbGluayBXcmFwcGVyI2ZpbmR8LmZpbmR9IGluc3RlYWQpLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dF0gLSBJZiBnaXZlbiwgYGl0ZXJhdGVlYCBpcyBib3VuZCB0byB0aGlzIG9iamVjdC4gSW4gb3RoZXIgd29yZHMsIHRoaXMgb2JqZWN0IGJlY29tZXMgdGhlIGB0aGlzYCB2YWx1ZSBpbiB0aGUgY2FsbHMgdG8gYGl0ZXJhdGVlYC4gKE90aGVyd2lzZSwgdGhlIGB0aGlzYCB2YWx1ZSB3aWxsIGJlIHRoZSB1bndyYXBwZWQgb2JqZWN0LilcbiAgICAgKiBAcmV0dXJuIHtXcmFwcGVyfSBUaGUgd3JhcHBlZCBvYmplY3QgZm9yIGNoYWluaW5nLlxuICAgICAqIEBtZW1iZXJPZiBXcmFwcGVyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGVhY2g6IGZ1bmN0aW9uIChpdGVyYXRlZSwgY29udGV4dCkge1xuICAgICAgICB2YXIgbyA9IHRoaXMubztcbiAgICAgICAgT2JqZWN0LmtleXMobykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBpdGVyYXRlZS5jYWxsKHRoaXMsIG9ba2V5XSwga2V5LCBvKTtcbiAgICAgICAgfSwgY29udGV4dCB8fCBvKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBkZXNjIE1pbWljcyBVbmRlcnNjb3JlJ3MgW2ZpbmRdKGh0dHA6Ly91bmRlcnNjb3JlanMub3JnLyNmaW5kKSBtZXRob2Q6IExvb2sgdGhyb3VnaCBlYWNoIG1lbWJlciBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIHJldHVybmluZyB0aGUgZmlyc3Qgb25lIHRoYXQgcGFzc2VzIGEgdHJ1dGggdGVzdCAoYHByZWRpY2F0ZWApLCBvciBgdW5kZWZpbmVkYCBpZiBubyB2YWx1ZSBwYXNzZXMgdGhlIHRlc3QuIFRoZSBmdW5jdGlvbiByZXR1cm5zIHRoZSB2YWx1ZSBvZiB0aGUgZmlyc3QgYWNjZXB0YWJsZSBtZW1iZXIsIGFuZCBkb2Vzbid0IG5lY2Vzc2FyaWx5IHRyYXZlcnNlIHRoZSBlbnRpcmUgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IHByZWRpY2F0ZSAtIEZvciBlYWNoIG1lbWJlciBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggdGhyZWUgYXJndW1lbnRzOiBgKHZhbHVlLCBrZXksIG9iamVjdClgLiBUaGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgZnVuY3Rpb24gc2hvdWxkIGJlIHRydXRoeSBpZiB0aGUgbWVtYmVyIHBhc3NlcyB0aGUgdGVzdCBhbmQgZmFsc3kgb3RoZXJ3aXNlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dF0gLSBJZiBnaXZlbiwgYHByZWRpY2F0ZWAgaXMgYm91bmQgdG8gdGhpcyBvYmplY3QuIEluIG90aGVyIHdvcmRzLCB0aGlzIG9iamVjdCBiZWNvbWVzIHRoZSBgdGhpc2AgdmFsdWUgaW4gdGhlIGNhbGxzIHRvIGBwcmVkaWNhdGVgLiAoT3RoZXJ3aXNlLCB0aGUgYHRoaXNgIHZhbHVlIHdpbGwgYmUgdGhlIHVud3JhcHBlZCBvYmplY3QuKVxuICAgICAqIEByZXR1cm4geyp9IFRoZSBmb3VuZCBwcm9wZXJ0eSdzIHZhbHVlLCBvciB1bmRlZmluZWQgaWYgbm90IGZvdW5kLlxuICAgICAqIEBtZW1iZXJPZiBXcmFwcGVyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGZpbmQ6IGZ1bmN0aW9uIChwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIG8gPSB0aGlzLm87XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIGlmIChvKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBPYmplY3Qua2V5cyhvKS5maW5kKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJlZGljYXRlLmNhbGwodGhpcywgb1trZXldLCBrZXksIG8pO1xuICAgICAgICAgICAgfSwgY29udGV4dCB8fCBvKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG9bcmVzdWx0XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBNaW1pY3MgVW5kZXJzY29yZSdzIFtmaWx0ZXJdKGh0dHA6Ly91bmRlcnNjb3JlanMub3JnLyNmaWx0ZXIpIG1ldGhvZDogTG9vayB0aHJvdWdoIGVhY2ggbWVtYmVyIG9mIHRoZSB3cmFwcGVkIG9iamVjdCwgcmV0dXJuaW5nIHRoZSB2YWx1ZXMgb2YgYWxsIG1lbWJlcnMgdGhhdCBwYXNzIGEgdHJ1dGggdGVzdCAoYHByZWRpY2F0ZWApLCBvciBlbXB0eSBhcnJheSBpZiBubyB2YWx1ZSBwYXNzZXMgdGhlIHRlc3QuIFRoZSBmdW5jdGlvbiBhbHdheXMgdHJhdmVyc2VzIHRoZSBlbnRpcmUgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IHByZWRpY2F0ZSAtIEZvciBlYWNoIG1lbWJlciBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggdGhyZWUgYXJndW1lbnRzOiBgKHZhbHVlLCBrZXksIG9iamVjdClgLiBUaGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgZnVuY3Rpb24gc2hvdWxkIGJlIHRydXRoeSBpZiB0aGUgbWVtYmVyIHBhc3NlcyB0aGUgdGVzdCBhbmQgZmFsc3kgb3RoZXJ3aXNlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dF0gLSBJZiBnaXZlbiwgYHByZWRpY2F0ZWAgaXMgYm91bmQgdG8gdGhpcyBvYmplY3QuIEluIG90aGVyIHdvcmRzLCB0aGlzIG9iamVjdCBiZWNvbWVzIHRoZSBgdGhpc2AgdmFsdWUgaW4gdGhlIGNhbGxzIHRvIGBwcmVkaWNhdGVgLiAoT3RoZXJ3aXNlLCB0aGUgYHRoaXNgIHZhbHVlIHdpbGwgYmUgdGhlIHVud3JhcHBlZCBvYmplY3QuKVxuICAgICAqIEByZXR1cm4geyp9IEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIGZpbHRlcmVkIHZhbHVlcy5cbiAgICAgKiBAbWVtYmVyT2YgV3JhcHBlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBmaWx0ZXI6IGZ1bmN0aW9uIChwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIG8gPSB0aGlzLm87XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgICAgaWYgKG8pIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG8pLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzLCBvW2tleV0sIGtleSwgbykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gob1trZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBjb250ZXh0IHx8IG8pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBkZXNjIE1pbWljcyBVbmRlcnNjb3JlJ3MgW21hcF0oaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvI21hcCkgbWV0aG9kOiBQcm9kdWNlcyBhIG5ldyBhcnJheSBvZiB2YWx1ZXMgYnkgbWFwcGluZyBlYWNoIHZhbHVlIGluIGxpc3QgdGhyb3VnaCBhIHRyYW5zZm9ybWF0aW9uIGZ1bmN0aW9uIChgaXRlcmF0ZWVgKS4gVGhlIGZ1bmN0aW9uIGFsd2F5cyB0cmF2ZXJzZXMgdGhlIGVudGlyZSBvYmplY3QuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gaXRlcmF0ZWUgLSBGb3IgZWFjaCBtZW1iZXIgb2YgdGhlIHdyYXBwZWQgb2JqZWN0LCB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogYCh2YWx1ZSwga2V5LCBvYmplY3QpYC4gVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIGZ1bmN0aW9uIGlzIGNvbmNhdGVuYXRlZCB0byB0aGUgZW5kIG9mIHRoZSBuZXcgYXJyYXkuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtjb250ZXh0XSAtIElmIGdpdmVuLCBgaXRlcmF0ZWVgIGlzIGJvdW5kIHRvIHRoaXMgb2JqZWN0LiBJbiBvdGhlciB3b3JkcywgdGhpcyBvYmplY3QgYmVjb21lcyB0aGUgYHRoaXNgIHZhbHVlIGluIHRoZSBjYWxscyB0byBgcHJlZGljYXRlYC4gKE90aGVyd2lzZSwgdGhlIGB0aGlzYCB2YWx1ZSB3aWxsIGJlIHRoZSB1bndyYXBwZWQgb2JqZWN0LilcbiAgICAgKiBAcmV0dXJuIHsqfSBBbiBhcnJheSBjb250YWluaW5nIHRoZSBmaWx0ZXJlZCB2YWx1ZXMuXG4gICAgICogQG1lbWJlck9mIFdyYXBwZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgbWFwOiBmdW5jdGlvbiAoaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIG8gPSB0aGlzLm87XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgICAgaWYgKG8pIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG8pLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGl0ZXJhdGVlLmNhbGwodGhpcywgb1trZXldLCBrZXksIG8pKTtcbiAgICAgICAgICAgIH0sIGNvbnRleHQgfHwgbyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgTWltaWNzIFVuZGVyc2NvcmUncyBbcmVkdWNlXShodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jcmVkdWNlKSBtZXRob2Q6IEJvaWwgZG93biB0aGUgdmFsdWVzIG9mIGFsbCB0aGUgbWVtYmVycyBvZiB0aGUgd3JhcHBlZCBvYmplY3QgaW50byBhIHNpbmdsZSB2YWx1ZS4gYG1lbW9gIGlzIHRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSByZWR1Y3Rpb24sIGFuZCBlYWNoIHN1Y2Nlc3NpdmUgc3RlcCBvZiBpdCBzaG91bGQgYmUgcmV0dXJuZWQgYnkgYGl0ZXJhdGVlKClgLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGl0ZXJhdGVlIC0gRm9yIGVhY2ggbWVtYmVyIG9mIHRoZSB3cmFwcGVkIG9iamVjdCwgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCBmb3VyIGFyZ3VtZW50czogYChtZW1vLCB2YWx1ZSwga2V5LCBvYmplY3QpYC4gVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIGZ1bmN0aW9uIGJlY29tZXMgdGhlIG5ldyB2YWx1ZSBvZiBgbWVtb2AgZm9yIHRoZSBuZXh0IGl0ZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0geyp9IFttZW1vXSAtIElmIG5vIG1lbW8gaXMgcGFzc2VkIHRvIHRoZSBpbml0aWFsIGludm9jYXRpb24gb2YgcmVkdWNlLCB0aGUgaXRlcmF0ZWUgaXMgbm90IGludm9rZWQgb24gdGhlIGZpcnN0IGVsZW1lbnQgb2YgdGhlIGxpc3QuIFRoZSBmaXJzdCBlbGVtZW50IGlzIGluc3RlYWQgcGFzc2VkIGFzIHRoZSBtZW1vIGluIHRoZSBpbnZvY2F0aW9uIG9mIHRoZSBpdGVyYXRlZSBvbiB0aGUgbmV4dCBlbGVtZW50IGluIHRoZSBsaXN0LlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dF0gLSBJZiBnaXZlbiwgYGl0ZXJhdGVlYCBpcyBib3VuZCB0byB0aGlzIG9iamVjdC4gSW4gb3RoZXIgd29yZHMsIHRoaXMgb2JqZWN0IGJlY29tZXMgdGhlIGB0aGlzYCB2YWx1ZSBpbiB0aGUgY2FsbHMgdG8gYGl0ZXJhdGVlYC4gKE90aGVyd2lzZSwgdGhlIGB0aGlzYCB2YWx1ZSB3aWxsIGJlIHRoZSB1bndyYXBwZWQgb2JqZWN0LilcbiAgICAgKiBAcmV0dXJuIHsqfSBUaGUgdmFsdWUgb2YgYG1lbW9gIFwicmVkdWNlZFwiIGFzIHBlciBgaXRlcmF0ZWVgLlxuICAgICAqIEBtZW1iZXJPZiBXcmFwcGVyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHJlZHVjZTogZnVuY3Rpb24gKGl0ZXJhdGVlLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICBpZiAobykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMobykuZm9yRWFjaChmdW5jdGlvbiAoa2V5LCBpZHgpIHtcbiAgICAgICAgICAgICAgICBtZW1vID0gKCFpZHggJiYgbWVtbyA9PT0gdW5kZWZpbmVkKSA/IG9ba2V5XSA6IGl0ZXJhdGVlKG1lbW8sIG9ba2V5XSwga2V5LCBvKTtcbiAgICAgICAgICAgIH0sIGNvbnRleHQgfHwgbyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBkZXNjIE1pbWljcyBVbmRlcnNjb3JlJ3MgW2V4dGVuZF0oaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvI2V4dGVuZCkgbWV0aG9kOiBDb3B5IGFsbCBvZiB0aGUgcHJvcGVydGllcyBpbiBlYWNoIG9mIHRoZSBgc291cmNlYCBvYmplY3QgcGFyYW1ldGVyKHMpIG92ZXIgdG8gdGhlICh3cmFwcGVkKSBkZXN0aW5hdGlvbiBvYmplY3QgKHRodXMgbXV0YXRpbmcgaXQpLiBJdCdzIGluLW9yZGVyLCBzbyB0aGUgcHJvcGVydGllcyBvZiB0aGUgbGFzdCBgc291cmNlYCBvYmplY3Qgd2lsbCBvdmVycmlkZSBwcm9wZXJ0aWVzIHdpdGggdGhlIHNhbWUgbmFtZSBpbiBwcmV2aW91cyBhcmd1bWVudHMgb3IgaW4gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiA+IFRoaXMgbWV0aG9kIGNvcGllcyBvd24gbWVtYmVycyBhcyB3ZWxsIGFzIG1lbWJlcnMgaW5oZXJpdGVkIGZyb20gcHJvdG90eXBlIGNoYWluLlxuICAgICAqIEBwYXJhbSB7Li4ub2JqZWN0fG51bGx8dW5kZWZpbmVkfSBzb3VyY2UgLSBWYWx1ZXMgb2YgYG51bGxgIG9yIGB1bmRlZmluZWRgIGFyZSB0cmVhdGVkIGFzIGVtcHR5IHBsYWluIG9iamVjdHMuXG4gICAgICogQHJldHVybiB7V3JhcHBlcnxvYmplY3R9IFRoZSB3cmFwcGVkIGRlc3RpbmF0aW9uIG9iamVjdCBpZiBjaGFpbmluZyBpcyBpbiBlZmZlY3Q7IG90aGVyd2lzZSB0aGUgdW53cmFwcGVkIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAbWVtYmVyT2YgV3JhcHBlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBleHRlbmQ6IGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICAgICAgdmFyIG8gPSB0aGlzLm87XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykuZm9yRWFjaChmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAob2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICAgICAgICBvW2tleV0gPSBvYmplY3Rba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5jaGFpbmluZyA/IHRoaXMgOiBvO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBNaW1pY3MgVW5kZXJzY29yZSdzIFtleHRlbmRPd25dKGh0dHA6Ly91bmRlcnNjb3JlanMub3JnLyNleHRlbmRPd24pIG1ldGhvZDogTGlrZSB7QGxpbmsgV3JhcHBlciNleHRlbmR8ZXh0ZW5kfSwgYnV0IG9ubHkgY29waWVzIGl0cyBcIm93blwiIHByb3BlcnRpZXMgb3ZlciB0byB0aGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7Li4ub2JqZWN0fG51bGx8dW5kZWZpbmVkfSBzb3VyY2UgLSBWYWx1ZXMgb2YgYG51bGxgIG9yIGB1bmRlZmluZWRgIGFyZSB0cmVhdGVkIGFzIGVtcHR5IHBsYWluIG9iamVjdHMuXG4gICAgICogQHJldHVybiB7V3JhcHBlcnxvYmplY3R9IFRoZSB3cmFwcGVkIGRlc3RpbmF0aW9uIG9iamVjdCBpZiBjaGFpbmluZyBpcyBpbiBlZmZlY3Q7IG90aGVyd2lzZSB0aGUgdW53cmFwcGVkIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAbWVtYmVyT2YgV3JhcHBlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBleHRlbmRPd246IGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICAgICAgdmFyIG8gPSB0aGlzLm87XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykuZm9yRWFjaChmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgICAgICBXcmFwcGVyKG9iamVjdCkuZWFjaChmdW5jdGlvbiAodmFsLCBrZXkpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuZXctY2FwXG4gICAgICAgICAgICAgICAgb1trZXldID0gdmFsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5jaGFpbmluZyA/IHRoaXMgOiBvO1xuICAgIH1cbn07XG5cbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L2ZpbmRcbmlmICghQXJyYXkucHJvdG90eXBlLmZpbmQpIHtcbiAgICBBcnJheS5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uIChwcmVkaWNhdGUpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1leHRlbmQtbmF0aXZlXG4gICAgICAgIGlmICh0aGlzID09PSBudWxsKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheS5wcm90b3R5cGUuZmluZCBjYWxsZWQgb24gbnVsbCBvciB1bmRlZmluZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHByZWRpY2F0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsaXN0ID0gT2JqZWN0KHRoaXMpO1xuICAgICAgICB2YXIgbGVuZ3RoID0gbGlzdC5sZW5ndGggPj4+IDA7XG4gICAgICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgICAgICB2YXIgdmFsdWU7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgICAgICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpLCBsaXN0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV3JhcHBlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIC8vIGEgcmVnZXggc2VhcmNoIHBhdHRlcm4gdGhhdCBtYXRjaGVzIGFsbCB0aGUgcmVzZXJ2ZWQgY2hhcnMgb2YgYSByZWdleCBzZWFyY2ggcGF0dGVyblxuICAgIHJlc2VydmVkID0gLyhbXFwuXFxcXFxcK1xcKlxcP1xcXlxcJFxcKFxcKVxce1xcfVxcPVxcIVxcPFxcPlxcfFxcOlxcW1xcXV0pL2csXG5cbiAgICAvLyByZWdleCB3aWxkY2FyZCBzZWFyY2ggcGF0dGVybnNcbiAgICBSRUdFWFBfV0lMRENBUkQgPSAnLionLFxuICAgIFJFR0VYUF9XSUxEQ0hBUiA9ICcuJyxcbiAgICBSRUdFWFBfV0lMRENBUkRfTUFUQ0hFUiA9ICcoJyArIFJFR0VYUF9XSUxEQ0FSRCArICcpJyxcblxuICAgIC8vIExJS0Ugc2VhcmNoIHBhdHRlcm5zXG4gICAgTElLRV9XSUxEQ0hBUiA9ICdfJyxcbiAgICBMSUtFX1dJTERDQVJEID0gJyUnLFxuXG4gICAgLy8gcmVnZXggc2VhcmNoIHBhdHRlcm5zIHRoYXQgbWF0Y2ggTElLRSBzZWFyY2ggcGF0dGVybnNcbiAgICBSRUdFWFBfTElLRV9QQVRURVJOX01BVENIRVIgPSBuZXcgUmVnRXhwKCcoJyArIFtcbiAgICAgICAgTElLRV9XSUxEQ0hBUixcbiAgICAgICAgTElLRV9XSUxEQ0FSRCxcbiAgICAgICAgJ1xcXFxbXFxcXF4/W14tXFxcXF1dK10nLCAvLyBtYXRjaGVzIGEgTElLRSBzZXQgKHNhbWUgc3ludGF4IGFzIGEgUmVnRXhwIHNldClcbiAgICAgICAgJ1xcXFxbXFxcXF4/W14tXFxcXF1dXFxcXC1bXlxcXFxdXV0nIC8vIG1hdGNoZXMgYSBMSUtFIHJhbmdlIChzYW1lIHN5bnRheCBhcyBhIFJlZ0V4cCByYW5nZSlcbiAgICBdLmpvaW4oJ3wnKSArICcpJywgJ2cnKTtcblxuZnVuY3Rpb24gcmVnRXhwTElLRShwYXR0ZXJuLCBpZ25vcmVDYXNlKSB7XG4gICAgdmFyIGksIHBhcnRzO1xuXG4gICAgLy8gRmluZCBhbGwgTElLRSBwYXR0ZXJuc1xuICAgIHBhcnRzID0gcGF0dGVybi5tYXRjaChSRUdFWFBfTElLRV9QQVRURVJOX01BVENIRVIpO1xuXG4gICAgaWYgKHBhcnRzKSB7XG4gICAgICAgIC8vIFRyYW5zbGF0ZSBmb3VuZCBMSUtFIHBhdHRlcm5zIHRvIHJlZ2V4IHBhdHRlcm5zLCBlc2NhcGVkIGludGVydmVuaW5nIG5vbi1wYXR0ZXJucywgYW5kIGludGVybGVhdmUgdGhlIHR3b1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgLy8gRXNjYXBlIGxlZnQgYnJhY2tldHMgKHVucGFpcmVkIHJpZ2h0IGJyYWNrZXRzIGFyZSBPSylcbiAgICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gJ1snKSB7XG4gICAgICAgICAgICAgICAgcGFydHNbaV0gPSByZWdFeHBMSUtFLnJlc2VydmUocGFydHNbaV0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIGVhY2ggZm91bmQgcGF0dGVybiBtYXRjaGFibGUgYnkgZW5jbG9zaW5nIGluIHBhcmVudGhlc2VzXG4gICAgICAgICAgICBwYXJ0c1tpXSA9ICcoJyArIHBhcnRzW2ldICsgJyknO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWF0Y2ggdGhlc2UgcHJlY2lzZSBwYXR0ZXJucyBhZ2FpbiB3aXRoIHRoZWlyIGludGVydmVuaW5nIG5vbi1wYXR0ZXJucyAoaS5lLiwgdGV4dClcbiAgICAgICAgcGFydHMgPSBwYXR0ZXJuLm1hdGNoKG5ldyBSZWdFeHAoXG4gICAgICAgICAgICBSRUdFWFBfV0lMRENBUkRfTUFUQ0hFUiArXG4gICAgICAgICAgICBwYXJ0cy5qb2luKFJFR0VYUF9XSUxEQ0FSRF9NQVRDSEVSKSAgK1xuICAgICAgICAgICAgUkVHRVhQX1dJTERDQVJEX01BVENIRVJcbiAgICAgICAgKSk7XG5cbiAgICAgICAgLy8gRGlzY2FyZCBmaXJzdCBtYXRjaCBvZiBub24tZ2xvYmFsIHNlYXJjaCAod2hpY2ggaXMgdGhlIHdob2xlIHN0cmluZylcbiAgICAgICAgcGFydHMuc2hpZnQoKTtcblxuICAgICAgICAvLyBGb3IgZWFjaCByZS1mb3VuZCBwYXR0ZXJuIHBhcnQsIHRyYW5zbGF0ZSAlIGFuZCBfIHRvIHJlZ2V4IGVxdWl2YWxlbnRcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IHBhcnRzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2ldO1xuICAgICAgICAgICAgc3dpdGNoIChwYXJ0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSBMSUtFX1dJTERDQVJEOiBwYXJ0ID0gUkVHRVhQX1dJTERDQVJEOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIExJS0VfV0lMRENIQVI6IHBhcnQgPSBSRUdFWFBfV0lMRENIQVI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHZhciBqID0gcGFydFsxXSA9PT0gJ14nID8gMiA6IDE7XG4gICAgICAgICAgICAgICAgICAgIHBhcnQgPSAnWycgKyByZWdFeHBMSUtFLnJlc2VydmUocGFydC5zdWJzdHIoaiwgcGFydC5sZW5ndGggLSAoaiArIDEpKSkgKyAnXSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXJ0c1tpXSA9IHBhcnQ7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJ0cyA9IFtwYXR0ZXJuXTtcbiAgICB9XG5cbiAgICAvLyBGb3IgZWFjaCBzdXJyb3VuZGluZyB0ZXh0IHBhcnQsIGVzY2FwZSByZXNlcnZlZCByZWdleCBjaGFyc1xuICAgIGZvciAoaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICBwYXJ0c1tpXSA9IHJlZ0V4cExJS0UucmVzZXJ2ZShwYXJ0c1tpXSk7XG4gICAgfVxuXG4gICAgLy8gSm9pbiBhbGwgdGhlIGludGVybGVhdmVkIHBhcnRzXG4gICAgcGFydHMgPSBwYXJ0cy5qb2luKCcnKTtcblxuICAgIC8vIE9wdGltaXplIG9yIGFuY2hvciB0aGUgcGF0dGVybiBhdCBlYWNoIGVuZCBhcyBuZWVkZWRcbiAgICBpZiAocGFydHMuc3Vic3RyKDAsIDIpID09PSBSRUdFWFBfV0lMRENBUkQpIHsgcGFydHMgPSBwYXJ0cy5zdWJzdHIoMik7IH0gZWxzZSB7IHBhcnRzID0gJ14nICsgcGFydHM7IH1cbiAgICBpZiAocGFydHMuc3Vic3RyKC0yLCAyKSA9PT0gUkVHRVhQX1dJTERDQVJEKSB7IHBhcnRzID0gcGFydHMuc3Vic3RyKDAsIHBhcnRzLmxlbmd0aCAtIDIpOyB9IGVsc2UgeyBwYXJ0cyArPSAnJCc7IH1cblxuICAgIC8vIFJldHVybiB0aGUgbmV3IHJlZ2V4XG4gICAgcmV0dXJuIG5ldyBSZWdFeHAocGFydHMsIGlnbm9yZUNhc2UgPyAnaScgOiB1bmRlZmluZWQpO1xufVxuXG5yZWdFeHBMSUtFLnJlc2VydmUgPSBmdW5jdGlvbiAocykge1xuICAgIHJldHVybiBzLnJlcGxhY2UocmVzZXJ2ZWQsICdcXFxcJDEnKTtcbn07XG5cbnZhciBjYWNoZSwgc2l6ZTtcblxuLyoqXG4gKiBAc3VtbWFyeSBEZWxldGUgYSBwYXR0ZXJuIGZyb20gdGhlIGNhY2hlOyBvciBjbGVhciB0aGUgd2hvbGUgY2FjaGUuXG4gKiBAcGFyYW0ge3N0cmluZ30gW3BhdHRlcm5dIC0gVGhlIExJS0UgcGF0dGVybiB0byByZW1vdmUgZnJvbSB0aGUgY2FjaGUuIEZhaWxzIHNpbGVudGx5IGlmIG5vdCBmb3VuZCBpbiB0aGUgY2FjaGUuIElmIHBhdHRlcm4gb21pdHRlZCwgY2xlYXJzIHdob2xlIGNhY2hlLlxuICovXG4ocmVnRXhwTElLRS5jbGVhckNhY2hlID0gZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICBpZiAoIXBhdHRlcm4pIHtcbiAgICAgICAgY2FjaGUgPSB7fTtcbiAgICAgICAgc2l6ZSA9IDA7XG4gICAgfSBlbHNlIGlmIChjYWNoZVtwYXR0ZXJuXSkge1xuICAgICAgICBkZWxldGUgY2FjaGVbcGF0dGVybl07XG4gICAgICAgIHNpemUtLTtcbiAgICB9XG4gICAgcmV0dXJuIHNpemU7XG59KSgpOyAvLyBpbml0IHRoZSBjYWNoZVxuXG5yZWdFeHBMSUtFLmdldENhY2hlU2l6ZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHNpemU7IH07XG5cbi8qKlxuICogQHN1bW1hcnkgQ2FjaGVkIHZlcnNpb24gb2YgYHJlZ0V4cExJS0UoKWAuXG4gKiBAZGVzYyBDYWNoZWQgZW50cmllcyBhcmUgc3ViamVjdCB0byBnYXJiYWdlIGNvbGxlY3Rpb24gaWYgYGtlZXBgIGlzIGB1bmRlZmluZWRgIG9yIGBmYWxzZWAgb24gaW5zZXJ0aW9uIG9yIGBmYWxzZWAgb24gbW9zdCByZWNlbnQgcmVmZXJlbmNlLiBHYXJiYWdlIGNvbGxlY3Rpb24gd2lsbCBvY2N1ciBpZmYgYHJlZ0V4cExJS0UuY2FjaGVNYXhgIGlzIGRlZmluZWQgYW5kIGl0IGVxdWFscyB0aGUgbnVtYmVyIG9mIGNhY2hlZCBwYXR0ZXJucy4gVGhlIGdhcmJhZ2UgY29sbGVjdG9yIHNvcnRzIHRoZSBwYXR0ZXJucyBiYXNlZCBvbiBtb3N0IHJlY2VudCByZWZlcmVuY2U7IHRoZSBvbGRlc3QgMTAlIG9mIHRoZSBlbnRyaWVzIGFyZSBkZWxldGVkLiBBbHRlcm5hdGl2ZWx5LCB5b3UgY2FuIG1hbmFnZSB0aGUgY2FjaGUgeW91cnNlbGYgdG8gYSBsaW1pdGVkIGV4dGVudCAoc2VlIHtAbGluayByZWdlRXhwTElLRS5jbGVhckNhY2hlfGNsZWFyQ2FjaGV9KS5cbiAqIEBwYXJhbSBwYXR0ZXJuIC0gdGhlIExJS0UgcGF0dGVybiAodG8gYmUpIGNvbnZlcnRlZCB0byBhIFJlZ0V4cFxuICogQHBhcmFtIFtrZWVwXSAtIElmIGdpdmVuLCBjaGFuZ2VzIHRoZSBrZWVwIHN0YXR1cyBmb3IgdGhpcyBwYXR0ZXJuIGFzIGZvbGxvd3M6XG4gKiAqIGB0cnVlYCBwZXJtYW5lbnRseSBjYWNoZXMgdGhlIHBhdHRlcm4gKG5vdCBzdWJqZWN0IHRvIGdhcmJhZ2UgY29sbGVjdGlvbikgdW50aWwgYGZhbHNlYCBpcyBnaXZlbiBvbiBhIHN1YnNlcXVlbnQgY2FsbFxuICogKiBgZmFsc2VgIGFsbG93cyBnYXJiYWdlIGNvbGxlY3Rpb24gb24gdGhlIGNhY2hlZCBwYXR0ZXJuXG4gKiAqIGB1bmRlZmluZWRgIG5vIGNoYW5nZSB0byBrZWVwIHN0YXR1c1xuICogQHJldHVybnMge1JlZ0V4cH1cbiAqL1xucmVnRXhwTElLRS5jYWNoZWQgPSBmdW5jdGlvbiAoa2VlcCwgcGF0dGVybiwgaWdub3JlQ2FzZSkge1xuICAgIGlmICh0eXBlb2Yga2VlcCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgaWdub3JlQ2FzZSA9IHBhdHRlcm47XG4gICAgICAgIHBhdHRlcm4gPSBrZWVwO1xuICAgICAgICBrZWVwID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBwYXR0ZXJuQW5kQ2FzZSA9IHBhdHRlcm4gKyAoaWdub3JlQ2FzZSA/ICdpJyA6ICdjJyksXG4gICAgICAgIGl0ZW0gPSBjYWNoZVtwYXR0ZXJuQW5kQ2FzZV07XG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgaXRlbS53aGVuID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIGlmIChrZWVwICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGl0ZW0ua2VlcCA9IGtlZXA7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc2l6ZSA9PT0gcmVnRXhwTElLRS5jYWNoZU1heCkge1xuICAgICAgICAgICAgdmFyIGFnZSA9IFtdLCBhZ2VzID0gMCwga2V5LCBpO1xuICAgICAgICAgICAgZm9yIChrZXkgaW4gY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBpdGVtID0gY2FjaGVba2V5XTtcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW0ua2VlcCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYWdlczsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS53aGVuIDwgYWdlW2ldLml0ZW0ud2hlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFnZS5zcGxpY2UoaSwgMCwgeyBrZXk6IGtleSwgaXRlbTogaXRlbSB9KTtcbiAgICAgICAgICAgICAgICAgICAgYWdlcysrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYWdlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZWdFeHBMSUtFKHBhdHRlcm4sIGlnbm9yZUNhc2UpOyAvLyBjYWNoZSBpcyBmdWxsIVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSA9IE1hdGguY2VpbChhZ2UubGVuZ3RoIC8gMTApOyAvLyB3aWxsIGFsd2F5cyBiZSBhdCBsZWFzdCAxXG4gICAgICAgICAgICBzaXplIC09IGk7XG4gICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGNhY2hlW2FnZVtpXS5rZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGl0ZW0gPSBjYWNoZVtwYXR0ZXJuQW5kQ2FzZV0gPSB7XG4gICAgICAgICAgICByZWdleDogcmVnRXhwTElLRShwYXR0ZXJuLCBpZ25vcmVDYXNlKSxcbiAgICAgICAgICAgIGtlZXA6IGtlZXAsXG4gICAgICAgICAgICB3aGVuOiBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICAgICAgICB9O1xuICAgICAgICBzaXplKys7XG4gICAgfVxuICAgIHJldHVybiBpdGVtLnJlZ2V4O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSByZWdFeHBMSUtFO1xuIiwiLy8gdGVtcGxleCBub2RlIG1vZHVsZVxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2pvbmVpdC90ZW1wbGV4XG5cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuXG4vKipcbiAqIE1lcmdlcyB2YWx1ZXMgb2YgZXhlY3V0aW9uIGNvbnRleHQgcHJvcGVydGllcyBuYW1lZCBpbiB0ZW1wbGF0ZSBieSB7cHJvcDF9LFxuICoge3Byb3AyfSwgZXRjLiwgb3IgYW55IGphdmFzY3JpcHQgZXhwcmVzc2lvbiBpbmNvcnBvcmF0aW5nIHN1Y2ggcHJvcCBuYW1lcy5cbiAqIFRoZSBjb250ZXh0IGFsd2F5cyBpbmNsdWRlcyB0aGUgZ2xvYmFsIG9iamVjdC4gSW4gYWRkaXRpb24geW91IGNhbiBzcGVjaWZ5IGEgc2luZ2xlXG4gKiBjb250ZXh0IG9yIGFuIGFycmF5IG9mIGNvbnRleHRzIHRvIHNlYXJjaCAoaW4gdGhlIG9yZGVyIGdpdmVuKSBiZWZvcmUgZmluYWxseVxuICogc2VhcmNoaW5nIHRoZSBnbG9iYWwgY29udGV4dC5cbiAqXG4gKiBNZXJnZSBleHByZXNzaW9ucyBjb25zaXN0aW5nIG9mIHNpbXBsZSBudW1lcmljIHRlcm1zLCBzdWNoIGFzIHswfSwgezF9LCBldGMuLCBkZXJlZlxuICogdGhlIGZpcnN0IGNvbnRleHQgZ2l2ZW4sIHdoaWNoIGlzIGFzc3VtZWQgdG8gYmUgYW4gYXJyYXkuIEFzIGEgY29udmVuaWVuY2UgZmVhdHVyZSxcbiAqIGlmIGFkZGl0aW9uYWwgYXJncyBhcmUgZ2l2ZW4gYWZ0ZXIgYHRlbXBsYXRlYCwgYGFyZ3VtZW50c2AgaXMgdW5zaGlmdGVkIG9udG8gdGhlIGNvbnRleHRcbiAqIGFycmF5LCB0aHVzIG1ha2luZyBmaXJzdCBhZGRpdGlvbmFsIGFyZyBhdmFpbGFibGUgYXMgezF9LCBzZWNvbmQgYXMgezJ9LCBldGMuLCBhcyBpblxuICogYHRlbXBsZXgoJ0hlbGxvLCB7MX0hJywgJ1dvcmxkJylgLiAoezB9IGlzIHRoZSB0ZW1wbGF0ZSBzbyBjb25zaWRlciB0aGlzIHRvIGJlIDEtYmFzZWQuKVxuICpcbiAqIElmIHlvdSBwcmVmZXIgc29tZXRoaW5nIG90aGVyIHRoYW4gYnJhY2VzLCByZWRlZmluZSBgdGVtcGxleC5yZWdleHBgLlxuICpcbiAqIFNlZSB0ZXN0cyBmb3IgZXhhbXBsZXMuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRlbXBsYXRlXG4gKiBAcGFyYW0gey4uLnN0cmluZ30gW2FyZ3NdXG4gKi9cbmZ1bmN0aW9uIHRlbXBsZXgodGVtcGxhdGUpIHtcbiAgICB2YXIgY29udGV4dHMgPSB0aGlzIGluc3RhbmNlb2YgQXJyYXkgPyB0aGlzIDogW3RoaXNdO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkgeyBjb250ZXh0cy51bnNoaWZ0KGFyZ3VtZW50cyk7IH1cbiAgICByZXR1cm4gdGVtcGxhdGUucmVwbGFjZSh0ZW1wbGV4LnJlZ2V4cCwgdGVtcGxleC5tZXJnZXIuYmluZChjb250ZXh0cykpO1xufVxuXG50ZW1wbGV4LnJlZ2V4cCA9IC9cXHsoLio/KVxcfS9nO1xuXG50ZW1wbGV4LndpdGggPSBmdW5jdGlvbiAoaSwgcykge1xuICAgIHJldHVybiAnd2l0aCh0aGlzWycgKyBpICsgJ10peycgKyBzICsgJ30nO1xufTtcblxudGVtcGxleC5jYWNoZSA9IFtdO1xuXG50ZW1wbGV4LmRlcmVmID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGlmICghKHRoaXMubGVuZ3RoIGluIHRlbXBsZXguY2FjaGUpKSB7XG4gICAgICAgIHZhciBjb2RlID0gJ3JldHVybiBldmFsKGV4cHIpJztcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGNvZGUgPSB0ZW1wbGV4LndpdGgoaSwgY29kZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0ZW1wbGV4LmNhY2hlW3RoaXMubGVuZ3RoXSA9IGV2YWwoJyhmdW5jdGlvbihleHByKXsnICsgY29kZSArICd9KScpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWV2YWxcbiAgICB9XG4gICAgcmV0dXJuIHRlbXBsZXguY2FjaGVbdGhpcy5sZW5ndGhdLmNhbGwodGhpcywga2V5KTtcbn07XG5cbnRlbXBsZXgubWVyZ2VyID0gZnVuY3Rpb24gKG1hdGNoLCBrZXkpIHtcbiAgICAvLyBBZHZhbmNlZCBmZWF0dXJlczogQ29udGV4dCBjYW4gYmUgYSBsaXN0IG9mIGNvbnRleHRzIHdoaWNoIGFyZSBzZWFyY2hlZCBpbiBvcmRlci5cbiAgICB2YXIgcmVwbGFjZW1lbnQ7XG5cbiAgICB0cnkge1xuICAgICAgICByZXBsYWNlbWVudCA9IGlzTmFOKGtleSkgPyB0ZW1wbGV4LmRlcmVmLmNhbGwodGhpcywga2V5KSA6IHRoaXNbMF1ba2V5XTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlcGxhY2VtZW50ID0gJ3snICsga2V5ICsgJ30nO1xuICAgIH1cblxuICAgIHJldHVybiByZXBsYWNlbWVudDtcbn07XG5cbi8vIHRoaXMgaW50ZXJmYWNlIGNvbnNpc3RzIHNvbGVseSBvZiB0aGUgdGVtcGxleCBmdW5jdGlvbiAoYW5kIGl0J3MgcHJvcGVydGllcylcbm1vZHVsZS5leHBvcnRzID0gdGVtcGxleDtcbiIsIi8vIENyZWF0ZWQgYnkgSm9uYXRoYW4gRWl0ZW4gb24gMS83LzE2LlxuXG4ndXNlIHN0cmljdCc7XG5cblxuLyoqXG4gKiBAc3VtbWFyeSBXYWxrIGEgaGllcmFyY2hpY2FsIG9iamVjdCBhcyBKU09OLnN0cmluZ2lmeSBkb2VzIGJ1dCB3aXRob3V0IHNlcmlhbGl6aW5nLlxuICpcbiAqIEBkZXNjIFVzYWdlOlxuICogKiB2YXIgbXlEaXN0aWxsZWRPYmplY3QgPSB1bnN0cnVuZ2lmeS5jYWxsKG15T2JqZWN0KTtcbiAqICogdmFyIG15RGlzdGlsbGVkT2JqZWN0ID0gbXlBcGkuZ2V0U3RhdGUoKTsgLy8gd2hlcmUgbXlBcGkucHJvdG90eXBlLmdldFN0YXRlID0gdW5zdHJ1bmdpZnlcbiAqXG4gKiBSZXN1bHQgZXF1aXZhbGVudCB0byBgSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzKSlgLlxuICpcbiAqID4gRG8gbm90IHVzZSB0aGlzIGZ1bmN0aW9uIHRvIGdldCBhIEpTT04gc3RyaW5nOyB1c2UgYEpTT04uc3RyaW5naWZ5KHRoaXMpYCBpbnN0ZWFkLlxuICpcbiAqIEB0aGlzIHsqfG9iamVjdHwqW119IC0gT2JqZWN0IHRvIHdhbGs7IHR5cGljYWxseSBhbiBvYmplY3Qgb3IgYXJyYXkuXG4gKlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5wcmVzZXJ2ZT1mYWxzZV0gLSBQcmVzZXJ2ZSB1bmRlZmluZWQgYXJyYXkgZWxlbWVudHMgYXMgYG51bGxgcy5cbiAqIFVzZSB0aGlzIHdoZW4gcHJlY2lzZSBpbmRleCBtYXR0ZXJzIChub3QgbWVyZWx5IHRoZSBvcmRlciBvZiB0aGUgZWxlbWVudHMpLlxuICpcbiAqIEByZXR1cm5zIHtvYmplY3R9IC0gRGlzdGlsbGVkIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gdW5zdHJ1bmdpZnkob3B0aW9ucykge1xuICAgIHZhciBjbG9uZSwgdmFsdWUsXG4gICAgICAgIG9iamVjdCA9ICh0eXBlb2YgdGhpcy50b0pTT04gPT09ICdmdW5jdGlvbicpID8gdGhpcy50b0pTT04oKSA6IHRoaXMsXG4gICAgICAgIHByZXNlcnZlID0gb3B0aW9ucyAmJiBvcHRpb25zLnByZXNlcnZlO1xuXG4gICAgaWYgKHVuc3RydW5naWZ5LmlzQXJyYXkob2JqZWN0KSkge1xuICAgICAgICBjbG9uZSA9IFtdO1xuICAgICAgICBvYmplY3QuZm9yRWFjaChmdW5jdGlvbihvYmopIHtcbiAgICAgICAgICAgIHZhbHVlID0gdW5zdHJ1bmdpZnkuY2FsbChvYmopO1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjbG9uZS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJlc2VydmUpIHtcbiAgICAgICAgICAgICAgICBjbG9uZS5wdXNoKG51bGwpOyAvLyB1bmRlZmluZWQgbm90IGEgdmFsaWQgSlNPTiB2YWx1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9IGVsc2UgIGlmICh0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICBjbG9uZSA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyhvYmplY3QpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHVuc3RydW5naWZ5LmNhbGwob2JqZWN0W2tleV0pO1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjbG9uZVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNsb25lID0gb2JqZWN0O1xuICAgIH1cblxuICAgIHJldHVybiBjbG9uZTtcbn1cblxuLyoqXG4gKiBWZXJ5IGZhc3QgYXJyYXkgdGVzdC5cbiAqIEZvciBjcm9zcy1mcmFtZSBzY3JpcHRpbmc7IHVzZSBgY3Jvc3NGcmFtZXNJc0FycmF5YCBpbnN0ZWFkLlxuICogQHBhcmFtIHsqfSBhcnIgLSBUaGUgb2JqZWN0IHRvIHRlc3QuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNBcnJheShhcnIpIHsgcmV0dXJuIGFyci5jb25zdHJ1Y3RvciA9PT0gQXJyYXk7IH1cbnVuc3RydW5naWZ5LmlzQXJyYXkgPSBpc0FycmF5O1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLCBhcnJTdHJpbmcgPSAnW29iamVjdCBBcnJheV0nO1xuXG4vKipcbiAqIFZlcnkgc2xvdyBhcnJheSB0ZXN0LiBTdWl0YWJsZSBmb3IgY3Jvc3MtZnJhbWUgc2NyaXB0aW5nLlxuICpcbiAqIFN1Z2dlc3Rpb246IElmIHlvdSBuZWVkIHRoaXMgYW5kIGhhdmUgalF1ZXJ5IGxvYWRlZCwgdXNlIGBqUXVlcnkuaXNBcnJheWAgaW5zdGVhZCB3aGljaCBpcyByZWFzb25hYmx5IGZhc3QuXG4gKlxuICogQHBhcmFtIHsqfSBhcnIgLSBUaGUgb2JqZWN0IHRvIHRlc3QuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gY3Jvc3NGcmFtZXNJc0FycmF5KGFycikgeyByZXR1cm4gdG9TdHJpbmcuY2FsbChhcnIpID09PSBhcnJTdHJpbmc7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bnVzZWQtdmFyc1xuXG5tb2R1bGUuZXhwb3J0cyA9IHVuc3RydW5naWZ5O1xuIiwiLyogZXNsaW50LWVudiBicm93c2VyICovXG5cbi8vIFRoaXMgaXMgdGhlIG1haW4gZmlsZSwgdXNhYmxlIGFzIGlzLCBzdWNoIGFzIGJ5IC90ZXN0L2luZGV4LmpzLlxuLy8gRm9yIG5wbTogcmVxdWlyZSB0aGlzIGZpbGVcbi8vIEZvciBDRE46IGd1bHBmaWxlLmpzIGJyb3dzZXJpZmllcyB0aGlzIGZpbGUgd2l0aCBzb3VyY2VtYXAgdG8gL2J1aWxkL2ZpbHRlci10cmVlLmpzIGFuZCB1Z2xpZmllZCB3aXRob3V0IHNvdXJjZW1hcCB0byAvYnVpbGQvZmlsdGVyLXRyZWUubWluLmpzLiBUaGUgQ0ROIGlzIGh0dHBzOi8vam9uZWl0LmdpdGh1Yi5pby9maWx0ZXItdHJlZS5cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdW5zdHJ1bmdpZnkgPSByZXF1aXJlKCd1bnN0cnVuZ2lmeScpO1xuXG52YXIgY3NzSW5qZWN0b3IgPSByZXF1aXJlKCcuL2pzL2NzcycpO1xudmFyIEZpbHRlck5vZGUgPSByZXF1aXJlKCcuL2pzL0ZpbHRlck5vZGUnKTtcbnZhciBUZXJtaW5hbE5vZGUgPSByZXF1aXJlKCcuL2pzL0ZpbHRlckxlYWYnKTtcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vanMvdGVtcGxhdGUnKTtcbnZhciBvcGVyYXRvcnMgPSByZXF1aXJlKCcuL2pzL3RyZWUtb3BlcmF0b3JzJyk7XG5cbnZhciBvcmRpbmFsID0gMDtcbnZhciByZUZpbHRlclRyZWVFcnJvclN0cmluZyA9IC9eZmlsdGVyLXRyZWU6IC87XG5cbi8qKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAc3VtbWFyeSBBIG5vZGUgaW4gYSBmaWx0ZXIgdHJlZSAoaW5jbHVkaW5nIHRoZSByb290IG5vZGUpLCByZXByZXNlbnRpbmcgYSBjb21wbGV4IGZpbHRlciBleHByZXNzaW9uLlxuICpcbiAqIEBkZXNjIEEgYEZpbHRlclRyZWVgIGlzIGFuIG4tYXJ5IHRyZWUgd2l0aCBhIHNpbmdsZSBgb3BlcmF0b3JgIHRvIGJlIGFwcGxpZWQgdG8gYWxsIGl0cyBgY2hpbGRyZW5gLlxuICpcbiAqIEFsc28ga25vd24gYXMgYSBcInN1YnRyZWVcIiBvciBhIFwic3ViZXhwcmVzc2lvblwiLlxuICpcbiAqIEVhY2ggb2YgdGhlIGBjaGlsZHJlbmAgY2FuIGJlIGVpdGhlcjpcbiAqXG4gKiAqIGEgdGVybWluYWwgbm9kZSBgRmlsdGVyYCAob3IgYW4gb2JqZWN0IGluaGVyaXRpbmcgZnJvbSBgRmlsdGVyYCkgcmVwcmVzZW50aW5nIGEgc2ltcGxlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb247IG9yXG4gKiAqIGEgbmVzdGVkIGBGaWx0ZXJUcmVlYCByZXByZXNlbnRpbmcgYSBjb21wbGV4IHN1YmV4cHJlc3Npb24uXG4gKlxuICogVGhlIGBvcGVyYXRvcmAgbXVzdCBiZSBvbmUgb2YgdGhlIHtAbGluayBvcGVyYXRvcnN8dHJlZSBvcGVyYXRvcnN9IG9yIG1heSBiZSBsZWZ0IHVuZGVmaW5lZCBpZmYgdGhlcmUgaXMgb25seSBvbmUgY2hpbGQgbm9kZS5cbiAqXG4gKiBOb3RlczpcbiAqIDEuIEEgYEZpbHRlclRyZWVgIG1heSBjb25zaXN0IG9mIGEgc2luZ2xlIGxlYWYsIGluIHdoaWNoIGNhc2UgdGhlIGBvcGVyYXRvcmAgaXMgbm90IHVzZWQgYW5kIG1heSBiZSBsZWZ0IHVuZGVmaW5lZC4gSG93ZXZlciwgaWYgYSBzZWNvbmQgY2hpbGQgaXMgYWRkZWQgYW5kIHRoZSBvcGVyYXRvciBpcyBzdGlsbCB1bmRlZmluZWQsIGl0IHdpbGwgYmUgc2V0IHRvIHRoZSBkZWZhdWx0IChgJ29wLWFuZCdgKS5cbiAqIDIuIFRoZSBvcmRlciBvZiB0aGUgY2hpbGRyZW4gaXMgdW5kZWZpbmVkIGFzIGFsbCBvcGVyYXRvcnMgYXJlIGNvbW11dGF0aXZlLiBGb3IgdGhlICdgb3Atb3JgJyBvcGVyYXRvciwgZXZhbHVhdGlvbiBjZWFzZXMgb24gdGhlIGZpcnN0IHBvc2l0aXZlIHJlc3VsdCBhbmQgZm9yIGVmZmljaWVuY3ksIGFsbCBzaW1wbGUgY29uZGl0aW9uYWwgZXhwcmVzc2lvbnMgd2lsbCBiZSBldmFsdWF0ZWQgYmVmb3JlIGFueSBjb21wbGV4IHN1YmV4cHJlc3Npb25zLlxuICogMy4gQSBuZXN0ZWQgYEZpbHRlclRyZWVgIGlzIGRpc3Rpbmd1aXNoZWQgaW4gdGhlIEpTT04gb2JqZWN0IGZyb20gYSBgRmlsdGVyYCBieSB0aGUgcHJlc2VuY2Ugb2YgYSBgY2hpbGRyZW5gIG1lbWJlci5cbiAqIDQuIE5lc3RpbmcgYSBgRmlsdGVyVHJlZWAgY29udGFpbmluZyBhIHNpbmdsZSBjaGlsZCBpcyB2YWxpZCAoYWxiZWl0IHBvaW50bGVzcykuXG4gKlxuICogU2VlIHtAbGluayBGaWx0ZXJOb2RlfSBmb3IgYWRkaXRpb25hbCBgb3B0aW9uc2AgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnMuZWRpdG9yc10gLSBFZGl0b3IgaGFzaCB0byBvdmVycmlkZSBwcm90b3R5cGUncy4gVGhlc2UgYXJlIGNvbnN0cnVjdG9ycyBmb3Igb2JqZWN0cyB0aGF0IGV4dGVuZCBmcm9tIGBGaWx0ZXJUcmVlLnByb3RvdHlwZS5lZGl0b3JzLkRlZmF1bHRgLiBUeXBpY2FsbHksIHlvdSB3b3VsZCBpbmNsdWRlIHRoZSBkZWZhdWx0IGVkaXRvciBpdHNlbGY6IGB7IERlZmF1bHQ6IEZpbHRlclRyZWUucHJvdG90eXBlLmVkaXRvcnMuRGVmYXVsdCwgLi4uIH1gLiBBbHRlcm5hdGl2ZWx5LCBiZWZvcmUgaW5zdGFudGlhdGluZywgeW91IG1pZ2h0IGFkZCB5b3VyIGFkZGl0aW9uYWwgZWRpdG9ycyB0byBgRmlsdGVyVHJlZS5wcm90b3R5cGUuZWRpdG9yc2AgZm9yIHVzZSBieSBhbGwgZmlsdGVyIHRyZWUgb2JqZWN0cy5cbiAqXG4gKiBAcHJvcGVydHkge0ZpbHRlclRyZWV9IHBhcmVudFxuICogQHByb3BlcnR5IHtudW1iZXJ9IG9yZGluYWxcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBvcGVyYXRvclxuICogQHByb3BlcnR5IHtGaWx0ZXJOb2RlW119IGNoaWxkcmVuIC0gRWFjaCBvbmUgaXMgZWl0aGVyIGEgYEZpbHRlcmAgKG9yIGFuIG9iamVjdCBpbmhlcml0aW5nIGZyb20gYEZpbHRlcmApIG9yIGFub3RoZXIgYEZpbHRlclRyZWVgLi5cbiAqIEBwcm9wZXJ0eSB7RWxlbWVudH0gZWwgLSBUaGUgcm9vdCBlbGVtZW50IG9mIHRoaXMgKHN1Yil0cmVlLlxuICovXG52YXIgRmlsdGVyVHJlZSA9IEZpbHRlck5vZGUuZXh0ZW5kKCdGaWx0ZXJUcmVlJywge1xuXG4gICAgcHJlSW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBjc3NJbmplY3RvcignZmlsdGVyLXRyZWUtYmFzZScsIG9wdGlvbnMgJiYgb3B0aW9ucy5jc3NTdHlsZXNoZWV0UmVmZXJlbmNlRWxlbWVudCk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5lZGl0b3JzKSB7XG4gICAgICAgICAgICB0aGlzLmVkaXRvcnMgPSBvcHRpb25zLmVkaXRvcnM7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGRldGFjaENob29zZXIuY2FsbCh0aGlzKTtcbiAgICB9LFxuXG4gICAgZWRpdG9yczoge1xuICAgICAgICBEZWZhdWx0OiBUZXJtaW5hbE5vZGVcbiAgICB9LFxuXG4gICAgYWRkRWRpdG9yOiBmdW5jdGlvbihrZXksIG92ZXJyaWRlcykge1xuICAgICAgICBpZiAob3ZlcnJpZGVzKSB7XG4gICAgICAgICAgICB0aGlzLmVkaXRvcnNba2V5XSA9IFRlcm1pbmFsTm9kZS5leHRlbmQob3ZlcnJpZGVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmVkaXRvcnNba2V5XTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVWaWV3OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5lbCA9IHRlbXBsYXRlKCd0cmVlJywgKytvcmRpbmFsKTtcbiAgICAgICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNhdGNoQ2xpY2suYmluZCh0aGlzKSk7XG4gICAgfSxcblxuICAgIGxvYWRTdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGF0ZSA9IHRoaXMuc3RhdGU7XG5cbiAgICAgICAgdGhpcy5vcGVyYXRvciA9ICdvcC1hbmQnO1xuICAgICAgICB0aGlzLmNoaWxkcmVuID0gW107XG5cbiAgICAgICAgaWYgKCFzdGF0ZSkge1xuICAgICAgICAgICAgdGhpcy5hZGQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93SWZKU09OKHN0YXRlKTtcblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgYHN0YXRlLmNoaWxkcmVuYCAocmVxdWlyZWQpXG4gICAgICAgICAgICBpZiAoIShzdGF0ZS5jaGlsZHJlbiBpbnN0YW5jZW9mIEFycmF5ICYmIHN0YXRlLmNoaWxkcmVuLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBGaWx0ZXJOb2RlLkVycm9yKCdFeHBlY3RlZCBgY2hpbGRyZW5gIHByb3BlcnR5IHRvIGJlIGEgbm9uLWVtcHR5IGFycmF5LicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBgc3RhdGUub3BlcmF0b3JgIChpZiBnaXZlbilcbiAgICAgICAgICAgIGlmIChzdGF0ZS5vcGVyYXRvcikge1xuICAgICAgICAgICAgICAgIGlmICghb3BlcmF0b3JzW3N0YXRlLm9wZXJhdG9yXSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBGaWx0ZXJOb2RlLkVycm9yKCdFeHBlY3RlZCBgb3BlcmF0b3JgIHByb3BlcnR5IHRvIGJlIG9uZSBvZjogJyArIE9iamVjdC5rZXlzKG9wZXJhdG9ycykpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMub3BlcmF0b3IgPSBzdGF0ZS5vcGVyYXRvcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RhdGUuY2hpbGRyZW4uZm9yRWFjaCh0aGlzLmFkZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBzaW11bGF0ZSBjbGljayBvbiB0aGUgb3BlcmF0b3IgdG8gZGlzcGxheSBzdHJpa2UtdGhyb3VnaCBhbmQgb3BlcmF0b3IgYmV0d2VlbiBmaWx0ZXJzXG4gICAgICAgIHZhciByYWRpb0J1dHRvbiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignaW5wdXRbdmFsdWU9JyArIHRoaXMub3BlcmF0b3IgKyAnXScpLFxuICAgICAgICAgICAgYWRkRmlsdGVyTGluayA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignLmZpbHRlci10cmVlLWFkZC1maWx0ZXInKTtcblxuICAgICAgICBpZiAocmFkaW9CdXR0b24pIHtcbiAgICAgICAgICAgIHJhZGlvQnV0dG9uLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpc1snZmlsdGVyLXRyZWUtb3AtY2hvaWNlJ10oe1xuICAgICAgICAgICAgICAgIHRhcmdldDogcmFkaW9CdXR0b25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gd2hlbiBtdWx0aXBsZSBmaWx0ZXIgZWRpdG9ycyBhdmFpbGFibGUsIHNpbXVsYXRlIGNsaWNrIG9uIHRoZSBuZXcgXCJhZGQgY29uZGl0aW9uYWxcIiBsaW5rXG4gICAgICAgIGlmIChhZGRGaWx0ZXJMaW5rICYmICF0aGlzLmNoaWxkcmVuLmxlbmd0aCAmJiBPYmplY3Qua2V5cyh0aGlzLmVkaXRvcnMpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRoaXNbJ2ZpbHRlci10cmVlLWFkZC1maWx0ZXInXSh7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBhZGRGaWx0ZXJMaW5rXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHByb2NlZWQgd2l0aCByZW5kZXJcbiAgICAgICAgRmlsdGVyTm9kZS5wcm90b3R5cGUucmVuZGVyLmNhbGwodGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgbm9kZSBhcyBwZXIgYHN0YXRlYC5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW3N0YXRlXVxuICAgICAqICogSWYgYHN0YXRlYCBoYXMgYSBgY2hpbGRyZW5gIHByb3BlcnR5LCB3aWxsIGF0dGVtcHQgdG8gYWRkIGEgbmV3IHN1YnRyZWUuXG4gICAgICogKiBJZiBgc3RhdGVgIGhhcyBhbiBgZWRpdG9yYCBwcm9wZXJ0eSwgd2lsbCBjcmVhdGUgb25lIChgdGhpcy5lZGl0b3JzW3N0YXRlLmVkaXRvcl1gKS5cbiAgICAgKiAqIElmIGBzdGF0ZWAgaGFzIG5laXRoZXIgKG9yIHdhcyBvbWl0dGVkKSwgd2lsbCBjcmVhdGUgYSBuZXcgZGVmYXVsdCBlZGl0b3IgKGB0aGlzLmVkaXRvcnMuRGVmYXVsdGApLlxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgICAgdmFyIENvbnN0cnVjdG9yO1xuXG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgQ29uc3RydWN0b3IgPSBGaWx0ZXJUcmVlO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlICYmIHN0YXRlLmVkaXRvcikge1xuICAgICAgICAgICAgQ29uc3RydWN0b3IgPSB0aGlzLmVkaXRvcnNbc3RhdGUuZWRpdG9yXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIENvbnN0cnVjdG9yID0gdGhpcy5lZGl0b3JzLkRlZmF1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNoaWxkcmVuLnB1c2gobmV3IENvbnN0cnVjdG9yKHtcbiAgICAgICAgICAgIHN0YXRlOiBzdGF0ZSxcbiAgICAgICAgICAgIHBhcmVudDogdGhpc1xuICAgICAgICB9KSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlYXJjaCB0aGUgZXhwcmVzc2lvbiB0cmVlIGZvciBhIG5vZGUgd2l0aCBjZXJ0YWluIGNoYXJhY3RlcmlzdGljcyBhcyBkZXNjcmliZWQgYnkgdGhlIHR5cGUgb2Ygc2VhcmNoIChgdHlwZWApIGFuZCB0aGUgc2VhcmNoIGFyZ3MuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFt0eXBlPSdmaW5kJ10gLSBOYW1lIG9mIG1ldGhvZCB0byB1c2Ugb24gdGVybWluYWwgbm9kZXM7IGNoYXJhY3Rlcml6ZXMgdGhlIHR5cGUgb2Ygc2VhcmNoLiBNdXN0IGV4aXN0IGluIHlvdXIgdGVybWluYWwgbm9kZSBvYmplY3QuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbZGVlcD1mYWxzZV0gLSBNdXN0IGJlIGV4cGxpY2l0IGB0cnVlYCBvciBgZmFsc2VgIChub3QgbWVyZWx5IHRydXRoeSBvciBmYWxzeSk7IG9yIG9taXR0ZWQuXG4gICAgICogQHBhcmFtIHsqfSBmaXJzdFNlYXJjaEFyZyAtIE1heSBub3QgYmUgYm9vbGVhbiB0eXBlIChhY2NvbW1vZGF0aW9uIHRvIG92ZXJsb2FkIGxvZ2ljKS5cbiAgICAgKiBAcGFyYW0gey4uLip9IFthZGRpdGlvbmFsU2VhcmNoQXJnc11cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxGaWx0ZXJMZWFmfEZpbHRlclRyZWV9XG4gICAgICogKiBgZmFsc2VgIC0gTm90IGZvdW5kLiAoYHRydWVgIGlzIG5ldmVyIHJldHVybmVkLilcbiAgICAgKiAqIGBGaWx0ZXJMZWFmYCAob3IgaW5zdGFuY2Ugb2YgYW4gb2JqZWN0IGV4dGVuZGVkIGZyb20gc2FtZSkgLSBTb3VnaHQgbm9kZSAodHlwaWNhbCkuXG4gICAgICogKiAnRmlsdGVyVHJlZWAgLSBTb3VnaHQgbm9kZSAocmFyZSkuXG4gICAgICovXG4gICAgZmluZDogZnVuY3Rpb24gZmluZCh0eXBlLCBkZWVwKSB7XG4gICAgICAgIHZhciByZXN1bHQsIG4sIHRyZWVBcmdzID0gYXJndW1lbnRzLCBsZWFmQXJncztcblxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBuID0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG4gPSAwO1xuICAgICAgICAgICAgZGVlcCA9IHR5cGU7XG4gICAgICAgICAgICB0eXBlID0gJ2ZpbmQnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkZWVwID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIG4gKz0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlZXAgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxlYWZBcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCBuKTtcblxuICAgICAgICAvLyBUT0RPOiBGb2xsb3dpbmcgY291bGQgYmUgYnJva2VuIG91dCBpbnRvIHNlcGFyYXRlIG1ldGhvZCAobGlrZSBGaWx0ZXJMZWFmKVxuICAgICAgICBpZiAodHlwZSA9PT0gJ2ZpbmRCeUVsJyAmJiB0aGlzLmVsID09PSBsZWFmQXJnc1swXSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB3YWxrIHRyZWUgcmVjdXJzaXZlbHksIGVuZGluZyBvbiBkZWZpbmVkIGByZXN1bHRgIChmaXJzdCBub2RlIGZvdW5kKVxuICAgICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbi5maW5kKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQpIHsgLy8gb25seSByZWN1cnNlIG9uIHVuZGVhZCBjaGlsZHJlblxuICAgICAgICAgICAgICAgIGlmIChjaGlsZCBpbnN0YW5jZW9mIFRlcm1pbmFsTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBhbHdheXMgcmVjdXJzZSBvbiB0ZXJtaW5hbCBub2Rlc1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBjaGlsZFt0eXBlXS5hcHBseShjaGlsZCwgbGVhZkFyZ3MpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGVlcCAmJiBjaGlsZC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSByZWN1cnNlIG9uIHN1YnRyZWVzIGlmIGdvaW5nIGBkZWVwYCBhbmQgbm90IGNoaWxkbGVzc1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBmaW5kLmFwcGx5KGNoaWxkLCB0cmVlQXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7IC8vIHRydXRoaW5lc3MgYWJvcnRzIGZpbmQgbG9vcCBpZiBzZXQgYWJvdmVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBrZWVwIGdvaW5nIC8vIFRPRE86IENvdWxkbid0IHRoaXMganVzdCBiZSBcInJldHVybiByZXN1bHRcIiBtYWtpbmcgdGhlIHJldHVybiBhYm92ZSB1bm5lY2Vzc2FyeT9cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgICdmaWx0ZXItdHJlZS1vcC1jaG9pY2UnOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgdmFyIHJhZGlvQnV0dG9uID0gZXZ0LnRhcmdldDtcblxuICAgICAgICB0aGlzLm9wZXJhdG9yID0gcmFkaW9CdXR0b24udmFsdWU7XG5cbiAgICAgICAgLy8gZGlzcGxheSBzdHJpa2UtdGhyb3VnaFxuICAgICAgICB2YXIgcmFkaW9CdXR0b25zID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yQWxsKCdsYWJlbD5pbnB1dC5maWx0ZXItdHJlZS1vcC1jaG9pY2VbbmFtZT0nICsgcmFkaW9CdXR0b24ubmFtZSArICddJyk7XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHJhZGlvQnV0dG9ucykuZm9yRWFjaChmdW5jdGlvbihyYWRpb0J1dHRvbikgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICAgICAgcmFkaW9CdXR0b24ucGFyZW50RWxlbWVudC5zdHlsZS50ZXh0RGVjb3JhdGlvbiA9IHJhZGlvQnV0dG9uLmNoZWNrZWQgPyAnbm9uZScgOiAnbGluZS10aHJvdWdoJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gZGlzcGxheSBvcGVyYXRvciBiZXR3ZWVuIGZpbHRlcnMgYnkgYWRkaW5nIG9wZXJhdG9yIHN0cmluZyBhcyBhIENTUyBjbGFzcyBvZiB0aGlzIHRyZWVcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9wZXJhdG9ycykge1xuICAgICAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QucmVtb3ZlKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKHRoaXMub3BlcmF0b3IpO1xuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtYWRkLWZpbHRlcic6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBpZiAoT2JqZWN0LmtleXModGhpcy5lZGl0b3JzKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhdHRhY2hDaG9vc2VyLmNhbGwodGhpcywgZXZ0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtYWRkJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4ucHVzaChuZXcgRmlsdGVyVHJlZSh7XG4gICAgICAgICAgICBwYXJlbnQ6IHRoaXNcbiAgICAgICAgfSkpO1xuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtcmVtb3ZlJzogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKGV2dC50YXJnZXQubmV4dEVsZW1lbnRTaWJsaW5nLCB0cnVlKTtcbiAgICB9LFxuXG4gICAgLyoqIFJlbW92ZXMgYSBjaGlsZCBub2RlIGFuZCBpdCdzIC5lbDsgb3IgdmljZS12ZXJzYVxuICAgICAqIEBwYXJhbSB7RWxlbWVudHxGaWx0ZXJOb2RlfSBub2RlXG4gICAgICovXG4gICAgcmVtb3ZlOiBmdW5jdGlvbihub2RlLCBkZWVwKSB7XG4gICAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgICAgICAgICAgbm9kZSA9IHRoaXMuZmluZCgnZmluZEJ5RWwnLCAhIWRlZXAsIG5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZGVsZXRlIHRoaXMuY2hpbGRyZW5bdGhpcy5jaGlsZHJlbi5pbmRleE9mKG5vZGUpXTtcblxuICAgICAgICBub2RlLmVsLnBhcmVudEVsZW1lbnQucmVtb3ZlKG5vZGUuZWwpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvYmplY3QucmV0aHJvdz1mYWxzZV0gLSBDYXRjaCAoZG8gbm90IHRocm93KSB0aGUgZXJyb3IuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb2JqZWN0LmFsZXJ0PXRydWVdIC0gQW5ub3VuY2UgZXJyb3IgdmlhIHdpbmRvdy5hbGVydCgpIGJlZm9yZSByZXR1cm5pbmcuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb2JqZWN0LmZvY3VzPXRydWVdIC0gUGxhY2UgdGhlIGZvY3VzIG9uIHRoZSBvZmZlbmRpbmcgY29udHJvbCBhbmQgZ2l2ZSBpdCBlcnJvciBjb2xvci5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfHN0cmluZ30gYHVuZGVmaW5lZGAgbWVhbnMgdmFsaWQgb3Igc3RyaW5nIGNvbnRhaW5pbmcgZXJyb3IgbWVzc2FnZS5cbiAgICAgKi9cbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICB2YXIgYWxlcnQgPSBvcHRpb25zLmFsZXJ0ID09PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5hbGVydCxcbiAgICAgICAgICAgIHJldGhyb3cgPSBvcHRpb25zLnJldGhyb3cgPT09IHRydWUsXG4gICAgICAgICAgICByZXN1bHQ7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhbGlkYXRlLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZXJyLm1lc3NhZ2U7XG5cbiAgICAgICAgICAgIC8vIFRocm93IHdoZW4gbm90IGEgZmlsdGVyIHRyZWUgZXJyb3JcbiAgICAgICAgICAgIGlmIChyZXRocm93IHx8ICFyZUZpbHRlclRyZWVFcnJvclN0cmluZy50ZXN0KHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhbGVydCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKHJlRmlsdGVyVHJlZUVycm9yU3RyaW5nLCAnJyk7XG4gICAgICAgICAgICAgICAgd2luZG93LmFsZXJ0KHJlc3VsdCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tYWxlcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIHRlc3QoZGF0YVJvdykge1xuICAgICAgICB2YXIgb3BlcmF0b3IgPSBvcGVyYXRvcnNbdGhpcy5vcGVyYXRvcl0sXG4gICAgICAgICAgICByZXN1bHQgPSBvcGVyYXRvci5zZWVkLFxuICAgICAgICAgICAgbm9DaGlsZHJlbkRlZmluZWQgPSB0cnVlO1xuXG4gICAgICAgIHRoaXMuY2hpbGRyZW4uZmluZChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgbm9DaGlsZHJlbkRlZmluZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQgaW5zdGFuY2VvZiBUZXJtaW5hbE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gb3BlcmF0b3IucmVkdWNlKHJlc3VsdCwgY2hpbGQudGVzdChkYXRhUm93KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGlsZC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gb3BlcmF0b3IucmVkdWNlKHJlc3VsdCwgdGVzdC5jYWxsKGNoaWxkLCBkYXRhUm93KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgPT09IG9wZXJhdG9yLmFib3J0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBub0NoaWxkcmVuRGVmaW5lZCB8fCAob3BlcmF0b3IubmVnYXRlID8gIXJlc3VsdCA6IHJlc3VsdCk7XG4gICAgfSxcblxuICAgIHNldEpTT046IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShKU09OLnBhcnNlKGpzb24pKTtcbiAgICB9LFxuXG4gICAgZ2V0U3RhdGU6IHVuc3RydW5naWZ5LFxuXG4gICAgZ2V0SlNPTjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWFkeSA9IEpTT04uc3RyaW5naWZ5KHRoaXMsIG51bGwsIHRoaXMuSlNPTnNwYWNlKTtcbiAgICAgICAgcmV0dXJuIHJlYWR5ID8gcmVhZHkgOiAnJztcbiAgICB9LFxuXG4gICAgdG9KU09OOiBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgICAgICAgIG9wZXJhdG9yOiB0aGlzLm9wZXJhdG9yLFxuICAgICAgICAgICAgY2hpbGRyZW46IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQgaW5zdGFuY2VvZiBUZXJtaW5hbE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGlsZC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWR5ID0gdG9KU09OLmNhbGwoY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVhZHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmNoaWxkcmVuLnB1c2gocmVhZHkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgbWV0YWRhdGEgPSBGaWx0ZXJOb2RlLnByb3RvdHlwZS50b0pTT04uY2FsbCh0aGlzKTtcbiAgICAgICAgT2JqZWN0LmtleXMobWV0YWRhdGEpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICBzdGF0ZVtrZXldID0gbWV0YWRhdGFba2V5XTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHN0YXRlLmNoaWxkcmVuLmxlbmd0aCA/IHN0YXRlIDogdW5kZWZpbmVkO1xuICAgIH0sXG5cbiAgICBnZXRTcWxXaGVyZUNsYXVzZTogZnVuY3Rpb24gZ2V0U3FsV2hlcmVDbGF1c2UoKSB7XG4gICAgICAgIHZhciBsZXhlbWUgPSBvcGVyYXRvcnNbdGhpcy5vcGVyYXRvcl0uU1FMLFxuICAgICAgICAgICAgd2hlcmUgPSAnJztcblxuICAgICAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQsIGlkeCkge1xuICAgICAgICAgICAgdmFyIG9wID0gaWR4ID8gJyAnICsgbGV4ZW1lLm9wICsgJyAnIDogJyc7XG4gICAgICAgICAgICBpZiAoY2hpbGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQgaW5zdGFuY2VvZiBUZXJtaW5hbE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgd2hlcmUgKz0gb3AgKyBjaGlsZC5nZXRTcWxXaGVyZUNsYXVzZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hpbGQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoZXJlICs9IG9wICsgZ2V0U3FsV2hlcmVDbGF1c2UuY2FsbChjaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXdoZXJlKSB7XG4gICAgICAgICAgICB3aGVyZSA9ICdOVUxMIElTIE5VTEwnO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGxleGVtZS5iZWcgKyB3aGVyZSArIGxleGVtZS5lbmQ7XG4gICAgfVxuXG59KTtcblxuLyoqXG4gKiBDaGVja3MgdG8gbWFrZSBzdXJlIGBzdGF0ZWAgaXMgZGVmaW5lZCBhcyBhIHBsYWluIG9iamVjdCBhbmQgbm90IGEgSlNPTiBzdHJpbmcuXG4gKiBJZiBub3QsIHRocm93cyBlcnJvciBhbmQgZG9lcyBub3QgcmV0dXJuLlxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiB0aHJvd0lmSlNPTihzdGF0ZSkge1xuICAgIGlmICh0eXBlb2Ygc3RhdGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhciBlcnJNc2cgPSAnRXhwZWN0ZWQgYHN0YXRlYCBwYXJhbWV0ZXIgdG8gYmUgYW4gb2JqZWN0Lic7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBlcnJNc2cgKz0gJyBTZWUgYEpTT04ucGFyc2UoKWAuJztcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBGaWx0ZXJOb2RlLkVycm9yKGVyck1zZyk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjYXRjaENsaWNrKGV2dCkgeyAvLyBtdXN0IGJlIGNhbGxlZCB3aXRoIGNvbnRleHRcbiAgICB2YXIgZWx0ID0gZXZ0LnRhcmdldDtcblxuICAgIHZhciBoYW5kbGVyID0gdGhpc1tlbHQuY2xhc3NOYW1lXSB8fCB0aGlzW2VsdC5wYXJlbnROb2RlLmNsYXNzTmFtZV07XG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuZGV0YWNoQ2hvb3Nlcikge1xuICAgICAgICAgICAgdGhpcy5kZXRhY2hDaG9vc2VyKCk7XG4gICAgICAgIH1cbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGV2dCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5ldmVudEhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5ldmVudEhhbmRsZXIoZXZ0KTtcbiAgICB9XG59XG5cbi8qKlxuICogVGhyb3dzIGVycm9yIGlmIGludmFsaWQgZXhwcmVzc2lvbiB0cmVlLlxuICogQ2F1Z2h0IGJ5IHtAbGluayBGaWx0ZXJUcmVlI3ZhbGlkYXRlfEZpbHRlclRyZWUucHJvdG90eXBlLnZhbGlkYXRlKCl9LlxuICogQHBhcmFtIHtib29sZWFufSBmb2N1cyAtIE1vdmUgZm9jdXMgdG8gb2ZmZW5kaW5nIGNvbnRyb2wuXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfSBpZiB2YWxpZFxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGUob3B0aW9ucykgeyAvLyBtdXN0IGJlIGNhbGxlZCB3aXRoIGNvbnRleHRcbiAgICBpZiAodGhpcyBpbnN0YW5jZW9mIEZpbHRlclRyZWUgJiYgIXRoaXMuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgIHRocm93IG5ldyBGaWx0ZXJOb2RlLkVycm9yKCdFbXB0eSBzdWJleHByZXNzaW9uIChubyBmaWx0ZXJzKS4nKTtcbiAgICB9XG5cbiAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgVGVybWluYWxOb2RlKSB7XG4gICAgICAgICAgICBjaGlsZC52YWxpZGF0ZShvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIGlmIChjaGlsZC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhbGlkYXRlLmNhbGwoY2hpbGQsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGF0dGFjaENob29zZXIoZXZ0KSB7IC8vIG11c3QgYmUgY2FsbGVkIHdpdGggY29udGV4dFxuICAgIHZhciB0cmVlID0gdGhpcyxcbiAgICAgICAgcmVjdCA9IGV2dC50YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICBpZiAoIXJlY3Qud2lkdGgpIHtcbiAgICAgICAgLy8gbm90IGluIERPTSB5ZXQgc28gdHJ5IGFnYWluIGxhdGVyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhdHRhY2hDaG9vc2VyLmNhbGwodHJlZSwgZXZ0KTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGl0XG4gICAgdmFyIGVkaXRvcnMgPSBPYmplY3Qua2V5cyhGaWx0ZXJUcmVlLnByb3RvdHlwZS5lZGl0b3JzKSxcbiAgICAgICAgY2hvb3NlciA9IHRoaXMuY2hvb3NlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NlbGVjdCcpO1xuXG4gICAgY2hvb3Nlci5jbGFzc05hbWUgPSAnZmlsdGVyLXRyZWUtY2hvb3Nlcic7XG4gICAgY2hvb3Nlci5zaXplID0gZWRpdG9ycy5sZW5ndGg7XG5cbiAgICBlZGl0b3JzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBuYW1lID0gdHJlZS5lZGl0b3JzW2tleV0ucHJvdG90eXBlLm5hbWUgfHwga2V5O1xuICAgICAgICBjaG9vc2VyLmFkZChuZXcgT3B0aW9uKG5hbWUsIGtleSkpO1xuICAgIH0pO1xuXG4gICAgY2hvb3Nlci5vbm1vdXNlb3ZlciA9IGZ1bmN0aW9uKGV2dCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICBldnQudGFyZ2V0LnNlbGVjdGVkID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgLy8gUG9zaXRpb24gaXRcbiAgICBjaG9vc2VyLnN0eWxlLmxlZnQgPSByZWN0LmxlZnQgKyAxOSArICdweCc7XG4gICAgY2hvb3Nlci5zdHlsZS50b3AgPSByZWN0LmJvdHRvbSArICdweCc7XG5cbiAgICB0aGlzLmRldGFjaENob29zZXIgPSBkZXRhY2hDaG9vc2VyLmJpbmQodGhpcyk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5kZXRhY2hDaG9vc2VyKTsgLy8gZGV0YWNoIGNob29zZXIgaWYgY2xpY2sgb3V0c2lkZVxuXG4gICAgY2hvb3Nlci5vbmNsaWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRyZWUuY2hpbGRyZW4ucHVzaChuZXcgdHJlZS5lZGl0b3JzW2Nob29zZXIudmFsdWVdKHtcbiAgICAgICAgICAgIHBhcmVudDogdHJlZVxuICAgICAgICB9KSk7XG4gICAgICAgIC8vIGNsaWNrIGJ1YmJsZXMgdXAgdG8gd2luZG93IHdoZXJlIGl0IGRldGFjaGVzIGNob29zZXJcbiAgICB9O1xuXG4gICAgY2hvb3Nlci5vbm1vdXNlb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNob29zZXIuc2VsZWN0ZWRJbmRleCA9IC0xO1xuICAgIH07XG5cbiAgICAvLyBBZGQgaXQgdG8gdGhlIERPTVxuICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQoY2hvb3Nlcik7XG5cbiAgICAvLyBDb2xvciB0aGUgbGluayBzaW1pbGFybHlcbiAgICB0aGlzLmNob29zZXJUYXJnZXQgPSBldnQudGFyZ2V0O1xuICAgIHRoaXMuY2hvb3NlclRhcmdldC5jbGFzc0xpc3QuYWRkKCdhcy1tZW51LWhlYWRlcicpO1xufVxuXG5mdW5jdGlvbiBkZXRhY2hDaG9vc2VyKCkgeyAvLyBtdXN0IGJlIGNhbGxlZCB3aXRoIGNvbnRleHRcbiAgICB2YXIgY2hvb3NlciA9IHRoaXMuY2hvb3NlcjtcbiAgICBpZiAoY2hvb3Nlcikge1xuICAgICAgICB0aGlzLmVsLnJlbW92ZUNoaWxkKGNob29zZXIpO1xuICAgICAgICB0aGlzLmNob29zZXJUYXJnZXQuY2xhc3NMaXN0LnJlbW92ZSgnYXMtbWVudS1oZWFkZXInKTtcblxuICAgICAgICBjaG9vc2VyLm9uY2xpY2sgPSBjaG9vc2VyLm9ubW91c2VvdXQgPSBudWxsO1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmRldGFjaENob29zZXIpO1xuXG4gICAgICAgIGRlbGV0ZSB0aGlzLmRldGFjaENob29zZXI7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmNob29zZXI7XG4gICAgfVxufVxuXG53aW5kb3cuRmlsdGVyVHJlZSA9IEZpbHRlclRyZWU7XG4iLCIvKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cbi8qIGVzbGludC1kaXNhYmxlIGtleS1zcGFjaW5nICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEZpbHRlck5vZGUgPSByZXF1aXJlKCcuL0ZpbHRlck5vZGUnKTtcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKTtcbnZhciBvcGVyYXRvcnMgPSByZXF1aXJlKCcuL2xlYWYtb3BlcmF0b3JzJyk7XG5cblxuLyoqIEB0eXBlZGVmIHtvYmplY3R9IGNvbnZlcnRlclxuICogQHByb3BlcnR5IHtmdW5jdGlvbn0gdG8gLSBSZXR1cm5zIGlucHV0IHZhbHVlIGNvbnZlcnRlZCB0byB0eXBlLiBGYWlscyBzaWxlbnRseS5cbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb259IG5vdCAtIFRlc3RzIGlucHV0IHZhbHVlIGFnYWluc3QgdHlwZSwgcmV0dXJuaW5nIGBmYWxzZSBpZiB0eXBlIG9yIGB0cnVlYCBpZiBub3QgdHlwZS5cbiAqL1xuLyoqIEB0eXBlIHtjb252ZXJ0ZXJ9ICovXG52YXIgbnVtYmVyQ29udmVydGVyID0geyB0bzogTnVtYmVyLCBub3Q6IGlzTmFOIH07XG5cbi8qKiBAdHlwZSB7Y29udmVydGVyfSAqL1xudmFyIGRhdGVDb252ZXJ0ZXIgPSB7IHRvOiBmdW5jdGlvbihzKSB7IHJldHVybiBuZXcgRGF0ZShzKTsgfSwgbm90OiBpc05hTiB9O1xuXG4vKiogQGNvbnN0cnVjdG9yXG4gKiBAc3VtbWFyeSBBIHRlcm1pbmFsIG5vZGUgaW4gYSBmaWx0ZXIgdHJlZSwgcmVwcmVzZW50aW5nIGEgY29uZGl0aW9uYWwgZXhwcmVzc2lvbi5cbiAqIEBkZXNjIEFsc28ga25vd24gYXMgYSBcImZpbHRlci5cIlxuICovXG52YXIgRmlsdGVyTGVhZiA9IEZpbHRlck5vZGUuZXh0ZW5kKCdGaWx0ZXJMZWFmJywge1xuXG4gICAgbmFtZTogJ0NvbXBhcmUgYSBjb2x1bW4gdG8gYSB2YWx1ZScsXG5cbiAgICBvcGVyYXRvcnM6IG9wZXJhdG9ycyxcbiAgICBvcGVyYXRvck9wdGlvbnM6IG9wZXJhdG9ycy5vcHRpb25zLFxuXG4gICAgcG9zdEluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXcuY29sdW1uO1xuICAgICAgICBpZiAoIWVsLnZhbHVlKSB7XG4gICAgICAgICAgICAvLyBGb3IgZW1wdHkgKGkuZS4sIG5ldykgY29udHJvbHMsIHNpbXVsYXRlIGEgY2xpY2sgYSBiZWF0IGFmdGVyIHJlbmRlcmluZ1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgRmlsdGVyTm9kZS5jbGlja0luKGVsKTsgfSwgNzAwKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMudmlldykge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMudmlldykge1xuICAgICAgICAgICAgICAgIHRoaXMudmlld1trZXldLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIHRoaXMub25DaGFuZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKiBAc3VtbWFyeSBDcmVhdGUgYSBuZXcgdmlldyBpbiBgdGhpcy52aWV3YC5cbiAgICAgKiBAZGVzYyBUaGlzIG5ldyBcInZpZXdcIiBpcyBhIGdyb3VwIG9mIEhUTUwgYEVsZW1lbnRgIGNvbnRyb2xzIHRoYXQgY29tcGxldGVseSBkZXNjcmliZSB0aGUgY29uZGl0aW9uYWwgZXhwcmVzc2lvbiB0aGlzIG9iamVjdCByZXByZXNlbnRzLiBUaGlzIG1ldGhvZCBjcmVhdGVzIHRoZSBmb2xsb3dpbmcgb2JqZWN0IHByb3BlcnRpZXM6XG4gICAgICpcbiAgICAgKiAqIGB0aGlzLmVsYCAtIGEgYDxzcGFuPi4uLjwvc3Bhbj5gIGVsZW1lbnQgdG8gY29udGFpbiB0aGUgY29udHJvbHMgYXMgY2hpbGQgbm9kZXNcbiAgICAgKiAqIGB0aGlzLnZpZXdgIC0gYSBoYXNoIGNvbnRhaW5pbmcgZGlyZWN0IHJlZmVyZW5jZXMgdG8gdGhlIGNvbnRyb2xzLlxuICAgICAqXG4gICAgICogVGhlIHZpZXcgZm9yIHRoaXMgYmFzZSBgRmlsdGVyTGVhZmAgb2JqZWN0IGNvbnNpc3RzIG9mIHRoZSBmb2xsb3dpbmcgY29udHJvbHM6XG4gICAgICpcbiAgICAgKiAqIGB0aGlzLnZpZXcuY29sdW1uYCAtIEEgZHJvcC1kb3duIHdpdGggb3B0aW9ucyBmcm9tIGB0aGlzLmZpZWxkc2AuIFZhbHVlIGlzIHRoZSBuYW1lIG9mIHRoZSBjb2x1bW4gYmVpbmcgdGVzdGVkIChpLmUuLCB0aGUgY29sdW1uIHRvIHdoaWNoIHRoaXMgY29uZGl0aW9uYWwgZXhwcmVzc2lvbiBhcHBsaWVzKS5cbiAgICAgKiAqIGB0aGlzLnZpZXcub3BlcmF0b3JgIC0gQSBkcm9wLWRvd24gd2l0aCBvcHRpb25zIGZyb20ge0BsaW5rIGxlYWZPcGVyYXRvcnN9LiBWYWx1ZSBpcyBvbmUgb2YgdGhlIGtleXMgdGhlcmVpbi5cbiAgICAgKiAqIGB0aGlzLnZpZXcubGl0ZXJhbGAgLSBBIHRleHQgYm94LlxuICAgICAqXG4gICAgICogID4gUHJvdG90eXBlcyBleHRlbmRlZCBmcm9tIGBGaWx0ZXJMZWFmYCBtYXkgaGF2ZSBkaWZmZXJlbnQgY29udHJvbHMgYXMgbmVlZGVkLiBUaGUgb25seSByZXF1aXJlZCBjb250cm9sIGlzIGBjb2x1bW5gLCB3aGljaCBhbGwgc3VjaCBcImVkaXRvcnNcIiBtdXN0IHN1cHBvcnQuXG4gICAgICovXG4gICAgY3JlYXRlVmlldzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBmaWVsZHMgPSB0aGlzLnBhcmVudC5ub2RlRmllbGRzIHx8IHRoaXMuZmllbGRzO1xuXG4gICAgICAgIGlmICghZmllbGRzKSB7XG4gICAgICAgICAgICB0aHJvdyBGaWx0ZXJOb2RlLkVycm9yKCdUZXJtaW5hbCBub2RlIHJlcXVpcmVzIGEgZmllbGRzIGxpc3QuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcm9vdCA9IHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIHJvb3QuY2xhc3NOYW1lID0gJ2ZpbHRlci10cmVlLWRlZmF1bHQnO1xuXG4gICAgICAgIHRoaXMudmlldyA9IHtcbiAgICAgICAgICAgIGNvbHVtbjogdGhpcy5tYWtlRWxlbWVudChyb290LCBmaWVsZHMsICdjb2x1bW4nLCB0cnVlKSxcbiAgICAgICAgICAgIG9wZXJhdG9yOiB0aGlzLm1ha2VFbGVtZW50KHJvb3QsIHRoaXMub3BlcmF0b3JPcHRpb25zLCAnb3BlcmF0b3InKSxcbiAgICAgICAgICAgIGxpdGVyYWw6IHRoaXMubWFrZUVsZW1lbnQocm9vdClcbiAgICAgICAgfTtcblxuICAgICAgICByb290LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2JyJykpO1xuICAgIH0sXG5cbiAgICAvKiogQHR5cGVkZWYge29iamVjdH0gdmFsdWVPcHRpb25cbiAgICAgKiBZb3Ugc2hvdWxkIHN1cHBseSBib3RoIGBuYW1lYCBhbmQgYGFsaWFzYCBidXQgeW91IGNvdWxkIG9taXQgb25lIG9yIHRoZSBvdGhlciBhbmQgd2hpY2hldmVyIHlvdSBwcm92aWRlIHdpbGwgYmUgdXNlZCBmb3IgYm90aC4gKEluIHN1Y2ggY2FzZSB5b3UgbWlnaHQgYXMgd2VsbCBqdXN0IGdpdmUgYSBzdHJpbmcgZm9yIHtAbGluayBmaWVsZE9wdGlvbn0gcmF0aGVyIHRoYW4gdGhpcyBvYmplY3QuKVxuICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbbmFtZV1cbiAgICAgKiBAcHJvcGVydHkge3N0cmluZ30gW2FsaWFzXVxuICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbdHlwZV0gT25lIG9mIHRoZSBrZXlzIG9mIGB0aGlzLmNvbnZlcnRlcnNgLiBJZiBub3Qgb25lIG9mIHRoZXNlIChpbmNsdWRpbmcgYHVuZGVmaW5lZGApLCBmaWVsZCB2YWx1ZXMgd2lsbCBiZSB0ZXN0ZWQgd2l0aCBhIHN0cmluZyBjb21wYXJpc29uLlxuICAgICAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2hpZGRlbj1mYWxzZV1cbiAgICAgKi9cbiAgICAvKiogQHR5cGVkZWYge29iamVjdH0gb3B0aW9uR3JvdXBcbiAgICAgKiBAcHJvcGVydHkge3N0cmluZ30gbGFiZWxcbiAgICAgKiBAcHJvcGVydHkge2ZpZWxkT3B0aW9uW119IG9wdGlvbnNcbiAgICAgKi9cbiAgICAvKiogQHR5cGVkZWYge3N0cmluZ3x2YWx1ZU9wdGlvbnxvcHRpb25Hcm91cH0gZmllbGRPcHRpb25cbiAgICAgKiBUaGUgdGhyZWUgcG9zc2libGUgdHlwZXMgc3BlY2lmeSBlaXRoZXIgYW4gYDxvcHRpb24+Li4uLjwvb3B0aW9uPmAgZWxlbWVudCBvciBhbiBgPG9wdGdyb3VwPi4uLi48L29wdGdyb3VwPmAgZWxlbWVudCBhcyBmb2xsb3dzOlxuICAgICAqICogYHN0cmluZ2AgLSBzcGVjaWZpZXMgb25seSB0aGUgdGV4dCBvZiBhbiBgPG9wdGlvbj4uLi4uPC9vcHRpb24+YCBlbGVtZW50ICh0aGUgdmFsdWUgbmF0dXJhbGx5IGRlZmF1bHRzIHRvIHRoZSB0ZXh0KVxuICAgICAqICoge0BsaW5rIHZhbHVlT3B0aW9ufSAtIHNwZWNpZmllcyBib3RoIHRoZSB0ZXh0IChgLm5hbWVgKSBhbmQgdGhlIHZhbHVlIChgLmFsaWFzYCkgb2YgYW4gYDxvcHRpb24uLi4uPC9vcHRpb24+YCBlbGVtZW50XG4gICAgICogKiB7QGxpbmsgb3B0aW9uR3JvdXB9IC0gc3BlY2lmaWVzIGFuIGA8b3B0Z3JvdXA+Li4uLjwvb3B0Z3JvdXA+YCBlbGVtZW50XG4gICAgICovXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgSFRNTCBmb3JtIGNvbnRyb2xzIGZhY3RvcnkuXG4gICAgICogQGRlc2MgQ3JlYXRlcyBhbmQgYXBwZW5kcyBhIHRleHQgYm94IG9yIGEgZHJvcC1kb3duLlxuICAgICAqIEByZXR1cm5zIFRoZSBuZXcgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge0VsZW1lbnR9IGNvbnRhaW5lciAtIEFuIGVsZW1lbnQgdG8gd2hpY2ggdG8gYXBwZW5kIHRoZSBuZXcgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge2ZpZWxkT3B0aW9uW119IFtvcHRpb25zXSAtIE92ZXJsb2FkczpcbiAgICAgKiAqIElmIG9taXR0ZWQsIHdpbGwgY3JlYXRlIGFuIGA8aW5wdXQvPmAgKHRleHQgYm94KSBlbGVtZW50LlxuICAgICAqICogSWYgY29udGFpbnMgb25seSBhIHNpbmdsZSBvcHRpb24sIHdpbGwgY3JlYXRlIGEgYDxzcGFuPi4uLjwvc3Bhbj5gIGVsZW1lbnQgY29udGFpbmluZyB0aGUgc3RyaW5nIGFuZCBhIGA8aW5wdXQgdHlwZT1oaWRkZW4+YCBjb250YWluaW5nIHRoZSB2YWx1ZS5cbiAgICAgKiAqIE90aGVyd2lzZSwgY3JlYXRlcyBhIGA8c2VsZWN0Pi4uLjwvc2VsZWN0PmAgZWxlbWVudCB3aXRoIHRoZXNlIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtudWxsfHN0cmluZ30gW3Byb21wdD0nJ10gLSBBZGRzIGFuIGluaXRpYWwgYDxvcHRpb24+Li4uPC9vcHRpb24+YCBlbGVtZW50IHRvIHRoZSBkcm9wLWRvd24gd2l0aCB0aGlzIHZhbHVlLCBwYXJlbnRoZXNpemVkLCBhcyBpdHMgYHRleHRgOyBhbmQgZW1wdHkgc3RyaW5nIGFzIGl0cyBgdmFsdWVgLiBPbWl0dGluZyBjcmVhdGVzIGEgYmxhbmsgcHJvbXB0OyBgbnVsbGAgc3VwcHJlc3Nlcy5cbiAgICAgKi9cbiAgICBtYWtlRWxlbWVudDogZnVuY3Rpb24oY29udGFpbmVyLCBvcHRpb25zLCBwcm9tcHQsIHNvcnQpIHtcbiAgICAgICAgdmFyIGVsLCBvcHRpb24sIHNwYW4sXG4gICAgICAgICAgICB0YWdOYW1lID0gb3B0aW9ucyA/ICdzZWxlY3QnIDogJ2lucHV0JztcblxuICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgLy8gaGFyZCB0ZXh0IHdoZW4gdGhlcmUgd291bGQgYmUgb25seSAxIG9wdGlvbiBpbiB0aGUgZHJvcGRvd25cbiAgICAgICAgICAgIG9wdGlvbiA9IG9wdGlvbnNbMF07XG5cbiAgICAgICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgIGVsLnR5cGUgPSAnaGlkZGVuJztcbiAgICAgICAgICAgIGVsLnZhbHVlID0gb3B0aW9uLm5hbWUgfHwgb3B0aW9uLmFsaWFzIHx8IG9wdGlvbjtcblxuICAgICAgICAgICAgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHNwYW4uaW5uZXJIVE1MID0gb3B0aW9uLmFsaWFzIHx8IG9wdGlvbi5uYW1lIHx8IG9wdGlvbjtcbiAgICAgICAgICAgIHNwYW4uYXBwZW5kQ2hpbGQoZWwpO1xuXG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbCA9IGFkZE9wdGlvbnModGFnTmFtZSwgb3B0aW9ucywgcHJvbXB0LCBzb3J0KTtcbiAgICAgICAgICAgIGlmIChlbC50eXBlID09PSAndGV4dCcgJiYgdGhpcy5ldmVudEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdGhpcy5ldmVudEhhbmRsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLm9uQ2hhbmdlID0gdGhpcy5vbkNoYW5nZSB8fCBjbGVhblVwQW5kTW92ZU9uLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgRmlsdGVyTm9kZS5zZXRXYXJuaW5nQ2xhc3MoZWwpO1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9LFxuXG4gICAgbG9hZFN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHN0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSwgZWwsIGksIGIsIHNlbGVjdGVkLCBub3RlcyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gJ2ZpZWxkcycgJiYga2V5ICE9PSAnZWRpdG9yJykge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YXRlW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGVsID0gdGhpcy52aWV3W2tleV07XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZWwudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbbmFtZT1cXCcnICsgZWwubmFtZSArICdcXCddJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGVsLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsW2ldLmNoZWNrZWQgPSB2YWx1ZS5pbmRleE9mKGVsW2ldLnZhbHVlKSA+PSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwgPSBlbC5vcHRpb25zO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIGIgPSBmYWxzZTsgaSA8IGVsLmxlbmd0aDsgaSsrLCBiID0gYiB8fCBzZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCA9IHZhbHVlLmluZGV4T2YoZWxbaV0udmFsdWUpID49IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsW2ldLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZpbHRlck5vZGUuc2V0V2FybmluZ0NsYXNzKGVsLCBiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIUZpbHRlck5vZGUuc2V0V2FybmluZ0NsYXNzKGVsKSAmJiBlbC52YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm90ZXMucHVzaCh7IGtleToga2V5LCB2YWx1ZTogdmFsdWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5vdGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IG5vdGVzLmxlbmd0aCA+IDEsXG4gICAgICAgICAgICAgICAgICAgIGZvb3Rub3RlcyA9IHRlbXBsYXRlKG11bHRpcGxlID8gJ25vdGVzJyA6ICdub3RlJyksXG4gICAgICAgICAgICAgICAgICAgIGlubmVyID0gZm9vdG5vdGVzLmxhc3RFbGVtZW50Q2hpbGQ7XG4gICAgICAgICAgICAgICAgbm90ZXMuZm9yRWFjaChmdW5jdGlvbihub3RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmb290bm90ZSA9IG11bHRpcGxlID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKSA6IGlubmVyO1xuICAgICAgICAgICAgICAgICAgICBub3RlID0gdGVtcGxhdGUoJ29wdGlvbk1pc3NpbmcnLCBub3RlLmtleSwgbm90ZS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChub3RlLmxlbmd0aCkgeyBmb290bm90ZS5hcHBlbmRDaGlsZChub3RlWzBdKTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHsgaW5uZXIuYXBwZW5kQ2hpbGQoZm9vdG5vdGUpOyB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoZm9vdG5vdGVzLCBlbC5wYXJlbnROb2RlLmxhc3RFbGVtZW50Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwcm9wZXJ0eSB7Y29udmVydGVyfSBudW1iZXJcbiAgICAgKiBAcHJvcGVydHkge2NvbnZlcnRlcn0gZGF0ZVxuICAgICAqL1xuICAgIGNvbnZlcnRlcnM6IHtcbiAgICAgICAgbnVtYmVyOiBudW1iZXJDb252ZXJ0ZXIsXG4gICAgICAgIGludDogbnVtYmVyQ29udmVydGVyLCAvLyBwc2V1ZG8tdHlwZTogcmVhbGx5IGp1c3QgYSBOdW1iZXJcbiAgICAgICAgZmxvYXQ6IG51bWJlckNvbnZlcnRlciwgLy8gcHNldWRvLXR5cGU6IHJlYWxseSBqdXN0IGEgTnVtYmVyXG4gICAgICAgIGRhdGU6IGRhdGVDb252ZXJ0ZXJcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGhyb3dzIGVycm9yIGlmIGludmFsaWQgZXhwcmVzc2lvbi5cbiAgICAgKiBDYXVnaHQgYnkge0BsaW5rIEZpbHRlclRyZWUjdmFsaWRhdGV8RmlsdGVyVHJlZS5wcm90b3R5cGUudmFsaWRhdGUoKX0uXG4gICAgICpcbiAgICAgKiBBbHNvIHBlcmZvcm1zIHRoZSBmb2xsb3dpbmcgY29tcGlsYXRpb24gYWN0aW9uczpcbiAgICAgKiAqIENvcGllcyBhbGwgYHRoaXMudmlld2AnIHZhbHVlcyBmcm9tIHRoZSBET00gdG8gc2ltaWxhcmx5IG5hbWVkIHByb3BlcnRpZXMgb2YgYHRoaXNgLlxuICAgICAqICogUHJlLXNldHMgYHRoaXMub3BgIGFuZCBgdGhpcy5jb252ZXJ0ZXJgIGZvciB1c2UgaW4gYHRlc3RgJ3MgdHJlZSB3YWxrLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5mb2N1cz1mYWxzZV0gLSBNb3ZlIGZvY3VzIHRvIG9mZmVuZGluZyBjb250cm9sLlxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9IGlmIHZhbGlkXG4gICAgICovXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGVsZW1lbnROYW1lLCBmaWVsZHMsIGZpZWxkO1xuXG4gICAgICAgIGZvciAoZWxlbWVudE5hbWUgaW4gdGhpcy52aWV3KSB7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXdbZWxlbWVudE5hbWVdLFxuICAgICAgICAgICAgICAgIHZhbHVlID0gY29udHJvbFZhbHVlKGVsKS50cmltKCk7XG5cbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm9jdXMgPSBvcHRpb25zICYmIG9wdGlvbnMuZm9jdXM7XG4gICAgICAgICAgICAgICAgaWYgKGZvY3VzIHx8IGZvY3VzID09PSB1bmRlZmluZWQpIHsgY2xpY2tJbihlbCk7IH1cbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRmlsdGVyTm9kZS5FcnJvcignQmxhbmsgJyArIGVsZW1lbnROYW1lICsgJyBjb250cm9sLlxcbkNvbXBsZXRlIHRoZSBmaWx0ZXIgb3IgZGVsZXRlIGl0LicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDb3B5IGVhY2ggY29udHJvbHMncyB2YWx1ZSBhcyBhIG5ldyBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgb2YgdGhpcyBvYmplY3QuXG4gICAgICAgICAgICAgICAgdGhpc1tlbGVtZW50TmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMub3AgPSB0aGlzLm9wZXJhdG9yc1t0aGlzLm9wZXJhdG9yXTtcblxuICAgICAgICB0aGlzLmNvbnZlcnRlciA9IHVuZGVmaW5lZDsgLy8gcmVtYWlucyB1bmRlZmluZWQgd2hlbiBuZWl0aGVyIG9wZXJhdG9yIG5vciBjb2x1bW4gaXMgdHlwZWRcbiAgICAgICAgaWYgKHRoaXMub3AudHlwZSkge1xuICAgICAgICAgICAgdGhpcy5jb252ZXJ0ZXIgPSB0aGlzLmNvbnZlcnRlcnNbdGhpcy5vcC50eXBlXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoZWxlbWVudE5hbWUgaW4gdGhpcy52aWV3KSB7XG4gICAgICAgICAgICAgICAgaWYgKC9eY29sdW1uLy50ZXN0KGVsZW1lbnROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBmaWVsZHMgPSB0aGlzLnBhcmVudC5ub2RlRmllbGRzIHx8IHRoaXMuZmllbGRzO1xuICAgICAgICAgICAgICAgICAgICBmaWVsZCA9IGZpbmRGaWVsZChmaWVsZHMsIHRoaXNbZWxlbWVudE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkICYmIGZpZWxkLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29udmVydGVyID0gdGhpcy5jb252ZXJ0ZXJzW2ZpZWxkLnR5cGVdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIHA6IGZ1bmN0aW9uKGRhdGFSb3cpIHsgcmV0dXJuIGRhdGFSb3dbdGhpcy5jb2x1bW5dOyB9LFxuICAgIHE6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5saXRlcmFsOyB9LFxuXG4gICAgdGVzdDogZnVuY3Rpb24oZGF0YVJvdykge1xuICAgICAgICB2YXIgcCwgcSwgLy8gdW50eXBlZCB2ZXJzaW9ucyBvZiBhcmdzXG4gICAgICAgICAgICBQLCBRLCAvLyB0eXBlZCB2ZXJzaW9ucyBvZiBwIGFuZCBxXG4gICAgICAgICAgICBjb252ZXJ0O1xuXG4gICAgICAgIHJldHVybiAocCA9IHRoaXMucChkYXRhUm93KSkgPT09IHVuZGVmaW5lZCB8fCAocSA9IHRoaXMucShkYXRhUm93KSkgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBmYWxzZVxuICAgICAgICAgICAgOiAoXG4gICAgICAgICAgICAgICAgKGNvbnZlcnQgPSB0aGlzLmNvbnZlcnRlcikgJiZcbiAgICAgICAgICAgICAgICAhY29udmVydC5ub3QoUCA9IGNvbnZlcnQudG8ocCkpICYmXG4gICAgICAgICAgICAgICAgIWNvbnZlcnQubm90KFEgPSBjb252ZXJ0LnRvKHEpKVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgID8gdGhpcy5vcC50ZXN0KFAsIFEpXG4gICAgICAgICAgICAgICAgOiB0aGlzLm9wLnRlc3QocCwgcSk7XG4gICAgfSxcblxuICAgIC8qKiBUZXN0cyB0aGlzIGxlYWYgbm9kZSBmb3IgZ2l2ZW4gY29sdW1uIG5hbWUuXG4gICAgICogPiBUaGlzIGlzIHRoZSBkZWZhdWx0IFwiZmluZFwiIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWVcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmaW5kOiBmdW5jdGlvbihmaWVsZE5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sdW1uID09PSBmaWVsZE5hbWU7XG4gICAgfSxcblxuICAgIC8qKiBUZXN0cyB0aGlzIGxlYWYgbm9kZSBmb3IgZ2l2ZW4gY29sdW1uIGBFbGVtZW50YCBvd25lcnNoaXAuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gRWRpdG9yIChsZWFmIGNvbnN0cnVjdG9yKVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZpbmRCeUVsOiBmdW5jdGlvbihlbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5lbCA9PT0gZWw7XG4gICAgfSxcblxuICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGF0ZSA9IHt9O1xuICAgICAgICBpZiAodGhpcy5lZGl0b3IpIHtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgIHN0YXRlW2tleV0gPSB0aGlzW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnBhcmVudC5ub2RlRmllbGRzICYmIHRoaXMuZmllbGRzICE9PSB0aGlzLnBhcmVudC5maWVsZHMpIHtcbiAgICAgICAgICAgIHN0YXRlLmZpZWxkcyA9IHRoaXMuZmllbGRzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9LFxuXG4gICAgZ2V0U3FsV2hlcmVDbGF1c2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcC5zcWwodGhpcy5jb2x1bW4sIHRoaXMubGl0ZXJhbCk7XG4gICAgfVxufSk7XG5cbmZ1bmN0aW9uIGZpbmRGaWVsZChmaWVsZHMsIG5hbWUpIHtcbiAgICB2YXIgY29tcGxleCwgc2ltcGxlO1xuXG4gICAgc2ltcGxlID0gZmllbGRzLmZpbmQoZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgaWYgKChmaWVsZC5vcHRpb25zIHx8IGZpZWxkKSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICByZXR1cm4gKGNvbXBsZXggPSBmaW5kRmllbGQoZmllbGQub3B0aW9ucyB8fCBmaWVsZCwgbmFtZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZpZWxkLm5hbWUgPT09IG5hbWU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBjb21wbGV4IHx8IHNpbXBsZTtcbn1cblxuLyoqIGBjaGFuZ2VgIG9yIGBjbGlja2AgZXZlbnQgaGFuZGxlciBmb3IgYWxsIGZvcm0gY29udHJvbHMuXG4gKiBSZW1vdmVzIGVycm9yIENTUyBjbGFzcyBmcm9tIGNvbnRyb2wuXG4gKiBBZGRzIHdhcm5pbmcgQ1NTIGNsYXNzIGZyb20gY29udHJvbCBpZiBibGFuazsgcmVtb3ZlcyBpZiBub3QgYmxhbmsuXG4gKiBNb3ZlcyBmb2N1cyB0byBuZXh0IG5vbi1ibGFuayBzaWJsaW5nIGNvbnRyb2wuXG4gKi9cbmZ1bmN0aW9uIGNsZWFuVXBBbmRNb3ZlT24oZXZ0KSB7XG4gICAgdmFyIGVsID0gZXZ0LnRhcmdldDtcblxuICAgIC8vIHJlbW92ZSBgZXJyb3JgIENTUyBjbGFzcywgd2hpY2ggbWF5IGhhdmUgYmVlbiBhZGRlZCBieSBgRmlsdGVyTGVhZi5wcm90b3R5cGUudmFsaWRhdGVgXG4gICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnZmlsdGVyLXRyZWUtZXJyb3InKTtcblxuICAgIC8vIHNldCBvciByZW1vdmUgJ3dhcm5pbmcnIENTUyBjbGFzcywgYXMgcGVyIGVsLnZhbHVlXG4gICAgRmlsdGVyTm9kZS5zZXRXYXJuaW5nQ2xhc3MoZWwpO1xuXG4gICAgaWYgKGVsLnZhbHVlKSB7XG4gICAgICAgIC8vIGZpbmQgbmV4dCBzaWJsaW5nIGNvbnRyb2wsIGlmIGFueVxuICAgICAgICBpZiAoIWVsLm11bHRpcGxlKSB7XG4gICAgICAgICAgICB3aGlsZSAoKGVsID0gZWwubmV4dEVsZW1lbnRTaWJsaW5nKSAmJiAoISgnbmFtZScgaW4gZWwpIHx8IGVsLnZhbHVlLnRyaW0oKSAhPT0gJycpKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjdXJseVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gYW5kIGNsaWNrIGluIGl0IChvcGVucyBzZWxlY3QgbGlzdClcbiAgICAgICAgaWYgKGVsICYmIGVsLnZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIGVsLnZhbHVlID0gJyc7IC8vIHJpZCBvZiBhbnkgd2hpdGUgc3BhY2VcbiAgICAgICAgICAgIEZpbHRlck5vZGUuY2xpY2tJbihlbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5ldmVudEhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5ldmVudEhhbmRsZXIoZXZ0KTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNsaWNrSW4oZWwpIHtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBlbC5jbGFzc0xpc3QuYWRkKCdmaWx0ZXItdHJlZS1lcnJvcicpO1xuICAgICAgICBGaWx0ZXJOb2RlLmNsaWNrSW4oZWwpO1xuICAgIH0sIDApO1xufVxuXG5mdW5jdGlvbiBjb250cm9sVmFsdWUoZWwpIHtcbiAgICB2YXIgdmFsdWUsIGk7XG5cbiAgICBzd2l0Y2ggKGVsLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W25hbWU9XFwnJyArIGVsLm5hbWUgKyAnXFwnXTplbmFibGVkOmNoZWNrZWQnKTtcbiAgICAgICAgICAgIGZvciAodmFsdWUgPSBbXSwgaSA9IDA7IGkgPCBlbC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhbHVlLnB1c2goZWxbaV0udmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgICAgIGVsID0gZWwub3B0aW9ucztcbiAgICAgICAgICAgIGZvciAodmFsdWUgPSBbXSwgaSA9IDA7IGkgPCBlbC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICghZWwuZGlzYWJsZWQgJiYgZWwuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUucHVzaChlbFtpXS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHZhbHVlID0gZWwudmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEBzdW1tYXJ5IENyZWF0ZXMgYSBuZXcgZWxlbWVudCBhbmQgYWRkcyBvcHRpb25zIHRvIGl0LlxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ05hbWUgLSBNdXN0IGJlIG9uZSBvZjpcbiAqICogYCdpbnB1dCdgIGZvciBhIHRleHQgYm94XG4gKiAqIGAnc2VsZWN0J2AgZm9yIGEgZHJvcC1kb3duXG4gKiAqIGAnb3B0Z3JvdXAnYCAoZm9yIGludGVybmFsIHVzZSBvbmx5KVxuICogQHBhcmFtIHtmaWVsZE9wdGlvbltdfSBbb3B0aW9uc10gLSBTdHJpbmdzIHRvIGFkZCBhcyBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnRzLiBPbWl0IHRvIGNyZWF0ZSBhIHRleHQgYm94LlxuICogQHBhcmFtIHtudWxsfHN0cmluZ30gW3Byb21wdD0nJ10gLSBBZGRzIGFuIGluaXRpYWwgYDxvcHRpb24+Li4uPC9vcHRpb24+YCBlbGVtZW50IHRvIHRoZSBkcm9wLWRvd24gd2l0aCB0aGlzIHZhbHVlIGluIHBhcmVudGhlc2VzIGFzIGl0cyBgdGV4dGA7IGFuZCBlbXB0eSBzdHJpbmcgYXMgaXRzIGB2YWx1ZWAuIE9taXR0aW5nIGNyZWF0ZXMgYSBibGFuayBwcm9tcHQ7IGBudWxsYCBzdXBwcmVzc2VzLlxuICogQHJldHVybnMge0VsZW1lbnR9IEVpdGhlciBhIGA8c2VsZWN0PmAgb3IgYDxvcHRncm91cD5gIGVsZW1lbnQuXG4gKi9cbmZ1bmN0aW9uIGFkZE9wdGlvbnModGFnTmFtZSwgb3B0aW9ucywgcHJvbXB0LCBzb3J0KSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcblxuICAgIGlmIChvcHRpb25zKSB7XG4gICAgICAgIHZhciBhZGQsIG5ld09wdGlvbjtcbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdzZWxlY3QnKSB7XG4gICAgICAgICAgICBhZGQgPSBlbC5hZGQ7XG4gICAgICAgICAgICBpZiAocHJvbXB0KSB7XG4gICAgICAgICAgICAgICAgbmV3T3B0aW9uID0gbmV3IE9wdGlvbignKCcgKyBwcm9tcHQsICcnKTtcbiAgICAgICAgICAgICAgICBuZXdPcHRpb24uaW5uZXJIVE1MICs9ICcmaGVsbGlwOyknO1xuICAgICAgICAgICAgICAgIGVsLmFkZChuZXdPcHRpb24pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9tcHQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBlbC5hZGQobmV3IE9wdGlvbigpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZCA9IGVsLmFwcGVuZENoaWxkO1xuICAgICAgICAgICAgZWwubGFiZWwgPSBwcm9tcHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc29ydCkge1xuICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMuc2xpY2UoKS5zb3J0KGZpZWxkQ29tcGFyYXRvcik7IC8vIGNsb25lIGl0IGFuZCBzb3J0IHRoZSBjbG9uZVxuICAgICAgICB9XG5cbiAgICAgICAgb3B0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKG9wdGlvbikge1xuICAgICAgICAgICAgaWYgKChvcHRpb24ub3B0aW9ucyB8fCBvcHRpb24pIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0Z3JvdXAgPSBhZGRPcHRpb25zKCdvcHRncm91cCcsIG9wdGlvbi5vcHRpb25zIHx8IG9wdGlvbiwgb3B0aW9uLmxhYmVsKTtcbiAgICAgICAgICAgICAgICBlbC5hZGQob3B0Z3JvdXApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3RWxlbWVudCA9IHR5cGVvZiBvcHRpb24gIT09ICdvYmplY3QnXG4gICAgICAgICAgICAgICAgICAgID8gbmV3IE9wdGlvbihvcHRpb24pXG4gICAgICAgICAgICAgICAgICAgIDogbmV3IE9wdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbi5hbGlhcyB8fCBvcHRpb24ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbi5uYW1lIHx8IG9wdGlvbi5hbGlhc1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGFkZC5jYWxsKGVsLCBuZXdFbGVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZWwudHlwZSA9ICd0ZXh0JztcbiAgICB9XG5cbiAgICByZXR1cm4gZWw7XG59XG5cbmZ1bmN0aW9uIGZpZWxkQ29tcGFyYXRvcihhLCBiKSB7XG4gICAgYSA9IGEuYWxpYXMgfHwgYS5uYW1lIHx8IGEubGFiZWwgfHwgYTtcbiAgICBiID0gYi5hbGlhcyB8fCBiLm5hbWUgfHwgYi5sYWJlbCB8fCBiO1xuICAgIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogMDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWx0ZXJMZWFmO1xuIiwiLyogZXNsaW50LWVudiBicm93c2VyICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZC1tZScpO1xudmFyIF8gPSByZXF1aXJlKCdvYmplY3QtaXRlcmF0b3JzJyk7XG52YXIgQmFzZSA9IGV4dGVuZC5CYXNlO1xuXG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJyk7XG5cbmV4dGVuZC5kZWJ1ZyA9IHRydWU7XG5cbnZhciBDSElMRFJFTl9UQUcgPSAnT0wnLFxuICAgIENISUxEX1RBRyA9ICdMSSc7XG5cbnZhciBvcHRpb25zU2NoZW1hID0ge1xuICAgIC8qKiBEZWZhdWx0IGxpc3Qgb2YgZmllbGRzIG9ubHkgZm9yIGRpcmVjdCBjaGlsZCB0ZXJtaW5hbC1ub2RlIGRyb3AtZG93bnMuXG4gICAgICogQHR5cGUge3N0cmluZ1tdfVxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlLnByb3RvdHlwZVxuICAgICAqL1xuICAgIG5vZGVGaWVsZHM6IHsgb3duOiB0cnVlIH0sXG5cbiAgICAvKiogRGVmYXVsdCBsaXN0IG9mIGZpZWxkcyBmb3IgYWxsIGRlc2NlbmRpbmcgdGVybWluYWwtbm9kZSBkcm9wLWRvd25zLlxuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTm9kZS5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBmaWVsZHM6IHt9LFxuXG4gICAgLyoqIFR5cGUgb2YgZmlsdGVyIGVkaXRvci5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGVkaXRvcjoge30sXG5cbiAgICAvKiogRXZlbnQgaGFuZGxlciBmb3IgVUkgZXZlbnRzLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICogQG1lbWJlck9mIEZpbHRlck5vZGUucHJvdG90eXBlXG4gICAgICovXG4gICAgZXZlbnRIYW5kbGVyOiB7fVxufTtcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAZGVzY3JpcHRpb24gQSBmaWx0ZXIgdHJlZSByZXByZXNlbnRzIGEgX2NvbXBsZXggY29uZGl0aW9uYWwgZXhwcmVzc2lvbl8gYW5kIGNvbnNpc3RzIG9mIGEgc2luZ2xlIGBGaWx0ZXJOb2RlYCBvYmplY3Qgc2VydmluZyBhcyB0aGUgX3Jvb3RfIG9mIGFuIF9uXy1hcnkgdHJlZS5cbiAqXG4gKiBFYWNoIGBGaWx0ZXJOb2RlYCByZXByZXNlbnRzIGEgbm9kZSBpbiB0cmVlLiBFYWNoIG5vZGUgaXMgb25lIG9mIHR3byB0eXBlcyBvZiBvYmplY3RzIGV4dGVuZGVkIGZyb20gYEZpbHRlck5vZGVgOlxuICpcbiAqICogVGhlIG5vbi10ZXJtaW5hbCAoQGxpbmsgRmlsdGVyVHJlZX0gbm9kZXMgcmVwcmVzZW50IF9jb21wbGV4IHN1YmV4cHJlc3Npb25zXywgZWFjaCBjb25zaXN0aW5nIG9mIHR3byBvciBtb3JlIF9jb25kaXRpb25hbF8gKGJvb2xlYW4gZXhwcmVzc2lvbnMpLCBhbGwgY29uY2F0ZW5hdGVkIHRvZ2V0aGVyIHdpdGggb25lIG9mIHRoZSBfdHJlZSBvcGVyYXRvcnNfLlxuICogKiBUaGUgdGVybWluYWwge0BsaW5rIEZpbHRlckxlYWZ9IG5vZGVzIHJlcHJlc2VudCBfc2ltcGxlIGV4cHJlc3Npb25zXy5cbiAqXG4gKiBUcmVlIG9wZXJhdG9ycyBjdXJyZW50bHkgaW5jbHVkZSAqKl9BTkRfKiogKGxhYmVsZWQgXCJhbGxcIiBpbiB0aGUgVUk7IGFuZCBcIm9wLWFuZFwiIGludGVybmFsbHkpLCAqKl9PUl8qKiAoXCJhbnlcIjsgXCJvcC1vclwiKSwgYW5kICoqX05PUl8qKiAoXCJub25lXCI7IFwib3Atbm9yXCIpLlxuICpcbiAqIEVhY2ggY29uZGl0aW9uYWwgaW4gYSBfc3ViZXhwcmVzc2lvbl8gKG5vbi10ZXJtaW5hbCBub2RlKSBpcyByZXByZXNlbnRlZCBieSBhIGNoaWxkIG5vZGUgd2hpY2ggbWF5IGJlIGVpdGhlciBhIF9zaW1wbGUgZXhwcmVzc2lvbl8gKHRlcm1pbmFsIG5vZGUpIG9yIGFub3RoZXIgKFwibmVzdGVkXCIpIHN1YmV4cHJlc3Npb24gbm9uLXRlcm1pbmFsIG5vZGUuXG4gKlxuICogVGhlIGBGaWx0ZXJMZWFmYCBvYmplY3QgaXMgdGhlIGRlZmF1bHQgdHlwZSBvZiBzaW1wbGUgZXhwcmVzc2lvbiwgd2hpY2ggaXMgaW4gdGhlIGZvcm0gX2ZpZWxkLXByb3BlcnR5IG9wZXJhdG9yLXByb3BlcnR5IGFyZ3VtZW50LXByb3BlcnR5XyB3aGVyZTpcbiAqXG4gKiAqIF9maWVsZC1wcm9wZXJ0eV8gLSB0aGUgbmFtZSBvZiBhIGNvbHVtbiwgc2VsZWN0ZWQgZnJvbSBhIGRyb3AtZG93bjtcbiAqICogX29wZXJhdG9yLXByb3BlcnR5XyAtIGFuIGVxdWFsaXR5ICg9KSwgaW5lcXVhbGl0eSAoPCwg4omkLCDiiaAsIOKJpSwgPiksIG9yIHBhdHRlcm4gb3BlcmF0b3IgKExJS0UsIE5PVCBMSUtFKSwgYWxzbyBzZWxlY3RlZCBmcm9tIGEgZHJvcC1kb3duOyBhbmRcbiAqICogX2FyZ3VtZW50LXByb3BlcnR5XyBpcyBhIGNvbnN0YW50IHR5cGVkIGludG8gYSB0ZXh0IGJveC5cbiAqXG4gKiBUaGUgYEZpbHRlclRyZWVgIG9iamVjdCBoYXMgcG9seW1vcnBoaWMgbWV0aG9kcyB0aGF0IG9wZXJhdGUgb24gdGhlIGVudGlyZSB0cmVlIHVzaW5nIHJlY3Vyc2lvbi4gV2hlbiB0aGUgcmVjdXJzaW9uIHJlYWNoZXMgYSB0ZXJtaW5hbCBub2RlLCBpdCBjYWxscyB0aGUgbWV0aG9kcyBvbiB0aGUgYEZpbHRlckxlYWZgIG9iamVjdCBpbnN0ZWFkLiBDYWxsaW5nIGB0ZXN0KClgIG9uIHRoZSByb290IHRyZWUgdGhlcmVmb3JlIHJldHVybnMgYSBib29sZWFuIHRoYXQgZGV0ZXJtaW5lcyBpZiB0aGUgcm93IHBhc3NlcyB0aHJvdWdoIHRoZSBlbnRpcmUgZmlsdGVyIGV4cHJlc3Npb24gKGB0cnVlYCkgb3IgaXMgYmxvY2tlZCBieSBpdCAoYGZhbHNlYCkuXG4gKlxuICogVGhlIHByb2dyYW1tZXIgbWF5IGRlZmluZSBhIG5ldyB0eXBlIG9mIHNpbXBsZSBleHByZXNzaW9uIGJ5IGV4dGVuZGluZyBmcm9tIGBGaWx0ZXJMZWFmYC4gQW4gZXhhbXBsZSBpcyB0aGUgYEZpbHRlckZpZWxkYCBvYmplY3QuIFN1Y2ggYW4gaW1wbGVtZW50YXRpb24gbXVzdCBpbmNsdWRlIG1ldGhvZHM6XG4gKlxuICogKiBTYXZlIGFuZCBzdWJzZXF1ZW50bHkgcmVsb2FkIHRoZSBzdGF0ZSBvZiB0aGUgY29uZGl0aW9uYWwgYXMgZW50ZXJlZCBieSB0aGUgdXNlciAoYHRvSlNPTigpYCBhbmQgYHNldFN0YXRlKClgLCByZXNwZWN0aXZlbHkpLlxuICogKiBDcmVhdGUgdGhlIERPTSBvYmplY3RzIHRoYXQgcmVwcmVzZW50IHRoZSBVSSBmaWx0ZXIgZWRpdG9yIGFuZCByZW5kZXIgdGhlbSB0byB0aGUgVUkgKGBjcmVhdGVWaWV3KClgIGFuZCBgcmVuZGVyKClgLCByZXNwZWN0aXZlbHkpLlxuICogKiBGaWx0ZXIgYSB0YWJsZSBieSBpbXBsZW1lbnRpbmcgb25lIG9yIG1vcmUgb2YgdGhlIGZvbGxvd2luZzpcbiAqICAgKiBBcHBseSB0aGUgY29uZGl0aW9uYWwgbG9naWMgdG8gYXZhaWxhYmxlIHRhYmxlIHJvdyBkYXRhIChgdGVzdCgpYCkuXG4gKiAgICogQXBwbHkgdGhlIGNvbmRpdGlvbmFsIGxvZ2ljIHRvIGEgcmVtb3RlIGRhdGEtc3RvcmUgYnkgZ2VuZXJhdGluZyBhICoqU1FMKiogb3IgKipRKiogX1dIRVJFXyBjbGF1c2UgKGB0b1NRTCgpYCBhbmQgYHRvUSgpYCwgcmVzcGVjdGl2ZWx5KS5cbiAqXG4gKiBTb21lIG9mIHRoZSBhYm92ZS1uYW1lZCBtZXRob2RzIGFzIGFscmVhZHkgaW1wbGVtZW50ZWQgaW4gYEZpbHRlckxlYWZgIGFuZC9vciBgRmlsdGVyTm9kZWAgbWF5IGJlIHN1ZmZpY2llbnQgdG8gaGFuZGxlIHlvdXIgbmVlZHMgYXMgaXMgKHdpdGhvdXQgZnVydGhlciBjb2RlKS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ1tdfSBbb3B0aW9ucy5maWVsZHNdIC0gQSBkZWZhdWx0IGxpc3Qgb2YgY29sdW1uIG5hbWVzIGZvciBmaWVsZCBkcm9wLWRvd25zIG9mIGFsbCBkZXNjZW5kYW50IHRlcm1pbmFsIG5vZGVzLiBPdmVycmlkZXMgYG9wdGlvbnMuc3RhdGUuZmllbGRzYCAoc2VlKS4gTWF5IGJlIGRlZmluZWQgZm9yIGFueSBub2RlIGFuZCBwZXJ0YWlucyB0byBhbGwgZGVzY2VuZGFudHMgb2YgdGhhdCBub2RlIChpbmNsdWRpbmcgdGVybWluYWwgbm9kZXMpLiBJZiBvbWl0dGVkIChhbmQgbm8gYG5vZGVGaWVsZHNgKSwgd2lsbCB1c2UgdGhlIG5lYXJlc3QgYW5jZXN0b3IgYGZpZWxkc2AgZGVmaW5pdGlvbi4gSG93ZXZlciwgZGVzY2VuZGFudHMgd2l0aCB0aGVpciBvd24gZGVmaW5pdGlvbiBvZiBgdHlwZXNgIHdpbGwgb3ZlcnJpZGUgYW55IGFuY2VzdG9yIGRlZmluaXRpb24uXG4gKlxuICogPiBUeXBpY2FsbHkgb25seSB1c2VkIGJ5IHRoZSBjYWxsZXIgZm9yIHRoZSB0b3AtbGV2ZWwgKHJvb3QpIHRyZWUuXG4gKlxuICogQHBhcmFtIHtzdHJpbmdbXX0gW29wdGlvbnMubm9kZUZpZWxkc10gLSBBIGRlZmF1bHQgbGlzdCBvZiBjb2x1bW4gbmFtZXMgZm9yIGZpZWxkIGRyb3AtZG93bnMgb2YgaW1tZWRpYXRlIGRlc2NlbmRhbnQgdGVybWluYWwgbm9kZXMgX29ubHlfLiBPdmVycmlkZXMgYG9wdGlvbnMuc3RhdGUubm9kZUZpZWxkc2AgKHNlZSkuXG4gKlxuICogQWx0aG91Z2ggYm90aCBgb3B0aW9ucy5maWVsZHNgIGFuZCBgb3B0aW9ucy5ub2RlRmllbGRzYCBhcmUgbm90YXRlZCBhcyBvcHRpb25hbCBoZXJlaW4sIGJ5IHRoZSB0aW1lIGEgdGVybWluYWwgbm9kZSB0cmllcyB0byByZW5kZXIgYSBmaWVsZHMgZHJvcC1kb3duLCBhIGBmaWVsZHNgIGxpc3QgX211c3RfIGJlIGRlZmluZWQgdGhyb3VnaCAoaW4gb3JkZXIgb2YgcHJpb3JpdHkpOlxuICpcbiAqICogVGVybWluYWwgbm9kZSdzIG93biBgb3B0aW9ucy5maWVsZHNgIChvciBgb3B0aW9ucy5zdGF0ZS5maWVsZHNgKSBkZWZpbml0aW9uLlxuICogKiBUZXJtaW5hbCBub2RlJ3MgcGFyZW50IG5vZGUncyBgb3B0aW9uLm5vZGVGaWVsZHNgIChvciBgb3B0aW9uLnN0YXRlLm5vZGVzRmllbGRzYCkgZGVmaW5pdGlvbi5cbiAqICogQW55IG9mIHRlcm1pbmFsIG5vZGUncyBhbmNlc3RvcidzIGBvcHRpb25zLmZpZWxkc2AgKG9yIGBvcHRpb25zLnN0YXRlLmZpZWxkc2ApIGRlZmluaXRpb24uXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zLnN0YXRlXSAtIEEgZGF0YSBzdHJ1Y3R1cmUgdGhhdCBkZXNjcmliZXMgYSB0cmVlLCBzdWJ0cmVlLCBvciBsZWFmOlxuICpcbiAqICogTWF5IGRlc2NyaWJlIGEgdGVybWluYWwgbm9kZSB3aXRoIHByb3BlcnRpZXM6XG4gKiAgICogYGZpZWxkc2AgLSBPdmVycmlkZGVuIG9uIGluc3RhbnRpYXRpb24gYnkgYG9wdGlvbnMuZmllbGRzYC4gSWYgYm90aCB1bnNwZWNpZmllZCwgdXNlcyBwYXJlbnQncyBkZWZpbml0aW9uLlxuICogICAqIGBlZGl0b3JgIC0gQSBzdHJpbmcgaWRlbnRpZnlpbmcgdGhlIHR5cGUgb2YgY29uZGl0aW9uYWwuIE11c3QgYmUgaW4gdGhlIHRyZWUncyAoc2VlIHtAbGluayBGaWx0ZXJUcmVlI2VkaXRvcnN8ZWRpdG9yc30pIGhhc2guIElmIG9taXR0ZWQsIGRlZmF1bHRzIHRvIGAnRGVmYXVsdCdgLlxuICogICAqIG1pc2MuIC0gT3RoZXIgcHJvcGVydGllcyBwZWN1bGlhciB0byB0aGlzIGZpbHRlciB0eXBlIChidXQgdHlwaWNhbGx5IGluY2x1ZGluZyBhdCBsZWFzdCBhIGBmaWVsZGAgcHJvcGVydHkpLlxuICogKiBNYXkgZGVzY3JpYmUgYSBub24tdGVybWluYWwgbm9kZSB3aXRoIHByb3BlcnRpZXM6XG4gKiAgICogYGZpZWxkc2AgLSBPdmVycmlkZGVuIG9uIGluc3RhbnRpYXRpb24gYnkgYG9wdGlvbnMuZmllbGRzYC4gSWYgYm90aCB1bnNwZWNpZmllZCwgdXNlcyBwYXJlbnQncyBkZWZpbml0aW9uLlxuICogICAqIGBvcGVyYXRvcmAgLSBPbmUgb2Yge0BsaW5rIHRyZWVPcGVyYXRvcnN9LlxuICogICAqIGBjaGlsZHJlbmAgLSAgQXJyYXkgY29udGFpbmluZyBhZGRpdGlvbmFsIHRlcm1pbmFsIGFuZCBub24tdGVybWluYWwgbm9kZXMuXG4gKlxuICogSWYgdGhpcyBgb3B0aW9ucy5zdGF0ZWAgb2JqZWN0IGlzIG9taXR0ZWQgYWx0b2dldGhlciwgbG9hZHMgYW4gZW1wdHkgZmlsdGVyLCB3aGljaCBpcyBhIGBGaWx0ZXJUcmVlYCBub2RlIGNvbnNpc3RpbmcgdGhlIGRlZmF1bHQgYG9wZXJhdG9yYCB2YWx1ZSAoYCdvcC1hbmQnYCkuXG4gKlxuICogPiBOb3RlIHRoYXQgdGhpcyBpcyBhIEpTT04gb2JqZWN0OyBub3QgYSBKU09OIHN0cmluZyAoX2kuZS4sXyBcInBhcnNlZFwiOyBub3QgXCJzdHJpbmdpZmllZFwiKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBbb3B0aW9ucy5lZGl0b3I9J0RlZmF1bHQnXSAtIFR5cGUgb2Ygc2ltcGxlIGV4cHJlc3Npb24uXG4gKlxuICogQHBhcmFtIHtGaWx0ZXJUcmVlfSBbb3B0aW9ucy5wYXJlbnRdIC0gVXNlZCBpbnRlcm5hbGx5IHRvIGluc2VydCBlbGVtZW50IHdoZW4gY3JlYXRpbmcgbmVzdGVkIHN1YnRyZWVzLiBGb3IgdGhlIHRvcCBsZXZlbCB0cmVlLCB5b3UgZG9uJ3QgZ2l2ZSBhIHZhbHVlIGZvciBgcGFyZW50YDsgeW91IGFyZSByZXNwb25zaWJsZSBmb3IgaW5zZXJ0aW5nIHRoZSB0b3AtbGV2ZWwgYC5lbGAgaW50byB0aGUgRE9NLlxuICovXG52YXIgRmlsdGVyTm9kZSA9IEJhc2UuZXh0ZW5kKHtcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgcGFyZW50ID0gb3B0aW9ucyAmJiBvcHRpb25zLnBhcmVudCxcbiAgICAgICAgICAgIHN0YXRlID0gb3B0aW9ucyAmJiAoXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zdGF0ZSB8fFxuICAgICAgICAgICAgICAgIG9wdGlvbnMuanNvbiAmJiBKU09OLnBhcnNlKG9wdGlvbnMuanNvbilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG5cbiAgICAgICAgLy8gY3JlYXRlIGVhY2ggb3B0aW9uXG4gICAgICAgIF8ob3B0aW9uc1NjaGVtYSkuZWFjaChmdW5jdGlvbihvcHRpb25PcHRpb25zLCBrZXkpIHtcbiAgICAgICAgICAgIHNlbGZba2V5XSA9IChcbiAgICAgICAgICAgICAgICBvcHRpb25zICYmIG9wdGlvbnNba2V5XSB8fFxuICAgICAgICAgICAgICAgIHN0YXRlICYmIHN0YXRlW2tleV0gfHxcbiAgICAgICAgICAgICAgICBwYXJlbnQgJiYgIW9wdGlvbk9wdGlvbnMub3duICYmIHBhcmVudFtrZXldIC8vIHJlZmVyZW5jZSBwYXJlbnQgdmFsdWUgbm93IHNvIHdlIGRvbid0IGhhdmUgdG8gc2VhcmNoIHVwIHRoZSB0cmVlIGxhdGVyXG4gICAgICAgICAgICApO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnNldFN0YXRlKHN0YXRlKTtcbiAgICB9LFxuXG4gICAgLyoqIEluc2VydCBlYWNoIHN1YnRyZWUgaW50byBpdHMgcGFyZW50IG5vZGUgYWxvbmcgd2l0aCBhIFwiZGVsZXRlXCIgYnV0dG9uLlxuICAgICAqID4gVGhlIHJvb3QgdHJlZSBpcyBoYXMgbm8gcGFyZW50IGFuZCBpcyBpbnNlcnRlZCBpbnRvIHRoZSBET00gYnkgdGhlIGluc3RhbnRpYXRpbmcgY29kZSAod2l0aG91dCBhIGRlbGV0ZSBidXR0b24pLlxuICAgICAqL1xuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnBhcmVudCkge1xuICAgICAgICAgICAgdmFyIG5ld0xpc3RJdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChDSElMRF9UQUcpO1xuXG4gICAgICAgICAgICBpZiAoISh0aGlzLnN0YXRlICYmIHRoaXMuc3RhdGUubG9ja2VkKSkge1xuICAgICAgICAgICAgICAgIG5ld0xpc3RJdGVtLmFwcGVuZENoaWxkKHRlbXBsYXRlKCdyZW1vdmVCdXR0b24nKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5ld0xpc3RJdGVtLmFwcGVuZENoaWxkKHRoaXMuZWwpO1xuICAgICAgICAgICAgdGhpcy5wYXJlbnQuZWwucXVlcnlTZWxlY3RvcihDSElMRFJFTl9UQUcpLmFwcGVuZENoaWxkKG5ld0xpc3RJdGVtKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzZXRTdGF0ZTogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgICAgdmFyIG9sZEVsID0gdGhpcy5lbDtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICAgICAgICB0aGlzLmNyZWF0ZVZpZXcoKTtcbiAgICAgICAgdGhpcy5sb2FkU3RhdGUoKTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgaWYgKG9sZEVsICYmICF0aGlzLnBhcmVudCkge1xuICAgICAgICAgICAgb2xkRWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodGhpcy5lbCwgb2xkRWwpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHRvSlNPTjogZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICB2YXIgc3RhdGUgPSB7fTtcblxuICAgICAgICBpZiAodGhpcy50b0pzb25PcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgdHJlZSA9IHRoaXMsIG1ldGFkYXRhID0gW107XG4gICAgICAgICAgICBpZiAodGhpcy50b0pzb25PcHRpb25zLmZpZWxkcykge1xuICAgICAgICAgICAgICAgIG1ldGFkYXRhLnB1c2goJ2ZpZWxkcycpO1xuICAgICAgICAgICAgICAgIG1ldGFkYXRhLnB1c2goJ25vZGVGaWVsZHMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnRvSnNvbk9wdGlvbnMuZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgbWV0YWRhdGEucHVzaCgnZWRpdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtZXRhZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRyZWUucGFyZW50IHx8IHRyZWVbcHJvcF0gJiYgdHJlZVtwcm9wXSAhPT0gdHJlZS5wYXJlbnRbcHJvcF0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVbcHJvcF0gPSB0cmVlW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH0sXG5cbiAgICBTUUxfUVVPVEVEX0lERU5USUZJRVI6ICdcIidcblxufSk7XG5cbkZpbHRlck5vZGUuc2V0V2FybmluZ0NsYXNzID0gZnVuY3Rpb24oZWwsIHZhbHVlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAgIHZhbHVlID0gZWwudmFsdWU7XG4gICAgfVxuICAgIGVsLmNsYXNzTGlzdFt2YWx1ZSA/ICdyZW1vdmUnIDogJ2FkZCddKCdmaWx0ZXItdHJlZS13YXJuaW5nJyk7XG4gICAgcmV0dXJuIHZhbHVlO1xuXG59O1xuXG5GaWx0ZXJOb2RlLkVycm9yID0gZnVuY3Rpb24obXNnKSB7XG4gICAgcmV0dXJuIG5ldyBFcnJvcignZmlsdGVyLXRyZWU6ICcgKyBtc2cpO1xufTtcblxuRmlsdGVyTm9kZS5jbGlja0luID0gZnVuY3Rpb24oZWwpIHtcbiAgICBpZiAoZWwpIHtcbiAgICAgICAgaWYgKGVsLnRhZ05hbWUgPT09ICdTRUxFQ1QnKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBlbC5kaXNwYXRjaEV2ZW50KG5ldyBNb3VzZUV2ZW50KCdtb3VzZWRvd24nKSk7IH0sIDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWwuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsdGVyTm9kZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNzc0luamVjdG9yID0gcmVxdWlyZSgnY3NzLWluamVjdG9yJyk7XG5cbnZhciBjc3M7IC8vIGRlZmluZWQgYnkgY29kZSBpbnNlcnRlZCBieSBndWxwZmlsZSBiZXR3ZWVuIGZvbGxvd2luZyBjb21tZW50c1xuLyogaW5qZWN0OmNzcyAqL1xuY3NzID0gJy5maWx0ZXItdHJlZXtmb250LWZhbWlseTpzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMHB0O2xpbmUtaGVpZ2h0OjEuNWVtfS5maWx0ZXItdHJlZSBsYWJlbHtmb250LXdlaWdodDo0MDB9LmZpbHRlci10cmVlIGlucHV0W3R5cGU9Y2hlY2tib3hdLC5maWx0ZXItdHJlZSBpbnB1dFt0eXBlPXJhZGlvXXtsZWZ0OjNweDttYXJnaW4tcmlnaHQ6M3B4fS5maWx0ZXItdHJlZSBvbHttYXJnaW4tdG9wOjB9LmZpbHRlci10cmVlLWFkZCwuZmlsdGVyLXRyZWUtYWRkLWZpbHRlciwuZmlsdGVyLXRyZWUtcmVtb3Zle2N1cnNvcjpwb2ludGVyfS5maWx0ZXItdHJlZS1hZGQsLmZpbHRlci10cmVlLWFkZC1maWx0ZXJ7Zm9udC1zdHlsZTppdGFsaWM7Y29sb3I6IzQ0NDtmb250LXNpemU6OTAlfS5maWx0ZXItdHJlZS1hZGQtZmlsdGVye21hcmdpbjozcHggMDtkaXNwbGF5OmlubGluZS1ibG9ja30uZmlsdGVyLXRyZWUtYWRkLWZpbHRlcjpob3ZlciwuZmlsdGVyLXRyZWUtYWRkOmhvdmVye3RleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmV9LmZpbHRlci10cmVlLWFkZC1maWx0ZXIuYXMtbWVudS1oZWFkZXIsLmZpbHRlci10cmVlLWFkZC5hcy1tZW51LWhlYWRlcntiYWNrZ3JvdW5kLWNvbG9yOiNmZmY7Zm9udC13ZWlnaHQ6NzAwO2ZvbnQtc3R5bGU6bm9ybWFsfS5maWx0ZXItdHJlZS1hZGQtZmlsdGVyLmFzLW1lbnUtaGVhZGVyOmhvdmVye3RleHQtZGVjb3JhdGlvbjppbmhlcml0fS5maWx0ZXItdHJlZS1hZGQtZmlsdGVyPmRpdiwuZmlsdGVyLXRyZWUtYWRkPmRpdiwuZmlsdGVyLXRyZWUtcmVtb3Zle2Rpc3BsYXk6aW5saW5lLWJsb2NrO3dpZHRoOjE1cHg7aGVpZ2h0OjE1cHg7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZC1jb2xvcjojOGM4O2ZvbnQtc2l6ZToxMS41cHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOiNmZmY7dGV4dC1hbGlnbjpjZW50ZXI7bGluZS1oZWlnaHQ6bm9ybWFsO2ZvbnQtc3R5bGU6bm9ybWFsO2ZvbnQtZmFtaWx5OnNhbnMtc2VyaWY7dGV4dC1zaGFkb3c6MCAwIDEuNXB4IGdyZXk7bWFyZ2luLXJpZ2h0OjRweH0uZmlsdGVyLXRyZWUtYWRkLWZpbHRlcj5kaXY6YmVmb3JlLC5maWx0ZXItdHJlZS1hZGQ+ZGl2OmJlZm9yZXtjb250ZW50OlxcJ1xcXFxmZjBiXFwnfS5maWx0ZXItdHJlZS1yZW1vdmV7YmFja2dyb3VuZC1jb2xvcjojZTg4O2JvcmRlcjowfS5maWx0ZXItdHJlZS1yZW1vdmU6YmVmb3Jle2NvbnRlbnQ6XFwnXFxcXDIyMTJcXCd9LmZpbHRlci10cmVlIGxpOjphZnRlcntmb250LXNpemU6NzAlO2ZvbnQtc3R5bGU6aXRhbGljO2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjojMDgwfS5maWx0ZXItdHJlZT5vbD5saTpsYXN0LWNoaWxkOjphZnRlcntkaXNwbGF5Om5vbmV9LmZpbHRlci10cmVlLWFkZCwuZmlsdGVyLXRyZWUtYWRkLWZpbHRlciwub3AtYW5kPm9sLC5vcC1ub3I+b2wsLm9wLW9yPm9se3BhZGRpbmctbGVmdDozMnB4fS5vcC1vcj5vbD5saTo6YWZ0ZXJ7bWFyZ2luLWxlZnQ6Mi41ZW07Y29udGVudDpcXCfigJQgT1Ig4oCUXFwnfS5vcC1hbmQ+b2w+bGk6OmFmdGVye21hcmdpbi1sZWZ0OjIuNWVtO2NvbnRlbnQ6XFwn4oCUIEFORCDigJRcXCd9Lm9wLW5vcj5vbD5saTo6YWZ0ZXJ7bWFyZ2luLWxlZnQ6Mi41ZW07Y29udGVudDpcXCfigJQgTk9SIOKAlFxcJ30uZmlsdGVyLXRyZWUtZGVmYXVsdD46ZW5hYmxlZHttYXJnaW46MCAuNGVtO2JhY2tncm91bmQtY29sb3I6I2RkZDtib3JkZXI6MH0uZmlsdGVyLXRyZWUtZGVmYXVsdD5pbnB1dFt0eXBlPXRleHRde3dpZHRoOjhlbTtwYWRkaW5nOjAgNXB4fS5maWx0ZXItdHJlZS1kZWZhdWx0PnNlbGVjdHtib3JkZXI6MH0uZmlsdGVyLXRyZWUtZGVmYXVsdD4uZmlsdGVyLXRyZWUtd2FybmluZ3tiYWNrZ3JvdW5kLWNvbG9yOiNmZmN9LmZpbHRlci10cmVlLWRlZmF1bHQ+LmZpbHRlci10cmVlLWVycm9ye2JhY2tncm91bmQtY29sb3I6I0ZjY30uZmlsdGVyLXRyZWUgLmZvb3Rub3Rlc3tmb250LXNpemU6NnB0O21hcmdpbjoycHggMCAwO2xpbmUtaGVpZ2h0Om5vcm1hbDt3aGl0ZS1zcGFjZTpub3JtYWw7Y29sb3I6Izk5OX0uZmlsdGVyLXRyZWUgLmZvb3Rub3Rlcz5vbHttYXJnaW46MDtwYWRkaW5nLWxlZnQ6MmVtfS5maWx0ZXItdHJlZSAuZm9vdG5vdGVzPm9sPmxpe21hcmdpbjoycHggMH0uZmlsdGVyLXRyZWUgLmZvb3Rub3RlcyAuZmllbGQtbmFtZSwuZmlsdGVyLXRyZWUgLmZvb3Rub3RlcyAuZmllbGQtdmFsdWV7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOiM3Nzd9LmZpbHRlci10cmVlIC5mb290bm90ZXMgLmZpZWxkLXZhbHVlOmFmdGVyLC5maWx0ZXItdHJlZSAuZm9vdG5vdGVzIC5maWVsZC12YWx1ZTpiZWZvcmV7Y29udGVudDpcXCdcXFwiXFwnfS5maWx0ZXItdHJlZSAuZm9vdG5vdGVzIC5maWVsZC12YWx1ZXtmb250LWZhbWlseTptb25vc3BhY2V9LmZpbHRlci10cmVlLWNob29zZXJ7cG9zaXRpb246YWJzb2x1dGU7Zm9udC1zaXplOjlwdDtvdXRsaW5lOjA7Ym94LXNoYWRvdzo1cHggNXB4IDEwcHggZ3JleX0nO1xuLyogZW5kaW5qZWN0ICovXG5cbm1vZHVsZS5leHBvcnRzID0gY3NzSW5qZWN0b3IuYmluZCh0aGlzLCBjc3MpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVnRXhwTElLRSA9IHJlcXVpcmUoJ3JlZ2V4cC1saWtlJyk7XG5cbnZhciBMSUtFID0gJ0xJS0UgJyxcbiAgICBOT1RfTElLRSA9ICdOT1QgJyArIExJS0UsXG4gICAgTElLRV9XSUxEX0NBUkQgPSAnJSc7XG5cbnZhciBsZWFmT3BlcmF0b3JzID0ge1xuICAgICc8Jzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhIDwgYjsgfSxcbiAgICAgICAgc3FsOiBzcWxEaWFkaWMuYmluZCh0aGlzLCAnPCcpXG4gICAgfSxcbiAgICAnXFx1MjI2NCc6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYSA8PSBiOyB9LFxuICAgICAgICBzcWw6IHNxbERpYWRpYy5iaW5kKHRoaXMsICc8PScpXG4gICAgfSxcbiAgICAnPSc6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYSA9PT0gYjsgfSxcbiAgICAgICAgc3FsOiBzcWxEaWFkaWMuYmluZCh0aGlzLCAnPScpXG4gICAgfSxcbiAgICAnXFx1MjI2NSc6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYSA+PSBiOyB9LFxuICAgICAgICBzcWw6IHNxbERpYWRpYy5iaW5kKHRoaXMsICc+PScpXG4gICAgfSxcbiAgICAnPic6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYSA+IGI7IH0sXG4gICAgICAgIHNxbDogc3FsRGlhZGljLmJpbmQodGhpcywgJz4nKVxuICAgIH0sXG4gICAgJ1xcdTIyNjAnOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgIT09IGI7IH0sXG4gICAgICAgIHNxbDogc3FsRGlhZGljLmJpbmQodGhpcywgJzw+JylcbiAgICB9LFxuICAgIExJS0U6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gcmVnRXhwTElLRS5jYWNoZWQoYiwgdHJ1ZSkudGVzdChhKTsgfSxcbiAgICAgICAgc3FsOiBzcWxEaWFkaWMuYmluZCh0aGlzLCAnTElLRScpLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG4gICAgJ05PVCBMSUtFJzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiAhcmVnRXhwTElLRS5jYWNoZWQoYiwgdHJ1ZSkudGVzdChhKTsgfSxcbiAgICAgICAgc3FsOiBzcWxEaWFkaWMuYmluZCh0aGlzLCAnTk9UIExJS0UnKSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuICAgIElOOiB7IC8vIFRPRE86IGN1cnJlbnRseSBmb3JjaW5nIHN0cmluZyB0eXBpbmc7IHJld29yayBjYWxsaW5nIGNvZGUgdG8gcmVzcGVjdCBjb2x1bW4gdHlwZVxuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBpbk9wKGEsIGIpID49IDA7IH0sXG4gICAgICAgIHNxbDogc3FsSU4uYmluZCgnSU4nKSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuICAgICdOT1QgSU4nOiB7IC8vIFRPRE86IGN1cnJlbnRseSBmb3JjaW5nIHN0cmluZyB0eXBpbmc7IHJld29yayBjYWxsaW5nIGNvZGUgdG8gcmVzcGVjdCBjb2x1bW4gdHlwZVxuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBpbk9wKGEsIGIpIDwgMDsgfSxcbiAgICAgICAgc3FsOiBzcWxJTi5iaW5kKCdOT1QgSU4nKSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuICAgIENPTlRBSU5TOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGNvbnRhaW5zT3AoYSwgYikgPj0gMDsgfSxcbiAgICAgICAgc3FsOiBzcWxMSUtFLmJpbmQodGhpcywgTElLRV9XSUxEX0NBUkQsIExJS0VfV0lMRF9DQVJELCBMSUtFKSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuICAgICdOT1QgQ09OVEFJTlMnOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGNvbnRhaW5zT3AoYSwgYikgPCAwOyB9LFxuICAgICAgICBzcWw6IHNxbExJS0UuYmluZCh0aGlzLCBMSUtFX1dJTERfQ0FSRCwgTElLRV9XSUxEX0NBUkQsIE5PVF9MSUtFKSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuICAgIEJFR0lOUzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IGIgPSBiLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTsgcmV0dXJuIGJlZ2luc09wKGEsIGIubGVuZ3RoKSA9PT0gYjsgfSxcbiAgICAgICAgc3FsOiBzcWxMSUtFLmJpbmQodGhpcywgJycsIExJS0VfV0lMRF9DQVJELCBMSUtFKSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuICAgICdOT1QgQkVHSU5TJzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IGIgPSBiLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTsgcmV0dXJuIGJlZ2luc09wKGEsIGIubGVuZ3RoKSAhPT0gYjsgfSxcbiAgICAgICAgc3FsOiBzcWxMSUtFLmJpbmQodGhpcywgJycsIExJS0VfV0lMRF9DQVJELCBOT1RfTElLRSksXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfSxcbiAgICBFTkRTOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgYiA9IGIudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpOyByZXR1cm4gZW5kc09wKGEsIGIubGVuZ3RoKSA9PT0gYjsgfSxcbiAgICAgICAgc3FsOiBzcWxMSUtFLmJpbmQodGhpcywgTElLRV9XSUxEX0NBUkQsICcnLCBMSUtFKSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuICAgICdOT1QgRU5EUyc6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyBiID0gYi50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7IHJldHVybiBlbmRzT3AoYSwgYi5sZW5ndGgpICE9PSBiOyB9LFxuICAgICAgICBzcWw6IHNxbExJS0UuYmluZCh0aGlzLCBMSUtFX1dJTERfQ0FSRCwgJycsIE5PVF9MSUtFKSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBpbk9wKGEsIGIpIHtcbiAgICByZXR1cm4gYlxuICAgICAgICAudHJpbSgpIC8vIHJlbW92ZSBsZWFkaW5nIGFuZCB0cmFpbGluZyBzcGFjZSBjaGFyc1xuICAgICAgICAucmVwbGFjZSgvXFxzKixcXHMqL2csICcsJykgLy8gcmVtb3ZlIGFueSB3aGl0ZS1zcGFjZSBjaGFycyBmcm9tIGFyb3VuZCBjb21tYXNcbiAgICAgICAgLnNwbGl0KCcsJykgLy8gcHV0IGluIGFuIGFycmF5XG4gICAgICAgIC5pbmRleE9mKGEudG9TdHJpbmcoKSk7IC8vIHNlYXJjaCBhcnJheSB3aG9sZSBtYXRjaGVzXG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zT3AoYSwgYikge1xuICAgIHJldHVybiBhLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKS5pbmRleE9mKGIudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpKTtcbn1cblxuZnVuY3Rpb24gYmVnaW5zT3AoYSwgbGVuZ3RoKSB7XG4gICAgcmV0dXJuIGEudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpLnN1YnN0cigwLCBsZW5ndGgpO1xufVxuXG5mdW5jdGlvbiBlbmRzT3AoYSwgbGVuZ3RoKSB7XG4gICAgcmV0dXJuIGEudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpLnN1YnN0cigtbGVuZ3RoLCBsZW5ndGgpO1xufVxuXG5mdW5jdGlvbiBzcWxMSUtFKGJlZywgZW5kLCBMSUtFX09SX05PVF9MSUtFLCBhLCBsaWtlUGF0dGVybikge1xuICAgIHZhciBlc2NhcGVkID0gbGlrZVBhdHRlcm4ucmVwbGFjZSgvKFtcXFtfJVxcXV0pL2csICdbJDFdJyk7IC8vIGVzY2FwZSBhbGwgTElLRSByZXNlcnZlZCBjaGFyc1xuICAgIHJldHVybiBpZGVudGlmaWVyKGEpICsgJyAnICsgTElLRV9PUl9OT1RfTElLRSArICcgJyArIGdldFNxbFN0cmluZyhiZWcgKyBlc2NhcGVkICsgZW5kKTtcbn1cblxuZnVuY3Rpb24gc3FsSU4ob3AsIGEsIGIpIHtcbiAgICByZXR1cm4gaWRlbnRpZmllcihhKSArICcgJyArIG9wICsgJyAoXFwnJyArIHNxRXNjKGIpLnJlcGxhY2UoL1xccyosXFxzKi9nLCAnXFwnLCBcXCcnKSArICdcXCcpJztcbn1cblxuZnVuY3Rpb24gaWRlbnRpZmllcihzKSB7XG4gICAgcmV0dXJuIHMubGl0ZXJhbCA/IGdldFNxbFN0cmluZyhzLmxpdGVyYWwpIDogZ2V0U3FsSWRlbnRpZmllcihzLmlkZW50aWZpZXIgPyBzLmlkZW50aWZpZXIgOiBzKTtcbn1cblxuZnVuY3Rpb24gbGl0ZXJhbChzKSB7XG4gICAgcmV0dXJuIHMuaWRlbnRpZmllciA/IGdldFNxbElkZW50aWZpZXIocy5pZGVudGlmaWVyKSA6IGdldFNxbFN0cmluZyhzLmxpdGVyYWwgPyBzLmxpdGVyYWwgOiBzKTtcbn1cblxuZnVuY3Rpb24gc3FsRGlhZGljKG9wLCBhLCBiKSB7XG4gICAgcmV0dXJuIGlkZW50aWZpZXIoYSkgKyBvcCArIGxpdGVyYWwoYik7XG59XG5cbmZ1bmN0aW9uIHNxRXNjKHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvJy9nLCAnXFwnXFwnJyk7XG59XG5cbmZ1bmN0aW9uIGdldFNxbFN0cmluZyhzdHJpbmcpIHtcbiAgICByZXR1cm4gJ1xcJycgKyBzcUVzYyhzdHJpbmcpICsgJ1xcJyc7XG59XG5cbmZ1bmN0aW9uIGdldFNxbElkZW50aWZpZXIoaWQpIHtcbiAgICByZXR1cm4gJ1xcXCInICsgc3FFc2MoaWQpICsgJ1xcXCInO1xufVxuXG4vLyBMaXN0IHRoZSBvcGVyYXRvcnMgYXMgZHJvcC1kb3duIG9wdGlvbnMgaW4gYW4gaGllcmFyY2hpY2FsIGFycmF5IChyZW5kZXJlZCBhcyBvcHRpb24gZ3JvdXBzKTpcblxudmFyIGVxdWFsaXR5LCBpbmVxdWFsaXRpZXMsIHNldHMsIHN0cmluZ3MsIHBhdHRlcm5zO1xuXG5lcXVhbGl0eSA9IFsnPSddO1xuZXF1YWxpdHkubGFiZWwgPSAnRXF1YWxpdHknO1xuXG5pbmVxdWFsaXRpZXMgPSBbJzwnLCAnXFx1MjI2NCcsICdcXHUyMjYwJywgJ1xcdTIyNjUnLCAnPiddO1xuaW5lcXVhbGl0aWVzLmxhYmVsID0gJ0lucXVhbGl0eSc7XG5cbnNldHMgPSBbJ0lOJywgJ05PVCBJTiddO1xuc2V0cy5sYWJlbCA9ICdTZXQgc2Nhbic7XG5cbnN0cmluZ3MgPSBbXG4gICAgJ0NPTlRBSU5TJywgJ05PVCBDT05UQUlOUycsXG4gICAgJ0JFR0lOUycsICdOT1QgQkVHSU5TJyxcbiAgICAnRU5EUycsICdOT1QgRU5EUydcbl07XG5zdHJpbmdzLmxhYmVsID0gJ1N0cmluZyBzY2FuJztcblxuLy8gQWx0ZXJuYXRpdmVseSwgb3B0aW9uIGdyb3VwcyBjYW4gYWxzbyBiZSBzZXQgdXAgYXMgYW4gb2JqZWN0IHdpdGggLm9wdGlvbnMgYW5kIC5sYWJlbCBwcm9wZXJ0aWVzOlxuXG5wYXR0ZXJucyA9IHsgb3B0aW9uczogWydMSUtFJywgJ05PVCBMSUtFJ10sIGxhYmVsOiAnUGF0dGVybiBtYXRjaGluZycgfTtcblxubGVhZk9wZXJhdG9ycy5vcHRpb25zID0gW1xuICAgIGVxdWFsaXR5LFxuICAgIGluZXF1YWxpdGllcyxcbiAgICBzZXRzLFxuICAgIHN0cmluZ3MsXG4gICAgcGF0dGVybnNcbl07XG5cbm1vZHVsZS5leHBvcnRzID0gbGVhZk9wZXJhdG9ycztcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB0ZW1wbGV4ID0gcmVxdWlyZSgndGVtcGxleCcpO1xuXG52YXIgdGVtcGxhdGVzID0ge1xuXG4gICAgdHJlZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8qXG4gICAgICAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlXCI+XG4gICAgICAgICAgICAgTWF0Y2hcbiAgICAgICAgICAgICA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwiZmlsdGVyLXRyZWUtb3AtY2hvaWNlXCIgbmFtZT1cInRyZWVPcHsxfVwiIHZhbHVlPVwib3Atb3JcIj5hbnk8L2xhYmVsPlxuICAgICAgICAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgY2xhc3M9XCJmaWx0ZXItdHJlZS1vcC1jaG9pY2VcIiBuYW1lPVwidHJlZU9wezF9XCIgdmFsdWU9XCJvcC1hbmRcIj5hbGw8L2xhYmVsPlxuICAgICAgICAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgY2xhc3M9XCJmaWx0ZXItdHJlZS1vcC1jaG9pY2VcIiBuYW1lPVwidHJlZU9wezF9XCIgdmFsdWU9XCJvcC1ub3JcIj5ub25lPC9sYWJlbD5cbiAgICAgICAgICAgICBvZiB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbmFsczo8YnIvPlxuICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiZmlsdGVyLXRyZWUtYWRkLWZpbHRlclwiIHRpdGxlPVwiQWRkIGEgbmV3IGNvbmRpdGlvbmFsIHRvIHRoaXMgbWF0Y2guXCI+XG4gICAgICAgICAgICAgICAgPGRpdj48L2Rpdj5jb25kaXRpb25hbFxuICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlLWFkZFwiIHRpdGxlPVwiQWRkIGEgbmV3IHN1Yi1tYXRjaCB1bmRlciB0aGlzIG1hdGNoLlwiPlxuICAgICAgICAgICAgICAgIDxkaXY+PC9kaXY+c3ViZXhwcmVzc2lvblxuICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICA8b2w+PC9vbD5cbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICovXG4gICAgfSxcblxuICAgIHJlbW92ZUJ1dHRvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8qXG4gICAgICAgIDxkaXYgY2xhc3M9XCJmaWx0ZXItdHJlZS1yZW1vdmVcIiB0aXRsZT1cImRlbGV0ZSBjb25kaXRpb25hbFwiPjwvZGl2PlxuICAgICAgICAqL1xuICAgIH0sXG5cbiAgICBub3RlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLypcbiAgICAgICAgPGRpdiBjbGFzcz1cImZvb3Rub3Rlc1wiPlxuICAgICAgICAgICAgPGVtPk5vdGUgcmVnYXJkaW5nIHRoZSBhYm92ZSBleHByZXNzaW9uOjwvZW0+XG4gICAgICAgICAgICA8c3Bhbj48L3NwYW4+XG4gICAgICAgICAgICBTZWxlY3QgYSBuZXcgdmFsdWUgb3IgZGVsZXRlIHRoZSBleHByZXNzaW9uIGFsdG9nZXRoZXIuXG4gICAgICAgIDwvZGl2PlxuICAgICAgICAqL1xuICAgIH0sXG5cbiAgICBub3RlczogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8qXG4gICAgICAgICA8ZGl2IGNsYXNzPVwiZm9vdG5vdGVzXCI+XG4gICAgICAgICAgICA8ZW0+Tm90ZXMgcmVnYXJkaW5nIHRoZSBhYm92ZSBleHByZXNzaW9uOjwvZW0+XG4gICAgICAgICAgICA8b2w+PC9vbD5cbiAgICAgICAgICAgIFNlbGVjdCBuZXcgdmFsdWVzIG9yIGRlbGV0ZSB0aGUgZXhwcmVzc2lvbiBhbHRvZ2V0aGVyLlxuICAgICAgICAgPC9kaXY+XG4gICAgICAgICAqL1xuICAgIH0sXG5cbiAgICBvcHRpb25NaXNzaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLypcbiAgICAgICAgVGhlIHByZXZpb3VzIDxzcGFuIGNsYXNzPVwiZmllbGQtbmFtZVwiPnsxOmVuY29kZX08L3NwYW4+XG4gICAgICAgIHZhbHVlIDxzcGFuIGNsYXNzPVwiZmllbGQtdmFsdWVcIj57MjplbmNvZGV9PC9zcGFuPlxuICAgICAgICBpcyBubyBsb25nZXIgdmFsaWQuXG4gICAgICAgICovXG4gICAgfVxuXG59O1xuXG52YXIgZXh0cmFjdCA9IC9cXC9cXCpcXHMqKFteXSs/KVxccytcXCpcXC8vOyAvLyBmaW5kcyB0aGUgc3RyaW5nIGluc2lkZSB0aGUgLyogLi4uICovOyB0aGUgZ3JvdXAgZXhjbHVkZXMgdGhlIHdoaXRlc3BhY2VcbnZhciBlbmNvZGVycyA9IC9cXHsoXFxkKylcXDplbmNvZGVcXH0vZztcblxuZnVuY3Rpb24gZ2V0KHRlbXBsYXRlTmFtZSkge1xuICAgIHZhciB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdmFyIHRleHQgPSB0ZW1wbGF0ZXNbdGVtcGxhdGVOYW1lXS50b1N0cmluZygpLm1hdGNoKGV4dHJhY3QpWzFdO1xuICAgIHZhciB0ZW1wbGV4QXJncyA9IFt0ZXh0XS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgdmFyIGtleXMsIGVuY29kZXIgPSB7fTtcblxuICAgIGVuY29kZXJzLmxhc3RJbmRleCA9IDA7XG4gICAgd2hpbGUgKChrZXlzID0gZW5jb2RlcnMuZXhlYyh0ZXh0KSkpIHtcbiAgICAgICAgZW5jb2RlcltrZXlzWzFdXSA9IHRydWU7XG4gICAgfVxuICAgIGtleXMgPSBPYmplY3Qua2V5cyhlbmNvZGVyKTtcbiAgICBpZiAoa2V5cy5sZW5ndGgpIHtcbiAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdGVtcC50ZXh0Q29udGVudCA9IHRlbXBsZXhBcmdzW2tleV07XG4gICAgICAgICAgICB0ZW1wbGV4QXJnc1trZXldID0gdGVtcC5pbm5lckhUTUw7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZW1wbGV4QXJnc1swXSA9IHRleHQucmVwbGFjZShlbmNvZGVycywgJ3skMX0nKTtcbiAgICB9XG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHRlbXBsZXguYXBwbHkodGhpcywgdGVtcGxleEFyZ3MpO1xuXG4gICAgLy8gaWYgb25seSBvbmUgSFRNTEVsZW1lbnQsIHJldHVybiBpdDsgb3RoZXJ3aXNlIGVudGlyZSBsaXN0IG9mIG5vZGVzXG4gICAgcmV0dXJuIHRlbXAuY2hpbGRyZW4ubGVuZ3RoID09PSAxICYmIHRlbXAuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEgPyB0ZW1wLmZpcnN0Q2hpbGQgOiB0ZW1wLmNoaWxkTm9kZXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiogQHR5cGVkZWYge2Z1bmN0aW9ufSBvcGVyYXRpb25SZWR1Y2VyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHBcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gcVxuICogQHJldHVybnMge2Jvb2xlYW59IFRoZSByZXN1bHQgb2YgYXBwbHlpbmcgdGhlIG9wZXJhdG9yIHRvIHRoZSB0d28gcGFyYW1ldGVycy5cbiAqL1xuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAdHlwZSB7b3BlcmF0aW9uUmVkdWNlcn1cbiAqL1xuZnVuY3Rpb24gQU5EKHAsIHEpIHtcbiAgICByZXR1cm4gcCAmJiBxO1xufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAdHlwZSB7b3BlcmF0aW9uUmVkdWNlcn1cbiAqL1xuZnVuY3Rpb24gT1IocCwgcSkge1xuICAgIHJldHVybiBwIHx8IHE7XG59XG5cbi8qKiBAdHlwZWRlZiB7b2JlamN0fSB0cmVlT3BlcmF0b3JcbiAqIEBkZXNjIEVhY2ggYHRyZWVPcGVyYXRvcmAgb2JqZWN0IGRlc2NyaWJlcyB0d28gdGhpbmdzOlxuICpcbiAqIDEuIEhvdyB0byB0YWtlIHRoZSB0ZXN0IHJlc3VsdHMgb2YgX25fIGNoaWxkIG5vZGVzIGJ5IGFwcGx5aW5nIHRoZSBvcGVyYXRvciB0byBhbGwgdGhlIHJlc3VsdHMgdG8gXCJyZWR1Y2VcIiBpdCBkb3duIHRvIGEgc2luZ2xlIHJlc3VsdC5cbiAqIDIuIEhvdyB0byBnZW5lcmF0ZSBTUUwgV0hFUkUgY2xhdXNlIHN5bnRheCB0aGF0IGFwcGxpZXMgdGhlIG9wZXJhdG9yIHRvIF9uXyBjaGlsZCBub2Rlcy5cbiAqXG4gKiBAcHJvcGVydHkge29wZXJhdGlvblJlZHVjZXJ9IHJlZHVjZVxuICogQHByb3BlcnR5IHtib29sZWFufSBzZWVkIC1cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gYWJvcnQgLVxuICogQHByb3BlcnR5IHtib29sZWFufSBuZWdhdGUgLVxuICogQHByb3BlcnR5IHtzdHJpbmd9IFNRTC5vcCAtXG4gKiBAcHJvcGVydHkge3N0cmluZ30gU1FMLmJlZyAtXG4gKiBAcHJvcGVydHkge3N0cmluZ30gU1FMLmVuZCAtXG4gKi9cblxuLyoqIEEgaGFzaCBvZiB7QGxpbmsgdHJlZU9wZXJhdG9yfSBvYmplY3RzLlxuICogQHR5cGUge29iamVjdH1cbiAqL1xudmFyIHRyZWVPcGVyYXRvcnMgPSB7XG4gICAgJ29wLWFuZCc6IHtcbiAgICAgICAgcmVkdWNlOiBBTkQsXG4gICAgICAgIHNlZWQ6IHRydWUsXG4gICAgICAgIGFib3J0OiBmYWxzZSxcbiAgICAgICAgbmVnYXRlOiBmYWxzZSxcbiAgICAgICAgU1FMOiB7XG4gICAgICAgICAgICBvcDogJ0FORCcsXG4gICAgICAgICAgICBiZWc6ICcoJyxcbiAgICAgICAgICAgIGVuZDogJyknXG4gICAgICAgIH1cbiAgICB9LFxuICAgICdvcC1vcic6IHtcbiAgICAgICAgcmVkdWNlOiBPUixcbiAgICAgICAgc2VlZDogZmFsc2UsXG4gICAgICAgIGFib3J0OiB0cnVlLFxuICAgICAgICBuZWdhdGU6IGZhbHNlLFxuICAgICAgICBTUUw6IHtcbiAgICAgICAgICAgIG9wOiAnT1InLFxuICAgICAgICAgICAgYmVnOiAnKCcsXG4gICAgICAgICAgICBlbmQ6ICcpJ1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnb3Atbm9yJzoge1xuICAgICAgICByZWR1Y2U6IE9SLFxuICAgICAgICBzZWVkOiBmYWxzZSxcbiAgICAgICAgYWJvcnQ6IHRydWUsXG4gICAgICAgIG5lZ2F0ZTogdHJ1ZSxcbiAgICAgICAgU1FMOiB7XG4gICAgICAgICAgICBvcDogJ09SJyxcbiAgICAgICAgICAgIGJlZzogJ05PVCAoJyxcbiAgICAgICAgICAgIGVuZDogJyknXG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRyZWVPcGVyYXRvcnM7XG4iXX0=
