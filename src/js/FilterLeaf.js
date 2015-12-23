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
