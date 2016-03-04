/* eslint-env browser */
/* eslint-disable key-spacing */

'use strict';

var FilterNode = require('./FilterNode');
var template = require('./template');
var conditionals = require('./conditionals');
var popMenu = require('./pop-menu');


/** @typedef {object} converter
 * @property {function} to - Returns input value converted to type. Fails silently.
 * @property {function} not - Tests input value against type, returning `false if type or `true` if not type.
 */
/** @type {converter} */
var numberConverter = { to: Number, not: isNaN };

/** @type {converter} */
var dateConverter = { to: function(s) { return new Date(s); }, not: isNaN };

/** @constructor
 * @summary An object that represents a terminal node in a filter tree.
 * @desc Specifically, the terminal node in a filter tree represents a simple dyadic conditional expression.
 * in the form _field-property operator-property argument-property_ where:
 *
 * * _field-property_ is the name of a column, selected from a drop-down;
 * * _operator-property_ is an operator from an extensible list of operators, also selected from a drop-down; and
 * * _argument-property_ is a constant typed into a text box.
 *
 * The default operator list is defined in conditionals.js and includes equality (=), inequality (<, ≤, ≠, ≥, >), and various pattern operators (such as LIKE, NOT LIKE, etc.)
 */
var FilterLeaf = FilterNode.extend('FilterLeaf', {

    name: 'column = value',

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
     * * `this.view.column` - A drop-down with options from `this.schema`. Value is the name of the column being tested (i.e., the column to which this conditional expression applies).
     * * `this.view.operator` - A drop-down with options from {@link columnOpMenu}, {@link typeOpMenu}, or {@link treeOpMenu}. Value is the string representation of the operator.
     * * `this.view.literal` - A text box.
     *
     *  > Prototypes extended from `FilterLeaf` may have different controls as needed. The only required control is `column`, which all such "editors" must support.
     * @memberOf FilterLeaf.prototype
     */
    createView: function() {
        var el = this.el = document.createElement('span');

        el.className = 'filter-tree-editor filter-tree-default';

        if (this.state.column) {
            // State includes column:
            // Operator menu is built later in loadState; we don't need to build it now. The call to
            // getOpMenu below with undefined columnName returns [] resulting in an empty drop-down.
        } else {
            // When state does NOT include column, it's because either:
            // a. column is unknown and no op menu will be empty until user chooses a column; or
            // b. column is hard-coded when there's only one possible column as inferable from schema:
            var schema = this.schema && this.schema.length === 1 && this.schema[0],
                columnName = schema && (schema.name || schema);
        }

        this.view = {
            column: this.makeElement(this.schema, 'column', true),
            operator: this.makeElement(getOpMenu.call(this, columnName), 'operator'),
            literal: this.makeElement()
        };

        el.appendChild(document.createElement('br'));
    },

    loadState: function() {
        var state = this.state;

        if (state) {
            var value, el, i, b, selected, notes = [];
            for (var key in state) {
                if (!FilterNode.optionsSchema[key]) {
                    value = this[key] = state[key];
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
                                makeOpMenu.call(this, value);
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
     * Caught by {@link FilterTree#invalid|FilterTree.prototype.invalid()}.
     *
     * Also performs the following compilation actions:
     * * Copies all `this.view`' values from the DOM to similarly named properties of `this`.
     * * Pre-sets `this.op` and `this.converter` for use in `test`'s tree walk.
     *
     * @param {boolean} [options.focus=true] - Move focus to offending control.
     * @returns {undefined} if valid
     * @memberOf FilterLeaf.prototype
     */
    invalid: function(options) {
        var elementName, field;

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

        this.converter = this.converters[ // undefined if none of the following
            this.type || // the expression's type, if any
            this.op.type || // the expression's operator type, if any
            (field = popMenu.findItem(this.schema, this[this.view.column])) && field.type // the expression's column type, if any
        ];
    },

    p: function(dataRow) { return dataRow[this.column]; },
    q: function() { return this.literal; },

    test: function(dataRow) {
        var p, q, // untyped versions of args
            P, Q, // typed versions of p and q
            convert;

        return (
            //(p = valOrFunc(this.p(dataRow))) === undefined || // TODO: right now assuming all values are natively strings
            //(q = valOrFunc(this.q(dataRow))) === undefined
            (p = this.p(dataRow)) === undefined ||
            (q = this.q(dataRow)) === undefined
        )
            ? false
            : (
                (convert = this.converter) &&
                !convert.not(P = convert.to(p)) &&
                !convert.not(Q = convert.to(q))
            )
                ? this.op.test(P, Q)
                : this.op.test(p + '', q + '');
    },

/** Tests this leaf node for given column name.
     * > This is the default "find" function.
     * @param {string} columnName
     * @returns {boolean}
     * @memberOf FilterLeaf.prototype
     */
    find: function(columnName) {
        return this.column === columnName;
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
        if (this.schema !== this.parent.schema) {
            state.schema = this.schema;
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
     * @param {menuItem[]} [menu] - Overloads:
     * * If omitted, will create an `<input/>` (text box) element.
     * * If contains only a single option, will create a `<span>...</span>` element containing the string and a `<input type=hidden>` containing the value.
     * * Otherwise, creates a `<select>...</select>` element with these menu items.
     * @param {null|string} [prompt=''] - Adds an initial `<option>...</option>` element to the drop-down with this value, parenthesized, as its `text`; and empty string as its `value`. Omitting creates a blank prompt; `null` suppresses.
     * @memberOf FilterLeaf.prototype
     */
    makeElement: function(menu, prompt, sort) {
        var el, result, options,
            option = menu,
            tagName = menu ? 'SELECT' : 'INPUT';

        // determine if there would be only a single item in the dropdown
        while (option instanceof Array) {
            if (option.length === 1 && !popMenu.isGroupProxy(option[0])) {
                option = option[0];
            } else {
                option = undefined;
            }
        }

        if (option) {
            // hard text when single item
            el = template(
                'lockedColumn',
                option.alias || option.name || option,
                option.name || option.alias || option
            );
            result = el.querySelector('input');
        } else {
            options = {
                prompt: prompt,
                sort: sort,
                group: function(groupName) { return conditionals.groups[groupName]; }
            };
            el = popMenu.build(tagName, menu, options);
            if (el.type === 'text' && this.eventHandler) {
                this.el.addEventListener('keyup', this.eventHandler);
            }
            this.onChange = this.onChange || cleanUpAndMoveOn.bind(this);
            this.el.addEventListener('change', this.onChange);
            FilterNode.setWarningClass(el);
            result = el;
        }

        this.el.appendChild(el);

        return result;
    }
});

//function valOrFunc(vf) {
//var result = (typeof vf)[0] === 'f' ? vf() : vf;
//    return result || result === 0 ? result : '';
//}

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

    // remove `error` CSS class, which may have been added by `FilterLeaf.prototype.invalid`
    el.classList.remove('filter-tree-error');

    // set or remove 'warning' CSS class, as per el.value
    FilterNode.setWarningClass(el);

    if (el === this.view.column) {
        // rebuild operator list according to selected column name or type, restoring selected item
        makeOpMenu.call(this, el.value);
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

function getOpMenu(columnName) {
    var column = popMenu.findItem(this.schema, columnName);
    return (
        !column && []
            ||
        column.opMenu
            ||
        this.typeOpMenu && this.typeOpMenu[column.type]
            ||
        this.treeOpMenu
    );
}

function makeOpMenu(columnName) {
    var opMenu = getOpMenu.call(this, columnName);

    if (opMenu !== this.oldOpMenu) {
        var newOpDrop = this.makeElement(opMenu, 'operator');

        newOpDrop.value = this.view.operator.value;
        this.el.replaceChild(newOpDrop, this.view.operator);
        this.view.operator = newOpDrop;

        FilterNode.setWarningClass(newOpDrop);

        this.opMenu = opMenu;
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
