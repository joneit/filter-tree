/* eslint-env browser */
/* eslint-disable key-spacing */

'use strict';

var regExpLIKE = require('regexp-like').cached;

var FilterNode = require('./FilterNode');
var template = require('./template');

/** @constructor
 * @summary A terminal node in a filter tree, representing a conditional expression.
 * @desc Also known as a "filter."
 */
var FilterLeaf = FilterNode.extend('FilterLeaf', {

    name: 'Column ? Literal',

    operators: {
        '<'       : { test: function(a, b) { return a < b; } },
        '\u2264'  : { test: function(a, b) { return a <= b; }, SQL: '<=' },
        '='       : { test: function(a, b) { return a === b; } },
        '\u2265'  : { test: function(a, b) { return a >= b; }, SQL: '>=' },
        '>'       : { test: function(a, b) { return a > b; } },
        '\u2260'  : { test: function(a, b) { return a !== b; }, SQL: '<>' },
        LIKE      : { test: function(a, b) { return regExpLIKE(b).test(a); } },
        'NOT LIKE': { test: function(a, b) { return !regExpLIKE(b).test(a); } }
    },

    destroy: function() {
        if (this.controls) {
            for (var key in this.controls) {
                this.controls[key].removeEventListener('change', cleanUpAndMoveOn);
            }
        }
    },

    newView: function() {
        var fields = this.parent.nodeFields || this.fields;

        if (!fields) {
            throw this.Error('Terminal node requires a fields list.');
        }

        var root = this.el = document.createElement('span');
        root.className = 'filter-tree-default';

        this.controls = {
            column: this.makeElement(root, fields, 'column'),
            operator: this.makeElement(root, Object.keys(this.operators), 'operator'),
            argument: this.makeElement(root)
        };

        root.appendChild(document.createElement('br'));
    },

    /** @typedef {object} valueOption
     * You should supply both `name` and `header` but you could omit one or the other and whichever you provide will be used for both. (In such case you might as well just give a string for {@link fieldOption} rather than this object.)
     * @property {string} [name]
     * @property {string} [header]
     * @property {boolean} [hidden=false]
     */
    /** @typedef {object} optionGroup
     * @property {string} label
     * @property {fieldOption[]} options
     */
    /** @typedef {string|valueOption|optionGroup} fieldOption
     * The three possible types specify either an `<option>....</option>` element or an `<optgroup>....</optgroup>` element as follows:
     * * `string` - specifies only the text of an `<option>....</option>` element (the value naturally defaults to the text)
     * * {@link valueOption} - specifies both the text (`.name`) and the value (`.header`) of an `<option....</option>` element
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
    makeElement: function(container, options, prompt) {
        var el, option, span,
            tagName = options ? 'select' : 'input';

        if (options && options.length === 1) {
            option = options[0];

            el = document.createElement('input');
            el.type = 'hidden';
            el.value = option.name || option.header || option;

            span = document.createElement('span');
            span.innerHTML = option.header || option.name || option;
            span.appendChild(el);

            container.appendChild(span);
        } else {
            el = addOptions(tagName, options, prompt);
            this.el.addEventListener('change', cleanUpAndMoveOn);
            FilterNode.setWarningClass(el);
            container.appendChild(el);
        }

        return el;
    },

    load: function(json) {
        if (json) {
            var value, el, i, b, selected, notes = [];
            for (var key in json) {
                if (key !== 'fields' && key !== 'editor') {
                    value = json[key];
                    el = this.controls[key];
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

    /** @typedef {object} converter
     * @property {function} to - Returns input value converted to type. Fails silently.
     * @property {function} not - Tests input value against type, returning `false if type or `true` if not type.
     */
    /**
     * @property {converter} number
     * @property {converter} date
     */
    converters: {
        number: { to: Number, not: isNaN },
        date: { to: function(s) { return new Date(s); }, not: isNaN }
    },

    /**
     * Throws error if invalid expression.
     * Caught by {@link FilterTree#validate|FilterTree.prototype.validate()}.
     *
     * Also performs the following compilation actions:
     * * Copies all the `this.controls`'s values from the DOM to similarly named properties of `this`.
     * * Pre-sets `this.operation`, `this.converter` and `this.sqlOperator` for efficient access in walks.
     *
     * @param {boolean} focus - Move focus to offending control.
     * @returns {undefined} if valid
     */
    validate: function(focus) {
        for (var elementName in this.controls) {
            var el = this.controls[elementName],
                value = controlValue(el).trim();

            if (value === '') {
                if (focus) { focusOn(el); }
                throw new FilterNode.Error('Blank ' + elementName + ' controls.\nComplete the filter or delete it.');
            } else {
                // Copy each controls's value to property of this object.
                this[elementName] = value;

                switch (elementName) {
                    case 'operator':
                        var operator = this.operators[value];
                        this.operation = operator.test; // for efficient access in this.test()
                        this.sqlOperator = operator.SQL || value;
                        break;
                    case 'column':
                        var fields = this.parent.nodeFields || this.fields,
                            field = findField(fields, value);
                        if (field && field.type) {
                            this.converter = this.converters[field.type];
                        }
                }
            }
        }
    },

    p: function(dataRow) { return dataRow[this.column]; },
    q: function() { return this.argument; },

    test: function(dataRow) {
        var p = this.p(dataRow),
            q = this.q(dataRow),
            P, Q, // typed versions of p and q
            convert = this.converter;

        return (
            convert &&
            !convert.not(P = convert.to(p)) &&
            !convert.not(Q = convert.to(q))
        )
            ? this.operation(P, Q)
            : this.operation(p, q);
    },

    toJSON: function(options) { // eslint-disable-line no-unused-vars
        var json = {};
        if (this.editor) {
            json.editor = this.editor;
        }
        for (var key in this.controls) {
            json[key] = this[key];
        }
        if (!this.parent.nodeFields && this.fields !== this.parent.fields) {
            json.fields = this.fields;
        }
        return json;
    },

    toSQL: function() {
        return [
            this.SQL_QUOTED_IDENTIFIER + this.column + this.SQL_QUOTED_IDENTIFIER,
            this.sqlOperator,
            ' \'' + this.argument.replace(/'/g, '\'\'') + '\''
        ].join(' ');
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
 */
function cleanUpAndMoveOn(evt) {
    var el = evt.target;

    // remove `error` CSS class, which may have been added by `FilterLeaf.prototype.validate`
    el.classList.remove('filter-tree-error');

    // set or remove 'warning' CSS class, as per el.value
    FilterNode.setWarningClass(el);

    // find next sibling control, if any
    if (!el.multiple && el.value) {
        while ((el = el.nextElementSibling) && !('name' in el)); // eslint-disable-line curly
    }

    // and click in it (opens select list)
    FilterNode.clickIn(el);
}

function focusOn(el) {
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
function addOptions(tagName, options, prompt) {
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

        options = options.slice().sort(fieldComparator); // clone it and sort the clone

        options.forEach(function(option) {
            if ((option.options || option) instanceof Array) {
                var optgroup = addOptions('optgroup', option.options || option, option.label);
                el.add(optgroup);
            } else {
                var newElement = typeof option !== 'object'
                    ? new Option(option)
                    : new Option(
                        option.header || option.name,
                        option.name || option.header
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
    a = a.header || a.name || a.label || a;
    b = b.header || b.name || b.label || b;
    return a < b ? -1 : a > b ? 1 : 0;
}

module.exports = FilterLeaf;
