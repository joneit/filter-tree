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
