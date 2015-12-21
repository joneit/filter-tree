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
