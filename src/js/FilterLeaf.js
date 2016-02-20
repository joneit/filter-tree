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

    postInitialize: function(options) {
        var el = this.view.column;
        if (!el.value && options && options.state && options.state.autodrop) {
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
     * * `this.view.operator` - A drop-down with options from {@link columnOpMenus}, {@link typeOpMenus}, or {@link treeOpMenus}. Value is the string representation of the operator.
     * * `this.view.literal` - A text box.
     *
     *  > Prototypes extended from `FilterLeaf` may have different controls as needed. The only required control is `column`, which all such "editors" must support.
     * @memberOf FilterLeaf.prototype
     */
    createView: function() {
        var fields = this.nodeFields || this.parent.nodeFields || this.fields;

        if (!fields) {
            throw new FilterNode.FilterTreeError('Terminal node requires a fields list.');
        }

        var root = this.el = document.createElement('span');
        root.className = 'filter-tree-editor filter-tree-default';

        this.view = {
            column: this.makeElement(root, fields, 'column', true),
            operator: this.makeElement(root, [], 'operator'),
            literal: this.makeElement(root)
        };

        root.appendChild(document.createElement('br'));
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
                            if (FilterNode.setWarningClass(el) !== value) {
                                notes.push({ key: key, value: value });
                            } else if (key === 'column') {
                                rebuildOperatorList.call(this, value);
                            }
                    }
                }
            }
            if (notes.length) {
                var multiple = notes.length > 1,
                    footnotes = template(multiple ? 'notes' : 'note'),
                    inner = footnotes.querySelector('.footnote');
                notes.forEach(function(note) {
                    var footnote = multiple ? document.createElement('li') : inner;
                    note = template('optionMissing', note.key, note.value);
                    while (note.length) { footnote.appendChild(note[0]); }
                    if (multiple) { inner.appendChild(footnote); }
                });
            }
            this.notesEl = footnotes;
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
     * @param {boolean} [options.focus=true] - Move focus to offending control.
     * @returns {undefined} if valid
     * @memberOf FilterLeaf.prototype
     */
    validate: function(options) {
        var elementName, fields, field;

        for (elementName in this.view) {
            var el = this.view[elementName],
                value = controlValue(el).trim();

            if (value === '') {
                var focus = options && options.focus;
                if (focus === undefined || focus) { clickIn(el); }
                throw new FilterNode.FilterTreeError('Blank ' + elementName + ' control.\nComplete the filter or delete it.', this);
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
                if (elementName === 'column' || elementName === 'column2') {
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
     * @memberOf FilterLeaf.prototype
     */
    find: function(fieldName) {
        return this.column === fieldName;
    },

    /** Tests this leaf node for given column `Element` ownership.
     * @param {function} Editor (leaf constructor)
     * @returns {boolean}
     * @memberOf FilterLeaf.prototype
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
    /**
     * @param {string} options.syntax - See {@link FilterTree#getState|subtree version} for more info.
     * > For `'object'` and `'JSON'` note that the subtree's version of `getState` will not call this leaf verison of `getState` because the former uses `unstrungify()` and `JSON.stringify()`, respectively, both of which recurse on their own.
     * @memberOf FilterLeaf.prototype
     */
    getState: function getState(options, suboptions) {
        var result = '',
            syntax = options && options.syntax || 'object';

        switch (syntax) {
            case 'object': // see note above
                result = this.toJSON();
                break;
            case 'JSON': // see note above
                result = JSON.stringify(this, null, suboptions && suboptions.space) || '';
                break;
            case 'SQL':
                result = this.getSyntax(conditionals.sqlOperators);
                break;
            case 'filter-cell':
                result = this.getSyntax(conditionals.filterCellOperators);
                if (result[0] === '=') {
                    result = result.substr(1);
                }
                break;
            default:
                throw new FilterNode.FilterTreeError('Unknown syntax option "' + syntax[0] + '"');
        }

        return result;
    },

    getSyntax: function(operators) {
        return operators[this.operator].make.call(operators, this.column, this.literal);
    },


    /** @summary HTML form controls factory.
     * @desc Creates and appends a text box or a drop-down.
     * > Defined on the FilterTree prototype for access by derived types (alternate filter editors).
     * @returns The new element.
     * @param {Element} container - An element to which to append the new element.
     * @param {menuItem[]} [menu] - Overloads:
     * * If omitted, will create an `<input/>` (text box) element.
     * * If contains only a single option, will create a `<span>...</span>` element containing the string and a `<input type=hidden>` containing the value.
     * * Otherwise, creates a `<select>...</select>` element with these menu.
     * @param {null|string} [prompt=''] - Adds an initial `<option>...</option>` element to the drop-down with this value, parenthesized, as its `text`; and empty string as its `value`. Omitting creates a blank prompt; `null` suppresses.
     * @memberOf FilterLeaf.prototype
     */
    makeElement: function(container, menu, prompt, sort) {
        var el, result, options,
            option = menu,
            tagName = menu ? 'select' : 'input';

        // determine if there would be only a single item in the dropdown
        while (option instanceof Array) {
            if (option.length === 1) {
                option = option[0];
            } else {
                option = undefined;
            }
        }

        if (option) {
            // hard text when single item
            result = document.createElement('input');
            result.type = 'hidden';
            result.value = option.name || option.alias || option;

            el = document.createElement('span');
            el.innerHTML = option.alias || option.name || option;
            el.appendChild(result);
        } else {
            options = {
                prompt: prompt,
                sort: sort,
                group: function(groupName) { return conditionals.groups[groupName]; }
            };
            result = el = buildElement(tagName, menu, options);
            if (el.type === 'text' && this.eventHandler) {
                this.el.addEventListener('keyup', this.eventHandler);
            }
            this.onChange = this.onChange || cleanUpAndMoveOn.bind(this);
            this.el.addEventListener('change', this.onChange);
            FilterNode.setWarningClass(el);
        }

        container.appendChild(el);

        return result;
    }
});

function findField(fields, name) {
    var complex, simple;

    simple = fields.find(function(field) {
        if ((field.submenu || field) instanceof Array) {
            return (complex = findField(field.submenu || field, name));
        } else {
            return (field.name || field) === name;
        }
    });

    return complex || simple;
}

/** `change` event handler for all form controls.
 * Rebuilds the operator drop-down as needed.
 * Removes error CSS class from control.
 * Adds warning CSS class from control if blank; removes if not blank.
 * Adds warning CSS class from control if blank; removes if not blank.
 * Moves focus to next non-blank sibling control.
 * @this Bound to this node.
 */
function cleanUpAndMoveOn(evt) {
    var el = evt.target;

    // remove `error` CSS class, which may have been added by `FilterLeaf.prototype.validate`
    el.classList.remove('filter-tree-error');

    // set or remove 'warning' CSS class, as per el.value
    FilterNode.setWarningClass(el);

    if (el === this.view.column) {
        // rebuild operator list according to selected column name or type, restoring selected item
        rebuildOperatorList.call(this, el.value);
    }

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

function getOpMenus(columnName) {
    var fields = this.parent.nodeFields || this.fields,
        field = findField(fields, columnName);

    return field && field.opMenus ||
        this.typeOpMenus && this.typeOpMenus[field.type] ||
        this.treeOpMenus;
}

function rebuildOperatorList(columnName) {
    var opMenus = getOpMenus.call(this, columnName);

    if (opMenus !== this.oldOpMenus) {
        var newOpDrop = this.makeElement(this.el, opMenus, 'operator');

        newOpDrop.value = this.view.operator.value;
        this.el.replaceChild(newOpDrop, this.view.operator);
        this.view.operator = newOpDrop;

        FilterNode.setWarningClass(newOpDrop);

        this.opMenus = opMenus;
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
