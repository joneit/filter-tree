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
// tabz node module
// https://github.com/joneit/tabz

    /* eslint-env node, browser */

    'use strict';

    var cssInjector = require('css-injector');

    /**
     * Register/deregister click handler on all tab collections.
     * @param {Element} [options.root=document] - Where to look for tab panels (`.tabz` elements) containing tabs and folders.
     * @param {boolean} [options.unhook=false] - Remove event listener from tab panels (`.tabz` elements).
     * @param {Element} [options.referenceElement] - Passed to cssInjector's insertBefore() call.
     * @param {string} [options.defaultTabSelector='.default-tab'] - .classname or #id of the tab to select by default
     * @param {object} [options.onEnable] - Handler implementation. See {@link Tabz#onEnable|onEnable}.
     * @param {object} [options.onDisable] - Handler implementation. See {@link Tabz#onDisable|onEnable}.
     * @param {object} [options.onEnabled] - Handler implementation. See {@link Tabz#onEnabled|onEnable}.
     * @param {object} [options.onDisabled] - Handler implementation. See {@link Tabz#onDisabled|onEnable}.
     * @constructor
     */
    function Tabz(options) {
        var i, el;

        options = options || {};
        var root = options.root || document,
            unhook = options.unhook,
            referenceElement = options.referenceElement,
            defaultTabSelector = options.defaultTabSelector || '.default-tab';

        if (!unhook) {
            var css;
            /* inject:css */
            css = '.tabz,.tabz>header{position:relative}.tabz>header{display:inline-block;background-color:#fff;margin-left:1.5em;padding:5px .6em;border:1px solid #666;border-bottom-color:transparent;border-radius:6px 6px 0 0;cursor:default;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none}.tabz>header+section{position:absolute;display:none;background-color:#fff;margin-top:-1px;padding:8px;border:1px solid #666;border-radius:6px;width:85%;height:85%;z-index:0}.tabz>header+section.tabz-enable{z-index:1}.tabz>header.tabz-enable{z-index:2}.tabz-bg0{background-color:#eee!important}.tabz-bg1{background-color:#eef!important}.tabz-bg2{background-color:#efe!important}.tabz-bg3{background-color:#eff!important}.tabz-bg4{background-color:#fee!important}.tabz-bg5{background-color:#fef!important}.tabz-bg6{background-color:#ffe!important}';
            /* endinject */

            if (!referenceElement) {
                // find first <link> or <style> in <head>
                var headStuff = document.querySelector('head').children;
                for (i = 0; !referenceElement && i < headStuff.length; ++i) {
                    el = headStuff[i];
                    if (el.tagName === 'STYLE' || el.tagName === 'LINK' && el.rel === 'stylesheet') {
                        referenceElement = el;
                    }
                }
            }
            cssInjector(css, 'tabz-css-base', referenceElement);

            for (var key in options) {
                if (this[key] === noop) {
                    this[key] = options[key];
                }
            }

            /**
             * @summary The context of this tab object.
             * @desc The context may encompass any number of tab panels (`.tabz` elements).
             * @type {HTMLDocumen|HTMLElement}
             */
            this.root = root;

            // enable first tab on each tab panel (`.tabz` element)
            forEachEl('.tabz>header:first-of-type,.tabz>section:first-of-type', function(el) {
                el.classList.add('tabz-enable');
            }, root);

            // enable default tab and all its parents (must be a tab)
            this.tabTo(root.querySelector('.tabz > header' + defaultTabSelector));

            // Bug in older versions of Chrome (like v40) which was an implied break at mark-up location of an absolute positioned block. The work-around is to hide those blocks until after first render; then show them. I don't know why this works but it does. Seems to be durable.
            setTimeout(function() {
                forEachEl('.tabz > section', function(el) {
                    el.style.display = 'block';
                }, root);
            }, 0);
        }

        var method = unhook ? 'removeEventListener' : 'addEventListener';
        var boundClickHandler = onclick.bind(this);
        forEachEl('.tabz', function(tabBar) {
            tabBar.style.visibility = 'visible';
            tabBar[method]('click', boundClickHandler);
        }, root);
    }

    function onclick(evt) {
        click.call(this, evt.currentTarget, evt.target);
    }

    /**
     * @summary Selects the given tab.
     * @desc If it is a nested tab, also reveals all its ancestor tabs.
     * @param {string|HTMLElement} [el] - May be one of:
     * * `HTMLElement`
     *   * `<header>` - tab element
     *   * `<section>` - folder element
     * * `string` - CSS selector to one of the above
     * * falsy - fails silently
     * @memberOf Tabz.prototype
     */
    Tabz.prototype.tabTo = function(el) {
        while ((el = this.tab(el))) {
            click.call(this, el.parentElement, el);
            el = el.parentElement.parentElement; // loop to click on each containing tab...
        }
    };

    /**
     * Current selected tab.
     * @param {HTMLElement|number} el - An element that is (or is within) the tab panel (`.tabz` element) to look in.
     * @returns {undefined|HTMLElement} Returns tab (`<header>`) element.  Returns `undefined` if `el` is neither of the above or an out of range index.
     */
    Tabz.prototype.enabledTab = function(el) {
        el = this.panel(el);
        return el && el.querySelector(':scope>header.tabz-enable');
    };

    /**
     * @summary Get tab element.
     * @desc Get tab element if given tab or folder element; or an element within such; or find tab.
     * @param {string|Element} [el] - May be one of:
     * * a tab (a `<header>` element)
     * * a folder (a `<section>` element)
     * * an element within one of the above
     * * `string` - CSS selector to one of the above, searching within the root or document
     * @returns {null|Element} tab (`<header>...</header>`) element or `null` if not found
     * @memberOf Tabz.prototype
     */
    Tabz.prototype.tab = function(el) {
        el = lookForEl.call(this, el);
        return !(el instanceof HTMLElement) ? null : el.tagName === 'HEADER' ? el : el.tagName === 'SECTION' ? el.previousElementSibling : null;
    };

    /**
     * @summary Get folder element.
     * @desc Get folder element if given tab or folder element; or an element within such; or find folder.
     * @param {string|Element} [el] - May be one of:
     * * a tab (a `<header>` element)
     * * a folder (a `<section>` element)
     * * an element within one of the above
     * * `string` - CSS selector to one of the above, searching within the root or document
     * @returns {null|Element} tab (`<header>...</header>`) element or `null` if not found
     * @memberOf Tabz.prototype
     */
    Tabz.prototype.folder = function(el) {
        el = lookForEl.call(this, el);
        return !(el instanceof HTMLElement) ? null : el.tagName === 'SECTION' ? el : el.tagName === 'HEADER' ? el.nextElementSibling : null;
    };

    /**
     * @summary Get tab panel element.
     * @desc Get panel element if given tab panel element; or an element within a tab panel; or find tab panel.
     * @param {string|Element} [el] - May be one of:
     * * a tab panel (an `HTMLElement` with class `tabz`)
     * * an element within a tab panel
     * * `string` - CSS selector to one a tab panel, searching within the root or document
     * @returns {null|Element} tab panel element or `null` if not found
     * @memberOf Tabz.prototype
     */
    Tabz.prototype.panel = function(el) {
        while (el && !el.classList.contains('tabz')) {
            el = el.parentElement;
        }
        return !(el instanceof HTMLElement) ? null : el.classList.contains('tabz') ? el : null;
    };

    function lookForEl(el) {
        if (el instanceof Element) {
            while (el && el.tagName !== 'HEADER' && el.tagName !== 'SECTION') {
                el = el.parentElement;
            }
        } else {
            el = this.root.querySelector(el);
        }
        return el;
    }

    /** Enables the tab/folder pair of the clicked tab.
     * Disables all the other pairs in this scope which will include the previously enabled pair.
     * @private
     * @this Tabz
     * @param {Element} div - The tab panel (`.tabz` element) that's handling the click event.
     * @param {Element} target - The element that received the click.
     * @returns {undefined|Element} The `<header>` element (tab) the was clicked; or `undefined` when click was not within a tab.
     */
    function click(div, target) {
        var newTab, oldTab;

        forEachEl(':scope>header:not(.tabz-enable)', function(tab) { // todo: use a .find() polyfill here
            if (tab.contains(target)) {
                newTab = tab;
            }
        }, div);

        if (newTab) {
            oldTab = this.enabledTab(div);
            toggleTab.call(this, oldTab, false);
            toggleTab.call(this, newTab, true);
        }

        return newTab;
    }

    /**
     * @private
     * @this Tabz
     * @param {Element} tab - The `<header>` element of the tab to enable or disable.
     * @param {boolean} enable - Enable (vs. disable) the tab.
     */
    function toggleTab(tab, enable) {
        if (tab) {
            var folder = this.folder(tab),
                method = enable ? 'onEnable' : 'onDisable';

            this[method].call(this, tab, folder);

            tab.classList.toggle('tabz-enable', enable);
            folder.classList.toggle('tabz-enable', enable);

            method += 'd';
            this[method].call(this, tab, folder);
        }
    }

    /**
     * @typedef tabEvent
     * @type {function}
     * @param {tabEventObject}
     */

    /**
     * @typedef tabEventObject
     * @property {Tabz} tabz - The tab object issuing the callback.
     * @property {Element} target - The tab (`<header>` element).
     */

    /**
     * Called before a previously disabled tab is enabled.
     * @type {tabEvent}
     * @abstract
     * @memberOf Tabz.prototype
     */
    Tabz.prototype.onEnable = noop;

    /**
     * Called before a previously enabled tab is disabled by another tab being enabled.
     * @type {tabEvent}
     * @abstract
     * @memberOf Tabz.prototype
     */
    Tabz.prototype.onDisable = noop;

    /**
     * Called after a previously disabled tab is enabled.
     * @type {tabEvent}
     * @abstract
     * @memberOf Tabz.prototype
     */
    Tabz.prototype.onEnabled = noop;

    /**
     * Called after a previously enabled tab is disabled by another tab being enabled.
     * @type {tabEvent}
     * @abstract
     * @memberOf Tabz.prototype
     */
    Tabz.prototype.onDisabled = noop;

    function noop() {} // null pattern

    function forEachEl(selector, iteratee, context) {
        return Array.prototype.forEach.call((context || document).querySelectorAll(selector), iteratee);
    }


    window.Tabz = Tabz;

},{"css-injector":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy90YWJ6L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvdGFiei9ub2RlX21vZHVsZXMvY3NzLWluamVjdG9yL2luZGV4LmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL3RhYnovc3JjL2Zha2VfNmY1MmJmODYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4vKiogQG5hbWVzcGFjZSBjc3NJbmplY3RvciAqL1xuXG4vKipcbiAqIEBzdW1tYXJ5IEluc2VydCBiYXNlIHN0eWxlc2hlZXQgaW50byBET01cbiAqXG4gKiBAZGVzYyBDcmVhdGVzIGEgbmV3IGA8c3R5bGU+Li4uPC9zdHlsZT5gIGVsZW1lbnQgZnJvbSB0aGUgbmFtZWQgdGV4dCBzdHJpbmcocykgYW5kIGluc2VydHMgaXQgYnV0IG9ubHkgaWYgaXQgZG9lcyBub3QgYWxyZWFkeSBleGlzdCBpbiB0aGUgc3BlY2lmaWVkIGNvbnRhaW5lciBhcyBwZXIgYHJlZmVyZW5jZUVsZW1lbnRgLlxuICpcbiAqID4gQ2F2ZWF0OiBJZiBzdHlsZXNoZWV0IGlzIGZvciB1c2UgaW4gYSBzaGFkb3cgRE9NLCB5b3UgbXVzdCBzcGVjaWZ5IGEgbG9jYWwgYHJlZmVyZW5jZUVsZW1lbnRgLlxuICpcbiAqIEByZXR1cm5zIEEgcmVmZXJlbmNlIHRvIHRoZSBuZXdseSBjcmVhdGVkIGA8c3R5bGU+Li4uPC9zdHlsZT5gIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IGNzc1J1bGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gW0lEXVxuICogQHBhcmFtIHt1bmRlZmluZWR8bnVsbHxFbGVtZW50fHN0cmluZ30gW3JlZmVyZW5jZUVsZW1lbnRdIC0gQ29udGFpbmVyIGZvciBpbnNlcnRpb24uIE92ZXJsb2FkczpcbiAqICogYHVuZGVmaW5lZGAgdHlwZSAob3Igb21pdHRlZCk6IGluamVjdHMgc3R5bGVzaGVldCBhdCB0b3Agb2YgYDxoZWFkPi4uLjwvaGVhZD5gIGVsZW1lbnRcbiAqICogYG51bGxgIHZhbHVlOiBpbmplY3RzIHN0eWxlc2hlZXQgYXQgYm90dG9tIG9mIGA8aGVhZD4uLi48L2hlYWQ+YCBlbGVtZW50XG4gKiAqIGBFbGVtZW50YCB0eXBlOiBpbmplY3RzIHN0eWxlc2hlZXQgaW1tZWRpYXRlbHkgYmVmb3JlIGdpdmVuIGVsZW1lbnQsIHdoZXJldmVyIGl0IGlzIGZvdW5kLlxuICogKiBgc3RyaW5nYCB0eXBlOiBpbmplY3RzIHN0eWxlc2hlZXQgaW1tZWRpYXRlbHkgYmVmb3JlIGdpdmVuIGZpcnN0IGVsZW1lbnQgZm91bmQgdGhhdCBtYXRjaGVzIHRoZSBnaXZlbiBjc3Mgc2VsZWN0b3IuXG4gKlxuICogQG1lbWJlck9mIGNzc0luamVjdG9yXG4gKi9cbmZ1bmN0aW9uIGNzc0luamVjdG9yKGNzc1J1bGVzLCBJRCwgcmVmZXJlbmNlRWxlbWVudCkge1xuICAgIGlmICh0eXBlb2YgcmVmZXJlbmNlRWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmVmZXJlbmNlRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IocmVmZXJlbmNlRWxlbWVudCk7XG4gICAgICAgIGlmICghcmVmZXJlbmNlRWxlbWVudCkge1xuICAgICAgICAgICAgdGhyb3cgJ0Nhbm5vdCBmaW5kIHJlZmVyZW5jZSBlbGVtZW50IGZvciBDU1MgaW5qZWN0aW9uLic7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZUVsZW1lbnQgJiYgIShyZWZlcmVuY2VFbGVtZW50IGluc3RhbmNlb2YgRWxlbWVudCkpIHtcbiAgICAgICAgdGhyb3cgJ0dpdmVuIHZhbHVlIG5vdCBhIHJlZmVyZW5jZSBlbGVtZW50Lic7XG4gICAgfVxuXG4gICAgdmFyIGNvbnRhaW5lciA9IHJlZmVyZW5jZUVsZW1lbnQgJiYgcmVmZXJlbmNlRWxlbWVudC5wYXJlbnROb2RlIHx8IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTtcblxuICAgIGlmIChJRCkge1xuICAgICAgICBJRCA9IGNzc0luamVjdG9yLmlkUHJlZml4ICsgSUQ7XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcjJyArIElEKSkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBzdHlsZXNoZWV0IGFscmVhZHkgaW4gRE9NXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuICAgIGlmIChJRCkge1xuICAgICAgICBzdHlsZS5pZCA9IElEO1xuICAgIH1cbiAgICBpZiAoY3NzUnVsZXMgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBjc3NSdWxlcyA9IGNzc1J1bGVzLmpvaW4oJ1xcbicpO1xuICAgIH1cbiAgICBjc3NSdWxlcyA9ICdcXG4nICsgY3NzUnVsZXMgKyAnXFxuJztcbiAgICBpZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3NSdWxlcztcbiAgICB9IGVsc2Uge1xuICAgICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3NSdWxlcykpO1xuICAgIH1cblxuICAgIGlmIChyZWZlcmVuY2VFbGVtZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVmZXJlbmNlRWxlbWVudCA9IGNvbnRhaW5lci5maXJzdENoaWxkO1xuICAgIH1cblxuICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoc3R5bGUsIHJlZmVyZW5jZUVsZW1lbnQpO1xuXG4gICAgcmV0dXJuIHN0eWxlO1xufVxuXG4vKipcbiAqIEBzdW1tYXJ5IE9wdGlvbmFsIHByZWZpeCBmb3IgYDxzdHlsZT5gIHRhZyBJRHMuXG4gKiBAZGVzYyBEZWZhdWx0cyB0byBgJ2luamVjdGVkLXN0eWxlc2hlZXQtJ2AuXG4gKiBAdHlwZSB7c3RyaW5nfVxuICogQG1lbWJlck9mIGNzc0luamVjdG9yXG4gKi9cbmNzc0luamVjdG9yLmlkUHJlZml4ID0gJ2luamVjdGVkLXN0eWxlc2hlZXQtJztcblxuLy8gSW50ZXJmYWNlXG5tb2R1bGUuZXhwb3J0cyA9IGNzc0luamVjdG9yO1xuIiwiLy8gdGFieiBub2RlIG1vZHVsZVxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2pvbmVpdC90YWJ6XG5cbi8qIGVzbGludC1lbnYgbm9kZSwgYnJvd3NlciAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjc3NJbmplY3RvciA9IHJlcXVpcmUoJ2Nzcy1pbmplY3RvcicpO1xuXG4vKipcbiAqIFJlZ2lzdGVyL2RlcmVnaXN0ZXIgY2xpY2sgaGFuZGxlciBvbiBhbGwgdGFiIGNvbGxlY3Rpb25zLlxuICogQHBhcmFtIHtFbGVtZW50fSBbb3B0aW9ucy5yb290PWRvY3VtZW50XSAtIFdoZXJlIHRvIGxvb2sgZm9yIHRhYiBwYW5lbHMgKGAudGFiemAgZWxlbWVudHMpIGNvbnRhaW5pbmcgdGFicyBhbmQgZm9sZGVycy5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudW5ob29rPWZhbHNlXSAtIFJlbW92ZSBldmVudCBsaXN0ZW5lciBmcm9tIHRhYiBwYW5lbHMgKGAudGFiemAgZWxlbWVudHMpLlxuICogQHBhcmFtIHtFbGVtZW50fSBbb3B0aW9ucy5yZWZlcmVuY2VFbGVtZW50XSAtIFBhc3NlZCB0byBjc3NJbmplY3RvcidzIGluc2VydEJlZm9yZSgpIGNhbGwuXG4gKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMuZGVmYXVsdFRhYlNlbGVjdG9yPScuZGVmYXVsdC10YWInXSAtIC5jbGFzc25hbWUgb3IgI2lkIG9mIHRoZSB0YWIgdG8gc2VsZWN0IGJ5IGRlZmF1bHRcbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9ucy5vbkVuYWJsZV0gLSBIYW5kbGVyIGltcGxlbWVudGF0aW9uLiBTZWUge0BsaW5rIFRhYnojb25FbmFibGV8b25FbmFibGV9LlxuICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zLm9uRGlzYWJsZV0gLSBIYW5kbGVyIGltcGxlbWVudGF0aW9uLiBTZWUge0BsaW5rIFRhYnojb25EaXNhYmxlfG9uRW5hYmxlfS5cbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9ucy5vbkVuYWJsZWRdIC0gSGFuZGxlciBpbXBsZW1lbnRhdGlvbi4gU2VlIHtAbGluayBUYWJ6I29uRW5hYmxlZHxvbkVuYWJsZX0uXG4gKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnMub25EaXNhYmxlZF0gLSBIYW5kbGVyIGltcGxlbWVudGF0aW9uLiBTZWUge0BsaW5rIFRhYnojb25EaXNhYmxlZHxvbkVuYWJsZX0uXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gVGFieihvcHRpb25zKSB7XG4gICAgdmFyIGksIGVsO1xuXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIHJvb3QgPSBvcHRpb25zLnJvb3QgfHwgZG9jdW1lbnQsXG4gICAgICAgIHVuaG9vayA9IG9wdGlvbnMudW5ob29rLFxuICAgICAgICByZWZlcmVuY2VFbGVtZW50ID0gb3B0aW9ucy5yZWZlcmVuY2VFbGVtZW50LFxuICAgICAgICBkZWZhdWx0VGFiU2VsZWN0b3IgPSBvcHRpb25zLmRlZmF1bHRUYWJTZWxlY3RvciB8fCAnLmRlZmF1bHQtdGFiJztcblxuICAgIGlmICghdW5ob29rKSB7XG4gICAgICAgIHZhciBjc3M7XG4gICAgICAgIC8qIGluamVjdDpjc3MgKi9cbiAgICAgICAgY3NzID0gJy50YWJ6LC50YWJ6PmhlYWRlcntwb3NpdGlvbjpyZWxhdGl2ZX0udGFiej5oZWFkZXJ7ZGlzcGxheTppbmxpbmUtYmxvY2s7YmFja2dyb3VuZC1jb2xvcjojZmZmO21hcmdpbi1sZWZ0OjEuNWVtO3BhZGRpbmc6NXB4IC42ZW07Ym9yZGVyOjFweCBzb2xpZCAjNjY2O2JvcmRlci1ib3R0b20tY29sb3I6dHJhbnNwYXJlbnQ7Ym9yZGVyLXJhZGl1czo2cHggNnB4IDAgMDtjdXJzb3I6ZGVmYXVsdDt1c2VyLXNlbGVjdDpub25lOy13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTstbW96LXVzZXItc2VsZWN0Om5vbmU7LW1zLXVzZXItc2VsZWN0Om5vbmV9LnRhYno+aGVhZGVyK3NlY3Rpb257cG9zaXRpb246YWJzb2x1dGU7ZGlzcGxheTpub25lO2JhY2tncm91bmQtY29sb3I6I2ZmZjttYXJnaW4tdG9wOi0xcHg7cGFkZGluZzo4cHg7Ym9yZGVyOjFweCBzb2xpZCAjNjY2O2JvcmRlci1yYWRpdXM6NnB4O3dpZHRoOjg1JTtoZWlnaHQ6ODUlO3otaW5kZXg6MH0udGFiej5oZWFkZXIrc2VjdGlvbi50YWJ6LWVuYWJsZXt6LWluZGV4OjF9LnRhYno+aGVhZGVyLnRhYnotZW5hYmxle3otaW5kZXg6Mn0udGFiei1iZzB7YmFja2dyb3VuZC1jb2xvcjojZWVlIWltcG9ydGFudH0udGFiei1iZzF7YmFja2dyb3VuZC1jb2xvcjojZWVmIWltcG9ydGFudH0udGFiei1iZzJ7YmFja2dyb3VuZC1jb2xvcjojZWZlIWltcG9ydGFudH0udGFiei1iZzN7YmFja2dyb3VuZC1jb2xvcjojZWZmIWltcG9ydGFudH0udGFiei1iZzR7YmFja2dyb3VuZC1jb2xvcjojZmVlIWltcG9ydGFudH0udGFiei1iZzV7YmFja2dyb3VuZC1jb2xvcjojZmVmIWltcG9ydGFudH0udGFiei1iZzZ7YmFja2dyb3VuZC1jb2xvcjojZmZlIWltcG9ydGFudH0nO1xuICAgICAgICAvKiBlbmRpbmplY3QgKi9cblxuICAgICAgICBpZiAoIXJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICAgICAgICAgIC8vIGZpbmQgZmlyc3QgPGxpbms+IG9yIDxzdHlsZT4gaW4gPGhlYWQ+XG4gICAgICAgICAgICB2YXIgaGVhZFN0dWZmID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaGVhZCcpLmNoaWxkcmVuO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgIXJlZmVyZW5jZUVsZW1lbnQgJiYgaSA8IGhlYWRTdHVmZi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgIGVsID0gaGVhZFN0dWZmW2ldO1xuICAgICAgICAgICAgICAgIGlmIChlbC50YWdOYW1lID09PSAnU1RZTEUnIHx8IGVsLnRhZ05hbWUgPT09ICdMSU5LJyAmJiBlbC5yZWwgPT09ICdzdHlsZXNoZWV0Jykge1xuICAgICAgICAgICAgICAgICAgICByZWZlcmVuY2VFbGVtZW50ID0gZWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNzc0luamVjdG9yKGNzcywgJ3RhYnotY3NzLWJhc2UnLCByZWZlcmVuY2VFbGVtZW50KTtcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKHRoaXNba2V5XSA9PT0gbm9vcCkge1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAc3VtbWFyeSBUaGUgY29udGV4dCBvZiB0aGlzIHRhYiBvYmplY3QuXG4gICAgICAgICAqIEBkZXNjIFRoZSBjb250ZXh0IG1heSBlbmNvbXBhc3MgYW55IG51bWJlciBvZiB0YWIgcGFuZWxzIChgLnRhYnpgIGVsZW1lbnRzKS5cbiAgICAgICAgICogQHR5cGUge0hUTUxEb2N1bWVufEhUTUxFbGVtZW50fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5yb290ID0gcm9vdDtcblxuICAgICAgICAvLyBlbmFibGUgZmlyc3QgdGFiIG9uIGVhY2ggdGFiIHBhbmVsIChgLnRhYnpgIGVsZW1lbnQpXG4gICAgICAgIGZvckVhY2hFbCgnLnRhYno+aGVhZGVyOmZpcnN0LW9mLXR5cGUsLnRhYno+c2VjdGlvbjpmaXJzdC1vZi10eXBlJywgZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ3RhYnotZW5hYmxlJyk7XG4gICAgICAgIH0sIHJvb3QpO1xuXG4gICAgICAgIC8vIGVuYWJsZSBkZWZhdWx0IHRhYiBhbmQgYWxsIGl0cyBwYXJlbnRzIChtdXN0IGJlIGEgdGFiKVxuICAgICAgICB0aGlzLnRhYlRvKHJvb3QucXVlcnlTZWxlY3RvcignLnRhYnogPiBoZWFkZXInICsgZGVmYXVsdFRhYlNlbGVjdG9yKSk7XG5cbiAgICAgICAgLy8gQnVnIGluIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSAobGlrZSB2NDApIHdoaWNoIHdhcyBhbiBpbXBsaWVkIGJyZWFrIGF0IG1hcmstdXAgbG9jYXRpb24gb2YgYW4gYWJzb2x1dGUgcG9zaXRpb25lZCBibG9jay4gVGhlIHdvcmstYXJvdW5kIGlzIHRvIGhpZGUgdGhvc2UgYmxvY2tzIHVudGlsIGFmdGVyIGZpcnN0IHJlbmRlcjsgdGhlbiBzaG93IHRoZW0uIEkgZG9uJ3Qga25vdyB3aHkgdGhpcyB3b3JrcyBidXQgaXQgZG9lcy4gU2VlbXMgdG8gYmUgZHVyYWJsZS5cbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZvckVhY2hFbCgnLnRhYnogPiBzZWN0aW9uJywgZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgICAgICAgICBlbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICAgICAgICAgIH0sIHJvb3QpO1xuICAgICAgICB9LCAwKTtcbiAgICB9XG5cbiAgICB2YXIgbWV0aG9kID0gdW5ob29rID8gJ3JlbW92ZUV2ZW50TGlzdGVuZXInIDogJ2FkZEV2ZW50TGlzdGVuZXInO1xuICAgIHZhciBib3VuZENsaWNrSGFuZGxlciA9IG9uY2xpY2suYmluZCh0aGlzKTtcbiAgICBmb3JFYWNoRWwoJy50YWJ6JywgZnVuY3Rpb24odGFiQmFyKSB7XG4gICAgICAgIHRhYkJhci5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICB0YWJCYXJbbWV0aG9kXSgnY2xpY2snLCBib3VuZENsaWNrSGFuZGxlcik7XG4gICAgfSwgcm9vdCk7XG59XG5cbmZ1bmN0aW9uIG9uY2xpY2soZXZ0KSB7XG4gICAgY2xpY2suY2FsbCh0aGlzLCBldnQuY3VycmVudFRhcmdldCwgZXZ0LnRhcmdldCk7XG59XG5cbi8qKlxuICogQHN1bW1hcnkgU2VsZWN0cyB0aGUgZ2l2ZW4gdGFiLlxuICogQGRlc2MgSWYgaXQgaXMgYSBuZXN0ZWQgdGFiLCBhbHNvIHJldmVhbHMgYWxsIGl0cyBhbmNlc3RvciB0YWJzLlxuICogQHBhcmFtIHtzdHJpbmd8SFRNTEVsZW1lbnR9IFtlbF0gLSBNYXkgYmUgb25lIG9mOlxuICogKiBgSFRNTEVsZW1lbnRgXG4gKiAgICogYDxoZWFkZXI+YCAtIHRhYiBlbGVtZW50XG4gKiAgICogYDxzZWN0aW9uPmAgLSBmb2xkZXIgZWxlbWVudFxuICogKiBgc3RyaW5nYCAtIENTUyBzZWxlY3RvciB0byBvbmUgb2YgdGhlIGFib3ZlXG4gKiAqIGZhbHN5IC0gZmFpbHMgc2lsZW50bHlcbiAqIEBtZW1iZXJPZiBUYWJ6LnByb3RvdHlwZVxuICovXG5UYWJ6LnByb3RvdHlwZS50YWJUbyA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgd2hpbGUgKChlbCA9IHRoaXMudGFiKGVsKSkpIHtcbiAgICAgICAgY2xpY2suY2FsbCh0aGlzLCBlbC5wYXJlbnRFbGVtZW50LCBlbCk7XG4gICAgICAgIGVsID0gZWwucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50OyAvLyBsb29wIHRvIGNsaWNrIG9uIGVhY2ggY29udGFpbmluZyB0YWIuLi5cbiAgICB9XG59O1xuXG4vKipcbiAqIEN1cnJlbnQgc2VsZWN0ZWQgdGFiLlxuICogQHBhcmFtIHtIVE1MRWxlbWVudHxudW1iZXJ9IGVsIC0gQW4gZWxlbWVudCB0aGF0IGlzIChvciBpcyB3aXRoaW4pIHRoZSB0YWIgcGFuZWwgKGAudGFiemAgZWxlbWVudCkgdG8gbG9vayBpbi5cbiAqIEByZXR1cm5zIHt1bmRlZmluZWR8SFRNTEVsZW1lbnR9IFJldHVybnMgdGFiIChgPGhlYWRlcj5gKSBlbGVtZW50LiAgUmV0dXJucyBgdW5kZWZpbmVkYCBpZiBgZWxgIGlzIG5laXRoZXIgb2YgdGhlIGFib3ZlIG9yIGFuIG91dCBvZiByYW5nZSBpbmRleC5cbiAqL1xuVGFiei5wcm90b3R5cGUuZW5hYmxlZFRhYiA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgZWwgPSB0aGlzLnBhbmVsKGVsKTtcbiAgICByZXR1cm4gZWwgJiYgZWwucXVlcnlTZWxlY3RvcignOnNjb3BlPmhlYWRlci50YWJ6LWVuYWJsZScpO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBHZXQgdGFiIGVsZW1lbnQuXG4gKiBAZGVzYyBHZXQgdGFiIGVsZW1lbnQgaWYgZ2l2ZW4gdGFiIG9yIGZvbGRlciBlbGVtZW50OyBvciBhbiBlbGVtZW50IHdpdGhpbiBzdWNoOyBvciBmaW5kIHRhYi5cbiAqIEBwYXJhbSB7c3RyaW5nfEVsZW1lbnR9IFtlbF0gLSBNYXkgYmUgb25lIG9mOlxuICogKiBhIHRhYiAoYSBgPGhlYWRlcj5gIGVsZW1lbnQpXG4gKiAqIGEgZm9sZGVyIChhIGA8c2VjdGlvbj5gIGVsZW1lbnQpXG4gKiAqIGFuIGVsZW1lbnQgd2l0aGluIG9uZSBvZiB0aGUgYWJvdmVcbiAqICogYHN0cmluZ2AgLSBDU1Mgc2VsZWN0b3IgdG8gb25lIG9mIHRoZSBhYm92ZSwgc2VhcmNoaW5nIHdpdGhpbiB0aGUgcm9vdCBvciBkb2N1bWVudFxuICogQHJldHVybnMge251bGx8RWxlbWVudH0gdGFiIChgPGhlYWRlcj4uLi48L2hlYWRlcj5gKSBlbGVtZW50IG9yIGBudWxsYCBpZiBub3QgZm91bmRcbiAqIEBtZW1iZXJPZiBUYWJ6LnByb3RvdHlwZVxuICovXG5UYWJ6LnByb3RvdHlwZS50YWIgPSBmdW5jdGlvbihlbCkge1xuICAgIGVsID0gbG9va0ZvckVsLmNhbGwodGhpcywgZWwpO1xuICAgIHJldHVybiAhKGVsIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpID8gbnVsbCA6IGVsLnRhZ05hbWUgPT09ICdIRUFERVInID8gZWwgOiBlbC50YWdOYW1lID09PSAnU0VDVElPTicgPyBlbC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nIDogbnVsbDtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgR2V0IGZvbGRlciBlbGVtZW50LlxuICogQGRlc2MgR2V0IGZvbGRlciBlbGVtZW50IGlmIGdpdmVuIHRhYiBvciBmb2xkZXIgZWxlbWVudDsgb3IgYW4gZWxlbWVudCB3aXRoaW4gc3VjaDsgb3IgZmluZCBmb2xkZXIuXG4gKiBAcGFyYW0ge3N0cmluZ3xFbGVtZW50fSBbZWxdIC0gTWF5IGJlIG9uZSBvZjpcbiAqICogYSB0YWIgKGEgYDxoZWFkZXI+YCBlbGVtZW50KVxuICogKiBhIGZvbGRlciAoYSBgPHNlY3Rpb24+YCBlbGVtZW50KVxuICogKiBhbiBlbGVtZW50IHdpdGhpbiBvbmUgb2YgdGhlIGFib3ZlXG4gKiAqIGBzdHJpbmdgIC0gQ1NTIHNlbGVjdG9yIHRvIG9uZSBvZiB0aGUgYWJvdmUsIHNlYXJjaGluZyB3aXRoaW4gdGhlIHJvb3Qgb3IgZG9jdW1lbnRcbiAqIEByZXR1cm5zIHtudWxsfEVsZW1lbnR9IHRhYiAoYDxoZWFkZXI+Li4uPC9oZWFkZXI+YCkgZWxlbWVudCBvciBgbnVsbGAgaWYgbm90IGZvdW5kXG4gKiBAbWVtYmVyT2YgVGFiei5wcm90b3R5cGVcbiAqL1xuVGFiei5wcm90b3R5cGUuZm9sZGVyID0gZnVuY3Rpb24oZWwpIHtcbiAgICBlbCA9IGxvb2tGb3JFbC5jYWxsKHRoaXMsIGVsKTtcbiAgICByZXR1cm4gIShlbCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSA/IG51bGwgOiBlbC50YWdOYW1lID09PSAnU0VDVElPTicgPyBlbCA6IGVsLnRhZ05hbWUgPT09ICdIRUFERVInID8gZWwubmV4dEVsZW1lbnRTaWJsaW5nIDogbnVsbDtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgR2V0IHRhYiBwYW5lbCBlbGVtZW50LlxuICogQGRlc2MgR2V0IHBhbmVsIGVsZW1lbnQgaWYgZ2l2ZW4gdGFiIHBhbmVsIGVsZW1lbnQ7IG9yIGFuIGVsZW1lbnQgd2l0aGluIGEgdGFiIHBhbmVsOyBvciBmaW5kIHRhYiBwYW5lbC5cbiAqIEBwYXJhbSB7c3RyaW5nfEVsZW1lbnR9IFtlbF0gLSBNYXkgYmUgb25lIG9mOlxuICogKiBhIHRhYiBwYW5lbCAoYW4gYEhUTUxFbGVtZW50YCB3aXRoIGNsYXNzIGB0YWJ6YClcbiAqICogYW4gZWxlbWVudCB3aXRoaW4gYSB0YWIgcGFuZWxcbiAqICogYHN0cmluZ2AgLSBDU1Mgc2VsZWN0b3IgdG8gb25lIGEgdGFiIHBhbmVsLCBzZWFyY2hpbmcgd2l0aGluIHRoZSByb290IG9yIGRvY3VtZW50XG4gKiBAcmV0dXJucyB7bnVsbHxFbGVtZW50fSB0YWIgcGFuZWwgZWxlbWVudCBvciBgbnVsbGAgaWYgbm90IGZvdW5kXG4gKiBAbWVtYmVyT2YgVGFiei5wcm90b3R5cGVcbiAqL1xuVGFiei5wcm90b3R5cGUucGFuZWwgPSBmdW5jdGlvbihlbCkge1xuICAgIHdoaWxlIChlbCAmJiAhZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCd0YWJ6JykpIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnRFbGVtZW50O1xuICAgIH1cbiAgICByZXR1cm4gIShlbCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSA/IG51bGwgOiBlbC5jbGFzc0xpc3QuY29udGFpbnMoJ3RhYnonKSA/IGVsIDogbnVsbDtcbn07XG5cbmZ1bmN0aW9uIGxvb2tGb3JFbChlbCkge1xuICAgIGlmIChlbCBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICAgICAgd2hpbGUgKGVsICYmIGVsLnRhZ05hbWUgIT09ICdIRUFERVInICYmIGVsLnRhZ05hbWUgIT09ICdTRUNUSU9OJykge1xuICAgICAgICAgICAgZWwgPSBlbC5wYXJlbnRFbGVtZW50O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZWwgPSB0aGlzLnJvb3QucXVlcnlTZWxlY3RvcihlbCk7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cblxuLyoqIEVuYWJsZXMgdGhlIHRhYi9mb2xkZXIgcGFpciBvZiB0aGUgY2xpY2tlZCB0YWIuXG4gKiBEaXNhYmxlcyBhbGwgdGhlIG90aGVyIHBhaXJzIGluIHRoaXMgc2NvcGUgd2hpY2ggd2lsbCBpbmNsdWRlIHRoZSBwcmV2aW91c2x5IGVuYWJsZWQgcGFpci5cbiAqIEBwcml2YXRlXG4gKiBAdGhpcyBUYWJ6XG4gKiBAcGFyYW0ge0VsZW1lbnR9IGRpdiAtIFRoZSB0YWIgcGFuZWwgKGAudGFiemAgZWxlbWVudCkgdGhhdCdzIGhhbmRsaW5nIHRoZSBjbGljayBldmVudC5cbiAqIEBwYXJhbSB7RWxlbWVudH0gdGFyZ2V0IC0gVGhlIGVsZW1lbnQgdGhhdCByZWNlaXZlZCB0aGUgY2xpY2suXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfEVsZW1lbnR9IFRoZSBgPGhlYWRlcj5gIGVsZW1lbnQgKHRhYikgdGhlIHdhcyBjbGlja2VkOyBvciBgdW5kZWZpbmVkYCB3aGVuIGNsaWNrIHdhcyBub3Qgd2l0aGluIGEgdGFiLlxuICovXG5mdW5jdGlvbiBjbGljayhkaXYsIHRhcmdldCkge1xuICAgIHZhciBuZXdUYWIsIG9sZFRhYjtcblxuICAgIGZvckVhY2hFbCgnOnNjb3BlPmhlYWRlcjpub3QoLnRhYnotZW5hYmxlKScsIGZ1bmN0aW9uKHRhYikgeyAvLyB0b2RvOiB1c2UgYSAuZmluZCgpIHBvbHlmaWxsIGhlcmVcbiAgICAgICAgaWYgKHRhYi5jb250YWlucyh0YXJnZXQpKSB7XG4gICAgICAgICAgICBuZXdUYWIgPSB0YWI7XG4gICAgICAgIH1cbiAgICB9LCBkaXYpO1xuXG4gICAgaWYgKG5ld1RhYikge1xuICAgICAgICBvbGRUYWIgPSB0aGlzLmVuYWJsZWRUYWIoZGl2KTtcbiAgICAgICAgdG9nZ2xlVGFiLmNhbGwodGhpcywgb2xkVGFiLCBmYWxzZSk7XG4gICAgICAgIHRvZ2dsZVRhYi5jYWxsKHRoaXMsIG5ld1RhYiwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld1RhYjtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQHRoaXMgVGFielxuICogQHBhcmFtIHtFbGVtZW50fSB0YWIgLSBUaGUgYDxoZWFkZXI+YCBlbGVtZW50IG9mIHRoZSB0YWIgdG8gZW5hYmxlIG9yIGRpc2FibGUuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGVuYWJsZSAtIEVuYWJsZSAodnMuIGRpc2FibGUpIHRoZSB0YWIuXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZVRhYih0YWIsIGVuYWJsZSkge1xuICAgIGlmICh0YWIpIHtcbiAgICAgICAgdmFyIGZvbGRlciA9IHRoaXMuZm9sZGVyKHRhYiksXG4gICAgICAgICAgICBtZXRob2QgPSBlbmFibGUgPyAnb25FbmFibGUnIDogJ29uRGlzYWJsZSc7XG5cbiAgICAgICAgdGhpc1ttZXRob2RdLmNhbGwodGhpcywgdGFiLCBmb2xkZXIpO1xuXG4gICAgICAgIHRhYi5jbGFzc0xpc3QudG9nZ2xlKCd0YWJ6LWVuYWJsZScsIGVuYWJsZSk7XG4gICAgICAgIGZvbGRlci5jbGFzc0xpc3QudG9nZ2xlKCd0YWJ6LWVuYWJsZScsIGVuYWJsZSk7XG5cbiAgICAgICAgbWV0aG9kICs9ICdkJztcbiAgICAgICAgdGhpc1ttZXRob2RdLmNhbGwodGhpcywgdGFiLCBmb2xkZXIpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAdHlwZWRlZiB0YWJFdmVudFxuICogQHR5cGUge2Z1bmN0aW9ufVxuICogQHBhcmFtIHt0YWJFdmVudE9iamVjdH1cbiAqL1xuXG4vKipcbiAqIEB0eXBlZGVmIHRhYkV2ZW50T2JqZWN0XG4gKiBAcHJvcGVydHkge1RhYnp9IHRhYnogLSBUaGUgdGFiIG9iamVjdCBpc3N1aW5nIHRoZSBjYWxsYmFjay5cbiAqIEBwcm9wZXJ0eSB7RWxlbWVudH0gdGFyZ2V0IC0gVGhlIHRhYiAoYDxoZWFkZXI+YCBlbGVtZW50KS5cbiAqL1xuXG4vKipcbiAqIENhbGxlZCBiZWZvcmUgYSBwcmV2aW91c2x5IGRpc2FibGVkIHRhYiBpcyBlbmFibGVkLlxuICogQHR5cGUge3RhYkV2ZW50fVxuICogQGFic3RyYWN0XG4gKiBAbWVtYmVyT2YgVGFiei5wcm90b3R5cGVcbiAqL1xuVGFiei5wcm90b3R5cGUub25FbmFibGUgPSBub29wO1xuXG4vKipcbiAqIENhbGxlZCBiZWZvcmUgYSBwcmV2aW91c2x5IGVuYWJsZWQgdGFiIGlzIGRpc2FibGVkIGJ5IGFub3RoZXIgdGFiIGJlaW5nIGVuYWJsZWQuXG4gKiBAdHlwZSB7dGFiRXZlbnR9XG4gKiBAYWJzdHJhY3RcbiAqIEBtZW1iZXJPZiBUYWJ6LnByb3RvdHlwZVxuICovXG5UYWJ6LnByb3RvdHlwZS5vbkRpc2FibGUgPSBub29wO1xuXG4vKipcbiAqIENhbGxlZCBhZnRlciBhIHByZXZpb3VzbHkgZGlzYWJsZWQgdGFiIGlzIGVuYWJsZWQuXG4gKiBAdHlwZSB7dGFiRXZlbnR9XG4gKiBAYWJzdHJhY3RcbiAqIEBtZW1iZXJPZiBUYWJ6LnByb3RvdHlwZVxuICovXG5UYWJ6LnByb3RvdHlwZS5vbkVuYWJsZWQgPSBub29wO1xuXG4vKipcbiAqIENhbGxlZCBhZnRlciBhIHByZXZpb3VzbHkgZW5hYmxlZCB0YWIgaXMgZGlzYWJsZWQgYnkgYW5vdGhlciB0YWIgYmVpbmcgZW5hYmxlZC5cbiAqIEB0eXBlIHt0YWJFdmVudH1cbiAqIEBhYnN0cmFjdFxuICogQG1lbWJlck9mIFRhYnoucHJvdG90eXBlXG4gKi9cblRhYnoucHJvdG90eXBlLm9uRGlzYWJsZWQgPSBub29wO1xuXG5mdW5jdGlvbiBub29wKCkge30gLy8gbnVsbCBwYXR0ZXJuXG5cbmZ1bmN0aW9uIGZvckVhY2hFbChzZWxlY3RvciwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbCgoY29udGV4dCB8fCBkb2N1bWVudCkucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvciksIGl0ZXJhdGVlKTtcbn1cblxuXG53aW5kb3cuVGFieiA9IFRhYno7XG4iXX0=
