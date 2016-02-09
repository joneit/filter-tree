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
        var radioButton = this.el.querySelector(':scope > label > input[value=' + this.operator + ']'),
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

},{"./js/FilterLeaf":8,"./js/FilterNode":9,"./js/css":12,"./js/template":14,"./js/tree-operators":15,"unstrungify":6}],8:[function(require,module,exports){
/* eslint-env browser */
/* eslint-disable key-spacing */

'use strict';

var FilterNode = require('./FilterNode');
var template = require('./template');
var conditionals = require('./conditionals');
var buildElement = require('./build-element');


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
            operator: this.makeElement(root, this.operatorMenu, 'operator'),
            literal: this.makeElement(root)
        };

        root.appendChild(document.createElement('br'));
    },

    /**
     * @summary HTML form controls factory.
     * @desc Creates and appends a text box or a drop-down.
     * @returns The new element.
     * @param {Element} container - An element to which to append the new element.
     * @param {fieldOption[]} [menu] - Overloads:
     * * If omitted, will create an `<input/>` (text box) element.
     * * If contains only a single option, will create a `<span>...</span>` element containing the string and a `<input type=hidden>` containing the value.
     * * Otherwise, creates a `<select>...</select>` element with these menu.
     * @param {null|string} [prompt=''] - Adds an initial `<option>...</option>` element to the drop-down with this value, parenthesized, as its `text`; and empty string as its `value`. Omitting creates a blank prompt; `null` suppresses.
     */
    makeElement: function(container, menu, prompt, sort) {
        var el, option, hidden,
            tagName = menu ? 'select' : 'input';

        if (menu && menu.length === 1) {
            // hard text when there would be only 1 option in the dropdown
            option = menu[0];

            hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.value = option.name || option.alias || option;

            el = document.createElement('span');
            el.innerHTML = option.alias || option.name || option;
            el.appendChild(hidden);
        } else {
            el = buildElement(tagName, menu, prompt, sort);
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
        if ((field.submenu || field) instanceof Array) {
            return (complex = findField(field.submenu || field, name));
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

module.exports = FilterLeaf;

},{"./FilterNode":9,"./build-element":10,"./conditionals":11,"./template":14}],9:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var extend = require('extend-me');
var _ = require('object-iterators');
var Base = extend.Base;

var template = require('./template');
var conditionals = require('./conditionals');
var sqlWhereParse = require('./sql-where-parse');

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
 * @param {object|string} [options.state] - A data structure that describes a tree, subtree, or leaf (terminal node):
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
 * The constructor auto-detects the type:
 *  * plain object
 *  * JSON string to be parsed by `JSON.parse()` into a plain object
 *  * SQL WHERE clause string to be parsed into a plain object
 *
 * @param {function} [options.editor='Default'] - Type of simple expression.
 *
 * @param {FilterTree} [options.parent] - Used internally to insert element when creating nested subtrees. For the top level tree, you don't give a value for `parent`; you are responsible for inserting the top-level `.el` into the DOM.
 */
var FilterNode = Base.extend({

    initialize: function(options) {
        var self = this,
            parent = options && options.parent,
            state = options && options.state && detectState(options.state);

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
        this.operatorMenu.forEach(function(option, index) {
            if (typeof option === 'string' && option[0] === '@') {
                self.operatorMenu[index] = conditionals.groups[option.substr(1)];
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
        this.state = detectState(state);
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
    /** @summary Default list of fields only for direct child terminal-node drop-downs.
     * @type {string[]}
     * @memberOf FilterNode.prototype
     */
    nodeFields: { own: true },

    /** @summary Default list of fields for all descendant terminal-node drop-downs.
     * @type {string[]}
     * @memberOf FilterNode.prototype
     */
    fields: {},

    /** @summary Type of filter editor.
     * @type {string}
     * @memberOf FilterNode.prototype
     */
    editor: {},

    /** @summary Event handler for UI events.
     * @type {string}
     * @memberOf FilterNode.prototype
     */
    eventHandler: {},

    /** @summary This is the _column filters_ subtree if truthy.
     * @desc Should only ever be at most 1 node with this set, always positioned as first child of root tree.
     * @type {boolean}
     * @memberOf FilterNode.prototype
     */
    isColumnFilters: { own: true },

    /** @summary Override operator list at any node.
     * Should only ever be first child of root tree.
     * @type {fieldOption}
     * @memberOf FilterNode.prototype
     */
    operatorMenu: { default: conditionals.menu }
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

var reJSON = /^\s*[\[\{]/;

function detectState(state) {
    switch (typeof state) {
        case 'object':
            return state;
        case 'string':
            if (reJSON.test(state)) {
                try {
                    return JSON.parse(state);
                } catch (error) {
                    throw FilterNode.Error('JSON parser: ' + error);
                }
            } else {
                try {
                    return sqlWhereParse(state);
                } catch (error) {
                    throw FilterNode.Error('SQL WHERE clause parser: ' + error);
                }
            }
    }
}

module.exports = FilterNode;

},{"./conditionals":11,"./sql-where-parse":13,"./template":14,"extend-me":2,"object-iterators":3}],10:[function(require,module,exports){
/* eslint-env browser */

'use strict';

/** @typedef {object} valueOption
 * You should supply both `name` and `alias` but you could omit one or the other and whichever you provide will be used for both. (In such case you might as well just give a string for {@link fieldOption} rather than this object.)
 * @property {string} [name=alias] - Value of `value` attribute of `<option>...</option>` element.
 * @property {string} [alias=name] - Text of `<option>...</option>` element.
 * @property {string} [type] One of the keys of `this.converters`. If not one of these (including `undefined`), field values will be tested with a string comparison.
 * @property {boolean} [hidden=false]
 */

/** @typedef {object} submenu
 * @summary Hierarchical array of select list items.
 * @desc Data structure representing the list of `<option>...</option>` and/or `<optgroup>...</optgroup>` elements of a `<select>...</select>`.
 *
 * May be a simple array of strings or {@link valueOption} structures that allow for an alias. Any element may itself be such an array thus forming an `<optgroup>...</optgroup>`.
 * @property {string} label
 * @property {fieldOption[]} menu
 */

/** @typedef {string|valueOption|submenu} fieldOption
 * The three possible types specify either an `<option>....</option>` element or an `<optgroup>....</optgroup>` element as follows:
 * * `string` - specifies only the text of an `<option>....</option>` element (the value naturally defaults to the text)
 * * {@link valueOption} - specifies both the text (`.name`) and the value (`.alias`) of an `<option....</option>` element
 * * {@link submenu} - specifies an `<optgroup>....</optgroup>` element
 */

/**
 * @summary Creates a new `input type=text` element or populated `select` element.
 * @param {string} tagName - Must be one of:
 * * `'input'` for a text box
 * * `'select'` for a drop-down
 * * `'optgroup'` (for internal use only)
 * @param {fieldOption[]} [menu] - Hierarchical list of strings to add as `<option>...</option>` or `<optgroup>....</optgroup>` elements. Omit to create a text box.
 * @param {null|string} [options.prompt=''] - Adds an initial `<option>...</option>` element to the drop-down with this value in parentheses as its `text`; and empty string as its `value`. Default is empty string, which creates a blank prompt; `null` suppresses prompt altogether.
 * @param {boolean} - Whether to alpha sort or not. If truthy, sorts each optgroup on its `label`; and each select option on its `alias` if given, or its `name` if not.
 * @param {number[]} breadcrumbs - List of option group section numbers (root is section 0).
 * @returns {Element} Either a `<select>` or `<optgroup>` element.
 */
function buildElement(tagName, menu, options) {
    var prompt = options && options.prompt,
        sort = options && options.sort,
        breadcrumbs = options && options.breadcrumbs || [],
        path = breadcrumbs ? breadcrumbs.join('.') + '.' : '',
        el = document.createElement(tagName);

    if (menu) {
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
            menu = menu.slice().sort(fieldComparator); // sorted clone
        }

        menu.forEach(function(item, index) {
            var submenu = item.submenu || item;
            if (submenu instanceof Array) {
                var optgroup = buildElement(
                    'optgroup',
                    submenu,
                    {
                        breadcrumbs: breadcrumbs.concat(index + 1),
                        prompt: item.label || '\xa7' + path + (index + 1)
                    }
                );
                el.add(optgroup);
            } else {
                var newElement;

                if (typeof item !== 'object') {
                    newElement = new Option(item);
                } else if (!item.hidden) {
                    newElement = new Option(
                        item.alias || item.name,
                        item.name || item.alias
                    );
                }

                if (newElement) {
                    add.call(el, newElement);
                }
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

module.exports = buildElement;

},{}],11:[function(require,module,exports){
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

// the operators as drop-down "option groups":
var groups = {
    equality: {
        label: 'Equality',
        submenu: ['=']
    },
    inequalities: {
        label: 'Inequality',
        submenu: ['<', '\u2264', '\u2260', '\u2265', '>']
    },
    sets: {
        label: 'Set scan',
        submenu: ['IN', 'NOT IN']
    },
    strings: {
        label: 'String scan',
        submenu: [
            'CONTAINS', 'NOT CONTAINS',
            'BEGINS', 'NOT BEGINS',
            'ENDS', 'NOT ENDS'
        ]
    },
    patterns: {
        label: 'Pattern matching',
        submenu: ['LIKE', 'NOT LIKE']
    }
};

// add a `name` prop to each group
_(groups).each(function(group, key) { group.name = key; });

module.exports = {
    operators: operators,
    groups: groups,
    menu: [ // hierarchical menu of relational operators
        groups.equality,
        groups.inequalities,
        groups.sets,
        groups.strings,
        groups.patterns
    ]
};

},{"object-iterators":3,"regexp-like":4}],12:[function(require,module,exports){
'use strict';

var cssInjector = require('css-injector');

var css; // defined by code inserted by gulpfile between following comments
/* inject:css */
css = '.filter-tree{font-family:sans-serif;font-size:10pt;line-height:1.5em}.filter-tree label{font-weight:400}.filter-tree input[type=checkbox],.filter-tree input[type=radio]{left:3px;margin-right:3px}.filter-tree ol{margin-top:0}.filter-tree-add,.filter-tree-add-filter,.filter-tree-remove{cursor:pointer}.filter-tree-add,.filter-tree-add-filter{font-style:italic;color:#444;font-size:90%}.filter-tree-add-filter{margin:3px 0;display:inline-block}.filter-tree-add-filter:hover,.filter-tree-add:hover{text-decoration:underline}.filter-tree-add-filter.as-menu-header,.filter-tree-add.as-menu-header{background-color:#fff;font-weight:700;font-style:normal}.filter-tree-add-filter.as-menu-header:hover{text-decoration:inherit}.filter-tree-add-filter>div,.filter-tree-add>div,.filter-tree-remove{display:inline-block;width:15px;height:15px;border-radius:8px;background-color:#8c8;font-size:11.5px;font-weight:700;color:#fff;text-align:center;line-height:normal;font-style:normal;font-family:sans-serif;text-shadow:0 0 1.5px grey;margin-right:4px}.filter-tree-add-filter>div:before,.filter-tree-add>div:before{content:\'\\ff0b\'}.filter-tree-remove{background-color:#e88;border:0}.filter-tree-remove:before{content:\'\\2212\'}.filter-tree li::after{font-size:70%;font-style:italic;font-weight:700;color:#080}.filter-tree>ol>li:last-child::after{display:none}.filter-tree-add,.filter-tree-add-filter,.op-and>ol,.op-nor>ol,.op-or>ol{padding-left:32px}.op-or>ol>li::after{margin-left:2.5em;content:\'— OR —\'}.op-and>ol>li::after{margin-left:2.5em;content:\'— AND —\'}.op-nor>ol>li::after{margin-left:2.5em;content:\'— NOR —\'}.filter-tree-editor>*{font-weight:700}.filter-tree-editor>span{font-size:smaller}.filter-tree-editor>input[type=text]{width:8em;padding:1px 5px 2px}.filter-tree-default>:enabled{margin:0 .4em;background-color:#ddd;border:0}.filter-tree-default>select{border:0}.filter-tree-default>.filter-tree-warning{background-color:#ffc}.filter-tree-default>.filter-tree-error{background-color:#Fcc}.filter-tree .footnotes{font-size:6pt;margin:2px 0 0;line-height:normal;white-space:normal;color:#999}.filter-tree .footnotes>ol{margin:0;padding-left:2em}.filter-tree .footnotes>ol>li{margin:2px 0}.filter-tree .footnotes .field-name,.filter-tree .footnotes .field-value{font-weight:700;color:#777}.filter-tree .footnotes .field-value:after,.filter-tree .footnotes .field-value:before{content:\'\"\'}.filter-tree .footnotes .field-value{font-family:monospace}.filter-tree-chooser{position:absolute;font-size:9pt;outline:0;box-shadow:5px 5px 10px grey}';
/* endinject */

module.exports = cssInjector.bind(this, css);

},{"css-injector":1}],13:[function(require,module,exports){
'use strict';

var reName = /^("(.+?)"|([A-Z_][A-Z_@\$#]*)\b)/i, // [2] || [3]
    reOp = /^((=|>=?|<[>=]?)|(NOT )?(LIKE|IN)\b)/i, // [1]
    reLit = /^'(\d+)'/,
    reLitAnywhere = /'(\d+)'/,
    reIn = /^\((.*?)\)/,
    reBool = /^(AND|OR)\b/i,
    reGroup = /^(NOT ?)?\(/i;

var SQT = '\'';

var literals;

function sqlWhereParse(whereClause) {
    return walk(stripLiterals(whereClause));
}

function walk(t) {
    var m, name, op, arg, bool, token, tokens = [];
    var i = 0;

    t = t.trim();

    while (i < t.length) {
        m = t.substr(i).match(reGroup);
        if (m) {
            var not = !!m[1];

            i += m[0].length;
            for (var j = i, v = 1; j < t.length && v; ++j) {
                if (t[j] === '(') {
                    ++v;
                } else if (t[j] === ')') {
                    --v;
                }
            }

            if (v) {
                throw 'Expected ")"';
            }
            token = walk(t.substr(i, j - 1 - i));
            if (typeof token !== 'object') {
                return token;
            }

            if (not) {
                if (token.operator !== 'op-or') {
                    throw 'Expected OR in NOT(...) subexpression but found ' + token.operator.substr(3).toUpperCase() + '.';
                }
                token.operator = 'op-nor';
            }

            i = j;
        } else {
            m = t.substr(i).match(reName);
            if (!m) {
                throw 'Expected identifier or quoted identifier.';
            }
            name = m[2] || m[3];
            if (!/^[A-Z_]/i.test(t[i])) { i += 2; }
            i += name.length;

            if (t[i] === ' ') { ++i; }
            m = t.substr(i).match(reOp);
            if (!m) {
                throw 'Expected relational operator.';
            }
            op = m[1].toUpperCase();
            i += op.length;

            if (t[i] === ' ') { ++i; }
            if (m[4] && m[4].toUpperCase() === 'IN') {
                m = t.substr(i).match(reIn);
                if (!m) {
                    throw 'Expected parenthesized list.';
                }
                arg = m[1];
                i += arg.length + 2;
                while ((m = arg.match(reLitAnywhere))) {
                    arg = arg.replace(reLitAnywhere, literals[m[1]]);
                }
            } else {
                m = t.substr(i).match(reLit);
                if (!m) {
                    throw 'Expected string literal.';
                }
                arg = m[1];
                i += arg.length + 2;
                arg = literals[arg];
            }

            token = {
                column: name,
                operator: op,
                literal: arg
            };
        }

        tokens.push(token);

        if (i < t.length) {
            if (t[i] === ' ') { ++i; }
            m = t.substr(i).match(reBool);
            if (!m) {
                throw 'Expected boolean opearator.';
            }
            bool = m[1].toLowerCase();
            i += bool.length;
            bool = 'op-' + bool;
            if (tokens.operator && tokens.operator !== bool) {
                throw 'Expected same boolean operator throughout subexpression.';
            }
            tokens.operator = bool;
        }

        if (t[i] === ' ') { ++i; }
    }

    return (
        tokens.length === 1
            ? tokens[0]
            : {
                operator: tokens.operator,
                children: tokens
            }
    );
}

function stripLiterals(t) {
    var i = 0, j = 0, k;

    literals = [];

    while ((j = t.indexOf(SQT, j)) >= 0) {
        k = j;
        do {
            k = t.indexOf(SQT, k + 1);
            if (k < 0) {
                throw 'Expected ' + SQT + ' (single quote).';
            }
        } while (t[++k] === SQT);
        literals.push(t.slice(++j, --k).replace(/''/g, SQT));
        t = t.substr(0, j) + i + t.substr(k);
        j = j + 1 + i.toString().length + 1;
        i++;
    }

    return t;
}

module.exports = sqlWhereParse;

},{}],14:[function(require,module,exports){
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
            Row data must match <strong>all</strong> of the following subexpressions:<br/>
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

},{"templex":5}],15:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL25vZGVfbW9kdWxlcy9jc3MtaW5qZWN0b3IvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL2V4dGVuZC1tZS9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvb2JqZWN0LWl0ZXJhdG9ycy9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvcmVnZXhwLWxpa2UvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL3RlbXBsZXgvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL3Vuc3RydW5naWZ5L2luZGV4LmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9mYWtlXzMwZTM0NzEwLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy9GaWx0ZXJMZWFmLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy9GaWx0ZXJOb2RlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy9idWlsZC1lbGVtZW50LmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy9jb25kaXRpb25hbHMuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvc3JjL2pzL2Nzcy5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvc3FsLXdoZXJlLXBhcnNlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL3NyYy9qcy90ZW1wbGF0ZS5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9zcmMvanMvdHJlZS1vcGVyYXRvcnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuLyogZXNsaW50LWVudiBicm93c2VyICovXG5cbi8qKiBAbmFtZXNwYWNlIGNzc0luamVjdG9yICovXG5cbi8qKlxuICogQHN1bW1hcnkgSW5zZXJ0IGJhc2Ugc3R5bGVzaGVldCBpbnRvIERPTVxuICpcbiAqIEBkZXNjIENyZWF0ZXMgYSBuZXcgYDxzdHlsZT4uLi48L3N0eWxlPmAgZWxlbWVudCBmcm9tIHRoZSBuYW1lZCB0ZXh0IHN0cmluZyhzKSBhbmQgaW5zZXJ0cyBpdCBidXQgb25seSBpZiBpdCBkb2VzIG5vdCBhbHJlYWR5IGV4aXN0IGluIHRoZSBzcGVjaWZpZWQgY29udGFpbmVyIGFzIHBlciBgcmVmZXJlbmNlRWxlbWVudGAuXG4gKlxuICogPiBDYXZlYXQ6IElmIHN0eWxlc2hlZXQgaXMgZm9yIHVzZSBpbiBhIHNoYWRvdyBET00sIHlvdSBtdXN0IHNwZWNpZnkgYSBsb2NhbCBgcmVmZXJlbmNlRWxlbWVudGAuXG4gKlxuICogQHJldHVybnMgQSByZWZlcmVuY2UgdG8gdGhlIG5ld2x5IGNyZWF0ZWQgYDxzdHlsZT4uLi48L3N0eWxlPmAgZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gY3NzUnVsZXNcbiAqIEBwYXJhbSB7c3RyaW5nfSBbSURdXG4gKiBAcGFyYW0ge3VuZGVmaW5lZHxudWxsfEVsZW1lbnR8c3RyaW5nfSBbcmVmZXJlbmNlRWxlbWVudF0gLSBDb250YWluZXIgZm9yIGluc2VydGlvbi4gT3ZlcmxvYWRzOlxuICogKiBgdW5kZWZpbmVkYCB0eXBlIChvciBvbWl0dGVkKTogaW5qZWN0cyBzdHlsZXNoZWV0IGF0IHRvcCBvZiBgPGhlYWQ+Li4uPC9oZWFkPmAgZWxlbWVudFxuICogKiBgbnVsbGAgdmFsdWU6IGluamVjdHMgc3R5bGVzaGVldCBhdCBib3R0b20gb2YgYDxoZWFkPi4uLjwvaGVhZD5gIGVsZW1lbnRcbiAqICogYEVsZW1lbnRgIHR5cGU6IGluamVjdHMgc3R5bGVzaGVldCBpbW1lZGlhdGVseSBiZWZvcmUgZ2l2ZW4gZWxlbWVudCwgd2hlcmV2ZXIgaXQgaXMgZm91bmQuXG4gKiAqIGBzdHJpbmdgIHR5cGU6IGluamVjdHMgc3R5bGVzaGVldCBpbW1lZGlhdGVseSBiZWZvcmUgZ2l2ZW4gZmlyc3QgZWxlbWVudCBmb3VuZCB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIGNzcyBzZWxlY3Rvci5cbiAqXG4gKiBAbWVtYmVyT2YgY3NzSW5qZWN0b3JcbiAqL1xuZnVuY3Rpb24gY3NzSW5qZWN0b3IoY3NzUnVsZXMsIElELCByZWZlcmVuY2VFbGVtZW50KSB7XG4gICAgaWYgKHR5cGVvZiByZWZlcmVuY2VFbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICByZWZlcmVuY2VFbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihyZWZlcmVuY2VFbGVtZW50KTtcbiAgICAgICAgaWYgKCFyZWZlcmVuY2VFbGVtZW50KSB7XG4gICAgICAgICAgICB0aHJvdyAnQ2Fubm90IGZpbmQgcmVmZXJlbmNlIGVsZW1lbnQgZm9yIENTUyBpbmplY3Rpb24uJztcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAocmVmZXJlbmNlRWxlbWVudCAmJiAhKHJlZmVyZW5jZUVsZW1lbnQgaW5zdGFuY2VvZiBFbGVtZW50KSkge1xuICAgICAgICB0aHJvdyAnR2l2ZW4gdmFsdWUgbm90IGEgcmVmZXJlbmNlIGVsZW1lbnQuJztcbiAgICB9XG5cbiAgICB2YXIgY29udGFpbmVyID0gcmVmZXJlbmNlRWxlbWVudCAmJiByZWZlcmVuY2VFbGVtZW50LnBhcmVudE5vZGUgfHwgZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdO1xuXG4gICAgaWYgKElEKSB7XG4gICAgICAgIElEID0gY3NzSW5qZWN0b3IuaWRQcmVmaXggKyBJRDtcblxuICAgICAgICBpZiAoY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJyMnICsgSUQpKSB7XG4gICAgICAgICAgICByZXR1cm47IC8vIHN0eWxlc2hlZXQgYWxyZWFkeSBpbiBET01cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gICAgaWYgKElEKSB7XG4gICAgICAgIHN0eWxlLmlkID0gSUQ7XG4gICAgfVxuICAgIGlmIChjc3NSdWxlcyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGNzc1J1bGVzID0gY3NzUnVsZXMuam9pbignXFxuJyk7XG4gICAgfVxuICAgIGNzc1J1bGVzID0gJ1xcbicgKyBjc3NSdWxlcyArICdcXG4nO1xuICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzc1J1bGVzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzc1J1bGVzKSk7XG4gICAgfVxuXG4gICAgaWYgKHJlZmVyZW5jZUVsZW1lbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZWZlcmVuY2VFbGVtZW50ID0gY29udGFpbmVyLmZpcnN0Q2hpbGQ7XG4gICAgfVxuXG4gICAgY29udGFpbmVyLmluc2VydEJlZm9yZShzdHlsZSwgcmVmZXJlbmNlRWxlbWVudCk7XG5cbiAgICByZXR1cm4gc3R5bGU7XG59XG5cbi8qKlxuICogQHN1bW1hcnkgT3B0aW9uYWwgcHJlZml4IGZvciBgPHN0eWxlPmAgdGFnIElEcy5cbiAqIEBkZXNjIERlZmF1bHRzIHRvIGAnaW5qZWN0ZWQtc3R5bGVzaGVldC0nYC5cbiAqIEB0eXBlIHtzdHJpbmd9XG4gKiBAbWVtYmVyT2YgY3NzSW5qZWN0b3JcbiAqL1xuY3NzSW5qZWN0b3IuaWRQcmVmaXggPSAnaW5qZWN0ZWQtc3R5bGVzaGVldC0nO1xuXG4vLyBJbnRlcmZhY2Vcbm1vZHVsZS5leHBvcnRzID0gY3NzSW5qZWN0b3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKiBAbmFtZXNwYWNlIGV4dGVuZC1tZSAqKi9cblxuLyoqIEBzdW1tYXJ5IEV4dGVuZHMgYW4gZXhpc3RpbmcgY29uc3RydWN0b3IgaW50byBhIG5ldyBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcmV0dXJucyB7Q2hpbGRDb25zdHJ1Y3Rvcn0gQSBuZXcgY29uc3RydWN0b3IsIGV4dGVuZGVkIGZyb20gdGhlIGdpdmVuIGNvbnRleHQsIHBvc3NpYmx5IHdpdGggc29tZSBwcm90b3R5cGUgYWRkaXRpb25zLlxuICpcbiAqIEBkZXNjIEV4dGVuZHMgXCJvYmplY3RzXCIgKGNvbnN0cnVjdG9ycyksIHdpdGggb3B0aW9uYWwgYWRkaXRpb25hbCBjb2RlLCBvcHRpb25hbCBwcm90b3R5cGUgYWRkaXRpb25zLCBhbmQgb3B0aW9uYWwgcHJvdG90eXBlIG1lbWJlciBhbGlhc2VzLlxuICpcbiAqID4gQ0FWRUFUOiBOb3QgdG8gYmUgY29uZnVzZWQgd2l0aCBVbmRlcnNjb3JlLXN0eWxlIC5leHRlbmQoKSB3aGljaCBpcyBzb21ldGhpbmcgZWxzZSBlbnRpcmVseS4gSSd2ZSB1c2VkIHRoZSBuYW1lIFwiZXh0ZW5kXCIgaGVyZSBiZWNhdXNlIG90aGVyIHBhY2thZ2VzIChsaWtlIEJhY2tib25lLmpzKSB1c2UgaXQgdGhpcyB3YXkuIFlvdSBhcmUgZnJlZSB0byBjYWxsIGl0IHdoYXRldmVyIHlvdSB3YW50IHdoZW4geW91IFwicmVxdWlyZVwiIGl0LCBzdWNoIGFzIGB2YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdleHRlbmQnKWAuXG4gKlxuICogUHJvdmlkZSBhIGNvbnN0cnVjdG9yIGFzIHRoZSBjb250ZXh0IGFuZCBhbnkgcHJvdG90eXBlIGFkZGl0aW9ucyB5b3UgcmVxdWlyZSBpbiB0aGUgZmlyc3QgYXJndW1lbnQuXG4gKlxuICogRm9yIGV4YW1wbGUsIGlmIHlvdSB3aXNoIHRvIGJlIGFibGUgdG8gZXh0ZW5kIGBCYXNlQ29uc3RydWN0b3JgIHRvIGEgbmV3IGNvbnN0cnVjdG9yIHdpdGggcHJvdG90eXBlIG92ZXJyaWRlcyBhbmQvb3IgYWRkaXRpb25zLCBiYXNpYyB1c2FnZSBpczpcbiAqXG4gKiBgYGBqYXZhc2NyaXB0XG4gKiB2YXIgQmFzZSA9IHJlcXVpcmUoJ2V4dGVuZC1tZScpLkJhc2U7XG4gKiB2YXIgQmFzZUNvbnN0cnVjdG9yID0gQmFzZS5leHRlbmQoYmFzZVByb3RvdHlwZSk7IC8vIG1peGVzIGluIC5leHRlbmRcbiAqIHZhciBDaGlsZENvbnN0cnVjdG9yID0gQmFzZUNvbnN0cnVjdG9yLmV4dGVuZChjaGlsZFByb3RvdHlwZU92ZXJyaWRlc0FuZEFkZGl0aW9ucyk7XG4gKiB2YXIgR3JhbmRjaGlsZENvbnN0cnVjdG9yID0gQ2hpbGRDb25zdHJ1Y3Rvci5leHRlbmQoZ3JhbmRjaGlsZFByb3RvdHlwZU92ZXJyaWRlc0FuZEFkZGl0aW9ucyk7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIChgZXh0ZW5kKClgKSBpcyBhZGRlZCB0byB0aGUgbmV3IGV4dGVuZGVkIG9iamVjdCBjb25zdHJ1Y3RvciBhcyBhIHByb3BlcnR5IGAuZXh0ZW5kYCwgZXNzZW50aWFsbHkgbWFraW5nIHRoZSBvYmplY3QgY29uc3RydWN0b3IgaXRzZWxmIGVhc2lseSBcImV4dGVuZGFibGUuXCIgKE5vdGU6IFRoaXMgaXMgYSBwcm9wZXJ0eSBvZiBlYWNoIGNvbnN0cnVjdG9yIGFuZCBub3QgYSBtZXRob2Qgb2YgaXRzIHByb3RvdHlwZSEpXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IFtleHRlbmRlZENsYXNzTmFtZV0gLSBUaGlzIGlzIHNpbXBseSBhZGRlZCB0byB0aGUgcHJvdG90eXBlIGFzICQkQ0xBU1NfTkFNRS4gVXNlZnVsIGZvciBkZWJ1Z2dpbmcgYmVjYXVzZSBhbGwgZGVyaXZlZCBjb25zdHJ1Y3RvcnMgYXBwZWFyIHRvIGhhdmUgdGhlIHNhbWUgbmFtZSAoXCJDb25zdHJ1Y3RvclwiKSBpbiB0aGUgZGVidWdnZXIuIFRoaXMgcHJvcGVydHkgaXMgaWdub3JlZCB1bmxlc3MgYGV4dGVuZC5kZWJ1Z2AgaXMgZXhwbGljaXRseSBzZXQgdG8gYSB0cnV0aHkgdmFsdWUuXG4gKlxuICogQHBhcmFtIHtleHRlbmRlZFByb3RvdHlwZUFkZGl0aW9uc09iamVjdH0gW3Byb3RvdHlwZUFkZGl0aW9uc10gLSBPYmplY3Qgd2l0aCBtZW1iZXJzIHRvIGNvcHkgdG8gbmV3IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLiBNb3N0IG1lbWJlcnMgd2lsbCBiZSBjb3BpZWQgdG8gdGhlIHByb3RvdHlwZS4gU29tZSBtZW1iZXJzLCBob3dldmVyLCBoYXZlIHNwZWNpYWwgbWVhbmluZ3MgYXMgZXhwbGFpbmVkIGluIHRoZSB7QGxpbmsgZXh0ZW5kZWRQcm90b3R5cGVBZGRpdGlvbnNPYmplY3R8dHlwZSBkZWZpbml0aW9ufSAoYW5kIG1heSBvciBtYXkgbm90IGJlIGNvcGllZCB0byB0aGUgcHJvdG90eXBlKS5cbiAqXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtkZWJ1Z10gLSBTZWUgcGFyYW1ldGVyIGBleHRlbmRlZENsYXNzTmFtZWAgXyhhYm92ZSlfLlxuICpcbiAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBCYXNlIC0gQSBjb252ZW5pZW50IGJhc2UgY2xhc3MgZnJvbSB3aGljaCBhbGwgb3RoZXIgY2xhc3NlcyBjYW4gYmUgZXh0ZW5kZWQuXG4gKlxuICogQG1lbWJlck9mIGV4dGVuZC1tZVxuICovXG5mdW5jdGlvbiBleHRlbmQoZXh0ZW5kZWRDbGFzc05hbWUsIHByb3RvdHlwZUFkZGl0aW9ucykge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICBwcm90b3R5cGVBZGRpdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICBwcm90b3R5cGVBZGRpdGlvbnMgPSBleHRlbmRlZENsYXNzTmFtZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvdG90eXBlQWRkaXRpb25zICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHRocm93ICdTaW5nbGUgcGFyYW1ldGVyIG92ZXJsb2FkIG11c3QgYmUgb2JqZWN0Lic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBleHRlbmRlZENsYXNzTmFtZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4dGVuZGVkQ2xhc3NOYW1lICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcHJvdG90eXBlQWRkaXRpb25zICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHRocm93ICdUd28gcGFyYW1ldGVyIG92ZXJsb2FkIG11c3QgYmUgc3RyaW5nLCBvYmplY3QuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgJ1RvbyBtYW55IHBhcmFtZXRlcnMnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIENvbnN0cnVjdG9yKCkge1xuICAgICAgICBpZiAocHJvdG90eXBlQWRkaXRpb25zLnByZUluaXRpYWxpemUpIHtcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucy5wcmVJbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cblxuICAgICAgICBpbml0aWFsaXplUHJvdG90eXBlQ2hhaW4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgICBpZiAocHJvdG90eXBlQWRkaXRpb25zLnBvc3RJbml0aWFsaXplKSB7XG4gICAgICAgICAgICBwcm90b3R5cGVBZGRpdGlvbnMucG9zdEluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIENvbnN0cnVjdG9yLmV4dGVuZCA9IGV4dGVuZDtcblxuICAgIHZhciBwcm90b3R5cGUgPSBDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHRoaXMucHJvdG90eXBlKTtcbiAgICBwcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcblxuICAgIGlmIChleHRlbmRlZENsYXNzTmFtZSAmJiBleHRlbmQuZGVidWcpIHtcbiAgICAgICAgcHJvdG90eXBlLiQkQ0xBU1NfTkFNRSA9IGV4dGVuZGVkQ2xhc3NOYW1lO1xuICAgIH1cblxuICAgIGZvciAodmFyIGtleSBpbiBwcm90b3R5cGVBZGRpdGlvbnMpIHtcbiAgICAgICAgaWYgKHByb3RvdHlwZUFkZGl0aW9ucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm90b3R5cGVBZGRpdGlvbnNba2V5XTtcbiAgICAgICAgICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnaW5pdGlhbGl6ZU93bic6XG4gICAgICAgICAgICAgICAgICAgIC8vIGFscmVhZHkgY2FsbGVkIGFib3ZlOyBub3QgbmVlZGVkIGluIHByb3RvdHlwZVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdhbGlhc2VzJzpcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgYWxpYXMgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5oYXNPd25Qcm9wZXJ0eShhbGlhcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYWtlQWxpYXModmFsdWVbYWxpYXNdLCBhbGlhcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWVbMF0gPT09ICcjJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFrZUFsaWFzKHZhbHVlLCBrZXkuc3Vic3RyKDEpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvdHlwZVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBDb25zdHJ1Y3RvcjtcblxuICAgIGZ1bmN0aW9uIG1ha2VBbGlhcyh2YWx1ZSwga2V5KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICAgIHByb3RvdHlwZVtrZXldID0gcHJvdG90eXBlQWRkaXRpb25zW3ZhbHVlXTtcbiAgICB9XG59XG5cbmV4dGVuZC5CYXNlID0gZnVuY3Rpb24gKCkge307XG5leHRlbmQuQmFzZS5leHRlbmQgPSBleHRlbmQ7XG5cbi8qKiBAdHlwZWRlZiB7ZnVuY3Rpb259IGV4dGVuZGVkQ29uc3RydWN0b3JcbiAqIEBwcm9wZXJ0eSBwcm90b3R5cGUuc3VwZXIgLSBBIHJlZmVyZW5jZSB0byB0aGUgcHJvdG90eXBlIHRoaXMgY29uc3RydWN0b3Igd2FzIGV4dGVuZGVkIGZyb20uXG4gKiBAcHJvcGVydHkgW2V4dGVuZF0gLSBJZiBgcHJvdG90eXBlQWRkaXRpb25zLmV4dGVuZGFibGVgIHdhcyB0cnV0aHksIHRoaXMgd2lsbCBiZSBhIHJlZmVyZW5jZSB0byB7QGxpbmsgZXh0ZW5kLmV4dGVuZHxleHRlbmR9LlxuICovXG5cbi8qKiBAdHlwZWRlZiB7b2JqZWN0fSBleHRlbmRlZFByb3RvdHlwZUFkZGl0aW9uc09iamVjdFxuICogQHByb3BlcnR5IHtmdW5jdGlvbn0gW2luaXRpYWxpemVdIC0gQWRkaXRpb25hbCBjb25zdHJ1Y3RvciBjb2RlIGZvciBuZXcgb2JqZWN0LiBUaGlzIG1ldGhvZCBpcyBhZGRlZCB0byB0aGUgbmV3IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLiBHZXRzIHBhc3NlZCBuZXcgb2JqZWN0IGFzIGNvbnRleHQgKyBzYW1lIGFyZ3MgYXMgY29uc3RydWN0b3IgaXRzZWxmLiBDYWxsZWQgb24gaW5zdGFudGlhdGlvbiBhZnRlciBzaW1pbGFyIGZ1bmN0aW9uIGluIGFsbCBhbmNlc3RvcnMgY2FsbGVkIHdpdGggc2FtZSBzaWduYXR1cmUuXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9ufSBbaW5pdGlhbGl6ZU93bl0gLSBBZGRpdGlvbmFsIGNvbnN0cnVjdG9yIGNvZGUgZm9yIG5ldyBvYmplY3QuIFRoaXMgbWV0aG9kIGlzIGFkZGVkIHRvIHRoZSBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIEdldHMgcGFzc2VkIG5ldyBvYmplY3QgYXMgY29udGV4dCArIHNhbWUgYXJncyBhcyBjb25zdHJ1Y3RvciBpdHNlbGYuIENhbGxlZCBvbiBpbnN0YW50aWF0aW9uIGFmdGVyIChhbGwpIHRoZSBgaW5pdGlhbGl6ZWAgZnVuY3Rpb24ocykuXG4gKiBAcHJvcGVydHkge29iamVjdH0gW2FsaWFzZXNdIC0gSGFzaCBvZiBhbGlhc2VzIGZvciBwcm90b3R5cGUgbWVtYmVycyBpbiBmb3JtIGB7IGtleTogJ21lbWJlcicsIC4uLiB9YCB3aGVyZSBga2V5YCBpcyB0aGUgbmFtZSBvZiBhbiBhbGllYXMgYW5kIGAnbWVtYmVyJ2AgaXMgdGhlIG5hbWUgb2YgYW4gZXhpc3RpbmcgbWVtYmVyIGluIHRoZSBwcm90b3R5cGUuIEVhY2ggc3VjaCBrZXkgaXMgYWRkZWQgdG8gdGhlIHByb3RvdHlwZSBhcyBhIHJlZmVyZW5jZSB0byB0aGUgbmFtZWQgbWVtYmVyLiAoVGhlIGBhbGlhc2VzYCBvYmplY3QgaXRzZWxmIGlzICpub3QqIGFkZGVkIHRvIHByb3RvdHlwZS4pIEFsdGVybmF0aXZlbHk6XG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2tleXNdIC0gQXJiaXRyYXJ5IHByb3BlcnR5IG5hbWVzIGRlZmluZWQgaGVyZSB3aXRoIHN0cmluZyB2YWx1ZXMgc3RhcnRpbmcgd2l0aCBhIGAjYCBjaGFyYWN0ZXIgd2lsbCBhbGlhcyB0aGUgYWN0dWFsIHByb3BlcnRpZXMgbmFtZWQgaW4gdGhlIHN0cmluZ3MgKGZvbGxvd2luZyB0aGUgYCNgKS4gVGhpcyBpcyBhbiBhbHRlcm5hdGl2ZSB0byBwcm92aWRpbmcgYW4gYGFsaWFzZXNgIGhhc2gsIHBlcmhhcHMgc2ltcGxlciAodGhvdWdoIHN1YnRsZXIpLiAoVXNlIGFyYml0cmFyeSBpZGVudGlmaWVycyBoZXJlOyBkb24ndCB1c2UgdGhlIG5hbWUgYGtleXNgISlcbiAqIEBwcm9wZXJ0eSB7Kn0gW2FyYml0cmFyeVByb3BlcnRpZXNdIC0gQW55IGFkZGl0aW9uYWwgYXJiaXRyYXJ5IHByb3BlcnRpZXMgZGVmaW5lZCBoZXJlIHdpbGwgYmUgYWRkZWQgdG8gdGhlIG5ldyBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS4gKFVzZSBhcmJpdHJhcnkgaWRlbnRpZmllcnMgaGVyZTsgZG9uJ3QgdXNlIHRoZSBuYW1lIGBhcmliaXRyYXJ5UHJvcGVydGllc2AhKVxuICovXG5cbi8qKiBAc3VtbWFyeSBDYWxsIGFsbCBgaW5pdGlhbGl6ZWAgbWV0aG9kcyBmb3VuZCBpbiBwcm90b3R5cGUgY2hhaW4uXG4gKiBAZGVzYyBUaGlzIHJlY3Vyc2l2ZSByb3V0aW5lIGlzIGNhbGxlZCBieSB0aGUgY29uc3RydWN0b3IuXG4gKiAxLiBXYWxrcyBiYWNrIHRoZSBwcm90b3R5cGUgY2hhaW4gdG8gYE9iamVjdGAncyBwcm90b3R5cGVcbiAqIDIuIFdhbGtzIGZvcndhcmQgdG8gbmV3IG9iamVjdCwgY2FsbGluZyBhbnkgYGluaXRpYWxpemVgIG1ldGhvZHMgaXQgZmluZHMgYWxvbmcgdGhlIHdheSB3aXRoIHRoZSBzYW1lIGNvbnRleHQgYW5kIGFyZ3VtZW50cyB3aXRoIHdoaWNoIHRoZSBjb25zdHJ1Y3RvciB3YXMgY2FsbGVkLlxuICogQHByaXZhdGVcbiAqIEBtZW1iZXJPZiBleHRlbmQtbWVcbiAqL1xuZnVuY3Rpb24gaW5pdGlhbGl6ZVByb3RvdHlwZUNoYWluKCkge1xuICAgIHZhciB0ZXJtID0gdGhpcyxcbiAgICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICByZWN1cih0ZXJtKTtcblxuICAgIGZ1bmN0aW9uIHJlY3VyKG9iaikge1xuICAgICAgICB2YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKTtcbiAgICAgICAgaWYgKHByb3RvLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcbiAgICAgICAgICAgIHJlY3VyKHByb3RvKTtcbiAgICAgICAgICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnaW5pdGlhbGl6ZScpKSB7XG4gICAgICAgICAgICAgICAgcHJvdG8uaW5pdGlhbGl6ZS5hcHBseSh0ZXJtLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBleHRlbmQ7XG4iLCIvKiBvYmplY3QtaXRlcmF0b3JzLmpzIC0gTWluaSBVbmRlcnNjb3JlIGxpYnJhcnlcbiAqIGJ5IEpvbmF0aGFuIEVpdGVuXG4gKlxuICogVGhlIG1ldGhvZHMgYmVsb3cgb3BlcmF0ZSBvbiBvYmplY3RzIChidXQgbm90IGFycmF5cykgc2ltaWxhcmx5XG4gKiB0byBVbmRlcnNjb3JlIChodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jY29sbGVjdGlvbnMpLlxuICpcbiAqIEZvciBtb3JlIGluZm9ybWF0aW9uOlxuICogaHR0cHM6Ly9naXRodWIuY29tL2pvbmVpdC9vYmplY3QtaXRlcmF0b3JzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQHN1bW1hcnkgV3JhcCBhbiBvYmplY3QgZm9yIG9uZSBtZXRob2QgY2FsbC5cbiAqIEBEZXNjIE5vdGUgdGhhdCB0aGUgYG5ld2Aga2V5d29yZCBpcyBub3QgbmVjZXNzYXJ5LlxuICogQHBhcmFtIHtvYmplY3R8bnVsbHx1bmRlZmluZWR9IG9iamVjdCAtIGBudWxsYCBvciBgdW5kZWZpbmVkYCBpcyB0cmVhdGVkIGFzIGFuIGVtcHR5IHBsYWluIG9iamVjdC5cbiAqIEByZXR1cm4ge1dyYXBwZXJ9IFRoZSB3cmFwcGVkIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gV3JhcHBlcihvYmplY3QpIHtcbiAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgV3JhcHBlcikge1xuICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV3JhcHBlcikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXcmFwcGVyKG9iamVjdCk7XG4gICAgfVxuICAgIHRoaXMub3JpZ2luYWxWYWx1ZSA9IG9iamVjdDtcbiAgICB0aGlzLm8gPSBvYmplY3QgfHwge307XG59XG5cbi8qKlxuICogQG5hbWUgV3JhcHBlci5jaGFpblxuICogQHN1bW1hcnkgV3JhcCBhbiBvYmplY3QgZm9yIGEgY2hhaW4gb2YgbWV0aG9kIGNhbGxzLlxuICogQERlc2MgQ2FsbHMgdGhlIGNvbnN0cnVjdG9yIGBXcmFwcGVyKClgIGFuZCBtb2RpZmllcyB0aGUgd3JhcHBlciBmb3IgY2hhaW5pbmcuXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqZWN0XG4gKiBAcmV0dXJuIHtXcmFwcGVyfSBUaGUgd3JhcHBlZCBvYmplY3QuXG4gKi9cbldyYXBwZXIuY2hhaW4gPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgdmFyIHdyYXBwZWQgPSBXcmFwcGVyKG9iamVjdCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbmV3LWNhcFxuICAgIHdyYXBwZWQuY2hhaW5pbmcgPSB0cnVlO1xuICAgIHJldHVybiB3cmFwcGVkO1xufTtcblxuV3JhcHBlci5wcm90b3R5cGUgPSB7XG4gICAgLyoqXG4gICAgICogVW53cmFwIGFuIG9iamVjdCB3cmFwcGVkIHdpdGgge0BsaW5rIFdyYXBwZXIuY2hhaW58V3JhcHBlci5jaGFpbigpfS5cbiAgICAgKiBAcmV0dXJuIHtvYmplY3R8bnVsbHx1bmRlZmluZWR9IFRoZSB2YWx1ZSBvcmlnaW5hbGx5IHdyYXBwZWQgYnkgdGhlIGNvbnN0cnVjdG9yLlxuICAgICAqIEBtZW1iZXJPZiBXcmFwcGVyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9yaWdpbmFsVmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBkZXNjIE1pbWljcyBVbmRlcnNjb3JlJ3MgW2VhY2hdKGh0dHA6Ly91bmRlcnNjb3JlanMub3JnLyNlYWNoKSBtZXRob2Q6IEl0ZXJhdGUgb3ZlciB0aGUgbWVtYmVycyBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIGNhbGxpbmcgYGl0ZXJhdGVlKClgIHdpdGggZWFjaC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBpdGVyYXRlZSAtIEZvciBlYWNoIG1lbWJlciBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggdGhyZWUgYXJndW1lbnRzOiBgKHZhbHVlLCBrZXksIG9iamVjdClgLiBUaGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgZnVuY3Rpb24gaXMgdW5kZWZpbmVkOyBhbiBgLmVhY2hgIGxvb3AgY2Fubm90IGJlIGJyb2tlbiBvdXQgb2YgKHVzZSB7QGxpbmsgV3JhcHBlciNmaW5kfC5maW5kfSBpbnN0ZWFkKS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIC0gSWYgZ2l2ZW4sIGBpdGVyYXRlZWAgaXMgYm91bmQgdG8gdGhpcyBvYmplY3QuIEluIG90aGVyIHdvcmRzLCB0aGlzIG9iamVjdCBiZWNvbWVzIHRoZSBgdGhpc2AgdmFsdWUgaW4gdGhlIGNhbGxzIHRvIGBpdGVyYXRlZWAuIChPdGhlcndpc2UsIHRoZSBgdGhpc2AgdmFsdWUgd2lsbCBiZSB0aGUgdW53cmFwcGVkIG9iamVjdC4pXG4gICAgICogQHJldHVybiB7V3JhcHBlcn0gVGhlIHdyYXBwZWQgb2JqZWN0IGZvciBjaGFpbmluZy5cbiAgICAgKiBAbWVtYmVyT2YgV3JhcHBlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBlYWNoOiBmdW5jdGlvbiAoaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIG8gPSB0aGlzLm87XG4gICAgICAgIE9iamVjdC5rZXlzKG8pLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgaXRlcmF0ZWUuY2FsbCh0aGlzLCBvW2tleV0sIGtleSwgbyk7XG4gICAgICAgIH0sIGNvbnRleHQgfHwgbyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBNaW1pY3MgVW5kZXJzY29yZSdzIFtmaW5kXShodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jZmluZCkgbWV0aG9kOiBMb29rIHRocm91Z2ggZWFjaCBtZW1iZXIgb2YgdGhlIHdyYXBwZWQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIGZpcnN0IG9uZSB0aGF0IHBhc3NlcyBhIHRydXRoIHRlc3QgKGBwcmVkaWNhdGVgKSwgb3IgYHVuZGVmaW5lZGAgaWYgbm8gdmFsdWUgcGFzc2VzIHRoZSB0ZXN0LiBUaGUgZnVuY3Rpb24gcmV0dXJucyB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IGFjY2VwdGFibGUgbWVtYmVyLCBhbmQgZG9lc24ndCBuZWNlc3NhcmlseSB0cmF2ZXJzZSB0aGUgZW50aXJlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcmVkaWNhdGUgLSBGb3IgZWFjaCBtZW1iZXIgb2YgdGhlIHdyYXBwZWQgb2JqZWN0LCB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogYCh2YWx1ZSwga2V5LCBvYmplY3QpYC4gVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIGZ1bmN0aW9uIHNob3VsZCBiZSB0cnV0aHkgaWYgdGhlIG1lbWJlciBwYXNzZXMgdGhlIHRlc3QgYW5kIGZhbHN5IG90aGVyd2lzZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIC0gSWYgZ2l2ZW4sIGBwcmVkaWNhdGVgIGlzIGJvdW5kIHRvIHRoaXMgb2JqZWN0LiBJbiBvdGhlciB3b3JkcywgdGhpcyBvYmplY3QgYmVjb21lcyB0aGUgYHRoaXNgIHZhbHVlIGluIHRoZSBjYWxscyB0byBgcHJlZGljYXRlYC4gKE90aGVyd2lzZSwgdGhlIGB0aGlzYCB2YWx1ZSB3aWxsIGJlIHRoZSB1bndyYXBwZWQgb2JqZWN0LilcbiAgICAgKiBAcmV0dXJuIHsqfSBUaGUgZm91bmQgcHJvcGVydHkncyB2YWx1ZSwgb3IgdW5kZWZpbmVkIGlmIG5vdCBmb3VuZC5cbiAgICAgKiBAbWVtYmVyT2YgV3JhcHBlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBmaW5kOiBmdW5jdGlvbiAocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICBpZiAobykge1xuICAgICAgICAgICAgcmVzdWx0ID0gT2JqZWN0LmtleXMobykuZmluZChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByZWRpY2F0ZS5jYWxsKHRoaXMsIG9ba2V5XSwga2V5LCBvKTtcbiAgICAgICAgICAgIH0sIGNvbnRleHQgfHwgbyk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBvW3Jlc3VsdF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgTWltaWNzIFVuZGVyc2NvcmUncyBbZmlsdGVyXShodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jZmlsdGVyKSBtZXRob2Q6IExvb2sgdGhyb3VnaCBlYWNoIG1lbWJlciBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIHJldHVybmluZyB0aGUgdmFsdWVzIG9mIGFsbCBtZW1iZXJzIHRoYXQgcGFzcyBhIHRydXRoIHRlc3QgKGBwcmVkaWNhdGVgKSwgb3IgZW1wdHkgYXJyYXkgaWYgbm8gdmFsdWUgcGFzc2VzIHRoZSB0ZXN0LiBUaGUgZnVuY3Rpb24gYWx3YXlzIHRyYXZlcnNlcyB0aGUgZW50aXJlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcmVkaWNhdGUgLSBGb3IgZWFjaCBtZW1iZXIgb2YgdGhlIHdyYXBwZWQgb2JqZWN0LCB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogYCh2YWx1ZSwga2V5LCBvYmplY3QpYC4gVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIGZ1bmN0aW9uIHNob3VsZCBiZSB0cnV0aHkgaWYgdGhlIG1lbWJlciBwYXNzZXMgdGhlIHRlc3QgYW5kIGZhbHN5IG90aGVyd2lzZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIC0gSWYgZ2l2ZW4sIGBwcmVkaWNhdGVgIGlzIGJvdW5kIHRvIHRoaXMgb2JqZWN0LiBJbiBvdGhlciB3b3JkcywgdGhpcyBvYmplY3QgYmVjb21lcyB0aGUgYHRoaXNgIHZhbHVlIGluIHRoZSBjYWxscyB0byBgcHJlZGljYXRlYC4gKE90aGVyd2lzZSwgdGhlIGB0aGlzYCB2YWx1ZSB3aWxsIGJlIHRoZSB1bndyYXBwZWQgb2JqZWN0LilcbiAgICAgKiBAcmV0dXJuIHsqfSBBbiBhcnJheSBjb250YWluaW5nIHRoZSBmaWx0ZXJlZCB2YWx1ZXMuXG4gICAgICogQG1lbWJlck9mIFdyYXBwZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgZmlsdGVyOiBmdW5jdGlvbiAocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIGlmIChvKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhvKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpcywgb1trZXldLCBrZXksIG8pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKG9ba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgY29udGV4dCB8fCBvKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBNaW1pY3MgVW5kZXJzY29yZSdzIFttYXBdKGh0dHA6Ly91bmRlcnNjb3JlanMub3JnLyNtYXApIG1ldGhvZDogUHJvZHVjZXMgYSBuZXcgYXJyYXkgb2YgdmFsdWVzIGJ5IG1hcHBpbmcgZWFjaCB2YWx1ZSBpbiBsaXN0IHRocm91Z2ggYSB0cmFuc2Zvcm1hdGlvbiBmdW5jdGlvbiAoYGl0ZXJhdGVlYCkuIFRoZSBmdW5jdGlvbiBhbHdheXMgdHJhdmVyc2VzIHRoZSBlbnRpcmUgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGl0ZXJhdGVlIC0gRm9yIGVhY2ggbWVtYmVyIG9mIHRoZSB3cmFwcGVkIG9iamVjdCwgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM6IGAodmFsdWUsIGtleSwgb2JqZWN0KWAuIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBmdW5jdGlvbiBpcyBjb25jYXRlbmF0ZWQgdG8gdGhlIGVuZCBvZiB0aGUgbmV3IGFycmF5LlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dF0gLSBJZiBnaXZlbiwgYGl0ZXJhdGVlYCBpcyBib3VuZCB0byB0aGlzIG9iamVjdC4gSW4gb3RoZXIgd29yZHMsIHRoaXMgb2JqZWN0IGJlY29tZXMgdGhlIGB0aGlzYCB2YWx1ZSBpbiB0aGUgY2FsbHMgdG8gYHByZWRpY2F0ZWAuIChPdGhlcndpc2UsIHRoZSBgdGhpc2AgdmFsdWUgd2lsbCBiZSB0aGUgdW53cmFwcGVkIG9iamVjdC4pXG4gICAgICogQHJldHVybiB7Kn0gQW4gYXJyYXkgY29udGFpbmluZyB0aGUgZmlsdGVyZWQgdmFsdWVzLlxuICAgICAqIEBtZW1iZXJPZiBXcmFwcGVyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIG1hcDogZnVuY3Rpb24gKGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIGlmIChvKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhvKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChpdGVyYXRlZS5jYWxsKHRoaXMsIG9ba2V5XSwga2V5LCBvKSk7XG4gICAgICAgICAgICB9LCBjb250ZXh0IHx8IG8pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBkZXNjIE1pbWljcyBVbmRlcnNjb3JlJ3MgW3JlZHVjZV0oaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvI3JlZHVjZSkgbWV0aG9kOiBCb2lsIGRvd24gdGhlIHZhbHVlcyBvZiBhbGwgdGhlIG1lbWJlcnMgb2YgdGhlIHdyYXBwZWQgb2JqZWN0IGludG8gYSBzaW5nbGUgdmFsdWUuIGBtZW1vYCBpcyB0aGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWN0aW9uLCBhbmQgZWFjaCBzdWNjZXNzaXZlIHN0ZXAgb2YgaXQgc2hvdWxkIGJlIHJldHVybmVkIGJ5IGBpdGVyYXRlZSgpYC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBpdGVyYXRlZSAtIEZvciBlYWNoIG1lbWJlciBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggZm91ciBhcmd1bWVudHM6IGAobWVtbywgdmFsdWUsIGtleSwgb2JqZWN0KWAuIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBmdW5jdGlvbiBiZWNvbWVzIHRoZSBuZXcgdmFsdWUgb2YgYG1lbW9gIGZvciB0aGUgbmV4dCBpdGVyYXRpb24uXG4gICAgICogQHBhcmFtIHsqfSBbbWVtb10gLSBJZiBubyBtZW1vIGlzIHBhc3NlZCB0byB0aGUgaW5pdGlhbCBpbnZvY2F0aW9uIG9mIHJlZHVjZSwgdGhlIGl0ZXJhdGVlIGlzIG5vdCBpbnZva2VkIG9uIHRoZSBmaXJzdCBlbGVtZW50IG9mIHRoZSBsaXN0LiBUaGUgZmlyc3QgZWxlbWVudCBpcyBpbnN0ZWFkIHBhc3NlZCBhcyB0aGUgbWVtbyBpbiB0aGUgaW52b2NhdGlvbiBvZiB0aGUgaXRlcmF0ZWUgb24gdGhlIG5leHQgZWxlbWVudCBpbiB0aGUgbGlzdC5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIC0gSWYgZ2l2ZW4sIGBpdGVyYXRlZWAgaXMgYm91bmQgdG8gdGhpcyBvYmplY3QuIEluIG90aGVyIHdvcmRzLCB0aGlzIG9iamVjdCBiZWNvbWVzIHRoZSBgdGhpc2AgdmFsdWUgaW4gdGhlIGNhbGxzIHRvIGBpdGVyYXRlZWAuIChPdGhlcndpc2UsIHRoZSBgdGhpc2AgdmFsdWUgd2lsbCBiZSB0aGUgdW53cmFwcGVkIG9iamVjdC4pXG4gICAgICogQHJldHVybiB7Kn0gVGhlIHZhbHVlIG9mIGBtZW1vYCBcInJlZHVjZWRcIiBhcyBwZXIgYGl0ZXJhdGVlYC5cbiAgICAgKiBAbWVtYmVyT2YgV3JhcHBlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICByZWR1Y2U6IGZ1bmN0aW9uIChpdGVyYXRlZSwgbWVtbywgY29udGV4dCkge1xuICAgICAgICB2YXIgbyA9IHRoaXMubztcbiAgICAgICAgaWYgKG8pIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG8pLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaWR4KSB7XG4gICAgICAgICAgICAgICAgbWVtbyA9ICghaWR4ICYmIG1lbW8gPT09IHVuZGVmaW5lZCkgPyBvW2tleV0gOiBpdGVyYXRlZShtZW1vLCBvW2tleV0sIGtleSwgbyk7XG4gICAgICAgICAgICB9LCBjb250ZXh0IHx8IG8pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtZW1vO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBNaW1pY3MgVW5kZXJzY29yZSdzIFtleHRlbmRdKGh0dHA6Ly91bmRlcnNjb3JlanMub3JnLyNleHRlbmQpIG1ldGhvZDogQ29weSBhbGwgb2YgdGhlIHByb3BlcnRpZXMgaW4gZWFjaCBvZiB0aGUgYHNvdXJjZWAgb2JqZWN0IHBhcmFtZXRlcihzKSBvdmVyIHRvIHRoZSAod3JhcHBlZCkgZGVzdGluYXRpb24gb2JqZWN0ICh0aHVzIG11dGF0aW5nIGl0KS4gSXQncyBpbi1vcmRlciwgc28gdGhlIHByb3BlcnRpZXMgb2YgdGhlIGxhc3QgYHNvdXJjZWAgb2JqZWN0IHdpbGwgb3ZlcnJpZGUgcHJvcGVydGllcyB3aXRoIHRoZSBzYW1lIG5hbWUgaW4gcHJldmlvdXMgYXJndW1lbnRzIG9yIGluIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogPiBUaGlzIG1ldGhvZCBjb3BpZXMgb3duIG1lbWJlcnMgYXMgd2VsbCBhcyBtZW1iZXJzIGluaGVyaXRlZCBmcm9tIHByb3RvdHlwZSBjaGFpbi5cbiAgICAgKiBAcGFyYW0gey4uLm9iamVjdHxudWxsfHVuZGVmaW5lZH0gc291cmNlIC0gVmFsdWVzIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBhcmUgdHJlYXRlZCBhcyBlbXB0eSBwbGFpbiBvYmplY3RzLlxuICAgICAqIEByZXR1cm4ge1dyYXBwZXJ8b2JqZWN0fSBUaGUgd3JhcHBlZCBkZXN0aW5hdGlvbiBvYmplY3QgaWYgY2hhaW5pbmcgaXMgaW4gZWZmZWN0OyBvdGhlcndpc2UgdGhlIHVud3JhcHBlZCBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogQG1lbWJlck9mIFdyYXBwZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgZXh0ZW5kOiBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLmZvckVhY2goZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKG9iamVjdCkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgb1trZXldID0gb2JqZWN0W2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hhaW5pbmcgPyB0aGlzIDogbztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgTWltaWNzIFVuZGVyc2NvcmUncyBbZXh0ZW5kT3duXShodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jZXh0ZW5kT3duKSBtZXRob2Q6IExpa2Uge0BsaW5rIFdyYXBwZXIjZXh0ZW5kfGV4dGVuZH0sIGJ1dCBvbmx5IGNvcGllcyBpdHMgXCJvd25cIiBwcm9wZXJ0aWVzIG92ZXIgdG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gey4uLm9iamVjdHxudWxsfHVuZGVmaW5lZH0gc291cmNlIC0gVmFsdWVzIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBhcmUgdHJlYXRlZCBhcyBlbXB0eSBwbGFpbiBvYmplY3RzLlxuICAgICAqIEByZXR1cm4ge1dyYXBwZXJ8b2JqZWN0fSBUaGUgd3JhcHBlZCBkZXN0aW5hdGlvbiBvYmplY3QgaWYgY2hhaW5pbmcgaXMgaW4gZWZmZWN0OyBvdGhlcndpc2UgdGhlIHVud3JhcHBlZCBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogQG1lbWJlck9mIFdyYXBwZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgZXh0ZW5kT3duOiBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLmZvckVhY2goZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICAgICAgV3JhcHBlcihvYmplY3QpLmVhY2goZnVuY3Rpb24gKHZhbCwga2V5KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbmV3LWNhcFxuICAgICAgICAgICAgICAgIG9ba2V5XSA9IHZhbDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hhaW5pbmcgPyB0aGlzIDogbztcbiAgICB9XG59O1xuXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9maW5kXG5pZiAoIUFycmF5LnByb3RvdHlwZS5maW5kKSB7XG4gICAgQXJyYXkucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbiAocHJlZGljYXRlKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZXh0ZW5kLW5hdGl2ZVxuICAgICAgICBpZiAodGhpcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkucHJvdG90eXBlLmZpbmQgY2FsbGVkIG9uIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBwcmVkaWNhdGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGlzdCA9IE9iamVjdCh0aGlzKTtcbiAgICAgICAgdmFyIGxlbmd0aCA9IGxpc3QubGVuZ3RoID4+PiAwO1xuICAgICAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICAgICAgdmFyIHZhbHVlO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhbHVlID0gbGlzdFtpXTtcbiAgICAgICAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSwgbGlzdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdyYXBwZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciAvLyBhIHJlZ2V4IHNlYXJjaCBwYXR0ZXJuIHRoYXQgbWF0Y2hlcyBhbGwgdGhlIHJlc2VydmVkIGNoYXJzIG9mIGEgcmVnZXggc2VhcmNoIHBhdHRlcm5cbiAgICByZXNlcnZlZCA9IC8oW1xcLlxcXFxcXCtcXCpcXD9cXF5cXCRcXChcXClcXHtcXH1cXD1cXCFcXDxcXD5cXHxcXDpcXFtcXF1dKS9nLFxuXG4gICAgLy8gcmVnZXggd2lsZGNhcmQgc2VhcmNoIHBhdHRlcm5zXG4gICAgUkVHRVhQX1dJTERDQVJEID0gJy4qJyxcbiAgICBSRUdFWFBfV0lMRENIQVIgPSAnLicsXG4gICAgUkVHRVhQX1dJTERDQVJEX01BVENIRVIgPSAnKCcgKyBSRUdFWFBfV0lMRENBUkQgKyAnKScsXG5cbiAgICAvLyBMSUtFIHNlYXJjaCBwYXR0ZXJuc1xuICAgIExJS0VfV0lMRENIQVIgPSAnXycsXG4gICAgTElLRV9XSUxEQ0FSRCA9ICclJyxcblxuICAgIC8vIHJlZ2V4IHNlYXJjaCBwYXR0ZXJucyB0aGF0IG1hdGNoIExJS0Ugc2VhcmNoIHBhdHRlcm5zXG4gICAgUkVHRVhQX0xJS0VfUEFUVEVSTl9NQVRDSEVSID0gbmV3IFJlZ0V4cCgnKCcgKyBbXG4gICAgICAgIExJS0VfV0lMRENIQVIsXG4gICAgICAgIExJS0VfV0lMRENBUkQsXG4gICAgICAgICdcXFxcW1xcXFxeP1teLVxcXFxdXStdJywgLy8gbWF0Y2hlcyBhIExJS0Ugc2V0IChzYW1lIHN5bnRheCBhcyBhIFJlZ0V4cCBzZXQpXG4gICAgICAgICdcXFxcW1xcXFxeP1teLVxcXFxdXVxcXFwtW15cXFxcXV1dJyAvLyBtYXRjaGVzIGEgTElLRSByYW5nZSAoc2FtZSBzeW50YXggYXMgYSBSZWdFeHAgcmFuZ2UpXG4gICAgXS5qb2luKCd8JykgKyAnKScsICdnJyk7XG5cbmZ1bmN0aW9uIHJlZ0V4cExJS0UocGF0dGVybiwgaWdub3JlQ2FzZSkge1xuICAgIHZhciBpLCBwYXJ0cztcblxuICAgIC8vIEZpbmQgYWxsIExJS0UgcGF0dGVybnNcbiAgICBwYXJ0cyA9IHBhdHRlcm4ubWF0Y2goUkVHRVhQX0xJS0VfUEFUVEVSTl9NQVRDSEVSKTtcblxuICAgIGlmIChwYXJ0cykge1xuICAgICAgICAvLyBUcmFuc2xhdGUgZm91bmQgTElLRSBwYXR0ZXJucyB0byByZWdleCBwYXR0ZXJucywgZXNjYXBlZCBpbnRlcnZlbmluZyBub24tcGF0dGVybnMsIGFuZCBpbnRlcmxlYXZlIHRoZSB0d29cblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIC8vIEVzY2FwZSBsZWZ0IGJyYWNrZXRzICh1bnBhaXJlZCByaWdodCBicmFja2V0cyBhcmUgT0spXG4gICAgICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09ICdbJykge1xuICAgICAgICAgICAgICAgIHBhcnRzW2ldID0gcmVnRXhwTElLRS5yZXNlcnZlKHBhcnRzW2ldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSBlYWNoIGZvdW5kIHBhdHRlcm4gbWF0Y2hhYmxlIGJ5IGVuY2xvc2luZyBpbiBwYXJlbnRoZXNlc1xuICAgICAgICAgICAgcGFydHNbaV0gPSAnKCcgKyBwYXJ0c1tpXSArICcpJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hdGNoIHRoZXNlIHByZWNpc2UgcGF0dGVybnMgYWdhaW4gd2l0aCB0aGVpciBpbnRlcnZlbmluZyBub24tcGF0dGVybnMgKGkuZS4sIHRleHQpXG4gICAgICAgIHBhcnRzID0gcGF0dGVybi5tYXRjaChuZXcgUmVnRXhwKFxuICAgICAgICAgICAgUkVHRVhQX1dJTERDQVJEX01BVENIRVIgK1xuICAgICAgICAgICAgcGFydHMuam9pbihSRUdFWFBfV0lMRENBUkRfTUFUQ0hFUikgICtcbiAgICAgICAgICAgIFJFR0VYUF9XSUxEQ0FSRF9NQVRDSEVSXG4gICAgICAgICkpO1xuXG4gICAgICAgIC8vIERpc2NhcmQgZmlyc3QgbWF0Y2ggb2Ygbm9uLWdsb2JhbCBzZWFyY2ggKHdoaWNoIGlzIHRoZSB3aG9sZSBzdHJpbmcpXG4gICAgICAgIHBhcnRzLnNoaWZ0KCk7XG5cbiAgICAgICAgLy8gRm9yIGVhY2ggcmUtZm91bmQgcGF0dGVybiBwYXJ0LCB0cmFuc2xhdGUgJSBhbmQgXyB0byByZWdleCBlcXVpdmFsZW50XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBwYXJ0cy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICAgICAgdmFyIHBhcnQgPSBwYXJ0c1tpXTtcbiAgICAgICAgICAgIHN3aXRjaCAocGFydCkge1xuICAgICAgICAgICAgICAgIGNhc2UgTElLRV9XSUxEQ0FSRDogcGFydCA9IFJFR0VYUF9XSUxEQ0FSRDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBMSUtFX1dJTERDSEFSOiBwYXJ0ID0gUkVHRVhQX1dJTERDSEFSOyBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB2YXIgaiA9IHBhcnRbMV0gPT09ICdeJyA/IDIgOiAxO1xuICAgICAgICAgICAgICAgICAgICBwYXJ0ID0gJ1snICsgcmVnRXhwTElLRS5yZXNlcnZlKHBhcnQuc3Vic3RyKGosIHBhcnQubGVuZ3RoIC0gKGogKyAxKSkpICsgJ10nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGFydHNbaV0gPSBwYXJ0O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGFydHMgPSBbcGF0dGVybl07XG4gICAgfVxuXG4gICAgLy8gRm9yIGVhY2ggc3Vycm91bmRpbmcgdGV4dCBwYXJ0LCBlc2NhcGUgcmVzZXJ2ZWQgcmVnZXggY2hhcnNcbiAgICBmb3IgKGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgcGFydHNbaV0gPSByZWdFeHBMSUtFLnJlc2VydmUocGFydHNbaV0pO1xuICAgIH1cblxuICAgIC8vIEpvaW4gYWxsIHRoZSBpbnRlcmxlYXZlZCBwYXJ0c1xuICAgIHBhcnRzID0gcGFydHMuam9pbignJyk7XG5cbiAgICAvLyBPcHRpbWl6ZSBvciBhbmNob3IgdGhlIHBhdHRlcm4gYXQgZWFjaCBlbmQgYXMgbmVlZGVkXG4gICAgaWYgKHBhcnRzLnN1YnN0cigwLCAyKSA9PT0gUkVHRVhQX1dJTERDQVJEKSB7IHBhcnRzID0gcGFydHMuc3Vic3RyKDIpOyB9IGVsc2UgeyBwYXJ0cyA9ICdeJyArIHBhcnRzOyB9XG4gICAgaWYgKHBhcnRzLnN1YnN0cigtMiwgMikgPT09IFJFR0VYUF9XSUxEQ0FSRCkgeyBwYXJ0cyA9IHBhcnRzLnN1YnN0cigwLCBwYXJ0cy5sZW5ndGggLSAyKTsgfSBlbHNlIHsgcGFydHMgKz0gJyQnOyB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIG5ldyByZWdleFxuICAgIHJldHVybiBuZXcgUmVnRXhwKHBhcnRzLCBpZ25vcmVDYXNlID8gJ2knIDogdW5kZWZpbmVkKTtcbn1cblxucmVnRXhwTElLRS5yZXNlcnZlID0gZnVuY3Rpb24gKHMpIHtcbiAgICByZXR1cm4gcy5yZXBsYWNlKHJlc2VydmVkLCAnXFxcXCQxJyk7XG59O1xuXG52YXIgY2FjaGUsIHNpemU7XG5cbi8qKlxuICogQHN1bW1hcnkgRGVsZXRlIGEgcGF0dGVybiBmcm9tIHRoZSBjYWNoZTsgb3IgY2xlYXIgdGhlIHdob2xlIGNhY2hlLlxuICogQHBhcmFtIHtzdHJpbmd9IFtwYXR0ZXJuXSAtIFRoZSBMSUtFIHBhdHRlcm4gdG8gcmVtb3ZlIGZyb20gdGhlIGNhY2hlLiBGYWlscyBzaWxlbnRseSBpZiBub3QgZm91bmQgaW4gdGhlIGNhY2hlLiBJZiBwYXR0ZXJuIG9taXR0ZWQsIGNsZWFycyB3aG9sZSBjYWNoZS5cbiAqL1xuKHJlZ0V4cExJS0UuY2xlYXJDYWNoZSA9IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgaWYgKCFwYXR0ZXJuKSB7XG4gICAgICAgIGNhY2hlID0ge307XG4gICAgICAgIHNpemUgPSAwO1xuICAgIH0gZWxzZSBpZiAoY2FjaGVbcGF0dGVybl0pIHtcbiAgICAgICAgZGVsZXRlIGNhY2hlW3BhdHRlcm5dO1xuICAgICAgICBzaXplLS07XG4gICAgfVxuICAgIHJldHVybiBzaXplO1xufSkoKTsgLy8gaW5pdCB0aGUgY2FjaGVcblxucmVnRXhwTElLRS5nZXRDYWNoZVNpemUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBzaXplOyB9O1xuXG4vKipcbiAqIEBzdW1tYXJ5IENhY2hlZCB2ZXJzaW9uIG9mIGByZWdFeHBMSUtFKClgLlxuICogQGRlc2MgQ2FjaGVkIGVudHJpZXMgYXJlIHN1YmplY3QgdG8gZ2FyYmFnZSBjb2xsZWN0aW9uIGlmIGBrZWVwYCBpcyBgdW5kZWZpbmVkYCBvciBgZmFsc2VgIG9uIGluc2VydGlvbiBvciBgZmFsc2VgIG9uIG1vc3QgcmVjZW50IHJlZmVyZW5jZS4gR2FyYmFnZSBjb2xsZWN0aW9uIHdpbGwgb2NjdXIgaWZmIGByZWdFeHBMSUtFLmNhY2hlTWF4YCBpcyBkZWZpbmVkIGFuZCBpdCBlcXVhbHMgdGhlIG51bWJlciBvZiBjYWNoZWQgcGF0dGVybnMuIFRoZSBnYXJiYWdlIGNvbGxlY3RvciBzb3J0cyB0aGUgcGF0dGVybnMgYmFzZWQgb24gbW9zdCByZWNlbnQgcmVmZXJlbmNlOyB0aGUgb2xkZXN0IDEwJSBvZiB0aGUgZW50cmllcyBhcmUgZGVsZXRlZC4gQWx0ZXJuYXRpdmVseSwgeW91IGNhbiBtYW5hZ2UgdGhlIGNhY2hlIHlvdXJzZWxmIHRvIGEgbGltaXRlZCBleHRlbnQgKHNlZSB7QGxpbmsgcmVnZUV4cExJS0UuY2xlYXJDYWNoZXxjbGVhckNhY2hlfSkuXG4gKiBAcGFyYW0gcGF0dGVybiAtIHRoZSBMSUtFIHBhdHRlcm4gKHRvIGJlKSBjb252ZXJ0ZWQgdG8gYSBSZWdFeHBcbiAqIEBwYXJhbSBba2VlcF0gLSBJZiBnaXZlbiwgY2hhbmdlcyB0aGUga2VlcCBzdGF0dXMgZm9yIHRoaXMgcGF0dGVybiBhcyBmb2xsb3dzOlxuICogKiBgdHJ1ZWAgcGVybWFuZW50bHkgY2FjaGVzIHRoZSBwYXR0ZXJuIChub3Qgc3ViamVjdCB0byBnYXJiYWdlIGNvbGxlY3Rpb24pIHVudGlsIGBmYWxzZWAgaXMgZ2l2ZW4gb24gYSBzdWJzZXF1ZW50IGNhbGxcbiAqICogYGZhbHNlYCBhbGxvd3MgZ2FyYmFnZSBjb2xsZWN0aW9uIG9uIHRoZSBjYWNoZWQgcGF0dGVyblxuICogKiBgdW5kZWZpbmVkYCBubyBjaGFuZ2UgdG8ga2VlcCBzdGF0dXNcbiAqIEByZXR1cm5zIHtSZWdFeHB9XG4gKi9cbnJlZ0V4cExJS0UuY2FjaGVkID0gZnVuY3Rpb24gKGtlZXAsIHBhdHRlcm4sIGlnbm9yZUNhc2UpIHtcbiAgICBpZiAodHlwZW9mIGtlZXAgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGlnbm9yZUNhc2UgPSBwYXR0ZXJuO1xuICAgICAgICBwYXR0ZXJuID0ga2VlcDtcbiAgICAgICAga2VlcCA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgcGF0dGVybkFuZENhc2UgPSBwYXR0ZXJuICsgKGlnbm9yZUNhc2UgPyAnaScgOiAnYycpLFxuICAgICAgICBpdGVtID0gY2FjaGVbcGF0dGVybkFuZENhc2VdO1xuICAgIGlmIChpdGVtKSB7XG4gICAgICAgIGl0ZW0ud2hlbiA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICBpZiAoa2VlcCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpdGVtLmtlZXAgPSBrZWVwO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHNpemUgPT09IHJlZ0V4cExJS0UuY2FjaGVNYXgpIHtcbiAgICAgICAgICAgIHZhciBhZ2UgPSBbXSwgYWdlcyA9IDAsIGtleSwgaTtcbiAgICAgICAgICAgIGZvciAoa2V5IGluIGNhY2hlKSB7XG4gICAgICAgICAgICAgICAgaXRlbSA9IGNhY2hlW2tleV07XG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtLmtlZXApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGFnZXM7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ud2hlbiA8IGFnZVtpXS5pdGVtLndoZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhZ2Uuc3BsaWNlKGksIDAsIHsga2V5OiBrZXksIGl0ZW06IGl0ZW0gfSk7XG4gICAgICAgICAgICAgICAgICAgIGFnZXMrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWFnZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVnRXhwTElLRShwYXR0ZXJuLCBpZ25vcmVDYXNlKTsgLy8gY2FjaGUgaXMgZnVsbCFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkgPSBNYXRoLmNlaWwoYWdlLmxlbmd0aCAvIDEwKTsgLy8gd2lsbCBhbHdheXMgYmUgYXQgbGVhc3QgMVxuICAgICAgICAgICAgc2l6ZSAtPSBpO1xuICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjYWNoZVthZ2VbaV0ua2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpdGVtID0gY2FjaGVbcGF0dGVybkFuZENhc2VdID0ge1xuICAgICAgICAgICAgcmVnZXg6IHJlZ0V4cExJS0UocGF0dGVybiwgaWdub3JlQ2FzZSksXG4gICAgICAgICAgICBrZWVwOiBrZWVwLFxuICAgICAgICAgICAgd2hlbjogbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICAgICAgfTtcbiAgICAgICAgc2l6ZSsrO1xuICAgIH1cbiAgICByZXR1cm4gaXRlbS5yZWdleDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcmVnRXhwTElLRTtcbiIsIi8vIHRlbXBsZXggbm9kZSBtb2R1bGVcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qb25laXQvdGVtcGxleFxuXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cblxuLyoqXG4gKiBNZXJnZXMgdmFsdWVzIG9mIGV4ZWN1dGlvbiBjb250ZXh0IHByb3BlcnRpZXMgbmFtZWQgaW4gdGVtcGxhdGUgYnkge3Byb3AxfSxcbiAqIHtwcm9wMn0sIGV0Yy4sIG9yIGFueSBqYXZhc2NyaXB0IGV4cHJlc3Npb24gaW5jb3Jwb3JhdGluZyBzdWNoIHByb3AgbmFtZXMuXG4gKiBUaGUgY29udGV4dCBhbHdheXMgaW5jbHVkZXMgdGhlIGdsb2JhbCBvYmplY3QuIEluIGFkZGl0aW9uIHlvdSBjYW4gc3BlY2lmeSBhIHNpbmdsZVxuICogY29udGV4dCBvciBhbiBhcnJheSBvZiBjb250ZXh0cyB0byBzZWFyY2ggKGluIHRoZSBvcmRlciBnaXZlbikgYmVmb3JlIGZpbmFsbHlcbiAqIHNlYXJjaGluZyB0aGUgZ2xvYmFsIGNvbnRleHQuXG4gKlxuICogTWVyZ2UgZXhwcmVzc2lvbnMgY29uc2lzdGluZyBvZiBzaW1wbGUgbnVtZXJpYyB0ZXJtcywgc3VjaCBhcyB7MH0sIHsxfSwgZXRjLiwgZGVyZWZcbiAqIHRoZSBmaXJzdCBjb250ZXh0IGdpdmVuLCB3aGljaCBpcyBhc3N1bWVkIHRvIGJlIGFuIGFycmF5LiBBcyBhIGNvbnZlbmllbmNlIGZlYXR1cmUsXG4gKiBpZiBhZGRpdGlvbmFsIGFyZ3MgYXJlIGdpdmVuIGFmdGVyIGB0ZW1wbGF0ZWAsIGBhcmd1bWVudHNgIGlzIHVuc2hpZnRlZCBvbnRvIHRoZSBjb250ZXh0XG4gKiBhcnJheSwgdGh1cyBtYWtpbmcgZmlyc3QgYWRkaXRpb25hbCBhcmcgYXZhaWxhYmxlIGFzIHsxfSwgc2Vjb25kIGFzIHsyfSwgZXRjLiwgYXMgaW5cbiAqIGB0ZW1wbGV4KCdIZWxsbywgezF9IScsICdXb3JsZCcpYC4gKHswfSBpcyB0aGUgdGVtcGxhdGUgc28gY29uc2lkZXIgdGhpcyB0byBiZSAxLWJhc2VkLilcbiAqXG4gKiBJZiB5b3UgcHJlZmVyIHNvbWV0aGluZyBvdGhlciB0aGFuIGJyYWNlcywgcmVkZWZpbmUgYHRlbXBsZXgucmVnZXhwYC5cbiAqXG4gKiBTZWUgdGVzdHMgZm9yIGV4YW1wbGVzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZW1wbGF0ZVxuICogQHBhcmFtIHsuLi5zdHJpbmd9IFthcmdzXVxuICovXG5mdW5jdGlvbiB0ZW1wbGV4KHRlbXBsYXRlKSB7XG4gICAgdmFyIGNvbnRleHRzID0gdGhpcyBpbnN0YW5jZW9mIEFycmF5ID8gdGhpcyA6IFt0aGlzXTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHsgY29udGV4dHMudW5zaGlmdChhcmd1bWVudHMpOyB9XG4gICAgcmV0dXJuIHRlbXBsYXRlLnJlcGxhY2UodGVtcGxleC5yZWdleHAsIHRlbXBsZXgubWVyZ2VyLmJpbmQoY29udGV4dHMpKTtcbn1cblxudGVtcGxleC5yZWdleHAgPSAvXFx7KC4qPylcXH0vZztcblxudGVtcGxleC53aXRoID0gZnVuY3Rpb24gKGksIHMpIHtcbiAgICByZXR1cm4gJ3dpdGgodGhpc1snICsgaSArICddKXsnICsgcyArICd9Jztcbn07XG5cbnRlbXBsZXguY2FjaGUgPSBbXTtcblxudGVtcGxleC5kZXJlZiA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBpZiAoISh0aGlzLmxlbmd0aCBpbiB0ZW1wbGV4LmNhY2hlKSkge1xuICAgICAgICB2YXIgY29kZSA9ICdyZXR1cm4gZXZhbChleHByKSc7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBjb2RlID0gdGVtcGxleC53aXRoKGksIGNvZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGVtcGxleC5jYWNoZVt0aGlzLmxlbmd0aF0gPSBldmFsKCcoZnVuY3Rpb24oZXhwcil7JyArIGNvZGUgKyAnfSknKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1ldmFsXG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGV4LmNhY2hlW3RoaXMubGVuZ3RoXS5jYWxsKHRoaXMsIGtleSk7XG59O1xuXG50ZW1wbGV4Lm1lcmdlciA9IGZ1bmN0aW9uIChtYXRjaCwga2V5KSB7XG4gICAgLy8gQWR2YW5jZWQgZmVhdHVyZXM6IENvbnRleHQgY2FuIGJlIGEgbGlzdCBvZiBjb250ZXh0cyB3aGljaCBhcmUgc2VhcmNoZWQgaW4gb3JkZXIuXG4gICAgdmFyIHJlcGxhY2VtZW50O1xuXG4gICAgdHJ5IHtcbiAgICAgICAgcmVwbGFjZW1lbnQgPSBpc05hTihrZXkpID8gdGVtcGxleC5kZXJlZi5jYWxsKHRoaXMsIGtleSkgOiB0aGlzWzBdW2tleV07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXBsYWNlbWVudCA9ICd7JyArIGtleSArICd9JztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVwbGFjZW1lbnQ7XG59O1xuXG4vLyB0aGlzIGludGVyZmFjZSBjb25zaXN0cyBzb2xlbHkgb2YgdGhlIHRlbXBsZXggZnVuY3Rpb24gKGFuZCBpdCdzIHByb3BlcnRpZXMpXG5tb2R1bGUuZXhwb3J0cyA9IHRlbXBsZXg7XG4iLCIvLyBDcmVhdGVkIGJ5IEpvbmF0aGFuIEVpdGVuIG9uIDEvNy8xNi5cblxuJ3VzZSBzdHJpY3QnO1xuXG5cbi8qKlxuICogQHN1bW1hcnkgV2FsayBhIGhpZXJhcmNoaWNhbCBvYmplY3QgYXMgSlNPTi5zdHJpbmdpZnkgZG9lcyBidXQgd2l0aG91dCBzZXJpYWxpemluZy5cbiAqXG4gKiBAZGVzYyBVc2FnZTpcbiAqICogdmFyIG15RGlzdGlsbGVkT2JqZWN0ID0gdW5zdHJ1bmdpZnkuY2FsbChteU9iamVjdCk7XG4gKiAqIHZhciBteURpc3RpbGxlZE9iamVjdCA9IG15QXBpLmdldFN0YXRlKCk7IC8vIHdoZXJlIG15QXBpLnByb3RvdHlwZS5nZXRTdGF0ZSA9IHVuc3RydW5naWZ5XG4gKlxuICogUmVzdWx0IGVxdWl2YWxlbnQgdG8gYEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcykpYC5cbiAqXG4gKiA+IERvIG5vdCB1c2UgdGhpcyBmdW5jdGlvbiB0byBnZXQgYSBKU09OIHN0cmluZzsgdXNlIGBKU09OLnN0cmluZ2lmeSh0aGlzKWAgaW5zdGVhZC5cbiAqXG4gKiBAdGhpcyB7KnxvYmplY3R8KltdfSAtIE9iamVjdCB0byB3YWxrOyB0eXBpY2FsbHkgYW4gb2JqZWN0IG9yIGFycmF5LlxuICpcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMucHJlc2VydmU9ZmFsc2VdIC0gUHJlc2VydmUgdW5kZWZpbmVkIGFycmF5IGVsZW1lbnRzIGFzIGBudWxsYHMuXG4gKiBVc2UgdGhpcyB3aGVuIHByZWNpc2UgaW5kZXggbWF0dGVycyAobm90IG1lcmVseSB0aGUgb3JkZXIgb2YgdGhlIGVsZW1lbnRzKS5cbiAqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSAtIERpc3RpbGxlZCBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHVuc3RydW5naWZ5KG9wdGlvbnMpIHtcbiAgICB2YXIgY2xvbmUsIHZhbHVlLFxuICAgICAgICBvYmplY3QgPSAodHlwZW9mIHRoaXMudG9KU09OID09PSAnZnVuY3Rpb24nKSA/IHRoaXMudG9KU09OKCkgOiB0aGlzLFxuICAgICAgICBwcmVzZXJ2ZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5wcmVzZXJ2ZTtcblxuICAgIGlmICh1bnN0cnVuZ2lmeS5pc0FycmF5KG9iamVjdCkpIHtcbiAgICAgICAgY2xvbmUgPSBbXTtcbiAgICAgICAgb2JqZWN0LmZvckVhY2goZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHVuc3RydW5naWZ5LmNhbGwob2JqKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY2xvbmUucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByZXNlcnZlKSB7XG4gICAgICAgICAgICAgICAgY2xvbmUucHVzaChudWxsKTsgLy8gdW5kZWZpbmVkIG5vdCBhIHZhbGlkIEpTT04gdmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlICBpZiAodHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgY2xvbmUgPSB7fTtcbiAgICAgICAgT2JqZWN0LmtleXMob2JqZWN0KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdmFsdWUgPSB1bnN0cnVuZ2lmeS5jYWxsKG9iamVjdFtrZXldKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY2xvbmVba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjbG9uZSA9IG9iamVjdDtcbiAgICB9XG5cbiAgICByZXR1cm4gY2xvbmU7XG59XG5cbi8qKlxuICogVmVyeSBmYXN0IGFycmF5IHRlc3QuXG4gKiBGb3IgY3Jvc3MtZnJhbWUgc2NyaXB0aW5nOyB1c2UgYGNyb3NzRnJhbWVzSXNBcnJheWAgaW5zdGVhZC5cbiAqIEBwYXJhbSB7Kn0gYXJyIC0gVGhlIG9iamVjdCB0byB0ZXN0LlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXkoYXJyKSB7IHJldHVybiBhcnIuY29uc3RydWN0b3IgPT09IEFycmF5OyB9XG51bnN0cnVuZ2lmeS5pc0FycmF5ID0gaXNBcnJheTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZywgYXJyU3RyaW5nID0gJ1tvYmplY3QgQXJyYXldJztcblxuLyoqXG4gKiBWZXJ5IHNsb3cgYXJyYXkgdGVzdC4gU3VpdGFibGUgZm9yIGNyb3NzLWZyYW1lIHNjcmlwdGluZy5cbiAqXG4gKiBTdWdnZXN0aW9uOiBJZiB5b3UgbmVlZCB0aGlzIGFuZCBoYXZlIGpRdWVyeSBsb2FkZWQsIHVzZSBgalF1ZXJ5LmlzQXJyYXlgIGluc3RlYWQgd2hpY2ggaXMgcmVhc29uYWJseSBmYXN0LlxuICpcbiAqIEBwYXJhbSB7Kn0gYXJyIC0gVGhlIG9iamVjdCB0byB0ZXN0LlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGNyb3NzRnJhbWVzSXNBcnJheShhcnIpIHsgcmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gYXJyU3RyaW5nOyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW51c2VkLXZhcnNcblxubW9kdWxlLmV4cG9ydHMgPSB1bnN0cnVuZ2lmeTtcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4vLyBUaGlzIGlzIHRoZSBtYWluIGZpbGUsIHVzYWJsZSBhcyBpcywgc3VjaCBhcyBieSAvdGVzdC9pbmRleC5qcy5cbi8vIEZvciBucG06IHJlcXVpcmUgdGhpcyBmaWxlXG4vLyBGb3IgQ0ROOiBndWxwZmlsZS5qcyBicm93c2VyaWZpZXMgdGhpcyBmaWxlIHdpdGggc291cmNlbWFwIHRvIC9idWlsZC9maWx0ZXItdHJlZS5qcyBhbmQgdWdsaWZpZWQgd2l0aG91dCBzb3VyY2VtYXAgdG8gL2J1aWxkL2ZpbHRlci10cmVlLm1pbi5qcy4gVGhlIENETiBpcyBodHRwczovL2pvbmVpdC5naXRodWIuaW8vZmlsdGVyLXRyZWUuXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHVuc3RydW5naWZ5ID0gcmVxdWlyZSgndW5zdHJ1bmdpZnknKTtcblxudmFyIGNzc0luamVjdG9yID0gcmVxdWlyZSgnLi9qcy9jc3MnKTtcbnZhciBGaWx0ZXJOb2RlID0gcmVxdWlyZSgnLi9qcy9GaWx0ZXJOb2RlJyk7XG52YXIgVGVybWluYWxOb2RlID0gcmVxdWlyZSgnLi9qcy9GaWx0ZXJMZWFmJyk7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL2pzL3RlbXBsYXRlJyk7XG52YXIgb3BlcmF0b3JzID0gcmVxdWlyZSgnLi9qcy90cmVlLW9wZXJhdG9ycycpO1xuXG52YXIgb3JkaW5hbCA9IDA7XG52YXIgcmVGaWx0ZXJUcmVlRXJyb3JTdHJpbmcgPSAvXmZpbHRlci10cmVlOiAvO1xuXG4vKiogQGNvbnN0cnVjdG9yXG4gKlxuICogQHN1bW1hcnkgQSBub2RlIGluIGEgZmlsdGVyIHRyZWUgKGluY2x1ZGluZyB0aGUgcm9vdCBub2RlKSwgcmVwcmVzZW50aW5nIGEgY29tcGxleCBmaWx0ZXIgZXhwcmVzc2lvbi5cbiAqXG4gKiBAZGVzYyBBIGBGaWx0ZXJUcmVlYCBpcyBhbiBuLWFyeSB0cmVlIHdpdGggYSBzaW5nbGUgYG9wZXJhdG9yYCB0byBiZSBhcHBsaWVkIHRvIGFsbCBpdHMgYGNoaWxkcmVuYC5cbiAqXG4gKiBBbHNvIGtub3duIGFzIGEgXCJzdWJ0cmVlXCIgb3IgYSBcInN1YmV4cHJlc3Npb25cIi5cbiAqXG4gKiBFYWNoIG9mIHRoZSBgY2hpbGRyZW5gIGNhbiBiZSBlaXRoZXI6XG4gKlxuICogKiBhIHRlcm1pbmFsIG5vZGUgYEZpbHRlcmAgKG9yIGFuIG9iamVjdCBpbmhlcml0aW5nIGZyb20gYEZpbHRlcmApIHJlcHJlc2VudGluZyBhIHNpbXBsZSBjb25kaXRpb25hbCBleHByZXNzaW9uOyBvclxuICogKiBhIG5lc3RlZCBgRmlsdGVyVHJlZWAgcmVwcmVzZW50aW5nIGEgY29tcGxleCBzdWJleHByZXNzaW9uLlxuICpcbiAqIFRoZSBgb3BlcmF0b3JgIG11c3QgYmUgb25lIG9mIHRoZSB7QGxpbmsgb3BlcmF0b3JzfHRyZWUgb3BlcmF0b3JzfSBvciBtYXkgYmUgbGVmdCB1bmRlZmluZWQgaWZmIHRoZXJlIGlzIG9ubHkgb25lIGNoaWxkIG5vZGUuXG4gKlxuICogTm90ZXM6XG4gKiAxLiBBIGBGaWx0ZXJUcmVlYCBtYXkgY29uc2lzdCBvZiBhIHNpbmdsZSBsZWFmLCBpbiB3aGljaCBjYXNlIHRoZSBgb3BlcmF0b3JgIGlzIG5vdCB1c2VkIGFuZCBtYXkgYmUgbGVmdCB1bmRlZmluZWQuIEhvd2V2ZXIsIGlmIGEgc2Vjb25kIGNoaWxkIGlzIGFkZGVkIGFuZCB0aGUgb3BlcmF0b3IgaXMgc3RpbGwgdW5kZWZpbmVkLCBpdCB3aWxsIGJlIHNldCB0byB0aGUgZGVmYXVsdCAoYCdvcC1hbmQnYCkuXG4gKiAyLiBUaGUgb3JkZXIgb2YgdGhlIGNoaWxkcmVuIGlzIHVuZGVmaW5lZCBhcyBhbGwgb3BlcmF0b3JzIGFyZSBjb21tdXRhdGl2ZS4gRm9yIHRoZSAnYG9wLW9yYCcgb3BlcmF0b3IsIGV2YWx1YXRpb24gY2Vhc2VzIG9uIHRoZSBmaXJzdCBwb3NpdGl2ZSByZXN1bHQgYW5kIGZvciBlZmZpY2llbmN5LCBhbGwgc2ltcGxlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb25zIHdpbGwgYmUgZXZhbHVhdGVkIGJlZm9yZSBhbnkgY29tcGxleCBzdWJleHByZXNzaW9ucy5cbiAqIDMuIEEgbmVzdGVkIGBGaWx0ZXJUcmVlYCBpcyBkaXN0aW5ndWlzaGVkIGluIHRoZSBKU09OIG9iamVjdCBmcm9tIGEgYEZpbHRlcmAgYnkgdGhlIHByZXNlbmNlIG9mIGEgYGNoaWxkcmVuYCBtZW1iZXIuXG4gKiA0LiBOZXN0aW5nIGEgYEZpbHRlclRyZWVgIGNvbnRhaW5pbmcgYSBzaW5nbGUgY2hpbGQgaXMgdmFsaWQgKGFsYmVpdCBwb2ludGxlc3MpLlxuICpcbiAqIFNlZSB7QGxpbmsgRmlsdGVyTm9kZX0gZm9yIGFkZGl0aW9uYWwgYG9wdGlvbnNgIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zLmVkaXRvcnNdIC0gRWRpdG9yIGhhc2ggdG8gb3ZlcnJpZGUgcHJvdG90eXBlJ3MuIFRoZXNlIGFyZSBjb25zdHJ1Y3RvcnMgZm9yIG9iamVjdHMgdGhhdCBleHRlbmQgZnJvbSBgRmlsdGVyVHJlZS5wcm90b3R5cGUuZWRpdG9ycy5EZWZhdWx0YC4gVHlwaWNhbGx5LCB5b3Ugd291bGQgaW5jbHVkZSB0aGUgZGVmYXVsdCBlZGl0b3IgaXRzZWxmOiBgeyBEZWZhdWx0OiBGaWx0ZXJUcmVlLnByb3RvdHlwZS5lZGl0b3JzLkRlZmF1bHQsIC4uLiB9YC4gQWx0ZXJuYXRpdmVseSwgYmVmb3JlIGluc3RhbnRpYXRpbmcsIHlvdSBtaWdodCBhZGQgeW91ciBhZGRpdGlvbmFsIGVkaXRvcnMgdG8gYEZpbHRlclRyZWUucHJvdG90eXBlLmVkaXRvcnNgIGZvciB1c2UgYnkgYWxsIGZpbHRlciB0cmVlIG9iamVjdHMuXG4gKlxuICogQHByb3BlcnR5IHtGaWx0ZXJUcmVlfSBwYXJlbnRcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBvcmRpbmFsXG4gKiBAcHJvcGVydHkge3N0cmluZ30gb3BlcmF0b3JcbiAqIEBwcm9wZXJ0eSB7RmlsdGVyTm9kZVtdfSBjaGlsZHJlbiAtIEVhY2ggb25lIGlzIGVpdGhlciBhIGBGaWx0ZXJgIChvciBhbiBvYmplY3QgaW5oZXJpdGluZyBmcm9tIGBGaWx0ZXJgKSBvciBhbm90aGVyIGBGaWx0ZXJUcmVlYC4uXG4gKiBAcHJvcGVydHkge0VsZW1lbnR9IGVsIC0gVGhlIHJvb3QgZWxlbWVudCBvZiB0aGlzIChzdWIpdHJlZS5cbiAqL1xudmFyIEZpbHRlclRyZWUgPSBGaWx0ZXJOb2RlLmV4dGVuZCgnRmlsdGVyVHJlZScsIHtcblxuICAgIHByZUluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgY3NzSW5qZWN0b3IoJ2ZpbHRlci10cmVlLWJhc2UnLCBvcHRpb25zICYmIG9wdGlvbnMuY3NzU3R5bGVzaGVldFJlZmVyZW5jZUVsZW1lbnQpO1xuXG4gICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZWRpdG9ycykge1xuICAgICAgICAgICAgdGhpcy5lZGl0b3JzID0gb3B0aW9ucy5lZGl0b3JzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgICAgICBkZXRhY2hDaG9vc2VyLmNhbGwodGhpcyk7XG4gICAgfSxcblxuICAgIGVkaXRvcnM6IHtcbiAgICAgICAgRGVmYXVsdDogVGVybWluYWxOb2RlXG4gICAgfSxcblxuICAgIGFkZEVkaXRvcjogZnVuY3Rpb24oa2V5LCBvdmVycmlkZXMpIHtcbiAgICAgICAgaWYgKG92ZXJyaWRlcykge1xuICAgICAgICAgICAgdGhpcy5lZGl0b3JzW2tleV0gPSBUZXJtaW5hbE5vZGUuZXh0ZW5kKG92ZXJyaWRlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5lZGl0b3JzW2tleV07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgY3JlYXRlVmlldzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuZWwgPSB0ZW1wbGF0ZSh0aGlzLmlzQ29sdW1uRmlsdGVycyA/ICdjb2x1bW5GaWx0ZXJzJyA6ICd0cmVlJywgKytvcmRpbmFsKTtcbiAgICAgICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNhdGNoQ2xpY2suYmluZCh0aGlzKSk7XG4gICAgfSxcblxuICAgIGxvYWRTdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGF0ZSA9IHRoaXMuc3RhdGU7XG5cbiAgICAgICAgdGhpcy5vcGVyYXRvciA9ICdvcC1hbmQnO1xuICAgICAgICB0aGlzLmNoaWxkcmVuID0gW107XG5cbiAgICAgICAgaWYgKCFzdGF0ZSkge1xuICAgICAgICAgICAgdGhpcy5hZGQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIGBzdGF0ZS5jaGlsZHJlbmAgKHJlcXVpcmVkKVxuICAgICAgICAgICAgaWYgKCEoc3RhdGUuY2hpbGRyZW4gaW5zdGFuY2VvZiBBcnJheSAmJiBzdGF0ZS5jaGlsZHJlbi5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgRmlsdGVyTm9kZS5FcnJvcignRXhwZWN0ZWQgYGNoaWxkcmVuYCBwcm9wZXJ0eSB0byBiZSBhIG5vbi1lbXB0eSBhcnJheS4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgYHN0YXRlLm9wZXJhdG9yYCAoaWYgZ2l2ZW4pXG4gICAgICAgICAgICBpZiAoc3RhdGUub3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9wZXJhdG9yc1tzdGF0ZS5vcGVyYXRvcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRmlsdGVyTm9kZS5FcnJvcignRXhwZWN0ZWQgYG9wZXJhdG9yYCBwcm9wZXJ0eSB0byBiZSBvbmUgb2Y6ICcgKyBPYmplY3Qua2V5cyhvcGVyYXRvcnMpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLm9wZXJhdG9yID0gc3RhdGUub3BlcmF0b3I7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN0YXRlLmNoaWxkcmVuLmZvckVhY2godGhpcy5hZGQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gc2ltdWxhdGUgY2xpY2sgb24gdGhlIG9wZXJhdG9yIHRvIGRpc3BsYXkgc3RyaWtlLXRocm91Z2ggYW5kIG9wZXJhdG9yIGJldHdlZW4gZmlsdGVyc1xuICAgICAgICB2YXIgcmFkaW9CdXR0b24gPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJzpzY29wZSA+IGxhYmVsID4gaW5wdXRbdmFsdWU9JyArIHRoaXMub3BlcmF0b3IgKyAnXScpLFxuICAgICAgICAgICAgYWRkRmlsdGVyTGluayA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignLmZpbHRlci10cmVlLWFkZC1maWx0ZXInKTtcblxuICAgICAgICBpZiAocmFkaW9CdXR0b24pIHtcbiAgICAgICAgICAgIHJhZGlvQnV0dG9uLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpc1snZmlsdGVyLXRyZWUtb3AtY2hvaWNlJ10oe1xuICAgICAgICAgICAgICAgIHRhcmdldDogcmFkaW9CdXR0b25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gd2hlbiBtdWx0aXBsZSBmaWx0ZXIgZWRpdG9ycyBhdmFpbGFibGUsIHNpbXVsYXRlIGNsaWNrIG9uIHRoZSBuZXcgXCJhZGQgY29uZGl0aW9uYWxcIiBsaW5rXG4gICAgICAgIGlmIChhZGRGaWx0ZXJMaW5rICYmICF0aGlzLmNoaWxkcmVuLmxlbmd0aCAmJiBPYmplY3Qua2V5cyh0aGlzLmVkaXRvcnMpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRoaXNbJ2ZpbHRlci10cmVlLWFkZC1maWx0ZXInXSh7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBhZGRGaWx0ZXJMaW5rXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHByb2NlZWQgd2l0aCByZW5kZXJcbiAgICAgICAgRmlsdGVyTm9kZS5wcm90b3R5cGUucmVuZGVyLmNhbGwodGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgbm9kZSBhcyBwZXIgYHN0YXRlYC5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW3N0YXRlXVxuICAgICAqICogSWYgYHN0YXRlYCBoYXMgYSBgY2hpbGRyZW5gIHByb3BlcnR5LCB3aWxsIGF0dGVtcHQgdG8gYWRkIGEgbmV3IHN1YnRyZWUuXG4gICAgICogKiBJZiBgc3RhdGVgIGhhcyBhbiBgZWRpdG9yYCBwcm9wZXJ0eSwgd2lsbCBjcmVhdGUgb25lIChgdGhpcy5lZGl0b3JzW3N0YXRlLmVkaXRvcl1gKS5cbiAgICAgKiAqIElmIGBzdGF0ZWAgaGFzIG5laXRoZXIgKG9yIHdhcyBvbWl0dGVkKSwgd2lsbCBjcmVhdGUgYSBuZXcgZGVmYXVsdCBlZGl0b3IgKGB0aGlzLmVkaXRvcnMuRGVmYXVsdGApLlxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgICAgdmFyIENvbnN0cnVjdG9yO1xuXG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgQ29uc3RydWN0b3IgPSBGaWx0ZXJUcmVlO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlICYmIHN0YXRlLmVkaXRvcikge1xuICAgICAgICAgICAgQ29uc3RydWN0b3IgPSB0aGlzLmVkaXRvcnNbc3RhdGUuZWRpdG9yXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIENvbnN0cnVjdG9yID0gdGhpcy5lZGl0b3JzLkRlZmF1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNoaWxkcmVuLnB1c2gobmV3IENvbnN0cnVjdG9yKHtcbiAgICAgICAgICAgIHN0YXRlOiBzdGF0ZSxcbiAgICAgICAgICAgIHBhcmVudDogdGhpc1xuICAgICAgICB9KSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlYXJjaCB0aGUgZXhwcmVzc2lvbiB0cmVlIGZvciBhIG5vZGUgd2l0aCBjZXJ0YWluIGNoYXJhY3RlcmlzdGljcyBhcyBkZXNjcmliZWQgYnkgdGhlIHR5cGUgb2Ygc2VhcmNoIChgdHlwZWApIGFuZCB0aGUgc2VhcmNoIGFyZ3MuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFt0eXBlPSdmaW5kJ10gLSBOYW1lIG9mIG1ldGhvZCB0byB1c2Ugb24gdGVybWluYWwgbm9kZXM7IGNoYXJhY3Rlcml6ZXMgdGhlIHR5cGUgb2Ygc2VhcmNoLiBNdXN0IGV4aXN0IGluIHlvdXIgdGVybWluYWwgbm9kZSBvYmplY3QuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbZGVlcD1mYWxzZV0gLSBNdXN0IGJlIGV4cGxpY2l0IGB0cnVlYCBvciBgZmFsc2VgIChub3QgbWVyZWx5IHRydXRoeSBvciBmYWxzeSk7IG9yIG9taXR0ZWQuXG4gICAgICogQHBhcmFtIHsqfSBmaXJzdFNlYXJjaEFyZyAtIE1heSBub3QgYmUgYm9vbGVhbiB0eXBlIChhY2NvbW1vZGF0aW9uIHRvIG92ZXJsb2FkIGxvZ2ljKS5cbiAgICAgKiBAcGFyYW0gey4uLip9IFthZGRpdGlvbmFsU2VhcmNoQXJnc11cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxGaWx0ZXJMZWFmfEZpbHRlclRyZWV9XG4gICAgICogKiBgZmFsc2VgIC0gTm90IGZvdW5kLiAoYHRydWVgIGlzIG5ldmVyIHJldHVybmVkLilcbiAgICAgKiAqIGBGaWx0ZXJMZWFmYCAob3IgaW5zdGFuY2Ugb2YgYW4gb2JqZWN0IGV4dGVuZGVkIGZyb20gc2FtZSkgLSBTb3VnaHQgbm9kZSAodHlwaWNhbCkuXG4gICAgICogKiAnRmlsdGVyVHJlZWAgLSBTb3VnaHQgbm9kZSAocmFyZSkuXG4gICAgICovXG4gICAgZmluZDogZnVuY3Rpb24gZmluZCh0eXBlLCBkZWVwKSB7XG4gICAgICAgIHZhciByZXN1bHQsIG4sIHRyZWVBcmdzID0gYXJndW1lbnRzLCBsZWFmQXJncztcblxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBuID0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG4gPSAwO1xuICAgICAgICAgICAgZGVlcCA9IHR5cGU7XG4gICAgICAgICAgICB0eXBlID0gJ2ZpbmQnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkZWVwID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIG4gKz0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlZXAgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxlYWZBcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCBuKTtcblxuICAgICAgICAvLyBUT0RPOiBGb2xsb3dpbmcgY291bGQgYmUgYnJva2VuIG91dCBpbnRvIHNlcGFyYXRlIG1ldGhvZCAobGlrZSBGaWx0ZXJMZWFmKVxuICAgICAgICBpZiAodHlwZSA9PT0gJ2ZpbmRCeUVsJyAmJiB0aGlzLmVsID09PSBsZWFmQXJnc1swXSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB3YWxrIHRyZWUgcmVjdXJzaXZlbHksIGVuZGluZyBvbiBkZWZpbmVkIGByZXN1bHRgIChmaXJzdCBub2RlIGZvdW5kKVxuICAgICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbi5maW5kKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQpIHsgLy8gb25seSByZWN1cnNlIG9uIHVuZGVhZCBjaGlsZHJlblxuICAgICAgICAgICAgICAgIGlmIChjaGlsZCBpbnN0YW5jZW9mIFRlcm1pbmFsTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBhbHdheXMgcmVjdXJzZSBvbiB0ZXJtaW5hbCBub2Rlc1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBjaGlsZFt0eXBlXS5hcHBseShjaGlsZCwgbGVhZkFyZ3MpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGVlcCAmJiBjaGlsZC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSByZWN1cnNlIG9uIHN1YnRyZWVzIGlmIGdvaW5nIGBkZWVwYCBhbmQgbm90IGNoaWxkbGVzc1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBmaW5kLmFwcGx5KGNoaWxkLCB0cmVlQXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7IC8vIHRydXRoaW5lc3MgYWJvcnRzIGZpbmQgbG9vcCBpZiBzZXQgYWJvdmVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBrZWVwIGdvaW5nIC8vIFRPRE86IENvdWxkbid0IHRoaXMganVzdCBiZSBcInJldHVybiByZXN1bHRcIiBtYWtpbmcgdGhlIHJldHVybiBhYm92ZSB1bm5lY2Vzc2FyeT9cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgICdmaWx0ZXItdHJlZS1vcC1jaG9pY2UnOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgdmFyIHJhZGlvQnV0dG9uID0gZXZ0LnRhcmdldDtcblxuICAgICAgICB0aGlzLm9wZXJhdG9yID0gcmFkaW9CdXR0b24udmFsdWU7XG5cbiAgICAgICAgLy8gZGlzcGxheSBzdHJpa2UtdGhyb3VnaFxuICAgICAgICB2YXIgcmFkaW9CdXR0b25zID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yQWxsKCdsYWJlbD5pbnB1dC5maWx0ZXItdHJlZS1vcC1jaG9pY2VbbmFtZT0nICsgcmFkaW9CdXR0b24ubmFtZSArICddJyk7XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHJhZGlvQnV0dG9ucykuZm9yRWFjaChmdW5jdGlvbihyYWRpb0J1dHRvbikgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICAgICAgcmFkaW9CdXR0b24ucGFyZW50RWxlbWVudC5zdHlsZS50ZXh0RGVjb3JhdGlvbiA9IHJhZGlvQnV0dG9uLmNoZWNrZWQgPyAnbm9uZScgOiAnbGluZS10aHJvdWdoJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gZGlzcGxheSBvcGVyYXRvciBiZXR3ZWVuIGZpbHRlcnMgYnkgYWRkaW5nIG9wZXJhdG9yIHN0cmluZyBhcyBhIENTUyBjbGFzcyBvZiB0aGlzIHRyZWVcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9wZXJhdG9ycykge1xuICAgICAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QucmVtb3ZlKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKHRoaXMub3BlcmF0b3IpO1xuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtYWRkLWZpbHRlcic6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBpZiAoT2JqZWN0LmtleXModGhpcy5lZGl0b3JzKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhdHRhY2hDaG9vc2VyLmNhbGwodGhpcywgZXZ0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtYWRkJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4ucHVzaChuZXcgRmlsdGVyVHJlZSh7XG4gICAgICAgICAgICBwYXJlbnQ6IHRoaXNcbiAgICAgICAgfSkpO1xuICAgIH0sXG5cbiAgICAnZmlsdGVyLXRyZWUtcmVtb3ZlJzogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKGV2dC50YXJnZXQubmV4dEVsZW1lbnRTaWJsaW5nLCB0cnVlKTtcbiAgICB9LFxuXG4gICAgLyoqIFJlbW92ZXMgYSBjaGlsZCBub2RlIGFuZCBpdCdzIC5lbDsgb3IgdmljZS12ZXJzYVxuICAgICAqIEBwYXJhbSB7RWxlbWVudHxGaWx0ZXJOb2RlfSBub2RlXG4gICAgICovXG4gICAgcmVtb3ZlOiBmdW5jdGlvbihub2RlLCBkZWVwKSB7XG4gICAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgICAgICAgICAgbm9kZSA9IHRoaXMuZmluZCgnZmluZEJ5RWwnLCAhIWRlZXAsIG5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZGVsZXRlIHRoaXMuY2hpbGRyZW5bdGhpcy5jaGlsZHJlbi5pbmRleE9mKG5vZGUpXTtcblxuICAgICAgICBub2RlLmVsLnBhcmVudEVsZW1lbnQucmVtb3ZlKG5vZGUuZWwpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvYmplY3QucmV0aHJvdz1mYWxzZV0gLSBDYXRjaCAoZG8gbm90IHRocm93KSB0aGUgZXJyb3IuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb2JqZWN0LmFsZXJ0PXRydWVdIC0gQW5ub3VuY2UgZXJyb3IgdmlhIHdpbmRvdy5hbGVydCgpIGJlZm9yZSByZXR1cm5pbmcuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb2JqZWN0LmZvY3VzPXRydWVdIC0gUGxhY2UgdGhlIGZvY3VzIG9uIHRoZSBvZmZlbmRpbmcgY29udHJvbCBhbmQgZ2l2ZSBpdCBlcnJvciBjb2xvci5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfHN0cmluZ30gYHVuZGVmaW5lZGAgbWVhbnMgdmFsaWQgb3Igc3RyaW5nIGNvbnRhaW5pbmcgZXJyb3IgbWVzc2FnZS5cbiAgICAgKi9cbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICB2YXIgYWxlcnQgPSBvcHRpb25zLmFsZXJ0ID09PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5hbGVydCxcbiAgICAgICAgICAgIHJldGhyb3cgPSBvcHRpb25zLnJldGhyb3cgPT09IHRydWUsXG4gICAgICAgICAgICByZXN1bHQ7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhbGlkYXRlLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZXJyLm1lc3NhZ2U7XG5cbiAgICAgICAgICAgIC8vIFRocm93IHdoZW4gbm90IGEgZmlsdGVyIHRyZWUgZXJyb3JcbiAgICAgICAgICAgIGlmIChyZXRocm93IHx8ICFyZUZpbHRlclRyZWVFcnJvclN0cmluZy50ZXN0KHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhbGVydCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKHJlRmlsdGVyVHJlZUVycm9yU3RyaW5nLCAnJyk7XG4gICAgICAgICAgICAgICAgd2luZG93LmFsZXJ0KHJlc3VsdCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tYWxlcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIHRlc3QoZGF0YVJvdykge1xuICAgICAgICB2YXIgb3BlcmF0b3IgPSBvcGVyYXRvcnNbdGhpcy5vcGVyYXRvcl0sXG4gICAgICAgICAgICByZXN1bHQgPSBvcGVyYXRvci5zZWVkLFxuICAgICAgICAgICAgbm9DaGlsZHJlbkRlZmluZWQgPSB0cnVlO1xuXG4gICAgICAgIHRoaXMuY2hpbGRyZW4uZmluZChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgbm9DaGlsZHJlbkRlZmluZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQgaW5zdGFuY2VvZiBUZXJtaW5hbE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gb3BlcmF0b3IucmVkdWNlKHJlc3VsdCwgY2hpbGQudGVzdChkYXRhUm93KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGlsZC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gb3BlcmF0b3IucmVkdWNlKHJlc3VsdCwgdGVzdC5jYWxsKGNoaWxkLCBkYXRhUm93KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgPT09IG9wZXJhdG9yLmFib3J0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBub0NoaWxkcmVuRGVmaW5lZCB8fCAob3BlcmF0b3IubmVnYXRlID8gIXJlc3VsdCA6IHJlc3VsdCk7XG4gICAgfSxcblxuICAgIGdldFN0YXRlOiB1bnN0cnVuZ2lmeSxcblxuICAgIGdldEpTT046IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVhZHkgPSBKU09OLnN0cmluZ2lmeSh0aGlzLCBudWxsLCB0aGlzLkpTT05zcGFjZSk7XG4gICAgICAgIHJldHVybiByZWFkeSA/IHJlYWR5IDogJyc7XG4gICAgfSxcblxuICAgIHRvSlNPTjogZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICB2YXIgc3RhdGUgPSB7XG4gICAgICAgICAgICBvcGVyYXRvcjogdGhpcy5vcGVyYXRvcixcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgVGVybWluYWxOb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLmNoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hpbGQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWFkeSA9IHRvSlNPTi5jYWxsKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkLmlzQ29sdW1uRmlsdGVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZHkuaXNDb2x1bW5GaWx0ZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGQuZmllbGRzICE9PSBjaGlsZC5wYXJlbnQuZmllbGRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkeS5maWVsZHMgPSBjaGlsZC5maWVsZHM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5jaGlsZHJlbi5wdXNoKHJlYWR5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIG1ldGFkYXRhID0gRmlsdGVyTm9kZS5wcm90b3R5cGUudG9KU09OLmNhbGwodGhpcyk7XG4gICAgICAgIE9iamVjdC5rZXlzKG1ldGFkYXRhKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgc3RhdGVba2V5XSA9IG1ldGFkYXRhW2tleV07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzdGF0ZS5jaGlsZHJlbi5sZW5ndGggPyBzdGF0ZSA6IHVuZGVmaW5lZDtcbiAgICB9LFxuXG4gICAgZ2V0U3FsV2hlcmVDbGF1c2U6IGZ1bmN0aW9uIGdldFNxbFdoZXJlQ2xhdXNlKCkge1xuICAgICAgICB2YXIgbGV4ZW1lID0gb3BlcmF0b3JzW3RoaXMub3BlcmF0b3JdLlNRTCxcbiAgICAgICAgICAgIHdoZXJlID0gJyc7XG5cbiAgICAgICAgdGhpcy5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkLCBpZHgpIHtcbiAgICAgICAgICAgIHZhciBvcCA9IGlkeCA/ICcgJyArIGxleGVtZS5vcCArICcgJyA6ICcnO1xuICAgICAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgVGVybWluYWxOb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoZXJlICs9IG9wICsgY2hpbGQuZ2V0U3FsV2hlcmVDbGF1c2UoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoaWxkLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB3aGVyZSArPSBvcCArIGdldFNxbFdoZXJlQ2xhdXNlLmNhbGwoY2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF3aGVyZSkge1xuICAgICAgICAgICAgd2hlcmUgPSAnTlVMTCBJUyBOVUxMJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBsZXhlbWUuYmVnICsgd2hlcmUgKyBsZXhlbWUuZW5kO1xuICAgIH1cblxufSk7XG5cbmZ1bmN0aW9uIGNhdGNoQ2xpY2soZXZ0KSB7IC8vIG11c3QgYmUgY2FsbGVkIHdpdGggY29udGV4dFxuICAgIHZhciBlbHQgPSBldnQudGFyZ2V0O1xuXG4gICAgdmFyIGhhbmRsZXIgPSB0aGlzW2VsdC5jbGFzc05hbWVdIHx8IHRoaXNbZWx0LnBhcmVudE5vZGUuY2xhc3NOYW1lXTtcbiAgICBpZiAoaGFuZGxlcikge1xuICAgICAgICBpZiAodGhpcy5kZXRhY2hDaG9vc2VyKSB7XG4gICAgICAgICAgICB0aGlzLmRldGFjaENob29zZXIoKTtcbiAgICAgICAgfVxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgZXZ0KTtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmV2ZW50SGFuZGxlcikge1xuICAgICAgICB0aGlzLmV2ZW50SGFuZGxlcihldnQpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBUaHJvd3MgZXJyb3IgaWYgaW52YWxpZCBleHByZXNzaW9uIHRyZWUuXG4gKiBDYXVnaHQgYnkge0BsaW5rIEZpbHRlclRyZWUjdmFsaWRhdGV8RmlsdGVyVHJlZS5wcm90b3R5cGUudmFsaWRhdGUoKX0uXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGZvY3VzIC0gTW92ZSBmb2N1cyB0byBvZmZlbmRpbmcgY29udHJvbC5cbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9IGlmIHZhbGlkXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZShvcHRpb25zKSB7IC8vIG11c3QgYmUgY2FsbGVkIHdpdGggY29udGV4dFxuICAgIGlmICh0aGlzIGluc3RhbmNlb2YgRmlsdGVyVHJlZSAmJiAhdGhpcy5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZpbHRlck5vZGUuRXJyb3IoJ0VtcHR5IHN1YmV4cHJlc3Npb24gKG5vIGZpbHRlcnMpLicpO1xuICAgIH1cblxuICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICBpZiAoY2hpbGQgaW5zdGFuY2VvZiBUZXJtaW5hbE5vZGUpIHtcbiAgICAgICAgICAgIGNoaWxkLnZhbGlkYXRlKG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2UgaWYgKGNoaWxkLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFsaWRhdGUuY2FsbChjaGlsZCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gYXR0YWNoQ2hvb3NlcihldnQpIHsgLy8gbXVzdCBiZSBjYWxsZWQgd2l0aCBjb250ZXh0XG4gICAgdmFyIHRyZWUgPSB0aGlzLFxuICAgICAgICByZWN0ID0gZXZ0LnRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIGlmICghcmVjdC53aWR0aCkge1xuICAgICAgICAvLyBub3QgaW4gRE9NIHlldCBzbyB0cnkgYWdhaW4gbGF0ZXJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGF0dGFjaENob29zZXIuY2FsbCh0cmVlLCBldnQpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgaXRcbiAgICB2YXIgZWRpdG9ycyA9IE9iamVjdC5rZXlzKEZpbHRlclRyZWUucHJvdG90eXBlLmVkaXRvcnMpLFxuICAgICAgICBjaG9vc2VyID0gdGhpcy5jaG9vc2VyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2VsZWN0Jyk7XG5cbiAgICBjaG9vc2VyLmNsYXNzTmFtZSA9ICdmaWx0ZXItdHJlZS1jaG9vc2VyJztcbiAgICBjaG9vc2VyLnNpemUgPSBlZGl0b3JzLmxlbmd0aDtcblxuICAgIGVkaXRvcnMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIG5hbWUgPSB0cmVlLmVkaXRvcnNba2V5XS5wcm90b3R5cGUubmFtZSB8fCBrZXk7XG4gICAgICAgIGNob29zZXIuYWRkKG5ldyBPcHRpb24obmFtZSwga2V5KSk7XG4gICAgfSk7XG5cbiAgICBjaG9vc2VyLm9ubW91c2VvdmVyID0gZnVuY3Rpb24oZXZ0KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICAgIGV2dC50YXJnZXQuc2VsZWN0ZWQgPSB0cnVlO1xuICAgIH07XG5cbiAgICAvLyBQb3NpdGlvbiBpdFxuICAgIGNob29zZXIuc3R5bGUubGVmdCA9IHJlY3QubGVmdCArIDE5ICsgJ3B4JztcbiAgICBjaG9vc2VyLnN0eWxlLnRvcCA9IHJlY3QuYm90dG9tICsgJ3B4JztcblxuICAgIHRoaXMuZGV0YWNoQ2hvb3NlciA9IGRldGFjaENob29zZXIuYmluZCh0aGlzKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmRldGFjaENob29zZXIpOyAvLyBkZXRhY2ggY2hvb3NlciBpZiBjbGljayBvdXRzaWRlXG5cbiAgICBjaG9vc2VyLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdHJlZS5jaGlsZHJlbi5wdXNoKG5ldyB0cmVlLmVkaXRvcnNbY2hvb3Nlci52YWx1ZV0oe1xuICAgICAgICAgICAgcGFyZW50OiB0cmVlXG4gICAgICAgIH0pKTtcbiAgICAgICAgLy8gY2xpY2sgYnViYmxlcyB1cCB0byB3aW5kb3cgd2hlcmUgaXQgZGV0YWNoZXMgY2hvb3NlclxuICAgIH07XG5cbiAgICBjaG9vc2VyLm9ubW91c2VvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY2hvb3Nlci5zZWxlY3RlZEluZGV4ID0gLTE7XG4gICAgfTtcblxuICAgIC8vIEFkZCBpdCB0byB0aGUgRE9NXG4gICAgdGhpcy5lbC5hcHBlbmRDaGlsZChjaG9vc2VyKTtcblxuICAgIC8vIENvbG9yIHRoZSBsaW5rIHNpbWlsYXJseVxuICAgIHRoaXMuY2hvb3NlclRhcmdldCA9IGV2dC50YXJnZXQ7XG4gICAgdGhpcy5jaG9vc2VyVGFyZ2V0LmNsYXNzTGlzdC5hZGQoJ2FzLW1lbnUtaGVhZGVyJyk7XG59XG5cbmZ1bmN0aW9uIGRldGFjaENob29zZXIoKSB7IC8vIG11c3QgYmUgY2FsbGVkIHdpdGggY29udGV4dFxuICAgIHZhciBjaG9vc2VyID0gdGhpcy5jaG9vc2VyO1xuICAgIGlmIChjaG9vc2VyKSB7XG4gICAgICAgIHRoaXMuZWwucmVtb3ZlQ2hpbGQoY2hvb3Nlcik7XG4gICAgICAgIHRoaXMuY2hvb3NlclRhcmdldC5jbGFzc0xpc3QucmVtb3ZlKCdhcy1tZW51LWhlYWRlcicpO1xuXG4gICAgICAgIGNob29zZXIub25jbGljayA9IGNob29zZXIub25tb3VzZW91dCA9IG51bGw7XG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuZGV0YWNoQ2hvb3Nlcik7XG5cbiAgICAgICAgZGVsZXRlIHRoaXMuZGV0YWNoQ2hvb3NlcjtcbiAgICAgICAgZGVsZXRlIHRoaXMuY2hvb3NlcjtcbiAgICB9XG59XG5cbndpbmRvdy5GaWx0ZXJUcmVlID0gRmlsdGVyVHJlZTtcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuLyogZXNsaW50LWRpc2FibGUga2V5LXNwYWNpbmcgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmlsdGVyTm9kZSA9IHJlcXVpcmUoJy4vRmlsdGVyTm9kZScpO1xudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZScpO1xudmFyIGNvbmRpdGlvbmFscyA9IHJlcXVpcmUoJy4vY29uZGl0aW9uYWxzJyk7XG52YXIgYnVpbGRFbGVtZW50ID0gcmVxdWlyZSgnLi9idWlsZC1lbGVtZW50Jyk7XG5cblxuLyoqIEB0eXBlZGVmIHtvYmplY3R9IGNvbnZlcnRlclxuICogQHByb3BlcnR5IHtmdW5jdGlvbn0gdG8gLSBSZXR1cm5zIGlucHV0IHZhbHVlIGNvbnZlcnRlZCB0byB0eXBlLiBGYWlscyBzaWxlbnRseS5cbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb259IG5vdCAtIFRlc3RzIGlucHV0IHZhbHVlIGFnYWluc3QgdHlwZSwgcmV0dXJuaW5nIGBmYWxzZSBpZiB0eXBlIG9yIGB0cnVlYCBpZiBub3QgdHlwZS5cbiAqL1xuLyoqIEB0eXBlIHtjb252ZXJ0ZXJ9ICovXG52YXIgbnVtYmVyQ29udmVydGVyID0geyB0bzogTnVtYmVyLCBub3Q6IGlzTmFOIH07XG5cbi8qKiBAdHlwZSB7Y29udmVydGVyfSAqL1xudmFyIGRhdGVDb252ZXJ0ZXIgPSB7IHRvOiBmdW5jdGlvbihzKSB7IHJldHVybiBuZXcgRGF0ZShzKTsgfSwgbm90OiBpc05hTiB9O1xuXG4vKiogQGNvbnN0cnVjdG9yXG4gKiBAc3VtbWFyeSBBIHRlcm1pbmFsIG5vZGUgaW4gYSBmaWx0ZXIgdHJlZSwgcmVwcmVzZW50aW5nIGEgY29uZGl0aW9uYWwgZXhwcmVzc2lvbi5cbiAqIEBkZXNjIEFsc28ga25vd24gYXMgYSBcImZpbHRlci5cIlxuICovXG52YXIgRmlsdGVyTGVhZiA9IEZpbHRlck5vZGUuZXh0ZW5kKCdGaWx0ZXJMZWFmJywge1xuXG4gICAgbmFtZTogJ0NvbXBhcmUgYSBjb2x1bW4gdG8gYSB2YWx1ZScsXG5cbiAgICBwb3N0SW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBlbCA9IHRoaXMudmlldy5jb2x1bW47XG4gICAgICAgIGlmICghZWwudmFsdWUpIHtcbiAgICAgICAgICAgIC8vIEZvciBlbXB0eSAoaS5lLiwgbmV3KSBjb250cm9scywgc2ltdWxhdGUgYSBjbGljayBhIGJlYXQgYWZ0ZXIgcmVuZGVyaW5nXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBGaWx0ZXJOb2RlLmNsaWNrSW4oZWwpOyB9LCA3MDApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy52aWV3KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy52aWV3KSB7XG4gICAgICAgICAgICAgICAgdGhpcy52aWV3W2tleV0ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5vbkNoYW5nZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqIEBzdW1tYXJ5IENyZWF0ZSBhIG5ldyB2aWV3IGluIGB0aGlzLnZpZXdgLlxuICAgICAqIEBkZXNjIFRoaXMgbmV3IFwidmlld1wiIGlzIGEgZ3JvdXAgb2YgSFRNTCBgRWxlbWVudGAgY29udHJvbHMgdGhhdCBjb21wbGV0ZWx5IGRlc2NyaWJlIHRoZSBjb25kaXRpb25hbCBleHByZXNzaW9uIHRoaXMgb2JqZWN0IHJlcHJlc2VudHMuIFRoaXMgbWV0aG9kIGNyZWF0ZXMgdGhlIGZvbGxvd2luZyBvYmplY3QgcHJvcGVydGllczpcbiAgICAgKlxuICAgICAqICogYHRoaXMuZWxgIC0gYSBgPHNwYW4+Li4uPC9zcGFuPmAgZWxlbWVudCB0byBjb250YWluIHRoZSBjb250cm9scyBhcyBjaGlsZCBub2Rlc1xuICAgICAqICogYHRoaXMudmlld2AgLSBhIGhhc2ggY29udGFpbmluZyBkaXJlY3QgcmVmZXJlbmNlcyB0byB0aGUgY29udHJvbHMuXG4gICAgICpcbiAgICAgKiBUaGUgdmlldyBmb3IgdGhpcyBiYXNlIGBGaWx0ZXJMZWFmYCBvYmplY3QgY29uc2lzdHMgb2YgdGhlIGZvbGxvd2luZyBjb250cm9sczpcbiAgICAgKlxuICAgICAqICogYHRoaXMudmlldy5jb2x1bW5gIC0gQSBkcm9wLWRvd24gd2l0aCBvcHRpb25zIGZyb20gYHRoaXMuZmllbGRzYC4gVmFsdWUgaXMgdGhlIG5hbWUgb2YgdGhlIGNvbHVtbiBiZWluZyB0ZXN0ZWQgKGkuZS4sIHRoZSBjb2x1bW4gdG8gd2hpY2ggdGhpcyBjb25kaXRpb25hbCBleHByZXNzaW9uIGFwcGxpZXMpLlxuICAgICAqICogYHRoaXMudmlldy5vcGVyYXRvcmAgLSBBIGRyb3AtZG93biB3aXRoIG9wdGlvbnMgZnJvbSB7QGxpbmsgbGVhZk9wZXJhdG9yc30uIFZhbHVlIGlzIG9uZSBvZiB0aGUga2V5cyB0aGVyZWluLlxuICAgICAqICogYHRoaXMudmlldy5saXRlcmFsYCAtIEEgdGV4dCBib3guXG4gICAgICpcbiAgICAgKiAgPiBQcm90b3R5cGVzIGV4dGVuZGVkIGZyb20gYEZpbHRlckxlYWZgIG1heSBoYXZlIGRpZmZlcmVudCBjb250cm9scyBhcyBuZWVkZWQuIFRoZSBvbmx5IHJlcXVpcmVkIGNvbnRyb2wgaXMgYGNvbHVtbmAsIHdoaWNoIGFsbCBzdWNoIFwiZWRpdG9yc1wiIG11c3Qgc3VwcG9ydC5cbiAgICAgKi9cbiAgICBjcmVhdGVWaWV3OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGZpZWxkcyA9IHRoaXMucGFyZW50Lm5vZGVGaWVsZHMgfHwgdGhpcy5maWVsZHM7XG5cbiAgICAgICAgaWYgKCFmaWVsZHMpIHtcbiAgICAgICAgICAgIHRocm93IEZpbHRlck5vZGUuRXJyb3IoJ1Rlcm1pbmFsIG5vZGUgcmVxdWlyZXMgYSBmaWVsZHMgbGlzdC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByb290ID0gdGhpcy5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgcm9vdC5jbGFzc05hbWUgPSAnZmlsdGVyLXRyZWUtZWRpdG9yIGZpbHRlci10cmVlLWRlZmF1bHQnO1xuXG4gICAgICAgIHRoaXMudmlldyA9IHtcbiAgICAgICAgICAgIGNvbHVtbjogdGhpcy5tYWtlRWxlbWVudChyb290LCBmaWVsZHMsICdjb2x1bW4nLCB0cnVlKSxcbiAgICAgICAgICAgIG9wZXJhdG9yOiB0aGlzLm1ha2VFbGVtZW50KHJvb3QsIHRoaXMub3BlcmF0b3JNZW51LCAnb3BlcmF0b3InKSxcbiAgICAgICAgICAgIGxpdGVyYWw6IHRoaXMubWFrZUVsZW1lbnQocm9vdClcbiAgICAgICAgfTtcblxuICAgICAgICByb290LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2JyJykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBIVE1MIGZvcm0gY29udHJvbHMgZmFjdG9yeS5cbiAgICAgKiBAZGVzYyBDcmVhdGVzIGFuZCBhcHBlbmRzIGEgdGV4dCBib3ggb3IgYSBkcm9wLWRvd24uXG4gICAgICogQHJldHVybnMgVGhlIG5ldyBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7RWxlbWVudH0gY29udGFpbmVyIC0gQW4gZWxlbWVudCB0byB3aGljaCB0byBhcHBlbmQgdGhlIG5ldyBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7ZmllbGRPcHRpb25bXX0gW21lbnVdIC0gT3ZlcmxvYWRzOlxuICAgICAqICogSWYgb21pdHRlZCwgd2lsbCBjcmVhdGUgYW4gYDxpbnB1dC8+YCAodGV4dCBib3gpIGVsZW1lbnQuXG4gICAgICogKiBJZiBjb250YWlucyBvbmx5IGEgc2luZ2xlIG9wdGlvbiwgd2lsbCBjcmVhdGUgYSBgPHNwYW4+Li4uPC9zcGFuPmAgZWxlbWVudCBjb250YWluaW5nIHRoZSBzdHJpbmcgYW5kIGEgYDxpbnB1dCB0eXBlPWhpZGRlbj5gIGNvbnRhaW5pbmcgdGhlIHZhbHVlLlxuICAgICAqICogT3RoZXJ3aXNlLCBjcmVhdGVzIGEgYDxzZWxlY3Q+Li4uPC9zZWxlY3Q+YCBlbGVtZW50IHdpdGggdGhlc2UgbWVudS5cbiAgICAgKiBAcGFyYW0ge251bGx8c3RyaW5nfSBbcHJvbXB0PScnXSAtIEFkZHMgYW4gaW5pdGlhbCBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnQgdG8gdGhlIGRyb3AtZG93biB3aXRoIHRoaXMgdmFsdWUsIHBhcmVudGhlc2l6ZWQsIGFzIGl0cyBgdGV4dGA7IGFuZCBlbXB0eSBzdHJpbmcgYXMgaXRzIGB2YWx1ZWAuIE9taXR0aW5nIGNyZWF0ZXMgYSBibGFuayBwcm9tcHQ7IGBudWxsYCBzdXBwcmVzc2VzLlxuICAgICAqL1xuICAgIG1ha2VFbGVtZW50OiBmdW5jdGlvbihjb250YWluZXIsIG1lbnUsIHByb21wdCwgc29ydCkge1xuICAgICAgICB2YXIgZWwsIG9wdGlvbiwgaGlkZGVuLFxuICAgICAgICAgICAgdGFnTmFtZSA9IG1lbnUgPyAnc2VsZWN0JyA6ICdpbnB1dCc7XG5cbiAgICAgICAgaWYgKG1lbnUgJiYgbWVudS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIC8vIGhhcmQgdGV4dCB3aGVuIHRoZXJlIHdvdWxkIGJlIG9ubHkgMSBvcHRpb24gaW4gdGhlIGRyb3Bkb3duXG4gICAgICAgICAgICBvcHRpb24gPSBtZW51WzBdO1xuXG4gICAgICAgICAgICBoaWRkZW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICAgICAgaGlkZGVuLnR5cGUgPSAnaGlkZGVuJztcbiAgICAgICAgICAgIGhpZGRlbi52YWx1ZSA9IG9wdGlvbi5uYW1lIHx8IG9wdGlvbi5hbGlhcyB8fCBvcHRpb247XG5cbiAgICAgICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgZWwuaW5uZXJIVE1MID0gb3B0aW9uLmFsaWFzIHx8IG9wdGlvbi5uYW1lIHx8IG9wdGlvbjtcbiAgICAgICAgICAgIGVsLmFwcGVuZENoaWxkKGhpZGRlbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbCA9IGJ1aWxkRWxlbWVudCh0YWdOYW1lLCBtZW51LCBwcm9tcHQsIHNvcnQpO1xuICAgICAgICAgICAgaWYgKGVsLnR5cGUgPT09ICd0ZXh0JyAmJiB0aGlzLmV2ZW50SGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCB0aGlzLmV2ZW50SGFuZGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIHRoaXMub25DaGFuZ2UgPSB0aGlzLm9uQ2hhbmdlIHx8IGNsZWFuVXBBbmRNb3ZlT24uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBGaWx0ZXJOb2RlLnNldFdhcm5pbmdDbGFzcyhlbCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZWwpO1xuXG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9LFxuXG4gICAgbG9hZFN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHN0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSwgZWwsIGksIGIsIHNlbGVjdGVkLCBub3RlcyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFGaWx0ZXJOb2RlLm9wdGlvbnNTY2hlbWFba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YXRlW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGVsID0gdGhpcy52aWV3W2tleV07XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZWwudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbbmFtZT1cXCcnICsgZWwubmFtZSArICdcXCddJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGVsLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsW2ldLmNoZWNrZWQgPSB2YWx1ZS5pbmRleE9mKGVsW2ldLnZhbHVlKSA+PSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwgPSBlbC5vcHRpb25zO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIGIgPSBmYWxzZTsgaSA8IGVsLmxlbmd0aDsgaSsrLCBiID0gYiB8fCBzZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCA9IHZhbHVlLmluZGV4T2YoZWxbaV0udmFsdWUpID49IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsW2ldLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZpbHRlck5vZGUuc2V0V2FybmluZ0NsYXNzKGVsLCBiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIUZpbHRlck5vZGUuc2V0V2FybmluZ0NsYXNzKGVsKSAmJiBlbC52YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm90ZXMucHVzaCh7IGtleToga2V5LCB2YWx1ZTogdmFsdWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5vdGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IG5vdGVzLmxlbmd0aCA+IDEsXG4gICAgICAgICAgICAgICAgICAgIGZvb3Rub3RlcyA9IHRlbXBsYXRlKG11bHRpcGxlID8gJ25vdGVzJyA6ICdub3RlJyksXG4gICAgICAgICAgICAgICAgICAgIGlubmVyID0gZm9vdG5vdGVzLmxhc3RFbGVtZW50Q2hpbGQ7XG4gICAgICAgICAgICAgICAgbm90ZXMuZm9yRWFjaChmdW5jdGlvbihub3RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmb290bm90ZSA9IG11bHRpcGxlID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKSA6IGlubmVyO1xuICAgICAgICAgICAgICAgICAgICBub3RlID0gdGVtcGxhdGUoJ29wdGlvbk1pc3NpbmcnLCBub3RlLmtleSwgbm90ZS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChub3RlLmxlbmd0aCkgeyBmb290bm90ZS5hcHBlbmRDaGlsZChub3RlWzBdKTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHsgaW5uZXIuYXBwZW5kQ2hpbGQoZm9vdG5vdGUpOyB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoZm9vdG5vdGVzLCBlbC5wYXJlbnROb2RlLmxhc3RFbGVtZW50Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwcm9wZXJ0eSB7Y29udmVydGVyfSBudW1iZXJcbiAgICAgKiBAcHJvcGVydHkge2NvbnZlcnRlcn0gZGF0ZVxuICAgICAqL1xuICAgIGNvbnZlcnRlcnM6IHtcbiAgICAgICAgbnVtYmVyOiBudW1iZXJDb252ZXJ0ZXIsXG4gICAgICAgIGludDogbnVtYmVyQ29udmVydGVyLCAvLyBwc2V1ZG8tdHlwZTogcmVhbGx5IGp1c3QgYSBOdW1iZXJcbiAgICAgICAgZmxvYXQ6IG51bWJlckNvbnZlcnRlciwgLy8gcHNldWRvLXR5cGU6IHJlYWxseSBqdXN0IGEgTnVtYmVyXG4gICAgICAgIGRhdGU6IGRhdGVDb252ZXJ0ZXJcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGhyb3dzIGVycm9yIGlmIGludmFsaWQgZXhwcmVzc2lvbi5cbiAgICAgKiBDYXVnaHQgYnkge0BsaW5rIEZpbHRlclRyZWUjdmFsaWRhdGV8RmlsdGVyVHJlZS5wcm90b3R5cGUudmFsaWRhdGUoKX0uXG4gICAgICpcbiAgICAgKiBBbHNvIHBlcmZvcm1zIHRoZSBmb2xsb3dpbmcgY29tcGlsYXRpb24gYWN0aW9uczpcbiAgICAgKiAqIENvcGllcyBhbGwgYHRoaXMudmlld2AnIHZhbHVlcyBmcm9tIHRoZSBET00gdG8gc2ltaWxhcmx5IG5hbWVkIHByb3BlcnRpZXMgb2YgYHRoaXNgLlxuICAgICAqICogUHJlLXNldHMgYHRoaXMub3BgIGFuZCBgdGhpcy5jb252ZXJ0ZXJgIGZvciB1c2UgaW4gYHRlc3RgJ3MgdHJlZSB3YWxrLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5mb2N1cz1mYWxzZV0gLSBNb3ZlIGZvY3VzIHRvIG9mZmVuZGluZyBjb250cm9sLlxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9IGlmIHZhbGlkXG4gICAgICovXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGVsZW1lbnROYW1lLCBmaWVsZHMsIGZpZWxkO1xuXG4gICAgICAgIGZvciAoZWxlbWVudE5hbWUgaW4gdGhpcy52aWV3KSB7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXdbZWxlbWVudE5hbWVdLFxuICAgICAgICAgICAgICAgIHZhbHVlID0gY29udHJvbFZhbHVlKGVsKS50cmltKCk7XG5cbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm9jdXMgPSBvcHRpb25zICYmIG9wdGlvbnMuZm9jdXM7XG4gICAgICAgICAgICAgICAgaWYgKGZvY3VzIHx8IGZvY3VzID09PSB1bmRlZmluZWQpIHsgY2xpY2tJbihlbCk7IH1cbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRmlsdGVyTm9kZS5FcnJvcignQmxhbmsgJyArIGVsZW1lbnROYW1lICsgJyBjb250cm9sLlxcbkNvbXBsZXRlIHRoZSBmaWx0ZXIgb3IgZGVsZXRlIGl0LicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDb3B5IGVhY2ggY29udHJvbHMncyB2YWx1ZSBhcyBhIG5ldyBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgb2YgdGhpcyBvYmplY3QuXG4gICAgICAgICAgICAgICAgdGhpc1tlbGVtZW50TmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMub3AgPSBjb25kaXRpb25hbHMub3BlcmF0b3JzW3RoaXMub3BlcmF0b3JdO1xuXG4gICAgICAgIHRoaXMuY29udmVydGVyID0gdW5kZWZpbmVkOyAvLyByZW1haW5zIHVuZGVmaW5lZCB3aGVuIG5laXRoZXIgb3BlcmF0b3Igbm9yIGNvbHVtbiBpcyB0eXBlZFxuICAgICAgICBpZiAodGhpcy5vcC50eXBlKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnZlcnRlciA9IHRoaXMuY29udmVydGVyc1t0aGlzLm9wLnR5cGVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChlbGVtZW50TmFtZSBpbiB0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgICAgICBpZiAoL15jb2x1bW4vLnRlc3QoZWxlbWVudE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkcyA9IHRoaXMucGFyZW50Lm5vZGVGaWVsZHMgfHwgdGhpcy5maWVsZHM7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkID0gZmluZEZpZWxkKGZpZWxkcywgdGhpc1tlbGVtZW50TmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmllbGQgJiYgZmllbGQudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb252ZXJ0ZXIgPSB0aGlzLmNvbnZlcnRlcnNbZmllbGQudHlwZV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcDogZnVuY3Rpb24oZGF0YVJvdykgeyByZXR1cm4gZGF0YVJvd1t0aGlzLmNvbHVtbl07IH0sXG4gICAgcTogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmxpdGVyYWw7IH0sXG5cbiAgICB0ZXN0OiBmdW5jdGlvbihkYXRhUm93KSB7XG4gICAgICAgIHZhciBwLCBxLCAvLyB1bnR5cGVkIHZlcnNpb25zIG9mIGFyZ3NcbiAgICAgICAgICAgIFAsIFEsIC8vIHR5cGVkIHZlcnNpb25zIG9mIHAgYW5kIHFcbiAgICAgICAgICAgIGNvbnZlcnQ7XG5cbiAgICAgICAgcmV0dXJuIChwID0gdGhpcy5wKGRhdGFSb3cpKSA9PT0gdW5kZWZpbmVkIHx8IChxID0gdGhpcy5xKGRhdGFSb3cpKSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGZhbHNlXG4gICAgICAgICAgICA6IChcbiAgICAgICAgICAgICAgICAoY29udmVydCA9IHRoaXMuY29udmVydGVyKSAmJlxuICAgICAgICAgICAgICAgICFjb252ZXJ0Lm5vdChQID0gY29udmVydC50byhwKSkgJiZcbiAgICAgICAgICAgICAgICAhY29udmVydC5ub3QoUSA9IGNvbnZlcnQudG8ocSkpXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgPyB0aGlzLm9wLnRlc3QoUCwgUSlcbiAgICAgICAgICAgICAgICA6IHRoaXMub3AudGVzdChwLCBxKTtcbiAgICB9LFxuXG4gICAgLyoqIFRlc3RzIHRoaXMgbGVhZiBub2RlIGZvciBnaXZlbiBjb2x1bW4gbmFtZS5cbiAgICAgKiA+IFRoaXMgaXMgdGhlIGRlZmF1bHQgXCJmaW5kXCIgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZpbmQ6IGZ1bmN0aW9uKGZpZWxkTmFtZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb2x1bW4gPT09IGZpZWxkTmFtZTtcbiAgICB9LFxuXG4gICAgLyoqIFRlc3RzIHRoaXMgbGVhZiBub2RlIGZvciBnaXZlbiBjb2x1bW4gYEVsZW1lbnRgIG93bmVyc2hpcC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBFZGl0b3IgKGxlYWYgY29uc3RydWN0b3IpXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZmluZEJ5RWw6IGZ1bmN0aW9uKGVsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmVsID09PSBlbDtcbiAgICB9LFxuXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHN0YXRlID0ge307XG4gICAgICAgIGlmICh0aGlzLmVkaXRvcikge1xuICAgICAgICAgICAgc3RhdGUuZWRpdG9yID0gdGhpcy5lZGl0b3I7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMudmlldykge1xuICAgICAgICAgICAgc3RhdGVba2V5XSA9IHRoaXNba2V5XTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMucGFyZW50Lm5vZGVGaWVsZHMgJiYgdGhpcy5maWVsZHMgIT09IHRoaXMucGFyZW50LmZpZWxkcykge1xuICAgICAgICAgICAgc3RhdGUuZmllbGRzID0gdGhpcy5maWVsZHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH0sXG5cbiAgICBnZXRTcWxXaGVyZUNsYXVzZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wLnNxbCh0aGlzLmNvbHVtbiwgdGhpcy5saXRlcmFsKTtcbiAgICB9XG59KTtcblxuZnVuY3Rpb24gZmluZEZpZWxkKGZpZWxkcywgbmFtZSkge1xuICAgIHZhciBjb21wbGV4LCBzaW1wbGU7XG5cbiAgICBzaW1wbGUgPSBmaWVsZHMuZmluZChmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICBpZiAoKGZpZWxkLnN1Ym1lbnUgfHwgZmllbGQpIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIHJldHVybiAoY29tcGxleCA9IGZpbmRGaWVsZChmaWVsZC5zdWJtZW51IHx8IGZpZWxkLCBuYW1lKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmllbGQubmFtZSA9PT0gbmFtZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNvbXBsZXggfHwgc2ltcGxlO1xufVxuXG4vKiogYGNoYW5nZWAgb3IgYGNsaWNrYCBldmVudCBoYW5kbGVyIGZvciBhbGwgZm9ybSBjb250cm9scy5cbiAqIFJlbW92ZXMgZXJyb3IgQ1NTIGNsYXNzIGZyb20gY29udHJvbC5cbiAqIEFkZHMgd2FybmluZyBDU1MgY2xhc3MgZnJvbSBjb250cm9sIGlmIGJsYW5rOyByZW1vdmVzIGlmIG5vdCBibGFuay5cbiAqIE1vdmVzIGZvY3VzIHRvIG5leHQgbm9uLWJsYW5rIHNpYmxpbmcgY29udHJvbC5cbiAqL1xuZnVuY3Rpb24gY2xlYW5VcEFuZE1vdmVPbihldnQpIHtcbiAgICB2YXIgZWwgPSBldnQudGFyZ2V0O1xuXG4gICAgLy8gcmVtb3ZlIGBlcnJvcmAgQ1NTIGNsYXNzLCB3aGljaCBtYXkgaGF2ZSBiZWVuIGFkZGVkIGJ5IGBGaWx0ZXJMZWFmLnByb3RvdHlwZS52YWxpZGF0ZWBcbiAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdmaWx0ZXItdHJlZS1lcnJvcicpO1xuXG4gICAgLy8gc2V0IG9yIHJlbW92ZSAnd2FybmluZycgQ1NTIGNsYXNzLCBhcyBwZXIgZWwudmFsdWVcbiAgICBGaWx0ZXJOb2RlLnNldFdhcm5pbmdDbGFzcyhlbCk7XG5cbiAgICBpZiAoZWwudmFsdWUpIHtcbiAgICAgICAgLy8gZmluZCBuZXh0IHNpYmxpbmcgY29udHJvbCwgaWYgYW55XG4gICAgICAgIGlmICghZWwubXVsdGlwbGUpIHtcbiAgICAgICAgICAgIHdoaWxlICgoZWwgPSBlbC5uZXh0RWxlbWVudFNpYmxpbmcpICYmICghKCduYW1lJyBpbiBlbCkgfHwgZWwudmFsdWUudHJpbSgpICE9PSAnJykpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGN1cmx5XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhbmQgY2xpY2sgaW4gaXQgKG9wZW5zIHNlbGVjdCBsaXN0KVxuICAgICAgICBpZiAoZWwgJiYgZWwudmFsdWUudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgZWwudmFsdWUgPSAnJzsgLy8gcmlkIG9mIGFueSB3aGl0ZSBzcGFjZVxuICAgICAgICAgICAgRmlsdGVyTm9kZS5jbGlja0luKGVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLmV2ZW50SGFuZGxlcikge1xuICAgICAgICB0aGlzLmV2ZW50SGFuZGxlcihldnQpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY2xpY2tJbihlbCkge1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2ZpbHRlci10cmVlLWVycm9yJyk7XG4gICAgICAgIEZpbHRlck5vZGUuY2xpY2tJbihlbCk7XG4gICAgfSwgMCk7XG59XG5cbmZ1bmN0aW9uIGNvbnRyb2xWYWx1ZShlbCkge1xuICAgIHZhciB2YWx1ZSwgaTtcblxuICAgIHN3aXRjaCAoZWwudHlwZSkge1xuICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbbmFtZT1cXCcnICsgZWwubmFtZSArICdcXCddOmVuYWJsZWQ6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgZm9yICh2YWx1ZSA9IFtdLCBpID0gMDsgaSA8IGVsLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUucHVzaChlbFtpXS52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICAgICAgZWwgPSBlbC5vcHRpb25zO1xuICAgICAgICAgICAgZm9yICh2YWx1ZSA9IFtdLCBpID0gMDsgaSA8IGVsLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5kaXNhYmxlZCAmJiBlbC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZS5wdXNoKGVsW2ldLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdmFsdWUgPSBlbC52YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsdGVyTGVhZjtcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBleHRlbmQgPSByZXF1aXJlKCdleHRlbmQtbWUnKTtcbnZhciBfID0gcmVxdWlyZSgnb2JqZWN0LWl0ZXJhdG9ycycpO1xudmFyIEJhc2UgPSBleHRlbmQuQmFzZTtcblxudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZScpO1xudmFyIGNvbmRpdGlvbmFscyA9IHJlcXVpcmUoJy4vY29uZGl0aW9uYWxzJyk7XG52YXIgc3FsV2hlcmVQYXJzZSA9IHJlcXVpcmUoJy4vc3FsLXdoZXJlLXBhcnNlJyk7XG5cbmV4dGVuZC5kZWJ1ZyA9IHRydWU7XG5cbnZhciBDSElMRFJFTl9UQUcgPSAnT0wnLFxuICAgIENISUxEX1RBRyA9ICdMSSc7XG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGRlc2NyaXB0aW9uIEEgZmlsdGVyIHRyZWUgcmVwcmVzZW50cyBhIF9jb21wbGV4IGNvbmRpdGlvbmFsIGV4cHJlc3Npb25fIGFuZCBjb25zaXN0cyBvZiBhIHNpbmdsZSBgRmlsdGVyTm9kZWAgb2JqZWN0IHNlcnZpbmcgYXMgdGhlIF9yb290XyBvZiBhbiBfbl8tYXJ5IHRyZWUuXG4gKlxuICogRWFjaCBgRmlsdGVyTm9kZWAgcmVwcmVzZW50cyBhIG5vZGUgaW4gdHJlZS4gRWFjaCBub2RlIGlzIG9uZSBvZiB0d28gdHlwZXMgb2Ygb2JqZWN0cyBleHRlbmRlZCBmcm9tIGBGaWx0ZXJOb2RlYDpcbiAqXG4gKiAqIFRoZSBub24tdGVybWluYWwgKEBsaW5rIEZpbHRlclRyZWV9IG5vZGVzIHJlcHJlc2VudCBfY29tcGxleCBzdWJleHByZXNzaW9uc18sIGVhY2ggY29uc2lzdGluZyBvZiB0d28gb3IgbW9yZSBfY29uZGl0aW9uYWxfIChib29sZWFuIGV4cHJlc3Npb25zKSwgYWxsIGNvbmNhdGVuYXRlZCB0b2dldGhlciB3aXRoIG9uZSBvZiB0aGUgX3RyZWUgb3BlcmF0b3JzXy5cbiAqICogVGhlIHRlcm1pbmFsIHtAbGluayBGaWx0ZXJMZWFmfSBub2RlcyByZXByZXNlbnQgX3NpbXBsZSBleHByZXNzaW9uc18uXG4gKlxuICogVHJlZSBvcGVyYXRvcnMgY3VycmVudGx5IGluY2x1ZGUgKipfQU5EXyoqIChsYWJlbGVkIFwiYWxsXCIgaW4gdGhlIFVJOyBhbmQgXCJvcC1hbmRcIiBpbnRlcm5hbGx5KSwgKipfT1JfKiogKFwiYW55XCI7IFwib3Atb3JcIiksIGFuZCAqKl9OT1JfKiogKFwibm9uZVwiOyBcIm9wLW5vclwiKS5cbiAqXG4gKiBFYWNoIGNvbmRpdGlvbmFsIGluIGEgX3N1YmV4cHJlc3Npb25fIChub24tdGVybWluYWwgbm9kZSkgaXMgcmVwcmVzZW50ZWQgYnkgYSBjaGlsZCBub2RlIHdoaWNoIG1heSBiZSBlaXRoZXIgYSBfc2ltcGxlIGV4cHJlc3Npb25fICh0ZXJtaW5hbCBub2RlKSBvciBhbm90aGVyIChcIm5lc3RlZFwiKSBzdWJleHByZXNzaW9uIG5vbi10ZXJtaW5hbCBub2RlLlxuICpcbiAqIFRoZSBgRmlsdGVyTGVhZmAgb2JqZWN0IGlzIHRoZSBkZWZhdWx0IHR5cGUgb2Ygc2ltcGxlIGV4cHJlc3Npb24sIHdoaWNoIGlzIGluIHRoZSBmb3JtIF9maWVsZC1wcm9wZXJ0eSBvcGVyYXRvci1wcm9wZXJ0eSBhcmd1bWVudC1wcm9wZXJ0eV8gd2hlcmU6XG4gKlxuICogKiBfZmllbGQtcHJvcGVydHlfIC0gdGhlIG5hbWUgb2YgYSBjb2x1bW4sIHNlbGVjdGVkIGZyb20gYSBkcm9wLWRvd247XG4gKiAqIF9vcGVyYXRvci1wcm9wZXJ0eV8gLSBhbiBlcXVhbGl0eSAoPSksIGluZXF1YWxpdHkgKDwsIOKJpCwg4omgLCDiiaUsID4pLCBvciBwYXR0ZXJuIG9wZXJhdG9yIChMSUtFLCBOT1QgTElLRSksIGFsc28gc2VsZWN0ZWQgZnJvbSBhIGRyb3AtZG93bjsgYW5kXG4gKiAqIF9hcmd1bWVudC1wcm9wZXJ0eV8gaXMgYSBjb25zdGFudCB0eXBlZCBpbnRvIGEgdGV4dCBib3guXG4gKlxuICogVGhlIGBGaWx0ZXJUcmVlYCBvYmplY3QgaGFzIHBvbHltb3JwaGljIG1ldGhvZHMgdGhhdCBvcGVyYXRlIG9uIHRoZSBlbnRpcmUgdHJlZSB1c2luZyByZWN1cnNpb24uIFdoZW4gdGhlIHJlY3Vyc2lvbiByZWFjaGVzIGEgdGVybWluYWwgbm9kZSwgaXQgY2FsbHMgdGhlIG1ldGhvZHMgb24gdGhlIGBGaWx0ZXJMZWFmYCBvYmplY3QgaW5zdGVhZC4gQ2FsbGluZyBgdGVzdCgpYCBvbiB0aGUgcm9vdCB0cmVlIHRoZXJlZm9yZSByZXR1cm5zIGEgYm9vbGVhbiB0aGF0IGRldGVybWluZXMgaWYgdGhlIHJvdyBwYXNzZXMgdGhyb3VnaCB0aGUgZW50aXJlIGZpbHRlciBleHByZXNzaW9uIChgdHJ1ZWApIG9yIGlzIGJsb2NrZWQgYnkgaXQgKGBmYWxzZWApLlxuICpcbiAqIFRoZSBwcm9ncmFtbWVyIG1heSBkZWZpbmUgYSBuZXcgdHlwZSBvZiBzaW1wbGUgZXhwcmVzc2lvbiBieSBleHRlbmRpbmcgZnJvbSBgRmlsdGVyTGVhZmAuIEFuIGV4YW1wbGUgaXMgdGhlIGBGaWx0ZXJGaWVsZGAgb2JqZWN0LiBTdWNoIGFuIGltcGxlbWVudGF0aW9uIG11c3QgaW5jbHVkZSBtZXRob2RzOlxuICpcbiAqICogU2F2ZSBhbmQgc3Vic2VxdWVudGx5IHJlbG9hZCB0aGUgc3RhdGUgb2YgdGhlIGNvbmRpdGlvbmFsIGFzIGVudGVyZWQgYnkgdGhlIHVzZXIgKGB0b0pTT04oKWAgYW5kIGBzZXRTdGF0ZSgpYCwgcmVzcGVjdGl2ZWx5KS5cbiAqICogQ3JlYXRlIHRoZSBET00gb2JqZWN0cyB0aGF0IHJlcHJlc2VudCB0aGUgVUkgZmlsdGVyIGVkaXRvciBhbmQgcmVuZGVyIHRoZW0gdG8gdGhlIFVJIChgY3JlYXRlVmlldygpYCBhbmQgYHJlbmRlcigpYCwgcmVzcGVjdGl2ZWx5KS5cbiAqICogRmlsdGVyIGEgdGFibGUgYnkgaW1wbGVtZW50aW5nIG9uZSBvciBtb3JlIG9mIHRoZSBmb2xsb3dpbmc6XG4gKiAgICogQXBwbHkgdGhlIGNvbmRpdGlvbmFsIGxvZ2ljIHRvIGF2YWlsYWJsZSB0YWJsZSByb3cgZGF0YSAoYHRlc3QoKWApLlxuICogICAqIEFwcGx5IHRoZSBjb25kaXRpb25hbCBsb2dpYyB0byBhIHJlbW90ZSBkYXRhLXN0b3JlIGJ5IGdlbmVyYXRpbmcgYSAqKlNRTCoqIG9yICoqUSoqIF9XSEVSRV8gY2xhdXNlIChgdG9TUUwoKWAgYW5kIGB0b1EoKWAsIHJlc3BlY3RpdmVseSkuXG4gKlxuICogU29tZSBvZiB0aGUgYWJvdmUtbmFtZWQgbWV0aG9kcyBhcyBhbHJlYWR5IGltcGxlbWVudGVkIGluIGBGaWx0ZXJMZWFmYCBhbmQvb3IgYEZpbHRlck5vZGVgIG1heSBiZSBzdWZmaWNpZW50IHRvIGhhbmRsZSB5b3VyIG5lZWRzIGFzIGlzICh3aXRob3V0IGZ1cnRoZXIgY29kZSkuXG4gKlxuICogQHBhcmFtIHtzdHJpbmdbXX0gW29wdGlvbnMuZmllbGRzXSAtIEEgZGVmYXVsdCBsaXN0IG9mIGNvbHVtbiBuYW1lcyBmb3IgZmllbGQgZHJvcC1kb3ducyBvZiBhbGwgZGVzY2VuZGFudCB0ZXJtaW5hbCBub2Rlcy4gT3ZlcnJpZGVzIGBvcHRpb25zLnN0YXRlLmZpZWxkc2AgKHNlZSkuIE1heSBiZSBkZWZpbmVkIGZvciBhbnkgbm9kZSBhbmQgcGVydGFpbnMgdG8gYWxsIGRlc2NlbmRhbnRzIG9mIHRoYXQgbm9kZSAoaW5jbHVkaW5nIHRlcm1pbmFsIG5vZGVzKS4gSWYgb21pdHRlZCAoYW5kIG5vIGBub2RlRmllbGRzYCksIHdpbGwgdXNlIHRoZSBuZWFyZXN0IGFuY2VzdG9yIGBmaWVsZHNgIGRlZmluaXRpb24uIEhvd2V2ZXIsIGRlc2NlbmRhbnRzIHdpdGggdGhlaXIgb3duIGRlZmluaXRpb24gb2YgYHR5cGVzYCB3aWxsIG92ZXJyaWRlIGFueSBhbmNlc3RvciBkZWZpbml0aW9uLlxuICpcbiAqID4gVHlwaWNhbGx5IG9ubHkgdXNlZCBieSB0aGUgY2FsbGVyIGZvciB0aGUgdG9wLWxldmVsIChyb290KSB0cmVlLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nW119IFtvcHRpb25zLm5vZGVGaWVsZHNdIC0gQSBkZWZhdWx0IGxpc3Qgb2YgY29sdW1uIG5hbWVzIGZvciBmaWVsZCBkcm9wLWRvd25zIG9mIGltbWVkaWF0ZSBkZXNjZW5kYW50IHRlcm1pbmFsIG5vZGVzIF9vbmx5Xy4gT3ZlcnJpZGVzIGBvcHRpb25zLnN0YXRlLm5vZGVGaWVsZHNgIChzZWUpLlxuICpcbiAqIEFsdGhvdWdoIGJvdGggYG9wdGlvbnMuZmllbGRzYCBhbmQgYG9wdGlvbnMubm9kZUZpZWxkc2AgYXJlIG5vdGF0ZWQgYXMgb3B0aW9uYWwgaGVyZWluLCBieSB0aGUgdGltZSBhIHRlcm1pbmFsIG5vZGUgdHJpZXMgdG8gcmVuZGVyIGEgZmllbGRzIGRyb3AtZG93biwgYSBgZmllbGRzYCBsaXN0IF9tdXN0XyBiZSBkZWZpbmVkIHRocm91Z2ggKGluIG9yZGVyIG9mIHByaW9yaXR5KTpcbiAqXG4gKiAqIFRlcm1pbmFsIG5vZGUncyBvd24gYG9wdGlvbnMuZmllbGRzYCAob3IgYG9wdGlvbnMuc3RhdGUuZmllbGRzYCkgZGVmaW5pdGlvbi5cbiAqICogVGVybWluYWwgbm9kZSdzIHBhcmVudCBub2RlJ3MgYG9wdGlvbi5ub2RlRmllbGRzYCAob3IgYG9wdGlvbi5zdGF0ZS5ub2Rlc0ZpZWxkc2ApIGRlZmluaXRpb24uXG4gKiAqIEFueSBvZiB0ZXJtaW5hbCBub2RlJ3MgYW5jZXN0b3IncyBgb3B0aW9ucy5maWVsZHNgIChvciBgb3B0aW9ucy5zdGF0ZS5maWVsZHNgKSBkZWZpbml0aW9uLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fHN0cmluZ30gW29wdGlvbnMuc3RhdGVdIC0gQSBkYXRhIHN0cnVjdHVyZSB0aGF0IGRlc2NyaWJlcyBhIHRyZWUsIHN1YnRyZWUsIG9yIGxlYWYgKHRlcm1pbmFsIG5vZGUpOlxuICpcbiAqICogTWF5IGRlc2NyaWJlIGEgdGVybWluYWwgbm9kZSB3aXRoIHByb3BlcnRpZXM6XG4gKiAgICogYGZpZWxkc2AgLSBPdmVycmlkZGVuIG9uIGluc3RhbnRpYXRpb24gYnkgYG9wdGlvbnMuZmllbGRzYC4gSWYgYm90aCB1bnNwZWNpZmllZCwgdXNlcyBwYXJlbnQncyBkZWZpbml0aW9uLlxuICogICAqIGBlZGl0b3JgIC0gQSBzdHJpbmcgaWRlbnRpZnlpbmcgdGhlIHR5cGUgb2YgY29uZGl0aW9uYWwuIE11c3QgYmUgaW4gdGhlIHRyZWUncyAoc2VlIHtAbGluayBGaWx0ZXJUcmVlI2VkaXRvcnN8ZWRpdG9yc30pIGhhc2guIElmIG9taXR0ZWQsIGRlZmF1bHRzIHRvIGAnRGVmYXVsdCdgLlxuICogICAqIG1pc2MuIC0gT3RoZXIgcHJvcGVydGllcyBwZWN1bGlhciB0byB0aGlzIGZpbHRlciB0eXBlIChidXQgdHlwaWNhbGx5IGluY2x1ZGluZyBhdCBsZWFzdCBhIGBmaWVsZGAgcHJvcGVydHkpLlxuICogKiBNYXkgZGVzY3JpYmUgYSBub24tdGVybWluYWwgbm9kZSB3aXRoIHByb3BlcnRpZXM6XG4gKiAgICogYGZpZWxkc2AgLSBPdmVycmlkZGVuIG9uIGluc3RhbnRpYXRpb24gYnkgYG9wdGlvbnMuZmllbGRzYC4gSWYgYm90aCB1bnNwZWNpZmllZCwgdXNlcyBwYXJlbnQncyBkZWZpbml0aW9uLlxuICogICAqIGBvcGVyYXRvcmAgLSBPbmUgb2Yge0BsaW5rIHRyZWVPcGVyYXRvcnN9LlxuICogICAqIGBjaGlsZHJlbmAgLSAgQXJyYXkgY29udGFpbmluZyBhZGRpdGlvbmFsIHRlcm1pbmFsIGFuZCBub24tdGVybWluYWwgbm9kZXMuXG4gKlxuICogSWYgdGhpcyBgb3B0aW9ucy5zdGF0ZWAgb2JqZWN0IGlzIG9taXR0ZWQgYWx0b2dldGhlciwgbG9hZHMgYW4gZW1wdHkgZmlsdGVyLCB3aGljaCBpcyBhIGBGaWx0ZXJUcmVlYCBub2RlIGNvbnNpc3RpbmcgdGhlIGRlZmF1bHQgYG9wZXJhdG9yYCB2YWx1ZSAoYCdvcC1hbmQnYCkuXG4gKlxuICogVGhlIGNvbnN0cnVjdG9yIGF1dG8tZGV0ZWN0cyB0aGUgdHlwZTpcbiAqICAqIHBsYWluIG9iamVjdFxuICogICogSlNPTiBzdHJpbmcgdG8gYmUgcGFyc2VkIGJ5IGBKU09OLnBhcnNlKClgIGludG8gYSBwbGFpbiBvYmplY3RcbiAqICAqIFNRTCBXSEVSRSBjbGF1c2Ugc3RyaW5nIHRvIGJlIHBhcnNlZCBpbnRvIGEgcGxhaW4gb2JqZWN0XG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gW29wdGlvbnMuZWRpdG9yPSdEZWZhdWx0J10gLSBUeXBlIG9mIHNpbXBsZSBleHByZXNzaW9uLlxuICpcbiAqIEBwYXJhbSB7RmlsdGVyVHJlZX0gW29wdGlvbnMucGFyZW50XSAtIFVzZWQgaW50ZXJuYWxseSB0byBpbnNlcnQgZWxlbWVudCB3aGVuIGNyZWF0aW5nIG5lc3RlZCBzdWJ0cmVlcy4gRm9yIHRoZSB0b3AgbGV2ZWwgdHJlZSwgeW91IGRvbid0IGdpdmUgYSB2YWx1ZSBmb3IgYHBhcmVudGA7IHlvdSBhcmUgcmVzcG9uc2libGUgZm9yIGluc2VydGluZyB0aGUgdG9wLWxldmVsIGAuZWxgIGludG8gdGhlIERPTS5cbiAqL1xudmFyIEZpbHRlck5vZGUgPSBCYXNlLmV4dGVuZCh7XG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIHBhcmVudCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5wYXJlbnQsXG4gICAgICAgICAgICBzdGF0ZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5zdGF0ZSAmJiBkZXRlY3RTdGF0ZShvcHRpb25zLnN0YXRlKTtcblxuICAgICAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcblxuICAgICAgICAvLyBjcmVhdGUgZWFjaCBvcHRpb24gc3RhbmRhcmQgb3B0aW9uIGZyb20gb3B0aW9ucywgc3RhdGUsIG9yIHBhcmVudFxuICAgICAgICBfKEZpbHRlck5vZGUub3B0aW9uc1NjaGVtYSkuZWFjaChmdW5jdGlvbihzY2hlbWEsIGtleSkge1xuICAgICAgICAgICAgdmFyIG9wdGlvbiA9IG9wdGlvbnMgJiYgb3B0aW9uc1trZXldIHx8XG4gICAgICAgICAgICAgICAgc3RhdGUgJiYgc3RhdGVba2V5XSB8fFxuICAgICAgICAgICAgICAgICFzY2hlbWEub3duICYmIChcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50ICYmIHBhcmVudFtrZXldIHx8IC8vIHJlZmVyZW5jZSBwYXJlbnQgdmFsdWUgbm93IHNvIHdlIGRvbid0IGhhdmUgdG8gc2VhcmNoIHVwIHRoZSB0cmVlIGxhdGVyXG4gICAgICAgICAgICAgICAgICAgIHNjaGVtYS5kZWZhdWx0XG4gICAgICAgICAgICAgICAgKTtcblxuXG4gICAgICAgICAgICBpZiAob3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgc2VsZltrZXldID0gb3B0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyB0cmFuc2Zvcm0gY29uZGl0aW9uYWxzIHdpdGggJ0AnIGFzIGZpcnN0IGNoYXIgdG8gcmVmZXJlbmNlIHRvIGdyb3VwIG9mIG5hbWVcbiAgICAgICAgdGhpcy5vcGVyYXRvck1lbnUuZm9yRWFjaChmdW5jdGlvbihvcHRpb24sIGluZGV4KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbiA9PT0gJ3N0cmluZycgJiYgb3B0aW9uWzBdID09PSAnQCcpIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9wZXJhdG9yTWVudVtpbmRleF0gPSBjb25kaXRpb25hbHMuZ3JvdXBzW29wdGlvbi5zdWJzdHIoMSldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnNldFN0YXRlKHN0YXRlKTtcbiAgICB9LFxuXG4gICAgLyoqIEluc2VydCBlYWNoIHN1YnRyZWUgaW50byBpdHMgcGFyZW50IG5vZGUgYWxvbmcgd2l0aCBhIFwiZGVsZXRlXCIgYnV0dG9uLlxuICAgICAqID4gVGhlIHJvb3QgdHJlZSBpcyBoYXMgbm8gcGFyZW50IGFuZCBpcyBpbnNlcnRlZCBpbnRvIHRoZSBET00gYnkgdGhlIGluc3RhbnRpYXRpbmcgY29kZSAod2l0aG91dCBhIGRlbGV0ZSBidXR0b24pLlxuICAgICAqL1xuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnBhcmVudCkge1xuICAgICAgICAgICAgdmFyIG5ld0xpc3RJdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChDSElMRF9UQUcpO1xuXG4gICAgICAgICAgICBpZiAoISh0aGlzLnN0YXRlICYmIHRoaXMuc3RhdGUubG9ja2VkKSkge1xuICAgICAgICAgICAgICAgIG5ld0xpc3RJdGVtLmFwcGVuZENoaWxkKHRlbXBsYXRlKCdyZW1vdmVCdXR0b24nKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5ld0xpc3RJdGVtLmFwcGVuZENoaWxkKHRoaXMuZWwpO1xuICAgICAgICAgICAgdGhpcy5wYXJlbnQuZWwucXVlcnlTZWxlY3RvcihDSElMRFJFTl9UQUcpLmFwcGVuZENoaWxkKG5ld0xpc3RJdGVtKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzZXRTdGF0ZTogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgICAgdmFyIG9sZEVsID0gdGhpcy5lbDtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IGRldGVjdFN0YXRlKHN0YXRlKTtcbiAgICAgICAgdGhpcy5jcmVhdGVWaWV3KCk7XG4gICAgICAgIHRoaXMubG9hZFN0YXRlKCk7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIGlmIChvbGRFbCAmJiAhdGhpcy5wYXJlbnQpIHtcbiAgICAgICAgICAgIG9sZEVsLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHRoaXMuZWwsIG9sZEVsKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB0b0pTT046IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICAgICAgdmFyIHN0YXRlID0ge307XG5cbiAgICAgICAgaWYgKHRoaXMudG9Kc29uT3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIHRyZWUgPSB0aGlzLCBtZXRhZGF0YSA9IFtdO1xuICAgICAgICAgICAgaWYgKHRoaXMudG9Kc29uT3B0aW9ucy5maWVsZHMpIHtcbiAgICAgICAgICAgICAgICBtZXRhZGF0YS5wdXNoKCdmaWVsZHMnKTtcbiAgICAgICAgICAgICAgICBtZXRhZGF0YS5wdXNoKCdub2RlRmllbGRzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy50b0pzb25PcHRpb25zLmVkaXRvcikge1xuICAgICAgICAgICAgICAgIG1ldGFkYXRhLnB1c2goJ2VkaXRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWV0YWRhdGEuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0cmVlLnBhcmVudCB8fCB0cmVlW3Byb3BdICYmIHRyZWVbcHJvcF0gIT09IHRyZWUucGFyZW50W3Byb3BdKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlW3Byb3BdID0gdHJlZVtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9LFxuXG4gICAgU1FMX1FVT1RFRF9JREVOVElGSUVSOiAnXCInXG5cbn0pO1xuXG5GaWx0ZXJOb2RlLm9wdGlvbnNTY2hlbWEgPSB7XG4gICAgLyoqIEBzdW1tYXJ5IERlZmF1bHQgbGlzdCBvZiBmaWVsZHMgb25seSBmb3IgZGlyZWN0IGNoaWxkIHRlcm1pbmFsLW5vZGUgZHJvcC1kb3ducy5cbiAgICAgKiBAdHlwZSB7c3RyaW5nW119XG4gICAgICogQG1lbWJlck9mIEZpbHRlck5vZGUucHJvdG90eXBlXG4gICAgICovXG4gICAgbm9kZUZpZWxkczogeyBvd246IHRydWUgfSxcblxuICAgIC8qKiBAc3VtbWFyeSBEZWZhdWx0IGxpc3Qgb2YgZmllbGRzIGZvciBhbGwgZGVzY2VuZGFudCB0ZXJtaW5hbC1ub2RlIGRyb3AtZG93bnMuXG4gICAgICogQHR5cGUge3N0cmluZ1tdfVxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGZpZWxkczoge30sXG5cbiAgICAvKiogQHN1bW1hcnkgVHlwZSBvZiBmaWx0ZXIgZWRpdG9yLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICogQG1lbWJlck9mIEZpbHRlck5vZGUucHJvdG90eXBlXG4gICAgICovXG4gICAgZWRpdG9yOiB7fSxcblxuICAgIC8qKiBAc3VtbWFyeSBFdmVudCBoYW5kbGVyIGZvciBVSSBldmVudHMuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTm9kZS5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBldmVudEhhbmRsZXI6IHt9LFxuXG4gICAgLyoqIEBzdW1tYXJ5IFRoaXMgaXMgdGhlIF9jb2x1bW4gZmlsdGVyc18gc3VidHJlZSBpZiB0cnV0aHkuXG4gICAgICogQGRlc2MgU2hvdWxkIG9ubHkgZXZlciBiZSBhdCBtb3N0IDEgbm9kZSB3aXRoIHRoaXMgc2V0LCBhbHdheXMgcG9zaXRpb25lZCBhcyBmaXJzdCBjaGlsZCBvZiByb290IHRyZWUuXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQG1lbWJlck9mIEZpbHRlck5vZGUucHJvdG90eXBlXG4gICAgICovXG4gICAgaXNDb2x1bW5GaWx0ZXJzOiB7IG93bjogdHJ1ZSB9LFxuXG4gICAgLyoqIEBzdW1tYXJ5IE92ZXJyaWRlIG9wZXJhdG9yIGxpc3QgYXQgYW55IG5vZGUuXG4gICAgICogU2hvdWxkIG9ubHkgZXZlciBiZSBmaXJzdCBjaGlsZCBvZiByb290IHRyZWUuXG4gICAgICogQHR5cGUge2ZpZWxkT3B0aW9ufVxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlLnByb3RvdHlwZVxuICAgICAqL1xuICAgIG9wZXJhdG9yTWVudTogeyBkZWZhdWx0OiBjb25kaXRpb25hbHMubWVudSB9XG59O1xuXG5GaWx0ZXJOb2RlLnNldFdhcm5pbmdDbGFzcyA9IGZ1bmN0aW9uKGVsLCB2YWx1ZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgICB2YWx1ZSA9IGVsLnZhbHVlO1xuICAgIH1cbiAgICBlbC5jbGFzc0xpc3RbdmFsdWUgPyAncmVtb3ZlJyA6ICdhZGQnXSgnZmlsdGVyLXRyZWUtd2FybmluZycpO1xuICAgIHJldHVybiB2YWx1ZTtcblxufTtcblxuRmlsdGVyTm9kZS5FcnJvciA9IGZ1bmN0aW9uKG1zZykge1xuICAgIHJldHVybiBuZXcgRXJyb3IoJ2ZpbHRlci10cmVlOiAnICsgbXNnKTtcbn07XG5cbkZpbHRlck5vZGUuY2xpY2tJbiA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgaWYgKGVsKSB7XG4gICAgICAgIGlmIChlbC50YWdOYW1lID09PSAnU0VMRUNUJykge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgZWwuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudCgnbW91c2Vkb3duJykpOyB9LCAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgcmVKU09OID0gL15cXHMqW1xcW1xce10vO1xuXG5mdW5jdGlvbiBkZXRlY3RTdGF0ZShzdGF0ZSkge1xuICAgIHN3aXRjaCAodHlwZW9mIHN0YXRlKSB7XG4gICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICBpZiAocmVKU09OLnRlc3Qoc3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2Uoc3RhdGUpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IEZpbHRlck5vZGUuRXJyb3IoJ0pTT04gcGFyc2VyOiAnICsgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNxbFdoZXJlUGFyc2Uoc3RhdGUpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IEZpbHRlck5vZGUuRXJyb3IoJ1NRTCBXSEVSRSBjbGF1c2UgcGFyc2VyOiAnICsgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsdGVyTm9kZTtcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKiBAdHlwZWRlZiB7b2JqZWN0fSB2YWx1ZU9wdGlvblxuICogWW91IHNob3VsZCBzdXBwbHkgYm90aCBgbmFtZWAgYW5kIGBhbGlhc2AgYnV0IHlvdSBjb3VsZCBvbWl0IG9uZSBvciB0aGUgb3RoZXIgYW5kIHdoaWNoZXZlciB5b3UgcHJvdmlkZSB3aWxsIGJlIHVzZWQgZm9yIGJvdGguIChJbiBzdWNoIGNhc2UgeW91IG1pZ2h0IGFzIHdlbGwganVzdCBnaXZlIGEgc3RyaW5nIGZvciB7QGxpbmsgZmllbGRPcHRpb259IHJhdGhlciB0aGFuIHRoaXMgb2JqZWN0LilcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbbmFtZT1hbGlhc10gLSBWYWx1ZSBvZiBgdmFsdWVgIGF0dHJpYnV0ZSBvZiBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnQuXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2FsaWFzPW5hbWVdIC0gVGV4dCBvZiBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnQuXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW3R5cGVdIE9uZSBvZiB0aGUga2V5cyBvZiBgdGhpcy5jb252ZXJ0ZXJzYC4gSWYgbm90IG9uZSBvZiB0aGVzZSAoaW5jbHVkaW5nIGB1bmRlZmluZWRgKSwgZmllbGQgdmFsdWVzIHdpbGwgYmUgdGVzdGVkIHdpdGggYSBzdHJpbmcgY29tcGFyaXNvbi5cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2hpZGRlbj1mYWxzZV1cbiAqL1xuXG4vKiogQHR5cGVkZWYge29iamVjdH0gc3VibWVudVxuICogQHN1bW1hcnkgSGllcmFyY2hpY2FsIGFycmF5IG9mIHNlbGVjdCBsaXN0IGl0ZW1zLlxuICogQGRlc2MgRGF0YSBzdHJ1Y3R1cmUgcmVwcmVzZW50aW5nIHRoZSBsaXN0IG9mIGA8b3B0aW9uPi4uLjwvb3B0aW9uPmAgYW5kL29yIGA8b3B0Z3JvdXA+Li4uPC9vcHRncm91cD5gIGVsZW1lbnRzIG9mIGEgYDxzZWxlY3Q+Li4uPC9zZWxlY3Q+YC5cbiAqXG4gKiBNYXkgYmUgYSBzaW1wbGUgYXJyYXkgb2Ygc3RyaW5ncyBvciB7QGxpbmsgdmFsdWVPcHRpb259IHN0cnVjdHVyZXMgdGhhdCBhbGxvdyBmb3IgYW4gYWxpYXMuIEFueSBlbGVtZW50IG1heSBpdHNlbGYgYmUgc3VjaCBhbiBhcnJheSB0aHVzIGZvcm1pbmcgYW4gYDxvcHRncm91cD4uLi48L29wdGdyb3VwPmAuXG4gKiBAcHJvcGVydHkge3N0cmluZ30gbGFiZWxcbiAqIEBwcm9wZXJ0eSB7ZmllbGRPcHRpb25bXX0gbWVudVxuICovXG5cbi8qKiBAdHlwZWRlZiB7c3RyaW5nfHZhbHVlT3B0aW9ufHN1Ym1lbnV9IGZpZWxkT3B0aW9uXG4gKiBUaGUgdGhyZWUgcG9zc2libGUgdHlwZXMgc3BlY2lmeSBlaXRoZXIgYW4gYDxvcHRpb24+Li4uLjwvb3B0aW9uPmAgZWxlbWVudCBvciBhbiBgPG9wdGdyb3VwPi4uLi48L29wdGdyb3VwPmAgZWxlbWVudCBhcyBmb2xsb3dzOlxuICogKiBgc3RyaW5nYCAtIHNwZWNpZmllcyBvbmx5IHRoZSB0ZXh0IG9mIGFuIGA8b3B0aW9uPi4uLi48L29wdGlvbj5gIGVsZW1lbnQgKHRoZSB2YWx1ZSBuYXR1cmFsbHkgZGVmYXVsdHMgdG8gdGhlIHRleHQpXG4gKiAqIHtAbGluayB2YWx1ZU9wdGlvbn0gLSBzcGVjaWZpZXMgYm90aCB0aGUgdGV4dCAoYC5uYW1lYCkgYW5kIHRoZSB2YWx1ZSAoYC5hbGlhc2ApIG9mIGFuIGA8b3B0aW9uLi4uLjwvb3B0aW9uPmAgZWxlbWVudFxuICogKiB7QGxpbmsgc3VibWVudX0gLSBzcGVjaWZpZXMgYW4gYDxvcHRncm91cD4uLi4uPC9vcHRncm91cD5gIGVsZW1lbnRcbiAqL1xuXG4vKipcbiAqIEBzdW1tYXJ5IENyZWF0ZXMgYSBuZXcgYGlucHV0IHR5cGU9dGV4dGAgZWxlbWVudCBvciBwb3B1bGF0ZWQgYHNlbGVjdGAgZWxlbWVudC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWdOYW1lIC0gTXVzdCBiZSBvbmUgb2Y6XG4gKiAqIGAnaW5wdXQnYCBmb3IgYSB0ZXh0IGJveFxuICogKiBgJ3NlbGVjdCdgIGZvciBhIGRyb3AtZG93blxuICogKiBgJ29wdGdyb3VwJ2AgKGZvciBpbnRlcm5hbCB1c2Ugb25seSlcbiAqIEBwYXJhbSB7ZmllbGRPcHRpb25bXX0gW21lbnVdIC0gSGllcmFyY2hpY2FsIGxpc3Qgb2Ygc3RyaW5ncyB0byBhZGQgYXMgYDxvcHRpb24+Li4uPC9vcHRpb24+YCBvciBgPG9wdGdyb3VwPi4uLi48L29wdGdyb3VwPmAgZWxlbWVudHMuIE9taXQgdG8gY3JlYXRlIGEgdGV4dCBib3guXG4gKiBAcGFyYW0ge251bGx8c3RyaW5nfSBbb3B0aW9ucy5wcm9tcHQ9JyddIC0gQWRkcyBhbiBpbml0aWFsIGA8b3B0aW9uPi4uLjwvb3B0aW9uPmAgZWxlbWVudCB0byB0aGUgZHJvcC1kb3duIHdpdGggdGhpcyB2YWx1ZSBpbiBwYXJlbnRoZXNlcyBhcyBpdHMgYHRleHRgOyBhbmQgZW1wdHkgc3RyaW5nIGFzIGl0cyBgdmFsdWVgLiBEZWZhdWx0IGlzIGVtcHR5IHN0cmluZywgd2hpY2ggY3JlYXRlcyBhIGJsYW5rIHByb21wdDsgYG51bGxgIHN1cHByZXNzZXMgcHJvbXB0IGFsdG9nZXRoZXIuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IC0gV2hldGhlciB0byBhbHBoYSBzb3J0IG9yIG5vdC4gSWYgdHJ1dGh5LCBzb3J0cyBlYWNoIG9wdGdyb3VwIG9uIGl0cyBgbGFiZWxgOyBhbmQgZWFjaCBzZWxlY3Qgb3B0aW9uIG9uIGl0cyBgYWxpYXNgIGlmIGdpdmVuLCBvciBpdHMgYG5hbWVgIGlmIG5vdC5cbiAqIEBwYXJhbSB7bnVtYmVyW119IGJyZWFkY3J1bWJzIC0gTGlzdCBvZiBvcHRpb24gZ3JvdXAgc2VjdGlvbiBudW1iZXJzIChyb290IGlzIHNlY3Rpb24gMCkuXG4gKiBAcmV0dXJucyB7RWxlbWVudH0gRWl0aGVyIGEgYDxzZWxlY3Q+YCBvciBgPG9wdGdyb3VwPmAgZWxlbWVudC5cbiAqL1xuZnVuY3Rpb24gYnVpbGRFbGVtZW50KHRhZ05hbWUsIG1lbnUsIG9wdGlvbnMpIHtcbiAgICB2YXIgcHJvbXB0ID0gb3B0aW9ucyAmJiBvcHRpb25zLnByb21wdCxcbiAgICAgICAgc29ydCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5zb3J0LFxuICAgICAgICBicmVhZGNydW1icyA9IG9wdGlvbnMgJiYgb3B0aW9ucy5icmVhZGNydW1icyB8fCBbXSxcbiAgICAgICAgcGF0aCA9IGJyZWFkY3J1bWJzID8gYnJlYWRjcnVtYnMuam9pbignLicpICsgJy4nIDogJycsXG4gICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcblxuICAgIGlmIChtZW51KSB7XG4gICAgICAgIHZhciBhZGQsIG5ld09wdGlvbjtcbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdzZWxlY3QnKSB7XG4gICAgICAgICAgICBhZGQgPSBlbC5hZGQ7XG4gICAgICAgICAgICBpZiAocHJvbXB0KSB7XG4gICAgICAgICAgICAgICAgbmV3T3B0aW9uID0gbmV3IE9wdGlvbignKCcgKyBwcm9tcHQsICcnKTtcbiAgICAgICAgICAgICAgICBuZXdPcHRpb24uaW5uZXJIVE1MICs9ICcmaGVsbGlwOyknO1xuICAgICAgICAgICAgICAgIGVsLmFkZChuZXdPcHRpb24pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9tcHQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBlbC5hZGQobmV3IE9wdGlvbigpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZCA9IGVsLmFwcGVuZENoaWxkO1xuICAgICAgICAgICAgZWwubGFiZWwgPSBwcm9tcHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc29ydCkge1xuICAgICAgICAgICAgbWVudSA9IG1lbnUuc2xpY2UoKS5zb3J0KGZpZWxkQ29tcGFyYXRvcik7IC8vIHNvcnRlZCBjbG9uZVxuICAgICAgICB9XG5cbiAgICAgICAgbWVudS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgc3VibWVudSA9IGl0ZW0uc3VibWVudSB8fCBpdGVtO1xuICAgICAgICAgICAgaWYgKHN1Ym1lbnUgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgIHZhciBvcHRncm91cCA9IGJ1aWxkRWxlbWVudChcbiAgICAgICAgICAgICAgICAgICAgJ29wdGdyb3VwJyxcbiAgICAgICAgICAgICAgICAgICAgc3VibWVudSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWRjcnVtYnM6IGJyZWFkY3J1bWJzLmNvbmNhdChpbmRleCArIDEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBpdGVtLmxhYmVsIHx8ICdcXHhhNycgKyBwYXRoICsgKGluZGV4ICsgMSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgZWwuYWRkKG9wdGdyb3VwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0VsZW1lbnQ7XG5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld0VsZW1lbnQgPSBuZXcgT3B0aW9uKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWl0ZW0uaGlkZGVuKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld0VsZW1lbnQgPSBuZXcgT3B0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5hbGlhcyB8fCBpdGVtLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLm5hbWUgfHwgaXRlbS5hbGlhc1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChuZXdFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZC5jYWxsKGVsLCBuZXdFbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsLnR5cGUgPSAndGV4dCc7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiBmaWVsZENvbXBhcmF0b3IoYSwgYikge1xuICAgIGEgPSBhLmFsaWFzIHx8IGEubmFtZSB8fCBhLmxhYmVsIHx8IGE7XG4gICAgYiA9IGIuYWxpYXMgfHwgYi5uYW1lIHx8IGIubGFiZWwgfHwgYjtcbiAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYnVpbGRFbGVtZW50O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ29iamVjdC1pdGVyYXRvcnMnKTtcbnZhciByZWdFeHBMSUtFID0gcmVxdWlyZSgncmVnZXhwLWxpa2UnKTtcblxudmFyIExJS0UgPSAnTElLRSAnLFxuICAgIE5PVF9MSUtFID0gJ05PVCAnICsgTElLRSxcbiAgICBMSUtFX1dJTERfQ0FSRCA9ICclJztcblxudmFyIG9wZXJhdG9ycyA9IHtcbiAgICAnPCc6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYSA8IGI7IH0sXG4gICAgICAgIHNxbDogc3FsRGlhZGljLmJpbmQodGhpcywgJzwnKVxuICAgIH0sXG4gICAgJ1xcdTIyNjQnOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPD0gYjsgfSxcbiAgICAgICAgc3FsOiBzcWxEaWFkaWMuYmluZCh0aGlzLCAnPD0nKVxuICAgIH0sXG4gICAgJz0nOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPT09IGI7IH0sXG4gICAgICAgIHNxbDogc3FsRGlhZGljLmJpbmQodGhpcywgJz0nKVxuICAgIH0sXG4gICAgJ1xcdTIyNjUnOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPj0gYjsgfSxcbiAgICAgICAgc3FsOiBzcWxEaWFkaWMuYmluZCh0aGlzLCAnPj0nKVxuICAgIH0sXG4gICAgJz4nOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPiBiOyB9LFxuICAgICAgICBzcWw6IHNxbERpYWRpYy5iaW5kKHRoaXMsICc+JylcbiAgICB9LFxuICAgICdcXHUyMjYwJzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhICE9PSBiOyB9LFxuICAgICAgICBzcWw6IHNxbERpYWRpYy5iaW5kKHRoaXMsICc8PicpXG4gICAgfSxcbiAgICBMSUtFOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIHJlZ0V4cExJS0UuY2FjaGVkKGIsIHRydWUpLnRlc3QoYSk7IH0sXG4gICAgICAgIHNxbDogc3FsRGlhZGljLmJpbmQodGhpcywgJ0xJS0UnKSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuICAgICdOT1QgTElLRSc6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gIXJlZ0V4cExJS0UuY2FjaGVkKGIsIHRydWUpLnRlc3QoYSk7IH0sXG4gICAgICAgIHNxbDogc3FsRGlhZGljLmJpbmQodGhpcywgJ05PVCBMSUtFJyksXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfSxcbiAgICBJTjogeyAvLyBUT0RPOiBjdXJyZW50bHkgZm9yY2luZyBzdHJpbmcgdHlwaW5nOyByZXdvcmsgY2FsbGluZyBjb2RlIHRvIHJlc3BlY3QgY29sdW1uIHR5cGVcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gaW5PcChhLCBiKSA+PSAwOyB9LFxuICAgICAgICBzcWw6IHNxbElOLmJpbmQodGhpcywgJ0lOJyksXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfSxcbiAgICAnTk9UIElOJzogeyAvLyBUT0RPOiBjdXJyZW50bHkgZm9yY2luZyBzdHJpbmcgdHlwaW5nOyByZXdvcmsgY2FsbGluZyBjb2RlIHRvIHJlc3BlY3QgY29sdW1uIHR5cGVcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gaW5PcChhLCBiKSA8IDA7IH0sXG4gICAgICAgIHNxbDogc3FsSU4uYmluZCh0aGlzLCAnTk9UIElOJyksXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfSxcbiAgICBDT05UQUlOUzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBjb250YWluc09wKGEsIGIpID49IDA7IH0sXG4gICAgICAgIHNxbDogc3FsTElLRS5iaW5kKHRoaXMsIExJS0VfV0lMRF9DQVJELCBMSUtFX1dJTERfQ0FSRCwgTElLRSksXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfSxcbiAgICAnTk9UIENPTlRBSU5TJzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBjb250YWluc09wKGEsIGIpIDwgMDsgfSxcbiAgICAgICAgc3FsOiBzcWxMSUtFLmJpbmQodGhpcywgTElLRV9XSUxEX0NBUkQsIExJS0VfV0lMRF9DQVJELCBOT1RfTElLRSksXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfSxcbiAgICBCRUdJTlM6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyBiID0gYi50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7IHJldHVybiBiZWdpbnNPcChhLCBiLmxlbmd0aCkgPT09IGI7IH0sXG4gICAgICAgIHNxbDogc3FsTElLRS5iaW5kKHRoaXMsICcnLCBMSUtFX1dJTERfQ0FSRCwgTElLRSksXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfSxcbiAgICAnTk9UIEJFR0lOUyc6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyBiID0gYi50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7IHJldHVybiBiZWdpbnNPcChhLCBiLmxlbmd0aCkgIT09IGI7IH0sXG4gICAgICAgIHNxbDogc3FsTElLRS5iaW5kKHRoaXMsICcnLCBMSUtFX1dJTERfQ0FSRCwgTk9UX0xJS0UpLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG4gICAgRU5EUzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IGIgPSBiLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTsgcmV0dXJuIGVuZHNPcChhLCBiLmxlbmd0aCkgPT09IGI7IH0sXG4gICAgICAgIHNxbDogc3FsTElLRS5iaW5kKHRoaXMsIExJS0VfV0lMRF9DQVJELCAnJywgTElLRSksXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfSxcbiAgICAnTk9UIEVORFMnOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgYiA9IGIudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpOyByZXR1cm4gZW5kc09wKGEsIGIubGVuZ3RoKSAhPT0gYjsgfSxcbiAgICAgICAgc3FsOiBzcWxMSUtFLmJpbmQodGhpcywgTElLRV9XSUxEX0NBUkQsICcnLCBOT1RfTElLRSksXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfVxufTtcblxuZnVuY3Rpb24gaW5PcChhLCBiKSB7XG4gICAgcmV0dXJuIGJcbiAgICAgICAgLnRyaW0oKSAvLyByZW1vdmUgbGVhZGluZyBhbmQgdHJhaWxpbmcgc3BhY2UgY2hhcnNcbiAgICAgICAgLnJlcGxhY2UoL1xccyosXFxzKi9nLCAnLCcpIC8vIHJlbW92ZSBhbnkgd2hpdGUtc3BhY2UgY2hhcnMgZnJvbSBhcm91bmQgY29tbWFzXG4gICAgICAgIC5zcGxpdCgnLCcpIC8vIHB1dCBpbiBhbiBhcnJheVxuICAgICAgICAuaW5kZXhPZihhLnRvU3RyaW5nKCkpOyAvLyBzZWFyY2ggYXJyYXkgd2hvbGUgbWF0Y2hlc1xufVxuXG5mdW5jdGlvbiBjb250YWluc09wKGEsIGIpIHtcbiAgICByZXR1cm4gYS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihiLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSk7XG59XG5cbmZ1bmN0aW9uIGJlZ2luc09wKGEsIGxlbmd0aCkge1xuICAgIHJldHVybiBhLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKS5zdWJzdHIoMCwgbGVuZ3RoKTtcbn1cblxuZnVuY3Rpb24gZW5kc09wKGEsIGxlbmd0aCkge1xuICAgIHJldHVybiBhLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKS5zdWJzdHIoLWxlbmd0aCwgbGVuZ3RoKTtcbn1cblxuZnVuY3Rpb24gc3FsTElLRShiZWcsIGVuZCwgTElLRV9PUl9OT1RfTElLRSwgYSwgbGlrZVBhdHRlcm4pIHtcbiAgICB2YXIgZXNjYXBlZCA9IGxpa2VQYXR0ZXJuLnJlcGxhY2UoLyhbXFxbXyVcXF1dKS9nLCAnWyQxXScpOyAvLyBlc2NhcGUgYWxsIExJS0UgcmVzZXJ2ZWQgY2hhcnNcbiAgICByZXR1cm4gaWRlbnRpZmllcihhKSArICcgJyArIExJS0VfT1JfTk9UX0xJS0UgKyAnICcgKyBnZXRTcWxTdHJpbmcoYmVnICsgZXNjYXBlZCArIGVuZCk7XG59XG5cbmZ1bmN0aW9uIHNxbElOKG9wLCBhLCBiKSB7XG4gICAgcmV0dXJuIGlkZW50aWZpZXIoYSkgKyAnICcgKyBvcCArICcgKFxcJycgKyBzcUVzYyhiKS5yZXBsYWNlKC9cXHMqLFxccyovZywgJ1xcJywgXFwnJykgKyAnXFwnKSc7XG59XG5cbmZ1bmN0aW9uIGlkZW50aWZpZXIocykge1xuICAgIHJldHVybiBzLmxpdGVyYWwgPyBnZXRTcWxTdHJpbmcocy5saXRlcmFsKSA6IGdldFNxbElkZW50aWZpZXIocy5pZGVudGlmaWVyID8gcy5pZGVudGlmaWVyIDogcyk7XG59XG5cbmZ1bmN0aW9uIGxpdGVyYWwocykge1xuICAgIHJldHVybiBzLmlkZW50aWZpZXIgPyBnZXRTcWxJZGVudGlmaWVyKHMuaWRlbnRpZmllcikgOiBnZXRTcWxTdHJpbmcocy5saXRlcmFsID8gcy5saXRlcmFsIDogcyk7XG59XG5cbmZ1bmN0aW9uIHNxbERpYWRpYyhvcCwgYSwgYikge1xuICAgIHJldHVybiBpZGVudGlmaWVyKGEpICsgb3AgKyBsaXRlcmFsKGIpO1xufVxuXG5mdW5jdGlvbiBzcUVzYyhzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoLycvZywgJ1xcJ1xcJycpO1xufVxuXG5mdW5jdGlvbiBnZXRTcWxTdHJpbmcoc3RyaW5nKSB7XG4gICAgcmV0dXJuICdcXCcnICsgc3FFc2Moc3RyaW5nKSArICdcXCcnO1xufVxuXG5mdW5jdGlvbiBnZXRTcWxJZGVudGlmaWVyKGlkKSB7XG4gICAgcmV0dXJuICdcXFwiJyArIHNxRXNjKGlkKSArICdcXFwiJztcbn1cblxuLy8gdGhlIG9wZXJhdG9ycyBhcyBkcm9wLWRvd24gXCJvcHRpb24gZ3JvdXBzXCI6XG52YXIgZ3JvdXBzID0ge1xuICAgIGVxdWFsaXR5OiB7XG4gICAgICAgIGxhYmVsOiAnRXF1YWxpdHknLFxuICAgICAgICBzdWJtZW51OiBbJz0nXVxuICAgIH0sXG4gICAgaW5lcXVhbGl0aWVzOiB7XG4gICAgICAgIGxhYmVsOiAnSW5lcXVhbGl0eScsXG4gICAgICAgIHN1Ym1lbnU6IFsnPCcsICdcXHUyMjY0JywgJ1xcdTIyNjAnLCAnXFx1MjI2NScsICc+J11cbiAgICB9LFxuICAgIHNldHM6IHtcbiAgICAgICAgbGFiZWw6ICdTZXQgc2NhbicsXG4gICAgICAgIHN1Ym1lbnU6IFsnSU4nLCAnTk9UIElOJ11cbiAgICB9LFxuICAgIHN0cmluZ3M6IHtcbiAgICAgICAgbGFiZWw6ICdTdHJpbmcgc2NhbicsXG4gICAgICAgIHN1Ym1lbnU6IFtcbiAgICAgICAgICAgICdDT05UQUlOUycsICdOT1QgQ09OVEFJTlMnLFxuICAgICAgICAgICAgJ0JFR0lOUycsICdOT1QgQkVHSU5TJyxcbiAgICAgICAgICAgICdFTkRTJywgJ05PVCBFTkRTJ1xuICAgICAgICBdXG4gICAgfSxcbiAgICBwYXR0ZXJuczoge1xuICAgICAgICBsYWJlbDogJ1BhdHRlcm4gbWF0Y2hpbmcnLFxuICAgICAgICBzdWJtZW51OiBbJ0xJS0UnLCAnTk9UIExJS0UnXVxuICAgIH1cbn07XG5cbi8vIGFkZCBhIGBuYW1lYCBwcm9wIHRvIGVhY2ggZ3JvdXBcbl8oZ3JvdXBzKS5lYWNoKGZ1bmN0aW9uKGdyb3VwLCBrZXkpIHsgZ3JvdXAubmFtZSA9IGtleTsgfSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIG9wZXJhdG9yczogb3BlcmF0b3JzLFxuICAgIGdyb3VwczogZ3JvdXBzLFxuICAgIG1lbnU6IFsgLy8gaGllcmFyY2hpY2FsIG1lbnUgb2YgcmVsYXRpb25hbCBvcGVyYXRvcnNcbiAgICAgICAgZ3JvdXBzLmVxdWFsaXR5LFxuICAgICAgICBncm91cHMuaW5lcXVhbGl0aWVzLFxuICAgICAgICBncm91cHMuc2V0cyxcbiAgICAgICAgZ3JvdXBzLnN0cmluZ3MsXG4gICAgICAgIGdyb3Vwcy5wYXR0ZXJuc1xuICAgIF1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjc3NJbmplY3RvciA9IHJlcXVpcmUoJ2Nzcy1pbmplY3RvcicpO1xuXG52YXIgY3NzOyAvLyBkZWZpbmVkIGJ5IGNvZGUgaW5zZXJ0ZWQgYnkgZ3VscGZpbGUgYmV0d2VlbiBmb2xsb3dpbmcgY29tbWVudHNcbi8qIGluamVjdDpjc3MgKi9cbmNzcyA9ICcuZmlsdGVyLXRyZWV7Zm9udC1mYW1pbHk6c2Fucy1zZXJpZjtmb250LXNpemU6MTBwdDtsaW5lLWhlaWdodDoxLjVlbX0uZmlsdGVyLXRyZWUgbGFiZWx7Zm9udC13ZWlnaHQ6NDAwfS5maWx0ZXItdHJlZSBpbnB1dFt0eXBlPWNoZWNrYm94XSwuZmlsdGVyLXRyZWUgaW5wdXRbdHlwZT1yYWRpb117bGVmdDozcHg7bWFyZ2luLXJpZ2h0OjNweH0uZmlsdGVyLXRyZWUgb2x7bWFyZ2luLXRvcDowfS5maWx0ZXItdHJlZS1hZGQsLmZpbHRlci10cmVlLWFkZC1maWx0ZXIsLmZpbHRlci10cmVlLXJlbW92ZXtjdXJzb3I6cG9pbnRlcn0uZmlsdGVyLXRyZWUtYWRkLC5maWx0ZXItdHJlZS1hZGQtZmlsdGVye2ZvbnQtc3R5bGU6aXRhbGljO2NvbG9yOiM0NDQ7Zm9udC1zaXplOjkwJX0uZmlsdGVyLXRyZWUtYWRkLWZpbHRlcnttYXJnaW46M3B4IDA7ZGlzcGxheTppbmxpbmUtYmxvY2t9LmZpbHRlci10cmVlLWFkZC1maWx0ZXI6aG92ZXIsLmZpbHRlci10cmVlLWFkZDpob3Zlcnt0ZXh0LWRlY29yYXRpb246dW5kZXJsaW5lfS5maWx0ZXItdHJlZS1hZGQtZmlsdGVyLmFzLW1lbnUtaGVhZGVyLC5maWx0ZXItdHJlZS1hZGQuYXMtbWVudS1oZWFkZXJ7YmFja2dyb3VuZC1jb2xvcjojZmZmO2ZvbnQtd2VpZ2h0OjcwMDtmb250LXN0eWxlOm5vcm1hbH0uZmlsdGVyLXRyZWUtYWRkLWZpbHRlci5hcy1tZW51LWhlYWRlcjpob3Zlcnt0ZXh0LWRlY29yYXRpb246aW5oZXJpdH0uZmlsdGVyLXRyZWUtYWRkLWZpbHRlcj5kaXYsLmZpbHRlci10cmVlLWFkZD5kaXYsLmZpbHRlci10cmVlLXJlbW92ZXtkaXNwbGF5OmlubGluZS1ibG9jazt3aWR0aDoxNXB4O2hlaWdodDoxNXB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQtY29sb3I6IzhjODtmb250LXNpemU6MTEuNXB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjojZmZmO3RleHQtYWxpZ246Y2VudGVyO2xpbmUtaGVpZ2h0Om5vcm1hbDtmb250LXN0eWxlOm5vcm1hbDtmb250LWZhbWlseTpzYW5zLXNlcmlmO3RleHQtc2hhZG93OjAgMCAxLjVweCBncmV5O21hcmdpbi1yaWdodDo0cHh9LmZpbHRlci10cmVlLWFkZC1maWx0ZXI+ZGl2OmJlZm9yZSwuZmlsdGVyLXRyZWUtYWRkPmRpdjpiZWZvcmV7Y29udGVudDpcXCdcXFxcZmYwYlxcJ30uZmlsdGVyLXRyZWUtcmVtb3Zle2JhY2tncm91bmQtY29sb3I6I2U4ODtib3JkZXI6MH0uZmlsdGVyLXRyZWUtcmVtb3ZlOmJlZm9yZXtjb250ZW50OlxcJ1xcXFwyMjEyXFwnfS5maWx0ZXItdHJlZSBsaTo6YWZ0ZXJ7Zm9udC1zaXplOjcwJTtmb250LXN0eWxlOml0YWxpYztmb250LXdlaWdodDo3MDA7Y29sb3I6IzA4MH0uZmlsdGVyLXRyZWU+b2w+bGk6bGFzdC1jaGlsZDo6YWZ0ZXJ7ZGlzcGxheTpub25lfS5maWx0ZXItdHJlZS1hZGQsLmZpbHRlci10cmVlLWFkZC1maWx0ZXIsLm9wLWFuZD5vbCwub3Atbm9yPm9sLC5vcC1vcj5vbHtwYWRkaW5nLWxlZnQ6MzJweH0ub3Atb3I+b2w+bGk6OmFmdGVye21hcmdpbi1sZWZ0OjIuNWVtO2NvbnRlbnQ6XFwn4oCUIE9SIOKAlFxcJ30ub3AtYW5kPm9sPmxpOjphZnRlcnttYXJnaW4tbGVmdDoyLjVlbTtjb250ZW50OlxcJ+KAlCBBTkQg4oCUXFwnfS5vcC1ub3I+b2w+bGk6OmFmdGVye21hcmdpbi1sZWZ0OjIuNWVtO2NvbnRlbnQ6XFwn4oCUIE5PUiDigJRcXCd9LmZpbHRlci10cmVlLWVkaXRvcj4qe2ZvbnQtd2VpZ2h0OjcwMH0uZmlsdGVyLXRyZWUtZWRpdG9yPnNwYW57Zm9udC1zaXplOnNtYWxsZXJ9LmZpbHRlci10cmVlLWVkaXRvcj5pbnB1dFt0eXBlPXRleHRde3dpZHRoOjhlbTtwYWRkaW5nOjFweCA1cHggMnB4fS5maWx0ZXItdHJlZS1kZWZhdWx0PjplbmFibGVke21hcmdpbjowIC40ZW07YmFja2dyb3VuZC1jb2xvcjojZGRkO2JvcmRlcjowfS5maWx0ZXItdHJlZS1kZWZhdWx0PnNlbGVjdHtib3JkZXI6MH0uZmlsdGVyLXRyZWUtZGVmYXVsdD4uZmlsdGVyLXRyZWUtd2FybmluZ3tiYWNrZ3JvdW5kLWNvbG9yOiNmZmN9LmZpbHRlci10cmVlLWRlZmF1bHQ+LmZpbHRlci10cmVlLWVycm9ye2JhY2tncm91bmQtY29sb3I6I0ZjY30uZmlsdGVyLXRyZWUgLmZvb3Rub3Rlc3tmb250LXNpemU6NnB0O21hcmdpbjoycHggMCAwO2xpbmUtaGVpZ2h0Om5vcm1hbDt3aGl0ZS1zcGFjZTpub3JtYWw7Y29sb3I6Izk5OX0uZmlsdGVyLXRyZWUgLmZvb3Rub3Rlcz5vbHttYXJnaW46MDtwYWRkaW5nLWxlZnQ6MmVtfS5maWx0ZXItdHJlZSAuZm9vdG5vdGVzPm9sPmxpe21hcmdpbjoycHggMH0uZmlsdGVyLXRyZWUgLmZvb3Rub3RlcyAuZmllbGQtbmFtZSwuZmlsdGVyLXRyZWUgLmZvb3Rub3RlcyAuZmllbGQtdmFsdWV7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOiM3Nzd9LmZpbHRlci10cmVlIC5mb290bm90ZXMgLmZpZWxkLXZhbHVlOmFmdGVyLC5maWx0ZXItdHJlZSAuZm9vdG5vdGVzIC5maWVsZC12YWx1ZTpiZWZvcmV7Y29udGVudDpcXCdcXFwiXFwnfS5maWx0ZXItdHJlZSAuZm9vdG5vdGVzIC5maWVsZC12YWx1ZXtmb250LWZhbWlseTptb25vc3BhY2V9LmZpbHRlci10cmVlLWNob29zZXJ7cG9zaXRpb246YWJzb2x1dGU7Zm9udC1zaXplOjlwdDtvdXRsaW5lOjA7Ym94LXNoYWRvdzo1cHggNXB4IDEwcHggZ3JleX0nO1xuLyogZW5kaW5qZWN0ICovXG5cbm1vZHVsZS5leHBvcnRzID0gY3NzSW5qZWN0b3IuYmluZCh0aGlzLCBjc3MpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVOYW1lID0gL14oXCIoLis/KVwifChbQS1aX11bQS1aX0BcXCQjXSopXFxiKS9pLCAvLyBbMl0gfHwgWzNdXG4gICAgcmVPcCA9IC9eKCg9fD49P3w8Wz49XT8pfChOT1QgKT8oTElLRXxJTilcXGIpL2ksIC8vIFsxXVxuICAgIHJlTGl0ID0gL14nKFxcZCspJy8sXG4gICAgcmVMaXRBbnl3aGVyZSA9IC8nKFxcZCspJy8sXG4gICAgcmVJbiA9IC9eXFwoKC4qPylcXCkvLFxuICAgIHJlQm9vbCA9IC9eKEFORHxPUilcXGIvaSxcbiAgICByZUdyb3VwID0gL14oTk9UID8pP1xcKC9pO1xuXG52YXIgU1FUID0gJ1xcJyc7XG5cbnZhciBsaXRlcmFscztcblxuZnVuY3Rpb24gc3FsV2hlcmVQYXJzZSh3aGVyZUNsYXVzZSkge1xuICAgIHJldHVybiB3YWxrKHN0cmlwTGl0ZXJhbHMod2hlcmVDbGF1c2UpKTtcbn1cblxuZnVuY3Rpb24gd2Fsayh0KSB7XG4gICAgdmFyIG0sIG5hbWUsIG9wLCBhcmcsIGJvb2wsIHRva2VuLCB0b2tlbnMgPSBbXTtcbiAgICB2YXIgaSA9IDA7XG5cbiAgICB0ID0gdC50cmltKCk7XG5cbiAgICB3aGlsZSAoaSA8IHQubGVuZ3RoKSB7XG4gICAgICAgIG0gPSB0LnN1YnN0cihpKS5tYXRjaChyZUdyb3VwKTtcbiAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgIHZhciBub3QgPSAhIW1bMV07XG5cbiAgICAgICAgICAgIGkgKz0gbVswXS5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gaSwgdiA9IDE7IGogPCB0Lmxlbmd0aCAmJiB2OyArK2opIHtcbiAgICAgICAgICAgICAgICBpZiAodFtqXSA9PT0gJygnKSB7XG4gICAgICAgICAgICAgICAgICAgICsrdjtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRbal0gPT09ICcpJykge1xuICAgICAgICAgICAgICAgICAgICAtLXY7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgIHRocm93ICdFeHBlY3RlZCBcIilcIic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b2tlbiA9IHdhbGsodC5zdWJzdHIoaSwgaiAtIDEgLSBpKSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG5vdCkge1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi5vcGVyYXRvciAhPT0gJ29wLW9yJykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnRXhwZWN0ZWQgT1IgaW4gTk9UKC4uLikgc3ViZXhwcmVzc2lvbiBidXQgZm91bmQgJyArIHRva2VuLm9wZXJhdG9yLnN1YnN0cigzKS50b1VwcGVyQ2FzZSgpICsgJy4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0b2tlbi5vcGVyYXRvciA9ICdvcC1ub3InO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpID0gajtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG0gPSB0LnN1YnN0cihpKS5tYXRjaChyZU5hbWUpO1xuICAgICAgICAgICAgaWYgKCFtKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ0V4cGVjdGVkIGlkZW50aWZpZXIgb3IgcXVvdGVkIGlkZW50aWZpZXIuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5hbWUgPSBtWzJdIHx8IG1bM107XG4gICAgICAgICAgICBpZiAoIS9eW0EtWl9dL2kudGVzdCh0W2ldKSkgeyBpICs9IDI7IH1cbiAgICAgICAgICAgIGkgKz0gbmFtZS5sZW5ndGg7XG5cbiAgICAgICAgICAgIGlmICh0W2ldID09PSAnICcpIHsgKytpOyB9XG4gICAgICAgICAgICBtID0gdC5zdWJzdHIoaSkubWF0Y2gocmVPcCk7XG4gICAgICAgICAgICBpZiAoIW0pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyAnRXhwZWN0ZWQgcmVsYXRpb25hbCBvcGVyYXRvci4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3AgPSBtWzFdLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICBpICs9IG9wLmxlbmd0aDtcblxuICAgICAgICAgICAgaWYgKHRbaV0gPT09ICcgJykgeyArK2k7IH1cbiAgICAgICAgICAgIGlmIChtWzRdICYmIG1bNF0udG9VcHBlckNhc2UoKSA9PT0gJ0lOJykge1xuICAgICAgICAgICAgICAgIG0gPSB0LnN1YnN0cihpKS5tYXRjaChyZUluKTtcbiAgICAgICAgICAgICAgICBpZiAoIW0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgJ0V4cGVjdGVkIHBhcmVudGhlc2l6ZWQgbGlzdC4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhcmcgPSBtWzFdO1xuICAgICAgICAgICAgICAgIGkgKz0gYXJnLmxlbmd0aCArIDI7XG4gICAgICAgICAgICAgICAgd2hpbGUgKChtID0gYXJnLm1hdGNoKHJlTGl0QW55d2hlcmUpKSkge1xuICAgICAgICAgICAgICAgICAgICBhcmcgPSBhcmcucmVwbGFjZShyZUxpdEFueXdoZXJlLCBsaXRlcmFsc1ttWzFdXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtID0gdC5zdWJzdHIoaSkubWF0Y2gocmVMaXQpO1xuICAgICAgICAgICAgICAgIGlmICghbSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnRXhwZWN0ZWQgc3RyaW5nIGxpdGVyYWwuJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXJnID0gbVsxXTtcbiAgICAgICAgICAgICAgICBpICs9IGFyZy5sZW5ndGggKyAyO1xuICAgICAgICAgICAgICAgIGFyZyA9IGxpdGVyYWxzW2FyZ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRva2VuID0ge1xuICAgICAgICAgICAgICAgIGNvbHVtbjogbmFtZSxcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogb3AsXG4gICAgICAgICAgICAgICAgbGl0ZXJhbDogYXJnXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuXG4gICAgICAgIGlmIChpIDwgdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0W2ldID09PSAnICcpIHsgKytpOyB9XG4gICAgICAgICAgICBtID0gdC5zdWJzdHIoaSkubWF0Y2gocmVCb29sKTtcbiAgICAgICAgICAgIGlmICghbSkge1xuICAgICAgICAgICAgICAgIHRocm93ICdFeHBlY3RlZCBib29sZWFuIG9wZWFyYXRvci4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYm9vbCA9IG1bMV0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGkgKz0gYm9vbC5sZW5ndGg7XG4gICAgICAgICAgICBib29sID0gJ29wLScgKyBib29sO1xuICAgICAgICAgICAgaWYgKHRva2Vucy5vcGVyYXRvciAmJiB0b2tlbnMub3BlcmF0b3IgIT09IGJvb2wpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyAnRXhwZWN0ZWQgc2FtZSBib29sZWFuIG9wZXJhdG9yIHRocm91Z2hvdXQgc3ViZXhwcmVzc2lvbi4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9rZW5zLm9wZXJhdG9yID0gYm9vbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0W2ldID09PSAnICcpIHsgKytpOyB9XG4gICAgfVxuXG4gICAgcmV0dXJuIChcbiAgICAgICAgdG9rZW5zLmxlbmd0aCA9PT0gMVxuICAgICAgICAgICAgPyB0b2tlbnNbMF1cbiAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiB0b2tlbnMub3BlcmF0b3IsXG4gICAgICAgICAgICAgICAgY2hpbGRyZW46IHRva2Vuc1xuICAgICAgICAgICAgfVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHN0cmlwTGl0ZXJhbHModCkge1xuICAgIHZhciBpID0gMCwgaiA9IDAsIGs7XG5cbiAgICBsaXRlcmFscyA9IFtdO1xuXG4gICAgd2hpbGUgKChqID0gdC5pbmRleE9mKFNRVCwgaikpID49IDApIHtcbiAgICAgICAgayA9IGo7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGsgPSB0LmluZGV4T2YoU1FULCBrICsgMSk7XG4gICAgICAgICAgICBpZiAoayA8IDApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyAnRXhwZWN0ZWQgJyArIFNRVCArICcgKHNpbmdsZSBxdW90ZSkuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSB3aGlsZSAodFsrK2tdID09PSBTUVQpO1xuICAgICAgICBsaXRlcmFscy5wdXNoKHQuc2xpY2UoKytqLCAtLWspLnJlcGxhY2UoLycnL2csIFNRVCkpO1xuICAgICAgICB0ID0gdC5zdWJzdHIoMCwgaikgKyBpICsgdC5zdWJzdHIoayk7XG4gICAgICAgIGogPSBqICsgMSArIGkudG9TdHJpbmcoKS5sZW5ndGggKyAxO1xuICAgICAgICBpKys7XG4gICAgfVxuXG4gICAgcmV0dXJuIHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc3FsV2hlcmVQYXJzZTtcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB0ZW1wbGV4ID0gcmVxdWlyZSgndGVtcGxleCcpO1xuXG52YXIgdGVtcGxhdGVzID0ge1xuXG4gICAgdHJlZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8qXG4gICAgICAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlXCI+XG4gICAgICAgICAgICAgTWF0Y2hcbiAgICAgICAgICAgICA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwiZmlsdGVyLXRyZWUtb3AtY2hvaWNlXCIgbmFtZT1cInRyZWVPcHsxfVwiIHZhbHVlPVwib3Atb3JcIj5hbnk8L2xhYmVsPlxuICAgICAgICAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgY2xhc3M9XCJmaWx0ZXItdHJlZS1vcC1jaG9pY2VcIiBuYW1lPVwidHJlZU9wezF9XCIgdmFsdWU9XCJvcC1hbmRcIj5hbGw8L2xhYmVsPlxuICAgICAgICAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgY2xhc3M9XCJmaWx0ZXItdHJlZS1vcC1jaG9pY2VcIiBuYW1lPVwidHJlZU9wezF9XCIgdmFsdWU9XCJvcC1ub3JcIj5ub25lPC9sYWJlbD5cbiAgICAgICAgICAgICBvZiB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbmFsczo8YnIvPlxuICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiZmlsdGVyLXRyZWUtYWRkLWZpbHRlclwiIHRpdGxlPVwiQWRkIGEgbmV3IGNvbmRpdGlvbmFsIHRvIHRoaXMgbWF0Y2guXCI+XG4gICAgICAgICAgICAgICAgPGRpdj48L2Rpdj5jb25kaXRpb25hbFxuICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlLWFkZFwiIHRpdGxlPVwiQWRkIGEgbmV3IHN1Yi1tYXRjaCB1bmRlciB0aGlzIG1hdGNoLlwiPlxuICAgICAgICAgICAgICAgIDxkaXY+PC9kaXY+c3ViZXhwcmVzc2lvblxuICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICA8b2w+PC9vbD5cbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICovXG4gICAgfSxcblxuICAgIGNvbHVtbkZpbHRlcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvKlxuICAgICAgICA8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlIG9wLWFuZFwiPlxuICAgICAgICAgICAgPHN0cm9uZz5UaGlzIHBlcm1hbmVudCBzdWJleHByZXNzaW9uIGlzIHJlc2VydmVkIGZvciB0aGUgZ3JpZCdzIDxlbT5jb2x1bW4gZmlsdGVycy48L2VtPjwvc3Ryb25nPjxici8+XG4gICAgICAgICAgICA8ZW0gc3R5bGU9XCJ3aGl0ZS1zcGFjZTogbm9ybWFsOyBmb250LXNpemU6c21hbGxlcjsgbGluZS1oZWlnaHQ6IG5vcm1hbDsgZGlzcGxheTogYmxvY2s7IG1hcmdpbjouNWVtIDFlbTsgcGFkZGluZy1sZWZ0OiAxZW07IGJvcmRlci1sZWZ0OiAuN2VtIHNvbGlkIGxpZ2h0Z3JleTtcIj5cbiAgICAgICAgICAgICAgICBFYWNoIHN1YmV4cHJlc3Npb24gaW4gdGhpcyBzZWN0aW9uIHJlcHJlc2VudHMgdGhlIGNvbnRlbnRzIG9mIGEgY29sdW1uJ3MgZmlsdGVyIGNlbGwgKGJlbG93IGhlYWRlciBjZWxsKS5cbiAgICAgICAgICAgIDwvZW0+XG4gICAgICAgICAgICBSb3cgZGF0YSBtdXN0IG1hdGNoIDxzdHJvbmc+YWxsPC9zdHJvbmc+IG9mIHRoZSBmb2xsb3dpbmcgc3ViZXhwcmVzc2lvbnM6PGJyLz5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiZmlsdGVyLXRyZWUtYWRkXCIgdGl0bGU9XCJBZGQgYSBuZXcgc3ViLW1hdGNoIHVuZGVyIHRoaXMgbWF0Y2guXCI+XG4gICAgICAgICAgICAgICA8ZGl2PjwvZGl2PmNvbHVtbiBmaWx0ZXIgc3ViZXhwcmVzc2lvblxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPG9sPjwvb2w+XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgICAgKi9cbiAgICB9LFxuXG4gICAgcmVtb3ZlQnV0dG9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLypcbiAgICAgICAgPGRpdiBjbGFzcz1cImZpbHRlci10cmVlLXJlbW92ZVwiIHRpdGxlPVwiZGVsZXRlIGNvbmRpdGlvbmFsXCI+PC9kaXY+XG4gICAgICAgICovXG4gICAgfSxcblxuICAgIG5vdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvKlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZm9vdG5vdGVzXCI+XG4gICAgICAgICAgICA8ZW0+Tm90ZSByZWdhcmRpbmcgdGhlIGFib3ZlIGV4cHJlc3Npb246PC9lbT5cbiAgICAgICAgICAgIDxzcGFuPjwvc3Bhbj5cbiAgICAgICAgICAgIFNlbGVjdCBhIG5ldyB2YWx1ZSBvciBkZWxldGUgdGhlIGV4cHJlc3Npb24gYWx0b2dldGhlci5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgICovXG4gICAgfSxcblxuICAgIG5vdGVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLypcbiAgICAgICAgIDxkaXYgY2xhc3M9XCJmb290bm90ZXNcIj5cbiAgICAgICAgICAgIDxlbT5Ob3RlcyByZWdhcmRpbmcgdGhlIGFib3ZlIGV4cHJlc3Npb246PC9lbT5cbiAgICAgICAgICAgIDxvbD48L29sPlxuICAgICAgICAgICAgU2VsZWN0IG5ldyB2YWx1ZXMgb3IgZGVsZXRlIHRoZSBleHByZXNzaW9uIGFsdG9nZXRoZXIuXG4gICAgICAgICA8L2Rpdj5cbiAgICAgICAgICovXG4gICAgfSxcblxuICAgIG9wdGlvbk1pc3Npbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvKlxuICAgICAgICBUaGUgcHJldmlvdXMgPHNwYW4gY2xhc3M9XCJmaWVsZC1uYW1lXCI+ezE6ZW5jb2RlfTwvc3Bhbj5cbiAgICAgICAgdmFsdWUgPHNwYW4gY2xhc3M9XCJmaWVsZC12YWx1ZVwiPnsyOmVuY29kZX08L3NwYW4+XG4gICAgICAgIGlzIG5vIGxvbmdlciB2YWxpZC5cbiAgICAgICAgKi9cbiAgICB9XG5cbn07XG5cbnZhciBleHRyYWN0ID0gL1xcL1xcKlxccyooW15dKz8pXFxzK1xcKlxcLy87IC8vIGZpbmRzIHRoZSBzdHJpbmcgaW5zaWRlIHRoZSAvKiAuLi4gKi87IHRoZSBncm91cCBleGNsdWRlcyB0aGUgd2hpdGVzcGFjZVxudmFyIGVuY29kZXJzID0gL1xceyhcXGQrKVxcOmVuY29kZVxcfS9nO1xuXG5mdW5jdGlvbiBnZXQodGVtcGxhdGVOYW1lKSB7XG4gICAgdmFyIHRlbXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB2YXIgdGV4dCA9IHRlbXBsYXRlc1t0ZW1wbGF0ZU5hbWVdLnRvU3RyaW5nKCkubWF0Y2goZXh0cmFjdClbMV07XG4gICAgdmFyIHRlbXBsZXhBcmdzID0gW3RleHRdLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICB2YXIga2V5cywgZW5jb2RlciA9IHt9O1xuXG4gICAgZW5jb2RlcnMubGFzdEluZGV4ID0gMDtcbiAgICB3aGlsZSAoKGtleXMgPSBlbmNvZGVycy5leGVjKHRleHQpKSkge1xuICAgICAgICBlbmNvZGVyW2tleXNbMV1dID0gdHJ1ZTtcbiAgICB9XG4gICAga2V5cyA9IE9iamVjdC5rZXlzKGVuY29kZXIpO1xuICAgIGlmIChrZXlzLmxlbmd0aCkge1xuICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB0ZW1wLnRleHRDb250ZW50ID0gdGVtcGxleEFyZ3Nba2V5XTtcbiAgICAgICAgICAgIHRlbXBsZXhBcmdzW2tleV0gPSB0ZW1wLmlubmVySFRNTDtcbiAgICAgICAgfSk7XG4gICAgICAgIHRlbXBsZXhBcmdzWzBdID0gdGV4dC5yZXBsYWNlKGVuY29kZXJzLCAneyQxfScpO1xuICAgIH1cblxuICAgIHRlbXAuaW5uZXJIVE1MID0gdGVtcGxleC5hcHBseSh0aGlzLCB0ZW1wbGV4QXJncyk7XG5cbiAgICAvLyBpZiBvbmx5IG9uZSBIVE1MRWxlbWVudCwgcmV0dXJuIGl0OyBvdGhlcndpc2UgZW50aXJlIGxpc3Qgb2Ygbm9kZXNcbiAgICByZXR1cm4gdGVtcC5jaGlsZHJlbi5sZW5ndGggPT09IDEgJiYgdGVtcC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSA/IHRlbXAuZmlyc3RDaGlsZCA6IHRlbXAuY2hpbGROb2Rlcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKiBAdHlwZWRlZiB7ZnVuY3Rpb259IG9wZXJhdGlvblJlZHVjZXJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gcFxuICogQHBhcmFtIHtib29sZWFufSBxXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVGhlIHJlc3VsdCBvZiBhcHBseWluZyB0aGUgb3BlcmF0b3IgdG8gdGhlIHR3byBwYXJhbWV0ZXJzLlxuICovXG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEB0eXBlIHtvcGVyYXRpb25SZWR1Y2VyfVxuICovXG5mdW5jdGlvbiBBTkQocCwgcSkge1xuICAgIHJldHVybiBwICYmIHE7XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEB0eXBlIHtvcGVyYXRpb25SZWR1Y2VyfVxuICovXG5mdW5jdGlvbiBPUihwLCBxKSB7XG4gICAgcmV0dXJuIHAgfHwgcTtcbn1cblxuLyoqIEB0eXBlZGVmIHtvYmVqY3R9IHRyZWVPcGVyYXRvclxuICogQGRlc2MgRWFjaCBgdHJlZU9wZXJhdG9yYCBvYmplY3QgZGVzY3JpYmVzIHR3byB0aGluZ3M6XG4gKlxuICogMS4gSG93IHRvIHRha2UgdGhlIHRlc3QgcmVzdWx0cyBvZiBfbl8gY2hpbGQgbm9kZXMgYnkgYXBwbHlpbmcgdGhlIG9wZXJhdG9yIHRvIGFsbCB0aGUgcmVzdWx0cyB0byBcInJlZHVjZVwiIGl0IGRvd24gdG8gYSBzaW5nbGUgcmVzdWx0LlxuICogMi4gSG93IHRvIGdlbmVyYXRlIFNRTCBXSEVSRSBjbGF1c2Ugc3ludGF4IHRoYXQgYXBwbGllcyB0aGUgb3BlcmF0b3IgdG8gX25fIGNoaWxkIG5vZGVzLlxuICpcbiAqIEBwcm9wZXJ0eSB7b3BlcmF0aW9uUmVkdWNlcn0gcmVkdWNlXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IHNlZWQgLVxuICogQHByb3BlcnR5IHtib29sZWFufSBhYm9ydCAtXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IG5lZ2F0ZSAtXG4gKiBAcHJvcGVydHkge3N0cmluZ30gU1FMLm9wIC1cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBTUUwuYmVnIC1cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBTUUwuZW5kIC1cbiAqL1xuXG4vKiogQSBoYXNoIG9mIHtAbGluayB0cmVlT3BlcmF0b3J9IG9iamVjdHMuXG4gKiBAdHlwZSB7b2JqZWN0fVxuICovXG52YXIgdHJlZU9wZXJhdG9ycyA9IHtcbiAgICAnb3AtYW5kJzoge1xuICAgICAgICByZWR1Y2U6IEFORCxcbiAgICAgICAgc2VlZDogdHJ1ZSxcbiAgICAgICAgYWJvcnQ6IGZhbHNlLFxuICAgICAgICBuZWdhdGU6IGZhbHNlLFxuICAgICAgICBTUUw6IHtcbiAgICAgICAgICAgIG9wOiAnQU5EJyxcbiAgICAgICAgICAgIGJlZzogJygnLFxuICAgICAgICAgICAgZW5kOiAnKSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ29wLW9yJzoge1xuICAgICAgICByZWR1Y2U6IE9SLFxuICAgICAgICBzZWVkOiBmYWxzZSxcbiAgICAgICAgYWJvcnQ6IHRydWUsXG4gICAgICAgIG5lZ2F0ZTogZmFsc2UsXG4gICAgICAgIFNRTDoge1xuICAgICAgICAgICAgb3A6ICdPUicsXG4gICAgICAgICAgICBiZWc6ICcoJyxcbiAgICAgICAgICAgIGVuZDogJyknXG4gICAgICAgIH1cbiAgICB9LFxuICAgICdvcC1ub3InOiB7XG4gICAgICAgIHJlZHVjZTogT1IsXG4gICAgICAgIHNlZWQ6IGZhbHNlLFxuICAgICAgICBhYm9ydDogdHJ1ZSxcbiAgICAgICAgbmVnYXRlOiB0cnVlLFxuICAgICAgICBTUUw6IHtcbiAgICAgICAgICAgIG9wOiAnT1InLFxuICAgICAgICAgICAgYmVnOiAnTk9UICgnLFxuICAgICAgICAgICAgZW5kOiAnKSdcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdHJlZU9wZXJhdG9ycztcbiJdfQ==
