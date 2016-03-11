/* eslint-env browser */
/* eslint-disable key-spacing */

'use strict';

var popMenu = require('pop-menu');

var FilterNode = require('./FilterNode');
var template = require('./template');
var conditionals = require('./conditionals');


var cvtToString = toStringCaseSensitive; // The currently set string converter; case-sensitive by default; reset by FilterLeaf.setCaseSensitivity()


/** @typedef {object} converter
 * @property {function} toType - Returns input value converted to type. Fails silently.
 * @property {function} failed - Tests input value against type, returning `false if type or `true` if not type.
 */

/** @type {converter} */
var numberConverter = {
    toType: Number,
    failed: isNaN
};

/** @type {converter} */
var dateConverter = {
    toType: function(s) { return new Date(s); },
    failed: isNaN
};

/** @type {converter} */
var stringConverter = {
    toType: cvtToString, // reset by FilterLeaf.setCaseSensitivity()
    failed: function() {} // falsy return value because conversion to string always successful
};


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

    key: 'Default', // key in `this.parent.editors` hash

    name: 'column = value', // display string for drop-down

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
            column: this.makeElement(this.schema, 'column', this.sortColumnMenu),
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
        date: dateConverter,
        string: stringConverter
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
        var elementName, field, type;

        for (elementName in this.view) {
            var el = this.view[elementName],
                value = controlValue(el).trim();

            if (value === '') {
                var focus = options && options.focus;
                if (focus === undefined || focus) { clickIn(el); }
                throw new this.Error('Blank ' + elementName + ' control.\nComplete the filter or delete it.', this);
            } else {
                // Copy each controls's value as a new similarly named property of this object.
                this[elementName] = value;
            }
        }

        this.op = conditionals.operators[this.operator];

        // TODO: Can setting up this.converter be moved to initialize()?

        type = this.type || // the expression's type, if any
            this.op.type || // the expression's operator type, if any
            (field = popMenu.findItem(this.schema, this.column)) && field.type; // the expression's column type, if any

        this.converter = type && type !== 'string' && this.converters[type];
    },

    p: function(dataRow) { return dataRow[this.column]; },
    q: function() { return this.literal; },

    test: function(dataRow) {
        var p, q, // untyped versions of args
            P, Q, // typed versions of p and q
            converter;

        // TODO: If a literal (this.q not overridden), q only needs to be fetched & converted ONCE for all rows
        return (
            // TODO: Uncomment following two lines if values can be functions
            //(p = valOrFunc(this.p(dataRow))) === undefined ||
            //(q = valOrFunc(this.q(dataRow))) === undefined
            (p = this.p(dataRow)) === undefined ||
            (q = this.q(dataRow)) === undefined
        )
            ? false // data inaccessible so exclude row
            : (
                (converter = this.converter) &&
                !converter.failed(P = converter.toType(p)) && // attempt to convert data to type
                !converter.failed(Q = converter.toType(q))
            )
                ? this.op.test(P, Q) // there was a converter and both conversions were successful so compare as types
                : this.op.test(cvtToString(p), cvtToString(q)); // no converter or one or both type conversions failed so compare as strings
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
     * > For `'object'` and `'JSON'` note that the subtree's version of `getState` will not call this leaf version of `getState` because the former uses `unstrungify()` and `JSON.stringify()`, respectively, both of which recurse on their own.
     *
     * @param {object} [options] - See {@link FilterTree#getState|subtree version} for more info.
     *
     * @memberOf FilterLeaf.prototype
     */
    getState: function getState(options) {
        var result = '',
            syntax = options && options.syntax || 'object';

        switch (syntax) {
            case 'object': // see note above
                result = this.toJSON();
                break;
            case 'JSON': // see note above
                result = JSON.stringify(this, null, options && options.space) || '';
                break;
            case 'SQL':
                result = this.getSyntax(conditionals.sqlOperators);
                break;
            default:
                throw new this.Error('Unknown syntax option "' + syntax[0] + '"');
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

/**
 * @summary Set case-sensitivity.
 * @desc This is a shared property for all filter-trees.
 * @param {boolean} isSensitive
 */
FilterLeaf.setCaseSensitivity = function(isSensitive) {
    stringConverter.toType =
        conditionals.cvtToString =
            cvtToString = isSensitive
                ? toStringCaseSensitive
                : toStringCaseInsensitive;
};

// Following two functions are the possible values for FilterLeaf.prototype.cvtToType:
function toStringCaseInsensitive(s) { return (s + '').toLowerCase(); }
function toStringCaseSensitive(s) { return s + ''; }


module.exports = FilterLeaf;
