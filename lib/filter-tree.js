(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _ = require('object-iterators');
var popMenu = require('pop-menu');

var FilterTree = require('./js/FilterTree');
FilterTree.Node = require('./js/FilterNode'); // aka: Object.getPrototypeOf(FilterTree.prototype).constructor
FilterTree.Leaf = require('./js/FilterLeaf'); // aka: FilterTree.prototype.editors.Default

// expose some objects for plug-in access

FilterTree.Conditionals = require('./js/Conditionals');

// FOLLOWING PROPERTIES ARE *** TEMPORARY ***,
// FOR THE DEMO TO ACCESS THESE NODE MODULES.

FilterTree._ = _;
FilterTree.popMenu = popMenu;


window.FilterTree = FilterTree;

},{"./js/Conditionals":3,"./js/FilterLeaf":4,"./js/FilterNode":5,"./js/FilterTree":6,"object-iterators":14,"pop-menu":16}],2:[function(require,module,exports){
'use strict';

exports['column-CQL-syntax'] = [
'<li>',
'	<button type="button" class="copy"></button>',
'	<div class="filter-tree-remove-button" title="delete conditional"></div>',
'	{1}:',
'	<input name="{2}" class="{4}" value="{3:encode}">',
'</li>'
].join('\n');

exports['column-SQL-syntax'] = [
'<li>',
'	<button type="button" class="copy"></button>',
'	<div class="filter-tree-remove-button" title="delete conditional"></div>',
'	{1}:',
'	<textarea name="{2}" rows="1" class="{4}">{3:encode}</textarea>',
'</li>'
].join('\n');

exports.columnFilter = [
'<span class="filter-tree">',
'	 <strong><span>{2} </span>column filter subexpression:</strong><br>',
'	 Match',
'	 <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-or">any</label>',
'	 <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-and">all</label>',
'	 <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-nor">none</label>',
'	 of the following:',
'	 <select>',
'		 <option value="">New expression&hellip;</option>',
'	 </select>',
'	 <ol></ol>',
' </span>'
].join('\n');

exports.columnFilters = [
'<span class="filter-tree filter-tree-type-column-filters">',
'	 Match <strong>all</strong> of the following column filters:',
'	 <ol></ol>',
' </span>'
].join('\n');

exports.lockedColumn = [
'<span>',
'	 {1:encode}',
'	 <input type="hidden" value="{2}">',
' </span>'
].join('\n');

exports.note = [
'<div class="footnotes">',
'	<div class="footnote"></div>',
'	<p>Select a new value or delete the expression altogether.</p>',
'</div>'
].join('\n');

exports.notes = [
'<div class="footnotes">',
'	<p>Note the following error conditions:</p>',
'	<ul class="footnote"></ul>',
'	<p>Select new values or delete the expression altogether.</p>',
'</div>'
].join('\n');

exports.optionMissing = [
'The requested value of <span class="field-name">{1:encode}</span>',
'(<span class="field-value">{2:encode}</span>) is not valid.'
].join('\n');

exports.removeButton = [
'<div class="filter-tree-remove-button" title="delete conditional"></div>'
].join('\n');

exports.subtree = [
'<span class="filter-tree">',
'	 Match',
'	 <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-or">any</label>',
'	 <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-and">all</label>',
'	 <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-nor">none</label>',
'	 of the following:',
'	 <select>',
'		 <option value="">New expression&hellip;</option>',
'		 <option value="subexp" style="border-bottom:1px solid black">Subexpression</option>',
'	 </select>',
'	 <ol></ol>',
' </span>'
].join('\n');

},{}],3:[function(require,module,exports){
/** @module conditionals */

'use strict';

var Base = require('extend-me').Base;
var _ = require('object-iterators');
var regExpLIKE = require('regexp-like');

var IN = 'IN',
    NOT_IN = 'NOT ' + IN,
    LIKE = 'LIKE',
    NOT_LIKE = 'NOT ' + LIKE,
    LIKE_WILD_CARD = '%',
    NIL = '';

var toString;

var defaultIdQts = {
    beg: '"',
    end: '"'
};


/**
 * @constructor
 */
var Conditionals = Base.extend({
    /**
     * @param {sqlIdQtsObject} [options.sqlIdQts={beg:'"',end:'"'}]
     * @memberOf Conditionals#
     */
    initialize: function(options) {
        var idQts = options && options.sqlIdQts;
        if (idQts) {
            this.sqlIdQts = idQts; // only override if defined
        }
    },

    sqlIdQts: defaultIdQts,
    /**
     * @param id
     * @returns {string}
     * @memberOf Conditionals#
     */
    makeSqlIdentifier: function(id) {
        return this.sqlIdQts.beg + id + this.sqlIdQts.end;
    },

    /**
     * @param string
     * @returns {string}
     * @memberOf Conditionals#
     */
    makeSqlString: function(string) {
        return '\'' + sqEsc(string) + '\'';
    },

    /**
     * @memberOf Conditionals#
     */
    makeLIKE: function(beg, end, op, originalOp, c) {
        var escaped = c.operand.replace(/([_\[\]%])/g, '[$1]'); // escape all LIKE reserved chars
        return this.makeSqlIdentifier(c.column) +
            ' ' + op +
            ' ' + this.makeSqlString(beg + escaped + end);
    },

    /**
     * @memberOf Conditionals#
     */
    makeIN: function(op, c) {
        return this.makeSqlIdentifier(c.column) +
            ' ' + op +
            ' ' + '(\'' + sqEsc(c.operand).replace(/\s*,\s*/g, '\', \'') + '\')';
    },

    /**
     * @memberOf Conditionals#
     */
    make: function(op, c) {
        return this.makeSqlIdentifier(c.column) +
            ' ' + op +
            ' ' + c.makeSqlOperand();
    }
});

var ops = Conditionals.prototype.ops = {
    undefined: {
        test: function() { return true; },
        make: function() { return ''; }
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    '<': {
        test: function(a, b) { return a < b; },
        make: function(c) { return this.make('<', c); }
    },
    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    '<=': {
        test: function(a, b) { return a <= b; },
        make: function(c) { return this.make('<=', c); }
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    '=': {
        test: function(a, b) { return a === b; },
        make: function(c) { return this.make('=', c); }
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    '>=': {
        test: function(a, b) { return a >= b; },
        make: function(c) { return this.make('>=', c); }
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    '>': {
        test: function(a, b) { return a > b; },
        make: function(c) { return this.make('>', c); }
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    '<>': {
        test: function(a, b) { return a !== b; },
        make: function(c) { return this.make('<>', c); }
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    LIKE: {
        test: function(a, b) { return regExpLIKE.cached(b, true).test(a); },
        make: function(c) { return this.make(LIKE, c); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    'NOT LIKE': {
        test: function(a, b) { return !regExpLIKE.cached(b, true).test(a); },
        make: function(c) { return this.make(NOT_LIKE, c); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    IN: { // TODO: currently forcing string typing; rework calling code to respect column type
        test: function(a, b) { return inOp(a, b) >= 0; },
        make: function(c) { return this.makeIN(IN, c); },
        operandList: true,
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    'NOT IN': { // TODO: currently forcing string typing; rework calling code to respect column type
        test: function(a, b) { return inOp(a, b) < 0; },
        make: function(c) { return this.makeIN(NOT_IN, c); },
        operandList: true,
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    CONTAINS: {
        test: function(a, b) { return containsOp(a, b) >= 0; },
        make: function(c) { return this.makeLIKE(LIKE_WILD_CARD, LIKE_WILD_CARD, LIKE, 'CONTAINS', c); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    'NOT CONTAINS': {
        test: function(a, b) { return containsOp(a, b) < 0; },
        make: function(c) { return this.makeLIKE(LIKE_WILD_CARD, LIKE_WILD_CARD, NOT_LIKE, 'NOT CONTAINS', c); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    BEGINS: {
        test: function(a, b) { b = toString(b); return beginsOp(a, b.length) === b; },
        make: function(c) { return this.makeLIKE(NIL, LIKE_WILD_CARD, LIKE, 'BEGINS', c); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    'NOT BEGINS': {
        test: function(a, b) { b = toString(b); return beginsOp(a, b.length) !== b; },
        make: function(c) { return this.makeLIKE(NIL, LIKE_WILD_CARD, NOT_LIKE, 'NOT BEGINS', c); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    ENDS: {
        test: function(a, b) { b = toString(b); return endsOp(a, b.length) === b; },
        make: function(c) { return this.makeLIKE(LIKE_WILD_CARD, NIL, LIKE, 'ENDS', c); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberOf Conditionals#
     */
    'NOT ENDS': {
        test: function(a, b) { b = toString(b); return endsOp(a, b.length) !== b; },
        make: function(c) { return this.makeLIKE(LIKE_WILD_CARD, NIL, NOT_LIKE, 'NOT ENDS', c); },
        type: 'string'
    }
};

// some synonyms
ops['\u2264'] = ops['<='];  // UNICODE 'LESS-THAN OR EQUAL TO'
ops['\u2265'] = ops['>='];  // UNICODE 'GREATER-THAN OR EQUAL TO'
ops['\u2260'] = ops['<>'];  // UNICODE 'NOT EQUAL TO'

function inOp(a, b) {
    return b
        .trim() // remove leading and trailing space chars
        .replace(/\s*,\s*/g, ',') // remove any white-space chars from around commas
        .split(',') // put in an array
        .indexOf((a + '')); // search array whole matches
}

function containsOp(a, b) {
    return toString(a).indexOf(toString(b));
}

function beginsOp(a, length) {
    return toString(a).substr(0, length);
}

function endsOp(a, length) {
    return toString(a).substr(-length, length);
}

function sqEsc(string) {
    return string.replace(/'/g, '\'\'');
}

var groups = {
    equality: {
        label: 'Equality',
        submenu: ['=']
    },
    inequalities: {
        label: 'Inequalities',
        submenu: [
            '<',
            '\u2264', // UNICODE 'LESS-THAN OR EQUAL TO'; on a Mac, type option-comma (≤)
            '\u2260', // UNICODE 'NOT EQUALS'; on a Mac, type option-equals (≠)
            '\u2265', // UNICODE 'GREATER-THAN OR EQUAL TO'; on a Mac, type option-period (≥)
            '>'
        ]
    },
    sets: {
        label: 'Set scans',
        submenu: ['IN', 'NOT IN']
    },
    strings: {
        label: 'String scans',
        submenu: [
            'CONTAINS', 'NOT CONTAINS',
            'BEGINS', 'NOT BEGINS',
            'ENDS', 'NOT ENDS'
        ]
    },
    patterns: {
        label: 'Pattern scans',
        submenu: ['LIKE', 'NOT LIKE']
    }
};

// add a `name` prop to each group
_(groups).each(function(group, key) { group.name = key; });

/**
 * @memberOf Conditionals
 */
Conditionals.groups = groups;

/** Default operator menu when consisting of all of the groups in {@link module:conditionals.groups|groups}. This menu is used when none of the following is otherwise defined:
 * * The `opMenu` property of the column schema.
 * * The entry in the node's `typeOpMap` hash corresponding to the `type` property of the column schema.
 * * The node's `treeOpMenu` object.
 * @type {menuItem[]}
 * @memberOf Conditionals
 */
Conditionals.defaultOpMenu = [ // hierarchical menu of relational operators
    groups.equality,
    groups.inequalities,
    groups.sets,
    groups.strings,
    groups.patterns
];


// Meant to be called by FilterTree.prototype.setSensitivity only
Conditionals.setToString = function(fn) {
    return (toString = fn);
};

module.exports = Conditionals;

},{"extend-me":13,"object-iterators":14,"regexp-like":17}],4:[function(require,module,exports){
/* eslint-env browser */
/* eslint-disable key-spacing */

'use strict';

var popMenu = require('pop-menu');

var FilterNode = require('./FilterNode');
var Conditionals = require('./Conditionals');


var toString; // set by FilterLeaf.setToString() called from ../index.js


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

/**
 * @typedef {object} filterLeafViewObject
 *
 * @property {HTMLElement} column - A drop-down with options from the `FilterLeaf` instance's schema. Value is the name of the column being tested (i.e., the column to which this conditional expression applies).
 *
 * @property operator - A drop-down with options from {@link columnOpMenu}, {@link typeOpMap}, or {@link treeOpMenu}. Value is the string representation of the operator.
 *
 * @property operand - An input element, such as a drop-down or a text box.
 */

/** @constructor
 * @summary An object that represents a conditional expression node in a filter tree.
 * @desc This object represents a conditional expression. It is always a terminal node in the filter tree; it has no child nodes of its own.
 *
 * A conditional expression is a simple dyadic expression with the following syntax in the UI:
 *
 * > _column operator operand_
 *
 * where:
 * * _column_ is the name of a column from the data row object
 * * _operator_ is the name of an operator from the node's operator list
 * * _operand_ is a literal value to compare against the value in the named column
 *
 * **NOTE:** The {@link ColumnLeaf} extension of this object has a different implementation of _operand_ which is: The name of a column from which to fetch the compare value (from the same data row object) to compare against the value in the named column. See *Extending the conditional expression object* in the {@link http://joneit.github.io/filter-tree/index.html|readme}.
 *
 * The values of the terms of the expression above are stored in the first three properties below. Each of these three properties is set either by `setState()` or by the user via a control in `el`. Note that these properties are not dynamically bound to the UI controls; they are updated by the validation function, `invalid()`.
 *
 * **See also the properties of the superclass:** {@link FilterNode}
 *
 * @property {string} column - Name of the member in the data row objects against which `operand` will be compared. Reflects the value of the `view.column` control after validation.
 *
 * @property {string} operator - Operator symbol. This must match a key in the `this.root.conditionals.ops` hash. Reflects the value of the `view.operator` control after validation.
 *
 * @property {string} operand - Value to compare against the the member of data row named by `column`. Reflects the value of the `view.operand` control, after validation.
 *
 * @property {string} name - Used to describe the object in the UI so user can select an expression editor.
 *
 * @property {string} [type='string'] - The data type of the subexpression if neither the operator nor the column schema defines a type.
 *
 * @property {HTMLElement} el - A `<span>...</span>` element that contains the UI controls. This element is automatically appeneded to the parent `FilterTree`'s `el`. Generated by {@link FilterLeaf#createView|createView}.
 *
 * @property {filterLeafViewObject} view - A hash containing direct references to the controls in `el`. Added by {@link FilterLeaf#createView|createView}.
 */
var FilterLeaf = FilterNode.extend('FilterLeaf', {

    name: 'column = value', // display string for drop-down

    destroy: function() {
        if (this.view) {
            for (var key in this.view) {
                this.view[key].removeEventListener('change', this.onChange);
            }
        }
    },

    /** @summary Create a new view.
     * @desc This new "view" is a group of HTML `Element` controls that completely describe the conditional expression this object represents. This method creates the view, setting `this.el` to point to it, and the members of `this.view` to point to the individual controls therein.
     * @memberOf FilterLeaf#
     */
    createView: function(state) {
        var el = this.el = document.createElement('span');

        el.className = 'filter-tree-editor filter-tree-default';

        if (state && state.column) {
            // State includes column:
            // Operator menu is built later in loadState; we don't need to build it now. The call to
            // getOpMenu below with undefined columnName returns [] resulting in an empty drop-down.
        } else {
            // When state does NOT include column, it's because either:
            // a. column is unknown and op menu will be empty until user chooses a column; or
            // b. column is hard-coded when there's only one possible column as inferable from schema:
            var schema = this.schema && this.schema.length === 1 && this.schema[0],
                columnName = schema && schema.name || schema;
        }

        this.view = {
            column: this.makeElement(this.schema, 'column', this.sortColumnMenu),
            operator: this.makeElement(getOpMenu.call(this, columnName), 'operator'),
            operand: this.makeElement()
        };

        el.appendChild(document.createElement('br'));
    },

    loadState: function(state) {
        var value, el, i, b, selected, ops, thisOp, opMenu, notes;
        if (state) {
            notes = [];
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
                            if (el.value === '' && key === 'operator') {
                                // Operator may be a synonym.
                                ops = this.root.conditionals.ops;
                                thisOp = ops[value];
                                opMenu = getOpMenu.call(this, state.column || this.column);
                                // Check each menu item's op object for equivalency to possible synonym's op object.
                                popMenu.walk.call(opMenu, equiv);
                            }
                            if (!FilterNode.setWarningClass(el)) {
                                notes.push({ key: key, value: value });
                            } else if (key === 'column') {
                                makeOpMenu.call(this, value);
                            }
                    }
                }
            }
            if (notes.length) {
                var multiple = notes.length > 1,
                    templates = this.templates,
                    footnotes = templates.get(multiple ? 'notes' : 'note'),
                    inner = footnotes.querySelector('.footnote');
                notes.forEach(function(note) {
                    var footnote = multiple ? document.createElement('li') : inner;
                    note = templates.get('optionMissing', note.key, note.value);
                    while (note.length) { footnote.appendChild(note[0]); }
                    if (multiple) { inner.appendChild(footnote); }
                });
            }
            this.notesEl = footnotes;
        }
        function equiv(opMenuItem) {
            var opName = opMenuItem.name || opMenuItem;
            if (ops[opName] === thisOp) {
                el.value = opName;
            }
        }
    },

    /**
     * @property {converter} number
     * @property {converter} int - synonym of `number`
     * @property {converter} float - synonym of `number`
     * @property {converter} date
     * @property {converter} string
     */
    converters: {
        number: numberConverter,
        int: numberConverter,
        float: numberConverter,
        date: dateConverter
    },

    /**
     * Called by the parent node's {@link FilterTree#invalid|invalid()} method, which catches the error thrown when invalid.
     *
     * Also performs the following compilation actions:
     * * Copies all `this.view`' values from the DOM to similarly named properties of `this`.
     * * Pre-sets `this.op` and `this.converter` for use in `test`'s tree walk.
     *
     * @param {boolean} [options.throw=false] - Throw an error if missing or invalid value.
     * @param {boolean} [options.focus=false] - Move focus to offending control.
     * @returns {undefined} This is the normal return when valid; otherwise throws error when invalid.
     * @memberOf FilterLeaf#
     */
    invalid: function(options) {
        var elementName, type, focused;

        for (elementName in this.view) {
            var el = this.view[elementName],
                value = controlValue(el).trim();

            if (
                value === '' && elementName === 'operator' && // not in operator menu
                this.root.conditionals.ops[this.operator] && // but valid in operator hash
                !getProperty.call(this, this.column, 'opMustBeInMenu') // and is doesn't have to be in menu to be valid
            ) {
                value = this.operator; // use it as is then
            }

            if (value === '') {
                if (!focused && options && options.focus) {
                    clickIn(el);
                    focused = true;
                }
                if (options && options.throw) {
                    throw new this.Error('Missing or invalid ' + elementName + ' in conditional expression. Complete the expression or remove it.', this);
                }
            } else {
                // Copy each controls's value as a new similarly named property of this object.
                this[elementName] = value;
            }
        }

        this.op = this.root.conditionals.ops[this.operator];

        type = this.getType();

        this.converter = type && type !== 'string' && this.converters[type];

        this.calculator = this.getCalculator();
    },

    getType: function() {
        return this.op.type || getProperty.call(this, this.column, 'type');
    },

    getCalculator: function() {
        return getProperty.call(this, this.column, 'calculator');
    },

    valOrFunc: function(dataRow, columnName, calculator) {
        var result;
        if (dataRow) {
            result = dataRow[columnName];
            calculator = (typeof result)[0] === 'f' ? result : calculator;
            if (calculator) {
                result = calculator(dataRow, columnName);
            }
        }
        return result || result === 0 || result === false ? result : '';
    },

    p: function(dataRow) {
        return this.valOrFunc(dataRow, this.column, this.calculator);
    },

    // To be overridden when operand is a column name (see columns.js).
    q: function() {
        return this.operand;
    },

    test: function(dataRow) {
        var p, q, // untyped versions of args
            P, Q, // typed versions of p and q
            converter;

        // TODO: If a literal (i.e., when this.q is not overridden), q only needs to be fetched ONCE for all rows
        return (
            (p = this.p(dataRow)) === undefined ||
            (q = this.q(dataRow)) === undefined
        )
            ? false // data inaccessible so exclude row
            : (
                (converter = this.converter) &&
                !converter.failed(P = converter.toType(p)) && // attempt to convert data to type
                !converter.failed(Q = converter.toType(q))
            )
                ? this.op.test(P, Q) // both conversions successful: compare as types
                : this.op.test(toString(p), toString(q)); // one or both conversions failed: compare as strings
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
     * For `'object'` and `'JSON'` note that the subtree's version of `getState` will not call this leaf version of `getState` because the former uses `unstrungify()` and `JSON.stringify()`, respectively, both of which recurse and call `toJSON()` on their own.
     *
     * @param {object} [options='object'] - See the subtree version of {@link FilterTree#getState|getState} for more info.
     *
     * @memberOf FilterLeaf#
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
                result = this.getSyntax(this.root.conditionals);
        }

        return result;
    },

    makeSqlOperand: function() {
        return this.root.conditionals.makeSqlString(this.operand); // todo: this should be a number if type is number instead of a string -- but we will have to ensure it is numeric!
    },

    getSyntax: function(conditionals) {
        return this.root.conditionals.ops[this.operator].make.call(conditionals, this);
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
     * @param [sort]
     * @memberOf FilterLeaf#
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
            el = this.templates.get(
                'lockedColumn',
                option.alias || option.header || option.name || option,
                option.name || option.alias || option.header || option
            );
            result = el.querySelector('input');
        } else {
            options = {
                prompt: prompt,
                sort: sort,
                group: function(groupName) { return Conditionals.groups[groupName]; }
            };

            // make an element
            el = popMenu.build(tagName, menu, options);

            // if it's a textbox, listen for keyup events
            if (el.type === 'text' && this.eventHandler) {
                this.el.addEventListener('keyup', this.eventHandler);
            }

            // handle onchange events
            this.onChange = this.onChange || cleanUpAndMoveOn.bind(this);
            this.el.addEventListener('change', this.onChange);

            FilterNode.setWarningClass(el);
            result = el;
        }

        this.el.appendChild(el);

        return result;
    }
});

/** `change` event handler for all form controls.
 * Rebuilds the operator drop-down as needed.
 * Removes error CSS class from control.
 * Adds warning CSS class from control if blank; removes if not blank.
 * Adds warning CSS class from control if blank; removes if not blank.
 * Moves focus to next non-blank sibling control.
 * @this {FilterLeaf}
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

    // forward the event to the application's event handler
    if (this.eventHandler) {
        this.eventHandler(evt);
    }
}

/**
 * @summary Get the node property.
 * @desc Priority ladder:
 * 1. Schema property.
 * 2. Mixin (if given).
 * 3. Node property is final priority.
 * @this {FilterLeaf}
 * @param {string} columnName
 * @param {string} propertyName
 * @param {function|boolean} [mixin] - Optional function or value if schema property undefined. If function, called in context with `propertyName` and `columnName`.
 * @returns {object}
 */
function getProperty(columnName, propertyName, mixin) {
    var columnSchema = this.schema.lookup(columnName) || {};
    return (
        columnSchema[propertyName] // the expression's column schema property
            ||
        typeof mixin === 'function' && mixin.call(this, columnSchema, propertyName)
            ||
        typeof mixin !== 'function' && mixin
            ||
        this[propertyName] // the expression node's property
    );
}

/**
 * @this {FilterLeaf}
 * @param {string} columnName
 * @returns {undefined|menuItem[]}
 */
function getOpMenu(columnName) {
    return getProperty.call(this, columnName, 'opMenu', function(columnSchema) {
        return this.typeOpMap && this.typeOpMap[columnSchema.type || this.type];
    });
}

/**
 * @this {FilterLeaf}
 * @param {string} columnName
 */
function makeOpMenu(columnName) {
    var opMenu = getOpMenu.call(this, columnName);

    if (opMenu !== this.renderedOpMenu) {
        var newOpDrop = this.makeElement(opMenu, 'operator');

        newOpDrop.value = this.view.operator.value;
        this.el.replaceChild(newOpDrop, this.view.operator);
        this.view.operator = newOpDrop;

        FilterNode.setWarningClass(newOpDrop);

        this.renderedOpMenu = opMenu;
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

// Meant to be called by FilterTree.prototype.setSensitivity only
FilterLeaf.setToString = function(fn) {
    toString = fn;
    return Conditionals.setToString(fn);
};


module.exports = FilterLeaf;

},{"./Conditionals":3,"./FilterNode":5,"pop-menu":16}],5:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var _ = require('object-iterators');
var extend = require('extend-me'), Base = extend.Base; extend.debug = true;
var popMenu = require('pop-menu');

var cssInjector = require('./stylesheet');
var Templates = require('./Templates');
var Conditionals = require('./Conditionals');
var ParserSQL = require('./parser-SQL');


var CHILDREN_TAG = 'OL',
    CHILD_TAG = 'LI';

// JSON-detector: begins _and_ ends with either [ and ] _or_ { and }
var reJSON = /^\s*((\[[^]*\])|(\{[^]*\}))\s*$/;

function FilterTreeError(message, node) {
    this.message = message;
    this.node = node;
}
FilterTreeError.prototype = Object.create(Error.prototype);
FilterTreeError.prototype.name = 'FilterTreeError';

/** @typedef {object} FilterTreeSetStateOptionsObject
 *
 * @property {boolean} [syntax='auto'] - Specify parser to use on `state`. One of:
 * * `'auto'` - Auto-detect; see {@link FilterNode#parseStateString} for algorithm.
 * * `'object'` - A raw state object such as that produced by the [getState()]{@link FilterTree#getState} method.
 * * `'JSON'` - A JSON string version of a state object such as that produced by the [getState()]{@link FilterTree#getState} method.
 * * `'SQL'` - A SQL [search condition expression]{@link https://msdn.microsoft.com/en-us/library/ms173545.aspx} string.
 *
 * @param {Element} [context] If defined, the provided input string is used as a selector to an `HTMLElement` contained in `context`. The `value` property of this element is fetched from the DOM and is used as the input state string; proceed as above.
 */

/** @typedef {object} FilterTreeOptionsObject
 *
 * @property {menuItem[]} [schema] - A default list of column names for field drop-downs of all descendant terminal nodes. Overrides `options.state.schema` (see). May be defined for any node and pertains to all descendants of that node (including terminal nodes). If omitted (and no `ownSchema`), will use the nearest ancestor `schema` definition. However, descendants with their own definition of `types` will override any ancestor definition.
 *
 * > Typically only used by the caller for the top-level (root) tree.
 *
 * @property {menuItem[]} [ownSchema] - A default list of column names for field drop-downs of immediate descendant terminal nodes _only_. Overrides `options.state.ownSchema` (see).
 *
 * Although both `options.schema` and `options.ownSchema` are notated as optional herein, by the time a terminal node tries to render a schema drop-down, a `schema` list should be defined through (in order of priority):
 *
 * * Terminal node's own `options.schema` (or `options.state.schema`) definition.
 * * Terminal node's parent node's `option.ownSchema` (or `option.state.nodesFields`) definition.
 * * Terminal node's parent (or any ancestor) node's `options.schema` (or `options.state.schema`) definition.
 *
 * @property {FilterTreeStateObject} [state] - A data structure that describes a tree, subtree, or leaf (terminal node). If undefined, loads an empty filter, which is a `FilterTree` node consisting the default `operator` value (`'op-and'`).
 *
 * @property {function} [editor='Default'] - The name of the conditional expression's UI "editor." This name must be registered in the parent node's {@link FilterTree#editors|editors} hash, where it maps to a leaf constructor (`FilterLeaf` or a descendant thereof). (Use {@link FilterTree#addEditor} to register new editors.)
 *
 * @property {FilterTree} [parent] - Used internally to insert element when creating nested subtrees. The only time it may be (and must be) omitted is when creating the root node.
 *
 * @property {string|HTMLElement} [cssStylesheetReferenceElement] - passed to cssInsert
 */

/** @typedef {object|string} FilterTreeStateObject
 *
 * @summary State with which to create a new node or replace an existing node.
 *
 * @desc A string or plain object that describes a filter-tree node. If a string, it is parsed into an object by {@link FilterNode~parseStateString}. (See, for available overloads.)
 *
 * The resulting object may be a flat object that describes a terminal node or a childless root or branch node; or may be a hierarchical object to define an entire tree or subtree.
 *
 * In any case, the resulting object may have any of the following properties:
 *
 * @property {menuItem[]} [schema] - See `schema` property of {@link FilterTreeOptionsObject}.
 *
 * @property {string} [editor='Default'] - See `editor` property of {@link FilterTreeOptionsObject}.
 *
 * @property misc - Other miscellaneous properties will be copied directly to the new `FitlerNode` object. (The name "misc" here is just a stand-in; there is no specific property called "misc".)
 *
 * * May describe a non-terminal node with properties:
 *   * `schema` - Overridden on instantiation by `options.schema`. If both unspecified, uses parent's definition.
 *   * `operator` - One of {@link treeOperators}.
 *   * `children` -  Array containing additional terminal and non-terminal nodes.
 *
 * The constructor auto-detects `state`'s type:
 *  * JSON string to be parsed by `JSON.parse()` into a plain object
 *  * SQL WHERE clause string to be parsed into a plain object
 *  * CSS selector of an Element whose `value` contains one of the above
 *  * plain object
 */

/**
 * @constructor
 *
 * @summary A node in a filter tree.
 *
 * @description A filter tree represents a _complex conditional expression_ and consists of a single instance of a {@link FilterTree} object as the _root_ of an _n_-ary tree.
 *
 * Filter trees are comprised of instances of `FilterNode` objects. However, the `FilterNode` constructor is an "abstract class"; filter node objects are never instantiated directly from this constructor. A filter tree is actually comprised of instances of two "subclasses" of `FilterNode` objects:
 * * {@link FilterTree} (or subclass thereof) objects, instances of which represent the root node and all the branch nodes:
 *   * There is always exactly one root node, containing the whole filter tree, which represents the filter expression in its entirety. The root node is distinguished by having no parent node.
 *   * There are zero or more branch nodes, or subtrees, which are child nodes of the root or other branches higher up in the tree, representing subexpressions within the larger filter expression. Each branch node has exactly one parent node.
 *   * These nodes point to zero or more child nodes which are either nested subtrees, or:
 * * {@link FilterLeaf} (or subclass thereof) objects, each instance of which represents a single simple conditional expression. These are terminal nodes, having exactly one parent node, and no child nodes.
 *
 * The programmer may extend the semantics of filter trees by extending the above objects.
 *
 * @property {sqlIdQtsObject} [sqlIdQts={beg:'"',end:'"'}] - Quote characters for SQL identifiers. Used for both parsing and generating SQL. Should be placed on the root node.
 *
 * @property {HTMLElement} el - The DOM element created by the `render` method to represent this node. Contains the `el`s for all child nodes (which are themselves pointed to by those nodes). This is always generated but is only in the page DOM if you put it there.
 */

var FilterNode = Base.extend('FilterNode', {

    /**
     * @summary Create a new node or subtree.
     * @desc Typically used by the application layer to create the entire filter tree; and internally, recursively, to create each node including both subtrees and leaves.
     *
     * **Node properties and options:** Nodes are instantiated with:
     * 1. Certain **required properties** which differ for subtrees and leaves.
     * 2. Arbitrary **non-standard option properties** are defined on the `options` object (so long as their names do not conflict with any standard options) and never persist.
     * 3. Certain **standard options properties** as defined in the {@link FilterNode~optionsSchema|optionsSchema} hash, come from various sources, as prioritized as follows:
     *    1. `options` object; does not persist
     *    2. `state`; object; persists
     *    3. `parent` object; persists
     *    4. `default` object; does not persist
     *
     * Notes:
     * 1. "Persists" means output by {@link FilterTree#getState|getState()}.
     * 2. The `parent` object is generated internally for subtrees. It allows standard options to inherit from the parent node.
     * 3. The `default` object comes from the `default` property, if any, of the {@link FilterNode~optionsSchema|schema object} for the standard option in question. Note that once defined, subtrees will then inherit this value.
     * 4. If not defined by any of the above, the standard option remains undefined on the node.
     *
     * **Query Builder UI support:** If your app wants to make use of the generated UI, you are responsible for inserting the top-level `.el` into the DOM. (Otherwise just ignore it.)
     *
     * @param {FilterTreeOptionsObject} [options] - The node state; or an options object possibly containing `state` among other options. Although you can instantiate a filter without any options, this is generally not useful. See *Instantiating a filter* in the {@link http://joneit.github.io/filter-tree/index.html|readme} for a practical discussion of minimum options.
     *
     * * @memberOf FilterNode#
     */
    initialize: function(options) {
        options = options || {};

        /** @summary Reference to this node's parent node.
         * @desc When this property is undefined, this node is the root node.
         * @type {FilterNode}
         * @memberOf FilterNode#
         */
        var parent = this.parent = this.parent || options.parent,
            root = parent && parent.root;

        if (!root) {
            root = this;

            this.stylesheet = this.stylesheet ||
                cssInjector(options.cssStylesheetReferenceElement);

            this.conditionals = new Conditionals(options); // .sqlIdQts

            this.ParserSQL = new ParserSQL(options); // .schema, .caseSensitiveColumnNames, .resolveAliases

            var keys = ['name'];
            if (options.resolveAliases) {
                keys.push('alias');
            }

            this.findOptions = {
                caseSensitive: options.caseSensitiveColumnNames,
                keys: keys
            };
        }

        /** @summary Convenience reference to the root node.
         * @name root
         * @type {FilterNode}
         * @memberOf FilterNode#
         */
        this.root = root;

        this.dontPersist = {}; // hash of truthy values

        this.setState(options.state, options);
    },

    /** Insert each subtree into its parent node along with a "delete" button.
     *
     * NOTE: The root tree (which has no parent) must be inserted into the DOM by the instantiating code (without a delete button).
     * @memberOf FilterNode#
     */
    render: function() {
        if (this.parent) {
            var newListItem = document.createElement(CHILD_TAG);

            if (this.notesEl) {
                newListItem.appendChild(this.notesEl);
            }

            if (!this.keep) {
                var el = this.templates.get('removeButton');
                el.addEventListener('click', this.remove.bind(this));
                newListItem.appendChild(el);
            }

            newListItem.appendChild(this.el);

            this.parent.el.querySelector(CHILDREN_TAG).appendChild(newListItem);
        }
    },

    /**
     *
     * @param {FilterTreeStateObject} state
     * @param {FilterTreeSetStateOptionsObject} [options]
     * @memberOf FilterNode#
     */
    setState: function(state, options) {
        var oldEl = this.el;

        state = this.parseStateString(state, options);

        this.mixInStandardOptions(state, options);
        this.mixInNonstandardOptions(options);
        this.createView(state);
        this.loadState(state);
        this.render();

        if (oldEl) {
            var newEl = this.el;
            if (this.parent && oldEl.parentElement.tagName === 'LI') {
                oldEl = oldEl.parentNode;
                newEl = newEl.parentNode;
            }
            oldEl.parentNode.replaceChild(newEl, oldEl);
        }
    },

    /**
     * @summary Convert a string to a state object.
     *
     * @desc They string's syntax is inferred as follows:
     * 1. If state is undefined or already an object, return as is.
     * 2. If `options.context` is defined, `state` is assumed to be a CSS selector string (auto-detected) pointing to an HTML form control with a `value` property, such as a {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement HTMLInputElement} or a {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLTextAreaElement HTMLTextAreaElement}. The element is selected and if found, its value is fetched from the DOM and assigned to `state`.
     * 3. If `options.syntax` is `'auto'`, JSON syntax is detected if `state` begins _and_ ends with either `[` and `]` _or_ `{` and `}` (ignoring leading and trailing white space).
     * 4. If JSON syntax, parse the string into an actual `FilterTreeStateObject` using {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse|JSON.parse} and throw an error if unparsable.
     * 5. If not JSON, parse the string as SQL into an actual `FilterTreeStateObject` using parser-SQL's {@link ParserSQL#parser|parser} and throw an error if unparsable.
     *
     * @param {FilterTreeStateObject} [state]
     * @param {FilterTreeSetStateOptionsObject} [options]
     *
     * @returns {FilterTreeStateObject} The unmolested `state` parameter. Throws an error if `state` is unknown or invalid syntax.
     *
     * @memberOf FilterNode#
     * @inner
     */
    parseStateString: function(state, options) {
        if (state) {
            if (typeof state === 'string') {
                var context = options && options.context,
                    syntax = options && options.syntax || 'auto'; // default is 'auto'

                if (context) {
                    state = context.querySelector(state).value;
                }

                if (syntax === 'auto') {
                    syntax = reJSON.test(state) ? 'JSON' : 'SQL';
                }

                switch (syntax) {
                    case 'JSON':
                        try {
                            state = JSON.parse(state);
                        } catch (error) {
                            throw new FilterTreeError('JSON parser: ' + error);
                        }
                        break;
                    case 'SQL':
                        try {
                            state = this.root.ParserSQL.parse(state);
                        } catch (error) {
                            throw new FilterTreeError('SQL WHERE clause parser: ' + error);
                        }
                        break;
                }
            }

            if (typeof state !== 'object') {
                throw new FilterTreeError('Unexpected input state.');
            }
        }

        return state;
    },

    /**
     * Create each standard option from when found on the `options` or `state` objects, respectively; or if not an "own" option, on the `parent` object or from the options schema default (if any)
     * @param state
     * @param options
     */
    mixInStandardOptions: function(state, options) {
        var node = this;

        _(FilterNode.optionsSchema).each(function(optionSchema, key) {
            if (!optionSchema.ignore && (this !== this.root || optionSchema.rootBound)) {
                var option;

                node.dontPersist[key] = // truthy if from `options` or `default`
                    (option = options && options[key]) !== undefined ||
                    (option = state && state[key]) === undefined &&
                    !(optionSchema.own || node.hasOwnProperty(key) && option !== null) &&
                    !(option = node.parent && node.parent[key]) &&
                    (option = optionSchema.default);

                if (option === null) {
                    delete node[key];
                    node.dontPersist[key] = false;
                } else if (option) {
                    if (key === 'schema' && !option.walk) {
                        // attach the `walk` and `find` convenience methods to the `schema` array
                        option.walk = popMenu.walk.bind(option);
                        option.lookup = popMenu.lookup.bind(option, node.root.findOptions);
                    }
                    node[key] = option;
                }
            }
        });
    },

    /**
     * @param options
     */
    mixInNonstandardOptions: function(options) {
        var node = this;

        // copy all remaining options directly to the new instance, overriding prototype members of the same name
        _(options).each(function(value, key) {
            if (!FilterNode.optionsSchema[key]) {
                node[key] = value;
            }
        });
    },

    /** Remove both:
     * * `this` filter node from it's `parent`'s `children` collection; and
     * * `this` filter node's `el`'s container (always a `<li>` element) from its parent element.
     * @memberOf FilterNode#
     */
    remove: function() {
        var avert,
            parent = this.parent;

        if (parent) {
            if (this.eventHandler) {
                this.eventHandler.call(parent, {
                    type: 'delete',
                    preventDefault: function() { avert = true; }
                });
            }
            if (!avert) {
                if (
                    parent.keep || // never "prune" (remove if empty) this particular subexpression
                    parent.children.length > 1 // this node has siblings so will not be empty after this remove
                ) {
                    // proceed with remove
                    this.el.parentNode.remove(); // the parent is always the containing <li> tag
                    parent.children.splice(parent.children.indexOf(this), 1);
                } else {
                    // recurse to prune entire subexpression because it's prune-able and would end up empty (childless)
                    parent.remove();
                }
            }
        }
    },

    /**
     * Work-around for `this.el.querySelector(':scope>' + selector)` because `:scope` not supported in IE11.
     * @param {string} selector
     */
    firstChildOfType: function(selector) {
        var el = this.el.querySelector(selector);
        if (el && el.parentElement !== this.el) {
            el = null;
        }
        return el;
    },

    Error: FilterTreeError,

    templates: new Templates()
});

/** @typedef optionsSchemaObject
 * @summary Standard option schema
 * @desc Standard options are automatically added to nodes. Data sources for standard options include `options`, `state`, `parent` and `default` (in that order). Describes standard options through various properties:
 * @property {boolean} [ignore] - Do not automatically add to nodes (processed elsewhere).
 * @property {boolean} [own] - Do not automatically add from `parent` or `default`.
 * @property {boolean} [rootBound] - Automatically add to root node only.
 * @property {*} [default] - This is the default data source when all other strategies fail.
 */

/**
 * @summary Defines the standard options available to a node.
 * @desc The following properties bear the same names as the node options they define.
 * @type {object}
 * @memberOf FilterNode
 */
FilterNode.optionsSchema = {

    state: { ignore: true },

    cssStylesheetReferenceElement: { ignore: true },

    /** @summary Default column schema for column drop-downs of direct descendant leaf nodes only.
     * @memberOf FilterNode#
     * @type {string[]}
     */
    ownSchema: { own: true },

    /** @summary Column schema for column drop-downs of all descendant nodes. Pertains to leaf nodes only.
     * @memberOf FilterNode#
     * @type {menuItem[]}
     */
    schema: {},

    /** @summary Filter editor for user interface.
     * @desc Name of filter editor used by this and all descendant nodes. Pertains to leaf nodes only.
     * @default 'Default'
     * @memberOf FilterNode#
     * @type {string}
     */
    editor: {},

    /** @summary Event handler for UI events.
     * @desc See *Events* in the {@link http://joneit.github.io/filter-tree/index.html|readme} for more information.
     * @memberOf FilterNode#
     * @type {function}
     */
    eventHandler: {},

    /** @summary Fields data type.
     * @memberOf FilterNode#
     * @type {string}
     */
    type: { own: true },

    /** @summary Undeleteable node.
     * @desc Truthy means don't render a delete button next to the filter editor for this node.
     * @memberOf FilterNode#
     * @type {boolean}
     */
    keep: { own: true },

    /** @summary Override operator list at any node.
     * @desc The default is applied to the root node and any other node without an operator menu.
     * @default {@link Conditionals.defaultOpMenu}.
     * @memberOf FilterNode#
     * @type {menuItem[]}
     */
    opMenu: { default: Conditionals.defaultOpMenu },

    /** @summary Truthy considers op valid only if in menu.
     * @memberOf FilterNode#
     * @type {boolean}
     */
    opMustBeInMenu: {},

    /** @summary Dictionary of operator menus for specific data types.
     * @memberOf FilterNode#
     * @type {object}
     * @desc A hash of type names. Each member thus defined contains a specific operator menu for all descendant leaf nodes that:
     * 1. do not have their own operator menu (`opMenu` property) of their own; and
     * 2. whose columns resolve to that type.
     *
     * The type is determined by (in priority order):
     * 1. the `type` property of the {@link FilterLeaf}; or
     * 2. the `type` property of the element in the nearest node (including the leaf node itself) that has a defined `ownSchema` or `schema` array property with an element having a matching column name.
     */
    typeOpMap: { rootBound: true },

    /** @summary Truthy will sort the column menus.
     * @memberOf FilterNode#
     * @type {boolean}
     */
    sortColumnMenu: {}
};

FilterNode.setWarningClass = function(el, value) {
    if (arguments.length < 2) {
        value = el.value;
    }
    el.classList[value ? 'remove' : 'add']('filter-tree-warning');
    return value;
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

module.exports = FilterNode;

},{"./Conditionals":3,"./Templates":7,"./parser-SQL":9,"./stylesheet":10,"extend-me":13,"object-iterators":14,"pop-menu":16}],6:[function(require,module,exports){
/* eslint-env browser */

// This is the main file, usable as is, such as by /test/index.js.

// For npm: require this file
// For CDN: gulpfile.js browserifies this file with sourcemap to /build/filter-tree.js and uglified without sourcemap to /build/filter-tree.min.js. The CDN is https://joneit.github.io/filter-tree.

'use strict';

var popMenu = require('pop-menu');
var unstrungify = require('unstrungify');

var _ = require('object-iterators');
var FilterNode = require('./FilterNode');
var FilterLeaf = require('./FilterLeaf');
var operators = require('./tree-operators');


var ordinal = 0;

/** @constructor
 * @summary An object that represents the root node or a branch node in a filter tree.
 * @desc A node representing a subexpression in the filter expression. May be thought of as a parenthesized subexpression in algebraic expression syntax. As discussed under {@link FilterNode}, a `FilterTree` instance's child nodes may be either:
 * * Other (nested) `FilterTree` (or subclass thereof) nodes representing subexpressions.
 * * {@link FilterLeaf} (or subclass thereof) terminal nodes representing conditional expressions.
 *
 * The `FilterTree` object also has methods, some of which operate on a specific subtree instance, and some of which recurse through all the subtree's child nodes and all their descendants, _etc._
 *
 * The recursive methods are interesting. They all work similarly, looping through the list of child nodes, recursing when the child node is a nested subtree (which will recurse further when it has its own nested subtrees); and calling the polymorphic method when the child node is a `FilterLeaf` object, which is a terminal node. Such polymorphic methods include `setState()`, `getState()`, `invalid()`, and `test()`.
 *
 * For example, calling `test(dataRow)` on the root tree recurses through any subtrees eventually calling `test(dataRow)` on each of its leaf nodes and concatenating the results together using the subtree's `operator`. The subtree's `test(dataRow)` call then returns the result to it's parent's `test()` call, _etc.,_ eventually bubbling up to the root node's `test(dataRow)` call, which returns the final result to the original caller. This result determines if the given data row passed through the entire filter expression successfully (`true`) and should be displayed, or was blocked somewhere (`false`) and should not be displayed.
 *
 * Note that in practice:
 * 1. `children` may be empty. This represents a an empty subexpression. Normally pointless, empty subexpressions could be pruned. Filter-tree allows them however as harmless placeholders.
 * 1. `operator` may be omitted in which case it defaults to AND.
 * 1. A `false` result from a child node will short-stop an AND operation; a `true` result will short-stop an OR or NOR operation.
 *
 * Additional notes:
 * 1. A `FilterTree` may consist of a single leaf, in which case the concatenation `operator` is not needed and may be left undefined. However, if a second child is added and the operator is still undefined, it will be set to the default (`'op-and'`).
 * 2. The order of the children is undefined as all operators are commutative. For the '`op-or`' operator, evaluation ceases on the first positive result and for efficiency, all simple conditional expressions will be evaluated before any complex subexpressions.
 * 3. A nested `FilterTree` is distinguished (duck-typed) from a leaf node by the presence of a `children` member.
 * 4. Nesting a `FilterTree` containing a single child is valid (albeit pointless).
 *
 * **See also the properties of the superclass:** {@link FilterNode}
 *
 * @property {string} [operator='op-and'] - The operator that concatentates the test results from all the node's `children` (child nodes). Must be one of:
 * * `'op-and'`
 * * `'op-or'`
 * * `'op-nor'`
 *
 * Note that there is only one `operator` per subexpression. If you need to mix operators, create a subordinate subexpression as one of the child nodes.
 *
 * @property {FilterNode[]} children - A list of descendants of this node. As noted, these may be other `FilterTree` (or subclass thereof) nodes; or may be terminal `FilterLeaf` (or subclass thereof) nodes. May be any length including 0 (none; empty).
 *
 * @property {boolean} [keep=false] - Do not automatically prune when last child removed.
 *
 * @property {fieldItem[]} [ownSchema] - Column menu to be used only by leaf nodes that are children (direct descendants) of this node.
 *
 * @property {string} [type='subtree'] - Type of node, for rendering purposes; names the rendering template to use to generate the node's UI representation.
 */
var FilterTree = FilterNode.extend('FilterTree', {

    /**
     * Hash of constructors for objects that extend from {@link FilterLeaf}, which is the `Default` member here.
     *
     * Add additional editors to this object (in the prototype) prior to instantiating a leaf node that refers to it. This object exists in the prototype and additions to it will affect all nodes that don't have their an "own" hash.
     *
     * If you create an "own" hash in your instance be sure to include the default editor, for example: `{ Default: FilterTree.prototype.editors.Default, ... }`. (One way of overriding would be to include such an object in an `editors` member of the options object passed to the constructor on instantiation. This works because all miscellaneous members are simply copied to the new instance. Not to be confused with the standard option `editor` which is a string containing a key from this hash and tells the leaf node what type to use.)
     */
    editors: {
        Default: FilterLeaf
    },

    /**
     * An extension is a hash of prototype overrides (methods, properties) used to extend the default editor.
     * @param {string} [key='Default'] - Nme of the new extension given in `ext` or name of an existing extension in `FilterTree.extensions`. As a constructor, should have an initial capital. If omitted, replaces the default editor (FilterLeaf).
     * @param {object} [ext] An extension hash
     * @param {FilerLeaf} [BaseEditor=this.editors.Default] - Constructor to extend from.
     * @returns {FillterLeaf} A new class extended from `BaseEditor` -- which is initially `FilterLeaf` but may itself have been extended by a call to `.addEditor('Default', extension)`.
     */
    addEditor: function(key, ext, BaseEditor) {
        if (typeof key === 'object') {
            // `key` (string) was omitted
            BaseEditor = ext;
            ext = key;
            key = 'Default';
        }
        BaseEditor = BaseEditor || this.editors.Default;
        ext = ext || FilterTree.extensions[key];
        return (this.editors[key] = BaseEditor.extend(key, ext));
    },

    /**
     * @param {string} key - The name of the existing editor to remove.
     * @memberOf FilterTree#
     */
    removeEditor: function(key) {
        if (key === 'Default') {
            throw 'Cannot remove default editor.';
        }
        delete this.editors[key];
    },

    /**
     *
     * @memberOf FilterTree#
     */
    createView: function() {
        this.el = this.templates.get(
            this.type || 'subtree',
            ++ordinal,
            this.schema[0] && popMenu.formatItem(this.schema[0])
        );

        // Add the expression editors to the "add new" drop-down
        var addNewCtrl = this.firstChildOfType('select');
        if (addNewCtrl) {
            var submenu, optgroup,
                editors = this.editors;

            if (addNewCtrl.length === 1 && this.editors.length === 1) {
                // this editor is the only option besides the null prompt option
                // so make it th eonly item i the drop-down
                submenu = addNewCtrl;
            } else {
                // there are already options and/or multiple editors
                submenu = optgroup = document.createElement('optgroup');
                optgroup.label = 'Conditional Expressions';
            }
            Object.keys(editors).forEach(function(key) {
                var name = editors[key].prototype.name || key;
                submenu.appendChild(new Option(name, key));
            });
            if (optgroup) {
                addNewCtrl.add(optgroup);
            }
            this.el.addEventListener('change', onchange.bind(this));
        }

        this.el.addEventListener('click', onTreeOpClick.bind(this));
    },

    /**
     *
     * @memberOf FilterTree#
     */
    loadState: function(state) {
        this.operator = 'op-and';
        this.children = [];

        if (!state) {
            this.add();
        } else {
            // Validate `state.children` (required)
            if (!(state.children instanceof Array)) {
                throw new this.Error('Expected `children` property to be an array.');
            }

            // Validate `state.operator` (if given)
            if (state.operator) {
                if (!operators[state.operator]) {
                    throw new this.Error('Expected `operator` property to be one of: ' + Object.keys(operators));
                }

                this.operator = state.operator;
            }

            state.children.forEach(this.add.bind(this));
        }
    },

    /**
     *
     * @memberOf FilterTree#
     */
    render: function() {
        var radioButton = this.firstChildOfType('label > input[value=' + this.operator + ']'),
            addFilterLink = this.el.querySelector('.filter-tree-add-conditional');

        if (radioButton) {
            radioButton.checked = true;
            onTreeOpClick.call(this, {
                target: radioButton
            });
        }

        // when multiple filter editors available, simulate click on the new "add conditional" link
        if (addFilterLink && !this.children.length && Object.keys(this.editors).length > 1) {
            this['filter-tree-add-conditional']({
                target: addFilterLink
            });
        }

        // proceed with render
        FilterNode.prototype.render.call(this);
    },

    /**
     * @summary Create a new node as per `state`.
     *
     * @param {object} [options={state:{}}] - May be one of:
     *
     * * an `options` object containing a `state` property
     * * a `state` object (in which case there is no `options` object)
     *
     * In any case, resulting `state` object may be either...
     * * A new subtree (has a `children` property):
     *   Add a new `FilterTree` node.
     * * A new leaf (no `children` property): add a new `FilterLeaf` node:
     *   * If there is an `editor` property:
     *     Add leaf using `this.editors[state.editor]`.
     *   * Otherwise (including the case where `state` is undefined):
     *     Add leaf using `this.editors.Default`.
     *
     * @param {boolean} [options.focus=false] Call invalid() after inserting to focus on first blank control (if any).
     *
     * @returns {FilterNode} The new node.
     *
     * @memberOf FilterTree#
     */
    add: function(options) {
        var Constructor, newNode;

        options = options || {};

        if (!options.state) {
            options = { state: options };
        }

        if (options.state.children) {
            Constructor = this.constructor;
        } else {
            Constructor = this.editors[options.state.editor || 'Default'];
        }

        options.parent = this;
        newNode = new Constructor(options);
        this.children.push(newNode);

        if (options.focus) {
            // focus on blank control a beat after adding it
            setTimeout(function() { newNode.invalid(options); }, 750);
        }

        return newNode;
    },

    /** @typedef {object} FilterTreeValidationOptionsObject
     * @property {boolean} [throw=false] - Throw (do not catch) `FilterTreeError`s.
     * @property {boolean} [alert=false] - Announce error via window.alert() before returning.
     * @property {boolean} [focus=false] - Place the focus on the offending control and give it error color.
     */

    /**
     * @param {FilterTreeValidationOptionsObject} [options]
     * @returns {undefined|FilterTreeError} `undefined` if valid; or the caught `FilterTreeError` if error.
     * @memberOf FilterTree#
     */
    invalid: function(options) {
        options = options || {};

        var result, throwWas;

        throwWas = options.throw;
        options.throw = true;

        try {
            invalid.call(this, options);
        } catch (err) {
            result = err;

            // Throw when unexpected (not a filter tree error)
            if (!(err instanceof this.Error)) {
                throw err;
            }
        }

        options.throw = throwWas;

        // Alter and/or throw when requested
        if (result) {
            if (options.alert) {
                window.alert(result.message || result); // eslint-disable-line no-alert
            }
            if (options.throw) {
                throw result;
            }
        }

        return result;
    },

    /**
     *
     * @param dataRow
     * @returns {boolean}
     * @memberOf FilterTree#
     */
    test: function test(dataRow) {
        var operator = operators[this.operator],
            result = operator.seed,
            noChildrenDefined = true;

        this.children.find(function(child) {
            if (child) {
                noChildrenDefined = false;
                if (child instanceof FilterLeaf) {
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

    /**
     * @returns {number} Number of filters (terminal nodes) defined in this subtree.
     */
    filterCount: function filterCount() {
        var n = 0;

        this.children.forEach(function(child) {
            n += child instanceof FilterLeaf ? 1 : filterCount.call(child);
        });

        return n;
    },

    /** @typedef {object} FilterTreeGetStateOptionsObject
     *
     * @summary Object containing options for producing a state object.
     *
     * @desc State is commonly used for two purposes:
     * 1. To persist the filter state so that it can be reloaded later.
     * 2. To send a query to a database engine.
     *
     * @property {boolean} [syntax='object'] - A case-sensitive string indicating the expected type and format of a state object to be generated from a filter tree. One of:
     * * `'object'` (default) A raw state object produced by walking the tree using `{@link https://www.npmjs.com/package/unstrungify|unstrungify()}`, respecting `JSON.stringify()`'s "{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON()_behavior|toJSON() behavior}," and returning a plain object suitable for resubmitting to {@link FilterNode#setState|setState}. This is an "essential" version of the actual node objects in the tree.
     * * `'JSON'` - A stringified state object produced by walking the tree using `{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON()_behavior|JSON.stringify()}`, returning a JSON string by calling `toJSON` at every node. This is a string representation of the same "essential" object as that produced by the `'object'` option, but "stringified" and therefore suitable for text-based storage media.
     * * `'SQL'` - The subexpression in SQL conditional syntax produced by walking the tree and returning a SQL [search condition expression]{@link https://msdn.microsoft.com/en-us/library/ms173545.aspx}. Suitable for use in the WHERE clause of a SQL `SELECT` statement used to query a database for a filtered result set.
     *
     * @param {number|string} [space] - When `options.syntax === 'JSON'`, forwarded to `JSON.stringify` as the third parameter, `space` (see).
     *
     * NOTE: The SQL syntax result cannot accommodate node meta-data. While meta-data such as `type` typically comes from the column schema, meta-data can be installed directly on a node. Such meta-data will not be part of the resulting SQL expression. For this reason, SQL should not be used to persist filter state but rather its use should be limited to generating a filter query for a remote data server.
     */

    /**
     * @summary Get a representation of filter state.
     * @desc Calling this on the root will get the entire tree's state; calling this on any subtree will get just that subtree's state.
     *
     * Only _essential_ properties will be output:
     *
     * 1. `FilterTree` nodes will output at least 2 properties:
     *    * `operator`
     *    * `children`
     * 2. `FilterLeaf` nodes will output (via {@link FilterLeaf#getState|getState}) at least 3 properties, one property for each item in it's `view`:
     *    * `column`
     *    * `operator`
     *    * `operand`
     * 3. Additional node properties will be output when:
     *    1. When the property was **NOT** externally sourced:
     *       1. Did *not* come from the `options` object on node instantiation.
     *       2. Did *not* come from the options schema `default` object, if any.
     *    2. **AND** at least one of the following is true:
     *       1. When it's an "own" property.
     *       2. When its value differs from it's parent's.
     *       3. When this is the root node.
     *
     * @param {FilterTreeGetStateOptionsObject} [options]
     * @param {object} [options.sqlIdQts] - When `options.syntax === 'SQL'`, forwarded to `conditionals.pushSqlIdQts()`.
     * @returns {object|string} Returns object when `options.syntax === 'object'`; otherwise returns string.
     * @memberOf FilterTree#
     */
    getState: function getState(options) {
        var result = '',
            syntax = options && options.syntax || 'object';

        switch (syntax) {
            case 'object':
                result = unstrungify.call(this);
                break;

            case 'JSON':
                result = JSON.stringify(this, null, options && options.space) || '';
                break;

            case 'SQL':
                var lexeme = operators[this.operator].SQL;

                this.children.forEach(function(child, idx) {
                    var op = idx ? ' ' + lexeme.op + ' ' : '';
                    if (child instanceof FilterLeaf) {
                        result += op + child.getState(options);
                    } else if (child.children.length) {
                        result += op + getState.call(child, options);
                    }
                });

                if (result) {
                    result = lexeme.beg + result + lexeme.end;
                }
                break;

            default:
                throw new this.Error('Unknown syntax option "' + syntax + '"');
        }

        return result;
    },

    toJSON: function toJSON() {
        var self = this,
            state = {
                operator: this.operator,
                children: []
            };

        this.children.forEach(function(child) {
            state.children.push(child instanceof FilterLeaf ? child : toJSON.call(child));
        });

        _(FilterNode.optionsSchema).each(function(optionSchema, key) {
            if (
                self[key] && // there is a standard option on the node which may need to be output
                !self.dontPersist[key] && (
                    optionSchema.own || // output because it's an "own" option (belongs to the node)
                    !self.parent || // output because it's the root node
                    self[key] !== self.parent[key] // output because it differs from its parent's version
                )
            ) {
                state[key] = self[key];
            }
        });

        return state;
    },

    /**
     * @summary Set the case sensitivity of filter tests against data.
     * @desc Case sensitivity pertains to string compares only. This includes untyped columns, columns typed as strings, typed columns containing data that cannot be coerced to type or when the filter expression operand cannot be coerced.
     *
     * NOTE: This is a shared property and affects all filter-tree instances constructed by this code instance.
     * @param {boolean} isSensitive
     * @memberOf Filtertree#.prototype
     */
    set caseSensitiveData(isSensitive) {
        var toString = isSensitive ? toStringCaseSensitive : toStringCaseInsensitive;
        FilterLeaf.setToString(toString);
    }

});

function toStringCaseInsensitive(s) { return (s + '').toUpperCase(); }
function toStringCaseSensitive(s) { return s + ''; }

// Some event handlers bound to FilterTree object

function onchange(evt) { // called in context
    var ctrl = evt.target;
    if (ctrl.parentElement === this.el) {
        if (ctrl.value === 'subexp') {
            this.children.push(new FilterTree({
                parent: this
            }));
        } else {
            this.add({
                state: { editor: ctrl.value },
                focus: true
            });
        }
        ctrl.selectedIndex = 0;
    }
}

function onTreeOpClick(evt) { // called in context
    var ctrl = evt.target;

    if (ctrl.className === 'filter-tree-op-choice') {
        this.operator = ctrl.value;

        // display strike-through
        var radioButtons = this.el.querySelectorAll('label>input.filter-tree-op-choice[name=' + ctrl.name + ']');
        Array.prototype.forEach.call(radioButtons, function(ctrl) {
            ctrl.parentElement.style.textDecoration = ctrl.checked ? 'none' : 'line-through';
        });

        // display operator between filters by adding operator string as a CSS class of this tree
        for (var key in operators) {
            this.el.classList.remove(key);
        }
        this.el.classList.add(this.operator);
    }
}

/**
 * Throws error if invalid expression tree.
 * Caught by {@link FilterTree#invalid|FilterTree.prototype.invalid()}.
 * @param {boolean} [options.focus=false] - Move focus to offending control.
 * @returns {undefined} if valid
 * @private
 */
function invalid(options) { // called in context
    //if (this instanceof FilterTree && !this.children.length) {
    //    throw new this.Error('Empty subexpression (no filters).');
    //}

    this.children.forEach(function(child) {
        if (child instanceof FilterLeaf) {
            child.invalid(options);
        } else if (child.children.length) {
            invalid.call(child, options);
        }
    });
}

FilterTree.extensions = {
    Columns: require('./extensions/columns')
};

// module initialization
FilterTree.prototype.caseSensitiveData = true;  // default is case-sensitive which is more efficient; may be reset at will


module.exports = FilterTree;

},{"./FilterLeaf":4,"./FilterNode":5,"./extensions/columns":8,"./tree-operators":11,"object-iterators":14,"pop-menu":16,"unstrungify":19}],7:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var templex = require('templex');

var templates = require('../html');

var encoders = /\{(\d+)\:encode\}/g;

function Templates() {}
var constructor = Templates.prototype.constructor;
Templates.prototype = templates;
Templates.prototype.constructor = constructor; // restore it
Templates.prototype.get = function(templateName) { // mix it in
    var keys,
        matches = {},
        temp = document.createElement('div'),
        text = this[templateName],
        args = Array.prototype.slice.call(arguments, 1);

    encoders.lastIndex = 0;

    while ((keys = encoders.exec(text))) {
        matches[keys[1]] = true;
    }

    keys = Object.keys(matches);

    if (keys.length) {
        keys.forEach(function(key) {
            temp.textContent = args[key];
            args[key] = temp.innerHTML;
        });
        text = text.replace(encoders, '{$1}');
    }

    temp.innerHTML = templex.apply(this, [text].concat(args));

    // if only one HTMLElement, return it; otherwise entire list of nodes
    return temp.children.length === 1 && temp.childNodes.length === 1
        ? temp.firstChild
        : temp.childNodes;
};

module.exports = Templates;

},{"../html":2,"templex":18}],8:[function(require,module,exports){
'use strict';

var Conditionals = require('../Conditionals');
var FilterLeaf = require('../FilterLeaf');

/**
 * @summary Prototype additions object for extending {@link FilterLeaf}.
 * @desc Resulting object is similar to {@link FilterLeaf} except:
 * 1. The `operand` property names another column rather than contains a literal.
 * 2. Operators are limited to equality, inequalities, and sets (IN/NOT IN). Omitted are the string and pattern scans (BEGINS/NOT BEGINS, ENDS/NOT ENDS, CONTAINS/NOT CONTAINS, and LIKE/NOT LIKE).
 *
 * @extends FilterLeaf
 *
 * @property {string} identifier - Name of column (member of data row object) to compare against this column (member of data row object named by `column`).
 */
var ColumnLeaf = {
    name: 'column = column', // display string for drop-down

    createView: function() {
        // Create the `view` hash and insert the three default elements (`column`, `operator`, `operand`) into `.el`
        FilterLeaf.prototype.createView.call(this);

        // Replace the `operand` element from the `view` hash
        var oldOperand = this.view.operand,
            newOperand = this.view.operand = this.makeElement(this.root.schema, 'column', this.sortColumnMenu);

        // Replace the operand element with the new one. There are no event listeners to worry about.
        this.el.replaceChild(newOperand, oldOperand);
    },

    makeSqlOperand: function() {
        return this.root.conditionals.makeSqlIdentifier(this.operand);
    },

    opMenu: [
        Conditionals.groups.equality,
        Conditionals.groups.inequalities,
        Conditionals.groups.sets
    ],

    q: function(dataRow) {
        return this.valOrFunc(dataRow, this.operand, this.calculator);
    }
};

module.exports = ColumnLeaf;

},{"../Conditionals":3,"../FilterLeaf":4}],9:[function(require,module,exports){
'use strict';

var reOp = /^((=|>=?|<[>=]?)|(NOT )?(LIKE|IN)\b)/i, // match[1]
    reFloat = /^([+-]?(\d+(\.\d*)?|\d*\.\d+)(e[+-]\d+)?)[^\d]?/i,
    reLit = /^'(\d+)'/,
    reLitAnywhere = /'(\d+)'/,
    reIn = /^\((.*?)\)/,
    reBool = /^(AND|OR)\b/i,
    reGroup = /^(NOT ?)?\(/i;

var SQT = '\'';

var defaultIdQts = {
    beg: '"',
    end: '"'
};

function ParserSqlError(message) {
    this.message = message;
}
ParserSqlError.prototype = Object.create(Error.prototype);
ParserSqlError.prototype.name = 'ParserSqlError';

/** @typedef {object} sqlIdQtsObject
 * @desc On a practical level, the useful characters are:
 * * SQL-92 standard: "double quotes"
 * * SQL Server: "double quotes" or \[square brackets\]
 * * mySQL: \`tick marks\`
 * @property {string} beg - The open quote character.
 * @property {string} end - The close quote character.
 */

/**
 * @constructor
 * @summary Structured Query Language (SQL) parser
 * @author Jonathan Eiten <jonathan@openfin.com>
 * @desc This is a subset of SQL conditional expression syntax.
 *
 * @see {@link https://msdn.microsoft.com/en-us/library/ms173545.aspx SQL Search Condition}
 *
 * @param {menuItem[]} [options.schema] - Column schema for column name validation. Throws an error if name fails validation (but see `resolveAliases`). Omit to skip column name validation.
 * @param {boolean} [options.resolveAliases] - Validate column aliases against schema and use the associated column name in the returned expression state object. Requires `options.schema`. Throws error if no such column found.
 * @param {boolean} [options.caseSensitiveColumnNames] - Ignore case while validating column names and aliases.
 * @param {sqlIdQtsObject} [options.sqlIdQts={beg:'"',end:'"'}]
 */
function ParserSQL(options) {
    options = options || {};

    this.schema = options.schema;

    var idQts = options.sqlIdQts || defaultIdQts;
    this.reName = new RegExp('^(' + idQts.beg + '(.+?)' + idQts.end + '|([A-Z_][A-Z_@\\$#]*)\\b)', 'i'); // match[2] || match[3]
}

ParserSQL.prototype = {

    constructor: ParserSQL.prototype.constructor,

    /**
     * @param {string} sql
     * @returns {*}
     * @memberOf module:sqlSearchCondition
     */
    parse: function(sql) {
        var state;

        // reduce all runs of white space to a single space; then trim
        sql = sql.replace(/\s\s+/g, ' ').trim();

        sql = stripLiterals.call(this, sql);
        state = walk.call(this, sql);

        if (!state.children) {
            state = { children: [ state ] };
        }

        return state;
    }
};

function walk(t) {
    var m, name, op, operand, editor, bool, token, tokens = [];
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
                throw new ParserSqlError('Expected ")"');
            }
            token = walk.call(this, t.substr(i, j - 1 - i));
            if (typeof token !== 'object') {
                return token;
            }

            if (not) {
                if (token.operator !== 'op-or') {
                    throw new ParserSqlError('Expected OR in NOT(...) subexpression but found ' + token.operator.substr(3).toUpperCase() + '.');
                }
                token.operator = 'op-nor';
            }

            i = j;
        } else {

            // column:

            m = t.substr(i).match(this.reName);
            if (!m) {
                throw new ParserSqlError('Expected identifier or quoted identifier.');
            }
            name = m[2] || m[3];
            if (!/^[A-Z_]/i.test(t[i])) { i += 2; }
            i += name.length;

            // operator:

            if (t[i] === ' ') { ++i; }
            m = t.substr(i).match(reOp);
            if (!m) {
                throw new ParserSqlError('Expected relational operator.');
            }
            op = m[1].toUpperCase();
            i += op.length;

            // operand:

            editor = undefined;
            if (t[i] === ' ') { ++i; }
            if (m[4] && m[4].toUpperCase() === 'IN') {
                m = t.substr(i).match(reIn);
                if (!m) {
                    throw new ParserSqlError('Expected parenthesized list.');
                }
                operand = m[1];
                i += operand.length + 2;
                while ((m = operand.match(reLitAnywhere))) {
                    operand = operand.replace(reLitAnywhere, this.literals[m[1]]);
                }
            } else if ((m = t.substr(i).match(reLit))) {
                operand = m[1];
                i += operand.length + 2;
                operand = this.literals[operand];
            } else if ((m = t.substr(i).match(reFloat))) {
                operand = m[1];
                i += operand.length;
            } else if ((m = t.substr(i).match(this.reName))) {
                operand = m[2] || m[3];
                i += operand.length;
                editor = 'Columns';
            } else {
                throw new ParserSqlError('Expected number or string literal or column.');
            }

            if (this.schema) {
                name = lookup.call(this, name);

                if (editor) {
                    operand = lookup.call(this, operand);
                }
            }

            token = {
                column: name,
                operator: op,
                operand: operand
            };

            if (editor) {
                token.editor = editor;
            }
        }

        tokens.push(token);

        if (i < t.length) {
            if (t[i] === ' ') { ++i; }
            m = t.substr(i).match(reBool);
            if (!m) {
                throw new ParserSqlError('Expected boolean operator.');
            }
            bool = m[1].toLowerCase();
            i += bool.length;
            bool = 'op-' + bool;
            if (tokens.operator && tokens.operator !== bool) {
                throw new ParserSqlError('Expected same boolean operator throughout subexpression.');
            }
            tokens.operator = bool;
        }

        if (t[i] === ' ') { ++i; }
    }

    return (
        tokens.length === 1 ? tokens[0] : {
            operator: tokens.operator,
            children: tokens
        }
    );
}

function lookup(name) {
    var item = this.schema.lookup(name);

    if (!item) {
        throw new ParserSqlError(this.resolveAliases
            ? 'Expected valid column name.'
            : 'Expected valid column name or alias.'
        );
    }

    return item.name;
}

function stripLiterals(t) {
    var i = 0, j = 0, k;

    this.literals = [];

    while ((j = t.indexOf(SQT, j)) >= 0) {
        k = j;
        do {
            k = t.indexOf(SQT, k + 1);
            if (k < 0) {
                throw new ParserSqlError('Expected ' + SQT + ' (single quote).');
            }
        } while (t[++k] === SQT);
        this.literals.push(t.slice(++j, --k).replace(/''/g, SQT));
        t = t.substr(0, j) + i + t.substr(k);
        j = j + 1 + (i + '').length + 1;
        i++;
    }

    return t;
}

module.exports = ParserSQL;

},{}],10:[function(require,module,exports){
'use strict';

var cssInjector = require('css-injector');

var css; // defined by code inserted by gulpfile between following comments
/* inject:css */
css = '.filter-tree{font-family:sans-serif;font-size:10pt;line-height:1.5em}.filter-tree label{font-weight:400}.filter-tree input[type=checkbox],.filter-tree input[type=radio]{margin-left:3px;margin-right:3px}.filter-tree ol{margin-top:0}.filter-tree>select{float:right;border:1px dotted grey;background-color:transparent;box-shadow:none}.filter-tree-remove-button{display:inline-block;width:15px;height:15px;border-radius:8px;background-color:#e88;font-size:11.5px;color:#fff;text-align:center;line-height:normal;font-style:normal;font-family:sans-serif;margin-right:4px;cursor:pointer}.filter-tree-remove-button:hover{background-color:transparent;color:#e88;font-weight:700;box-shadow:red 0 0 2px inset}.filter-tree-remove-button::before{content:\'\\d7\'}.filter-tree li::after{font-size:70%;font-style:italic;font-weight:700;color:#080}.filter-tree>ol>li:last-child::after{display:none}.op-and>ol,.op-nor>ol,.op-or>ol{padding-left:5px;margin-left:27px}.op-or>ol>li::after{margin-left:2.5em;content:\'— OR —\'}.op-and>ol>li::after{margin-left:2.5em;content:\'— AND —\'}.op-nor>ol>li::after{margin-left:2.5em;content:\'— NOR —\'}.filter-tree-editor>*{font-weight:700}.filter-tree-editor>span{font-size:smaller}.filter-tree-editor>input[type=text]{width:8em;padding:1px 5px 2px}.filter-tree-warning{background-color:#ffc!important;border-color:#edb!important;font-weight:400!important}.filter-tree-error{background-color:#fcc!important;border-color:#c99!important;font-weight:400!important}.filter-tree-default>:enabled{margin:0 .4em;background-color:#ddd;border:1px solid transparent}.filter-tree.filter-tree-type-column-filters>ol>li:not(:last-child){padding-bottom:.75em;border-bottom:3px double #080;margin-bottom:.75em}.filter-tree .footnotes{margin:0 0 6px;font-size:8pt;font-weight:400;line-height:normal;white-space:normal;color:#c00}.filter-tree .footnotes>p{margin:0}.filter-tree .footnotes>ul{margin:-3px 0 0;padding-left:17px;text-index:-6px}.filter-tree .footnotes>ul>li{margin:2px 0}.filter-tree .footnotes .field-name,.filter-tree .footnotes .field-value{font-weight:700;font-style:normal}.filter-tree .footnotes .field-value{font-family:monospace;color:#000;background-color:#ddd;padding:0 5px;margin:0 3px;border-radius:3px}';
/* endinject */

module.exports = cssInjector.bind(this, css, 'filter-tree-base');

},{"css-injector":12}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
'use strict';

var overrider = require('overrider');

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
 * @param {string} [extendedClassName] - This is simply added to the prototype as $$CLASS_NAME. Useful for debugging because all derived constructors appear to have the same name ("Constructor") in the debugger.
 *
 * @param {extendedPrototypeAdditionsObject} [prototypeAdditions] - Object with members to copy to new constructor's prototype.
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
            switch (typeof extendedClassName) {
                case 'object':
                    prototypeAdditions = extendedClassName;
                    extendedClassName = undefined;
                    break;
                case 'string':
                    prototypeAdditions = {};
                    break;
                default:
                    throw 'Single-parameter overload must be either string or object.';
            }
            break;
        case 2:
            if (typeof extendedClassName !== 'string' || typeof prototypeAdditions !== 'object') {
                throw 'Two-parameter overload must be string, object.';
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

    if (extendedClassName) {
        prototype.$$CLASS_NAME = extendedClassName;
    }

    overrider(prototype, prototypeAdditions);

    return Constructor;
}

function Base() {}
Base.prototype = {
    constructor: Base.prototype.constructor,
    get super() {
        return Object.getPrototypeOf(Object.getPrototypeOf(this));
    }
};
Base.extend = extend;
extend.Base = Base;

/** @typedef {function} extendedConstructor
 * @property prototype.super - A reference to the prototype this constructor was extended from.
 * @property [extend] - If `prototypeAdditions.extendable` was truthy, this will be a reference to {@link extend.extend|extend}.
 */

/** @typedef {object} extendedPrototypeAdditionsObject
 * @desc All members are copied to the new object. The following have special meaning.
 * @property {function} [initialize] - Additional constructor code for new object. This method is added to the new constructor's prototype. Gets passed new object as context + same args as constructor itself. Called on instantiation after similar function in all ancestors called with same signature.
 * @property {function} [preInitialize] - Called before the `initialize` cascade. Gets passed new object as context + same args as constructor itself.
 * @property {function} [postInitialize] - Called after the `initialize` cascade. Gets passed new object as context + same args as constructor itself.
 */

/** @summary Call all `initialize` methods found in prototype chain, beginning with the most senior ancestor's first.
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

},{"overrider":15}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
'use strict';

/**
 * Shallow copies members of `overrides` to `object`, handling getters and setters properly.
 *
 * Any number of `overrides` objects may be given and each is copied in turn.
 *
 * @param {object} object - The target object to receive overrides.
 * @param {...object} [overrides] - Object(s) containing members to copy to `object`. (Omitting is a no-op.)
 * @returns {object} `object`
 */
function overrider(object, overrides) {
    var key, descriptor;

    for (var i = 1; i < arguments.length; ++i) {
        overrides = arguments[i];
        if (typeof overrides === 'object') {
            for (key in overrides) {
                if (overrides.hasOwnProperty(key)) {
                    descriptor = Object.getOwnPropertyDescriptor(overrides, key);
                    Object.defineProperty(object, key, descriptor);
                }
            }
        }
    }

    return object;
}

module.exports = overrider;

},{}],16:[function(require,module,exports){
/* eslint-env browser */

'use strict';

var REGEXP_INDIRECTION = /^(\w+)\((\w+)\)$/;  // finds complete pattern a(b) where both a and b are regex "words"

/** @typedef {object} valueItem
 * You should supply both `name` and `alias` (or `header`) but you could omit one or the other and whichever you provide will be used for both.
 * > If you only give the `name` property, you might as well just give a string for {@link menuItem} rather than this object.
 * Only the `name` and `alias` (or `header`) properties are standard. You can invent whatever other properties you need, such as `type` and `hidden`, shown here as suggestions.
 * @property {string} [name=alias || header] - Value of `value` attribute of `<option>...</option>` element.
 * @property {string} [alias=header] - Text of `<option>...</option>` element. In practice, `header` is a synonym for `alias`.
 * @property {string} [header=name] - Text of `<option>...</option>` element. In practice, `header` is a synonym for `alias`.
 * @property {string} [type] One of the keys of `this.converters`. If not one of these (including `undefined`), field values will be tested with a string comparison.
 * @property {boolean} [hidden=false]
 */

/** @typedef {object|menuItem[]} submenuItem
 * @summary Hierarchical array of select list items.
 * @desc Data structure representing the list of `<option>...</option>` and `<optgroup>...</optgroup>` elements that make up a `<select>...</select>` element.
 *
 * > Alternate form: Instead of an object with a `menu` property containing an array, may itself be that array. Both forms have the optional `label` property.
 * @property {string} [label] - Defaults to a generated string of the form "Group n[.m]..." where each decimal position represents a level of the optgroup hierarchy.
 * @property {menuItem[]} submenu
 */

/** @typedef {string|valueItem|submenuItem} menuItem
 * May be one of three possible types that specify either an `<option>....</option>` element or an `<optgroup>....</optgroup>` element as follows:
 * * If a `string`, specifies the text of an `<option>....</option>` element with no `value` attribute. (In the absence of a `value` attribute, the `value` property of the element defaults to the text.)
 * * If shaped like a {@link valueItem} object, specifies both the text and value of an `<option....</option>` element.
 * * If shaped like a {@link submenuItem} object (or its alternate array form), specifies an `<optgroup>....</optgroup>` element.
 */

/**
 * @summary Builds a new menu pre-populated with items and groups.
 * @desc This function creates a new pop-up menu (a.k.a. "drop-down"). This is a `<select>...</select>` element, pre-populated with items (`<option>...</option>` elements) and groups (`<optgroup>...</optgroup>` elements).
 * > Bonus: This function also builds `input type=text` elements.
 * > NOTE: This function generates OPTGROUP elements for subtrees. However, note that HTML5 specifies that OPTGROUP elemnents made not nest! This function generates the markup for them but they are not rendered by most browsers, or not completely. Therefore, for now, do not specify more than one level subtrees. Future versions of HTML may support it. I also plan to add here options to avoid OPTGROUPS entirely either by indenting option text, or by creating alternate DOM nodes using `<li>` instead of `<select>`, or both.
 * @memberOf popMenu
 *
 * @param {Element|string} el - Must be one of (case-sensitive):
 * * text box - an `HTMLInputElement` to use an existing element or `'INPUT'` to create a new one
 * * drop-down - an `HTMLSelectElement` to use an existing element or `'SELECT'` to create a new one
 * * submenu - an `HTMLOptGroupElement` to use an existing element or `'OPTGROUP'` to create a new one (meant for internal use only)
 *
 * @param {menuItem[]} [menu] - Hierarchical list of strings to add as `<option>...</option>` or `<optgroup>....</optgroup>` elements. Omitting creates a text box.
 *
 * @param {null|string} [options.prompt=''] - Adds an initial `<option>...</option>` element to the drop-down with this value in parentheses as its `text`; and empty string as its `value`. Default is empty string, which creates a blank prompt; `null` suppresses prompt altogether.
 *
 * @param {boolean} [options.sort] - Whether to alpha sort or not. If truthy, sorts each optgroup on its `label`; and each select option on its text (its `alias` or `header` if given; or its `name` if not).
 *
 * @param {string[]} [options.blacklist] - Optional list of menu item names to be ignored.
 *
 * @param {number[]} [options.breadcrumbs] - List of option group section numbers (root is section 0). (For internal use.)
 *
 * @param {boolean} [options.append=false] - When `el` is an existing `<select>` Element, giving truthy value adds the new children without first removing existing children.
 *
 * @returns {Element} Either a `<select>` or `<optgroup>` element.
 */
function build(el, menu, options) {
    options = options || {};

    var prompt = options.prompt,
        blacklist = options.blacklist,
        sort = options.sort,
        breadcrumbs = options.breadcrumbs || [],
        path = breadcrumbs.length ? breadcrumbs.join('.') + '.' : '',
        subtreeName = popMenu.subtree,
        groupIndex = 0,
        tagName;

    if (el instanceof Element) {
        tagName = el.tagName;
        if (!options.append) {
            el.innerHTML = ''; // remove all <option> and <optgroup> elements
        }
    } else {
        tagName = el;
        el = document.createElement(tagName);
    }

    if (menu) {
        var add, newOption;
        if (tagName === 'SELECT') {
            add = el.add;
            if (prompt) {
                newOption = new Option(prompt, '');
                newOption.innerHTML += '&hellip;';
                el.add(newOption);
            } else if (prompt !== null) {
                el.add(new Option());
            }
        } else {
            add = el.appendChild;
            el.label = prompt;
        }

        if (sort) {
            menu = menu.slice().sort(itemComparator); // sorted clone
        }

        menu.forEach(function(item) {
            // if item is of form a(b) and there is an function a in options, then item = options.a(b)
            if (options && typeof item === 'string') {
                var indirection = item.match(REGEXP_INDIRECTION);
                if (indirection) {
                    var a = indirection[1],
                        b = indirection[2],
                        f = options[a];
                    if (typeof f === 'function') {
                        item = f(b);
                    } else {
                        throw 'build: Expected options.' + a + ' to be a function.';
                    }
                    if (!item)  {
                        throw 'build: Expected a result from options.' + a + '(' + b + ').';
                    }
                }
            }

            var subtree = item[subtreeName] || item;
            if (subtree instanceof Array) {

                var groupOptions = {
                    breadcrumbs: breadcrumbs.concat(++groupIndex),
                    prompt: item.label || 'Group ' + path + groupIndex,
                    options: sort,
                    blacklist: blacklist
                };

                var optgroup = build('OPTGROUP', subtree, groupOptions);

                if (optgroup.childElementCount) {
                    el.appendChild(optgroup);
                }

            } else if (typeof item !== 'object') {

                if (!(blacklist && blacklist.indexOf(item) >= 0)) {
                    add.call(el, new Option(item));
                }

            } else if (!item.hidden) {

                var name = item.name || item.alias || item.header;
                if (!(blacklist && blacklist.indexOf(name) >= 0)) {
                    add.call(el, new Option(
                        item.alias || item.header || item.name,
                        name
                    ));
                }

            }
        });
    } else {
        el.type = 'text';
    }

    return el;
}

function itemComparator(a, b) {
    a = a.alias || a.header || a.name || a.label || a;
    b = b.alias || b.header || b.name || b.label || b;
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * @summary Recursively searches the context array of `menuItem`s for a named `item`.
 * @memberOf popMenu
 * @this Array
 * @param {object} [options]
 * @param {string} [options.keys=[popMenu.defaultKey]] - Properties to search each menuItem when it is an object.
 * @param {boolean} [options.caseSensitive=false] - Ignore case while searching.
 * @param {string} value - Value to search for.
 * @returns {undefined|menuItem} The found item or `undefined` if not found.
 */
function lookup(options, value) {
    if (arguments.length === 1) {
        value = options;
        options = undefined;
    }

    var shallow, deep, item, prop,
        keys = options && options.keys || [popMenu.defaultKey],
        caseSensitive = options && options.caseSensitive;

    value = toString(value, caseSensitive);

    shallow = this.find(function(item) {
        var subtree = item[popMenu.subtree] || item;

        if (subtree instanceof Array) {
            return (deep = lookup.call(subtree, options, value));
        }

        if (typeof item !== 'object') {
            return toString(item, caseSensitive) === value;
        } else {
            for (var i = 0; i < keys.length; ++i) {
                prop = item[keys[i]];
                if (prop && toString(prop, caseSensitive) === value) {
                    return true;
                }
            }
        }
    });

    item = deep || shallow;

    return item && (item.name ? item : { name: item });
}

function toString(s, caseSensitive) {
    var result = '';
    if (s) {
        result += s; // convert s to string
        if (!caseSensitive) {
            result = result.toUpperCase();
        }
    }
    return result;
}

/**
 * @summary Recursively walks the context array of `menuItem`s and calls `iteratee` on each item therein.
 * @desc `iteratee` is called with each item (terminal node) in the menu tree and a flat 0-based index. Recurses on member with name of `popMenu.subtree`.
 *
 * The node will always be a {@link valueItem} object; when a `string`, it is boxed for you.
 *
 * @memberOf popMenu
 *
 * @this Array
 *
 * @param {function} iteratee - For each item in the menu, `iteratee` is called with:
 * * the `valueItem` (if the item is a primative string, it is wrapped up for you)
 * * a 0-based `ordinal`
 *
 * The `iteratee` return value can be used to replace the item, as follows:
 * * `undefined` - do nothing
 * * `null` - splice out the item; resulting empty submenus are also spliced out (see note)
 * * anything else - replace the item with this value; if value is a subtree (i.e., an array) `iteratee` will then be called to walk it as well (see note)
 *
 * > Note: Returning anything (other than `undefined`) from `iteratee` will (deeply) mutate the original `menu` so you may want to copy it first (deeply, including all levels of array nesting but not the terminal node objects).
 *
 * @returns {number} Number of items (terminal nodes) in the menu tree.
 */
function walk(iteratee, context) {
    var menu = this,
        ordinal = 0,
        subtreeName = popMenu.subtree,
        i, item, subtree, newVal;

    if (context === undefined) {
        context = this;
    }

    for (i = menu.length - 1; i >= 0; --i) {
        item = menu[i];
        subtree = item[subtreeName] || item;

        if (!(subtree instanceof Array)) {
            subtree = undefined;
        }

        if (!subtree) {
            newVal = iteratee.call(context, item.name ? item : { name: item }, ordinal);
            ordinal += 1;

            if (newVal !== undefined) {
                if (newVal === null) {
                    menu.splice(i, 1);
                    ordinal -= 1;
                } else {
                    menu[i] = item = newVal;
                    subtree = item[subtreeName] || item;
                    if (!(subtree instanceof Array)) {
                        subtree = undefined;
                    }
                }
            }
        }

        if (subtree) {
            ordinal += walk.call(subtree, iteratee);
            if (subtree.length === 0) {
                menu.splice(i, 1);
                ordinal -= 1;
            }
        }
    }

    return ordinal;
}

/**
 * @summary Format item name with it's alias when available.
 * @memberOf popMenu
 * @param {string|valueItem} item
 * @returns {string} The formatted name and alias.
 */
function formatItem(item) {
    var name = item.name || item,
        alias = item.alias || item.header;

    return alias ? '"' + alias + '" (' + name + ')' : name;
}


function isGroupProxy(s) {
    return REGEXP_INDIRECTION.test(s);
}

/**
 * @namespace
 */
var popMenu = {
    build: build,
    walk: walk,
    lookup: lookup,
    formatItem: formatItem,
    isGroupProxy: isGroupProxy,
    subtree: 'submenu',
    defaultKey: 'name'
};

module.exports = popMenu;

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
// Created by Jonathan Eiten on 1/7/16.

'use strict';

/**
 * Very fast array test.
 * For cross-frame scripting; use `crossFramesIsArray` instead.
 * @param {*} arr - The object to test.
 * @returns {boolean}
 */
unstrungify.isArray = function(arr) { return arr.constructor === Array; };

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
 * @param {boolean} [options.nullElements==false] - Preserve undefined array elements as `null`s.
 * Use this when precise index matters (not merely the order of the elements).
 *
 * @param {boolean} [options.nullProperties==false] - Preserve undefined object properties as `null`s.
 *
 * @returns {object} - Distilled object.
 */
function unstrungify(options) {
    var clone, preserve,
        object = (typeof this.toJSON === 'function') ? this.toJSON() : this;

    if (unstrungify.isArray(object)) {
        clone = [];
        preserve = options && options.nullElements;
        object.forEach(function(obj) {
            var value = unstrungify.call(obj);
            if (value !== undefined) {
                clone.push(value);
            } else if (preserve) {
                clone.push(null); // undefined not a valid JSON value
            }
        });
    } else  if (typeof object === 'object') {
        clone = {};
        preserve = options && options.nullProperties;
        Object.keys(object).forEach(function(key) {
            var value = object[key];
            if (value !== undefined) {
                value = unstrungify.call(object[key]);
            }
            if (value !== undefined) {
                clone[key] = value;
            } else if (preserve) {
                clone[key] = null; // undefined not a valid JSON value
            }
        });
    } else {
        clone = object;
    }

    return clone;
}

/**
 * Very slow array test. Suitable for cross-frame scripting.
 *
 * Suggestion: If you need this and have jQuery loaded, use `jQuery.isArray` instead which is reasonably fast.
 *
 * @param {*} arr - The object to test.
 * @returns {boolean}
 */
unstrungify.crossFramesIsArray = function(arr) { return toString.call(arr) === arrString; }; // eslint-disable-line no-unused-vars

var toString = Object.prototype.toString, arrString = '[object Array]';

module.exports = unstrungify;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL2Zha2VfNzA1ZTllYjUuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvaHRtbC9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9qcy9Db25kaXRpb25hbHMuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvanMvRmlsdGVyTGVhZi5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9qcy9GaWx0ZXJOb2RlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL2pzL0ZpbHRlclRyZWUuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvanMvVGVtcGxhdGVzLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL2pzL2V4dGVuc2lvbnMvY29sdW1ucy5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9qcy9wYXJzZXItU1FMLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL2pzL3N0eWxlc2hlZXQuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvanMvdHJlZS1vcGVyYXRvcnMuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL2Nzcy1pbmplY3Rvci9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvZXh0ZW5kLW1lL2luZGV4LmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL25vZGVfbW9kdWxlcy9vYmplY3QtaXRlcmF0b3JzL2luZGV4LmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL25vZGVfbW9kdWxlcy9vdmVycmlkZXIvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmlsdGVyLXRyZWUvbm9kZV9tb2R1bGVzL3BvcC1tZW51L2luZGV4LmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbHRlci10cmVlL25vZGVfbW9kdWxlcy9yZWdleHAtbGlrZS9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvdGVtcGxleC9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maWx0ZXItdHJlZS9ub2RlX21vZHVsZXMvdW5zdHJ1bmdpZnkvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdGZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdvYmplY3QtaXRlcmF0b3JzJyk7XG52YXIgcG9wTWVudSA9IHJlcXVpcmUoJ3BvcC1tZW51Jyk7XG5cbnZhciBGaWx0ZXJUcmVlID0gcmVxdWlyZSgnLi9qcy9GaWx0ZXJUcmVlJyk7XG5GaWx0ZXJUcmVlLk5vZGUgPSByZXF1aXJlKCcuL2pzL0ZpbHRlck5vZGUnKTsgLy8gYWthOiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoRmlsdGVyVHJlZS5wcm90b3R5cGUpLmNvbnN0cnVjdG9yXG5GaWx0ZXJUcmVlLkxlYWYgPSByZXF1aXJlKCcuL2pzL0ZpbHRlckxlYWYnKTsgLy8gYWthOiBGaWx0ZXJUcmVlLnByb3RvdHlwZS5lZGl0b3JzLkRlZmF1bHRcblxuLy8gZXhwb3NlIHNvbWUgb2JqZWN0cyBmb3IgcGx1Zy1pbiBhY2Nlc3NcblxuRmlsdGVyVHJlZS5Db25kaXRpb25hbHMgPSByZXF1aXJlKCcuL2pzL0NvbmRpdGlvbmFscycpO1xuXG4vLyBGT0xMT1dJTkcgUFJPUEVSVElFUyBBUkUgKioqIFRFTVBPUkFSWSAqKiosXG4vLyBGT1IgVEhFIERFTU8gVE8gQUNDRVNTIFRIRVNFIE5PREUgTU9EVUxFUy5cblxuRmlsdGVyVHJlZS5fID0gXztcbkZpbHRlclRyZWUucG9wTWVudSA9IHBvcE1lbnU7XG5cblxud2luZG93LkZpbHRlclRyZWUgPSBGaWx0ZXJUcmVlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzWydjb2x1bW4tQ1FMLXN5bnRheCddID0gW1xuJzxsaT4nLFxuJ1x0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjb3B5XCI+PC9idXR0b24+JyxcbidcdDxkaXYgY2xhc3M9XCJmaWx0ZXItdHJlZS1yZW1vdmUtYnV0dG9uXCIgdGl0bGU9XCJkZWxldGUgY29uZGl0aW9uYWxcIj48L2Rpdj4nLFxuJ1x0ezF9OicsXG4nXHQ8aW5wdXQgbmFtZT1cInsyfVwiIGNsYXNzPVwiezR9XCIgdmFsdWU9XCJ7MzplbmNvZGV9XCI+Jyxcbic8L2xpPidcbl0uam9pbignXFxuJyk7XG5cbmV4cG9ydHNbJ2NvbHVtbi1TUUwtc3ludGF4J10gPSBbXG4nPGxpPicsXG4nXHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImNvcHlcIj48L2J1dHRvbj4nLFxuJ1x0PGRpdiBjbGFzcz1cImZpbHRlci10cmVlLXJlbW92ZS1idXR0b25cIiB0aXRsZT1cImRlbGV0ZSBjb25kaXRpb25hbFwiPjwvZGl2PicsXG4nXHR7MX06JyxcbidcdDx0ZXh0YXJlYSBuYW1lPVwiezJ9XCIgcm93cz1cIjFcIiBjbGFzcz1cIns0fVwiPnszOmVuY29kZX08L3RleHRhcmVhPicsXG4nPC9saT4nXG5dLmpvaW4oJ1xcbicpO1xuXG5leHBvcnRzLmNvbHVtbkZpbHRlciA9IFtcbic8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlXCI+JyxcbidcdCA8c3Ryb25nPjxzcGFuPnsyfSA8L3NwYW4+Y29sdW1uIGZpbHRlciBzdWJleHByZXNzaW9uOjwvc3Ryb25nPjxicj4nLFxuJ1x0IE1hdGNoJyxcbidcdCA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwiZmlsdGVyLXRyZWUtb3AtY2hvaWNlXCIgbmFtZT1cInRyZWVPcHsxfVwiIHZhbHVlPVwib3Atb3JcIj5hbnk8L2xhYmVsPicsXG4nXHQgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBjbGFzcz1cImZpbHRlci10cmVlLW9wLWNob2ljZVwiIG5hbWU9XCJ0cmVlT3B7MX1cIiB2YWx1ZT1cIm9wLWFuZFwiPmFsbDwvbGFiZWw+JyxcbidcdCA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwiZmlsdGVyLXRyZWUtb3AtY2hvaWNlXCIgbmFtZT1cInRyZWVPcHsxfVwiIHZhbHVlPVwib3Atbm9yXCI+bm9uZTwvbGFiZWw+JyxcbidcdCBvZiB0aGUgZm9sbG93aW5nOicsXG4nXHQgPHNlbGVjdD4nLFxuJ1x0XHQgPG9wdGlvbiB2YWx1ZT1cIlwiPk5ldyBleHByZXNzaW9uJmhlbGxpcDs8L29wdGlvbj4nLFxuJ1x0IDwvc2VsZWN0PicsXG4nXHQgPG9sPjwvb2w+JyxcbicgPC9zcGFuPidcbl0uam9pbignXFxuJyk7XG5cbmV4cG9ydHMuY29sdW1uRmlsdGVycyA9IFtcbic8c3BhbiBjbGFzcz1cImZpbHRlci10cmVlIGZpbHRlci10cmVlLXR5cGUtY29sdW1uLWZpbHRlcnNcIj4nLFxuJ1x0IE1hdGNoIDxzdHJvbmc+YWxsPC9zdHJvbmc+IG9mIHRoZSBmb2xsb3dpbmcgY29sdW1uIGZpbHRlcnM6JyxcbidcdCA8b2w+PC9vbD4nLFxuJyA8L3NwYW4+J1xuXS5qb2luKCdcXG4nKTtcblxuZXhwb3J0cy5sb2NrZWRDb2x1bW4gPSBbXG4nPHNwYW4+JyxcbidcdCB7MTplbmNvZGV9JyxcbidcdCA8aW5wdXQgdHlwZT1cImhpZGRlblwiIHZhbHVlPVwiezJ9XCI+JyxcbicgPC9zcGFuPidcbl0uam9pbignXFxuJyk7XG5cbmV4cG9ydHMubm90ZSA9IFtcbic8ZGl2IGNsYXNzPVwiZm9vdG5vdGVzXCI+JyxcbidcdDxkaXYgY2xhc3M9XCJmb290bm90ZVwiPjwvZGl2PicsXG4nXHQ8cD5TZWxlY3QgYSBuZXcgdmFsdWUgb3IgZGVsZXRlIHRoZSBleHByZXNzaW9uIGFsdG9nZXRoZXIuPC9wPicsXG4nPC9kaXY+J1xuXS5qb2luKCdcXG4nKTtcblxuZXhwb3J0cy5ub3RlcyA9IFtcbic8ZGl2IGNsYXNzPVwiZm9vdG5vdGVzXCI+JyxcbidcdDxwPk5vdGUgdGhlIGZvbGxvd2luZyBlcnJvciBjb25kaXRpb25zOjwvcD4nLFxuJ1x0PHVsIGNsYXNzPVwiZm9vdG5vdGVcIj48L3VsPicsXG4nXHQ8cD5TZWxlY3QgbmV3IHZhbHVlcyBvciBkZWxldGUgdGhlIGV4cHJlc3Npb24gYWx0b2dldGhlci48L3A+Jyxcbic8L2Rpdj4nXG5dLmpvaW4oJ1xcbicpO1xuXG5leHBvcnRzLm9wdGlvbk1pc3NpbmcgPSBbXG4nVGhlIHJlcXVlc3RlZCB2YWx1ZSBvZiA8c3BhbiBjbGFzcz1cImZpZWxkLW5hbWVcIj57MTplbmNvZGV9PC9zcGFuPicsXG4nKDxzcGFuIGNsYXNzPVwiZmllbGQtdmFsdWVcIj57MjplbmNvZGV9PC9zcGFuPikgaXMgbm90IHZhbGlkLidcbl0uam9pbignXFxuJyk7XG5cbmV4cG9ydHMucmVtb3ZlQnV0dG9uID0gW1xuJzxkaXYgY2xhc3M9XCJmaWx0ZXItdHJlZS1yZW1vdmUtYnV0dG9uXCIgdGl0bGU9XCJkZWxldGUgY29uZGl0aW9uYWxcIj48L2Rpdj4nXG5dLmpvaW4oJ1xcbicpO1xuXG5leHBvcnRzLnN1YnRyZWUgPSBbXG4nPHNwYW4gY2xhc3M9XCJmaWx0ZXItdHJlZVwiPicsXG4nXHQgTWF0Y2gnLFxuJ1x0IDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgY2xhc3M9XCJmaWx0ZXItdHJlZS1vcC1jaG9pY2VcIiBuYW1lPVwidHJlZU9wezF9XCIgdmFsdWU9XCJvcC1vclwiPmFueTwvbGFiZWw+JyxcbidcdCA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwiZmlsdGVyLXRyZWUtb3AtY2hvaWNlXCIgbmFtZT1cInRyZWVPcHsxfVwiIHZhbHVlPVwib3AtYW5kXCI+YWxsPC9sYWJlbD4nLFxuJ1x0IDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgY2xhc3M9XCJmaWx0ZXItdHJlZS1vcC1jaG9pY2VcIiBuYW1lPVwidHJlZU9wezF9XCIgdmFsdWU9XCJvcC1ub3JcIj5ub25lPC9sYWJlbD4nLFxuJ1x0IG9mIHRoZSBmb2xsb3dpbmc6JyxcbidcdCA8c2VsZWN0PicsXG4nXHRcdCA8b3B0aW9uIHZhbHVlPVwiXCI+TmV3IGV4cHJlc3Npb24maGVsbGlwOzwvb3B0aW9uPicsXG4nXHRcdCA8b3B0aW9uIHZhbHVlPVwic3ViZXhwXCIgc3R5bGU9XCJib3JkZXItYm90dG9tOjFweCBzb2xpZCBibGFja1wiPlN1YmV4cHJlc3Npb248L29wdGlvbj4nLFxuJ1x0IDwvc2VsZWN0PicsXG4nXHQgPG9sPjwvb2w+JyxcbicgPC9zcGFuPidcbl0uam9pbignXFxuJyk7XG4iLCIvKiogQG1vZHVsZSBjb25kaXRpb25hbHMgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFzZSA9IHJlcXVpcmUoJ2V4dGVuZC1tZScpLkJhc2U7XG52YXIgXyA9IHJlcXVpcmUoJ29iamVjdC1pdGVyYXRvcnMnKTtcbnZhciByZWdFeHBMSUtFID0gcmVxdWlyZSgncmVnZXhwLWxpa2UnKTtcblxudmFyIElOID0gJ0lOJyxcbiAgICBOT1RfSU4gPSAnTk9UICcgKyBJTixcbiAgICBMSUtFID0gJ0xJS0UnLFxuICAgIE5PVF9MSUtFID0gJ05PVCAnICsgTElLRSxcbiAgICBMSUtFX1dJTERfQ0FSRCA9ICclJyxcbiAgICBOSUwgPSAnJztcblxudmFyIHRvU3RyaW5nO1xuXG52YXIgZGVmYXVsdElkUXRzID0ge1xuICAgIGJlZzogJ1wiJyxcbiAgICBlbmQ6ICdcIidcbn07XG5cblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIENvbmRpdGlvbmFscyA9IEJhc2UuZXh0ZW5kKHtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3NxbElkUXRzT2JqZWN0fSBbb3B0aW9ucy5zcWxJZFF0cz17YmVnOidcIicsZW5kOidcIid9XVxuICAgICAqIEBtZW1iZXJPZiBDb25kaXRpb25hbHMjXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB2YXIgaWRRdHMgPSBvcHRpb25zICYmIG9wdGlvbnMuc3FsSWRRdHM7XG4gICAgICAgIGlmIChpZFF0cykge1xuICAgICAgICAgICAgdGhpcy5zcWxJZFF0cyA9IGlkUXRzOyAvLyBvbmx5IG92ZXJyaWRlIGlmIGRlZmluZWRcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzcWxJZFF0czogZGVmYXVsdElkUXRzLFxuICAgIC8qKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICogQG1lbWJlck9mIENvbmRpdGlvbmFscyNcbiAgICAgKi9cbiAgICBtYWtlU3FsSWRlbnRpZmllcjogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3FsSWRRdHMuYmVnICsgaWQgKyB0aGlzLnNxbElkUXRzLmVuZDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHN0cmluZ1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICogQG1lbWJlck9mIENvbmRpdGlvbmFscyNcbiAgICAgKi9cbiAgICBtYWtlU3FsU3RyaW5nOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuICdcXCcnICsgc3FFc2Moc3RyaW5nKSArICdcXCcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgQ29uZGl0aW9uYWxzI1xuICAgICAqL1xuICAgIG1ha2VMSUtFOiBmdW5jdGlvbihiZWcsIGVuZCwgb3AsIG9yaWdpbmFsT3AsIGMpIHtcbiAgICAgICAgdmFyIGVzY2FwZWQgPSBjLm9wZXJhbmQucmVwbGFjZSgvKFtfXFxbXFxdJV0pL2csICdbJDFdJyk7IC8vIGVzY2FwZSBhbGwgTElLRSByZXNlcnZlZCBjaGFyc1xuICAgICAgICByZXR1cm4gdGhpcy5tYWtlU3FsSWRlbnRpZmllcihjLmNvbHVtbikgK1xuICAgICAgICAgICAgJyAnICsgb3AgK1xuICAgICAgICAgICAgJyAnICsgdGhpcy5tYWtlU3FsU3RyaW5nKGJlZyArIGVzY2FwZWQgKyBlbmQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgQ29uZGl0aW9uYWxzI1xuICAgICAqL1xuICAgIG1ha2VJTjogZnVuY3Rpb24ob3AsIGMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFrZVNxbElkZW50aWZpZXIoYy5jb2x1bW4pICtcbiAgICAgICAgICAgICcgJyArIG9wICtcbiAgICAgICAgICAgICcgJyArICcoXFwnJyArIHNxRXNjKGMub3BlcmFuZCkucmVwbGFjZSgvXFxzKixcXHMqL2csICdcXCcsIFxcJycpICsgJ1xcJyknO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgQ29uZGl0aW9uYWxzI1xuICAgICAqL1xuICAgIG1ha2U6IGZ1bmN0aW9uKG9wLCBjKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1ha2VTcWxJZGVudGlmaWVyKGMuY29sdW1uKSArXG4gICAgICAgICAgICAnICcgKyBvcCArXG4gICAgICAgICAgICAnICcgKyBjLm1ha2VTcWxPcGVyYW5kKCk7XG4gICAgfVxufSk7XG5cbnZhciBvcHMgPSBDb25kaXRpb25hbHMucHJvdG90eXBlLm9wcyA9IHtcbiAgICB1bmRlZmluZWQ6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oKSB7IHJldHVybiB0cnVlOyB9LFxuICAgICAgICBtYWtlOiBmdW5jdGlvbigpIHsgcmV0dXJuICcnOyB9XG4gICAgfSxcblxuICAgIC8qKiBAdHlwZSB7cmVsYXRpb25hbE9wZXJhdG9yfVxuICAgICAqIEBtZW1iZXJPZiBDb25kaXRpb25hbHMjXG4gICAgICovXG4gICAgJzwnOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPCBiOyB9LFxuICAgICAgICBtYWtlOiBmdW5jdGlvbihjKSB7IHJldHVybiB0aGlzLm1ha2UoJzwnLCBjKTsgfVxuICAgIH0sXG4gICAgLyoqIEB0eXBlIHtyZWxhdGlvbmFsT3BlcmF0b3J9XG4gICAgICogQG1lbWJlck9mIENvbmRpdGlvbmFscyNcbiAgICAgKi9cbiAgICAnPD0nOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPD0gYjsgfSxcbiAgICAgICAgbWFrZTogZnVuY3Rpb24oYykgeyByZXR1cm4gdGhpcy5tYWtlKCc8PScsIGMpOyB9XG4gICAgfSxcblxuICAgIC8qKiBAdHlwZSB7cmVsYXRpb25hbE9wZXJhdG9yfVxuICAgICAqIEBtZW1iZXJPZiBDb25kaXRpb25hbHMjXG4gICAgICovXG4gICAgJz0nOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPT09IGI7IH0sXG4gICAgICAgIG1ha2U6IGZ1bmN0aW9uKGMpIHsgcmV0dXJuIHRoaXMubWFrZSgnPScsIGMpOyB9XG4gICAgfSxcblxuICAgIC8qKiBAdHlwZSB7cmVsYXRpb25hbE9wZXJhdG9yfVxuICAgICAqIEBtZW1iZXJPZiBDb25kaXRpb25hbHMjXG4gICAgICovXG4gICAgJz49Jzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhID49IGI7IH0sXG4gICAgICAgIG1ha2U6IGZ1bmN0aW9uKGMpIHsgcmV0dXJuIHRoaXMubWFrZSgnPj0nLCBjKTsgfVxuICAgIH0sXG5cbiAgICAvKiogQHR5cGUge3JlbGF0aW9uYWxPcGVyYXRvcn1cbiAgICAgKiBAbWVtYmVyT2YgQ29uZGl0aW9uYWxzI1xuICAgICAqL1xuICAgICc+Jzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhID4gYjsgfSxcbiAgICAgICAgbWFrZTogZnVuY3Rpb24oYykgeyByZXR1cm4gdGhpcy5tYWtlKCc+JywgYyk7IH1cbiAgICB9LFxuXG4gICAgLyoqIEB0eXBlIHtyZWxhdGlvbmFsT3BlcmF0b3J9XG4gICAgICogQG1lbWJlck9mIENvbmRpdGlvbmFscyNcbiAgICAgKi9cbiAgICAnPD4nOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgIT09IGI7IH0sXG4gICAgICAgIG1ha2U6IGZ1bmN0aW9uKGMpIHsgcmV0dXJuIHRoaXMubWFrZSgnPD4nLCBjKTsgfVxuICAgIH0sXG5cbiAgICAvKiogQHR5cGUge3JlbGF0aW9uYWxPcGVyYXRvcn1cbiAgICAgKiBAbWVtYmVyT2YgQ29uZGl0aW9uYWxzI1xuICAgICAqL1xuICAgIExJS0U6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gcmVnRXhwTElLRS5jYWNoZWQoYiwgdHJ1ZSkudGVzdChhKTsgfSxcbiAgICAgICAgbWFrZTogZnVuY3Rpb24oYykgeyByZXR1cm4gdGhpcy5tYWtlKExJS0UsIGMpOyB9LFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG5cbiAgICAvKiogQHR5cGUge3JlbGF0aW9uYWxPcGVyYXRvcn1cbiAgICAgKiBAbWVtYmVyT2YgQ29uZGl0aW9uYWxzI1xuICAgICAqL1xuICAgICdOT1QgTElLRSc6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gIXJlZ0V4cExJS0UuY2FjaGVkKGIsIHRydWUpLnRlc3QoYSk7IH0sXG4gICAgICAgIG1ha2U6IGZ1bmN0aW9uKGMpIHsgcmV0dXJuIHRoaXMubWFrZShOT1RfTElLRSwgYyk7IH0sXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfSxcblxuICAgIC8qKiBAdHlwZSB7cmVsYXRpb25hbE9wZXJhdG9yfVxuICAgICAqIEBtZW1iZXJPZiBDb25kaXRpb25hbHMjXG4gICAgICovXG4gICAgSU46IHsgLy8gVE9ETzogY3VycmVudGx5IGZvcmNpbmcgc3RyaW5nIHR5cGluZzsgcmV3b3JrIGNhbGxpbmcgY29kZSB0byByZXNwZWN0IGNvbHVtbiB0eXBlXG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGluT3AoYSwgYikgPj0gMDsgfSxcbiAgICAgICAgbWFrZTogZnVuY3Rpb24oYykgeyByZXR1cm4gdGhpcy5tYWtlSU4oSU4sIGMpOyB9LFxuICAgICAgICBvcGVyYW5kTGlzdDogdHJ1ZSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuXG4gICAgLyoqIEB0eXBlIHtyZWxhdGlvbmFsT3BlcmF0b3J9XG4gICAgICogQG1lbWJlck9mIENvbmRpdGlvbmFscyNcbiAgICAgKi9cbiAgICAnTk9UIElOJzogeyAvLyBUT0RPOiBjdXJyZW50bHkgZm9yY2luZyBzdHJpbmcgdHlwaW5nOyByZXdvcmsgY2FsbGluZyBjb2RlIHRvIHJlc3BlY3QgY29sdW1uIHR5cGVcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gaW5PcChhLCBiKSA8IDA7IH0sXG4gICAgICAgIG1ha2U6IGZ1bmN0aW9uKGMpIHsgcmV0dXJuIHRoaXMubWFrZUlOKE5PVF9JTiwgYyk7IH0sXG4gICAgICAgIG9wZXJhbmRMaXN0OiB0cnVlLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG5cbiAgICAvKiogQHR5cGUge3JlbGF0aW9uYWxPcGVyYXRvcn1cbiAgICAgKiBAbWVtYmVyT2YgQ29uZGl0aW9uYWxzI1xuICAgICAqL1xuICAgIENPTlRBSU5TOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGNvbnRhaW5zT3AoYSwgYikgPj0gMDsgfSxcbiAgICAgICAgbWFrZTogZnVuY3Rpb24oYykgeyByZXR1cm4gdGhpcy5tYWtlTElLRShMSUtFX1dJTERfQ0FSRCwgTElLRV9XSUxEX0NBUkQsIExJS0UsICdDT05UQUlOUycsIGMpOyB9LFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG5cbiAgICAvKiogQHR5cGUge3JlbGF0aW9uYWxPcGVyYXRvcn1cbiAgICAgKiBAbWVtYmVyT2YgQ29uZGl0aW9uYWxzI1xuICAgICAqL1xuICAgICdOT1QgQ09OVEFJTlMnOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGNvbnRhaW5zT3AoYSwgYikgPCAwOyB9LFxuICAgICAgICBtYWtlOiBmdW5jdGlvbihjKSB7IHJldHVybiB0aGlzLm1ha2VMSUtFKExJS0VfV0lMRF9DQVJELCBMSUtFX1dJTERfQ0FSRCwgTk9UX0xJS0UsICdOT1QgQ09OVEFJTlMnLCBjKTsgfSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuXG4gICAgLyoqIEB0eXBlIHtyZWxhdGlvbmFsT3BlcmF0b3J9XG4gICAgICogQG1lbWJlck9mIENvbmRpdGlvbmFscyNcbiAgICAgKi9cbiAgICBCRUdJTlM6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyBiID0gdG9TdHJpbmcoYik7IHJldHVybiBiZWdpbnNPcChhLCBiLmxlbmd0aCkgPT09IGI7IH0sXG4gICAgICAgIG1ha2U6IGZ1bmN0aW9uKGMpIHsgcmV0dXJuIHRoaXMubWFrZUxJS0UoTklMLCBMSUtFX1dJTERfQ0FSRCwgTElLRSwgJ0JFR0lOUycsIGMpOyB9LFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG5cbiAgICAvKiogQHR5cGUge3JlbGF0aW9uYWxPcGVyYXRvcn1cbiAgICAgKiBAbWVtYmVyT2YgQ29uZGl0aW9uYWxzI1xuICAgICAqL1xuICAgICdOT1QgQkVHSU5TJzoge1xuICAgICAgICB0ZXN0OiBmdW5jdGlvbihhLCBiKSB7IGIgPSB0b1N0cmluZyhiKTsgcmV0dXJuIGJlZ2luc09wKGEsIGIubGVuZ3RoKSAhPT0gYjsgfSxcbiAgICAgICAgbWFrZTogZnVuY3Rpb24oYykgeyByZXR1cm4gdGhpcy5tYWtlTElLRShOSUwsIExJS0VfV0lMRF9DQVJELCBOT1RfTElLRSwgJ05PVCBCRUdJTlMnLCBjKTsgfSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuXG4gICAgLyoqIEB0eXBlIHtyZWxhdGlvbmFsT3BlcmF0b3J9XG4gICAgICogQG1lbWJlck9mIENvbmRpdGlvbmFscyNcbiAgICAgKi9cbiAgICBFTkRTOiB7XG4gICAgICAgIHRlc3Q6IGZ1bmN0aW9uKGEsIGIpIHsgYiA9IHRvU3RyaW5nKGIpOyByZXR1cm4gZW5kc09wKGEsIGIubGVuZ3RoKSA9PT0gYjsgfSxcbiAgICAgICAgbWFrZTogZnVuY3Rpb24oYykgeyByZXR1cm4gdGhpcy5tYWtlTElLRShMSUtFX1dJTERfQ0FSRCwgTklMLCBMSUtFLCAnRU5EUycsIGMpOyB9LFxuICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgIH0sXG5cbiAgICAvKiogQHR5cGUge3JlbGF0aW9uYWxPcGVyYXRvcn1cbiAgICAgKiBAbWVtYmVyT2YgQ29uZGl0aW9uYWxzI1xuICAgICAqL1xuICAgICdOT1QgRU5EUyc6IHtcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oYSwgYikgeyBiID0gdG9TdHJpbmcoYik7IHJldHVybiBlbmRzT3AoYSwgYi5sZW5ndGgpICE9PSBiOyB9LFxuICAgICAgICBtYWtlOiBmdW5jdGlvbihjKSB7IHJldHVybiB0aGlzLm1ha2VMSUtFKExJS0VfV0lMRF9DQVJELCBOSUwsIE5PVF9MSUtFLCAnTk9UIEVORFMnLCBjKTsgfSxcbiAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9XG59O1xuXG4vLyBzb21lIHN5bm9ueW1zXG5vcHNbJ1xcdTIyNjQnXSA9IG9wc1snPD0nXTsgIC8vIFVOSUNPREUgJ0xFU1MtVEhBTiBPUiBFUVVBTCBUTydcbm9wc1snXFx1MjI2NSddID0gb3BzWyc+PSddOyAgLy8gVU5JQ09ERSAnR1JFQVRFUi1USEFOIE9SIEVRVUFMIFRPJ1xub3BzWydcXHUyMjYwJ10gPSBvcHNbJzw+J107ICAvLyBVTklDT0RFICdOT1QgRVFVQUwgVE8nXG5cbmZ1bmN0aW9uIGluT3AoYSwgYikge1xuICAgIHJldHVybiBiXG4gICAgICAgIC50cmltKCkgLy8gcmVtb3ZlIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNwYWNlIGNoYXJzXG4gICAgICAgIC5yZXBsYWNlKC9cXHMqLFxccyovZywgJywnKSAvLyByZW1vdmUgYW55IHdoaXRlLXNwYWNlIGNoYXJzIGZyb20gYXJvdW5kIGNvbW1hc1xuICAgICAgICAuc3BsaXQoJywnKSAvLyBwdXQgaW4gYW4gYXJyYXlcbiAgICAgICAgLmluZGV4T2YoKGEgKyAnJykpOyAvLyBzZWFyY2ggYXJyYXkgd2hvbGUgbWF0Y2hlc1xufVxuXG5mdW5jdGlvbiBjb250YWluc09wKGEsIGIpIHtcbiAgICByZXR1cm4gdG9TdHJpbmcoYSkuaW5kZXhPZih0b1N0cmluZyhiKSk7XG59XG5cbmZ1bmN0aW9uIGJlZ2luc09wKGEsIGxlbmd0aCkge1xuICAgIHJldHVybiB0b1N0cmluZyhhKS5zdWJzdHIoMCwgbGVuZ3RoKTtcbn1cblxuZnVuY3Rpb24gZW5kc09wKGEsIGxlbmd0aCkge1xuICAgIHJldHVybiB0b1N0cmluZyhhKS5zdWJzdHIoLWxlbmd0aCwgbGVuZ3RoKTtcbn1cblxuZnVuY3Rpb24gc3FFc2Moc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC8nL2csICdcXCdcXCcnKTtcbn1cblxudmFyIGdyb3VwcyA9IHtcbiAgICBlcXVhbGl0eToge1xuICAgICAgICBsYWJlbDogJ0VxdWFsaXR5JyxcbiAgICAgICAgc3VibWVudTogWyc9J11cbiAgICB9LFxuICAgIGluZXF1YWxpdGllczoge1xuICAgICAgICBsYWJlbDogJ0luZXF1YWxpdGllcycsXG4gICAgICAgIHN1Ym1lbnU6IFtcbiAgICAgICAgICAgICc8JyxcbiAgICAgICAgICAgICdcXHUyMjY0JywgLy8gVU5JQ09ERSAnTEVTUy1USEFOIE9SIEVRVUFMIFRPJzsgb24gYSBNYWMsIHR5cGUgb3B0aW9uLWNvbW1hICjiiaQpXG4gICAgICAgICAgICAnXFx1MjI2MCcsIC8vIFVOSUNPREUgJ05PVCBFUVVBTFMnOyBvbiBhIE1hYywgdHlwZSBvcHRpb24tZXF1YWxzICjiiaApXG4gICAgICAgICAgICAnXFx1MjI2NScsIC8vIFVOSUNPREUgJ0dSRUFURVItVEhBTiBPUiBFUVVBTCBUTyc7IG9uIGEgTWFjLCB0eXBlIG9wdGlvbi1wZXJpb2QgKOKJpSlcbiAgICAgICAgICAgICc+J1xuICAgICAgICBdXG4gICAgfSxcbiAgICBzZXRzOiB7XG4gICAgICAgIGxhYmVsOiAnU2V0IHNjYW5zJyxcbiAgICAgICAgc3VibWVudTogWydJTicsICdOT1QgSU4nXVxuICAgIH0sXG4gICAgc3RyaW5nczoge1xuICAgICAgICBsYWJlbDogJ1N0cmluZyBzY2FucycsXG4gICAgICAgIHN1Ym1lbnU6IFtcbiAgICAgICAgICAgICdDT05UQUlOUycsICdOT1QgQ09OVEFJTlMnLFxuICAgICAgICAgICAgJ0JFR0lOUycsICdOT1QgQkVHSU5TJyxcbiAgICAgICAgICAgICdFTkRTJywgJ05PVCBFTkRTJ1xuICAgICAgICBdXG4gICAgfSxcbiAgICBwYXR0ZXJuczoge1xuICAgICAgICBsYWJlbDogJ1BhdHRlcm4gc2NhbnMnLFxuICAgICAgICBzdWJtZW51OiBbJ0xJS0UnLCAnTk9UIExJS0UnXVxuICAgIH1cbn07XG5cbi8vIGFkZCBhIGBuYW1lYCBwcm9wIHRvIGVhY2ggZ3JvdXBcbl8oZ3JvdXBzKS5lYWNoKGZ1bmN0aW9uKGdyb3VwLCBrZXkpIHsgZ3JvdXAubmFtZSA9IGtleTsgfSk7XG5cbi8qKlxuICogQG1lbWJlck9mIENvbmRpdGlvbmFsc1xuICovXG5Db25kaXRpb25hbHMuZ3JvdXBzID0gZ3JvdXBzO1xuXG4vKiogRGVmYXVsdCBvcGVyYXRvciBtZW51IHdoZW4gY29uc2lzdGluZyBvZiBhbGwgb2YgdGhlIGdyb3VwcyBpbiB7QGxpbmsgbW9kdWxlOmNvbmRpdGlvbmFscy5ncm91cHN8Z3JvdXBzfS4gVGhpcyBtZW51IGlzIHVzZWQgd2hlbiBub25lIG9mIHRoZSBmb2xsb3dpbmcgaXMgb3RoZXJ3aXNlIGRlZmluZWQ6XG4gKiAqIFRoZSBgb3BNZW51YCBwcm9wZXJ0eSBvZiB0aGUgY29sdW1uIHNjaGVtYS5cbiAqICogVGhlIGVudHJ5IGluIHRoZSBub2RlJ3MgYHR5cGVPcE1hcGAgaGFzaCBjb3JyZXNwb25kaW5nIHRvIHRoZSBgdHlwZWAgcHJvcGVydHkgb2YgdGhlIGNvbHVtbiBzY2hlbWEuXG4gKiAqIFRoZSBub2RlJ3MgYHRyZWVPcE1lbnVgIG9iamVjdC5cbiAqIEB0eXBlIHttZW51SXRlbVtdfVxuICogQG1lbWJlck9mIENvbmRpdGlvbmFsc1xuICovXG5Db25kaXRpb25hbHMuZGVmYXVsdE9wTWVudSA9IFsgLy8gaGllcmFyY2hpY2FsIG1lbnUgb2YgcmVsYXRpb25hbCBvcGVyYXRvcnNcbiAgICBncm91cHMuZXF1YWxpdHksXG4gICAgZ3JvdXBzLmluZXF1YWxpdGllcyxcbiAgICBncm91cHMuc2V0cyxcbiAgICBncm91cHMuc3RyaW5ncyxcbiAgICBncm91cHMucGF0dGVybnNcbl07XG5cblxuLy8gTWVhbnQgdG8gYmUgY2FsbGVkIGJ5IEZpbHRlclRyZWUucHJvdG90eXBlLnNldFNlbnNpdGl2aXR5IG9ubHlcbkNvbmRpdGlvbmFscy5zZXRUb1N0cmluZyA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuICh0b1N0cmluZyA9IGZuKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29uZGl0aW9uYWxzO1xuIiwiLyogZXNsaW50LWVudiBicm93c2VyICovXG4vKiBlc2xpbnQtZGlzYWJsZSBrZXktc3BhY2luZyAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBwb3BNZW51ID0gcmVxdWlyZSgncG9wLW1lbnUnKTtcblxudmFyIEZpbHRlck5vZGUgPSByZXF1aXJlKCcuL0ZpbHRlck5vZGUnKTtcbnZhciBDb25kaXRpb25hbHMgPSByZXF1aXJlKCcuL0NvbmRpdGlvbmFscycpO1xuXG5cbnZhciB0b1N0cmluZzsgLy8gc2V0IGJ5IEZpbHRlckxlYWYuc2V0VG9TdHJpbmcoKSBjYWxsZWQgZnJvbSAuLi9pbmRleC5qc1xuXG5cbi8qKiBAdHlwZWRlZiB7b2JqZWN0fSBjb252ZXJ0ZXJcbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb259IHRvVHlwZSAtIFJldHVybnMgaW5wdXQgdmFsdWUgY29udmVydGVkIHRvIHR5cGUuIEZhaWxzIHNpbGVudGx5LlxuICogQHByb3BlcnR5IHtmdW5jdGlvbn0gZmFpbGVkIC0gVGVzdHMgaW5wdXQgdmFsdWUgYWdhaW5zdCB0eXBlLCByZXR1cm5pbmcgYGZhbHNlIGlmIHR5cGUgb3IgYHRydWVgIGlmIG5vdCB0eXBlLlxuICovXG5cbi8qKiBAdHlwZSB7Y29udmVydGVyfSAqL1xudmFyIG51bWJlckNvbnZlcnRlciA9IHtcbiAgICB0b1R5cGU6IE51bWJlcixcbiAgICBmYWlsZWQ6IGlzTmFOXG59O1xuXG4vKiogQHR5cGUge2NvbnZlcnRlcn0gKi9cbnZhciBkYXRlQ29udmVydGVyID0ge1xuICAgIHRvVHlwZTogZnVuY3Rpb24ocykgeyByZXR1cm4gbmV3IERhdGUocyk7IH0sXG4gICAgZmFpbGVkOiBpc05hTlxufTtcblxuLyoqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBmaWx0ZXJMZWFmVmlld09iamVjdFxuICpcbiAqIEBwcm9wZXJ0eSB7SFRNTEVsZW1lbnR9IGNvbHVtbiAtIEEgZHJvcC1kb3duIHdpdGggb3B0aW9ucyBmcm9tIHRoZSBgRmlsdGVyTGVhZmAgaW5zdGFuY2UncyBzY2hlbWEuIFZhbHVlIGlzIHRoZSBuYW1lIG9mIHRoZSBjb2x1bW4gYmVpbmcgdGVzdGVkIChpLmUuLCB0aGUgY29sdW1uIHRvIHdoaWNoIHRoaXMgY29uZGl0aW9uYWwgZXhwcmVzc2lvbiBhcHBsaWVzKS5cbiAqXG4gKiBAcHJvcGVydHkgb3BlcmF0b3IgLSBBIGRyb3AtZG93biB3aXRoIG9wdGlvbnMgZnJvbSB7QGxpbmsgY29sdW1uT3BNZW51fSwge0BsaW5rIHR5cGVPcE1hcH0sIG9yIHtAbGluayB0cmVlT3BNZW51fS4gVmFsdWUgaXMgdGhlIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgb3BlcmF0b3IuXG4gKlxuICogQHByb3BlcnR5IG9wZXJhbmQgLSBBbiBpbnB1dCBlbGVtZW50LCBzdWNoIGFzIGEgZHJvcC1kb3duIG9yIGEgdGV4dCBib3guXG4gKi9cblxuLyoqIEBjb25zdHJ1Y3RvclxuICogQHN1bW1hcnkgQW4gb2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gbm9kZSBpbiBhIGZpbHRlciB0cmVlLlxuICogQGRlc2MgVGhpcyBvYmplY3QgcmVwcmVzZW50cyBhIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24uIEl0IGlzIGFsd2F5cyBhIHRlcm1pbmFsIG5vZGUgaW4gdGhlIGZpbHRlciB0cmVlOyBpdCBoYXMgbm8gY2hpbGQgbm9kZXMgb2YgaXRzIG93bi5cbiAqXG4gKiBBIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gaXMgYSBzaW1wbGUgZHlhZGljIGV4cHJlc3Npb24gd2l0aCB0aGUgZm9sbG93aW5nIHN5bnRheCBpbiB0aGUgVUk6XG4gKlxuICogPiBfY29sdW1uIG9wZXJhdG9yIG9wZXJhbmRfXG4gKlxuICogd2hlcmU6XG4gKiAqIF9jb2x1bW5fIGlzIHRoZSBuYW1lIG9mIGEgY29sdW1uIGZyb20gdGhlIGRhdGEgcm93IG9iamVjdFxuICogKiBfb3BlcmF0b3JfIGlzIHRoZSBuYW1lIG9mIGFuIG9wZXJhdG9yIGZyb20gdGhlIG5vZGUncyBvcGVyYXRvciBsaXN0XG4gKiAqIF9vcGVyYW5kXyBpcyBhIGxpdGVyYWwgdmFsdWUgdG8gY29tcGFyZSBhZ2FpbnN0IHRoZSB2YWx1ZSBpbiB0aGUgbmFtZWQgY29sdW1uXG4gKlxuICogKipOT1RFOioqIFRoZSB7QGxpbmsgQ29sdW1uTGVhZn0gZXh0ZW5zaW9uIG9mIHRoaXMgb2JqZWN0IGhhcyBhIGRpZmZlcmVudCBpbXBsZW1lbnRhdGlvbiBvZiBfb3BlcmFuZF8gd2hpY2ggaXM6IFRoZSBuYW1lIG9mIGEgY29sdW1uIGZyb20gd2hpY2ggdG8gZmV0Y2ggdGhlIGNvbXBhcmUgdmFsdWUgKGZyb20gdGhlIHNhbWUgZGF0YSByb3cgb2JqZWN0KSB0byBjb21wYXJlIGFnYWluc3QgdGhlIHZhbHVlIGluIHRoZSBuYW1lZCBjb2x1bW4uIFNlZSAqRXh0ZW5kaW5nIHRoZSBjb25kaXRpb25hbCBleHByZXNzaW9uIG9iamVjdCogaW4gdGhlIHtAbGluayBodHRwOi8vam9uZWl0LmdpdGh1Yi5pby9maWx0ZXItdHJlZS9pbmRleC5odG1sfHJlYWRtZX0uXG4gKlxuICogVGhlIHZhbHVlcyBvZiB0aGUgdGVybXMgb2YgdGhlIGV4cHJlc3Npb24gYWJvdmUgYXJlIHN0b3JlZCBpbiB0aGUgZmlyc3QgdGhyZWUgcHJvcGVydGllcyBiZWxvdy4gRWFjaCBvZiB0aGVzZSB0aHJlZSBwcm9wZXJ0aWVzIGlzIHNldCBlaXRoZXIgYnkgYHNldFN0YXRlKClgIG9yIGJ5IHRoZSB1c2VyIHZpYSBhIGNvbnRyb2wgaW4gYGVsYC4gTm90ZSB0aGF0IHRoZXNlIHByb3BlcnRpZXMgYXJlIG5vdCBkeW5hbWljYWxseSBib3VuZCB0byB0aGUgVUkgY29udHJvbHM7IHRoZXkgYXJlIHVwZGF0ZWQgYnkgdGhlIHZhbGlkYXRpb24gZnVuY3Rpb24sIGBpbnZhbGlkKClgLlxuICpcbiAqICoqU2VlIGFsc28gdGhlIHByb3BlcnRpZXMgb2YgdGhlIHN1cGVyY2xhc3M6Kioge0BsaW5rIEZpbHRlck5vZGV9XG4gKlxuICogQHByb3BlcnR5IHtzdHJpbmd9IGNvbHVtbiAtIE5hbWUgb2YgdGhlIG1lbWJlciBpbiB0aGUgZGF0YSByb3cgb2JqZWN0cyBhZ2FpbnN0IHdoaWNoIGBvcGVyYW5kYCB3aWxsIGJlIGNvbXBhcmVkLiBSZWZsZWN0cyB0aGUgdmFsdWUgb2YgdGhlIGB2aWV3LmNvbHVtbmAgY29udHJvbCBhZnRlciB2YWxpZGF0aW9uLlxuICpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBvcGVyYXRvciAtIE9wZXJhdG9yIHN5bWJvbC4gVGhpcyBtdXN0IG1hdGNoIGEga2V5IGluIHRoZSBgdGhpcy5yb290LmNvbmRpdGlvbmFscy5vcHNgIGhhc2guIFJlZmxlY3RzIHRoZSB2YWx1ZSBvZiB0aGUgYHZpZXcub3BlcmF0b3JgIGNvbnRyb2wgYWZ0ZXIgdmFsaWRhdGlvbi5cbiAqXG4gKiBAcHJvcGVydHkge3N0cmluZ30gb3BlcmFuZCAtIFZhbHVlIHRvIGNvbXBhcmUgYWdhaW5zdCB0aGUgdGhlIG1lbWJlciBvZiBkYXRhIHJvdyBuYW1lZCBieSBgY29sdW1uYC4gUmVmbGVjdHMgdGhlIHZhbHVlIG9mIHRoZSBgdmlldy5vcGVyYW5kYCBjb250cm9sLCBhZnRlciB2YWxpZGF0aW9uLlxuICpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBuYW1lIC0gVXNlZCB0byBkZXNjcmliZSB0aGUgb2JqZWN0IGluIHRoZSBVSSBzbyB1c2VyIGNhbiBzZWxlY3QgYW4gZXhwcmVzc2lvbiBlZGl0b3IuXG4gKlxuICogQHByb3BlcnR5IHtzdHJpbmd9IFt0eXBlPSdzdHJpbmcnXSAtIFRoZSBkYXRhIHR5cGUgb2YgdGhlIHN1YmV4cHJlc3Npb24gaWYgbmVpdGhlciB0aGUgb3BlcmF0b3Igbm9yIHRoZSBjb2x1bW4gc2NoZW1hIGRlZmluZXMgYSB0eXBlLlxuICpcbiAqIEBwcm9wZXJ0eSB7SFRNTEVsZW1lbnR9IGVsIC0gQSBgPHNwYW4+Li4uPC9zcGFuPmAgZWxlbWVudCB0aGF0IGNvbnRhaW5zIHRoZSBVSSBjb250cm9scy4gVGhpcyBlbGVtZW50IGlzIGF1dG9tYXRpY2FsbHkgYXBwZW5lZGVkIHRvIHRoZSBwYXJlbnQgYEZpbHRlclRyZWVgJ3MgYGVsYC4gR2VuZXJhdGVkIGJ5IHtAbGluayBGaWx0ZXJMZWFmI2NyZWF0ZVZpZXd8Y3JlYXRlVmlld30uXG4gKlxuICogQHByb3BlcnR5IHtmaWx0ZXJMZWFmVmlld09iamVjdH0gdmlldyAtIEEgaGFzaCBjb250YWluaW5nIGRpcmVjdCByZWZlcmVuY2VzIHRvIHRoZSBjb250cm9scyBpbiBgZWxgLiBBZGRlZCBieSB7QGxpbmsgRmlsdGVyTGVhZiNjcmVhdGVWaWV3fGNyZWF0ZVZpZXd9LlxuICovXG52YXIgRmlsdGVyTGVhZiA9IEZpbHRlck5vZGUuZXh0ZW5kKCdGaWx0ZXJMZWFmJywge1xuXG4gICAgbmFtZTogJ2NvbHVtbiA9IHZhbHVlJywgLy8gZGlzcGxheSBzdHJpbmcgZm9yIGRyb3AtZG93blxuXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdba2V5XS5yZW1vdmVFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLm9uQ2hhbmdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKiogQHN1bW1hcnkgQ3JlYXRlIGEgbmV3IHZpZXcuXG4gICAgICogQGRlc2MgVGhpcyBuZXcgXCJ2aWV3XCIgaXMgYSBncm91cCBvZiBIVE1MIGBFbGVtZW50YCBjb250cm9scyB0aGF0IGNvbXBsZXRlbHkgZGVzY3JpYmUgdGhlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gdGhpcyBvYmplY3QgcmVwcmVzZW50cy4gVGhpcyBtZXRob2QgY3JlYXRlcyB0aGUgdmlldywgc2V0dGluZyBgdGhpcy5lbGAgdG8gcG9pbnQgdG8gaXQsIGFuZCB0aGUgbWVtYmVycyBvZiBgdGhpcy52aWV3YCB0byBwb2ludCB0byB0aGUgaW5kaXZpZHVhbCBjb250cm9scyB0aGVyZWluLlxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJMZWFmI1xuICAgICAqL1xuICAgIGNyZWF0ZVZpZXc6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICAgIHZhciBlbCA9IHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cbiAgICAgICAgZWwuY2xhc3NOYW1lID0gJ2ZpbHRlci10cmVlLWVkaXRvciBmaWx0ZXItdHJlZS1kZWZhdWx0JztcblxuICAgICAgICBpZiAoc3RhdGUgJiYgc3RhdGUuY29sdW1uKSB7XG4gICAgICAgICAgICAvLyBTdGF0ZSBpbmNsdWRlcyBjb2x1bW46XG4gICAgICAgICAgICAvLyBPcGVyYXRvciBtZW51IGlzIGJ1aWx0IGxhdGVyIGluIGxvYWRTdGF0ZTsgd2UgZG9uJ3QgbmVlZCB0byBidWlsZCBpdCBub3cuIFRoZSBjYWxsIHRvXG4gICAgICAgICAgICAvLyBnZXRPcE1lbnUgYmVsb3cgd2l0aCB1bmRlZmluZWQgY29sdW1uTmFtZSByZXR1cm5zIFtdIHJlc3VsdGluZyBpbiBhbiBlbXB0eSBkcm9wLWRvd24uXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBXaGVuIHN0YXRlIGRvZXMgTk9UIGluY2x1ZGUgY29sdW1uLCBpdCdzIGJlY2F1c2UgZWl0aGVyOlxuICAgICAgICAgICAgLy8gYS4gY29sdW1uIGlzIHVua25vd24gYW5kIG9wIG1lbnUgd2lsbCBiZSBlbXB0eSB1bnRpbCB1c2VyIGNob29zZXMgYSBjb2x1bW47IG9yXG4gICAgICAgICAgICAvLyBiLiBjb2x1bW4gaXMgaGFyZC1jb2RlZCB3aGVuIHRoZXJlJ3Mgb25seSBvbmUgcG9zc2libGUgY29sdW1uIGFzIGluZmVyYWJsZSBmcm9tIHNjaGVtYTpcbiAgICAgICAgICAgIHZhciBzY2hlbWEgPSB0aGlzLnNjaGVtYSAmJiB0aGlzLnNjaGVtYS5sZW5ndGggPT09IDEgJiYgdGhpcy5zY2hlbWFbMF0sXG4gICAgICAgICAgICAgICAgY29sdW1uTmFtZSA9IHNjaGVtYSAmJiBzY2hlbWEubmFtZSB8fCBzY2hlbWE7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnZpZXcgPSB7XG4gICAgICAgICAgICBjb2x1bW46IHRoaXMubWFrZUVsZW1lbnQodGhpcy5zY2hlbWEsICdjb2x1bW4nLCB0aGlzLnNvcnRDb2x1bW5NZW51KSxcbiAgICAgICAgICAgIG9wZXJhdG9yOiB0aGlzLm1ha2VFbGVtZW50KGdldE9wTWVudS5jYWxsKHRoaXMsIGNvbHVtbk5hbWUpLCAnb3BlcmF0b3InKSxcbiAgICAgICAgICAgIG9wZXJhbmQ6IHRoaXMubWFrZUVsZW1lbnQoKVxuICAgICAgICB9O1xuXG4gICAgICAgIGVsLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2JyJykpO1xuICAgIH0sXG5cbiAgICBsb2FkU3RhdGU6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICAgIHZhciB2YWx1ZSwgZWwsIGksIGIsIHNlbGVjdGVkLCBvcHMsIHRoaXNPcCwgb3BNZW51LCBub3RlcztcbiAgICAgICAgaWYgKHN0YXRlKSB7XG4gICAgICAgICAgICBub3RlcyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFGaWx0ZXJOb2RlLm9wdGlvbnNTY2hlbWFba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXNba2V5XSA9IHN0YXRlW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGVsID0gdGhpcy52aWV3W2tleV07XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZWwudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbbmFtZT1cXCcnICsgZWwubmFtZSArICdcXCddJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGVsLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsW2ldLmNoZWNrZWQgPSB2YWx1ZS5pbmRleE9mKGVsW2ldLnZhbHVlKSA+PSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwgPSBlbC5vcHRpb25zO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIGIgPSBmYWxzZTsgaSA8IGVsLmxlbmd0aDsgaSsrLCBiID0gYiB8fCBzZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCA9IHZhbHVlLmluZGV4T2YoZWxbaV0udmFsdWUpID49IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsW2ldLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZpbHRlck5vZGUuc2V0V2FybmluZ0NsYXNzKGVsLCBiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWwudmFsdWUgPT09ICcnICYmIGtleSA9PT0gJ29wZXJhdG9yJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPcGVyYXRvciBtYXkgYmUgYSBzeW5vbnltLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHMgPSB0aGlzLnJvb3QuY29uZGl0aW9uYWxzLm9wcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc09wID0gb3BzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BNZW51ID0gZ2V0T3BNZW51LmNhbGwodGhpcywgc3RhdGUuY29sdW1uIHx8IHRoaXMuY29sdW1uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgZWFjaCBtZW51IGl0ZW0ncyBvcCBvYmplY3QgZm9yIGVxdWl2YWxlbmN5IHRvIHBvc3NpYmxlIHN5bm9ueW0ncyBvcCBvYmplY3QuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcE1lbnUud2Fsay5jYWxsKG9wTWVudSwgZXF1aXYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIUZpbHRlck5vZGUuc2V0V2FybmluZ0NsYXNzKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3Rlcy5wdXNoKHsga2V5OiBrZXksIHZhbHVlOiB2YWx1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleSA9PT0gJ2NvbHVtbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFrZU9wTWVudS5jYWxsKHRoaXMsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobm90ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxlID0gbm90ZXMubGVuZ3RoID4gMSxcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVzID0gdGhpcy50ZW1wbGF0ZXMsXG4gICAgICAgICAgICAgICAgICAgIGZvb3Rub3RlcyA9IHRlbXBsYXRlcy5nZXQobXVsdGlwbGUgPyAnbm90ZXMnIDogJ25vdGUnKSxcbiAgICAgICAgICAgICAgICAgICAgaW5uZXIgPSBmb290bm90ZXMucXVlcnlTZWxlY3RvcignLmZvb3Rub3RlJyk7XG4gICAgICAgICAgICAgICAgbm90ZXMuZm9yRWFjaChmdW5jdGlvbihub3RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmb290bm90ZSA9IG11bHRpcGxlID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKSA6IGlubmVyO1xuICAgICAgICAgICAgICAgICAgICBub3RlID0gdGVtcGxhdGVzLmdldCgnb3B0aW9uTWlzc2luZycsIG5vdGUua2V5LCBub3RlLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKG5vdGUubGVuZ3RoKSB7IGZvb3Rub3RlLmFwcGVuZENoaWxkKG5vdGVbMF0pOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkgeyBpbm5lci5hcHBlbmRDaGlsZChmb290bm90ZSk7IH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubm90ZXNFbCA9IGZvb3Rub3RlcztcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBlcXVpdihvcE1lbnVJdGVtKSB7XG4gICAgICAgICAgICB2YXIgb3BOYW1lID0gb3BNZW51SXRlbS5uYW1lIHx8IG9wTWVudUl0ZW07XG4gICAgICAgICAgICBpZiAob3BzW29wTmFtZV0gPT09IHRoaXNPcCkge1xuICAgICAgICAgICAgICAgIGVsLnZhbHVlID0gb3BOYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwcm9wZXJ0eSB7Y29udmVydGVyfSBudW1iZXJcbiAgICAgKiBAcHJvcGVydHkge2NvbnZlcnRlcn0gaW50IC0gc3lub255bSBvZiBgbnVtYmVyYFxuICAgICAqIEBwcm9wZXJ0eSB7Y29udmVydGVyfSBmbG9hdCAtIHN5bm9ueW0gb2YgYG51bWJlcmBcbiAgICAgKiBAcHJvcGVydHkge2NvbnZlcnRlcn0gZGF0ZVxuICAgICAqIEBwcm9wZXJ0eSB7Y29udmVydGVyfSBzdHJpbmdcbiAgICAgKi9cbiAgICBjb252ZXJ0ZXJzOiB7XG4gICAgICAgIG51bWJlcjogbnVtYmVyQ29udmVydGVyLFxuICAgICAgICBpbnQ6IG51bWJlckNvbnZlcnRlcixcbiAgICAgICAgZmxvYXQ6IG51bWJlckNvbnZlcnRlcixcbiAgICAgICAgZGF0ZTogZGF0ZUNvbnZlcnRlclxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgYnkgdGhlIHBhcmVudCBub2RlJ3Mge0BsaW5rIEZpbHRlclRyZWUjaW52YWxpZHxpbnZhbGlkKCl9IG1ldGhvZCwgd2hpY2ggY2F0Y2hlcyB0aGUgZXJyb3IgdGhyb3duIHdoZW4gaW52YWxpZC5cbiAgICAgKlxuICAgICAqIEFsc28gcGVyZm9ybXMgdGhlIGZvbGxvd2luZyBjb21waWxhdGlvbiBhY3Rpb25zOlxuICAgICAqICogQ29waWVzIGFsbCBgdGhpcy52aWV3YCcgdmFsdWVzIGZyb20gdGhlIERPTSB0byBzaW1pbGFybHkgbmFtZWQgcHJvcGVydGllcyBvZiBgdGhpc2AuXG4gICAgICogKiBQcmUtc2V0cyBgdGhpcy5vcGAgYW5kIGB0aGlzLmNvbnZlcnRlcmAgZm9yIHVzZSBpbiBgdGVzdGAncyB0cmVlIHdhbGsuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRocm93PWZhbHNlXSAtIFRocm93IGFuIGVycm9yIGlmIG1pc3Npbmcgb3IgaW52YWxpZCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmZvY3VzPWZhbHNlXSAtIE1vdmUgZm9jdXMgdG8gb2ZmZW5kaW5nIGNvbnRyb2wuXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH0gVGhpcyBpcyB0aGUgbm9ybWFsIHJldHVybiB3aGVuIHZhbGlkOyBvdGhlcndpc2UgdGhyb3dzIGVycm9yIHdoZW4gaW52YWxpZC5cbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTGVhZiNcbiAgICAgKi9cbiAgICBpbnZhbGlkOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBlbGVtZW50TmFtZSwgdHlwZSwgZm9jdXNlZDtcblxuICAgICAgICBmb3IgKGVsZW1lbnROYW1lIGluIHRoaXMudmlldykge1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3W2VsZW1lbnROYW1lXSxcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGNvbnRyb2xWYWx1ZShlbCkudHJpbSgpO1xuXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgdmFsdWUgPT09ICcnICYmIGVsZW1lbnROYW1lID09PSAnb3BlcmF0b3InICYmIC8vIG5vdCBpbiBvcGVyYXRvciBtZW51XG4gICAgICAgICAgICAgICAgdGhpcy5yb290LmNvbmRpdGlvbmFscy5vcHNbdGhpcy5vcGVyYXRvcl0gJiYgLy8gYnV0IHZhbGlkIGluIG9wZXJhdG9yIGhhc2hcbiAgICAgICAgICAgICAgICAhZ2V0UHJvcGVydHkuY2FsbCh0aGlzLCB0aGlzLmNvbHVtbiwgJ29wTXVzdEJlSW5NZW51JykgLy8gYW5kIGlzIGRvZXNuJ3QgaGF2ZSB0byBiZSBpbiBtZW51IHRvIGJlIHZhbGlkXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMub3BlcmF0b3I7IC8vIHVzZSBpdCBhcyBpcyB0aGVuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWZvY3VzZWQgJiYgb3B0aW9ucyAmJiBvcHRpb25zLmZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsaWNrSW4oZWwpO1xuICAgICAgICAgICAgICAgICAgICBmb2N1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy50aHJvdykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgdGhpcy5FcnJvcignTWlzc2luZyBvciBpbnZhbGlkICcgKyBlbGVtZW50TmFtZSArICcgaW4gY29uZGl0aW9uYWwgZXhwcmVzc2lvbi4gQ29tcGxldGUgdGhlIGV4cHJlc3Npb24gb3IgcmVtb3ZlIGl0LicsIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQ29weSBlYWNoIGNvbnRyb2xzJ3MgdmFsdWUgYXMgYSBuZXcgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IG9mIHRoaXMgb2JqZWN0LlxuICAgICAgICAgICAgICAgIHRoaXNbZWxlbWVudE5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm9wID0gdGhpcy5yb290LmNvbmRpdGlvbmFscy5vcHNbdGhpcy5vcGVyYXRvcl07XG5cbiAgICAgICAgdHlwZSA9IHRoaXMuZ2V0VHlwZSgpO1xuXG4gICAgICAgIHRoaXMuY29udmVydGVyID0gdHlwZSAmJiB0eXBlICE9PSAnc3RyaW5nJyAmJiB0aGlzLmNvbnZlcnRlcnNbdHlwZV07XG5cbiAgICAgICAgdGhpcy5jYWxjdWxhdG9yID0gdGhpcy5nZXRDYWxjdWxhdG9yKCk7XG4gICAgfSxcblxuICAgIGdldFR5cGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcC50eXBlIHx8IGdldFByb3BlcnR5LmNhbGwodGhpcywgdGhpcy5jb2x1bW4sICd0eXBlJyk7XG4gICAgfSxcblxuICAgIGdldENhbGN1bGF0b3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZ2V0UHJvcGVydHkuY2FsbCh0aGlzLCB0aGlzLmNvbHVtbiwgJ2NhbGN1bGF0b3InKTtcbiAgICB9LFxuXG4gICAgdmFsT3JGdW5jOiBmdW5jdGlvbihkYXRhUm93LCBjb2x1bW5OYW1lLCBjYWxjdWxhdG9yKSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIGlmIChkYXRhUm93KSB7XG4gICAgICAgICAgICByZXN1bHQgPSBkYXRhUm93W2NvbHVtbk5hbWVdO1xuICAgICAgICAgICAgY2FsY3VsYXRvciA9ICh0eXBlb2YgcmVzdWx0KVswXSA9PT0gJ2YnID8gcmVzdWx0IDogY2FsY3VsYXRvcjtcbiAgICAgICAgICAgIGlmIChjYWxjdWxhdG9yKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gY2FsY3VsYXRvcihkYXRhUm93LCBjb2x1bW5OYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHJlc3VsdCA9PT0gMCB8fCByZXN1bHQgPT09IGZhbHNlID8gcmVzdWx0IDogJyc7XG4gICAgfSxcblxuICAgIHA6IGZ1bmN0aW9uKGRhdGFSb3cpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsT3JGdW5jKGRhdGFSb3csIHRoaXMuY29sdW1uLCB0aGlzLmNhbGN1bGF0b3IpO1xuICAgIH0sXG5cbiAgICAvLyBUbyBiZSBvdmVycmlkZGVuIHdoZW4gb3BlcmFuZCBpcyBhIGNvbHVtbiBuYW1lIChzZWUgY29sdW1ucy5qcykuXG4gICAgcTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wZXJhbmQ7XG4gICAgfSxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uKGRhdGFSb3cpIHtcbiAgICAgICAgdmFyIHAsIHEsIC8vIHVudHlwZWQgdmVyc2lvbnMgb2YgYXJnc1xuICAgICAgICAgICAgUCwgUSwgLy8gdHlwZWQgdmVyc2lvbnMgb2YgcCBhbmQgcVxuICAgICAgICAgICAgY29udmVydGVyO1xuXG4gICAgICAgIC8vIFRPRE86IElmIGEgbGl0ZXJhbCAoaS5lLiwgd2hlbiB0aGlzLnEgaXMgbm90IG92ZXJyaWRkZW4pLCBxIG9ubHkgbmVlZHMgdG8gYmUgZmV0Y2hlZCBPTkNFIGZvciBhbGwgcm93c1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgKHAgPSB0aGlzLnAoZGF0YVJvdykpID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAgIChxID0gdGhpcy5xKGRhdGFSb3cpKSA9PT0gdW5kZWZpbmVkXG4gICAgICAgIClcbiAgICAgICAgICAgID8gZmFsc2UgLy8gZGF0YSBpbmFjY2Vzc2libGUgc28gZXhjbHVkZSByb3dcbiAgICAgICAgICAgIDogKFxuICAgICAgICAgICAgICAgIChjb252ZXJ0ZXIgPSB0aGlzLmNvbnZlcnRlcikgJiZcbiAgICAgICAgICAgICAgICAhY29udmVydGVyLmZhaWxlZChQID0gY29udmVydGVyLnRvVHlwZShwKSkgJiYgLy8gYXR0ZW1wdCB0byBjb252ZXJ0IGRhdGEgdG8gdHlwZVxuICAgICAgICAgICAgICAgICFjb252ZXJ0ZXIuZmFpbGVkKFEgPSBjb252ZXJ0ZXIudG9UeXBlKHEpKVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgID8gdGhpcy5vcC50ZXN0KFAsIFEpIC8vIGJvdGggY29udmVyc2lvbnMgc3VjY2Vzc2Z1bDogY29tcGFyZSBhcyB0eXBlc1xuICAgICAgICAgICAgICAgIDogdGhpcy5vcC50ZXN0KHRvU3RyaW5nKHApLCB0b1N0cmluZyhxKSk7IC8vIG9uZSBvciBib3RoIGNvbnZlcnNpb25zIGZhaWxlZDogY29tcGFyZSBhcyBzdHJpbmdzXG4gICAgfSxcblxuICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGF0ZSA9IHt9O1xuICAgICAgICBpZiAodGhpcy5lZGl0b3IpIHtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgIHN0YXRlW2tleV0gPSB0aGlzW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc2NoZW1hICE9PSB0aGlzLnBhcmVudC5zY2hlbWEpIHtcbiAgICAgICAgICAgIHN0YXRlLnNjaGVtYSA9IHRoaXMuc2NoZW1hO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9yIGAnb2JqZWN0J2AgYW5kIGAnSlNPTidgIG5vdGUgdGhhdCB0aGUgc3VidHJlZSdzIHZlcnNpb24gb2YgYGdldFN0YXRlYCB3aWxsIG5vdCBjYWxsIHRoaXMgbGVhZiB2ZXJzaW9uIG9mIGBnZXRTdGF0ZWAgYmVjYXVzZSB0aGUgZm9ybWVyIHVzZXMgYHVuc3RydW5naWZ5KClgIGFuZCBgSlNPTi5zdHJpbmdpZnkoKWAsIHJlc3BlY3RpdmVseSwgYm90aCBvZiB3aGljaCByZWN1cnNlIGFuZCBjYWxsIGB0b0pTT04oKWAgb24gdGhlaXIgb3duLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zPSdvYmplY3QnXSAtIFNlZSB0aGUgc3VidHJlZSB2ZXJzaW9uIG9mIHtAbGluayBGaWx0ZXJUcmVlI2dldFN0YXRlfGdldFN0YXRlfSBmb3IgbW9yZSBpbmZvLlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIEZpbHRlckxlYWYjXG4gICAgICovXG4gICAgZ2V0U3RhdGU6IGZ1bmN0aW9uIGdldFN0YXRlKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9ICcnLFxuICAgICAgICAgICAgc3ludGF4ID0gb3B0aW9ucyAmJiBvcHRpb25zLnN5bnRheCB8fCAnb2JqZWN0JztcblxuICAgICAgICBzd2l0Y2ggKHN5bnRheCkge1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzogLy8gc2VlIG5vdGUgYWJvdmVcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLnRvSlNPTigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnSlNPTic6IC8vIHNlZSBub3RlIGFib3ZlXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkodGhpcywgbnVsbCwgb3B0aW9ucyAmJiBvcHRpb25zLnNwYWNlKSB8fCAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1NRTCc6XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5nZXRTeW50YXgodGhpcy5yb290LmNvbmRpdGlvbmFscyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICBtYWtlU3FsT3BlcmFuZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJvb3QuY29uZGl0aW9uYWxzLm1ha2VTcWxTdHJpbmcodGhpcy5vcGVyYW5kKTsgLy8gdG9kbzogdGhpcyBzaG91bGQgYmUgYSBudW1iZXIgaWYgdHlwZSBpcyBudW1iZXIgaW5zdGVhZCBvZiBhIHN0cmluZyAtLSBidXQgd2Ugd2lsbCBoYXZlIHRvIGVuc3VyZSBpdCBpcyBudW1lcmljIVxuICAgIH0sXG5cbiAgICBnZXRTeW50YXg6IGZ1bmN0aW9uKGNvbmRpdGlvbmFscykge1xuICAgICAgICByZXR1cm4gdGhpcy5yb290LmNvbmRpdGlvbmFscy5vcHNbdGhpcy5vcGVyYXRvcl0ubWFrZS5jYWxsKGNvbmRpdGlvbmFscywgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKiBAc3VtbWFyeSBIVE1MIGZvcm0gY29udHJvbHMgZmFjdG9yeS5cbiAgICAgKiBAZGVzYyBDcmVhdGVzIGFuZCBhcHBlbmRzIGEgdGV4dCBib3ggb3IgYSBkcm9wLWRvd24uXG4gICAgICogPiBEZWZpbmVkIG9uIHRoZSBGaWx0ZXJUcmVlIHByb3RvdHlwZSBmb3IgYWNjZXNzIGJ5IGRlcml2ZWQgdHlwZXMgKGFsdGVybmF0ZSBmaWx0ZXIgZWRpdG9ycykuXG4gICAgICogQHJldHVybnMgVGhlIG5ldyBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7bWVudUl0ZW1bXX0gW21lbnVdIC0gT3ZlcmxvYWRzOlxuICAgICAqICogSWYgb21pdHRlZCwgd2lsbCBjcmVhdGUgYW4gYDxpbnB1dC8+YCAodGV4dCBib3gpIGVsZW1lbnQuXG4gICAgICogKiBJZiBjb250YWlucyBvbmx5IGEgc2luZ2xlIG9wdGlvbiwgd2lsbCBjcmVhdGUgYSBgPHNwYW4+Li4uPC9zcGFuPmAgZWxlbWVudCBjb250YWluaW5nIHRoZSBzdHJpbmcgYW5kIGEgYDxpbnB1dCB0eXBlPWhpZGRlbj5gIGNvbnRhaW5pbmcgdGhlIHZhbHVlLlxuICAgICAqICogT3RoZXJ3aXNlLCBjcmVhdGVzIGEgYDxzZWxlY3Q+Li4uPC9zZWxlY3Q+YCBlbGVtZW50IHdpdGggdGhlc2UgbWVudSBpdGVtcy5cbiAgICAgKiBAcGFyYW0ge251bGx8c3RyaW5nfSBbcHJvbXB0PScnXSAtIEFkZHMgYW4gaW5pdGlhbCBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnQgdG8gdGhlIGRyb3AtZG93biB3aXRoIHRoaXMgdmFsdWUsIHBhcmVudGhlc2l6ZWQsIGFzIGl0cyBgdGV4dGA7IGFuZCBlbXB0eSBzdHJpbmcgYXMgaXRzIGB2YWx1ZWAuIE9taXR0aW5nIGNyZWF0ZXMgYSBibGFuayBwcm9tcHQ7IGBudWxsYCBzdXBwcmVzc2VzLlxuICAgICAqIEBwYXJhbSBbc29ydF1cbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTGVhZiNcbiAgICAgKi9cbiAgICBtYWtlRWxlbWVudDogZnVuY3Rpb24obWVudSwgcHJvbXB0LCBzb3J0KSB7XG4gICAgICAgIHZhciBlbCwgcmVzdWx0LCBvcHRpb25zLFxuICAgICAgICAgICAgb3B0aW9uID0gbWVudSxcbiAgICAgICAgICAgIHRhZ05hbWUgPSBtZW51ID8gJ1NFTEVDVCcgOiAnSU5QVVQnO1xuXG4gICAgICAgIC8vIGRldGVybWluZSBpZiB0aGVyZSB3b3VsZCBiZSBvbmx5IGEgc2luZ2xlIGl0ZW0gaW4gdGhlIGRyb3Bkb3duXG4gICAgICAgIHdoaWxlIChvcHRpb24gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgaWYgKG9wdGlvbi5sZW5ndGggPT09IDEgJiYgIXBvcE1lbnUuaXNHcm91cFByb3h5KG9wdGlvblswXSkpIHtcbiAgICAgICAgICAgICAgICBvcHRpb24gPSBvcHRpb25bMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG9wdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb24pIHtcbiAgICAgICAgICAgIC8vIGhhcmQgdGV4dCB3aGVuIHNpbmdsZSBpdGVtXG4gICAgICAgICAgICBlbCA9IHRoaXMudGVtcGxhdGVzLmdldChcbiAgICAgICAgICAgICAgICAnbG9ja2VkQ29sdW1uJyxcbiAgICAgICAgICAgICAgICBvcHRpb24uYWxpYXMgfHwgb3B0aW9uLmhlYWRlciB8fCBvcHRpb24ubmFtZSB8fCBvcHRpb24sXG4gICAgICAgICAgICAgICAgb3B0aW9uLm5hbWUgfHwgb3B0aW9uLmFsaWFzIHx8IG9wdGlvbi5oZWFkZXIgfHwgb3B0aW9uXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmVzdWx0ID0gZWwucXVlcnlTZWxlY3RvcignaW5wdXQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgcHJvbXB0OiBwcm9tcHQsXG4gICAgICAgICAgICAgICAgc29ydDogc29ydCxcbiAgICAgICAgICAgICAgICBncm91cDogZnVuY3Rpb24oZ3JvdXBOYW1lKSB7IHJldHVybiBDb25kaXRpb25hbHMuZ3JvdXBzW2dyb3VwTmFtZV07IH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIG1ha2UgYW4gZWxlbWVudFxuICAgICAgICAgICAgZWwgPSBwb3BNZW51LmJ1aWxkKHRhZ05hbWUsIG1lbnUsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICAvLyBpZiBpdCdzIGEgdGV4dGJveCwgbGlzdGVuIGZvciBrZXl1cCBldmVudHNcbiAgICAgICAgICAgIGlmIChlbC50eXBlID09PSAndGV4dCcgJiYgdGhpcy5ldmVudEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdGhpcy5ldmVudEhhbmRsZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBoYW5kbGUgb25jaGFuZ2UgZXZlbnRzXG4gICAgICAgICAgICB0aGlzLm9uQ2hhbmdlID0gdGhpcy5vbkNoYW5nZSB8fCBjbGVhblVwQW5kTW92ZU9uLmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIHRoaXMub25DaGFuZ2UpO1xuXG4gICAgICAgICAgICBGaWx0ZXJOb2RlLnNldFdhcm5pbmdDbGFzcyhlbCk7XG4gICAgICAgICAgICByZXN1bHQgPSBlbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQoZWwpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufSk7XG5cbi8qKiBgY2hhbmdlYCBldmVudCBoYW5kbGVyIGZvciBhbGwgZm9ybSBjb250cm9scy5cbiAqIFJlYnVpbGRzIHRoZSBvcGVyYXRvciBkcm9wLWRvd24gYXMgbmVlZGVkLlxuICogUmVtb3ZlcyBlcnJvciBDU1MgY2xhc3MgZnJvbSBjb250cm9sLlxuICogQWRkcyB3YXJuaW5nIENTUyBjbGFzcyBmcm9tIGNvbnRyb2wgaWYgYmxhbms7IHJlbW92ZXMgaWYgbm90IGJsYW5rLlxuICogQWRkcyB3YXJuaW5nIENTUyBjbGFzcyBmcm9tIGNvbnRyb2wgaWYgYmxhbms7IHJlbW92ZXMgaWYgbm90IGJsYW5rLlxuICogTW92ZXMgZm9jdXMgdG8gbmV4dCBub24tYmxhbmsgc2libGluZyBjb250cm9sLlxuICogQHRoaXMge0ZpbHRlckxlYWZ9XG4gKi9cbmZ1bmN0aW9uIGNsZWFuVXBBbmRNb3ZlT24oZXZ0KSB7XG4gICAgdmFyIGVsID0gZXZ0LnRhcmdldDtcblxuICAgIC8vIHJlbW92ZSBgZXJyb3JgIENTUyBjbGFzcywgd2hpY2ggbWF5IGhhdmUgYmVlbiBhZGRlZCBieSBgRmlsdGVyTGVhZi5wcm90b3R5cGUuaW52YWxpZGBcbiAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdmaWx0ZXItdHJlZS1lcnJvcicpO1xuXG4gICAgLy8gc2V0IG9yIHJlbW92ZSAnd2FybmluZycgQ1NTIGNsYXNzLCBhcyBwZXIgZWwudmFsdWVcbiAgICBGaWx0ZXJOb2RlLnNldFdhcm5pbmdDbGFzcyhlbCk7XG5cbiAgICBpZiAoZWwgPT09IHRoaXMudmlldy5jb2x1bW4pIHtcbiAgICAgICAgLy8gcmVidWlsZCBvcGVyYXRvciBsaXN0IGFjY29yZGluZyB0byBzZWxlY3RlZCBjb2x1bW4gbmFtZSBvciB0eXBlLCByZXN0b3Jpbmcgc2VsZWN0ZWQgaXRlbVxuICAgICAgICBtYWtlT3BNZW51LmNhbGwodGhpcywgZWwudmFsdWUpO1xuICAgIH1cblxuICAgIGlmIChlbC52YWx1ZSkge1xuICAgICAgICAvLyBmaW5kIG5leHQgc2libGluZyBjb250cm9sLCBpZiBhbnlcbiAgICAgICAgaWYgKCFlbC5tdWx0aXBsZSkge1xuICAgICAgICAgICAgd2hpbGUgKChlbCA9IGVsLm5leHRFbGVtZW50U2libGluZykgJiYgKCEoJ25hbWUnIGluIGVsKSB8fCBlbC52YWx1ZS50cmltKCkgIT09ICcnKSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY3VybHlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFuZCBjbGljayBpbiBpdCAob3BlbnMgc2VsZWN0IGxpc3QpXG4gICAgICAgIGlmIChlbCAmJiBlbC52YWx1ZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICBlbC52YWx1ZSA9ICcnOyAvLyByaWQgb2YgYW55IHdoaXRlIHNwYWNlXG4gICAgICAgICAgICBGaWx0ZXJOb2RlLmNsaWNrSW4oZWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZm9yd2FyZCB0aGUgZXZlbnQgdG8gdGhlIGFwcGxpY2F0aW9uJ3MgZXZlbnQgaGFuZGxlclxuICAgIGlmICh0aGlzLmV2ZW50SGFuZGxlcikge1xuICAgICAgICB0aGlzLmV2ZW50SGFuZGxlcihldnQpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBHZXQgdGhlIG5vZGUgcHJvcGVydHkuXG4gKiBAZGVzYyBQcmlvcml0eSBsYWRkZXI6XG4gKiAxLiBTY2hlbWEgcHJvcGVydHkuXG4gKiAyLiBNaXhpbiAoaWYgZ2l2ZW4pLlxuICogMy4gTm9kZSBwcm9wZXJ0eSBpcyBmaW5hbCBwcmlvcml0eS5cbiAqIEB0aGlzIHtGaWx0ZXJMZWFmfVxuICogQHBhcmFtIHtzdHJpbmd9IGNvbHVtbk5hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eU5hbWVcbiAqIEBwYXJhbSB7ZnVuY3Rpb258Ym9vbGVhbn0gW21peGluXSAtIE9wdGlvbmFsIGZ1bmN0aW9uIG9yIHZhbHVlIGlmIHNjaGVtYSBwcm9wZXJ0eSB1bmRlZmluZWQuIElmIGZ1bmN0aW9uLCBjYWxsZWQgaW4gY29udGV4dCB3aXRoIGBwcm9wZXJ0eU5hbWVgIGFuZCBgY29sdW1uTmFtZWAuXG4gKiBAcmV0dXJucyB7b2JqZWN0fVxuICovXG5mdW5jdGlvbiBnZXRQcm9wZXJ0eShjb2x1bW5OYW1lLCBwcm9wZXJ0eU5hbWUsIG1peGluKSB7XG4gICAgdmFyIGNvbHVtblNjaGVtYSA9IHRoaXMuc2NoZW1hLmxvb2t1cChjb2x1bW5OYW1lKSB8fCB7fTtcbiAgICByZXR1cm4gKFxuICAgICAgICBjb2x1bW5TY2hlbWFbcHJvcGVydHlOYW1lXSAvLyB0aGUgZXhwcmVzc2lvbidzIGNvbHVtbiBzY2hlbWEgcHJvcGVydHlcbiAgICAgICAgICAgIHx8XG4gICAgICAgIHR5cGVvZiBtaXhpbiA9PT0gJ2Z1bmN0aW9uJyAmJiBtaXhpbi5jYWxsKHRoaXMsIGNvbHVtblNjaGVtYSwgcHJvcGVydHlOYW1lKVxuICAgICAgICAgICAgfHxcbiAgICAgICAgdHlwZW9mIG1peGluICE9PSAnZnVuY3Rpb24nICYmIG1peGluXG4gICAgICAgICAgICB8fFxuICAgICAgICB0aGlzW3Byb3BlcnR5TmFtZV0gLy8gdGhlIGV4cHJlc3Npb24gbm9kZSdzIHByb3BlcnR5XG4gICAgKTtcbn1cblxuLyoqXG4gKiBAdGhpcyB7RmlsdGVyTGVhZn1cbiAqIEBwYXJhbSB7c3RyaW5nfSBjb2x1bW5OYW1lXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfG1lbnVJdGVtW119XG4gKi9cbmZ1bmN0aW9uIGdldE9wTWVudShjb2x1bW5OYW1lKSB7XG4gICAgcmV0dXJuIGdldFByb3BlcnR5LmNhbGwodGhpcywgY29sdW1uTmFtZSwgJ29wTWVudScsIGZ1bmN0aW9uKGNvbHVtblNjaGVtYSkge1xuICAgICAgICByZXR1cm4gdGhpcy50eXBlT3BNYXAgJiYgdGhpcy50eXBlT3BNYXBbY29sdW1uU2NoZW1hLnR5cGUgfHwgdGhpcy50eXBlXTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBAdGhpcyB7RmlsdGVyTGVhZn1cbiAqIEBwYXJhbSB7c3RyaW5nfSBjb2x1bW5OYW1lXG4gKi9cbmZ1bmN0aW9uIG1ha2VPcE1lbnUoY29sdW1uTmFtZSkge1xuICAgIHZhciBvcE1lbnUgPSBnZXRPcE1lbnUuY2FsbCh0aGlzLCBjb2x1bW5OYW1lKTtcblxuICAgIGlmIChvcE1lbnUgIT09IHRoaXMucmVuZGVyZWRPcE1lbnUpIHtcbiAgICAgICAgdmFyIG5ld09wRHJvcCA9IHRoaXMubWFrZUVsZW1lbnQob3BNZW51LCAnb3BlcmF0b3InKTtcblxuICAgICAgICBuZXdPcERyb3AudmFsdWUgPSB0aGlzLnZpZXcub3BlcmF0b3IudmFsdWU7XG4gICAgICAgIHRoaXMuZWwucmVwbGFjZUNoaWxkKG5ld09wRHJvcCwgdGhpcy52aWV3Lm9wZXJhdG9yKTtcbiAgICAgICAgdGhpcy52aWV3Lm9wZXJhdG9yID0gbmV3T3BEcm9wO1xuXG4gICAgICAgIEZpbHRlck5vZGUuc2V0V2FybmluZ0NsYXNzKG5ld09wRHJvcCk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXJlZE9wTWVudSA9IG9wTWVudTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNsaWNrSW4oZWwpIHtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBlbC5jbGFzc0xpc3QuYWRkKCdmaWx0ZXItdHJlZS1lcnJvcicpO1xuICAgICAgICBGaWx0ZXJOb2RlLmNsaWNrSW4oZWwpO1xuICAgIH0sIDApO1xufVxuXG5mdW5jdGlvbiBjb250cm9sVmFsdWUoZWwpIHtcbiAgICB2YXIgdmFsdWUsIGk7XG5cbiAgICBzd2l0Y2ggKGVsLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W25hbWU9XFwnJyArIGVsLm5hbWUgKyAnXFwnXTplbmFibGVkOmNoZWNrZWQnKTtcbiAgICAgICAgICAgIGZvciAodmFsdWUgPSBbXSwgaSA9IDA7IGkgPCBlbC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhbHVlLnB1c2goZWxbaV0udmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgICAgIGVsID0gZWwub3B0aW9ucztcbiAgICAgICAgICAgIGZvciAodmFsdWUgPSBbXSwgaSA9IDA7IGkgPCBlbC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICghZWwuZGlzYWJsZWQgJiYgZWwuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUucHVzaChlbFtpXS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHZhbHVlID0gZWwudmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG4vLyBNZWFudCB0byBiZSBjYWxsZWQgYnkgRmlsdGVyVHJlZS5wcm90b3R5cGUuc2V0U2Vuc2l0aXZpdHkgb25seVxuRmlsdGVyTGVhZi5zZXRUb1N0cmluZyA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdG9TdHJpbmcgPSBmbjtcbiAgICByZXR1cm4gQ29uZGl0aW9uYWxzLnNldFRvU3RyaW5nKGZuKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBGaWx0ZXJMZWFmO1xuIiwiLyogZXNsaW50LWVudiBicm93c2VyICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdvYmplY3QtaXRlcmF0b3JzJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kLW1lJyksIEJhc2UgPSBleHRlbmQuQmFzZTsgZXh0ZW5kLmRlYnVnID0gdHJ1ZTtcbnZhciBwb3BNZW51ID0gcmVxdWlyZSgncG9wLW1lbnUnKTtcblxudmFyIGNzc0luamVjdG9yID0gcmVxdWlyZSgnLi9zdHlsZXNoZWV0Jyk7XG52YXIgVGVtcGxhdGVzID0gcmVxdWlyZSgnLi9UZW1wbGF0ZXMnKTtcbnZhciBDb25kaXRpb25hbHMgPSByZXF1aXJlKCcuL0NvbmRpdGlvbmFscycpO1xudmFyIFBhcnNlclNRTCA9IHJlcXVpcmUoJy4vcGFyc2VyLVNRTCcpO1xuXG5cbnZhciBDSElMRFJFTl9UQUcgPSAnT0wnLFxuICAgIENISUxEX1RBRyA9ICdMSSc7XG5cbi8vIEpTT04tZGV0ZWN0b3I6IGJlZ2lucyBfYW5kXyBlbmRzIHdpdGggZWl0aGVyIFsgYW5kIF0gX29yXyB7IGFuZCB9XG52YXIgcmVKU09OID0gL15cXHMqKChcXFtbXl0qXFxdKXwoXFx7W15dKlxcfSkpXFxzKiQvO1xuXG5mdW5jdGlvbiBGaWx0ZXJUcmVlRXJyb3IobWVzc2FnZSwgbm9kZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgdGhpcy5ub2RlID0gbm9kZTtcbn1cbkZpbHRlclRyZWVFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5GaWx0ZXJUcmVlRXJyb3IucHJvdG90eXBlLm5hbWUgPSAnRmlsdGVyVHJlZUVycm9yJztcblxuLyoqIEB0eXBlZGVmIHtvYmplY3R9IEZpbHRlclRyZWVTZXRTdGF0ZU9wdGlvbnNPYmplY3RcbiAqXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtzeW50YXg9J2F1dG8nXSAtIFNwZWNpZnkgcGFyc2VyIHRvIHVzZSBvbiBgc3RhdGVgLiBPbmUgb2Y6XG4gKiAqIGAnYXV0bydgIC0gQXV0by1kZXRlY3Q7IHNlZSB7QGxpbmsgRmlsdGVyTm9kZSNwYXJzZVN0YXRlU3RyaW5nfSBmb3IgYWxnb3JpdGhtLlxuICogKiBgJ29iamVjdCdgIC0gQSByYXcgc3RhdGUgb2JqZWN0IHN1Y2ggYXMgdGhhdCBwcm9kdWNlZCBieSB0aGUgW2dldFN0YXRlKClde0BsaW5rIEZpbHRlclRyZWUjZ2V0U3RhdGV9IG1ldGhvZC5cbiAqICogYCdKU09OJ2AgLSBBIEpTT04gc3RyaW5nIHZlcnNpb24gb2YgYSBzdGF0ZSBvYmplY3Qgc3VjaCBhcyB0aGF0IHByb2R1Y2VkIGJ5IHRoZSBbZ2V0U3RhdGUoKV17QGxpbmsgRmlsdGVyVHJlZSNnZXRTdGF0ZX0gbWV0aG9kLlxuICogKiBgJ1NRTCdgIC0gQSBTUUwgW3NlYXJjaCBjb25kaXRpb24gZXhwcmVzc2lvbl17QGxpbmsgaHR0cHM6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9tczE3MzU0NS5hc3B4fSBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBbY29udGV4dF0gSWYgZGVmaW5lZCwgdGhlIHByb3ZpZGVkIGlucHV0IHN0cmluZyBpcyB1c2VkIGFzIGEgc2VsZWN0b3IgdG8gYW4gYEhUTUxFbGVtZW50YCBjb250YWluZWQgaW4gYGNvbnRleHRgLiBUaGUgYHZhbHVlYCBwcm9wZXJ0eSBvZiB0aGlzIGVsZW1lbnQgaXMgZmV0Y2hlZCBmcm9tIHRoZSBET00gYW5kIGlzIHVzZWQgYXMgdGhlIGlucHV0IHN0YXRlIHN0cmluZzsgcHJvY2VlZCBhcyBhYm92ZS5cbiAqL1xuXG4vKiogQHR5cGVkZWYge29iamVjdH0gRmlsdGVyVHJlZU9wdGlvbnNPYmplY3RcbiAqXG4gKiBAcHJvcGVydHkge21lbnVJdGVtW119IFtzY2hlbWFdIC0gQSBkZWZhdWx0IGxpc3Qgb2YgY29sdW1uIG5hbWVzIGZvciBmaWVsZCBkcm9wLWRvd25zIG9mIGFsbCBkZXNjZW5kYW50IHRlcm1pbmFsIG5vZGVzLiBPdmVycmlkZXMgYG9wdGlvbnMuc3RhdGUuc2NoZW1hYCAoc2VlKS4gTWF5IGJlIGRlZmluZWQgZm9yIGFueSBub2RlIGFuZCBwZXJ0YWlucyB0byBhbGwgZGVzY2VuZGFudHMgb2YgdGhhdCBub2RlIChpbmNsdWRpbmcgdGVybWluYWwgbm9kZXMpLiBJZiBvbWl0dGVkIChhbmQgbm8gYG93blNjaGVtYWApLCB3aWxsIHVzZSB0aGUgbmVhcmVzdCBhbmNlc3RvciBgc2NoZW1hYCBkZWZpbml0aW9uLiBIb3dldmVyLCBkZXNjZW5kYW50cyB3aXRoIHRoZWlyIG93biBkZWZpbml0aW9uIG9mIGB0eXBlc2Agd2lsbCBvdmVycmlkZSBhbnkgYW5jZXN0b3IgZGVmaW5pdGlvbi5cbiAqXG4gKiA+IFR5cGljYWxseSBvbmx5IHVzZWQgYnkgdGhlIGNhbGxlciBmb3IgdGhlIHRvcC1sZXZlbCAocm9vdCkgdHJlZS5cbiAqXG4gKiBAcHJvcGVydHkge21lbnVJdGVtW119IFtvd25TY2hlbWFdIC0gQSBkZWZhdWx0IGxpc3Qgb2YgY29sdW1uIG5hbWVzIGZvciBmaWVsZCBkcm9wLWRvd25zIG9mIGltbWVkaWF0ZSBkZXNjZW5kYW50IHRlcm1pbmFsIG5vZGVzIF9vbmx5Xy4gT3ZlcnJpZGVzIGBvcHRpb25zLnN0YXRlLm93blNjaGVtYWAgKHNlZSkuXG4gKlxuICogQWx0aG91Z2ggYm90aCBgb3B0aW9ucy5zY2hlbWFgIGFuZCBgb3B0aW9ucy5vd25TY2hlbWFgIGFyZSBub3RhdGVkIGFzIG9wdGlvbmFsIGhlcmVpbiwgYnkgdGhlIHRpbWUgYSB0ZXJtaW5hbCBub2RlIHRyaWVzIHRvIHJlbmRlciBhIHNjaGVtYSBkcm9wLWRvd24sIGEgYHNjaGVtYWAgbGlzdCBzaG91bGQgYmUgZGVmaW5lZCB0aHJvdWdoIChpbiBvcmRlciBvZiBwcmlvcml0eSk6XG4gKlxuICogKiBUZXJtaW5hbCBub2RlJ3Mgb3duIGBvcHRpb25zLnNjaGVtYWAgKG9yIGBvcHRpb25zLnN0YXRlLnNjaGVtYWApIGRlZmluaXRpb24uXG4gKiAqIFRlcm1pbmFsIG5vZGUncyBwYXJlbnQgbm9kZSdzIGBvcHRpb24ub3duU2NoZW1hYCAob3IgYG9wdGlvbi5zdGF0ZS5ub2Rlc0ZpZWxkc2ApIGRlZmluaXRpb24uXG4gKiAqIFRlcm1pbmFsIG5vZGUncyBwYXJlbnQgKG9yIGFueSBhbmNlc3Rvcikgbm9kZSdzIGBvcHRpb25zLnNjaGVtYWAgKG9yIGBvcHRpb25zLnN0YXRlLnNjaGVtYWApIGRlZmluaXRpb24uXG4gKlxuICogQHByb3BlcnR5IHtGaWx0ZXJUcmVlU3RhdGVPYmplY3R9IFtzdGF0ZV0gLSBBIGRhdGEgc3RydWN0dXJlIHRoYXQgZGVzY3JpYmVzIGEgdHJlZSwgc3VidHJlZSwgb3IgbGVhZiAodGVybWluYWwgbm9kZSkuIElmIHVuZGVmaW5lZCwgbG9hZHMgYW4gZW1wdHkgZmlsdGVyLCB3aGljaCBpcyBhIGBGaWx0ZXJUcmVlYCBub2RlIGNvbnNpc3RpbmcgdGhlIGRlZmF1bHQgYG9wZXJhdG9yYCB2YWx1ZSAoYCdvcC1hbmQnYCkuXG4gKlxuICogQHByb3BlcnR5IHtmdW5jdGlvbn0gW2VkaXRvcj0nRGVmYXVsdCddIC0gVGhlIG5hbWUgb2YgdGhlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24ncyBVSSBcImVkaXRvci5cIiBUaGlzIG5hbWUgbXVzdCBiZSByZWdpc3RlcmVkIGluIHRoZSBwYXJlbnQgbm9kZSdzIHtAbGluayBGaWx0ZXJUcmVlI2VkaXRvcnN8ZWRpdG9yc30gaGFzaCwgd2hlcmUgaXQgbWFwcyB0byBhIGxlYWYgY29uc3RydWN0b3IgKGBGaWx0ZXJMZWFmYCBvciBhIGRlc2NlbmRhbnQgdGhlcmVvZikuIChVc2Uge0BsaW5rIEZpbHRlclRyZWUjYWRkRWRpdG9yfSB0byByZWdpc3RlciBuZXcgZWRpdG9ycy4pXG4gKlxuICogQHByb3BlcnR5IHtGaWx0ZXJUcmVlfSBbcGFyZW50XSAtIFVzZWQgaW50ZXJuYWxseSB0byBpbnNlcnQgZWxlbWVudCB3aGVuIGNyZWF0aW5nIG5lc3RlZCBzdWJ0cmVlcy4gVGhlIG9ubHkgdGltZSBpdCBtYXkgYmUgKGFuZCBtdXN0IGJlKSBvbWl0dGVkIGlzIHdoZW4gY3JlYXRpbmcgdGhlIHJvb3Qgbm9kZS5cbiAqXG4gKiBAcHJvcGVydHkge3N0cmluZ3xIVE1MRWxlbWVudH0gW2Nzc1N0eWxlc2hlZXRSZWZlcmVuY2VFbGVtZW50XSAtIHBhc3NlZCB0byBjc3NJbnNlcnRcbiAqL1xuXG4vKiogQHR5cGVkZWYge29iamVjdHxzdHJpbmd9IEZpbHRlclRyZWVTdGF0ZU9iamVjdFxuICpcbiAqIEBzdW1tYXJ5IFN0YXRlIHdpdGggd2hpY2ggdG8gY3JlYXRlIGEgbmV3IG5vZGUgb3IgcmVwbGFjZSBhbiBleGlzdGluZyBub2RlLlxuICpcbiAqIEBkZXNjIEEgc3RyaW5nIG9yIHBsYWluIG9iamVjdCB0aGF0IGRlc2NyaWJlcyBhIGZpbHRlci10cmVlIG5vZGUuIElmIGEgc3RyaW5nLCBpdCBpcyBwYXJzZWQgaW50byBhbiBvYmplY3QgYnkge0BsaW5rIEZpbHRlck5vZGV+cGFyc2VTdGF0ZVN0cmluZ30uIChTZWUsIGZvciBhdmFpbGFibGUgb3ZlcmxvYWRzLilcbiAqXG4gKiBUaGUgcmVzdWx0aW5nIG9iamVjdCBtYXkgYmUgYSBmbGF0IG9iamVjdCB0aGF0IGRlc2NyaWJlcyBhIHRlcm1pbmFsIG5vZGUgb3IgYSBjaGlsZGxlc3Mgcm9vdCBvciBicmFuY2ggbm9kZTsgb3IgbWF5IGJlIGEgaGllcmFyY2hpY2FsIG9iamVjdCB0byBkZWZpbmUgYW4gZW50aXJlIHRyZWUgb3Igc3VidHJlZS5cbiAqXG4gKiBJbiBhbnkgY2FzZSwgdGhlIHJlc3VsdGluZyBvYmplY3QgbWF5IGhhdmUgYW55IG9mIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAqXG4gKiBAcHJvcGVydHkge21lbnVJdGVtW119IFtzY2hlbWFdIC0gU2VlIGBzY2hlbWFgIHByb3BlcnR5IG9mIHtAbGluayBGaWx0ZXJUcmVlT3B0aW9uc09iamVjdH0uXG4gKlxuICogQHByb3BlcnR5IHtzdHJpbmd9IFtlZGl0b3I9J0RlZmF1bHQnXSAtIFNlZSBgZWRpdG9yYCBwcm9wZXJ0eSBvZiB7QGxpbmsgRmlsdGVyVHJlZU9wdGlvbnNPYmplY3R9LlxuICpcbiAqIEBwcm9wZXJ0eSBtaXNjIC0gT3RoZXIgbWlzY2VsbGFuZW91cyBwcm9wZXJ0aWVzIHdpbGwgYmUgY29waWVkIGRpcmVjdGx5IHRvIHRoZSBuZXcgYEZpdGxlck5vZGVgIG9iamVjdC4gKFRoZSBuYW1lIFwibWlzY1wiIGhlcmUgaXMganVzdCBhIHN0YW5kLWluOyB0aGVyZSBpcyBubyBzcGVjaWZpYyBwcm9wZXJ0eSBjYWxsZWQgXCJtaXNjXCIuKVxuICpcbiAqICogTWF5IGRlc2NyaWJlIGEgbm9uLXRlcm1pbmFsIG5vZGUgd2l0aCBwcm9wZXJ0aWVzOlxuICogICAqIGBzY2hlbWFgIC0gT3ZlcnJpZGRlbiBvbiBpbnN0YW50aWF0aW9uIGJ5IGBvcHRpb25zLnNjaGVtYWAuIElmIGJvdGggdW5zcGVjaWZpZWQsIHVzZXMgcGFyZW50J3MgZGVmaW5pdGlvbi5cbiAqICAgKiBgb3BlcmF0b3JgIC0gT25lIG9mIHtAbGluayB0cmVlT3BlcmF0b3JzfS5cbiAqICAgKiBgY2hpbGRyZW5gIC0gIEFycmF5IGNvbnRhaW5pbmcgYWRkaXRpb25hbCB0ZXJtaW5hbCBhbmQgbm9uLXRlcm1pbmFsIG5vZGVzLlxuICpcbiAqIFRoZSBjb25zdHJ1Y3RvciBhdXRvLWRldGVjdHMgYHN0YXRlYCdzIHR5cGU6XG4gKiAgKiBKU09OIHN0cmluZyB0byBiZSBwYXJzZWQgYnkgYEpTT04ucGFyc2UoKWAgaW50byBhIHBsYWluIG9iamVjdFxuICogICogU1FMIFdIRVJFIGNsYXVzZSBzdHJpbmcgdG8gYmUgcGFyc2VkIGludG8gYSBwbGFpbiBvYmplY3RcbiAqICAqIENTUyBzZWxlY3RvciBvZiBhbiBFbGVtZW50IHdob3NlIGB2YWx1ZWAgY29udGFpbnMgb25lIG9mIHRoZSBhYm92ZVxuICogICogcGxhaW4gb2JqZWN0XG4gKi9cblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAc3VtbWFyeSBBIG5vZGUgaW4gYSBmaWx0ZXIgdHJlZS5cbiAqXG4gKiBAZGVzY3JpcHRpb24gQSBmaWx0ZXIgdHJlZSByZXByZXNlbnRzIGEgX2NvbXBsZXggY29uZGl0aW9uYWwgZXhwcmVzc2lvbl8gYW5kIGNvbnNpc3RzIG9mIGEgc2luZ2xlIGluc3RhbmNlIG9mIGEge0BsaW5rIEZpbHRlclRyZWV9IG9iamVjdCBhcyB0aGUgX3Jvb3RfIG9mIGFuIF9uXy1hcnkgdHJlZS5cbiAqXG4gKiBGaWx0ZXIgdHJlZXMgYXJlIGNvbXByaXNlZCBvZiBpbnN0YW5jZXMgb2YgYEZpbHRlck5vZGVgIG9iamVjdHMuIEhvd2V2ZXIsIHRoZSBgRmlsdGVyTm9kZWAgY29uc3RydWN0b3IgaXMgYW4gXCJhYnN0cmFjdCBjbGFzc1wiOyBmaWx0ZXIgbm9kZSBvYmplY3RzIGFyZSBuZXZlciBpbnN0YW50aWF0ZWQgZGlyZWN0bHkgZnJvbSB0aGlzIGNvbnN0cnVjdG9yLiBBIGZpbHRlciB0cmVlIGlzIGFjdHVhbGx5IGNvbXByaXNlZCBvZiBpbnN0YW5jZXMgb2YgdHdvIFwic3ViY2xhc3Nlc1wiIG9mIGBGaWx0ZXJOb2RlYCBvYmplY3RzOlxuICogKiB7QGxpbmsgRmlsdGVyVHJlZX0gKG9yIHN1YmNsYXNzIHRoZXJlb2YpIG9iamVjdHMsIGluc3RhbmNlcyBvZiB3aGljaCByZXByZXNlbnQgdGhlIHJvb3Qgbm9kZSBhbmQgYWxsIHRoZSBicmFuY2ggbm9kZXM6XG4gKiAgICogVGhlcmUgaXMgYWx3YXlzIGV4YWN0bHkgb25lIHJvb3Qgbm9kZSwgY29udGFpbmluZyB0aGUgd2hvbGUgZmlsdGVyIHRyZWUsIHdoaWNoIHJlcHJlc2VudHMgdGhlIGZpbHRlciBleHByZXNzaW9uIGluIGl0cyBlbnRpcmV0eS4gVGhlIHJvb3Qgbm9kZSBpcyBkaXN0aW5ndWlzaGVkIGJ5IGhhdmluZyBubyBwYXJlbnQgbm9kZS5cbiAqICAgKiBUaGVyZSBhcmUgemVybyBvciBtb3JlIGJyYW5jaCBub2Rlcywgb3Igc3VidHJlZXMsIHdoaWNoIGFyZSBjaGlsZCBub2RlcyBvZiB0aGUgcm9vdCBvciBvdGhlciBicmFuY2hlcyBoaWdoZXIgdXAgaW4gdGhlIHRyZWUsIHJlcHJlc2VudGluZyBzdWJleHByZXNzaW9ucyB3aXRoaW4gdGhlIGxhcmdlciBmaWx0ZXIgZXhwcmVzc2lvbi4gRWFjaCBicmFuY2ggbm9kZSBoYXMgZXhhY3RseSBvbmUgcGFyZW50IG5vZGUuXG4gKiAgICogVGhlc2Ugbm9kZXMgcG9pbnQgdG8gemVybyBvciBtb3JlIGNoaWxkIG5vZGVzIHdoaWNoIGFyZSBlaXRoZXIgbmVzdGVkIHN1YnRyZWVzLCBvcjpcbiAqICoge0BsaW5rIEZpbHRlckxlYWZ9IChvciBzdWJjbGFzcyB0aGVyZW9mKSBvYmplY3RzLCBlYWNoIGluc3RhbmNlIG9mIHdoaWNoIHJlcHJlc2VudHMgYSBzaW5nbGUgc2ltcGxlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24uIFRoZXNlIGFyZSB0ZXJtaW5hbCBub2RlcywgaGF2aW5nIGV4YWN0bHkgb25lIHBhcmVudCBub2RlLCBhbmQgbm8gY2hpbGQgbm9kZXMuXG4gKlxuICogVGhlIHByb2dyYW1tZXIgbWF5IGV4dGVuZCB0aGUgc2VtYW50aWNzIG9mIGZpbHRlciB0cmVlcyBieSBleHRlbmRpbmcgdGhlIGFib3ZlIG9iamVjdHMuXG4gKlxuICogQHByb3BlcnR5IHtzcWxJZFF0c09iamVjdH0gW3NxbElkUXRzPXtiZWc6J1wiJyxlbmQ6J1wiJ31dIC0gUXVvdGUgY2hhcmFjdGVycyBmb3IgU1FMIGlkZW50aWZpZXJzLiBVc2VkIGZvciBib3RoIHBhcnNpbmcgYW5kIGdlbmVyYXRpbmcgU1FMLiBTaG91bGQgYmUgcGxhY2VkIG9uIHRoZSByb290IG5vZGUuXG4gKlxuICogQHByb3BlcnR5IHtIVE1MRWxlbWVudH0gZWwgLSBUaGUgRE9NIGVsZW1lbnQgY3JlYXRlZCBieSB0aGUgYHJlbmRlcmAgbWV0aG9kIHRvIHJlcHJlc2VudCB0aGlzIG5vZGUuIENvbnRhaW5zIHRoZSBgZWxgcyBmb3IgYWxsIGNoaWxkIG5vZGVzICh3aGljaCBhcmUgdGhlbXNlbHZlcyBwb2ludGVkIHRvIGJ5IHRob3NlIG5vZGVzKS4gVGhpcyBpcyBhbHdheXMgZ2VuZXJhdGVkIGJ1dCBpcyBvbmx5IGluIHRoZSBwYWdlIERPTSBpZiB5b3UgcHV0IGl0IHRoZXJlLlxuICovXG5cbnZhciBGaWx0ZXJOb2RlID0gQmFzZS5leHRlbmQoJ0ZpbHRlck5vZGUnLCB7XG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBDcmVhdGUgYSBuZXcgbm9kZSBvciBzdWJ0cmVlLlxuICAgICAqIEBkZXNjIFR5cGljYWxseSB1c2VkIGJ5IHRoZSBhcHBsaWNhdGlvbiBsYXllciB0byBjcmVhdGUgdGhlIGVudGlyZSBmaWx0ZXIgdHJlZTsgYW5kIGludGVybmFsbHksIHJlY3Vyc2l2ZWx5LCB0byBjcmVhdGUgZWFjaCBub2RlIGluY2x1ZGluZyBib3RoIHN1YnRyZWVzIGFuZCBsZWF2ZXMuXG4gICAgICpcbiAgICAgKiAqKk5vZGUgcHJvcGVydGllcyBhbmQgb3B0aW9uczoqKiBOb2RlcyBhcmUgaW5zdGFudGlhdGVkIHdpdGg6XG4gICAgICogMS4gQ2VydGFpbiAqKnJlcXVpcmVkIHByb3BlcnRpZXMqKiB3aGljaCBkaWZmZXIgZm9yIHN1YnRyZWVzIGFuZCBsZWF2ZXMuXG4gICAgICogMi4gQXJiaXRyYXJ5ICoqbm9uLXN0YW5kYXJkIG9wdGlvbiBwcm9wZXJ0aWVzKiogYXJlIGRlZmluZWQgb24gdGhlIGBvcHRpb25zYCBvYmplY3QgKHNvIGxvbmcgYXMgdGhlaXIgbmFtZXMgZG8gbm90IGNvbmZsaWN0IHdpdGggYW55IHN0YW5kYXJkIG9wdGlvbnMpIGFuZCBuZXZlciBwZXJzaXN0LlxuICAgICAqIDMuIENlcnRhaW4gKipzdGFuZGFyZCBvcHRpb25zIHByb3BlcnRpZXMqKiBhcyBkZWZpbmVkIGluIHRoZSB7QGxpbmsgRmlsdGVyTm9kZX5vcHRpb25zU2NoZW1hfG9wdGlvbnNTY2hlbWF9IGhhc2gsIGNvbWUgZnJvbSB2YXJpb3VzIHNvdXJjZXMsIGFzIHByaW9yaXRpemVkIGFzIGZvbGxvd3M6XG4gICAgICogICAgMS4gYG9wdGlvbnNgIG9iamVjdDsgZG9lcyBub3QgcGVyc2lzdFxuICAgICAqICAgIDIuIGBzdGF0ZWA7IG9iamVjdDsgcGVyc2lzdHNcbiAgICAgKiAgICAzLiBgcGFyZW50YCBvYmplY3Q7IHBlcnNpc3RzXG4gICAgICogICAgNC4gYGRlZmF1bHRgIG9iamVjdDsgZG9lcyBub3QgcGVyc2lzdFxuICAgICAqXG4gICAgICogTm90ZXM6XG4gICAgICogMS4gXCJQZXJzaXN0c1wiIG1lYW5zIG91dHB1dCBieSB7QGxpbmsgRmlsdGVyVHJlZSNnZXRTdGF0ZXxnZXRTdGF0ZSgpfS5cbiAgICAgKiAyLiBUaGUgYHBhcmVudGAgb2JqZWN0IGlzIGdlbmVyYXRlZCBpbnRlcm5hbGx5IGZvciBzdWJ0cmVlcy4gSXQgYWxsb3dzIHN0YW5kYXJkIG9wdGlvbnMgdG8gaW5oZXJpdCBmcm9tIHRoZSBwYXJlbnQgbm9kZS5cbiAgICAgKiAzLiBUaGUgYGRlZmF1bHRgIG9iamVjdCBjb21lcyBmcm9tIHRoZSBgZGVmYXVsdGAgcHJvcGVydHksIGlmIGFueSwgb2YgdGhlIHtAbGluayBGaWx0ZXJOb2Rlfm9wdGlvbnNTY2hlbWF8c2NoZW1hIG9iamVjdH0gZm9yIHRoZSBzdGFuZGFyZCBvcHRpb24gaW4gcXVlc3Rpb24uIE5vdGUgdGhhdCBvbmNlIGRlZmluZWQsIHN1YnRyZWVzIHdpbGwgdGhlbiBpbmhlcml0IHRoaXMgdmFsdWUuXG4gICAgICogNC4gSWYgbm90IGRlZmluZWQgYnkgYW55IG9mIHRoZSBhYm92ZSwgdGhlIHN0YW5kYXJkIG9wdGlvbiByZW1haW5zIHVuZGVmaW5lZCBvbiB0aGUgbm9kZS5cbiAgICAgKlxuICAgICAqICoqUXVlcnkgQnVpbGRlciBVSSBzdXBwb3J0OioqIElmIHlvdXIgYXBwIHdhbnRzIHRvIG1ha2UgdXNlIG9mIHRoZSBnZW5lcmF0ZWQgVUksIHlvdSBhcmUgcmVzcG9uc2libGUgZm9yIGluc2VydGluZyB0aGUgdG9wLWxldmVsIGAuZWxgIGludG8gdGhlIERPTS4gKE90aGVyd2lzZSBqdXN0IGlnbm9yZSBpdC4pXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0ZpbHRlclRyZWVPcHRpb25zT2JqZWN0fSBbb3B0aW9uc10gLSBUaGUgbm9kZSBzdGF0ZTsgb3IgYW4gb3B0aW9ucyBvYmplY3QgcG9zc2libHkgY29udGFpbmluZyBgc3RhdGVgIGFtb25nIG90aGVyIG9wdGlvbnMuIEFsdGhvdWdoIHlvdSBjYW4gaW5zdGFudGlhdGUgYSBmaWx0ZXIgd2l0aG91dCBhbnkgb3B0aW9ucywgdGhpcyBpcyBnZW5lcmFsbHkgbm90IHVzZWZ1bC4gU2VlICpJbnN0YW50aWF0aW5nIGEgZmlsdGVyKiBpbiB0aGUge0BsaW5rIGh0dHA6Ly9qb25laXQuZ2l0aHViLmlvL2ZpbHRlci10cmVlL2luZGV4Lmh0bWx8cmVhZG1lfSBmb3IgYSBwcmFjdGljYWwgZGlzY3Vzc2lvbiBvZiBtaW5pbXVtIG9wdGlvbnMuXG4gICAgICpcbiAgICAgKiAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlI1xuICAgICAqL1xuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgLyoqIEBzdW1tYXJ5IFJlZmVyZW5jZSB0byB0aGlzIG5vZGUncyBwYXJlbnQgbm9kZS5cbiAgICAgICAgICogQGRlc2MgV2hlbiB0aGlzIHByb3BlcnR5IGlzIHVuZGVmaW5lZCwgdGhpcyBub2RlIGlzIHRoZSByb290IG5vZGUuXG4gICAgICAgICAqIEB0eXBlIHtGaWx0ZXJOb2RlfVxuICAgICAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTm9kZSNcbiAgICAgICAgICovXG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudCA9IHRoaXMucGFyZW50IHx8IG9wdGlvbnMucGFyZW50LFxuICAgICAgICAgICAgcm9vdCA9IHBhcmVudCAmJiBwYXJlbnQucm9vdDtcblxuICAgICAgICBpZiAoIXJvb3QpIHtcbiAgICAgICAgICAgIHJvb3QgPSB0aGlzO1xuXG4gICAgICAgICAgICB0aGlzLnN0eWxlc2hlZXQgPSB0aGlzLnN0eWxlc2hlZXQgfHxcbiAgICAgICAgICAgICAgICBjc3NJbmplY3RvcihvcHRpb25zLmNzc1N0eWxlc2hlZXRSZWZlcmVuY2VFbGVtZW50KTtcblxuICAgICAgICAgICAgdGhpcy5jb25kaXRpb25hbHMgPSBuZXcgQ29uZGl0aW9uYWxzKG9wdGlvbnMpOyAvLyAuc3FsSWRRdHNcblxuICAgICAgICAgICAgdGhpcy5QYXJzZXJTUUwgPSBuZXcgUGFyc2VyU1FMKG9wdGlvbnMpOyAvLyAuc2NoZW1hLCAuY2FzZVNlbnNpdGl2ZUNvbHVtbk5hbWVzLCAucmVzb2x2ZUFsaWFzZXNcblxuICAgICAgICAgICAgdmFyIGtleXMgPSBbJ25hbWUnXTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLnJlc29sdmVBbGlhc2VzKSB7XG4gICAgICAgICAgICAgICAga2V5cy5wdXNoKCdhbGlhcycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmZpbmRPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIGNhc2VTZW5zaXRpdmU6IG9wdGlvbnMuY2FzZVNlbnNpdGl2ZUNvbHVtbk5hbWVzLFxuICAgICAgICAgICAgICAgIGtleXM6IGtleXNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvKiogQHN1bW1hcnkgQ29udmVuaWVuY2UgcmVmZXJlbmNlIHRvIHRoZSByb290IG5vZGUuXG4gICAgICAgICAqIEBuYW1lIHJvb3RcbiAgICAgICAgICogQHR5cGUge0ZpbHRlck5vZGV9XG4gICAgICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlI1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5yb290ID0gcm9vdDtcblxuICAgICAgICB0aGlzLmRvbnRQZXJzaXN0ID0ge307IC8vIGhhc2ggb2YgdHJ1dGh5IHZhbHVlc1xuXG4gICAgICAgIHRoaXMuc2V0U3RhdGUob3B0aW9ucy5zdGF0ZSwgb3B0aW9ucyk7XG4gICAgfSxcblxuICAgIC8qKiBJbnNlcnQgZWFjaCBzdWJ0cmVlIGludG8gaXRzIHBhcmVudCBub2RlIGFsb25nIHdpdGggYSBcImRlbGV0ZVwiIGJ1dHRvbi5cbiAgICAgKlxuICAgICAqIE5PVEU6IFRoZSByb290IHRyZWUgKHdoaWNoIGhhcyBubyBwYXJlbnQpIG11c3QgYmUgaW5zZXJ0ZWQgaW50byB0aGUgRE9NIGJ5IHRoZSBpbnN0YW50aWF0aW5nIGNvZGUgKHdpdGhvdXQgYSBkZWxldGUgYnV0dG9uKS5cbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTm9kZSNcbiAgICAgKi9cbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5wYXJlbnQpIHtcbiAgICAgICAgICAgIHZhciBuZXdMaXN0SXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoQ0hJTERfVEFHKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMubm90ZXNFbCkge1xuICAgICAgICAgICAgICAgIG5ld0xpc3RJdGVtLmFwcGVuZENoaWxkKHRoaXMubm90ZXNFbCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5rZWVwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVsID0gdGhpcy50ZW1wbGF0ZXMuZ2V0KCdyZW1vdmVCdXR0b24nKTtcbiAgICAgICAgICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucmVtb3ZlLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgIG5ld0xpc3RJdGVtLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV3TGlzdEl0ZW0uYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG5cbiAgICAgICAgICAgIHRoaXMucGFyZW50LmVsLnF1ZXJ5U2VsZWN0b3IoQ0hJTERSRU5fVEFHKS5hcHBlbmRDaGlsZChuZXdMaXN0SXRlbSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0ZpbHRlclRyZWVTdGF0ZU9iamVjdH0gc3RhdGVcbiAgICAgKiBAcGFyYW0ge0ZpbHRlclRyZWVTZXRTdGF0ZU9wdGlvbnNPYmplY3R9IFtvcHRpb25zXVxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlI1xuICAgICAqL1xuICAgIHNldFN0YXRlOiBmdW5jdGlvbihzdGF0ZSwgb3B0aW9ucykge1xuICAgICAgICB2YXIgb2xkRWwgPSB0aGlzLmVsO1xuXG4gICAgICAgIHN0YXRlID0gdGhpcy5wYXJzZVN0YXRlU3RyaW5nKHN0YXRlLCBvcHRpb25zKTtcblxuICAgICAgICB0aGlzLm1peEluU3RhbmRhcmRPcHRpb25zKHN0YXRlLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5taXhJbk5vbnN0YW5kYXJkT3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgdGhpcy5jcmVhdGVWaWV3KHN0YXRlKTtcbiAgICAgICAgdGhpcy5sb2FkU3RhdGUoc3RhdGUpO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIGlmIChvbGRFbCkge1xuICAgICAgICAgICAgdmFyIG5ld0VsID0gdGhpcy5lbDtcbiAgICAgICAgICAgIGlmICh0aGlzLnBhcmVudCAmJiBvbGRFbC5wYXJlbnRFbGVtZW50LnRhZ05hbWUgPT09ICdMSScpIHtcbiAgICAgICAgICAgICAgICBvbGRFbCA9IG9sZEVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgbmV3RWwgPSBuZXdFbC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb2xkRWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3RWwsIG9sZEVsKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBDb252ZXJ0IGEgc3RyaW5nIHRvIGEgc3RhdGUgb2JqZWN0LlxuICAgICAqXG4gICAgICogQGRlc2MgVGhleSBzdHJpbmcncyBzeW50YXggaXMgaW5mZXJyZWQgYXMgZm9sbG93czpcbiAgICAgKiAxLiBJZiBzdGF0ZSBpcyB1bmRlZmluZWQgb3IgYWxyZWFkeSBhbiBvYmplY3QsIHJldHVybiBhcyBpcy5cbiAgICAgKiAyLiBJZiBgb3B0aW9ucy5jb250ZXh0YCBpcyBkZWZpbmVkLCBgc3RhdGVgIGlzIGFzc3VtZWQgdG8gYmUgYSBDU1Mgc2VsZWN0b3Igc3RyaW5nIChhdXRvLWRldGVjdGVkKSBwb2ludGluZyB0byBhbiBIVE1MIGZvcm0gY29udHJvbCB3aXRoIGEgYHZhbHVlYCBwcm9wZXJ0eSwgc3VjaCBhcyBhIHtAbGluayBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvSFRNTElucHV0RWxlbWVudCBIVE1MSW5wdXRFbGVtZW50fSBvciBhIHtAbGluayBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvSFRNTFRleHRBcmVhRWxlbWVudCBIVE1MVGV4dEFyZWFFbGVtZW50fS4gVGhlIGVsZW1lbnQgaXMgc2VsZWN0ZWQgYW5kIGlmIGZvdW5kLCBpdHMgdmFsdWUgaXMgZmV0Y2hlZCBmcm9tIHRoZSBET00gYW5kIGFzc2lnbmVkIHRvIGBzdGF0ZWAuXG4gICAgICogMy4gSWYgYG9wdGlvbnMuc3ludGF4YCBpcyBgJ2F1dG8nYCwgSlNPTiBzeW50YXggaXMgZGV0ZWN0ZWQgaWYgYHN0YXRlYCBiZWdpbnMgX2FuZF8gZW5kcyB3aXRoIGVpdGhlciBgW2AgYW5kIGBdYCBfb3JfIGB7YCBhbmQgYH1gIChpZ25vcmluZyBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZSBzcGFjZSkuXG4gICAgICogNC4gSWYgSlNPTiBzeW50YXgsIHBhcnNlIHRoZSBzdHJpbmcgaW50byBhbiBhY3R1YWwgYEZpbHRlclRyZWVTdGF0ZU9iamVjdGAgdXNpbmcge0BsaW5rIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0pTT04vcGFyc2V8SlNPTi5wYXJzZX0gYW5kIHRocm93IGFuIGVycm9yIGlmIHVucGFyc2FibGUuXG4gICAgICogNS4gSWYgbm90IEpTT04sIHBhcnNlIHRoZSBzdHJpbmcgYXMgU1FMIGludG8gYW4gYWN0dWFsIGBGaWx0ZXJUcmVlU3RhdGVPYmplY3RgIHVzaW5nIHBhcnNlci1TUUwncyB7QGxpbmsgUGFyc2VyU1FMI3BhcnNlcnxwYXJzZXJ9IGFuZCB0aHJvdyBhbiBlcnJvciBpZiB1bnBhcnNhYmxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtGaWx0ZXJUcmVlU3RhdGVPYmplY3R9IFtzdGF0ZV1cbiAgICAgKiBAcGFyYW0ge0ZpbHRlclRyZWVTZXRTdGF0ZU9wdGlvbnNPYmplY3R9IFtvcHRpb25zXVxuICAgICAqXG4gICAgICogQHJldHVybnMge0ZpbHRlclRyZWVTdGF0ZU9iamVjdH0gVGhlIHVubW9sZXN0ZWQgYHN0YXRlYCBwYXJhbWV0ZXIuIFRocm93cyBhbiBlcnJvciBpZiBgc3RhdGVgIGlzIHVua25vd24gb3IgaW52YWxpZCBzeW50YXguXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTm9kZSNcbiAgICAgKiBAaW5uZXJcbiAgICAgKi9cbiAgICBwYXJzZVN0YXRlU3RyaW5nOiBmdW5jdGlvbihzdGF0ZSwgb3B0aW9ucykge1xuICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnRleHQgPSBvcHRpb25zICYmIG9wdGlvbnMuY29udGV4dCxcbiAgICAgICAgICAgICAgICAgICAgc3ludGF4ID0gb3B0aW9ucyAmJiBvcHRpb25zLnN5bnRheCB8fCAnYXV0byc7IC8vIGRlZmF1bHQgaXMgJ2F1dG8nXG5cbiAgICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IGNvbnRleHQucXVlcnlTZWxlY3RvcihzdGF0ZSkudmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHN5bnRheCA9PT0gJ2F1dG8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHN5bnRheCA9IHJlSlNPTi50ZXN0KHN0YXRlKSA/ICdKU09OJyA6ICdTUUwnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHN3aXRjaCAoc3ludGF4KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0pTT04nOlxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IEpTT04ucGFyc2Uoc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRmlsdGVyVHJlZUVycm9yKCdKU09OIHBhcnNlcjogJyArIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdTUUwnOlxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IHRoaXMucm9vdC5QYXJzZXJTUUwucGFyc2Uoc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRmlsdGVyVHJlZUVycm9yKCdTUUwgV0hFUkUgY2xhdXNlIHBhcnNlcjogJyArIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBzdGF0ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRmlsdGVyVHJlZUVycm9yKCdVbmV4cGVjdGVkIGlucHV0IHN0YXRlLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZWFjaCBzdGFuZGFyZCBvcHRpb24gZnJvbSB3aGVuIGZvdW5kIG9uIHRoZSBgb3B0aW9uc2Agb3IgYHN0YXRlYCBvYmplY3RzLCByZXNwZWN0aXZlbHk7IG9yIGlmIG5vdCBhbiBcIm93blwiIG9wdGlvbiwgb24gdGhlIGBwYXJlbnRgIG9iamVjdCBvciBmcm9tIHRoZSBvcHRpb25zIHNjaGVtYSBkZWZhdWx0IChpZiBhbnkpXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKi9cbiAgICBtaXhJblN0YW5kYXJkT3B0aW9uczogZnVuY3Rpb24oc3RhdGUsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xuXG4gICAgICAgIF8oRmlsdGVyTm9kZS5vcHRpb25zU2NoZW1hKS5lYWNoKGZ1bmN0aW9uKG9wdGlvblNjaGVtYSwga2V5KSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvblNjaGVtYS5pZ25vcmUgJiYgKHRoaXMgIT09IHRoaXMucm9vdCB8fCBvcHRpb25TY2hlbWEucm9vdEJvdW5kKSkge1xuICAgICAgICAgICAgICAgIHZhciBvcHRpb247XG5cbiAgICAgICAgICAgICAgICBub2RlLmRvbnRQZXJzaXN0W2tleV0gPSAvLyB0cnV0aHkgaWYgZnJvbSBgb3B0aW9uc2Agb3IgYGRlZmF1bHRgXG4gICAgICAgICAgICAgICAgICAgIChvcHRpb24gPSBvcHRpb25zICYmIG9wdGlvbnNba2V5XSkgIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAgICAgICAgICAgICAob3B0aW9uID0gc3RhdGUgJiYgc3RhdGVba2V5XSkgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgICAgICAgICAhKG9wdGlvblNjaGVtYS5vd24gfHwgbm9kZS5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIG9wdGlvbiAhPT0gbnVsbCkgJiZcbiAgICAgICAgICAgICAgICAgICAgIShvcHRpb24gPSBub2RlLnBhcmVudCAmJiBub2RlLnBhcmVudFtrZXldKSAmJlxuICAgICAgICAgICAgICAgICAgICAob3B0aW9uID0gb3B0aW9uU2NoZW1hLmRlZmF1bHQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbm9kZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICBub2RlLmRvbnRQZXJzaXN0W2tleV0gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnc2NoZW1hJyAmJiAhb3B0aW9uLndhbGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGF0dGFjaCB0aGUgYHdhbGtgIGFuZCBgZmluZGAgY29udmVuaWVuY2UgbWV0aG9kcyB0byB0aGUgYHNjaGVtYWAgYXJyYXlcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbi53YWxrID0gcG9wTWVudS53YWxrLmJpbmQob3B0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbi5sb29rdXAgPSBwb3BNZW51Lmxvb2t1cC5iaW5kKG9wdGlvbiwgbm9kZS5yb290LmZpbmRPcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBub2RlW2tleV0gPSBvcHRpb247XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKi9cbiAgICBtaXhJbk5vbnN0YW5kYXJkT3B0aW9uczogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XG5cbiAgICAgICAgLy8gY29weSBhbGwgcmVtYWluaW5nIG9wdGlvbnMgZGlyZWN0bHkgdG8gdGhlIG5ldyBpbnN0YW5jZSwgb3ZlcnJpZGluZyBwcm90b3R5cGUgbWVtYmVycyBvZiB0aGUgc2FtZSBuYW1lXG4gICAgICAgIF8ob3B0aW9ucykuZWFjaChmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICBpZiAoIUZpbHRlck5vZGUub3B0aW9uc1NjaGVtYVtrZXldKSB7XG4gICAgICAgICAgICAgICAgbm9kZVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKiogUmVtb3ZlIGJvdGg6XG4gICAgICogKiBgdGhpc2AgZmlsdGVyIG5vZGUgZnJvbSBpdCdzIGBwYXJlbnRgJ3MgYGNoaWxkcmVuYCBjb2xsZWN0aW9uOyBhbmRcbiAgICAgKiAqIGB0aGlzYCBmaWx0ZXIgbm9kZSdzIGBlbGAncyBjb250YWluZXIgKGFsd2F5cyBhIGA8bGk+YCBlbGVtZW50KSBmcm9tIGl0cyBwYXJlbnQgZWxlbWVudC5cbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTm9kZSNcbiAgICAgKi9cbiAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXZlcnQsXG4gICAgICAgICAgICBwYXJlbnQgPSB0aGlzLnBhcmVudDtcblxuICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5ldmVudEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50SGFuZGxlci5jYWxsKHBhcmVudCwge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGVsZXRlJyxcbiAgICAgICAgICAgICAgICAgICAgcHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCkgeyBhdmVydCA9IHRydWU7IH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYXZlcnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5rZWVwIHx8IC8vIG5ldmVyIFwicHJ1bmVcIiAocmVtb3ZlIGlmIGVtcHR5KSB0aGlzIHBhcnRpY3VsYXIgc3ViZXhwcmVzc2lvblxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQuY2hpbGRyZW4ubGVuZ3RoID4gMSAvLyB0aGlzIG5vZGUgaGFzIHNpYmxpbmdzIHNvIHdpbGwgbm90IGJlIGVtcHR5IGFmdGVyIHRoaXMgcmVtb3ZlXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHByb2NlZWQgd2l0aCByZW1vdmVcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbC5wYXJlbnROb2RlLnJlbW92ZSgpOyAvLyB0aGUgcGFyZW50IGlzIGFsd2F5cyB0aGUgY29udGFpbmluZyA8bGk+IHRhZ1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnQuY2hpbGRyZW4uc3BsaWNlKHBhcmVudC5jaGlsZHJlbi5pbmRleE9mKHRoaXMpLCAxKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyByZWN1cnNlIHRvIHBydW5lIGVudGlyZSBzdWJleHByZXNzaW9uIGJlY2F1c2UgaXQncyBwcnVuZS1hYmxlIGFuZCB3b3VsZCBlbmQgdXAgZW1wdHkgKGNoaWxkbGVzcylcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBXb3JrLWFyb3VuZCBmb3IgYHRoaXMuZWwucXVlcnlTZWxlY3RvcignOnNjb3BlPicgKyBzZWxlY3RvcilgIGJlY2F1c2UgYDpzY29wZWAgbm90IHN1cHBvcnRlZCBpbiBJRTExLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvclxuICAgICAqL1xuICAgIGZpcnN0Q2hpbGRPZlR5cGU6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgIHZhciBlbCA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgIGlmIChlbCAmJiBlbC5wYXJlbnRFbGVtZW50ICE9PSB0aGlzLmVsKSB7XG4gICAgICAgICAgICBlbCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH0sXG5cbiAgICBFcnJvcjogRmlsdGVyVHJlZUVycm9yLFxuXG4gICAgdGVtcGxhdGVzOiBuZXcgVGVtcGxhdGVzKClcbn0pO1xuXG4vKiogQHR5cGVkZWYgb3B0aW9uc1NjaGVtYU9iamVjdFxuICogQHN1bW1hcnkgU3RhbmRhcmQgb3B0aW9uIHNjaGVtYVxuICogQGRlc2MgU3RhbmRhcmQgb3B0aW9ucyBhcmUgYXV0b21hdGljYWxseSBhZGRlZCB0byBub2Rlcy4gRGF0YSBzb3VyY2VzIGZvciBzdGFuZGFyZCBvcHRpb25zIGluY2x1ZGUgYG9wdGlvbnNgLCBgc3RhdGVgLCBgcGFyZW50YCBhbmQgYGRlZmF1bHRgIChpbiB0aGF0IG9yZGVyKS4gRGVzY3JpYmVzIHN0YW5kYXJkIG9wdGlvbnMgdGhyb3VnaCB2YXJpb3VzIHByb3BlcnRpZXM6XG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtpZ25vcmVdIC0gRG8gbm90IGF1dG9tYXRpY2FsbHkgYWRkIHRvIG5vZGVzIChwcm9jZXNzZWQgZWxzZXdoZXJlKS5cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW293bl0gLSBEbyBub3QgYXV0b21hdGljYWxseSBhZGQgZnJvbSBgcGFyZW50YCBvciBgZGVmYXVsdGAuXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtyb290Qm91bmRdIC0gQXV0b21hdGljYWxseSBhZGQgdG8gcm9vdCBub2RlIG9ubHkuXG4gKiBAcHJvcGVydHkgeyp9IFtkZWZhdWx0XSAtIFRoaXMgaXMgdGhlIGRlZmF1bHQgZGF0YSBzb3VyY2Ugd2hlbiBhbGwgb3RoZXIgc3RyYXRlZ2llcyBmYWlsLlxuICovXG5cbi8qKlxuICogQHN1bW1hcnkgRGVmaW5lcyB0aGUgc3RhbmRhcmQgb3B0aW9ucyBhdmFpbGFibGUgdG8gYSBub2RlLlxuICogQGRlc2MgVGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzIGJlYXIgdGhlIHNhbWUgbmFtZXMgYXMgdGhlIG5vZGUgb3B0aW9ucyB0aGV5IGRlZmluZS5cbiAqIEB0eXBlIHtvYmplY3R9XG4gKiBAbWVtYmVyT2YgRmlsdGVyTm9kZVxuICovXG5GaWx0ZXJOb2RlLm9wdGlvbnNTY2hlbWEgPSB7XG5cbiAgICBzdGF0ZTogeyBpZ25vcmU6IHRydWUgfSxcblxuICAgIGNzc1N0eWxlc2hlZXRSZWZlcmVuY2VFbGVtZW50OiB7IGlnbm9yZTogdHJ1ZSB9LFxuXG4gICAgLyoqIEBzdW1tYXJ5IERlZmF1bHQgY29sdW1uIHNjaGVtYSBmb3IgY29sdW1uIGRyb3AtZG93bnMgb2YgZGlyZWN0IGRlc2NlbmRhbnQgbGVhZiBub2RlcyBvbmx5LlxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlI1xuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cbiAgICAgKi9cbiAgICBvd25TY2hlbWE6IHsgb3duOiB0cnVlIH0sXG5cbiAgICAvKiogQHN1bW1hcnkgQ29sdW1uIHNjaGVtYSBmb3IgY29sdW1uIGRyb3AtZG93bnMgb2YgYWxsIGRlc2NlbmRhbnQgbm9kZXMuIFBlcnRhaW5zIHRvIGxlYWYgbm9kZXMgb25seS5cbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTm9kZSNcbiAgICAgKiBAdHlwZSB7bWVudUl0ZW1bXX1cbiAgICAgKi9cbiAgICBzY2hlbWE6IHt9LFxuXG4gICAgLyoqIEBzdW1tYXJ5IEZpbHRlciBlZGl0b3IgZm9yIHVzZXIgaW50ZXJmYWNlLlxuICAgICAqIEBkZXNjIE5hbWUgb2YgZmlsdGVyIGVkaXRvciB1c2VkIGJ5IHRoaXMgYW5kIGFsbCBkZXNjZW5kYW50IG5vZGVzLiBQZXJ0YWlucyB0byBsZWFmIG5vZGVzIG9ubHkuXG4gICAgICogQGRlZmF1bHQgJ0RlZmF1bHQnXG4gICAgICogQG1lbWJlck9mIEZpbHRlck5vZGUjXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBlZGl0b3I6IHt9LFxuXG4gICAgLyoqIEBzdW1tYXJ5IEV2ZW50IGhhbmRsZXIgZm9yIFVJIGV2ZW50cy5cbiAgICAgKiBAZGVzYyBTZWUgKkV2ZW50cyogaW4gdGhlIHtAbGluayBodHRwOi8vam9uZWl0LmdpdGh1Yi5pby9maWx0ZXItdHJlZS9pbmRleC5odG1sfHJlYWRtZX0gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAgICogQG1lbWJlck9mIEZpbHRlck5vZGUjXG4gICAgICogQHR5cGUge2Z1bmN0aW9ufVxuICAgICAqL1xuICAgIGV2ZW50SGFuZGxlcjoge30sXG5cbiAgICAvKiogQHN1bW1hcnkgRmllbGRzIGRhdGEgdHlwZS5cbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTm9kZSNcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHR5cGU6IHsgb3duOiB0cnVlIH0sXG5cbiAgICAvKiogQHN1bW1hcnkgVW5kZWxldGVhYmxlIG5vZGUuXG4gICAgICogQGRlc2MgVHJ1dGh5IG1lYW5zIGRvbid0IHJlbmRlciBhIGRlbGV0ZSBidXR0b24gbmV4dCB0byB0aGUgZmlsdGVyIGVkaXRvciBmb3IgdGhpcyBub2RlLlxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlI1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGtlZXA6IHsgb3duOiB0cnVlIH0sXG5cbiAgICAvKiogQHN1bW1hcnkgT3ZlcnJpZGUgb3BlcmF0b3IgbGlzdCBhdCBhbnkgbm9kZS5cbiAgICAgKiBAZGVzYyBUaGUgZGVmYXVsdCBpcyBhcHBsaWVkIHRvIHRoZSByb290IG5vZGUgYW5kIGFueSBvdGhlciBub2RlIHdpdGhvdXQgYW4gb3BlcmF0b3IgbWVudS5cbiAgICAgKiBAZGVmYXVsdCB7QGxpbmsgQ29uZGl0aW9uYWxzLmRlZmF1bHRPcE1lbnV9LlxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlI1xuICAgICAqIEB0eXBlIHttZW51SXRlbVtdfVxuICAgICAqL1xuICAgIG9wTWVudTogeyBkZWZhdWx0OiBDb25kaXRpb25hbHMuZGVmYXVsdE9wTWVudSB9LFxuXG4gICAgLyoqIEBzdW1tYXJ5IFRydXRoeSBjb25zaWRlcnMgb3AgdmFsaWQgb25seSBpZiBpbiBtZW51LlxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlI1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIG9wTXVzdEJlSW5NZW51OiB7fSxcblxuICAgIC8qKiBAc3VtbWFyeSBEaWN0aW9uYXJ5IG9mIG9wZXJhdG9yIG1lbnVzIGZvciBzcGVjaWZpYyBkYXRhIHR5cGVzLlxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJOb2RlI1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQGRlc2MgQSBoYXNoIG9mIHR5cGUgbmFtZXMuIEVhY2ggbWVtYmVyIHRodXMgZGVmaW5lZCBjb250YWlucyBhIHNwZWNpZmljIG9wZXJhdG9yIG1lbnUgZm9yIGFsbCBkZXNjZW5kYW50IGxlYWYgbm9kZXMgdGhhdDpcbiAgICAgKiAxLiBkbyBub3QgaGF2ZSB0aGVpciBvd24gb3BlcmF0b3IgbWVudSAoYG9wTWVudWAgcHJvcGVydHkpIG9mIHRoZWlyIG93bjsgYW5kXG4gICAgICogMi4gd2hvc2UgY29sdW1ucyByZXNvbHZlIHRvIHRoYXQgdHlwZS5cbiAgICAgKlxuICAgICAqIFRoZSB0eXBlIGlzIGRldGVybWluZWQgYnkgKGluIHByaW9yaXR5IG9yZGVyKTpcbiAgICAgKiAxLiB0aGUgYHR5cGVgIHByb3BlcnR5IG9mIHRoZSB7QGxpbmsgRmlsdGVyTGVhZn07IG9yXG4gICAgICogMi4gdGhlIGB0eXBlYCBwcm9wZXJ0eSBvZiB0aGUgZWxlbWVudCBpbiB0aGUgbmVhcmVzdCBub2RlIChpbmNsdWRpbmcgdGhlIGxlYWYgbm9kZSBpdHNlbGYpIHRoYXQgaGFzIGEgZGVmaW5lZCBgb3duU2NoZW1hYCBvciBgc2NoZW1hYCBhcnJheSBwcm9wZXJ0eSB3aXRoIGFuIGVsZW1lbnQgaGF2aW5nIGEgbWF0Y2hpbmcgY29sdW1uIG5hbWUuXG4gICAgICovXG4gICAgdHlwZU9wTWFwOiB7IHJvb3RCb3VuZDogdHJ1ZSB9LFxuXG4gICAgLyoqIEBzdW1tYXJ5IFRydXRoeSB3aWxsIHNvcnQgdGhlIGNvbHVtbiBtZW51cy5cbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyTm9kZSNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBzb3J0Q29sdW1uTWVudToge31cbn07XG5cbkZpbHRlck5vZGUuc2V0V2FybmluZ0NsYXNzID0gZnVuY3Rpb24oZWwsIHZhbHVlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAgIHZhbHVlID0gZWwudmFsdWU7XG4gICAgfVxuICAgIGVsLmNsYXNzTGlzdFt2YWx1ZSA/ICdyZW1vdmUnIDogJ2FkZCddKCdmaWx0ZXItdHJlZS13YXJuaW5nJyk7XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuRmlsdGVyTm9kZS5jbGlja0luID0gZnVuY3Rpb24oZWwpIHtcbiAgICBpZiAoZWwpIHtcbiAgICAgICAgaWYgKGVsLnRhZ05hbWUgPT09ICdTRUxFQ1QnKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBlbC5kaXNwYXRjaEV2ZW50KG5ldyBNb3VzZUV2ZW50KCdtb3VzZWRvd24nKSk7IH0sIDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWwuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsdGVyTm9kZTtcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4vLyBUaGlzIGlzIHRoZSBtYWluIGZpbGUsIHVzYWJsZSBhcyBpcywgc3VjaCBhcyBieSAvdGVzdC9pbmRleC5qcy5cblxuLy8gRm9yIG5wbTogcmVxdWlyZSB0aGlzIGZpbGVcbi8vIEZvciBDRE46IGd1bHBmaWxlLmpzIGJyb3dzZXJpZmllcyB0aGlzIGZpbGUgd2l0aCBzb3VyY2VtYXAgdG8gL2J1aWxkL2ZpbHRlci10cmVlLmpzIGFuZCB1Z2xpZmllZCB3aXRob3V0IHNvdXJjZW1hcCB0byAvYnVpbGQvZmlsdGVyLXRyZWUubWluLmpzLiBUaGUgQ0ROIGlzIGh0dHBzOi8vam9uZWl0LmdpdGh1Yi5pby9maWx0ZXItdHJlZS5cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcG9wTWVudSA9IHJlcXVpcmUoJ3BvcC1tZW51Jyk7XG52YXIgdW5zdHJ1bmdpZnkgPSByZXF1aXJlKCd1bnN0cnVuZ2lmeScpO1xuXG52YXIgXyA9IHJlcXVpcmUoJ29iamVjdC1pdGVyYXRvcnMnKTtcbnZhciBGaWx0ZXJOb2RlID0gcmVxdWlyZSgnLi9GaWx0ZXJOb2RlJyk7XG52YXIgRmlsdGVyTGVhZiA9IHJlcXVpcmUoJy4vRmlsdGVyTGVhZicpO1xudmFyIG9wZXJhdG9ycyA9IHJlcXVpcmUoJy4vdHJlZS1vcGVyYXRvcnMnKTtcblxuXG52YXIgb3JkaW5hbCA9IDA7XG5cbi8qKiBAY29uc3RydWN0b3JcbiAqIEBzdW1tYXJ5IEFuIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgdGhlIHJvb3Qgbm9kZSBvciBhIGJyYW5jaCBub2RlIGluIGEgZmlsdGVyIHRyZWUuXG4gKiBAZGVzYyBBIG5vZGUgcmVwcmVzZW50aW5nIGEgc3ViZXhwcmVzc2lvbiBpbiB0aGUgZmlsdGVyIGV4cHJlc3Npb24uIE1heSBiZSB0aG91Z2h0IG9mIGFzIGEgcGFyZW50aGVzaXplZCBzdWJleHByZXNzaW9uIGluIGFsZ2VicmFpYyBleHByZXNzaW9uIHN5bnRheC4gQXMgZGlzY3Vzc2VkIHVuZGVyIHtAbGluayBGaWx0ZXJOb2RlfSwgYSBgRmlsdGVyVHJlZWAgaW5zdGFuY2UncyBjaGlsZCBub2RlcyBtYXkgYmUgZWl0aGVyOlxuICogKiBPdGhlciAobmVzdGVkKSBgRmlsdGVyVHJlZWAgKG9yIHN1YmNsYXNzIHRoZXJlb2YpIG5vZGVzIHJlcHJlc2VudGluZyBzdWJleHByZXNzaW9ucy5cbiAqICoge0BsaW5rIEZpbHRlckxlYWZ9IChvciBzdWJjbGFzcyB0aGVyZW9mKSB0ZXJtaW5hbCBub2RlcyByZXByZXNlbnRpbmcgY29uZGl0aW9uYWwgZXhwcmVzc2lvbnMuXG4gKlxuICogVGhlIGBGaWx0ZXJUcmVlYCBvYmplY3QgYWxzbyBoYXMgbWV0aG9kcywgc29tZSBvZiB3aGljaCBvcGVyYXRlIG9uIGEgc3BlY2lmaWMgc3VidHJlZSBpbnN0YW5jZSwgYW5kIHNvbWUgb2Ygd2hpY2ggcmVjdXJzZSB0aHJvdWdoIGFsbCB0aGUgc3VidHJlZSdzIGNoaWxkIG5vZGVzIGFuZCBhbGwgdGhlaXIgZGVzY2VuZGFudHMsIF9ldGMuX1xuICpcbiAqIFRoZSByZWN1cnNpdmUgbWV0aG9kcyBhcmUgaW50ZXJlc3RpbmcuIFRoZXkgYWxsIHdvcmsgc2ltaWxhcmx5LCBsb29waW5nIHRocm91Z2ggdGhlIGxpc3Qgb2YgY2hpbGQgbm9kZXMsIHJlY3Vyc2luZyB3aGVuIHRoZSBjaGlsZCBub2RlIGlzIGEgbmVzdGVkIHN1YnRyZWUgKHdoaWNoIHdpbGwgcmVjdXJzZSBmdXJ0aGVyIHdoZW4gaXQgaGFzIGl0cyBvd24gbmVzdGVkIHN1YnRyZWVzKTsgYW5kIGNhbGxpbmcgdGhlIHBvbHltb3JwaGljIG1ldGhvZCB3aGVuIHRoZSBjaGlsZCBub2RlIGlzIGEgYEZpbHRlckxlYWZgIG9iamVjdCwgd2hpY2ggaXMgYSB0ZXJtaW5hbCBub2RlLiBTdWNoIHBvbHltb3JwaGljIG1ldGhvZHMgaW5jbHVkZSBgc2V0U3RhdGUoKWAsIGBnZXRTdGF0ZSgpYCwgYGludmFsaWQoKWAsIGFuZCBgdGVzdCgpYC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgY2FsbGluZyBgdGVzdChkYXRhUm93KWAgb24gdGhlIHJvb3QgdHJlZSByZWN1cnNlcyB0aHJvdWdoIGFueSBzdWJ0cmVlcyBldmVudHVhbGx5IGNhbGxpbmcgYHRlc3QoZGF0YVJvdylgIG9uIGVhY2ggb2YgaXRzIGxlYWYgbm9kZXMgYW5kIGNvbmNhdGVuYXRpbmcgdGhlIHJlc3VsdHMgdG9nZXRoZXIgdXNpbmcgdGhlIHN1YnRyZWUncyBgb3BlcmF0b3JgLiBUaGUgc3VidHJlZSdzIGB0ZXN0KGRhdGFSb3cpYCBjYWxsIHRoZW4gcmV0dXJucyB0aGUgcmVzdWx0IHRvIGl0J3MgcGFyZW50J3MgYHRlc3QoKWAgY2FsbCwgX2V0Yy4sXyBldmVudHVhbGx5IGJ1YmJsaW5nIHVwIHRvIHRoZSByb290IG5vZGUncyBgdGVzdChkYXRhUm93KWAgY2FsbCwgd2hpY2ggcmV0dXJucyB0aGUgZmluYWwgcmVzdWx0IHRvIHRoZSBvcmlnaW5hbCBjYWxsZXIuIFRoaXMgcmVzdWx0IGRldGVybWluZXMgaWYgdGhlIGdpdmVuIGRhdGEgcm93IHBhc3NlZCB0aHJvdWdoIHRoZSBlbnRpcmUgZmlsdGVyIGV4cHJlc3Npb24gc3VjY2Vzc2Z1bGx5IChgdHJ1ZWApIGFuZCBzaG91bGQgYmUgZGlzcGxheWVkLCBvciB3YXMgYmxvY2tlZCBzb21ld2hlcmUgKGBmYWxzZWApIGFuZCBzaG91bGQgbm90IGJlIGRpc3BsYXllZC5cbiAqXG4gKiBOb3RlIHRoYXQgaW4gcHJhY3RpY2U6XG4gKiAxLiBgY2hpbGRyZW5gIG1heSBiZSBlbXB0eS4gVGhpcyByZXByZXNlbnRzIGEgYW4gZW1wdHkgc3ViZXhwcmVzc2lvbi4gTm9ybWFsbHkgcG9pbnRsZXNzLCBlbXB0eSBzdWJleHByZXNzaW9ucyBjb3VsZCBiZSBwcnVuZWQuIEZpbHRlci10cmVlIGFsbG93cyB0aGVtIGhvd2V2ZXIgYXMgaGFybWxlc3MgcGxhY2Vob2xkZXJzLlxuICogMS4gYG9wZXJhdG9yYCBtYXkgYmUgb21pdHRlZCBpbiB3aGljaCBjYXNlIGl0IGRlZmF1bHRzIHRvIEFORC5cbiAqIDEuIEEgYGZhbHNlYCByZXN1bHQgZnJvbSBhIGNoaWxkIG5vZGUgd2lsbCBzaG9ydC1zdG9wIGFuIEFORCBvcGVyYXRpb247IGEgYHRydWVgIHJlc3VsdCB3aWxsIHNob3J0LXN0b3AgYW4gT1Igb3IgTk9SIG9wZXJhdGlvbi5cbiAqXG4gKiBBZGRpdGlvbmFsIG5vdGVzOlxuICogMS4gQSBgRmlsdGVyVHJlZWAgbWF5IGNvbnNpc3Qgb2YgYSBzaW5nbGUgbGVhZiwgaW4gd2hpY2ggY2FzZSB0aGUgY29uY2F0ZW5hdGlvbiBgb3BlcmF0b3JgIGlzIG5vdCBuZWVkZWQgYW5kIG1heSBiZSBsZWZ0IHVuZGVmaW5lZC4gSG93ZXZlciwgaWYgYSBzZWNvbmQgY2hpbGQgaXMgYWRkZWQgYW5kIHRoZSBvcGVyYXRvciBpcyBzdGlsbCB1bmRlZmluZWQsIGl0IHdpbGwgYmUgc2V0IHRvIHRoZSBkZWZhdWx0IChgJ29wLWFuZCdgKS5cbiAqIDIuIFRoZSBvcmRlciBvZiB0aGUgY2hpbGRyZW4gaXMgdW5kZWZpbmVkIGFzIGFsbCBvcGVyYXRvcnMgYXJlIGNvbW11dGF0aXZlLiBGb3IgdGhlICdgb3Atb3JgJyBvcGVyYXRvciwgZXZhbHVhdGlvbiBjZWFzZXMgb24gdGhlIGZpcnN0IHBvc2l0aXZlIHJlc3VsdCBhbmQgZm9yIGVmZmljaWVuY3ksIGFsbCBzaW1wbGUgY29uZGl0aW9uYWwgZXhwcmVzc2lvbnMgd2lsbCBiZSBldmFsdWF0ZWQgYmVmb3JlIGFueSBjb21wbGV4IHN1YmV4cHJlc3Npb25zLlxuICogMy4gQSBuZXN0ZWQgYEZpbHRlclRyZWVgIGlzIGRpc3Rpbmd1aXNoZWQgKGR1Y2stdHlwZWQpIGZyb20gYSBsZWFmIG5vZGUgYnkgdGhlIHByZXNlbmNlIG9mIGEgYGNoaWxkcmVuYCBtZW1iZXIuXG4gKiA0LiBOZXN0aW5nIGEgYEZpbHRlclRyZWVgIGNvbnRhaW5pbmcgYSBzaW5nbGUgY2hpbGQgaXMgdmFsaWQgKGFsYmVpdCBwb2ludGxlc3MpLlxuICpcbiAqICoqU2VlIGFsc28gdGhlIHByb3BlcnRpZXMgb2YgdGhlIHN1cGVyY2xhc3M6Kioge0BsaW5rIEZpbHRlck5vZGV9XG4gKlxuICogQHByb3BlcnR5IHtzdHJpbmd9IFtvcGVyYXRvcj0nb3AtYW5kJ10gLSBUaGUgb3BlcmF0b3IgdGhhdCBjb25jYXRlbnRhdGVzIHRoZSB0ZXN0IHJlc3VsdHMgZnJvbSBhbGwgdGhlIG5vZGUncyBgY2hpbGRyZW5gIChjaGlsZCBub2RlcykuIE11c3QgYmUgb25lIG9mOlxuICogKiBgJ29wLWFuZCdgXG4gKiAqIGAnb3Atb3InYFxuICogKiBgJ29wLW5vcidgXG4gKlxuICogTm90ZSB0aGF0IHRoZXJlIGlzIG9ubHkgb25lIGBvcGVyYXRvcmAgcGVyIHN1YmV4cHJlc3Npb24uIElmIHlvdSBuZWVkIHRvIG1peCBvcGVyYXRvcnMsIGNyZWF0ZSBhIHN1Ym9yZGluYXRlIHN1YmV4cHJlc3Npb24gYXMgb25lIG9mIHRoZSBjaGlsZCBub2Rlcy5cbiAqXG4gKiBAcHJvcGVydHkge0ZpbHRlck5vZGVbXX0gY2hpbGRyZW4gLSBBIGxpc3Qgb2YgZGVzY2VuZGFudHMgb2YgdGhpcyBub2RlLiBBcyBub3RlZCwgdGhlc2UgbWF5IGJlIG90aGVyIGBGaWx0ZXJUcmVlYCAob3Igc3ViY2xhc3MgdGhlcmVvZikgbm9kZXM7IG9yIG1heSBiZSB0ZXJtaW5hbCBgRmlsdGVyTGVhZmAgKG9yIHN1YmNsYXNzIHRoZXJlb2YpIG5vZGVzLiBNYXkgYmUgYW55IGxlbmd0aCBpbmNsdWRpbmcgMCAobm9uZTsgZW1wdHkpLlxuICpcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2tlZXA9ZmFsc2VdIC0gRG8gbm90IGF1dG9tYXRpY2FsbHkgcHJ1bmUgd2hlbiBsYXN0IGNoaWxkIHJlbW92ZWQuXG4gKlxuICogQHByb3BlcnR5IHtmaWVsZEl0ZW1bXX0gW293blNjaGVtYV0gLSBDb2x1bW4gbWVudSB0byBiZSB1c2VkIG9ubHkgYnkgbGVhZiBub2RlcyB0aGF0IGFyZSBjaGlsZHJlbiAoZGlyZWN0IGRlc2NlbmRhbnRzKSBvZiB0aGlzIG5vZGUuXG4gKlxuICogQHByb3BlcnR5IHtzdHJpbmd9IFt0eXBlPSdzdWJ0cmVlJ10gLSBUeXBlIG9mIG5vZGUsIGZvciByZW5kZXJpbmcgcHVycG9zZXM7IG5hbWVzIHRoZSByZW5kZXJpbmcgdGVtcGxhdGUgdG8gdXNlIHRvIGdlbmVyYXRlIHRoZSBub2RlJ3MgVUkgcmVwcmVzZW50YXRpb24uXG4gKi9cbnZhciBGaWx0ZXJUcmVlID0gRmlsdGVyTm9kZS5leHRlbmQoJ0ZpbHRlclRyZWUnLCB7XG5cbiAgICAvKipcbiAgICAgKiBIYXNoIG9mIGNvbnN0cnVjdG9ycyBmb3Igb2JqZWN0cyB0aGF0IGV4dGVuZCBmcm9tIHtAbGluayBGaWx0ZXJMZWFmfSwgd2hpY2ggaXMgdGhlIGBEZWZhdWx0YCBtZW1iZXIgaGVyZS5cbiAgICAgKlxuICAgICAqIEFkZCBhZGRpdGlvbmFsIGVkaXRvcnMgdG8gdGhpcyBvYmplY3QgKGluIHRoZSBwcm90b3R5cGUpIHByaW9yIHRvIGluc3RhbnRpYXRpbmcgYSBsZWFmIG5vZGUgdGhhdCByZWZlcnMgdG8gaXQuIFRoaXMgb2JqZWN0IGV4aXN0cyBpbiB0aGUgcHJvdG90eXBlIGFuZCBhZGRpdGlvbnMgdG8gaXQgd2lsbCBhZmZlY3QgYWxsIG5vZGVzIHRoYXQgZG9uJ3QgaGF2ZSB0aGVpciBhbiBcIm93blwiIGhhc2guXG4gICAgICpcbiAgICAgKiBJZiB5b3UgY3JlYXRlIGFuIFwib3duXCIgaGFzaCBpbiB5b3VyIGluc3RhbmNlIGJlIHN1cmUgdG8gaW5jbHVkZSB0aGUgZGVmYXVsdCBlZGl0b3IsIGZvciBleGFtcGxlOiBgeyBEZWZhdWx0OiBGaWx0ZXJUcmVlLnByb3RvdHlwZS5lZGl0b3JzLkRlZmF1bHQsIC4uLiB9YC4gKE9uZSB3YXkgb2Ygb3ZlcnJpZGluZyB3b3VsZCBiZSB0byBpbmNsdWRlIHN1Y2ggYW4gb2JqZWN0IGluIGFuIGBlZGl0b3JzYCBtZW1iZXIgb2YgdGhlIG9wdGlvbnMgb2JqZWN0IHBhc3NlZCB0byB0aGUgY29uc3RydWN0b3Igb24gaW5zdGFudGlhdGlvbi4gVGhpcyB3b3JrcyBiZWNhdXNlIGFsbCBtaXNjZWxsYW5lb3VzIG1lbWJlcnMgYXJlIHNpbXBseSBjb3BpZWQgdG8gdGhlIG5ldyBpbnN0YW5jZS4gTm90IHRvIGJlIGNvbmZ1c2VkIHdpdGggdGhlIHN0YW5kYXJkIG9wdGlvbiBgZWRpdG9yYCB3aGljaCBpcyBhIHN0cmluZyBjb250YWluaW5nIGEga2V5IGZyb20gdGhpcyBoYXNoIGFuZCB0ZWxscyB0aGUgbGVhZiBub2RlIHdoYXQgdHlwZSB0byB1c2UuKVxuICAgICAqL1xuICAgIGVkaXRvcnM6IHtcbiAgICAgICAgRGVmYXVsdDogRmlsdGVyTGVhZlxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBbiBleHRlbnNpb24gaXMgYSBoYXNoIG9mIHByb3RvdHlwZSBvdmVycmlkZXMgKG1ldGhvZHMsIHByb3BlcnRpZXMpIHVzZWQgdG8gZXh0ZW5kIHRoZSBkZWZhdWx0IGVkaXRvci5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2tleT0nRGVmYXVsdCddIC0gTm1lIG9mIHRoZSBuZXcgZXh0ZW5zaW9uIGdpdmVuIGluIGBleHRgIG9yIG5hbWUgb2YgYW4gZXhpc3RpbmcgZXh0ZW5zaW9uIGluIGBGaWx0ZXJUcmVlLmV4dGVuc2lvbnNgLiBBcyBhIGNvbnN0cnVjdG9yLCBzaG91bGQgaGF2ZSBhbiBpbml0aWFsIGNhcGl0YWwuIElmIG9taXR0ZWQsIHJlcGxhY2VzIHRoZSBkZWZhdWx0IGVkaXRvciAoRmlsdGVyTGVhZikuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtleHRdIEFuIGV4dGVuc2lvbiBoYXNoXG4gICAgICogQHBhcmFtIHtGaWxlckxlYWZ9IFtCYXNlRWRpdG9yPXRoaXMuZWRpdG9ycy5EZWZhdWx0XSAtIENvbnN0cnVjdG9yIHRvIGV4dGVuZCBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtGaWxsdGVyTGVhZn0gQSBuZXcgY2xhc3MgZXh0ZW5kZWQgZnJvbSBgQmFzZUVkaXRvcmAgLS0gd2hpY2ggaXMgaW5pdGlhbGx5IGBGaWx0ZXJMZWFmYCBidXQgbWF5IGl0c2VsZiBoYXZlIGJlZW4gZXh0ZW5kZWQgYnkgYSBjYWxsIHRvIGAuYWRkRWRpdG9yKCdEZWZhdWx0JywgZXh0ZW5zaW9uKWAuXG4gICAgICovXG4gICAgYWRkRWRpdG9yOiBmdW5jdGlvbihrZXksIGV4dCwgQmFzZUVkaXRvcikge1xuICAgICAgICBpZiAodHlwZW9mIGtleSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIC8vIGBrZXlgIChzdHJpbmcpIHdhcyBvbWl0dGVkXG4gICAgICAgICAgICBCYXNlRWRpdG9yID0gZXh0O1xuICAgICAgICAgICAgZXh0ID0ga2V5O1xuICAgICAgICAgICAga2V5ID0gJ0RlZmF1bHQnO1xuICAgICAgICB9XG4gICAgICAgIEJhc2VFZGl0b3IgPSBCYXNlRWRpdG9yIHx8IHRoaXMuZWRpdG9ycy5EZWZhdWx0O1xuICAgICAgICBleHQgPSBleHQgfHwgRmlsdGVyVHJlZS5leHRlbnNpb25zW2tleV07XG4gICAgICAgIHJldHVybiAodGhpcy5lZGl0b3JzW2tleV0gPSBCYXNlRWRpdG9yLmV4dGVuZChrZXksIGV4dCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gVGhlIG5hbWUgb2YgdGhlIGV4aXN0aW5nIGVkaXRvciB0byByZW1vdmUuXG4gICAgICogQG1lbWJlck9mIEZpbHRlclRyZWUjXG4gICAgICovXG4gICAgcmVtb3ZlRWRpdG9yOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKGtleSA9PT0gJ0RlZmF1bHQnKSB7XG4gICAgICAgICAgICB0aHJvdyAnQ2Fubm90IHJlbW92ZSBkZWZhdWx0IGVkaXRvci4nO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSB0aGlzLmVkaXRvcnNba2V5XTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyVHJlZSNcbiAgICAgKi9cbiAgICBjcmVhdGVWaWV3OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5lbCA9IHRoaXMudGVtcGxhdGVzLmdldChcbiAgICAgICAgICAgIHRoaXMudHlwZSB8fCAnc3VidHJlZScsXG4gICAgICAgICAgICArK29yZGluYWwsXG4gICAgICAgICAgICB0aGlzLnNjaGVtYVswXSAmJiBwb3BNZW51LmZvcm1hdEl0ZW0odGhpcy5zY2hlbWFbMF0pXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQWRkIHRoZSBleHByZXNzaW9uIGVkaXRvcnMgdG8gdGhlIFwiYWRkIG5ld1wiIGRyb3AtZG93blxuICAgICAgICB2YXIgYWRkTmV3Q3RybCA9IHRoaXMuZmlyc3RDaGlsZE9mVHlwZSgnc2VsZWN0Jyk7XG4gICAgICAgIGlmIChhZGROZXdDdHJsKSB7XG4gICAgICAgICAgICB2YXIgc3VibWVudSwgb3B0Z3JvdXAsXG4gICAgICAgICAgICAgICAgZWRpdG9ycyA9IHRoaXMuZWRpdG9ycztcblxuICAgICAgICAgICAgaWYgKGFkZE5ld0N0cmwubGVuZ3RoID09PSAxICYmIHRoaXMuZWRpdG9ycy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGVkaXRvciBpcyB0aGUgb25seSBvcHRpb24gYmVzaWRlcyB0aGUgbnVsbCBwcm9tcHQgb3B0aW9uXG4gICAgICAgICAgICAgICAgLy8gc28gbWFrZSBpdCB0aCBlb25seSBpdGVtIGkgdGhlIGRyb3AtZG93blxuICAgICAgICAgICAgICAgIHN1Ym1lbnUgPSBhZGROZXdDdHJsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB0aGVyZSBhcmUgYWxyZWFkeSBvcHRpb25zIGFuZC9vciBtdWx0aXBsZSBlZGl0b3JzXG4gICAgICAgICAgICAgICAgc3VibWVudSA9IG9wdGdyb3VwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0Z3JvdXAnKTtcbiAgICAgICAgICAgICAgICBvcHRncm91cC5sYWJlbCA9ICdDb25kaXRpb25hbCBFeHByZXNzaW9ucyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhlZGl0b3JzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gZWRpdG9yc1trZXldLnByb3RvdHlwZS5uYW1lIHx8IGtleTtcbiAgICAgICAgICAgICAgICBzdWJtZW51LmFwcGVuZENoaWxkKG5ldyBPcHRpb24obmFtZSwga2V5KSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChvcHRncm91cCkge1xuICAgICAgICAgICAgICAgIGFkZE5ld0N0cmwuYWRkKG9wdGdyb3VwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgb25jaGFuZ2UuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgb25UcmVlT3BDbGljay5iaW5kKHRoaXMpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyVHJlZSNcbiAgICAgKi9cbiAgICBsb2FkU3RhdGU6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICAgIHRoaXMub3BlcmF0b3IgPSAnb3AtYW5kJztcbiAgICAgICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuXG4gICAgICAgIGlmICghc3RhdGUpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBgc3RhdGUuY2hpbGRyZW5gIChyZXF1aXJlZClcbiAgICAgICAgICAgIGlmICghKHN0YXRlLmNoaWxkcmVuIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IHRoaXMuRXJyb3IoJ0V4cGVjdGVkIGBjaGlsZHJlbmAgcHJvcGVydHkgdG8gYmUgYW4gYXJyYXkuJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIGBzdGF0ZS5vcGVyYXRvcmAgKGlmIGdpdmVuKVxuICAgICAgICAgICAgaWYgKHN0YXRlLm9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvcGVyYXRvcnNbc3RhdGUub3BlcmF0b3JdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyB0aGlzLkVycm9yKCdFeHBlY3RlZCBgb3BlcmF0b3JgIHByb3BlcnR5IHRvIGJlIG9uZSBvZjogJyArIE9iamVjdC5rZXlzKG9wZXJhdG9ycykpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMub3BlcmF0b3IgPSBzdGF0ZS5vcGVyYXRvcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RhdGUuY2hpbGRyZW4uZm9yRWFjaCh0aGlzLmFkZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJUcmVlI1xuICAgICAqL1xuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByYWRpb0J1dHRvbiA9IHRoaXMuZmlyc3RDaGlsZE9mVHlwZSgnbGFiZWwgPiBpbnB1dFt2YWx1ZT0nICsgdGhpcy5vcGVyYXRvciArICddJyksXG4gICAgICAgICAgICBhZGRGaWx0ZXJMaW5rID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCcuZmlsdGVyLXRyZWUtYWRkLWNvbmRpdGlvbmFsJyk7XG5cbiAgICAgICAgaWYgKHJhZGlvQnV0dG9uKSB7XG4gICAgICAgICAgICByYWRpb0J1dHRvbi5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIG9uVHJlZU9wQ2xpY2suY2FsbCh0aGlzLCB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiByYWRpb0J1dHRvblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB3aGVuIG11bHRpcGxlIGZpbHRlciBlZGl0b3JzIGF2YWlsYWJsZSwgc2ltdWxhdGUgY2xpY2sgb24gdGhlIG5ldyBcImFkZCBjb25kaXRpb25hbFwiIGxpbmtcbiAgICAgICAgaWYgKGFkZEZpbHRlckxpbmsgJiYgIXRoaXMuY2hpbGRyZW4ubGVuZ3RoICYmIE9iamVjdC5rZXlzKHRoaXMuZWRpdG9ycykubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdGhpc1snZmlsdGVyLXRyZWUtYWRkLWNvbmRpdGlvbmFsJ10oe1xuICAgICAgICAgICAgICAgIHRhcmdldDogYWRkRmlsdGVyTGlua1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwcm9jZWVkIHdpdGggcmVuZGVyXG4gICAgICAgIEZpbHRlck5vZGUucHJvdG90eXBlLnJlbmRlci5jYWxsKHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBDcmVhdGUgYSBuZXcgbm9kZSBhcyBwZXIgYHN0YXRlYC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9ucz17c3RhdGU6e319XSAtIE1heSBiZSBvbmUgb2Y6XG4gICAgICpcbiAgICAgKiAqIGFuIGBvcHRpb25zYCBvYmplY3QgY29udGFpbmluZyBhIGBzdGF0ZWAgcHJvcGVydHlcbiAgICAgKiAqIGEgYHN0YXRlYCBvYmplY3QgKGluIHdoaWNoIGNhc2UgdGhlcmUgaXMgbm8gYG9wdGlvbnNgIG9iamVjdClcbiAgICAgKlxuICAgICAqIEluIGFueSBjYXNlLCByZXN1bHRpbmcgYHN0YXRlYCBvYmplY3QgbWF5IGJlIGVpdGhlci4uLlxuICAgICAqICogQSBuZXcgc3VidHJlZSAoaGFzIGEgYGNoaWxkcmVuYCBwcm9wZXJ0eSk6XG4gICAgICogICBBZGQgYSBuZXcgYEZpbHRlclRyZWVgIG5vZGUuXG4gICAgICogKiBBIG5ldyBsZWFmIChubyBgY2hpbGRyZW5gIHByb3BlcnR5KTogYWRkIGEgbmV3IGBGaWx0ZXJMZWFmYCBub2RlOlxuICAgICAqICAgKiBJZiB0aGVyZSBpcyBhbiBgZWRpdG9yYCBwcm9wZXJ0eTpcbiAgICAgKiAgICAgQWRkIGxlYWYgdXNpbmcgYHRoaXMuZWRpdG9yc1tzdGF0ZS5lZGl0b3JdYC5cbiAgICAgKiAgICogT3RoZXJ3aXNlIChpbmNsdWRpbmcgdGhlIGNhc2Ugd2hlcmUgYHN0YXRlYCBpcyB1bmRlZmluZWQpOlxuICAgICAqICAgICBBZGQgbGVhZiB1c2luZyBgdGhpcy5lZGl0b3JzLkRlZmF1bHRgLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5mb2N1cz1mYWxzZV0gQ2FsbCBpbnZhbGlkKCkgYWZ0ZXIgaW5zZXJ0aW5nIHRvIGZvY3VzIG9uIGZpcnN0IGJsYW5rIGNvbnRyb2wgKGlmIGFueSkuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7RmlsdGVyTm9kZX0gVGhlIG5ldyBub2RlLlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIEZpbHRlclRyZWUjXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBDb25zdHJ1Y3RvciwgbmV3Tm9kZTtcblxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICBpZiAoIW9wdGlvbnMuc3RhdGUpIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7IHN0YXRlOiBvcHRpb25zIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5zdGF0ZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgQ29uc3RydWN0b3IgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ29uc3RydWN0b3IgPSB0aGlzLmVkaXRvcnNbb3B0aW9ucy5zdGF0ZS5lZGl0b3IgfHwgJ0RlZmF1bHQnXTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wdGlvbnMucGFyZW50ID0gdGhpcztcbiAgICAgICAgbmV3Tm9kZSA9IG5ldyBDb25zdHJ1Y3RvcihvcHRpb25zKTtcbiAgICAgICAgdGhpcy5jaGlsZHJlbi5wdXNoKG5ld05vZGUpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLmZvY3VzKSB7XG4gICAgICAgICAgICAvLyBmb2N1cyBvbiBibGFuayBjb250cm9sIGEgYmVhdCBhZnRlciBhZGRpbmcgaXRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IG5ld05vZGUuaW52YWxpZChvcHRpb25zKTsgfSwgNzUwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXdOb2RlO1xuICAgIH0sXG5cbiAgICAvKiogQHR5cGVkZWYge29iamVjdH0gRmlsdGVyVHJlZVZhbGlkYXRpb25PcHRpb25zT2JqZWN0XG4gICAgICogQHByb3BlcnR5IHtib29sZWFufSBbdGhyb3c9ZmFsc2VdIC0gVGhyb3cgKGRvIG5vdCBjYXRjaCkgYEZpbHRlclRyZWVFcnJvcmBzLlxuICAgICAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2FsZXJ0PWZhbHNlXSAtIEFubm91bmNlIGVycm9yIHZpYSB3aW5kb3cuYWxlcnQoKSBiZWZvcmUgcmV0dXJuaW5nLlxuICAgICAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2ZvY3VzPWZhbHNlXSAtIFBsYWNlIHRoZSBmb2N1cyBvbiB0aGUgb2ZmZW5kaW5nIGNvbnRyb2wgYW5kIGdpdmUgaXQgZXJyb3IgY29sb3IuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge0ZpbHRlclRyZWVWYWxpZGF0aW9uT3B0aW9uc09iamVjdH0gW29wdGlvbnNdXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZHxGaWx0ZXJUcmVlRXJyb3J9IGB1bmRlZmluZWRgIGlmIHZhbGlkOyBvciB0aGUgY2F1Z2h0IGBGaWx0ZXJUcmVlRXJyb3JgIGlmIGVycm9yLlxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJUcmVlI1xuICAgICAqL1xuICAgIGludmFsaWQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgdmFyIHJlc3VsdCwgdGhyb3dXYXM7XG5cbiAgICAgICAgdGhyb3dXYXMgPSBvcHRpb25zLnRocm93O1xuICAgICAgICBvcHRpb25zLnRocm93ID0gdHJ1ZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaW52YWxpZC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGVycjtcblxuICAgICAgICAgICAgLy8gVGhyb3cgd2hlbiB1bmV4cGVjdGVkIChub3QgYSBmaWx0ZXIgdHJlZSBlcnJvcilcbiAgICAgICAgICAgIGlmICghKGVyciBpbnN0YW5jZW9mIHRoaXMuRXJyb3IpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgb3B0aW9ucy50aHJvdyA9IHRocm93V2FzO1xuXG4gICAgICAgIC8vIEFsdGVyIGFuZC9vciB0aHJvdyB3aGVuIHJlcXVlc3RlZFxuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5hbGVydCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hbGVydChyZXN1bHQubWVzc2FnZSB8fCByZXN1bHQpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWFsZXJ0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob3B0aW9ucy50aHJvdykge1xuICAgICAgICAgICAgICAgIHRocm93IHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGFSb3dcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKiBAbWVtYmVyT2YgRmlsdGVyVHJlZSNcbiAgICAgKi9cbiAgICB0ZXN0OiBmdW5jdGlvbiB0ZXN0KGRhdGFSb3cpIHtcbiAgICAgICAgdmFyIG9wZXJhdG9yID0gb3BlcmF0b3JzW3RoaXMub3BlcmF0b3JdLFxuICAgICAgICAgICAgcmVzdWx0ID0gb3BlcmF0b3Iuc2VlZCxcbiAgICAgICAgICAgIG5vQ2hpbGRyZW5EZWZpbmVkID0gdHJ1ZTtcblxuICAgICAgICB0aGlzLmNoaWxkcmVuLmZpbmQoZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICAgICAgICAgIG5vQ2hpbGRyZW5EZWZpbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgRmlsdGVyTGVhZikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBvcGVyYXRvci5yZWR1Y2UocmVzdWx0LCBjaGlsZC50ZXN0KGRhdGFSb3cpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoaWxkLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBvcGVyYXRvci5yZWR1Y2UocmVzdWx0LCB0ZXN0LmNhbGwoY2hpbGQsIGRhdGFSb3cpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCA9PT0gb3BlcmF0b3IuYWJvcnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIG5vQ2hpbGRyZW5EZWZpbmVkIHx8IChvcGVyYXRvci5uZWdhdGUgPyAhcmVzdWx0IDogcmVzdWx0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge251bWJlcn0gTnVtYmVyIG9mIGZpbHRlcnMgKHRlcm1pbmFsIG5vZGVzKSBkZWZpbmVkIGluIHRoaXMgc3VidHJlZS5cbiAgICAgKi9cbiAgICBmaWx0ZXJDb3VudDogZnVuY3Rpb24gZmlsdGVyQ291bnQoKSB7XG4gICAgICAgIHZhciBuID0gMDtcblxuICAgICAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIG4gKz0gY2hpbGQgaW5zdGFuY2VvZiBGaWx0ZXJMZWFmID8gMSA6IGZpbHRlckNvdW50LmNhbGwoY2hpbGQpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gbjtcbiAgICB9LFxuXG4gICAgLyoqIEB0eXBlZGVmIHtvYmplY3R9IEZpbHRlclRyZWVHZXRTdGF0ZU9wdGlvbnNPYmplY3RcbiAgICAgKlxuICAgICAqIEBzdW1tYXJ5IE9iamVjdCBjb250YWluaW5nIG9wdGlvbnMgZm9yIHByb2R1Y2luZyBhIHN0YXRlIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBkZXNjIFN0YXRlIGlzIGNvbW1vbmx5IHVzZWQgZm9yIHR3byBwdXJwb3NlczpcbiAgICAgKiAxLiBUbyBwZXJzaXN0IHRoZSBmaWx0ZXIgc3RhdGUgc28gdGhhdCBpdCBjYW4gYmUgcmVsb2FkZWQgbGF0ZXIuXG4gICAgICogMi4gVG8gc2VuZCBhIHF1ZXJ5IHRvIGEgZGF0YWJhc2UgZW5naW5lLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHtib29sZWFufSBbc3ludGF4PSdvYmplY3QnXSAtIEEgY2FzZS1zZW5zaXRpdmUgc3RyaW5nIGluZGljYXRpbmcgdGhlIGV4cGVjdGVkIHR5cGUgYW5kIGZvcm1hdCBvZiBhIHN0YXRlIG9iamVjdCB0byBiZSBnZW5lcmF0ZWQgZnJvbSBhIGZpbHRlciB0cmVlLiBPbmUgb2Y6XG4gICAgICogKiBgJ29iamVjdCdgIChkZWZhdWx0KSBBIHJhdyBzdGF0ZSBvYmplY3QgcHJvZHVjZWQgYnkgd2Fsa2luZyB0aGUgdHJlZSB1c2luZyBge0BsaW5rIGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL3Vuc3RydW5naWZ5fHVuc3RydW5naWZ5KCl9YCwgcmVzcGVjdGluZyBgSlNPTi5zdHJpbmdpZnkoKWAncyBcIntAbGluayBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9KU09OL3N0cmluZ2lmeSN0b0pTT04oKV9iZWhhdmlvcnx0b0pTT04oKSBiZWhhdmlvcn0sXCIgYW5kIHJldHVybmluZyBhIHBsYWluIG9iamVjdCBzdWl0YWJsZSBmb3IgcmVzdWJtaXR0aW5nIHRvIHtAbGluayBGaWx0ZXJOb2RlI3NldFN0YXRlfHNldFN0YXRlfS4gVGhpcyBpcyBhbiBcImVzc2VudGlhbFwiIHZlcnNpb24gb2YgdGhlIGFjdHVhbCBub2RlIG9iamVjdHMgaW4gdGhlIHRyZWUuXG4gICAgICogKiBgJ0pTT04nYCAtIEEgc3RyaW5naWZpZWQgc3RhdGUgb2JqZWN0IHByb2R1Y2VkIGJ5IHdhbGtpbmcgdGhlIHRyZWUgdXNpbmcgYHtAbGluayBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9KU09OL3N0cmluZ2lmeSN0b0pTT04oKV9iZWhhdmlvcnxKU09OLnN0cmluZ2lmeSgpfWAsIHJldHVybmluZyBhIEpTT04gc3RyaW5nIGJ5IGNhbGxpbmcgYHRvSlNPTmAgYXQgZXZlcnkgbm9kZS4gVGhpcyBpcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgc2FtZSBcImVzc2VudGlhbFwiIG9iamVjdCBhcyB0aGF0IHByb2R1Y2VkIGJ5IHRoZSBgJ29iamVjdCdgIG9wdGlvbiwgYnV0IFwic3RyaW5naWZpZWRcIiBhbmQgdGhlcmVmb3JlIHN1aXRhYmxlIGZvciB0ZXh0LWJhc2VkIHN0b3JhZ2UgbWVkaWEuXG4gICAgICogKiBgJ1NRTCdgIC0gVGhlIHN1YmV4cHJlc3Npb24gaW4gU1FMIGNvbmRpdGlvbmFsIHN5bnRheCBwcm9kdWNlZCBieSB3YWxraW5nIHRoZSB0cmVlIGFuZCByZXR1cm5pbmcgYSBTUUwgW3NlYXJjaCBjb25kaXRpb24gZXhwcmVzc2lvbl17QGxpbmsgaHR0cHM6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9tczE3MzU0NS5hc3B4fS4gU3VpdGFibGUgZm9yIHVzZSBpbiB0aGUgV0hFUkUgY2xhdXNlIG9mIGEgU1FMIGBTRUxFQ1RgIHN0YXRlbWVudCB1c2VkIHRvIHF1ZXJ5IGEgZGF0YWJhc2UgZm9yIGEgZmlsdGVyZWQgcmVzdWx0IHNldC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfHN0cmluZ30gW3NwYWNlXSAtIFdoZW4gYG9wdGlvbnMuc3ludGF4ID09PSAnSlNPTidgLCBmb3J3YXJkZWQgdG8gYEpTT04uc3RyaW5naWZ5YCBhcyB0aGUgdGhpcmQgcGFyYW1ldGVyLCBgc3BhY2VgIChzZWUpLlxuICAgICAqXG4gICAgICogTk9URTogVGhlIFNRTCBzeW50YXggcmVzdWx0IGNhbm5vdCBhY2NvbW1vZGF0ZSBub2RlIG1ldGEtZGF0YS4gV2hpbGUgbWV0YS1kYXRhIHN1Y2ggYXMgYHR5cGVgIHR5cGljYWxseSBjb21lcyBmcm9tIHRoZSBjb2x1bW4gc2NoZW1hLCBtZXRhLWRhdGEgY2FuIGJlIGluc3RhbGxlZCBkaXJlY3RseSBvbiBhIG5vZGUuIFN1Y2ggbWV0YS1kYXRhIHdpbGwgbm90IGJlIHBhcnQgb2YgdGhlIHJlc3VsdGluZyBTUUwgZXhwcmVzc2lvbi4gRm9yIHRoaXMgcmVhc29uLCBTUUwgc2hvdWxkIG5vdCBiZSB1c2VkIHRvIHBlcnNpc3QgZmlsdGVyIHN0YXRlIGJ1dCByYXRoZXIgaXRzIHVzZSBzaG91bGQgYmUgbGltaXRlZCB0byBnZW5lcmF0aW5nIGEgZmlsdGVyIHF1ZXJ5IGZvciBhIHJlbW90ZSBkYXRhIHNlcnZlci5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IEdldCBhIHJlcHJlc2VudGF0aW9uIG9mIGZpbHRlciBzdGF0ZS5cbiAgICAgKiBAZGVzYyBDYWxsaW5nIHRoaXMgb24gdGhlIHJvb3Qgd2lsbCBnZXQgdGhlIGVudGlyZSB0cmVlJ3Mgc3RhdGU7IGNhbGxpbmcgdGhpcyBvbiBhbnkgc3VidHJlZSB3aWxsIGdldCBqdXN0IHRoYXQgc3VidHJlZSdzIHN0YXRlLlxuICAgICAqXG4gICAgICogT25seSBfZXNzZW50aWFsXyBwcm9wZXJ0aWVzIHdpbGwgYmUgb3V0cHV0OlxuICAgICAqXG4gICAgICogMS4gYEZpbHRlclRyZWVgIG5vZGVzIHdpbGwgb3V0cHV0IGF0IGxlYXN0IDIgcHJvcGVydGllczpcbiAgICAgKiAgICAqIGBvcGVyYXRvcmBcbiAgICAgKiAgICAqIGBjaGlsZHJlbmBcbiAgICAgKiAyLiBgRmlsdGVyTGVhZmAgbm9kZXMgd2lsbCBvdXRwdXQgKHZpYSB7QGxpbmsgRmlsdGVyTGVhZiNnZXRTdGF0ZXxnZXRTdGF0ZX0pIGF0IGxlYXN0IDMgcHJvcGVydGllcywgb25lIHByb3BlcnR5IGZvciBlYWNoIGl0ZW0gaW4gaXQncyBgdmlld2A6XG4gICAgICogICAgKiBgY29sdW1uYFxuICAgICAqICAgICogYG9wZXJhdG9yYFxuICAgICAqICAgICogYG9wZXJhbmRgXG4gICAgICogMy4gQWRkaXRpb25hbCBub2RlIHByb3BlcnRpZXMgd2lsbCBiZSBvdXRwdXQgd2hlbjpcbiAgICAgKiAgICAxLiBXaGVuIHRoZSBwcm9wZXJ0eSB3YXMgKipOT1QqKiBleHRlcm5hbGx5IHNvdXJjZWQ6XG4gICAgICogICAgICAgMS4gRGlkICpub3QqIGNvbWUgZnJvbSB0aGUgYG9wdGlvbnNgIG9iamVjdCBvbiBub2RlIGluc3RhbnRpYXRpb24uXG4gICAgICogICAgICAgMi4gRGlkICpub3QqIGNvbWUgZnJvbSB0aGUgb3B0aW9ucyBzY2hlbWEgYGRlZmF1bHRgIG9iamVjdCwgaWYgYW55LlxuICAgICAqICAgIDIuICoqQU5EKiogYXQgbGVhc3Qgb25lIG9mIHRoZSBmb2xsb3dpbmcgaXMgdHJ1ZTpcbiAgICAgKiAgICAgICAxLiBXaGVuIGl0J3MgYW4gXCJvd25cIiBwcm9wZXJ0eS5cbiAgICAgKiAgICAgICAyLiBXaGVuIGl0cyB2YWx1ZSBkaWZmZXJzIGZyb20gaXQncyBwYXJlbnQncy5cbiAgICAgKiAgICAgICAzLiBXaGVuIHRoaXMgaXMgdGhlIHJvb3Qgbm9kZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RmlsdGVyVHJlZUdldFN0YXRlT3B0aW9uc09iamVjdH0gW29wdGlvbnNdXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zLnNxbElkUXRzXSAtIFdoZW4gYG9wdGlvbnMuc3ludGF4ID09PSAnU1FMJ2AsIGZvcndhcmRlZCB0byBgY29uZGl0aW9uYWxzLnB1c2hTcWxJZFF0cygpYC5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fHN0cmluZ30gUmV0dXJucyBvYmplY3Qgd2hlbiBgb3B0aW9ucy5zeW50YXggPT09ICdvYmplY3QnYDsgb3RoZXJ3aXNlIHJldHVybnMgc3RyaW5nLlxuICAgICAqIEBtZW1iZXJPZiBGaWx0ZXJUcmVlI1xuICAgICAqL1xuICAgIGdldFN0YXRlOiBmdW5jdGlvbiBnZXRTdGF0ZShvcHRpb25zKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSAnJyxcbiAgICAgICAgICAgIHN5bnRheCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5zeW50YXggfHwgJ29iamVjdCc7XG5cbiAgICAgICAgc3dpdGNoIChzeW50YXgpIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdW5zdHJ1bmdpZnkuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnSlNPTic6XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkodGhpcywgbnVsbCwgb3B0aW9ucyAmJiBvcHRpb25zLnNwYWNlKSB8fCAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnU1FMJzpcbiAgICAgICAgICAgICAgICB2YXIgbGV4ZW1lID0gb3BlcmF0b3JzW3RoaXMub3BlcmF0b3JdLlNRTDtcblxuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCwgaWR4KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvcCA9IGlkeCA/ICcgJyArIGxleGVtZS5vcCArICcgJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGQgaW5zdGFuY2VvZiBGaWx0ZXJMZWFmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgKz0gb3AgKyBjaGlsZC5nZXRTdGF0ZShvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGlsZC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCArPSBvcCArIGdldFN0YXRlLmNhbGwoY2hpbGQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGxleGVtZS5iZWcgKyByZXN1bHQgKyBsZXhlbWUuZW5kO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgdGhpcy5FcnJvcignVW5rbm93biBzeW50YXggb3B0aW9uIFwiJyArIHN5bnRheCArICdcIicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgdG9KU09OOiBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIHN0YXRlID0ge1xuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiB0aGlzLm9wZXJhdG9yLFxuICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIHN0YXRlLmNoaWxkcmVuLnB1c2goY2hpbGQgaW5zdGFuY2VvZiBGaWx0ZXJMZWFmID8gY2hpbGQgOiB0b0pTT04uY2FsbChjaGlsZCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICBfKEZpbHRlck5vZGUub3B0aW9uc1NjaGVtYSkuZWFjaChmdW5jdGlvbihvcHRpb25TY2hlbWEsIGtleSkge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIHNlbGZba2V5XSAmJiAvLyB0aGVyZSBpcyBhIHN0YW5kYXJkIG9wdGlvbiBvbiB0aGUgbm9kZSB3aGljaCBtYXkgbmVlZCB0byBiZSBvdXRwdXRcbiAgICAgICAgICAgICAgICAhc2VsZi5kb250UGVyc2lzdFtrZXldICYmIChcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uU2NoZW1hLm93biB8fCAvLyBvdXRwdXQgYmVjYXVzZSBpdCdzIGFuIFwib3duXCIgb3B0aW9uIChiZWxvbmdzIHRvIHRoZSBub2RlKVxuICAgICAgICAgICAgICAgICAgICAhc2VsZi5wYXJlbnQgfHwgLy8gb3V0cHV0IGJlY2F1c2UgaXQncyB0aGUgcm9vdCBub2RlXG4gICAgICAgICAgICAgICAgICAgIHNlbGZba2V5XSAhPT0gc2VsZi5wYXJlbnRba2V5XSAvLyBvdXRwdXQgYmVjYXVzZSBpdCBkaWZmZXJzIGZyb20gaXRzIHBhcmVudCdzIHZlcnNpb25cbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBzdGF0ZVtrZXldID0gc2VsZltrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IFNldCB0aGUgY2FzZSBzZW5zaXRpdml0eSBvZiBmaWx0ZXIgdGVzdHMgYWdhaW5zdCBkYXRhLlxuICAgICAqIEBkZXNjIENhc2Ugc2Vuc2l0aXZpdHkgcGVydGFpbnMgdG8gc3RyaW5nIGNvbXBhcmVzIG9ubHkuIFRoaXMgaW5jbHVkZXMgdW50eXBlZCBjb2x1bW5zLCBjb2x1bW5zIHR5cGVkIGFzIHN0cmluZ3MsIHR5cGVkIGNvbHVtbnMgY29udGFpbmluZyBkYXRhIHRoYXQgY2Fubm90IGJlIGNvZXJjZWQgdG8gdHlwZSBvciB3aGVuIHRoZSBmaWx0ZXIgZXhwcmVzc2lvbiBvcGVyYW5kIGNhbm5vdCBiZSBjb2VyY2VkLlxuICAgICAqXG4gICAgICogTk9URTogVGhpcyBpcyBhIHNoYXJlZCBwcm9wZXJ0eSBhbmQgYWZmZWN0cyBhbGwgZmlsdGVyLXRyZWUgaW5zdGFuY2VzIGNvbnN0cnVjdGVkIGJ5IHRoaXMgY29kZSBpbnN0YW5jZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzU2Vuc2l0aXZlXG4gICAgICogQG1lbWJlck9mIEZpbHRlcnRyZWUjLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHNldCBjYXNlU2Vuc2l0aXZlRGF0YShpc1NlbnNpdGl2ZSkge1xuICAgICAgICB2YXIgdG9TdHJpbmcgPSBpc1NlbnNpdGl2ZSA/IHRvU3RyaW5nQ2FzZVNlbnNpdGl2ZSA6IHRvU3RyaW5nQ2FzZUluc2Vuc2l0aXZlO1xuICAgICAgICBGaWx0ZXJMZWFmLnNldFRvU3RyaW5nKHRvU3RyaW5nKTtcbiAgICB9XG5cbn0pO1xuXG5mdW5jdGlvbiB0b1N0cmluZ0Nhc2VJbnNlbnNpdGl2ZShzKSB7IHJldHVybiAocyArICcnKS50b1VwcGVyQ2FzZSgpOyB9XG5mdW5jdGlvbiB0b1N0cmluZ0Nhc2VTZW5zaXRpdmUocykgeyByZXR1cm4gcyArICcnOyB9XG5cbi8vIFNvbWUgZXZlbnQgaGFuZGxlcnMgYm91bmQgdG8gRmlsdGVyVHJlZSBvYmplY3RcblxuZnVuY3Rpb24gb25jaGFuZ2UoZXZ0KSB7IC8vIGNhbGxlZCBpbiBjb250ZXh0XG4gICAgdmFyIGN0cmwgPSBldnQudGFyZ2V0O1xuICAgIGlmIChjdHJsLnBhcmVudEVsZW1lbnQgPT09IHRoaXMuZWwpIHtcbiAgICAgICAgaWYgKGN0cmwudmFsdWUgPT09ICdzdWJleHAnKSB7XG4gICAgICAgICAgICB0aGlzLmNoaWxkcmVuLnB1c2gobmV3IEZpbHRlclRyZWUoe1xuICAgICAgICAgICAgICAgIHBhcmVudDogdGhpc1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hZGQoe1xuICAgICAgICAgICAgICAgIHN0YXRlOiB7IGVkaXRvcjogY3RybC52YWx1ZSB9LFxuICAgICAgICAgICAgICAgIGZvY3VzOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBjdHJsLnNlbGVjdGVkSW5kZXggPSAwO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gb25UcmVlT3BDbGljayhldnQpIHsgLy8gY2FsbGVkIGluIGNvbnRleHRcbiAgICB2YXIgY3RybCA9IGV2dC50YXJnZXQ7XG5cbiAgICBpZiAoY3RybC5jbGFzc05hbWUgPT09ICdmaWx0ZXItdHJlZS1vcC1jaG9pY2UnKSB7XG4gICAgICAgIHRoaXMub3BlcmF0b3IgPSBjdHJsLnZhbHVlO1xuXG4gICAgICAgIC8vIGRpc3BsYXkgc3RyaWtlLXRocm91Z2hcbiAgICAgICAgdmFyIHJhZGlvQnV0dG9ucyA9IHRoaXMuZWwucXVlcnlTZWxlY3RvckFsbCgnbGFiZWw+aW5wdXQuZmlsdGVyLXRyZWUtb3AtY2hvaWNlW25hbWU9JyArIGN0cmwubmFtZSArICddJyk7XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwocmFkaW9CdXR0b25zLCBmdW5jdGlvbihjdHJsKSB7XG4gICAgICAgICAgICBjdHJsLnBhcmVudEVsZW1lbnQuc3R5bGUudGV4dERlY29yYXRpb24gPSBjdHJsLmNoZWNrZWQgPyAnbm9uZScgOiAnbGluZS10aHJvdWdoJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gZGlzcGxheSBvcGVyYXRvciBiZXR3ZWVuIGZpbHRlcnMgYnkgYWRkaW5nIG9wZXJhdG9yIHN0cmluZyBhcyBhIENTUyBjbGFzcyBvZiB0aGlzIHRyZWVcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9wZXJhdG9ycykge1xuICAgICAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QucmVtb3ZlKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKHRoaXMub3BlcmF0b3IpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBUaHJvd3MgZXJyb3IgaWYgaW52YWxpZCBleHByZXNzaW9uIHRyZWUuXG4gKiBDYXVnaHQgYnkge0BsaW5rIEZpbHRlclRyZWUjaW52YWxpZHxGaWx0ZXJUcmVlLnByb3RvdHlwZS5pbnZhbGlkKCl9LlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5mb2N1cz1mYWxzZV0gLSBNb3ZlIGZvY3VzIHRvIG9mZmVuZGluZyBjb250cm9sLlxuICogQHJldHVybnMge3VuZGVmaW5lZH0gaWYgdmFsaWRcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGludmFsaWQob3B0aW9ucykgeyAvLyBjYWxsZWQgaW4gY29udGV4dFxuICAgIC8vaWYgKHRoaXMgaW5zdGFuY2VvZiBGaWx0ZXJUcmVlICYmICF0aGlzLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgIC8vICAgIHRocm93IG5ldyB0aGlzLkVycm9yKCdFbXB0eSBzdWJleHByZXNzaW9uIChubyBmaWx0ZXJzKS4nKTtcbiAgICAvL31cblxuICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICBpZiAoY2hpbGQgaW5zdGFuY2VvZiBGaWx0ZXJMZWFmKSB7XG4gICAgICAgICAgICBjaGlsZC5pbnZhbGlkKG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2UgaWYgKGNoaWxkLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgaW52YWxpZC5jYWxsKGNoaWxkLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5GaWx0ZXJUcmVlLmV4dGVuc2lvbnMgPSB7XG4gICAgQ29sdW1uczogcmVxdWlyZSgnLi9leHRlbnNpb25zL2NvbHVtbnMnKVxufTtcblxuLy8gbW9kdWxlIGluaXRpYWxpemF0aW9uXG5GaWx0ZXJUcmVlLnByb3RvdHlwZS5jYXNlU2Vuc2l0aXZlRGF0YSA9IHRydWU7ICAvLyBkZWZhdWx0IGlzIGNhc2Utc2Vuc2l0aXZlIHdoaWNoIGlzIG1vcmUgZWZmaWNpZW50OyBtYXkgYmUgcmVzZXQgYXQgd2lsbFxuXG5cbm1vZHVsZS5leHBvcnRzID0gRmlsdGVyVHJlZTtcbiIsIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB0ZW1wbGV4ID0gcmVxdWlyZSgndGVtcGxleCcpO1xuXG52YXIgdGVtcGxhdGVzID0gcmVxdWlyZSgnLi4vaHRtbCcpO1xuXG52YXIgZW5jb2RlcnMgPSAvXFx7KFxcZCspXFw6ZW5jb2RlXFx9L2c7XG5cbmZ1bmN0aW9uIFRlbXBsYXRlcygpIHt9XG52YXIgY29uc3RydWN0b3IgPSBUZW1wbGF0ZXMucHJvdG90eXBlLmNvbnN0cnVjdG9yO1xuVGVtcGxhdGVzLnByb3RvdHlwZSA9IHRlbXBsYXRlcztcblRlbXBsYXRlcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvcjsgLy8gcmVzdG9yZSBpdFxuVGVtcGxhdGVzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbih0ZW1wbGF0ZU5hbWUpIHsgLy8gbWl4IGl0IGluXG4gICAgdmFyIGtleXMsXG4gICAgICAgIG1hdGNoZXMgPSB7fSxcbiAgICAgICAgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuICAgICAgICB0ZXh0ID0gdGhpc1t0ZW1wbGF0ZU5hbWVdLFxuICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgIGVuY29kZXJzLmxhc3RJbmRleCA9IDA7XG5cbiAgICB3aGlsZSAoKGtleXMgPSBlbmNvZGVycy5leGVjKHRleHQpKSkge1xuICAgICAgICBtYXRjaGVzW2tleXNbMV1dID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBrZXlzID0gT2JqZWN0LmtleXMobWF0Y2hlcyk7XG5cbiAgICBpZiAoa2V5cy5sZW5ndGgpIHtcbiAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdGVtcC50ZXh0Q29udGVudCA9IGFyZ3Nba2V5XTtcbiAgICAgICAgICAgIGFyZ3Nba2V5XSA9IHRlbXAuaW5uZXJIVE1MO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZShlbmNvZGVycywgJ3skMX0nKTtcbiAgICB9XG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHRlbXBsZXguYXBwbHkodGhpcywgW3RleHRdLmNvbmNhdChhcmdzKSk7XG5cbiAgICAvLyBpZiBvbmx5IG9uZSBIVE1MRWxlbWVudCwgcmV0dXJuIGl0OyBvdGhlcndpc2UgZW50aXJlIGxpc3Qgb2Ygbm9kZXNcbiAgICByZXR1cm4gdGVtcC5jaGlsZHJlbi5sZW5ndGggPT09IDEgJiYgdGVtcC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMVxuICAgICAgICA/IHRlbXAuZmlyc3RDaGlsZFxuICAgICAgICA6IHRlbXAuY2hpbGROb2Rlcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29uZGl0aW9uYWxzID0gcmVxdWlyZSgnLi4vQ29uZGl0aW9uYWxzJyk7XG52YXIgRmlsdGVyTGVhZiA9IHJlcXVpcmUoJy4uL0ZpbHRlckxlYWYnKTtcblxuLyoqXG4gKiBAc3VtbWFyeSBQcm90b3R5cGUgYWRkaXRpb25zIG9iamVjdCBmb3IgZXh0ZW5kaW5nIHtAbGluayBGaWx0ZXJMZWFmfS5cbiAqIEBkZXNjIFJlc3VsdGluZyBvYmplY3QgaXMgc2ltaWxhciB0byB7QGxpbmsgRmlsdGVyTGVhZn0gZXhjZXB0OlxuICogMS4gVGhlIGBvcGVyYW5kYCBwcm9wZXJ0eSBuYW1lcyBhbm90aGVyIGNvbHVtbiByYXRoZXIgdGhhbiBjb250YWlucyBhIGxpdGVyYWwuXG4gKiAyLiBPcGVyYXRvcnMgYXJlIGxpbWl0ZWQgdG8gZXF1YWxpdHksIGluZXF1YWxpdGllcywgYW5kIHNldHMgKElOL05PVCBJTikuIE9taXR0ZWQgYXJlIHRoZSBzdHJpbmcgYW5kIHBhdHRlcm4gc2NhbnMgKEJFR0lOUy9OT1QgQkVHSU5TLCBFTkRTL05PVCBFTkRTLCBDT05UQUlOUy9OT1QgQ09OVEFJTlMsIGFuZCBMSUtFL05PVCBMSUtFKS5cbiAqXG4gKiBAZXh0ZW5kcyBGaWx0ZXJMZWFmXG4gKlxuICogQHByb3BlcnR5IHtzdHJpbmd9IGlkZW50aWZpZXIgLSBOYW1lIG9mIGNvbHVtbiAobWVtYmVyIG9mIGRhdGEgcm93IG9iamVjdCkgdG8gY29tcGFyZSBhZ2FpbnN0IHRoaXMgY29sdW1uIChtZW1iZXIgb2YgZGF0YSByb3cgb2JqZWN0IG5hbWVkIGJ5IGBjb2x1bW5gKS5cbiAqL1xudmFyIENvbHVtbkxlYWYgPSB7XG4gICAgbmFtZTogJ2NvbHVtbiA9IGNvbHVtbicsIC8vIGRpc3BsYXkgc3RyaW5nIGZvciBkcm9wLWRvd25cblxuICAgIGNyZWF0ZVZpZXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBDcmVhdGUgdGhlIGB2aWV3YCBoYXNoIGFuZCBpbnNlcnQgdGhlIHRocmVlIGRlZmF1bHQgZWxlbWVudHMgKGBjb2x1bW5gLCBgb3BlcmF0b3JgLCBgb3BlcmFuZGApIGludG8gYC5lbGBcbiAgICAgICAgRmlsdGVyTGVhZi5wcm90b3R5cGUuY3JlYXRlVmlldy5jYWxsKHRoaXMpO1xuXG4gICAgICAgIC8vIFJlcGxhY2UgdGhlIGBvcGVyYW5kYCBlbGVtZW50IGZyb20gdGhlIGB2aWV3YCBoYXNoXG4gICAgICAgIHZhciBvbGRPcGVyYW5kID0gdGhpcy52aWV3Lm9wZXJhbmQsXG4gICAgICAgICAgICBuZXdPcGVyYW5kID0gdGhpcy52aWV3Lm9wZXJhbmQgPSB0aGlzLm1ha2VFbGVtZW50KHRoaXMucm9vdC5zY2hlbWEsICdjb2x1bW4nLCB0aGlzLnNvcnRDb2x1bW5NZW51KTtcblxuICAgICAgICAvLyBSZXBsYWNlIHRoZSBvcGVyYW5kIGVsZW1lbnQgd2l0aCB0aGUgbmV3IG9uZS4gVGhlcmUgYXJlIG5vIGV2ZW50IGxpc3RlbmVycyB0byB3b3JyeSBhYm91dC5cbiAgICAgICAgdGhpcy5lbC5yZXBsYWNlQ2hpbGQobmV3T3BlcmFuZCwgb2xkT3BlcmFuZCk7XG4gICAgfSxcblxuICAgIG1ha2VTcWxPcGVyYW5kOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucm9vdC5jb25kaXRpb25hbHMubWFrZVNxbElkZW50aWZpZXIodGhpcy5vcGVyYW5kKTtcbiAgICB9LFxuXG4gICAgb3BNZW51OiBbXG4gICAgICAgIENvbmRpdGlvbmFscy5ncm91cHMuZXF1YWxpdHksXG4gICAgICAgIENvbmRpdGlvbmFscy5ncm91cHMuaW5lcXVhbGl0aWVzLFxuICAgICAgICBDb25kaXRpb25hbHMuZ3JvdXBzLnNldHNcbiAgICBdLFxuXG4gICAgcTogZnVuY3Rpb24oZGF0YVJvdykge1xuICAgICAgICByZXR1cm4gdGhpcy52YWxPckZ1bmMoZGF0YVJvdywgdGhpcy5vcGVyYW5kLCB0aGlzLmNhbGN1bGF0b3IpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sdW1uTGVhZjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlT3AgPSAvXigoPXw+PT98PFs+PV0/KXwoTk9UICk/KExJS0V8SU4pXFxiKS9pLCAvLyBtYXRjaFsxXVxuICAgIHJlRmxvYXQgPSAvXihbKy1dPyhcXGQrKFxcLlxcZCopP3xcXGQqXFwuXFxkKykoZVsrLV1cXGQrKT8pW15cXGRdPy9pLFxuICAgIHJlTGl0ID0gL14nKFxcZCspJy8sXG4gICAgcmVMaXRBbnl3aGVyZSA9IC8nKFxcZCspJy8sXG4gICAgcmVJbiA9IC9eXFwoKC4qPylcXCkvLFxuICAgIHJlQm9vbCA9IC9eKEFORHxPUilcXGIvaSxcbiAgICByZUdyb3VwID0gL14oTk9UID8pP1xcKC9pO1xuXG52YXIgU1FUID0gJ1xcJyc7XG5cbnZhciBkZWZhdWx0SWRRdHMgPSB7XG4gICAgYmVnOiAnXCInLFxuICAgIGVuZDogJ1wiJ1xufTtcblxuZnVuY3Rpb24gUGFyc2VyU3FsRXJyb3IobWVzc2FnZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG59XG5QYXJzZXJTcWxFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5QYXJzZXJTcWxFcnJvci5wcm90b3R5cGUubmFtZSA9ICdQYXJzZXJTcWxFcnJvcic7XG5cbi8qKiBAdHlwZWRlZiB7b2JqZWN0fSBzcWxJZFF0c09iamVjdFxuICogQGRlc2MgT24gYSBwcmFjdGljYWwgbGV2ZWwsIHRoZSB1c2VmdWwgY2hhcmFjdGVycyBhcmU6XG4gKiAqIFNRTC05MiBzdGFuZGFyZDogXCJkb3VibGUgcXVvdGVzXCJcbiAqICogU1FMIFNlcnZlcjogXCJkb3VibGUgcXVvdGVzXCIgb3IgXFxbc3F1YXJlIGJyYWNrZXRzXFxdXG4gKiAqIG15U1FMOiBcXGB0aWNrIG1hcmtzXFxgXG4gKiBAcHJvcGVydHkge3N0cmluZ30gYmVnIC0gVGhlIG9wZW4gcXVvdGUgY2hhcmFjdGVyLlxuICogQHByb3BlcnR5IHtzdHJpbmd9IGVuZCAtIFRoZSBjbG9zZSBxdW90ZSBjaGFyYWN0ZXIuXG4gKi9cblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzdW1tYXJ5IFN0cnVjdHVyZWQgUXVlcnkgTGFuZ3VhZ2UgKFNRTCkgcGFyc2VyXG4gKiBAYXV0aG9yIEpvbmF0aGFuIEVpdGVuIDxqb25hdGhhbkBvcGVuZmluLmNvbT5cbiAqIEBkZXNjIFRoaXMgaXMgYSBzdWJzZXQgb2YgU1FMIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gc3ludGF4LlxuICpcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvbXMxNzM1NDUuYXNweCBTUUwgU2VhcmNoIENvbmRpdGlvbn1cbiAqXG4gKiBAcGFyYW0ge21lbnVJdGVtW119IFtvcHRpb25zLnNjaGVtYV0gLSBDb2x1bW4gc2NoZW1hIGZvciBjb2x1bW4gbmFtZSB2YWxpZGF0aW9uLiBUaHJvd3MgYW4gZXJyb3IgaWYgbmFtZSBmYWlscyB2YWxpZGF0aW9uIChidXQgc2VlIGByZXNvbHZlQWxpYXNlc2ApLiBPbWl0IHRvIHNraXAgY29sdW1uIG5hbWUgdmFsaWRhdGlvbi5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMucmVzb2x2ZUFsaWFzZXNdIC0gVmFsaWRhdGUgY29sdW1uIGFsaWFzZXMgYWdhaW5zdCBzY2hlbWEgYW5kIHVzZSB0aGUgYXNzb2NpYXRlZCBjb2x1bW4gbmFtZSBpbiB0aGUgcmV0dXJuZWQgZXhwcmVzc2lvbiBzdGF0ZSBvYmplY3QuIFJlcXVpcmVzIGBvcHRpb25zLnNjaGVtYWAuIFRocm93cyBlcnJvciBpZiBubyBzdWNoIGNvbHVtbiBmb3VuZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuY2FzZVNlbnNpdGl2ZUNvbHVtbk5hbWVzXSAtIElnbm9yZSBjYXNlIHdoaWxlIHZhbGlkYXRpbmcgY29sdW1uIG5hbWVzIGFuZCBhbGlhc2VzLlxuICogQHBhcmFtIHtzcWxJZFF0c09iamVjdH0gW29wdGlvbnMuc3FsSWRRdHM9e2JlZzonXCInLGVuZDonXCInfV1cbiAqL1xuZnVuY3Rpb24gUGFyc2VyU1FMKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHRoaXMuc2NoZW1hID0gb3B0aW9ucy5zY2hlbWE7XG5cbiAgICB2YXIgaWRRdHMgPSBvcHRpb25zLnNxbElkUXRzIHx8IGRlZmF1bHRJZFF0cztcbiAgICB0aGlzLnJlTmFtZSA9IG5ldyBSZWdFeHAoJ14oJyArIGlkUXRzLmJlZyArICcoLis/KScgKyBpZFF0cy5lbmQgKyAnfChbQS1aX11bQS1aX0BcXFxcJCNdKilcXFxcYiknLCAnaScpOyAvLyBtYXRjaFsyXSB8fCBtYXRjaFszXVxufVxuXG5QYXJzZXJTUUwucHJvdG90eXBlID0ge1xuXG4gICAgY29uc3RydWN0b3I6IFBhcnNlclNRTC5wcm90b3R5cGUuY29uc3RydWN0b3IsXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc3FsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQG1lbWJlck9mIG1vZHVsZTpzcWxTZWFyY2hDb25kaXRpb25cbiAgICAgKi9cbiAgICBwYXJzZTogZnVuY3Rpb24oc3FsKSB7XG4gICAgICAgIHZhciBzdGF0ZTtcblxuICAgICAgICAvLyByZWR1Y2UgYWxsIHJ1bnMgb2Ygd2hpdGUgc3BhY2UgdG8gYSBzaW5nbGUgc3BhY2U7IHRoZW4gdHJpbVxuICAgICAgICBzcWwgPSBzcWwucmVwbGFjZSgvXFxzXFxzKy9nLCAnICcpLnRyaW0oKTtcblxuICAgICAgICBzcWwgPSBzdHJpcExpdGVyYWxzLmNhbGwodGhpcywgc3FsKTtcbiAgICAgICAgc3RhdGUgPSB3YWxrLmNhbGwodGhpcywgc3FsKTtcblxuICAgICAgICBpZiAoIXN0YXRlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IHsgY2hpbGRyZW46IFsgc3RhdGUgXSB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHdhbGsodCkge1xuICAgIHZhciBtLCBuYW1lLCBvcCwgb3BlcmFuZCwgZWRpdG9yLCBib29sLCB0b2tlbiwgdG9rZW5zID0gW107XG4gICAgdmFyIGkgPSAwO1xuXG4gICAgdCA9IHQudHJpbSgpO1xuXG4gICAgd2hpbGUgKGkgPCB0Lmxlbmd0aCkge1xuICAgICAgICBtID0gdC5zdWJzdHIoaSkubWF0Y2gocmVHcm91cCk7XG4gICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICB2YXIgbm90ID0gISFtWzFdO1xuXG4gICAgICAgICAgICBpICs9IG1bMF0ubGVuZ3RoO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IGksIHYgPSAxOyBqIDwgdC5sZW5ndGggJiYgdjsgKytqKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRbal0gPT09ICcoJykge1xuICAgICAgICAgICAgICAgICAgICArK3Y7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0W2pdID09PSAnKScpIHtcbiAgICAgICAgICAgICAgICAgICAgLS12O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUGFyc2VyU3FsRXJyb3IoJ0V4cGVjdGVkIFwiKVwiJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b2tlbiA9IHdhbGsuY2FsbCh0aGlzLCB0LnN1YnN0cihpLCBqIC0gMSAtIGkpKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobm90KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLm9wZXJhdG9yICE9PSAnb3Atb3InKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBQYXJzZXJTcWxFcnJvcignRXhwZWN0ZWQgT1IgaW4gTk9UKC4uLikgc3ViZXhwcmVzc2lvbiBidXQgZm91bmQgJyArIHRva2VuLm9wZXJhdG9yLnN1YnN0cigzKS50b1VwcGVyQ2FzZSgpICsgJy4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdG9rZW4ub3BlcmF0b3IgPSAnb3Atbm9yJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaSA9IGo7XG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIC8vIGNvbHVtbjpcblxuICAgICAgICAgICAgbSA9IHQuc3Vic3RyKGkpLm1hdGNoKHRoaXMucmVOYW1lKTtcbiAgICAgICAgICAgIGlmICghbSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBQYXJzZXJTcWxFcnJvcignRXhwZWN0ZWQgaWRlbnRpZmllciBvciBxdW90ZWQgaWRlbnRpZmllci4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5hbWUgPSBtWzJdIHx8IG1bM107XG4gICAgICAgICAgICBpZiAoIS9eW0EtWl9dL2kudGVzdCh0W2ldKSkgeyBpICs9IDI7IH1cbiAgICAgICAgICAgIGkgKz0gbmFtZS5sZW5ndGg7XG5cbiAgICAgICAgICAgIC8vIG9wZXJhdG9yOlxuXG4gICAgICAgICAgICBpZiAodFtpXSA9PT0gJyAnKSB7ICsraTsgfVxuICAgICAgICAgICAgbSA9IHQuc3Vic3RyKGkpLm1hdGNoKHJlT3ApO1xuICAgICAgICAgICAgaWYgKCFtKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFBhcnNlclNxbEVycm9yKCdFeHBlY3RlZCByZWxhdGlvbmFsIG9wZXJhdG9yLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3AgPSBtWzFdLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICBpICs9IG9wLmxlbmd0aDtcblxuICAgICAgICAgICAgLy8gb3BlcmFuZDpcblxuICAgICAgICAgICAgZWRpdG9yID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKHRbaV0gPT09ICcgJykgeyArK2k7IH1cbiAgICAgICAgICAgIGlmIChtWzRdICYmIG1bNF0udG9VcHBlckNhc2UoKSA9PT0gJ0lOJykge1xuICAgICAgICAgICAgICAgIG0gPSB0LnN1YnN0cihpKS5tYXRjaChyZUluKTtcbiAgICAgICAgICAgICAgICBpZiAoIW0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFBhcnNlclNxbEVycm9yKCdFeHBlY3RlZCBwYXJlbnRoZXNpemVkIGxpc3QuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9wZXJhbmQgPSBtWzFdO1xuICAgICAgICAgICAgICAgIGkgKz0gb3BlcmFuZC5sZW5ndGggKyAyO1xuICAgICAgICAgICAgICAgIHdoaWxlICgobSA9IG9wZXJhbmQubWF0Y2gocmVMaXRBbnl3aGVyZSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wZXJhbmQgPSBvcGVyYW5kLnJlcGxhY2UocmVMaXRBbnl3aGVyZSwgdGhpcy5saXRlcmFsc1ttWzFdXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICgobSA9IHQuc3Vic3RyKGkpLm1hdGNoKHJlTGl0KSkpIHtcbiAgICAgICAgICAgICAgICBvcGVyYW5kID0gbVsxXTtcbiAgICAgICAgICAgICAgICBpICs9IG9wZXJhbmQubGVuZ3RoICsgMjtcbiAgICAgICAgICAgICAgICBvcGVyYW5kID0gdGhpcy5saXRlcmFsc1tvcGVyYW5kXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKG0gPSB0LnN1YnN0cihpKS5tYXRjaChyZUZsb2F0KSkpIHtcbiAgICAgICAgICAgICAgICBvcGVyYW5kID0gbVsxXTtcbiAgICAgICAgICAgICAgICBpICs9IG9wZXJhbmQubGVuZ3RoO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgobSA9IHQuc3Vic3RyKGkpLm1hdGNoKHRoaXMucmVOYW1lKSkpIHtcbiAgICAgICAgICAgICAgICBvcGVyYW5kID0gbVsyXSB8fCBtWzNdO1xuICAgICAgICAgICAgICAgIGkgKz0gb3BlcmFuZC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZWRpdG9yID0gJ0NvbHVtbnMnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUGFyc2VyU3FsRXJyb3IoJ0V4cGVjdGVkIG51bWJlciBvciBzdHJpbmcgbGl0ZXJhbCBvciBjb2x1bW4uJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnNjaGVtYSkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBsb29rdXAuY2FsbCh0aGlzLCBuYW1lKTtcblxuICAgICAgICAgICAgICAgIGlmIChlZGl0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgb3BlcmFuZCA9IGxvb2t1cC5jYWxsKHRoaXMsIG9wZXJhbmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdG9rZW4gPSB7XG4gICAgICAgICAgICAgICAgY29sdW1uOiBuYW1lLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBvcCxcbiAgICAgICAgICAgICAgICBvcGVyYW5kOiBvcGVyYW5kXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4uZWRpdG9yID0gZWRpdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuXG4gICAgICAgIGlmIChpIDwgdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0W2ldID09PSAnICcpIHsgKytpOyB9XG4gICAgICAgICAgICBtID0gdC5zdWJzdHIoaSkubWF0Y2gocmVCb29sKTtcbiAgICAgICAgICAgIGlmICghbSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBQYXJzZXJTcWxFcnJvcignRXhwZWN0ZWQgYm9vbGVhbiBvcGVyYXRvci4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJvb2wgPSBtWzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpICs9IGJvb2wubGVuZ3RoO1xuICAgICAgICAgICAgYm9vbCA9ICdvcC0nICsgYm9vbDtcbiAgICAgICAgICAgIGlmICh0b2tlbnMub3BlcmF0b3IgJiYgdG9rZW5zLm9wZXJhdG9yICE9PSBib29sKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFBhcnNlclNxbEVycm9yKCdFeHBlY3RlZCBzYW1lIGJvb2xlYW4gb3BlcmF0b3IgdGhyb3VnaG91dCBzdWJleHByZXNzaW9uLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9rZW5zLm9wZXJhdG9yID0gYm9vbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0W2ldID09PSAnICcpIHsgKytpOyB9XG4gICAgfVxuXG4gICAgcmV0dXJuIChcbiAgICAgICAgdG9rZW5zLmxlbmd0aCA9PT0gMSA/IHRva2Vuc1swXSA6IHtcbiAgICAgICAgICAgIG9wZXJhdG9yOiB0b2tlbnMub3BlcmF0b3IsXG4gICAgICAgICAgICBjaGlsZHJlbjogdG9rZW5zXG4gICAgICAgIH1cbiAgICApO1xufVxuXG5mdW5jdGlvbiBsb29rdXAobmFtZSkge1xuICAgIHZhciBpdGVtID0gdGhpcy5zY2hlbWEubG9va3VwKG5hbWUpO1xuXG4gICAgaWYgKCFpdGVtKSB7XG4gICAgICAgIHRocm93IG5ldyBQYXJzZXJTcWxFcnJvcih0aGlzLnJlc29sdmVBbGlhc2VzXG4gICAgICAgICAgICA/ICdFeHBlY3RlZCB2YWxpZCBjb2x1bW4gbmFtZS4nXG4gICAgICAgICAgICA6ICdFeHBlY3RlZCB2YWxpZCBjb2x1bW4gbmFtZSBvciBhbGlhcy4nXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZW0ubmFtZTtcbn1cblxuZnVuY3Rpb24gc3RyaXBMaXRlcmFscyh0KSB7XG4gICAgdmFyIGkgPSAwLCBqID0gMCwgaztcblxuICAgIHRoaXMubGl0ZXJhbHMgPSBbXTtcblxuICAgIHdoaWxlICgoaiA9IHQuaW5kZXhPZihTUVQsIGopKSA+PSAwKSB7XG4gICAgICAgIGsgPSBqO1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICBrID0gdC5pbmRleE9mKFNRVCwgayArIDEpO1xuICAgICAgICAgICAgaWYgKGsgPCAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFBhcnNlclNxbEVycm9yKCdFeHBlY3RlZCAnICsgU1FUICsgJyAoc2luZ2xlIHF1b3RlKS4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSB3aGlsZSAodFsrK2tdID09PSBTUVQpO1xuICAgICAgICB0aGlzLmxpdGVyYWxzLnB1c2godC5zbGljZSgrK2osIC0taykucmVwbGFjZSgvJycvZywgU1FUKSk7XG4gICAgICAgIHQgPSB0LnN1YnN0cigwLCBqKSArIGkgKyB0LnN1YnN0cihrKTtcbiAgICAgICAgaiA9IGogKyAxICsgKGkgKyAnJykubGVuZ3RoICsgMTtcbiAgICAgICAgaSsrO1xuICAgIH1cblxuICAgIHJldHVybiB0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnNlclNRTDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNzc0luamVjdG9yID0gcmVxdWlyZSgnY3NzLWluamVjdG9yJyk7XG5cbnZhciBjc3M7IC8vIGRlZmluZWQgYnkgY29kZSBpbnNlcnRlZCBieSBndWxwZmlsZSBiZXR3ZWVuIGZvbGxvd2luZyBjb21tZW50c1xuLyogaW5qZWN0OmNzcyAqL1xuY3NzID0gJy5maWx0ZXItdHJlZXtmb250LWZhbWlseTpzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMHB0O2xpbmUtaGVpZ2h0OjEuNWVtfS5maWx0ZXItdHJlZSBsYWJlbHtmb250LXdlaWdodDo0MDB9LmZpbHRlci10cmVlIGlucHV0W3R5cGU9Y2hlY2tib3hdLC5maWx0ZXItdHJlZSBpbnB1dFt0eXBlPXJhZGlvXXttYXJnaW4tbGVmdDozcHg7bWFyZ2luLXJpZ2h0OjNweH0uZmlsdGVyLXRyZWUgb2x7bWFyZ2luLXRvcDowfS5maWx0ZXItdHJlZT5zZWxlY3R7ZmxvYXQ6cmlnaHQ7Ym9yZGVyOjFweCBkb3R0ZWQgZ3JleTtiYWNrZ3JvdW5kLWNvbG9yOnRyYW5zcGFyZW50O2JveC1zaGFkb3c6bm9uZX0uZmlsdGVyLXRyZWUtcmVtb3ZlLWJ1dHRvbntkaXNwbGF5OmlubGluZS1ibG9jazt3aWR0aDoxNXB4O2hlaWdodDoxNXB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQtY29sb3I6I2U4ODtmb250LXNpemU6MTEuNXB4O2NvbG9yOiNmZmY7dGV4dC1hbGlnbjpjZW50ZXI7bGluZS1oZWlnaHQ6bm9ybWFsO2ZvbnQtc3R5bGU6bm9ybWFsO2ZvbnQtZmFtaWx5OnNhbnMtc2VyaWY7bWFyZ2luLXJpZ2h0OjRweDtjdXJzb3I6cG9pbnRlcn0uZmlsdGVyLXRyZWUtcmVtb3ZlLWJ1dHRvbjpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOnRyYW5zcGFyZW50O2NvbG9yOiNlODg7Zm9udC13ZWlnaHQ6NzAwO2JveC1zaGFkb3c6cmVkIDAgMCAycHggaW5zZXR9LmZpbHRlci10cmVlLXJlbW92ZS1idXR0b246OmJlZm9yZXtjb250ZW50OlxcJ1xcXFxkN1xcJ30uZmlsdGVyLXRyZWUgbGk6OmFmdGVye2ZvbnQtc2l6ZTo3MCU7Zm9udC1zdHlsZTppdGFsaWM7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOiMwODB9LmZpbHRlci10cmVlPm9sPmxpOmxhc3QtY2hpbGQ6OmFmdGVye2Rpc3BsYXk6bm9uZX0ub3AtYW5kPm9sLC5vcC1ub3I+b2wsLm9wLW9yPm9se3BhZGRpbmctbGVmdDo1cHg7bWFyZ2luLWxlZnQ6MjdweH0ub3Atb3I+b2w+bGk6OmFmdGVye21hcmdpbi1sZWZ0OjIuNWVtO2NvbnRlbnQ6XFwn4oCUIE9SIOKAlFxcJ30ub3AtYW5kPm9sPmxpOjphZnRlcnttYXJnaW4tbGVmdDoyLjVlbTtjb250ZW50OlxcJ+KAlCBBTkQg4oCUXFwnfS5vcC1ub3I+b2w+bGk6OmFmdGVye21hcmdpbi1sZWZ0OjIuNWVtO2NvbnRlbnQ6XFwn4oCUIE5PUiDigJRcXCd9LmZpbHRlci10cmVlLWVkaXRvcj4qe2ZvbnQtd2VpZ2h0OjcwMH0uZmlsdGVyLXRyZWUtZWRpdG9yPnNwYW57Zm9udC1zaXplOnNtYWxsZXJ9LmZpbHRlci10cmVlLWVkaXRvcj5pbnB1dFt0eXBlPXRleHRde3dpZHRoOjhlbTtwYWRkaW5nOjFweCA1cHggMnB4fS5maWx0ZXItdHJlZS13YXJuaW5ne2JhY2tncm91bmQtY29sb3I6I2ZmYyFpbXBvcnRhbnQ7Ym9yZGVyLWNvbG9yOiNlZGIhaW1wb3J0YW50O2ZvbnQtd2VpZ2h0OjQwMCFpbXBvcnRhbnR9LmZpbHRlci10cmVlLWVycm9ye2JhY2tncm91bmQtY29sb3I6I2ZjYyFpbXBvcnRhbnQ7Ym9yZGVyLWNvbG9yOiNjOTkhaW1wb3J0YW50O2ZvbnQtd2VpZ2h0OjQwMCFpbXBvcnRhbnR9LmZpbHRlci10cmVlLWRlZmF1bHQ+OmVuYWJsZWR7bWFyZ2luOjAgLjRlbTtiYWNrZ3JvdW5kLWNvbG9yOiNkZGQ7Ym9yZGVyOjFweCBzb2xpZCB0cmFuc3BhcmVudH0uZmlsdGVyLXRyZWUuZmlsdGVyLXRyZWUtdHlwZS1jb2x1bW4tZmlsdGVycz5vbD5saTpub3QoOmxhc3QtY2hpbGQpe3BhZGRpbmctYm90dG9tOi43NWVtO2JvcmRlci1ib3R0b206M3B4IGRvdWJsZSAjMDgwO21hcmdpbi1ib3R0b206Ljc1ZW19LmZpbHRlci10cmVlIC5mb290bm90ZXN7bWFyZ2luOjAgMCA2cHg7Zm9udC1zaXplOjhwdDtmb250LXdlaWdodDo0MDA7bGluZS1oZWlnaHQ6bm9ybWFsO3doaXRlLXNwYWNlOm5vcm1hbDtjb2xvcjojYzAwfS5maWx0ZXItdHJlZSAuZm9vdG5vdGVzPnB7bWFyZ2luOjB9LmZpbHRlci10cmVlIC5mb290bm90ZXM+dWx7bWFyZ2luOi0zcHggMCAwO3BhZGRpbmctbGVmdDoxN3B4O3RleHQtaW5kZXg6LTZweH0uZmlsdGVyLXRyZWUgLmZvb3Rub3Rlcz51bD5saXttYXJnaW46MnB4IDB9LmZpbHRlci10cmVlIC5mb290bm90ZXMgLmZpZWxkLW5hbWUsLmZpbHRlci10cmVlIC5mb290bm90ZXMgLmZpZWxkLXZhbHVle2ZvbnQtd2VpZ2h0OjcwMDtmb250LXN0eWxlOm5vcm1hbH0uZmlsdGVyLXRyZWUgLmZvb3Rub3RlcyAuZmllbGQtdmFsdWV7Zm9udC1mYW1pbHk6bW9ub3NwYWNlO2NvbG9yOiMwMDA7YmFja2dyb3VuZC1jb2xvcjojZGRkO3BhZGRpbmc6MCA1cHg7bWFyZ2luOjAgM3B4O2JvcmRlci1yYWRpdXM6M3B4fSc7XG4vKiBlbmRpbmplY3QgKi9cblxubW9kdWxlLmV4cG9ydHMgPSBjc3NJbmplY3Rvci5iaW5kKHRoaXMsIGNzcywgJ2ZpbHRlci10cmVlLWJhc2UnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqIEB0eXBlZGVmIHtmdW5jdGlvbn0gb3BlcmF0aW9uUmVkdWNlclxuICogQHBhcmFtIHtib29sZWFufSBwXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHFcbiAqIEByZXR1cm5zIHtib29sZWFufSBUaGUgcmVzdWx0IG9mIGFwcGx5aW5nIHRoZSBvcGVyYXRvciB0byB0aGUgdHdvIHBhcmFtZXRlcnMuXG4gKi9cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQHR5cGUge29wZXJhdGlvblJlZHVjZXJ9XG4gKi9cbmZ1bmN0aW9uIEFORChwLCBxKSB7XG4gICAgcmV0dXJuIHAgJiYgcTtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQHR5cGUge29wZXJhdGlvblJlZHVjZXJ9XG4gKi9cbmZ1bmN0aW9uIE9SKHAsIHEpIHtcbiAgICByZXR1cm4gcCB8fCBxO1xufVxuXG4vKiogQHR5cGVkZWYge29iZWpjdH0gdHJlZU9wZXJhdG9yXG4gKiBAZGVzYyBFYWNoIGB0cmVlT3BlcmF0b3JgIG9iamVjdCBkZXNjcmliZXMgdHdvIHRoaW5nczpcbiAqXG4gKiAxLiBIb3cgdG8gdGFrZSB0aGUgdGVzdCByZXN1bHRzIG9mIF9uXyBjaGlsZCBub2RlcyBieSBhcHBseWluZyB0aGUgb3BlcmF0b3IgdG8gYWxsIHRoZSByZXN1bHRzIHRvIFwicmVkdWNlXCIgaXQgZG93biB0byBhIHNpbmdsZSByZXN1bHQuXG4gKiAyLiBIb3cgdG8gZ2VuZXJhdGUgU1FMIFdIRVJFIGNsYXVzZSBzeW50YXggdGhhdCBhcHBsaWVzIHRoZSBvcGVyYXRvciB0byBfbl8gY2hpbGQgbm9kZXMuXG4gKlxuICogQHByb3BlcnR5IHtvcGVyYXRpb25SZWR1Y2VyfSByZWR1Y2VcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gc2VlZCAtXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IGFib3J0IC1cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gbmVnYXRlIC1cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBTUUwub3AgLVxuICogQHByb3BlcnR5IHtzdHJpbmd9IFNRTC5iZWcgLVxuICogQHByb3BlcnR5IHtzdHJpbmd9IFNRTC5lbmQgLVxuICovXG5cbi8qKiBBIGhhc2ggb2Yge0BsaW5rIHRyZWVPcGVyYXRvcn0gb2JqZWN0cy5cbiAqIEB0eXBlIHtvYmplY3R9XG4gKi9cbnZhciB0cmVlT3BlcmF0b3JzID0ge1xuICAgICdvcC1hbmQnOiB7XG4gICAgICAgIHJlZHVjZTogQU5ELFxuICAgICAgICBzZWVkOiB0cnVlLFxuICAgICAgICBhYm9ydDogZmFsc2UsXG4gICAgICAgIG5lZ2F0ZTogZmFsc2UsXG4gICAgICAgIFNRTDoge1xuICAgICAgICAgICAgb3A6ICdBTkQnLFxuICAgICAgICAgICAgYmVnOiAnKCcsXG4gICAgICAgICAgICBlbmQ6ICcpJ1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnb3Atb3InOiB7XG4gICAgICAgIHJlZHVjZTogT1IsXG4gICAgICAgIHNlZWQ6IGZhbHNlLFxuICAgICAgICBhYm9ydDogdHJ1ZSxcbiAgICAgICAgbmVnYXRlOiBmYWxzZSxcbiAgICAgICAgU1FMOiB7XG4gICAgICAgICAgICBvcDogJ09SJyxcbiAgICAgICAgICAgIGJlZzogJygnLFxuICAgICAgICAgICAgZW5kOiAnKSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ29wLW5vcic6IHtcbiAgICAgICAgcmVkdWNlOiBPUixcbiAgICAgICAgc2VlZDogZmFsc2UsXG4gICAgICAgIGFib3J0OiB0cnVlLFxuICAgICAgICBuZWdhdGU6IHRydWUsXG4gICAgICAgIFNRTDoge1xuICAgICAgICAgICAgb3A6ICdPUicsXG4gICAgICAgICAgICBiZWc6ICdOT1QgKCcsXG4gICAgICAgICAgICBlbmQ6ICcpJ1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB0cmVlT3BlcmF0b3JzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuLyoqIEBuYW1lc3BhY2UgY3NzSW5qZWN0b3IgKi9cblxuLyoqXG4gKiBAc3VtbWFyeSBJbnNlcnQgYmFzZSBzdHlsZXNoZWV0IGludG8gRE9NXG4gKlxuICogQGRlc2MgQ3JlYXRlcyBhIG5ldyBgPHN0eWxlPi4uLjwvc3R5bGU+YCBlbGVtZW50IGZyb20gdGhlIG5hbWVkIHRleHQgc3RyaW5nKHMpIGFuZCBpbnNlcnRzIGl0IGJ1dCBvbmx5IGlmIGl0IGRvZXMgbm90IGFscmVhZHkgZXhpc3QgaW4gdGhlIHNwZWNpZmllZCBjb250YWluZXIgYXMgcGVyIGByZWZlcmVuY2VFbGVtZW50YC5cbiAqXG4gKiA+IENhdmVhdDogSWYgc3R5bGVzaGVldCBpcyBmb3IgdXNlIGluIGEgc2hhZG93IERPTSwgeW91IG11c3Qgc3BlY2lmeSBhIGxvY2FsIGByZWZlcmVuY2VFbGVtZW50YC5cbiAqXG4gKiBAcmV0dXJucyBBIHJlZmVyZW5jZSB0byB0aGUgbmV3bHkgY3JlYXRlZCBgPHN0eWxlPi4uLjwvc3R5bGU+YCBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBjc3NSdWxlc1xuICogQHBhcmFtIHtzdHJpbmd9IFtJRF1cbiAqIEBwYXJhbSB7dW5kZWZpbmVkfG51bGx8RWxlbWVudHxzdHJpbmd9IFtyZWZlcmVuY2VFbGVtZW50XSAtIENvbnRhaW5lciBmb3IgaW5zZXJ0aW9uLiBPdmVybG9hZHM6XG4gKiAqIGB1bmRlZmluZWRgIHR5cGUgKG9yIG9taXR0ZWQpOiBpbmplY3RzIHN0eWxlc2hlZXQgYXQgdG9wIG9mIGA8aGVhZD4uLi48L2hlYWQ+YCBlbGVtZW50XG4gKiAqIGBudWxsYCB2YWx1ZTogaW5qZWN0cyBzdHlsZXNoZWV0IGF0IGJvdHRvbSBvZiBgPGhlYWQ+Li4uPC9oZWFkPmAgZWxlbWVudFxuICogKiBgRWxlbWVudGAgdHlwZTogaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBlbGVtZW50LCB3aGVyZXZlciBpdCBpcyBmb3VuZC5cbiAqICogYHN0cmluZ2AgdHlwZTogaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBmaXJzdCBlbGVtZW50IGZvdW5kIHRoYXQgbWF0Y2hlcyB0aGUgZ2l2ZW4gY3NzIHNlbGVjdG9yLlxuICpcbiAqIEBtZW1iZXJPZiBjc3NJbmplY3RvclxuICovXG5mdW5jdGlvbiBjc3NJbmplY3Rvcihjc3NSdWxlcywgSUQsIHJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICBpZiAodHlwZW9mIHJlZmVyZW5jZUVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHJlZmVyZW5jZUVsZW1lbnQpO1xuICAgICAgICBpZiAoIXJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICAgICAgICAgIHRocm93ICdDYW5ub3QgZmluZCByZWZlcmVuY2UgZWxlbWVudCBmb3IgQ1NTIGluamVjdGlvbi4nO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChyZWZlcmVuY2VFbGVtZW50ICYmICEocmVmZXJlbmNlRWxlbWVudCBpbnN0YW5jZW9mIEVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93ICdHaXZlbiB2YWx1ZSBub3QgYSByZWZlcmVuY2UgZWxlbWVudC4nO1xuICAgIH1cblxuICAgIHZhciBjb250YWluZXIgPSByZWZlcmVuY2VFbGVtZW50ICYmIHJlZmVyZW5jZUVsZW1lbnQucGFyZW50Tm9kZSB8fCBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG5cbiAgICBpZiAoSUQpIHtcbiAgICAgICAgSUQgPSBjc3NJbmplY3Rvci5pZFByZWZpeCArIElEO1xuXG4gICAgICAgIGlmIChjb250YWluZXIucXVlcnlTZWxlY3RvcignIycgKyBJRCkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gc3R5bGVzaGVldCBhbHJlYWR5IGluIERPTVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbiAgICBpZiAoSUQpIHtcbiAgICAgICAgc3R5bGUuaWQgPSBJRDtcbiAgICB9XG4gICAgaWYgKGNzc1J1bGVzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgY3NzUnVsZXMgPSBjc3NSdWxlcy5qb2luKCdcXG4nKTtcbiAgICB9XG4gICAgY3NzUnVsZXMgPSAnXFxuJyArIGNzc1J1bGVzICsgJ1xcbic7XG4gICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzUnVsZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzUnVsZXMpKTtcbiAgICB9XG5cbiAgICBpZiAocmVmZXJlbmNlRWxlbWVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBjb250YWluZXIuZmlyc3RDaGlsZDtcbiAgICB9XG5cbiAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKHN0eWxlLCByZWZlcmVuY2VFbGVtZW50KTtcblxuICAgIHJldHVybiBzdHlsZTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBPcHRpb25hbCBwcmVmaXggZm9yIGA8c3R5bGU+YCB0YWcgSURzLlxuICogQGRlc2MgRGVmYXVsdHMgdG8gYCdpbmplY3RlZC1zdHlsZXNoZWV0LSdgLlxuICogQHR5cGUge3N0cmluZ31cbiAqIEBtZW1iZXJPZiBjc3NJbmplY3RvclxuICovXG5jc3NJbmplY3Rvci5pZFByZWZpeCA9ICdpbmplY3RlZC1zdHlsZXNoZWV0LSc7XG5cbi8vIEludGVyZmFjZVxubW9kdWxlLmV4cG9ydHMgPSBjc3NJbmplY3RvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG92ZXJyaWRlciA9IHJlcXVpcmUoJ292ZXJyaWRlcicpO1xuXG4vKiogQG5hbWVzcGFjZSBleHRlbmQtbWUgKiovXG5cbi8qKiBAc3VtbWFyeSBFeHRlbmRzIGFuIGV4aXN0aW5nIGNvbnN0cnVjdG9yIGludG8gYSBuZXcgY29uc3RydWN0b3IuXG4gKlxuICogQHJldHVybnMge0NoaWxkQ29uc3RydWN0b3J9IEEgbmV3IGNvbnN0cnVjdG9yLCBleHRlbmRlZCBmcm9tIHRoZSBnaXZlbiBjb250ZXh0LCBwb3NzaWJseSB3aXRoIHNvbWUgcHJvdG90eXBlIGFkZGl0aW9ucy5cbiAqXG4gKiBAZGVzYyBFeHRlbmRzIFwib2JqZWN0c1wiIChjb25zdHJ1Y3RvcnMpLCB3aXRoIG9wdGlvbmFsIGFkZGl0aW9uYWwgY29kZSwgb3B0aW9uYWwgcHJvdG90eXBlIGFkZGl0aW9ucywgYW5kIG9wdGlvbmFsIHByb3RvdHlwZSBtZW1iZXIgYWxpYXNlcy5cbiAqXG4gKiA+IENBVkVBVDogTm90IHRvIGJlIGNvbmZ1c2VkIHdpdGggVW5kZXJzY29yZS1zdHlsZSAuZXh0ZW5kKCkgd2hpY2ggaXMgc29tZXRoaW5nIGVsc2UgZW50aXJlbHkuIEkndmUgdXNlZCB0aGUgbmFtZSBcImV4dGVuZFwiIGhlcmUgYmVjYXVzZSBvdGhlciBwYWNrYWdlcyAobGlrZSBCYWNrYm9uZS5qcykgdXNlIGl0IHRoaXMgd2F5LiBZb3UgYXJlIGZyZWUgdG8gY2FsbCBpdCB3aGF0ZXZlciB5b3Ugd2FudCB3aGVuIHlvdSBcInJlcXVpcmVcIiBpdCwgc3VjaCBhcyBgdmFyIGluaGVyaXRzID0gcmVxdWlyZSgnZXh0ZW5kJylgLlxuICpcbiAqIFByb3ZpZGUgYSBjb25zdHJ1Y3RvciBhcyB0aGUgY29udGV4dCBhbmQgYW55IHByb3RvdHlwZSBhZGRpdGlvbnMgeW91IHJlcXVpcmUgaW4gdGhlIGZpcnN0IGFyZ3VtZW50LlxuICpcbiAqIEZvciBleGFtcGxlLCBpZiB5b3Ugd2lzaCB0byBiZSBhYmxlIHRvIGV4dGVuZCBgQmFzZUNvbnN0cnVjdG9yYCB0byBhIG5ldyBjb25zdHJ1Y3RvciB3aXRoIHByb3RvdHlwZSBvdmVycmlkZXMgYW5kL29yIGFkZGl0aW9ucywgYmFzaWMgdXNhZ2UgaXM6XG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogdmFyIEJhc2UgPSByZXF1aXJlKCdleHRlbmQtbWUnKS5CYXNlO1xuICogdmFyIEJhc2VDb25zdHJ1Y3RvciA9IEJhc2UuZXh0ZW5kKGJhc2VQcm90b3R5cGUpOyAvLyBtaXhlcyBpbiAuZXh0ZW5kXG4gKiB2YXIgQ2hpbGRDb25zdHJ1Y3RvciA9IEJhc2VDb25zdHJ1Y3Rvci5leHRlbmQoY2hpbGRQcm90b3R5cGVPdmVycmlkZXNBbmRBZGRpdGlvbnMpO1xuICogdmFyIEdyYW5kY2hpbGRDb25zdHJ1Y3RvciA9IENoaWxkQ29uc3RydWN0b3IuZXh0ZW5kKGdyYW5kY2hpbGRQcm90b3R5cGVPdmVycmlkZXNBbmRBZGRpdGlvbnMpO1xuICogYGBgXG4gKlxuICogVGhpcyBmdW5jdGlvbiAoYGV4dGVuZCgpYCkgaXMgYWRkZWQgdG8gdGhlIG5ldyBleHRlbmRlZCBvYmplY3QgY29uc3RydWN0b3IgYXMgYSBwcm9wZXJ0eSBgLmV4dGVuZGAsIGVzc2VudGlhbGx5IG1ha2luZyB0aGUgb2JqZWN0IGNvbnN0cnVjdG9yIGl0c2VsZiBlYXNpbHkgXCJleHRlbmRhYmxlLlwiIChOb3RlOiBUaGlzIGlzIGEgcHJvcGVydHkgb2YgZWFjaCBjb25zdHJ1Y3RvciBhbmQgbm90IGEgbWV0aG9kIG9mIGl0cyBwcm90b3R5cGUhKVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBbZXh0ZW5kZWRDbGFzc05hbWVdIC0gVGhpcyBpcyBzaW1wbHkgYWRkZWQgdG8gdGhlIHByb3RvdHlwZSBhcyAkJENMQVNTX05BTUUuIFVzZWZ1bCBmb3IgZGVidWdnaW5nIGJlY2F1c2UgYWxsIGRlcml2ZWQgY29uc3RydWN0b3JzIGFwcGVhciB0byBoYXZlIHRoZSBzYW1lIG5hbWUgKFwiQ29uc3RydWN0b3JcIikgaW4gdGhlIGRlYnVnZ2VyLlxuICpcbiAqIEBwYXJhbSB7ZXh0ZW5kZWRQcm90b3R5cGVBZGRpdGlvbnNPYmplY3R9IFtwcm90b3R5cGVBZGRpdGlvbnNdIC0gT2JqZWN0IHdpdGggbWVtYmVycyB0byBjb3B5IHRvIG5ldyBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS5cbiAqXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtkZWJ1Z10gLSBTZWUgcGFyYW1ldGVyIGBleHRlbmRlZENsYXNzTmFtZWAgXyhhYm92ZSlfLlxuICpcbiAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBCYXNlIC0gQSBjb252ZW5pZW50IGJhc2UgY2xhc3MgZnJvbSB3aGljaCBhbGwgb3RoZXIgY2xhc3NlcyBjYW4gYmUgZXh0ZW5kZWQuXG4gKlxuICogQG1lbWJlck9mIGV4dGVuZC1tZVxuICovXG5mdW5jdGlvbiBleHRlbmQoZXh0ZW5kZWRDbGFzc05hbWUsIHByb3RvdHlwZUFkZGl0aW9ucykge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICBwcm90b3R5cGVBZGRpdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICBzd2l0Y2ggKHR5cGVvZiBleHRlbmRlZENsYXNzTmFtZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucyA9IGV4dGVuZGVkQ2xhc3NOYW1lO1xuICAgICAgICAgICAgICAgICAgICBleHRlbmRlZENsYXNzTmFtZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgcHJvdG90eXBlQWRkaXRpb25zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdTaW5nbGUtcGFyYW1ldGVyIG92ZXJsb2FkIG11c3QgYmUgZWl0aGVyIHN0cmluZyBvciBvYmplY3QuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4dGVuZGVkQ2xhc3NOYW1lICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcHJvdG90eXBlQWRkaXRpb25zICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHRocm93ICdUd28tcGFyYW1ldGVyIG92ZXJsb2FkIG11c3QgYmUgc3RyaW5nLCBvYmplY3QuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgJ1RvbyBtYW55IHBhcmFtZXRlcnMnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIENvbnN0cnVjdG9yKCkge1xuICAgICAgICBpZiAocHJvdG90eXBlQWRkaXRpb25zLnByZUluaXRpYWxpemUpIHtcbiAgICAgICAgICAgIHByb3RvdHlwZUFkZGl0aW9ucy5wcmVJbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cblxuICAgICAgICBpbml0aWFsaXplUHJvdG90eXBlQ2hhaW4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgICBpZiAocHJvdG90eXBlQWRkaXRpb25zLnBvc3RJbml0aWFsaXplKSB7XG4gICAgICAgICAgICBwcm90b3R5cGVBZGRpdGlvbnMucG9zdEluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIENvbnN0cnVjdG9yLmV4dGVuZCA9IGV4dGVuZDtcblxuICAgIHZhciBwcm90b3R5cGUgPSBDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHRoaXMucHJvdG90eXBlKTtcbiAgICBwcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcblxuICAgIGlmIChleHRlbmRlZENsYXNzTmFtZSkge1xuICAgICAgICBwcm90b3R5cGUuJCRDTEFTU19OQU1FID0gZXh0ZW5kZWRDbGFzc05hbWU7XG4gICAgfVxuXG4gICAgb3ZlcnJpZGVyKHByb3RvdHlwZSwgcHJvdG90eXBlQWRkaXRpb25zKTtcblxuICAgIHJldHVybiBDb25zdHJ1Y3Rvcjtcbn1cblxuZnVuY3Rpb24gQmFzZSgpIHt9XG5CYXNlLnByb3RvdHlwZSA9IHtcbiAgICBjb25zdHJ1Y3RvcjogQmFzZS5wcm90b3R5cGUuY29uc3RydWN0b3IsXG4gICAgZ2V0IHN1cGVyKCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKSk7XG4gICAgfVxufTtcbkJhc2UuZXh0ZW5kID0gZXh0ZW5kO1xuZXh0ZW5kLkJhc2UgPSBCYXNlO1xuXG4vKiogQHR5cGVkZWYge2Z1bmN0aW9ufSBleHRlbmRlZENvbnN0cnVjdG9yXG4gKiBAcHJvcGVydHkgcHJvdG90eXBlLnN1cGVyIC0gQSByZWZlcmVuY2UgdG8gdGhlIHByb3RvdHlwZSB0aGlzIGNvbnN0cnVjdG9yIHdhcyBleHRlbmRlZCBmcm9tLlxuICogQHByb3BlcnR5IFtleHRlbmRdIC0gSWYgYHByb3RvdHlwZUFkZGl0aW9ucy5leHRlbmRhYmxlYCB3YXMgdHJ1dGh5LCB0aGlzIHdpbGwgYmUgYSByZWZlcmVuY2UgdG8ge0BsaW5rIGV4dGVuZC5leHRlbmR8ZXh0ZW5kfS5cbiAqL1xuXG4vKiogQHR5cGVkZWYge29iamVjdH0gZXh0ZW5kZWRQcm90b3R5cGVBZGRpdGlvbnNPYmplY3RcbiAqIEBkZXNjIEFsbCBtZW1iZXJzIGFyZSBjb3BpZWQgdG8gdGhlIG5ldyBvYmplY3QuIFRoZSBmb2xsb3dpbmcgaGF2ZSBzcGVjaWFsIG1lYW5pbmcuXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9ufSBbaW5pdGlhbGl6ZV0gLSBBZGRpdGlvbmFsIGNvbnN0cnVjdG9yIGNvZGUgZm9yIG5ldyBvYmplY3QuIFRoaXMgbWV0aG9kIGlzIGFkZGVkIHRvIHRoZSBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIEdldHMgcGFzc2VkIG5ldyBvYmplY3QgYXMgY29udGV4dCArIHNhbWUgYXJncyBhcyBjb25zdHJ1Y3RvciBpdHNlbGYuIENhbGxlZCBvbiBpbnN0YW50aWF0aW9uIGFmdGVyIHNpbWlsYXIgZnVuY3Rpb24gaW4gYWxsIGFuY2VzdG9ycyBjYWxsZWQgd2l0aCBzYW1lIHNpZ25hdHVyZS5cbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb259IFtwcmVJbml0aWFsaXplXSAtIENhbGxlZCBiZWZvcmUgdGhlIGBpbml0aWFsaXplYCBjYXNjYWRlLiBHZXRzIHBhc3NlZCBuZXcgb2JqZWN0IGFzIGNvbnRleHQgKyBzYW1lIGFyZ3MgYXMgY29uc3RydWN0b3IgaXRzZWxmLlxuICogQHByb3BlcnR5IHtmdW5jdGlvbn0gW3Bvc3RJbml0aWFsaXplXSAtIENhbGxlZCBhZnRlciB0aGUgYGluaXRpYWxpemVgIGNhc2NhZGUuIEdldHMgcGFzc2VkIG5ldyBvYmplY3QgYXMgY29udGV4dCArIHNhbWUgYXJncyBhcyBjb25zdHJ1Y3RvciBpdHNlbGYuXG4gKi9cblxuLyoqIEBzdW1tYXJ5IENhbGwgYWxsIGBpbml0aWFsaXplYCBtZXRob2RzIGZvdW5kIGluIHByb3RvdHlwZSBjaGFpbiwgYmVnaW5uaW5nIHdpdGggdGhlIG1vc3Qgc2VuaW9yIGFuY2VzdG9yJ3MgZmlyc3QuXG4gKiBAZGVzYyBUaGlzIHJlY3Vyc2l2ZSByb3V0aW5lIGlzIGNhbGxlZCBieSB0aGUgY29uc3RydWN0b3IuXG4gKiAxLiBXYWxrcyBiYWNrIHRoZSBwcm90b3R5cGUgY2hhaW4gdG8gYE9iamVjdGAncyBwcm90b3R5cGVcbiAqIDIuIFdhbGtzIGZvcndhcmQgdG8gbmV3IG9iamVjdCwgY2FsbGluZyBhbnkgYGluaXRpYWxpemVgIG1ldGhvZHMgaXQgZmluZHMgYWxvbmcgdGhlIHdheSB3aXRoIHRoZSBzYW1lIGNvbnRleHQgYW5kIGFyZ3VtZW50cyB3aXRoIHdoaWNoIHRoZSBjb25zdHJ1Y3RvciB3YXMgY2FsbGVkLlxuICogQHByaXZhdGVcbiAqIEBtZW1iZXJPZiBleHRlbmQtbWVcbiAqL1xuZnVuY3Rpb24gaW5pdGlhbGl6ZVByb3RvdHlwZUNoYWluKCkge1xuICAgIHZhciB0ZXJtID0gdGhpcyxcbiAgICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICByZWN1cih0ZXJtKTtcblxuICAgIGZ1bmN0aW9uIHJlY3VyKG9iaikge1xuICAgICAgICB2YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKTtcbiAgICAgICAgaWYgKHByb3RvLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcbiAgICAgICAgICAgIHJlY3VyKHByb3RvKTtcbiAgICAgICAgICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnaW5pdGlhbGl6ZScpKSB7XG4gICAgICAgICAgICAgICAgcHJvdG8uaW5pdGlhbGl6ZS5hcHBseSh0ZXJtLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBleHRlbmQ7XG4iLCIvKiBvYmplY3QtaXRlcmF0b3JzLmpzIC0gTWluaSBVbmRlcnNjb3JlIGxpYnJhcnlcbiAqIGJ5IEpvbmF0aGFuIEVpdGVuXG4gKlxuICogVGhlIG1ldGhvZHMgYmVsb3cgb3BlcmF0ZSBvbiBvYmplY3RzIChidXQgbm90IGFycmF5cykgc2ltaWxhcmx5XG4gKiB0byBVbmRlcnNjb3JlIChodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jY29sbGVjdGlvbnMpLlxuICpcbiAqIEZvciBtb3JlIGluZm9ybWF0aW9uOlxuICogaHR0cHM6Ly9naXRodWIuY29tL2pvbmVpdC9vYmplY3QtaXRlcmF0b3JzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQHN1bW1hcnkgV3JhcCBhbiBvYmplY3QgZm9yIG9uZSBtZXRob2QgY2FsbC5cbiAqIEBEZXNjIE5vdGUgdGhhdCB0aGUgYG5ld2Aga2V5d29yZCBpcyBub3QgbmVjZXNzYXJ5LlxuICogQHBhcmFtIHtvYmplY3R8bnVsbHx1bmRlZmluZWR9IG9iamVjdCAtIGBudWxsYCBvciBgdW5kZWZpbmVkYCBpcyB0cmVhdGVkIGFzIGFuIGVtcHR5IHBsYWluIG9iamVjdC5cbiAqIEByZXR1cm4ge1dyYXBwZXJ9IFRoZSB3cmFwcGVkIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gV3JhcHBlcihvYmplY3QpIHtcbiAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgV3JhcHBlcikge1xuICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV3JhcHBlcikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXcmFwcGVyKG9iamVjdCk7XG4gICAgfVxuICAgIHRoaXMub3JpZ2luYWxWYWx1ZSA9IG9iamVjdDtcbiAgICB0aGlzLm8gPSBvYmplY3QgfHwge307XG59XG5cbi8qKlxuICogQG5hbWUgV3JhcHBlci5jaGFpblxuICogQHN1bW1hcnkgV3JhcCBhbiBvYmplY3QgZm9yIGEgY2hhaW4gb2YgbWV0aG9kIGNhbGxzLlxuICogQERlc2MgQ2FsbHMgdGhlIGNvbnN0cnVjdG9yIGBXcmFwcGVyKClgIGFuZCBtb2RpZmllcyB0aGUgd3JhcHBlciBmb3IgY2hhaW5pbmcuXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqZWN0XG4gKiBAcmV0dXJuIHtXcmFwcGVyfSBUaGUgd3JhcHBlZCBvYmplY3QuXG4gKi9cbldyYXBwZXIuY2hhaW4gPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgdmFyIHdyYXBwZWQgPSBXcmFwcGVyKG9iamVjdCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbmV3LWNhcFxuICAgIHdyYXBwZWQuY2hhaW5pbmcgPSB0cnVlO1xuICAgIHJldHVybiB3cmFwcGVkO1xufTtcblxuV3JhcHBlci5wcm90b3R5cGUgPSB7XG4gICAgLyoqXG4gICAgICogVW53cmFwIGFuIG9iamVjdCB3cmFwcGVkIHdpdGgge0BsaW5rIFdyYXBwZXIuY2hhaW58V3JhcHBlci5jaGFpbigpfS5cbiAgICAgKiBAcmV0dXJuIHtvYmplY3R8bnVsbHx1bmRlZmluZWR9IFRoZSB2YWx1ZSBvcmlnaW5hbGx5IHdyYXBwZWQgYnkgdGhlIGNvbnN0cnVjdG9yLlxuICAgICAqIEBtZW1iZXJPZiBXcmFwcGVyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9yaWdpbmFsVmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBkZXNjIE1pbWljcyBVbmRlcnNjb3JlJ3MgW2VhY2hdKGh0dHA6Ly91bmRlcnNjb3JlanMub3JnLyNlYWNoKSBtZXRob2Q6IEl0ZXJhdGUgb3ZlciB0aGUgbWVtYmVycyBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIGNhbGxpbmcgYGl0ZXJhdGVlKClgIHdpdGggZWFjaC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBpdGVyYXRlZSAtIEZvciBlYWNoIG1lbWJlciBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggdGhyZWUgYXJndW1lbnRzOiBgKHZhbHVlLCBrZXksIG9iamVjdClgLiBUaGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgZnVuY3Rpb24gaXMgdW5kZWZpbmVkOyBhbiBgLmVhY2hgIGxvb3AgY2Fubm90IGJlIGJyb2tlbiBvdXQgb2YgKHVzZSB7QGxpbmsgV3JhcHBlciNmaW5kfC5maW5kfSBpbnN0ZWFkKS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIC0gSWYgZ2l2ZW4sIGBpdGVyYXRlZWAgaXMgYm91bmQgdG8gdGhpcyBvYmplY3QuIEluIG90aGVyIHdvcmRzLCB0aGlzIG9iamVjdCBiZWNvbWVzIHRoZSBgdGhpc2AgdmFsdWUgaW4gdGhlIGNhbGxzIHRvIGBpdGVyYXRlZWAuIChPdGhlcndpc2UsIHRoZSBgdGhpc2AgdmFsdWUgd2lsbCBiZSB0aGUgdW53cmFwcGVkIG9iamVjdC4pXG4gICAgICogQHJldHVybiB7V3JhcHBlcn0gVGhlIHdyYXBwZWQgb2JqZWN0IGZvciBjaGFpbmluZy5cbiAgICAgKiBAbWVtYmVyT2YgV3JhcHBlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBlYWNoOiBmdW5jdGlvbiAoaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIG8gPSB0aGlzLm87XG4gICAgICAgIE9iamVjdC5rZXlzKG8pLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgaXRlcmF0ZWUuY2FsbCh0aGlzLCBvW2tleV0sIGtleSwgbyk7XG4gICAgICAgIH0sIGNvbnRleHQgfHwgbyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBNaW1pY3MgVW5kZXJzY29yZSdzIFtmaW5kXShodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jZmluZCkgbWV0aG9kOiBMb29rIHRocm91Z2ggZWFjaCBtZW1iZXIgb2YgdGhlIHdyYXBwZWQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIGZpcnN0IG9uZSB0aGF0IHBhc3NlcyBhIHRydXRoIHRlc3QgKGBwcmVkaWNhdGVgKSwgb3IgYHVuZGVmaW5lZGAgaWYgbm8gdmFsdWUgcGFzc2VzIHRoZSB0ZXN0LiBUaGUgZnVuY3Rpb24gcmV0dXJucyB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IGFjY2VwdGFibGUgbWVtYmVyLCBhbmQgZG9lc24ndCBuZWNlc3NhcmlseSB0cmF2ZXJzZSB0aGUgZW50aXJlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcmVkaWNhdGUgLSBGb3IgZWFjaCBtZW1iZXIgb2YgdGhlIHdyYXBwZWQgb2JqZWN0LCB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogYCh2YWx1ZSwga2V5LCBvYmplY3QpYC4gVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIGZ1bmN0aW9uIHNob3VsZCBiZSB0cnV0aHkgaWYgdGhlIG1lbWJlciBwYXNzZXMgdGhlIHRlc3QgYW5kIGZhbHN5IG90aGVyd2lzZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIC0gSWYgZ2l2ZW4sIGBwcmVkaWNhdGVgIGlzIGJvdW5kIHRvIHRoaXMgb2JqZWN0LiBJbiBvdGhlciB3b3JkcywgdGhpcyBvYmplY3QgYmVjb21lcyB0aGUgYHRoaXNgIHZhbHVlIGluIHRoZSBjYWxscyB0byBgcHJlZGljYXRlYC4gKE90aGVyd2lzZSwgdGhlIGB0aGlzYCB2YWx1ZSB3aWxsIGJlIHRoZSB1bndyYXBwZWQgb2JqZWN0LilcbiAgICAgKiBAcmV0dXJuIHsqfSBUaGUgZm91bmQgcHJvcGVydHkncyB2YWx1ZSwgb3IgdW5kZWZpbmVkIGlmIG5vdCBmb3VuZC5cbiAgICAgKiBAbWVtYmVyT2YgV3JhcHBlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBmaW5kOiBmdW5jdGlvbiAocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICBpZiAobykge1xuICAgICAgICAgICAgcmVzdWx0ID0gT2JqZWN0LmtleXMobykuZmluZChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByZWRpY2F0ZS5jYWxsKHRoaXMsIG9ba2V5XSwga2V5LCBvKTtcbiAgICAgICAgICAgIH0sIGNvbnRleHQgfHwgbyk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBvW3Jlc3VsdF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgTWltaWNzIFVuZGVyc2NvcmUncyBbZmlsdGVyXShodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jZmlsdGVyKSBtZXRob2Q6IExvb2sgdGhyb3VnaCBlYWNoIG1lbWJlciBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIHJldHVybmluZyB0aGUgdmFsdWVzIG9mIGFsbCBtZW1iZXJzIHRoYXQgcGFzcyBhIHRydXRoIHRlc3QgKGBwcmVkaWNhdGVgKSwgb3IgZW1wdHkgYXJyYXkgaWYgbm8gdmFsdWUgcGFzc2VzIHRoZSB0ZXN0LiBUaGUgZnVuY3Rpb24gYWx3YXlzIHRyYXZlcnNlcyB0aGUgZW50aXJlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcmVkaWNhdGUgLSBGb3IgZWFjaCBtZW1iZXIgb2YgdGhlIHdyYXBwZWQgb2JqZWN0LCB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogYCh2YWx1ZSwga2V5LCBvYmplY3QpYC4gVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIGZ1bmN0aW9uIHNob3VsZCBiZSB0cnV0aHkgaWYgdGhlIG1lbWJlciBwYXNzZXMgdGhlIHRlc3QgYW5kIGZhbHN5IG90aGVyd2lzZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIC0gSWYgZ2l2ZW4sIGBwcmVkaWNhdGVgIGlzIGJvdW5kIHRvIHRoaXMgb2JqZWN0LiBJbiBvdGhlciB3b3JkcywgdGhpcyBvYmplY3QgYmVjb21lcyB0aGUgYHRoaXNgIHZhbHVlIGluIHRoZSBjYWxscyB0byBgcHJlZGljYXRlYC4gKE90aGVyd2lzZSwgdGhlIGB0aGlzYCB2YWx1ZSB3aWxsIGJlIHRoZSB1bndyYXBwZWQgb2JqZWN0LilcbiAgICAgKiBAcmV0dXJuIHsqfSBBbiBhcnJheSBjb250YWluaW5nIHRoZSBmaWx0ZXJlZCB2YWx1ZXMuXG4gICAgICogQG1lbWJlck9mIFdyYXBwZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgZmlsdGVyOiBmdW5jdGlvbiAocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIGlmIChvKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhvKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpcywgb1trZXldLCBrZXksIG8pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKG9ba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgY29udGV4dCB8fCBvKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBNaW1pY3MgVW5kZXJzY29yZSdzIFttYXBdKGh0dHA6Ly91bmRlcnNjb3JlanMub3JnLyNtYXApIG1ldGhvZDogUHJvZHVjZXMgYSBuZXcgYXJyYXkgb2YgdmFsdWVzIGJ5IG1hcHBpbmcgZWFjaCB2YWx1ZSBpbiBsaXN0IHRocm91Z2ggYSB0cmFuc2Zvcm1hdGlvbiBmdW5jdGlvbiAoYGl0ZXJhdGVlYCkuIFRoZSBmdW5jdGlvbiBhbHdheXMgdHJhdmVyc2VzIHRoZSBlbnRpcmUgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGl0ZXJhdGVlIC0gRm9yIGVhY2ggbWVtYmVyIG9mIHRoZSB3cmFwcGVkIG9iamVjdCwgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM6IGAodmFsdWUsIGtleSwgb2JqZWN0KWAuIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBmdW5jdGlvbiBpcyBjb25jYXRlbmF0ZWQgdG8gdGhlIGVuZCBvZiB0aGUgbmV3IGFycmF5LlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dF0gLSBJZiBnaXZlbiwgYGl0ZXJhdGVlYCBpcyBib3VuZCB0byB0aGlzIG9iamVjdC4gSW4gb3RoZXIgd29yZHMsIHRoaXMgb2JqZWN0IGJlY29tZXMgdGhlIGB0aGlzYCB2YWx1ZSBpbiB0aGUgY2FsbHMgdG8gYHByZWRpY2F0ZWAuIChPdGhlcndpc2UsIHRoZSBgdGhpc2AgdmFsdWUgd2lsbCBiZSB0aGUgdW53cmFwcGVkIG9iamVjdC4pXG4gICAgICogQHJldHVybiB7Kn0gQW4gYXJyYXkgY29udGFpbmluZyB0aGUgZmlsdGVyZWQgdmFsdWVzLlxuICAgICAqIEBtZW1iZXJPZiBXcmFwcGVyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIG1hcDogZnVuY3Rpb24gKGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIGlmIChvKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhvKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChpdGVyYXRlZS5jYWxsKHRoaXMsIG9ba2V5XSwga2V5LCBvKSk7XG4gICAgICAgICAgICB9LCBjb250ZXh0IHx8IG8pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBkZXNjIE1pbWljcyBVbmRlcnNjb3JlJ3MgW3JlZHVjZV0oaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvI3JlZHVjZSkgbWV0aG9kOiBCb2lsIGRvd24gdGhlIHZhbHVlcyBvZiBhbGwgdGhlIG1lbWJlcnMgb2YgdGhlIHdyYXBwZWQgb2JqZWN0IGludG8gYSBzaW5nbGUgdmFsdWUuIGBtZW1vYCBpcyB0aGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWN0aW9uLCBhbmQgZWFjaCBzdWNjZXNzaXZlIHN0ZXAgb2YgaXQgc2hvdWxkIGJlIHJldHVybmVkIGJ5IGBpdGVyYXRlZSgpYC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBpdGVyYXRlZSAtIEZvciBlYWNoIG1lbWJlciBvZiB0aGUgd3JhcHBlZCBvYmplY3QsIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggZm91ciBhcmd1bWVudHM6IGAobWVtbywgdmFsdWUsIGtleSwgb2JqZWN0KWAuIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBmdW5jdGlvbiBiZWNvbWVzIHRoZSBuZXcgdmFsdWUgb2YgYG1lbW9gIGZvciB0aGUgbmV4dCBpdGVyYXRpb24uXG4gICAgICogQHBhcmFtIHsqfSBbbWVtb10gLSBJZiBubyBtZW1vIGlzIHBhc3NlZCB0byB0aGUgaW5pdGlhbCBpbnZvY2F0aW9uIG9mIHJlZHVjZSwgdGhlIGl0ZXJhdGVlIGlzIG5vdCBpbnZva2VkIG9uIHRoZSBmaXJzdCBlbGVtZW50IG9mIHRoZSBsaXN0LiBUaGUgZmlyc3QgZWxlbWVudCBpcyBpbnN0ZWFkIHBhc3NlZCBhcyB0aGUgbWVtbyBpbiB0aGUgaW52b2NhdGlvbiBvZiB0aGUgaXRlcmF0ZWUgb24gdGhlIG5leHQgZWxlbWVudCBpbiB0aGUgbGlzdC5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIC0gSWYgZ2l2ZW4sIGBpdGVyYXRlZWAgaXMgYm91bmQgdG8gdGhpcyBvYmplY3QuIEluIG90aGVyIHdvcmRzLCB0aGlzIG9iamVjdCBiZWNvbWVzIHRoZSBgdGhpc2AgdmFsdWUgaW4gdGhlIGNhbGxzIHRvIGBpdGVyYXRlZWAuIChPdGhlcndpc2UsIHRoZSBgdGhpc2AgdmFsdWUgd2lsbCBiZSB0aGUgdW53cmFwcGVkIG9iamVjdC4pXG4gICAgICogQHJldHVybiB7Kn0gVGhlIHZhbHVlIG9mIGBtZW1vYCBcInJlZHVjZWRcIiBhcyBwZXIgYGl0ZXJhdGVlYC5cbiAgICAgKiBAbWVtYmVyT2YgV3JhcHBlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICByZWR1Y2U6IGZ1bmN0aW9uIChpdGVyYXRlZSwgbWVtbywgY29udGV4dCkge1xuICAgICAgICB2YXIgbyA9IHRoaXMubztcbiAgICAgICAgaWYgKG8pIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG8pLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaWR4KSB7XG4gICAgICAgICAgICAgICAgbWVtbyA9ICghaWR4ICYmIG1lbW8gPT09IHVuZGVmaW5lZCkgPyBvW2tleV0gOiBpdGVyYXRlZShtZW1vLCBvW2tleV0sIGtleSwgbyk7XG4gICAgICAgICAgICB9LCBjb250ZXh0IHx8IG8pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtZW1vO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBNaW1pY3MgVW5kZXJzY29yZSdzIFtleHRlbmRdKGh0dHA6Ly91bmRlcnNjb3JlanMub3JnLyNleHRlbmQpIG1ldGhvZDogQ29weSBhbGwgb2YgdGhlIHByb3BlcnRpZXMgaW4gZWFjaCBvZiB0aGUgYHNvdXJjZWAgb2JqZWN0IHBhcmFtZXRlcihzKSBvdmVyIHRvIHRoZSAod3JhcHBlZCkgZGVzdGluYXRpb24gb2JqZWN0ICh0aHVzIG11dGF0aW5nIGl0KS4gSXQncyBpbi1vcmRlciwgc28gdGhlIHByb3BlcnRpZXMgb2YgdGhlIGxhc3QgYHNvdXJjZWAgb2JqZWN0IHdpbGwgb3ZlcnJpZGUgcHJvcGVydGllcyB3aXRoIHRoZSBzYW1lIG5hbWUgaW4gcHJldmlvdXMgYXJndW1lbnRzIG9yIGluIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogPiBUaGlzIG1ldGhvZCBjb3BpZXMgb3duIG1lbWJlcnMgYXMgd2VsbCBhcyBtZW1iZXJzIGluaGVyaXRlZCBmcm9tIHByb3RvdHlwZSBjaGFpbi5cbiAgICAgKiBAcGFyYW0gey4uLm9iamVjdHxudWxsfHVuZGVmaW5lZH0gc291cmNlIC0gVmFsdWVzIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBhcmUgdHJlYXRlZCBhcyBlbXB0eSBwbGFpbiBvYmplY3RzLlxuICAgICAqIEByZXR1cm4ge1dyYXBwZXJ8b2JqZWN0fSBUaGUgd3JhcHBlZCBkZXN0aW5hdGlvbiBvYmplY3QgaWYgY2hhaW5pbmcgaXMgaW4gZWZmZWN0OyBvdGhlcndpc2UgdGhlIHVud3JhcHBlZCBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogQG1lbWJlck9mIFdyYXBwZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgZXh0ZW5kOiBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLmZvckVhY2goZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKG9iamVjdCkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgb1trZXldID0gb2JqZWN0W2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hhaW5pbmcgPyB0aGlzIDogbztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgTWltaWNzIFVuZGVyc2NvcmUncyBbZXh0ZW5kT3duXShodHRwOi8vdW5kZXJzY29yZWpzLm9yZy8jZXh0ZW5kT3duKSBtZXRob2Q6IExpa2Uge0BsaW5rIFdyYXBwZXIjZXh0ZW5kfGV4dGVuZH0sIGJ1dCBvbmx5IGNvcGllcyBpdHMgXCJvd25cIiBwcm9wZXJ0aWVzIG92ZXIgdG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gey4uLm9iamVjdHxudWxsfHVuZGVmaW5lZH0gc291cmNlIC0gVmFsdWVzIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBhcmUgdHJlYXRlZCBhcyBlbXB0eSBwbGFpbiBvYmplY3RzLlxuICAgICAqIEByZXR1cm4ge1dyYXBwZXJ8b2JqZWN0fSBUaGUgd3JhcHBlZCBkZXN0aW5hdGlvbiBvYmplY3QgaWYgY2hhaW5pbmcgaXMgaW4gZWZmZWN0OyBvdGhlcndpc2UgdGhlIHVud3JhcHBlZCBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogQG1lbWJlck9mIFdyYXBwZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgZXh0ZW5kT3duOiBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICAgIHZhciBvID0gdGhpcy5vO1xuICAgICAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLmZvckVhY2goZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICAgICAgV3JhcHBlcihvYmplY3QpLmVhY2goZnVuY3Rpb24gKHZhbCwga2V5KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbmV3LWNhcFxuICAgICAgICAgICAgICAgIG9ba2V5XSA9IHZhbDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hhaW5pbmcgPyB0aGlzIDogbztcbiAgICB9XG59O1xuXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9maW5kXG5pZiAoIUFycmF5LnByb3RvdHlwZS5maW5kKSB7XG4gICAgQXJyYXkucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbiAocHJlZGljYXRlKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZXh0ZW5kLW5hdGl2ZVxuICAgICAgICBpZiAodGhpcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkucHJvdG90eXBlLmZpbmQgY2FsbGVkIG9uIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBwcmVkaWNhdGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGlzdCA9IE9iamVjdCh0aGlzKTtcbiAgICAgICAgdmFyIGxlbmd0aCA9IGxpc3QubGVuZ3RoID4+PiAwO1xuICAgICAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICAgICAgdmFyIHZhbHVlO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhbHVlID0gbGlzdFtpXTtcbiAgICAgICAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSwgbGlzdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdyYXBwZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogU2hhbGxvdyBjb3BpZXMgbWVtYmVycyBvZiBgb3ZlcnJpZGVzYCB0byBgb2JqZWN0YCwgaGFuZGxpbmcgZ2V0dGVycyBhbmQgc2V0dGVycyBwcm9wZXJseS5cbiAqXG4gKiBBbnkgbnVtYmVyIG9mIGBvdmVycmlkZXNgIG9iamVjdHMgbWF5IGJlIGdpdmVuIGFuZCBlYWNoIGlzIGNvcGllZCBpbiB0dXJuLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmplY3QgLSBUaGUgdGFyZ2V0IG9iamVjdCB0byByZWNlaXZlIG92ZXJyaWRlcy5cbiAqIEBwYXJhbSB7Li4ub2JqZWN0fSBbb3ZlcnJpZGVzXSAtIE9iamVjdChzKSBjb250YWluaW5nIG1lbWJlcnMgdG8gY29weSB0byBgb2JqZWN0YC4gKE9taXR0aW5nIGlzIGEgbm8tb3AuKVxuICogQHJldHVybnMge29iamVjdH0gYG9iamVjdGBcbiAqL1xuZnVuY3Rpb24gb3ZlcnJpZGVyKG9iamVjdCwgb3ZlcnJpZGVzKSB7XG4gICAgdmFyIGtleSwgZGVzY3JpcHRvcjtcblxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIG92ZXJyaWRlcyA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaWYgKHR5cGVvZiBvdmVycmlkZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBmb3IgKGtleSBpbiBvdmVycmlkZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAob3ZlcnJpZGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob3ZlcnJpZGVzLCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBrZXksIGRlc2NyaXB0b3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmplY3Q7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gb3ZlcnJpZGVyO1xuIiwiLyogZXNsaW50LWVudiBicm93c2VyICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFJFR0VYUF9JTkRJUkVDVElPTiA9IC9eKFxcdyspXFwoKFxcdyspXFwpJC87ICAvLyBmaW5kcyBjb21wbGV0ZSBwYXR0ZXJuIGEoYikgd2hlcmUgYm90aCBhIGFuZCBiIGFyZSByZWdleCBcIndvcmRzXCJcblxuLyoqIEB0eXBlZGVmIHtvYmplY3R9IHZhbHVlSXRlbVxuICogWW91IHNob3VsZCBzdXBwbHkgYm90aCBgbmFtZWAgYW5kIGBhbGlhc2AgKG9yIGBoZWFkZXJgKSBidXQgeW91IGNvdWxkIG9taXQgb25lIG9yIHRoZSBvdGhlciBhbmQgd2hpY2hldmVyIHlvdSBwcm92aWRlIHdpbGwgYmUgdXNlZCBmb3IgYm90aC5cbiAqID4gSWYgeW91IG9ubHkgZ2l2ZSB0aGUgYG5hbWVgIHByb3BlcnR5LCB5b3UgbWlnaHQgYXMgd2VsbCBqdXN0IGdpdmUgYSBzdHJpbmcgZm9yIHtAbGluayBtZW51SXRlbX0gcmF0aGVyIHRoYW4gdGhpcyBvYmplY3QuXG4gKiBPbmx5IHRoZSBgbmFtZWAgYW5kIGBhbGlhc2AgKG9yIGBoZWFkZXJgKSBwcm9wZXJ0aWVzIGFyZSBzdGFuZGFyZC4gWW91IGNhbiBpbnZlbnQgd2hhdGV2ZXIgb3RoZXIgcHJvcGVydGllcyB5b3UgbmVlZCwgc3VjaCBhcyBgdHlwZWAgYW5kIGBoaWRkZW5gLCBzaG93biBoZXJlIGFzIHN1Z2dlc3Rpb25zLlxuICogQHByb3BlcnR5IHtzdHJpbmd9IFtuYW1lPWFsaWFzIHx8IGhlYWRlcl0gLSBWYWx1ZSBvZiBgdmFsdWVgIGF0dHJpYnV0ZSBvZiBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnQuXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2FsaWFzPWhlYWRlcl0gLSBUZXh0IG9mIGA8b3B0aW9uPi4uLjwvb3B0aW9uPmAgZWxlbWVudC4gSW4gcHJhY3RpY2UsIGBoZWFkZXJgIGlzIGEgc3lub255bSBmb3IgYGFsaWFzYC5cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbaGVhZGVyPW5hbWVdIC0gVGV4dCBvZiBgPG9wdGlvbj4uLi48L29wdGlvbj5gIGVsZW1lbnQuIEluIHByYWN0aWNlLCBgaGVhZGVyYCBpcyBhIHN5bm9ueW0gZm9yIGBhbGlhc2AuXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW3R5cGVdIE9uZSBvZiB0aGUga2V5cyBvZiBgdGhpcy5jb252ZXJ0ZXJzYC4gSWYgbm90IG9uZSBvZiB0aGVzZSAoaW5jbHVkaW5nIGB1bmRlZmluZWRgKSwgZmllbGQgdmFsdWVzIHdpbGwgYmUgdGVzdGVkIHdpdGggYSBzdHJpbmcgY29tcGFyaXNvbi5cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2hpZGRlbj1mYWxzZV1cbiAqL1xuXG4vKiogQHR5cGVkZWYge29iamVjdHxtZW51SXRlbVtdfSBzdWJtZW51SXRlbVxuICogQHN1bW1hcnkgSGllcmFyY2hpY2FsIGFycmF5IG9mIHNlbGVjdCBsaXN0IGl0ZW1zLlxuICogQGRlc2MgRGF0YSBzdHJ1Y3R1cmUgcmVwcmVzZW50aW5nIHRoZSBsaXN0IG9mIGA8b3B0aW9uPi4uLjwvb3B0aW9uPmAgYW5kIGA8b3B0Z3JvdXA+Li4uPC9vcHRncm91cD5gIGVsZW1lbnRzIHRoYXQgbWFrZSB1cCBhIGA8c2VsZWN0Pi4uLjwvc2VsZWN0PmAgZWxlbWVudC5cbiAqXG4gKiA+IEFsdGVybmF0ZSBmb3JtOiBJbnN0ZWFkIG9mIGFuIG9iamVjdCB3aXRoIGEgYG1lbnVgIHByb3BlcnR5IGNvbnRhaW5pbmcgYW4gYXJyYXksIG1heSBpdHNlbGYgYmUgdGhhdCBhcnJheS4gQm90aCBmb3JtcyBoYXZlIHRoZSBvcHRpb25hbCBgbGFiZWxgIHByb3BlcnR5LlxuICogQHByb3BlcnR5IHtzdHJpbmd9IFtsYWJlbF0gLSBEZWZhdWx0cyB0byBhIGdlbmVyYXRlZCBzdHJpbmcgb2YgdGhlIGZvcm0gXCJHcm91cCBuWy5tXS4uLlwiIHdoZXJlIGVhY2ggZGVjaW1hbCBwb3NpdGlvbiByZXByZXNlbnRzIGEgbGV2ZWwgb2YgdGhlIG9wdGdyb3VwIGhpZXJhcmNoeS5cbiAqIEBwcm9wZXJ0eSB7bWVudUl0ZW1bXX0gc3VibWVudVxuICovXG5cbi8qKiBAdHlwZWRlZiB7c3RyaW5nfHZhbHVlSXRlbXxzdWJtZW51SXRlbX0gbWVudUl0ZW1cbiAqIE1heSBiZSBvbmUgb2YgdGhyZWUgcG9zc2libGUgdHlwZXMgdGhhdCBzcGVjaWZ5IGVpdGhlciBhbiBgPG9wdGlvbj4uLi4uPC9vcHRpb24+YCBlbGVtZW50IG9yIGFuIGA8b3B0Z3JvdXA+Li4uLjwvb3B0Z3JvdXA+YCBlbGVtZW50IGFzIGZvbGxvd3M6XG4gKiAqIElmIGEgYHN0cmluZ2AsIHNwZWNpZmllcyB0aGUgdGV4dCBvZiBhbiBgPG9wdGlvbj4uLi4uPC9vcHRpb24+YCBlbGVtZW50IHdpdGggbm8gYHZhbHVlYCBhdHRyaWJ1dGUuIChJbiB0aGUgYWJzZW5jZSBvZiBhIGB2YWx1ZWAgYXR0cmlidXRlLCB0aGUgYHZhbHVlYCBwcm9wZXJ0eSBvZiB0aGUgZWxlbWVudCBkZWZhdWx0cyB0byB0aGUgdGV4dC4pXG4gKiAqIElmIHNoYXBlZCBsaWtlIGEge0BsaW5rIHZhbHVlSXRlbX0gb2JqZWN0LCBzcGVjaWZpZXMgYm90aCB0aGUgdGV4dCBhbmQgdmFsdWUgb2YgYW4gYDxvcHRpb24uLi4uPC9vcHRpb24+YCBlbGVtZW50LlxuICogKiBJZiBzaGFwZWQgbGlrZSBhIHtAbGluayBzdWJtZW51SXRlbX0gb2JqZWN0IChvciBpdHMgYWx0ZXJuYXRlIGFycmF5IGZvcm0pLCBzcGVjaWZpZXMgYW4gYDxvcHRncm91cD4uLi4uPC9vcHRncm91cD5gIGVsZW1lbnQuXG4gKi9cblxuLyoqXG4gKiBAc3VtbWFyeSBCdWlsZHMgYSBuZXcgbWVudSBwcmUtcG9wdWxhdGVkIHdpdGggaXRlbXMgYW5kIGdyb3Vwcy5cbiAqIEBkZXNjIFRoaXMgZnVuY3Rpb24gY3JlYXRlcyBhIG5ldyBwb3AtdXAgbWVudSAoYS5rLmEuIFwiZHJvcC1kb3duXCIpLiBUaGlzIGlzIGEgYDxzZWxlY3Q+Li4uPC9zZWxlY3Q+YCBlbGVtZW50LCBwcmUtcG9wdWxhdGVkIHdpdGggaXRlbXMgKGA8b3B0aW9uPi4uLjwvb3B0aW9uPmAgZWxlbWVudHMpIGFuZCBncm91cHMgKGA8b3B0Z3JvdXA+Li4uPC9vcHRncm91cD5gIGVsZW1lbnRzKS5cbiAqID4gQm9udXM6IFRoaXMgZnVuY3Rpb24gYWxzbyBidWlsZHMgYGlucHV0IHR5cGU9dGV4dGAgZWxlbWVudHMuXG4gKiA+IE5PVEU6IFRoaXMgZnVuY3Rpb24gZ2VuZXJhdGVzIE9QVEdST1VQIGVsZW1lbnRzIGZvciBzdWJ0cmVlcy4gSG93ZXZlciwgbm90ZSB0aGF0IEhUTUw1IHNwZWNpZmllcyB0aGF0IE9QVEdST1VQIGVsZW1uZW50cyBtYWRlIG5vdCBuZXN0ISBUaGlzIGZ1bmN0aW9uIGdlbmVyYXRlcyB0aGUgbWFya3VwIGZvciB0aGVtIGJ1dCB0aGV5IGFyZSBub3QgcmVuZGVyZWQgYnkgbW9zdCBicm93c2Vycywgb3Igbm90IGNvbXBsZXRlbHkuIFRoZXJlZm9yZSwgZm9yIG5vdywgZG8gbm90IHNwZWNpZnkgbW9yZSB0aGFuIG9uZSBsZXZlbCBzdWJ0cmVlcy4gRnV0dXJlIHZlcnNpb25zIG9mIEhUTUwgbWF5IHN1cHBvcnQgaXQuIEkgYWxzbyBwbGFuIHRvIGFkZCBoZXJlIG9wdGlvbnMgdG8gYXZvaWQgT1BUR1JPVVBTIGVudGlyZWx5IGVpdGhlciBieSBpbmRlbnRpbmcgb3B0aW9uIHRleHQsIG9yIGJ5IGNyZWF0aW5nIGFsdGVybmF0ZSBET00gbm9kZXMgdXNpbmcgYDxsaT5gIGluc3RlYWQgb2YgYDxzZWxlY3Q+YCwgb3IgYm90aC5cbiAqIEBtZW1iZXJPZiBwb3BNZW51XG4gKlxuICogQHBhcmFtIHtFbGVtZW50fHN0cmluZ30gZWwgLSBNdXN0IGJlIG9uZSBvZiAoY2FzZS1zZW5zaXRpdmUpOlxuICogKiB0ZXh0IGJveCAtIGFuIGBIVE1MSW5wdXRFbGVtZW50YCB0byB1c2UgYW4gZXhpc3RpbmcgZWxlbWVudCBvciBgJ0lOUFVUJ2AgdG8gY3JlYXRlIGEgbmV3IG9uZVxuICogKiBkcm9wLWRvd24gLSBhbiBgSFRNTFNlbGVjdEVsZW1lbnRgIHRvIHVzZSBhbiBleGlzdGluZyBlbGVtZW50IG9yIGAnU0VMRUNUJ2AgdG8gY3JlYXRlIGEgbmV3IG9uZVxuICogKiBzdWJtZW51IC0gYW4gYEhUTUxPcHRHcm91cEVsZW1lbnRgIHRvIHVzZSBhbiBleGlzdGluZyBlbGVtZW50IG9yIGAnT1BUR1JPVVAnYCB0byBjcmVhdGUgYSBuZXcgb25lIChtZWFudCBmb3IgaW50ZXJuYWwgdXNlIG9ubHkpXG4gKlxuICogQHBhcmFtIHttZW51SXRlbVtdfSBbbWVudV0gLSBIaWVyYXJjaGljYWwgbGlzdCBvZiBzdHJpbmdzIHRvIGFkZCBhcyBgPG9wdGlvbj4uLi48L29wdGlvbj5gIG9yIGA8b3B0Z3JvdXA+Li4uLjwvb3B0Z3JvdXA+YCBlbGVtZW50cy4gT21pdHRpbmcgY3JlYXRlcyBhIHRleHQgYm94LlxuICpcbiAqIEBwYXJhbSB7bnVsbHxzdHJpbmd9IFtvcHRpb25zLnByb21wdD0nJ10gLSBBZGRzIGFuIGluaXRpYWwgYDxvcHRpb24+Li4uPC9vcHRpb24+YCBlbGVtZW50IHRvIHRoZSBkcm9wLWRvd24gd2l0aCB0aGlzIHZhbHVlIGluIHBhcmVudGhlc2VzIGFzIGl0cyBgdGV4dGA7IGFuZCBlbXB0eSBzdHJpbmcgYXMgaXRzIGB2YWx1ZWAuIERlZmF1bHQgaXMgZW1wdHkgc3RyaW5nLCB3aGljaCBjcmVhdGVzIGEgYmxhbmsgcHJvbXB0OyBgbnVsbGAgc3VwcHJlc3NlcyBwcm9tcHQgYWx0b2dldGhlci5cbiAqXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnNvcnRdIC0gV2hldGhlciB0byBhbHBoYSBzb3J0IG9yIG5vdC4gSWYgdHJ1dGh5LCBzb3J0cyBlYWNoIG9wdGdyb3VwIG9uIGl0cyBgbGFiZWxgOyBhbmQgZWFjaCBzZWxlY3Qgb3B0aW9uIG9uIGl0cyB0ZXh0IChpdHMgYGFsaWFzYCBvciBgaGVhZGVyYCBpZiBnaXZlbjsgb3IgaXRzIGBuYW1lYCBpZiBub3QpLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nW119IFtvcHRpb25zLmJsYWNrbGlzdF0gLSBPcHRpb25hbCBsaXN0IG9mIG1lbnUgaXRlbSBuYW1lcyB0byBiZSBpZ25vcmVkLlxuICpcbiAqIEBwYXJhbSB7bnVtYmVyW119IFtvcHRpb25zLmJyZWFkY3J1bWJzXSAtIExpc3Qgb2Ygb3B0aW9uIGdyb3VwIHNlY3Rpb24gbnVtYmVycyAocm9vdCBpcyBzZWN0aW9uIDApLiAoRm9yIGludGVybmFsIHVzZS4pXG4gKlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5hcHBlbmQ9ZmFsc2VdIC0gV2hlbiBgZWxgIGlzIGFuIGV4aXN0aW5nIGA8c2VsZWN0PmAgRWxlbWVudCwgZ2l2aW5nIHRydXRoeSB2YWx1ZSBhZGRzIHRoZSBuZXcgY2hpbGRyZW4gd2l0aG91dCBmaXJzdCByZW1vdmluZyBleGlzdGluZyBjaGlsZHJlbi5cbiAqXG4gKiBAcmV0dXJucyB7RWxlbWVudH0gRWl0aGVyIGEgYDxzZWxlY3Q+YCBvciBgPG9wdGdyb3VwPmAgZWxlbWVudC5cbiAqL1xuZnVuY3Rpb24gYnVpbGQoZWwsIG1lbnUsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHZhciBwcm9tcHQgPSBvcHRpb25zLnByb21wdCxcbiAgICAgICAgYmxhY2tsaXN0ID0gb3B0aW9ucy5ibGFja2xpc3QsXG4gICAgICAgIHNvcnQgPSBvcHRpb25zLnNvcnQsXG4gICAgICAgIGJyZWFkY3J1bWJzID0gb3B0aW9ucy5icmVhZGNydW1icyB8fCBbXSxcbiAgICAgICAgcGF0aCA9IGJyZWFkY3J1bWJzLmxlbmd0aCA/IGJyZWFkY3J1bWJzLmpvaW4oJy4nKSArICcuJyA6ICcnLFxuICAgICAgICBzdWJ0cmVlTmFtZSA9IHBvcE1lbnUuc3VidHJlZSxcbiAgICAgICAgZ3JvdXBJbmRleCA9IDAsXG4gICAgICAgIHRhZ05hbWU7XG5cbiAgICBpZiAoZWwgaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgICAgIHRhZ05hbWUgPSBlbC50YWdOYW1lO1xuICAgICAgICBpZiAoIW9wdGlvbnMuYXBwZW5kKSB7XG4gICAgICAgICAgICBlbC5pbm5lckhUTUwgPSAnJzsgLy8gcmVtb3ZlIGFsbCA8b3B0aW9uPiBhbmQgPG9wdGdyb3VwPiBlbGVtZW50c1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGFnTmFtZSA9IGVsO1xuICAgICAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gICAgfVxuXG4gICAgaWYgKG1lbnUpIHtcbiAgICAgICAgdmFyIGFkZCwgbmV3T3B0aW9uO1xuICAgICAgICBpZiAodGFnTmFtZSA9PT0gJ1NFTEVDVCcpIHtcbiAgICAgICAgICAgIGFkZCA9IGVsLmFkZDtcbiAgICAgICAgICAgIGlmIChwcm9tcHQpIHtcbiAgICAgICAgICAgICAgICBuZXdPcHRpb24gPSBuZXcgT3B0aW9uKHByb21wdCwgJycpO1xuICAgICAgICAgICAgICAgIG5ld09wdGlvbi5pbm5lckhUTUwgKz0gJyZoZWxsaXA7JztcbiAgICAgICAgICAgICAgICBlbC5hZGQobmV3T3B0aW9uKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvbXB0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZWwuYWRkKG5ldyBPcHRpb24oKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGQgPSBlbC5hcHBlbmRDaGlsZDtcbiAgICAgICAgICAgIGVsLmxhYmVsID0gcHJvbXB0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNvcnQpIHtcbiAgICAgICAgICAgIG1lbnUgPSBtZW51LnNsaWNlKCkuc29ydChpdGVtQ29tcGFyYXRvcik7IC8vIHNvcnRlZCBjbG9uZVxuICAgICAgICB9XG5cbiAgICAgICAgbWVudS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgIC8vIGlmIGl0ZW0gaXMgb2YgZm9ybSBhKGIpIGFuZCB0aGVyZSBpcyBhbiBmdW5jdGlvbiBhIGluIG9wdGlvbnMsIHRoZW4gaXRlbSA9IG9wdGlvbnMuYShiKVxuICAgICAgICAgICAgaWYgKG9wdGlvbnMgJiYgdHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGlyZWN0aW9uID0gaXRlbS5tYXRjaChSRUdFWFBfSU5ESVJFQ1RJT04pO1xuICAgICAgICAgICAgICAgIGlmIChpbmRpcmVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYSA9IGluZGlyZWN0aW9uWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgYiA9IGluZGlyZWN0aW9uWzJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgZiA9IG9wdGlvbnNbYV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IGYoYik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyAnYnVpbGQ6IEV4cGVjdGVkIG9wdGlvbnMuJyArIGEgKyAnIHRvIGJlIGEgZnVuY3Rpb24uJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0pICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyAnYnVpbGQ6IEV4cGVjdGVkIGEgcmVzdWx0IGZyb20gb3B0aW9ucy4nICsgYSArICcoJyArIGIgKyAnKS4nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3VidHJlZSA9IGl0ZW1bc3VidHJlZU5hbWVdIHx8IGl0ZW07XG4gICAgICAgICAgICBpZiAoc3VidHJlZSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXBPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgICAgICBicmVhZGNydW1iczogYnJlYWRjcnVtYnMuY29uY2F0KCsrZ3JvdXBJbmRleCksXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogaXRlbS5sYWJlbCB8fCAnR3JvdXAgJyArIHBhdGggKyBncm91cEluZGV4LFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiBzb3J0LFxuICAgICAgICAgICAgICAgICAgICBibGFja2xpc3Q6IGJsYWNrbGlzdFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICB2YXIgb3B0Z3JvdXAgPSBidWlsZCgnT1BUR1JPVVAnLCBzdWJ0cmVlLCBncm91cE9wdGlvbnMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9wdGdyb3VwLmNoaWxkRWxlbWVudENvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLmFwcGVuZENoaWxkKG9wdGdyb3VwKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoIShibGFja2xpc3QgJiYgYmxhY2tsaXN0LmluZGV4T2YoaXRlbSkgPj0gMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkLmNhbGwoZWwsIG5ldyBPcHRpb24oaXRlbSkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIGlmICghaXRlbS5oaWRkZW4pIHtcblxuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gaXRlbS5uYW1lIHx8IGl0ZW0uYWxpYXMgfHwgaXRlbS5oZWFkZXI7XG4gICAgICAgICAgICAgICAgaWYgKCEoYmxhY2tsaXN0ICYmIGJsYWNrbGlzdC5pbmRleE9mKG5hbWUpID49IDApKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZC5jYWxsKGVsLCBuZXcgT3B0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5hbGlhcyB8fCBpdGVtLmhlYWRlciB8fCBpdGVtLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lXG4gICAgICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBlbC50eXBlID0gJ3RleHQnO1xuICAgIH1cblxuICAgIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gaXRlbUNvbXBhcmF0b3IoYSwgYikge1xuICAgIGEgPSBhLmFsaWFzIHx8IGEuaGVhZGVyIHx8IGEubmFtZSB8fCBhLmxhYmVsIHx8IGE7XG4gICAgYiA9IGIuYWxpYXMgfHwgYi5oZWFkZXIgfHwgYi5uYW1lIHx8IGIubGFiZWwgfHwgYjtcbiAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDA7XG59XG5cbi8qKlxuICogQHN1bW1hcnkgUmVjdXJzaXZlbHkgc2VhcmNoZXMgdGhlIGNvbnRleHQgYXJyYXkgb2YgYG1lbnVJdGVtYHMgZm9yIGEgbmFtZWQgYGl0ZW1gLlxuICogQG1lbWJlck9mIHBvcE1lbnVcbiAqIEB0aGlzIEFycmF5XG4gKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMua2V5cz1bcG9wTWVudS5kZWZhdWx0S2V5XV0gLSBQcm9wZXJ0aWVzIHRvIHNlYXJjaCBlYWNoIG1lbnVJdGVtIHdoZW4gaXQgaXMgYW4gb2JqZWN0LlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5jYXNlU2Vuc2l0aXZlPWZhbHNlXSAtIElnbm9yZSBjYXNlIHdoaWxlIHNlYXJjaGluZy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFZhbHVlIHRvIHNlYXJjaCBmb3IuXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfG1lbnVJdGVtfSBUaGUgZm91bmQgaXRlbSBvciBgdW5kZWZpbmVkYCBpZiBub3QgZm91bmQuXG4gKi9cbmZ1bmN0aW9uIGxvb2t1cChvcHRpb25zLCB2YWx1ZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHZhbHVlID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICB2YXIgc2hhbGxvdywgZGVlcCwgaXRlbSwgcHJvcCxcbiAgICAgICAga2V5cyA9IG9wdGlvbnMgJiYgb3B0aW9ucy5rZXlzIHx8IFtwb3BNZW51LmRlZmF1bHRLZXldLFxuICAgICAgICBjYXNlU2Vuc2l0aXZlID0gb3B0aW9ucyAmJiBvcHRpb25zLmNhc2VTZW5zaXRpdmU7XG5cbiAgICB2YWx1ZSA9IHRvU3RyaW5nKHZhbHVlLCBjYXNlU2Vuc2l0aXZlKTtcblxuICAgIHNoYWxsb3cgPSB0aGlzLmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICB2YXIgc3VidHJlZSA9IGl0ZW1bcG9wTWVudS5zdWJ0cmVlXSB8fCBpdGVtO1xuXG4gICAgICAgIGlmIChzdWJ0cmVlIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIHJldHVybiAoZGVlcCA9IGxvb2t1cC5jYWxsKHN1YnRyZWUsIG9wdGlvbnMsIHZhbHVlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9TdHJpbmcoaXRlbSwgY2FzZVNlbnNpdGl2ZSkgPT09IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgcHJvcCA9IGl0ZW1ba2V5c1tpXV07XG4gICAgICAgICAgICAgICAgaWYgKHByb3AgJiYgdG9TdHJpbmcocHJvcCwgY2FzZVNlbnNpdGl2ZSkgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgaXRlbSA9IGRlZXAgfHwgc2hhbGxvdztcblxuICAgIHJldHVybiBpdGVtICYmIChpdGVtLm5hbWUgPyBpdGVtIDogeyBuYW1lOiBpdGVtIH0pO1xufVxuXG5mdW5jdGlvbiB0b1N0cmluZyhzLCBjYXNlU2Vuc2l0aXZlKSB7XG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgIGlmIChzKSB7XG4gICAgICAgIHJlc3VsdCArPSBzOyAvLyBjb252ZXJ0IHMgdG8gc3RyaW5nXG4gICAgICAgIGlmICghY2FzZVNlbnNpdGl2ZSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0LnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBSZWN1cnNpdmVseSB3YWxrcyB0aGUgY29udGV4dCBhcnJheSBvZiBgbWVudUl0ZW1gcyBhbmQgY2FsbHMgYGl0ZXJhdGVlYCBvbiBlYWNoIGl0ZW0gdGhlcmVpbi5cbiAqIEBkZXNjIGBpdGVyYXRlZWAgaXMgY2FsbGVkIHdpdGggZWFjaCBpdGVtICh0ZXJtaW5hbCBub2RlKSBpbiB0aGUgbWVudSB0cmVlIGFuZCBhIGZsYXQgMC1iYXNlZCBpbmRleC4gUmVjdXJzZXMgb24gbWVtYmVyIHdpdGggbmFtZSBvZiBgcG9wTWVudS5zdWJ0cmVlYC5cbiAqXG4gKiBUaGUgbm9kZSB3aWxsIGFsd2F5cyBiZSBhIHtAbGluayB2YWx1ZUl0ZW19IG9iamVjdDsgd2hlbiBhIGBzdHJpbmdgLCBpdCBpcyBib3hlZCBmb3IgeW91LlxuICpcbiAqIEBtZW1iZXJPZiBwb3BNZW51XG4gKlxuICogQHRoaXMgQXJyYXlcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBpdGVyYXRlZSAtIEZvciBlYWNoIGl0ZW0gaW4gdGhlIG1lbnUsIGBpdGVyYXRlZWAgaXMgY2FsbGVkIHdpdGg6XG4gKiAqIHRoZSBgdmFsdWVJdGVtYCAoaWYgdGhlIGl0ZW0gaXMgYSBwcmltYXRpdmUgc3RyaW5nLCBpdCBpcyB3cmFwcGVkIHVwIGZvciB5b3UpXG4gKiAqIGEgMC1iYXNlZCBgb3JkaW5hbGBcbiAqXG4gKiBUaGUgYGl0ZXJhdGVlYCByZXR1cm4gdmFsdWUgY2FuIGJlIHVzZWQgdG8gcmVwbGFjZSB0aGUgaXRlbSwgYXMgZm9sbG93czpcbiAqICogYHVuZGVmaW5lZGAgLSBkbyBub3RoaW5nXG4gKiAqIGBudWxsYCAtIHNwbGljZSBvdXQgdGhlIGl0ZW07IHJlc3VsdGluZyBlbXB0eSBzdWJtZW51cyBhcmUgYWxzbyBzcGxpY2VkIG91dCAoc2VlIG5vdGUpXG4gKiAqIGFueXRoaW5nIGVsc2UgLSByZXBsYWNlIHRoZSBpdGVtIHdpdGggdGhpcyB2YWx1ZTsgaWYgdmFsdWUgaXMgYSBzdWJ0cmVlIChpLmUuLCBhbiBhcnJheSkgYGl0ZXJhdGVlYCB3aWxsIHRoZW4gYmUgY2FsbGVkIHRvIHdhbGsgaXQgYXMgd2VsbCAoc2VlIG5vdGUpXG4gKlxuICogPiBOb3RlOiBSZXR1cm5pbmcgYW55dGhpbmcgKG90aGVyIHRoYW4gYHVuZGVmaW5lZGApIGZyb20gYGl0ZXJhdGVlYCB3aWxsIChkZWVwbHkpIG11dGF0ZSB0aGUgb3JpZ2luYWwgYG1lbnVgIHNvIHlvdSBtYXkgd2FudCB0byBjb3B5IGl0IGZpcnN0IChkZWVwbHksIGluY2x1ZGluZyBhbGwgbGV2ZWxzIG9mIGFycmF5IG5lc3RpbmcgYnV0IG5vdCB0aGUgdGVybWluYWwgbm9kZSBvYmplY3RzKS5cbiAqXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBOdW1iZXIgb2YgaXRlbXMgKHRlcm1pbmFsIG5vZGVzKSBpbiB0aGUgbWVudSB0cmVlLlxuICovXG5mdW5jdGlvbiB3YWxrKGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIG1lbnUgPSB0aGlzLFxuICAgICAgICBvcmRpbmFsID0gMCxcbiAgICAgICAgc3VidHJlZU5hbWUgPSBwb3BNZW51LnN1YnRyZWUsXG4gICAgICAgIGksIGl0ZW0sIHN1YnRyZWUsIG5ld1ZhbDtcblxuICAgIGlmIChjb250ZXh0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgfVxuXG4gICAgZm9yIChpID0gbWVudS5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICBpdGVtID0gbWVudVtpXTtcbiAgICAgICAgc3VidHJlZSA9IGl0ZW1bc3VidHJlZU5hbWVdIHx8IGl0ZW07XG5cbiAgICAgICAgaWYgKCEoc3VidHJlZSBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgc3VidHJlZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc3VidHJlZSkge1xuICAgICAgICAgICAgbmV3VmFsID0gaXRlcmF0ZWUuY2FsbChjb250ZXh0LCBpdGVtLm5hbWUgPyBpdGVtIDogeyBuYW1lOiBpdGVtIH0sIG9yZGluYWwpO1xuICAgICAgICAgICAgb3JkaW5hbCArPSAxO1xuXG4gICAgICAgICAgICBpZiAobmV3VmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAobmV3VmFsID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lbnUuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICBvcmRpbmFsIC09IDE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWVudVtpXSA9IGl0ZW0gPSBuZXdWYWw7XG4gICAgICAgICAgICAgICAgICAgIHN1YnRyZWUgPSBpdGVtW3N1YnRyZWVOYW1lXSB8fCBpdGVtO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIShzdWJ0cmVlIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJ0cmVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN1YnRyZWUpIHtcbiAgICAgICAgICAgIG9yZGluYWwgKz0gd2Fsay5jYWxsKHN1YnRyZWUsIGl0ZXJhdGVlKTtcbiAgICAgICAgICAgIGlmIChzdWJ0cmVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG1lbnUuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIG9yZGluYWwgLT0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvcmRpbmFsO1xufVxuXG4vKipcbiAqIEBzdW1tYXJ5IEZvcm1hdCBpdGVtIG5hbWUgd2l0aCBpdCdzIGFsaWFzIHdoZW4gYXZhaWxhYmxlLlxuICogQG1lbWJlck9mIHBvcE1lbnVcbiAqIEBwYXJhbSB7c3RyaW5nfHZhbHVlSXRlbX0gaXRlbVxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGZvcm1hdHRlZCBuYW1lIGFuZCBhbGlhcy5cbiAqL1xuZnVuY3Rpb24gZm9ybWF0SXRlbShpdGVtKSB7XG4gICAgdmFyIG5hbWUgPSBpdGVtLm5hbWUgfHwgaXRlbSxcbiAgICAgICAgYWxpYXMgPSBpdGVtLmFsaWFzIHx8IGl0ZW0uaGVhZGVyO1xuXG4gICAgcmV0dXJuIGFsaWFzID8gJ1wiJyArIGFsaWFzICsgJ1wiICgnICsgbmFtZSArICcpJyA6IG5hbWU7XG59XG5cblxuZnVuY3Rpb24gaXNHcm91cFByb3h5KHMpIHtcbiAgICByZXR1cm4gUkVHRVhQX0lORElSRUNUSU9OLnRlc3Qocyk7XG59XG5cbi8qKlxuICogQG5hbWVzcGFjZVxuICovXG52YXIgcG9wTWVudSA9IHtcbiAgICBidWlsZDogYnVpbGQsXG4gICAgd2Fsazogd2FsayxcbiAgICBsb29rdXA6IGxvb2t1cCxcbiAgICBmb3JtYXRJdGVtOiBmb3JtYXRJdGVtLFxuICAgIGlzR3JvdXBQcm94eTogaXNHcm91cFByb3h5LFxuICAgIHN1YnRyZWU6ICdzdWJtZW51JyxcbiAgICBkZWZhdWx0S2V5OiAnbmFtZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcG9wTWVudTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIC8vIGEgcmVnZXggc2VhcmNoIHBhdHRlcm4gdGhhdCBtYXRjaGVzIGFsbCB0aGUgcmVzZXJ2ZWQgY2hhcnMgb2YgYSByZWdleCBzZWFyY2ggcGF0dGVyblxuICAgIHJlc2VydmVkID0gLyhbXFwuXFxcXFxcK1xcKlxcP1xcXlxcJFxcKFxcKVxce1xcfVxcPVxcIVxcPFxcPlxcfFxcOlxcW1xcXV0pL2csXG5cbiAgICAvLyByZWdleCB3aWxkY2FyZCBzZWFyY2ggcGF0dGVybnNcbiAgICBSRUdFWFBfV0lMRENBUkQgPSAnLionLFxuICAgIFJFR0VYUF9XSUxEQ0hBUiA9ICcuJyxcbiAgICBSRUdFWFBfV0lMRENBUkRfTUFUQ0hFUiA9ICcoJyArIFJFR0VYUF9XSUxEQ0FSRCArICcpJyxcblxuICAgIC8vIExJS0Ugc2VhcmNoIHBhdHRlcm5zXG4gICAgTElLRV9XSUxEQ0hBUiA9ICdfJyxcbiAgICBMSUtFX1dJTERDQVJEID0gJyUnLFxuXG4gICAgLy8gcmVnZXggc2VhcmNoIHBhdHRlcm5zIHRoYXQgbWF0Y2ggTElLRSBzZWFyY2ggcGF0dGVybnNcbiAgICBSRUdFWFBfTElLRV9QQVRURVJOX01BVENIRVIgPSBuZXcgUmVnRXhwKCcoJyArIFtcbiAgICAgICAgTElLRV9XSUxEQ0hBUixcbiAgICAgICAgTElLRV9XSUxEQ0FSRCxcbiAgICAgICAgJ1xcXFxbXFxcXF4/W14tXFxcXF1dK10nLCAvLyBtYXRjaGVzIGEgTElLRSBzZXQgKHNhbWUgc3ludGF4IGFzIGEgUmVnRXhwIHNldClcbiAgICAgICAgJ1xcXFxbXFxcXF4/W14tXFxcXF1dXFxcXC1bXlxcXFxdXV0nIC8vIG1hdGNoZXMgYSBMSUtFIHJhbmdlIChzYW1lIHN5bnRheCBhcyBhIFJlZ0V4cCByYW5nZSlcbiAgICBdLmpvaW4oJ3wnKSArICcpJywgJ2cnKTtcblxuZnVuY3Rpb24gcmVnRXhwTElLRShwYXR0ZXJuLCBpZ25vcmVDYXNlKSB7XG4gICAgdmFyIGksIHBhcnRzO1xuXG4gICAgLy8gRmluZCBhbGwgTElLRSBwYXR0ZXJuc1xuICAgIHBhcnRzID0gcGF0dGVybi5tYXRjaChSRUdFWFBfTElLRV9QQVRURVJOX01BVENIRVIpO1xuXG4gICAgaWYgKHBhcnRzKSB7XG4gICAgICAgIC8vIFRyYW5zbGF0ZSBmb3VuZCBMSUtFIHBhdHRlcm5zIHRvIHJlZ2V4IHBhdHRlcm5zLCBlc2NhcGVkIGludGVydmVuaW5nIG5vbi1wYXR0ZXJucywgYW5kIGludGVybGVhdmUgdGhlIHR3b1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgLy8gRXNjYXBlIGxlZnQgYnJhY2tldHMgKHVucGFpcmVkIHJpZ2h0IGJyYWNrZXRzIGFyZSBPSylcbiAgICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gJ1snKSB7XG4gICAgICAgICAgICAgICAgcGFydHNbaV0gPSByZWdFeHBMSUtFLnJlc2VydmUocGFydHNbaV0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIGVhY2ggZm91bmQgcGF0dGVybiBtYXRjaGFibGUgYnkgZW5jbG9zaW5nIGluIHBhcmVudGhlc2VzXG4gICAgICAgICAgICBwYXJ0c1tpXSA9ICcoJyArIHBhcnRzW2ldICsgJyknO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWF0Y2ggdGhlc2UgcHJlY2lzZSBwYXR0ZXJucyBhZ2FpbiB3aXRoIHRoZWlyIGludGVydmVuaW5nIG5vbi1wYXR0ZXJucyAoaS5lLiwgdGV4dClcbiAgICAgICAgcGFydHMgPSBwYXR0ZXJuLm1hdGNoKG5ldyBSZWdFeHAoXG4gICAgICAgICAgICBSRUdFWFBfV0lMRENBUkRfTUFUQ0hFUiArXG4gICAgICAgICAgICBwYXJ0cy5qb2luKFJFR0VYUF9XSUxEQ0FSRF9NQVRDSEVSKSAgK1xuICAgICAgICAgICAgUkVHRVhQX1dJTERDQVJEX01BVENIRVJcbiAgICAgICAgKSk7XG5cbiAgICAgICAgLy8gRGlzY2FyZCBmaXJzdCBtYXRjaCBvZiBub24tZ2xvYmFsIHNlYXJjaCAod2hpY2ggaXMgdGhlIHdob2xlIHN0cmluZylcbiAgICAgICAgcGFydHMuc2hpZnQoKTtcblxuICAgICAgICAvLyBGb3IgZWFjaCByZS1mb3VuZCBwYXR0ZXJuIHBhcnQsIHRyYW5zbGF0ZSAlIGFuZCBfIHRvIHJlZ2V4IGVxdWl2YWxlbnRcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IHBhcnRzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2ldO1xuICAgICAgICAgICAgc3dpdGNoIChwYXJ0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSBMSUtFX1dJTERDQVJEOiBwYXJ0ID0gUkVHRVhQX1dJTERDQVJEOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIExJS0VfV0lMRENIQVI6IHBhcnQgPSBSRUdFWFBfV0lMRENIQVI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHZhciBqID0gcGFydFsxXSA9PT0gJ14nID8gMiA6IDE7XG4gICAgICAgICAgICAgICAgICAgIHBhcnQgPSAnWycgKyByZWdFeHBMSUtFLnJlc2VydmUocGFydC5zdWJzdHIoaiwgcGFydC5sZW5ndGggLSAoaiArIDEpKSkgKyAnXSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXJ0c1tpXSA9IHBhcnQ7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJ0cyA9IFtwYXR0ZXJuXTtcbiAgICB9XG5cbiAgICAvLyBGb3IgZWFjaCBzdXJyb3VuZGluZyB0ZXh0IHBhcnQsIGVzY2FwZSByZXNlcnZlZCByZWdleCBjaGFyc1xuICAgIGZvciAoaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICBwYXJ0c1tpXSA9IHJlZ0V4cExJS0UucmVzZXJ2ZShwYXJ0c1tpXSk7XG4gICAgfVxuXG4gICAgLy8gSm9pbiBhbGwgdGhlIGludGVybGVhdmVkIHBhcnRzXG4gICAgcGFydHMgPSBwYXJ0cy5qb2luKCcnKTtcblxuICAgIC8vIE9wdGltaXplIG9yIGFuY2hvciB0aGUgcGF0dGVybiBhdCBlYWNoIGVuZCBhcyBuZWVkZWRcbiAgICBpZiAocGFydHMuc3Vic3RyKDAsIDIpID09PSBSRUdFWFBfV0lMRENBUkQpIHsgcGFydHMgPSBwYXJ0cy5zdWJzdHIoMik7IH0gZWxzZSB7IHBhcnRzID0gJ14nICsgcGFydHM7IH1cbiAgICBpZiAocGFydHMuc3Vic3RyKC0yLCAyKSA9PT0gUkVHRVhQX1dJTERDQVJEKSB7IHBhcnRzID0gcGFydHMuc3Vic3RyKDAsIHBhcnRzLmxlbmd0aCAtIDIpOyB9IGVsc2UgeyBwYXJ0cyArPSAnJCc7IH1cblxuICAgIC8vIFJldHVybiB0aGUgbmV3IHJlZ2V4XG4gICAgcmV0dXJuIG5ldyBSZWdFeHAocGFydHMsIGlnbm9yZUNhc2UgPyAnaScgOiB1bmRlZmluZWQpO1xufVxuXG5yZWdFeHBMSUtFLnJlc2VydmUgPSBmdW5jdGlvbiAocykge1xuICAgIHJldHVybiBzLnJlcGxhY2UocmVzZXJ2ZWQsICdcXFxcJDEnKTtcbn07XG5cbnZhciBjYWNoZSwgc2l6ZTtcblxuLyoqXG4gKiBAc3VtbWFyeSBEZWxldGUgYSBwYXR0ZXJuIGZyb20gdGhlIGNhY2hlOyBvciBjbGVhciB0aGUgd2hvbGUgY2FjaGUuXG4gKiBAcGFyYW0ge3N0cmluZ30gW3BhdHRlcm5dIC0gVGhlIExJS0UgcGF0dGVybiB0byByZW1vdmUgZnJvbSB0aGUgY2FjaGUuIEZhaWxzIHNpbGVudGx5IGlmIG5vdCBmb3VuZCBpbiB0aGUgY2FjaGUuIElmIHBhdHRlcm4gb21pdHRlZCwgY2xlYXJzIHdob2xlIGNhY2hlLlxuICovXG4ocmVnRXhwTElLRS5jbGVhckNhY2hlID0gZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICBpZiAoIXBhdHRlcm4pIHtcbiAgICAgICAgY2FjaGUgPSB7fTtcbiAgICAgICAgc2l6ZSA9IDA7XG4gICAgfSBlbHNlIGlmIChjYWNoZVtwYXR0ZXJuXSkge1xuICAgICAgICBkZWxldGUgY2FjaGVbcGF0dGVybl07XG4gICAgICAgIHNpemUtLTtcbiAgICB9XG4gICAgcmV0dXJuIHNpemU7XG59KSgpOyAvLyBpbml0IHRoZSBjYWNoZVxuXG5yZWdFeHBMSUtFLmdldENhY2hlU2l6ZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHNpemU7IH07XG5cbi8qKlxuICogQHN1bW1hcnkgQ2FjaGVkIHZlcnNpb24gb2YgYHJlZ0V4cExJS0UoKWAuXG4gKiBAZGVzYyBDYWNoZWQgZW50cmllcyBhcmUgc3ViamVjdCB0byBnYXJiYWdlIGNvbGxlY3Rpb24gaWYgYGtlZXBgIGlzIGB1bmRlZmluZWRgIG9yIGBmYWxzZWAgb24gaW5zZXJ0aW9uIG9yIGBmYWxzZWAgb24gbW9zdCByZWNlbnQgcmVmZXJlbmNlLiBHYXJiYWdlIGNvbGxlY3Rpb24gd2lsbCBvY2N1ciBpZmYgYHJlZ0V4cExJS0UuY2FjaGVNYXhgIGlzIGRlZmluZWQgYW5kIGl0IGVxdWFscyB0aGUgbnVtYmVyIG9mIGNhY2hlZCBwYXR0ZXJucy4gVGhlIGdhcmJhZ2UgY29sbGVjdG9yIHNvcnRzIHRoZSBwYXR0ZXJucyBiYXNlZCBvbiBtb3N0IHJlY2VudCByZWZlcmVuY2U7IHRoZSBvbGRlc3QgMTAlIG9mIHRoZSBlbnRyaWVzIGFyZSBkZWxldGVkLiBBbHRlcm5hdGl2ZWx5LCB5b3UgY2FuIG1hbmFnZSB0aGUgY2FjaGUgeW91cnNlbGYgdG8gYSBsaW1pdGVkIGV4dGVudCAoc2VlIHtAbGluayByZWdlRXhwTElLRS5jbGVhckNhY2hlfGNsZWFyQ2FjaGV9KS5cbiAqIEBwYXJhbSBwYXR0ZXJuIC0gdGhlIExJS0UgcGF0dGVybiAodG8gYmUpIGNvbnZlcnRlZCB0byBhIFJlZ0V4cFxuICogQHBhcmFtIFtrZWVwXSAtIElmIGdpdmVuLCBjaGFuZ2VzIHRoZSBrZWVwIHN0YXR1cyBmb3IgdGhpcyBwYXR0ZXJuIGFzIGZvbGxvd3M6XG4gKiAqIGB0cnVlYCBwZXJtYW5lbnRseSBjYWNoZXMgdGhlIHBhdHRlcm4gKG5vdCBzdWJqZWN0IHRvIGdhcmJhZ2UgY29sbGVjdGlvbikgdW50aWwgYGZhbHNlYCBpcyBnaXZlbiBvbiBhIHN1YnNlcXVlbnQgY2FsbFxuICogKiBgZmFsc2VgIGFsbG93cyBnYXJiYWdlIGNvbGxlY3Rpb24gb24gdGhlIGNhY2hlZCBwYXR0ZXJuXG4gKiAqIGB1bmRlZmluZWRgIG5vIGNoYW5nZSB0byBrZWVwIHN0YXR1c1xuICogQHJldHVybnMge1JlZ0V4cH1cbiAqL1xucmVnRXhwTElLRS5jYWNoZWQgPSBmdW5jdGlvbiAoa2VlcCwgcGF0dGVybiwgaWdub3JlQ2FzZSkge1xuICAgIGlmICh0eXBlb2Yga2VlcCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgaWdub3JlQ2FzZSA9IHBhdHRlcm47XG4gICAgICAgIHBhdHRlcm4gPSBrZWVwO1xuICAgICAgICBrZWVwID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBwYXR0ZXJuQW5kQ2FzZSA9IHBhdHRlcm4gKyAoaWdub3JlQ2FzZSA/ICdpJyA6ICdjJyksXG4gICAgICAgIGl0ZW0gPSBjYWNoZVtwYXR0ZXJuQW5kQ2FzZV07XG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgaXRlbS53aGVuID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIGlmIChrZWVwICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGl0ZW0ua2VlcCA9IGtlZXA7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc2l6ZSA9PT0gcmVnRXhwTElLRS5jYWNoZU1heCkge1xuICAgICAgICAgICAgdmFyIGFnZSA9IFtdLCBhZ2VzID0gMCwga2V5LCBpO1xuICAgICAgICAgICAgZm9yIChrZXkgaW4gY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBpdGVtID0gY2FjaGVba2V5XTtcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW0ua2VlcCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYWdlczsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS53aGVuIDwgYWdlW2ldLml0ZW0ud2hlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFnZS5zcGxpY2UoaSwgMCwgeyBrZXk6IGtleSwgaXRlbTogaXRlbSB9KTtcbiAgICAgICAgICAgICAgICAgICAgYWdlcysrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYWdlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZWdFeHBMSUtFKHBhdHRlcm4sIGlnbm9yZUNhc2UpOyAvLyBjYWNoZSBpcyBmdWxsIVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSA9IE1hdGguY2VpbChhZ2UubGVuZ3RoIC8gMTApOyAvLyB3aWxsIGFsd2F5cyBiZSBhdCBsZWFzdCAxXG4gICAgICAgICAgICBzaXplIC09IGk7XG4gICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGNhY2hlW2FnZVtpXS5rZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGl0ZW0gPSBjYWNoZVtwYXR0ZXJuQW5kQ2FzZV0gPSB7XG4gICAgICAgICAgICByZWdleDogcmVnRXhwTElLRShwYXR0ZXJuLCBpZ25vcmVDYXNlKSxcbiAgICAgICAgICAgIGtlZXA6IGtlZXAsXG4gICAgICAgICAgICB3aGVuOiBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICAgICAgICB9O1xuICAgICAgICBzaXplKys7XG4gICAgfVxuICAgIHJldHVybiBpdGVtLnJlZ2V4O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSByZWdFeHBMSUtFO1xuIiwiLy8gdGVtcGxleCBub2RlIG1vZHVsZVxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2pvbmVpdC90ZW1wbGV4XG5cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuXG4vKipcbiAqIE1lcmdlcyB2YWx1ZXMgb2YgZXhlY3V0aW9uIGNvbnRleHQgcHJvcGVydGllcyBuYW1lZCBpbiB0ZW1wbGF0ZSBieSB7cHJvcDF9LFxuICoge3Byb3AyfSwgZXRjLiwgb3IgYW55IGphdmFzY3JpcHQgZXhwcmVzc2lvbiBpbmNvcnBvcmF0aW5nIHN1Y2ggcHJvcCBuYW1lcy5cbiAqIFRoZSBjb250ZXh0IGFsd2F5cyBpbmNsdWRlcyB0aGUgZ2xvYmFsIG9iamVjdC4gSW4gYWRkaXRpb24geW91IGNhbiBzcGVjaWZ5IGEgc2luZ2xlXG4gKiBjb250ZXh0IG9yIGFuIGFycmF5IG9mIGNvbnRleHRzIHRvIHNlYXJjaCAoaW4gdGhlIG9yZGVyIGdpdmVuKSBiZWZvcmUgZmluYWxseVxuICogc2VhcmNoaW5nIHRoZSBnbG9iYWwgY29udGV4dC5cbiAqXG4gKiBNZXJnZSBleHByZXNzaW9ucyBjb25zaXN0aW5nIG9mIHNpbXBsZSBudW1lcmljIHRlcm1zLCBzdWNoIGFzIHswfSwgezF9LCBldGMuLCBkZXJlZlxuICogdGhlIGZpcnN0IGNvbnRleHQgZ2l2ZW4sIHdoaWNoIGlzIGFzc3VtZWQgdG8gYmUgYW4gYXJyYXkuIEFzIGEgY29udmVuaWVuY2UgZmVhdHVyZSxcbiAqIGlmIGFkZGl0aW9uYWwgYXJncyBhcmUgZ2l2ZW4gYWZ0ZXIgYHRlbXBsYXRlYCwgYGFyZ3VtZW50c2AgaXMgdW5zaGlmdGVkIG9udG8gdGhlIGNvbnRleHRcbiAqIGFycmF5LCB0aHVzIG1ha2luZyBmaXJzdCBhZGRpdGlvbmFsIGFyZyBhdmFpbGFibGUgYXMgezF9LCBzZWNvbmQgYXMgezJ9LCBldGMuLCBhcyBpblxuICogYHRlbXBsZXgoJ0hlbGxvLCB7MX0hJywgJ1dvcmxkJylgLiAoezB9IGlzIHRoZSB0ZW1wbGF0ZSBzbyBjb25zaWRlciB0aGlzIHRvIGJlIDEtYmFzZWQuKVxuICpcbiAqIElmIHlvdSBwcmVmZXIgc29tZXRoaW5nIG90aGVyIHRoYW4gYnJhY2VzLCByZWRlZmluZSBgdGVtcGxleC5yZWdleHBgLlxuICpcbiAqIFNlZSB0ZXN0cyBmb3IgZXhhbXBsZXMuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRlbXBsYXRlXG4gKiBAcGFyYW0gey4uLnN0cmluZ30gW2FyZ3NdXG4gKi9cbmZ1bmN0aW9uIHRlbXBsZXgodGVtcGxhdGUpIHtcbiAgICB2YXIgY29udGV4dHMgPSB0aGlzIGluc3RhbmNlb2YgQXJyYXkgPyB0aGlzIDogW3RoaXNdO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkgeyBjb250ZXh0cy51bnNoaWZ0KGFyZ3VtZW50cyk7IH1cbiAgICByZXR1cm4gdGVtcGxhdGUucmVwbGFjZSh0ZW1wbGV4LnJlZ2V4cCwgdGVtcGxleC5tZXJnZXIuYmluZChjb250ZXh0cykpO1xufVxuXG50ZW1wbGV4LnJlZ2V4cCA9IC9cXHsoLio/KVxcfS9nO1xuXG50ZW1wbGV4LndpdGggPSBmdW5jdGlvbiAoaSwgcykge1xuICAgIHJldHVybiAnd2l0aCh0aGlzWycgKyBpICsgJ10peycgKyBzICsgJ30nO1xufTtcblxudGVtcGxleC5jYWNoZSA9IFtdO1xuXG50ZW1wbGV4LmRlcmVmID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGlmICghKHRoaXMubGVuZ3RoIGluIHRlbXBsZXguY2FjaGUpKSB7XG4gICAgICAgIHZhciBjb2RlID0gJ3JldHVybiBldmFsKGV4cHIpJztcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGNvZGUgPSB0ZW1wbGV4LndpdGgoaSwgY29kZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0ZW1wbGV4LmNhY2hlW3RoaXMubGVuZ3RoXSA9IGV2YWwoJyhmdW5jdGlvbihleHByKXsnICsgY29kZSArICd9KScpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWV2YWxcbiAgICB9XG4gICAgcmV0dXJuIHRlbXBsZXguY2FjaGVbdGhpcy5sZW5ndGhdLmNhbGwodGhpcywga2V5KTtcbn07XG5cbnRlbXBsZXgubWVyZ2VyID0gZnVuY3Rpb24gKG1hdGNoLCBrZXkpIHtcbiAgICAvLyBBZHZhbmNlZCBmZWF0dXJlczogQ29udGV4dCBjYW4gYmUgYSBsaXN0IG9mIGNvbnRleHRzIHdoaWNoIGFyZSBzZWFyY2hlZCBpbiBvcmRlci5cbiAgICB2YXIgcmVwbGFjZW1lbnQ7XG5cbiAgICB0cnkge1xuICAgICAgICByZXBsYWNlbWVudCA9IGlzTmFOKGtleSkgPyB0ZW1wbGV4LmRlcmVmLmNhbGwodGhpcywga2V5KSA6IHRoaXNbMF1ba2V5XTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlcGxhY2VtZW50ID0gJ3snICsga2V5ICsgJ30nO1xuICAgIH1cblxuICAgIHJldHVybiByZXBsYWNlbWVudDtcbn07XG5cbi8vIHRoaXMgaW50ZXJmYWNlIGNvbnNpc3RzIHNvbGVseSBvZiB0aGUgdGVtcGxleCBmdW5jdGlvbiAoYW5kIGl0J3MgcHJvcGVydGllcylcbm1vZHVsZS5leHBvcnRzID0gdGVtcGxleDtcbiIsIi8vIENyZWF0ZWQgYnkgSm9uYXRoYW4gRWl0ZW4gb24gMS83LzE2LlxuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVmVyeSBmYXN0IGFycmF5IHRlc3QuXG4gKiBGb3IgY3Jvc3MtZnJhbWUgc2NyaXB0aW5nOyB1c2UgYGNyb3NzRnJhbWVzSXNBcnJheWAgaW5zdGVhZC5cbiAqIEBwYXJhbSB7Kn0gYXJyIC0gVGhlIG9iamVjdCB0byB0ZXN0LlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbnVuc3RydW5naWZ5LmlzQXJyYXkgPSBmdW5jdGlvbihhcnIpIHsgcmV0dXJuIGFyci5jb25zdHJ1Y3RvciA9PT0gQXJyYXk7IH07XG5cbi8qKlxuICogQHN1bW1hcnkgV2FsayBhIGhpZXJhcmNoaWNhbCBvYmplY3QgYXMgSlNPTi5zdHJpbmdpZnkgZG9lcyBidXQgd2l0aG91dCBzZXJpYWxpemluZy5cbiAqXG4gKiBAZGVzYyBVc2FnZTpcbiAqICogdmFyIG15RGlzdGlsbGVkT2JqZWN0ID0gdW5zdHJ1bmdpZnkuY2FsbChteU9iamVjdCk7XG4gKiAqIHZhciBteURpc3RpbGxlZE9iamVjdCA9IG15QXBpLmdldFN0YXRlKCk7IC8vIHdoZXJlIG15QXBpLnByb3RvdHlwZS5nZXRTdGF0ZSA9IHVuc3RydW5naWZ5XG4gKlxuICogUmVzdWx0IGVxdWl2YWxlbnQgdG8gYEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcykpYC5cbiAqXG4gKiA+IERvIG5vdCB1c2UgdGhpcyBmdW5jdGlvbiB0byBnZXQgYSBKU09OIHN0cmluZzsgdXNlIGBKU09OLnN0cmluZ2lmeSh0aGlzKWAgaW5zdGVhZC5cbiAqXG4gKiBAdGhpcyB7KnxvYmplY3R8KltdfSAtIE9iamVjdCB0byB3YWxrOyB0eXBpY2FsbHkgYW4gb2JqZWN0IG9yIGFycmF5LlxuICpcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubnVsbEVsZW1lbnRzPT1mYWxzZV0gLSBQcmVzZXJ2ZSB1bmRlZmluZWQgYXJyYXkgZWxlbWVudHMgYXMgYG51bGxgcy5cbiAqIFVzZSB0aGlzIHdoZW4gcHJlY2lzZSBpbmRleCBtYXR0ZXJzIChub3QgbWVyZWx5IHRoZSBvcmRlciBvZiB0aGUgZWxlbWVudHMpLlxuICpcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubnVsbFByb3BlcnRpZXM9PWZhbHNlXSAtIFByZXNlcnZlIHVuZGVmaW5lZCBvYmplY3QgcHJvcGVydGllcyBhcyBgbnVsbGBzLlxuICpcbiAqIEByZXR1cm5zIHtvYmplY3R9IC0gRGlzdGlsbGVkIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gdW5zdHJ1bmdpZnkob3B0aW9ucykge1xuICAgIHZhciBjbG9uZSwgcHJlc2VydmUsXG4gICAgICAgIG9iamVjdCA9ICh0eXBlb2YgdGhpcy50b0pTT04gPT09ICdmdW5jdGlvbicpID8gdGhpcy50b0pTT04oKSA6IHRoaXM7XG5cbiAgICBpZiAodW5zdHJ1bmdpZnkuaXNBcnJheShvYmplY3QpKSB7XG4gICAgICAgIGNsb25lID0gW107XG4gICAgICAgIHByZXNlcnZlID0gb3B0aW9ucyAmJiBvcHRpb25zLm51bGxFbGVtZW50cztcbiAgICAgICAgb2JqZWN0LmZvckVhY2goZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB1bnN0cnVuZ2lmeS5jYWxsKG9iaik7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNsb25lLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmVzZXJ2ZSkge1xuICAgICAgICAgICAgICAgIGNsb25lLnB1c2gobnVsbCk7IC8vIHVuZGVmaW5lZCBub3QgYSB2YWxpZCBKU09OIHZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSAgaWYgKHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNsb25lID0ge307XG4gICAgICAgIHByZXNlcnZlID0gb3B0aW9ucyAmJiBvcHRpb25zLm51bGxQcm9wZXJ0aWVzO1xuICAgICAgICBPYmplY3Qua2V5cyhvYmplY3QpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB1bnN0cnVuZ2lmeS5jYWxsKG9iamVjdFtrZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY2xvbmVba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmVzZXJ2ZSkge1xuICAgICAgICAgICAgICAgIGNsb25lW2tleV0gPSBudWxsOyAvLyB1bmRlZmluZWQgbm90IGEgdmFsaWQgSlNPTiB2YWx1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjbG9uZSA9IG9iamVjdDtcbiAgICB9XG5cbiAgICByZXR1cm4gY2xvbmU7XG59XG5cbi8qKlxuICogVmVyeSBzbG93IGFycmF5IHRlc3QuIFN1aXRhYmxlIGZvciBjcm9zcy1mcmFtZSBzY3JpcHRpbmcuXG4gKlxuICogU3VnZ2VzdGlvbjogSWYgeW91IG5lZWQgdGhpcyBhbmQgaGF2ZSBqUXVlcnkgbG9hZGVkLCB1c2UgYGpRdWVyeS5pc0FycmF5YCBpbnN0ZWFkIHdoaWNoIGlzIHJlYXNvbmFibHkgZmFzdC5cbiAqXG4gKiBAcGFyYW0geyp9IGFyciAtIFRoZSBvYmplY3QgdG8gdGVzdC5cbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG51bnN0cnVuZ2lmeS5jcm9zc0ZyYW1lc0lzQXJyYXkgPSBmdW5jdGlvbihhcnIpIHsgcmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gYXJyU3RyaW5nOyB9OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVudXNlZC12YXJzXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsIGFyclN0cmluZyA9ICdbb2JqZWN0IEFycmF5XSc7XG5cbm1vZHVsZS5leHBvcnRzID0gdW5zdHJ1bmdpZnk7XG4iXX0=
