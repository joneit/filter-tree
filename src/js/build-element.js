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
