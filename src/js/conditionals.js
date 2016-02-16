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
    SQT = '\'',
    SPC = ' ',
    NIL = '';

var idQt = [];
pushSqlIdQts({
    beg: '"',
    end: '"'
});
function pushSqlIdQts(qts) {
    return idQt.unshift(qts);
}
function popSqlIdQts() {
    return idQt.shift();
}
/**
 * @constructor
 */
var Operators = Base.extend({
    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    '<': {
        test: function(a, b) { return a < b; },
        make: function(a, b) { return this.makeDiadic('<', a, b); }
    },
    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    '<=': {
        test: function(a, b) { return a <= b; },
        make: function(a, b) { return this.makeDiadic('<=', a, b); }
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    '=': {
        test: function(a, b) { return a === b; },
        make: function(a, b) { return this.makeDiadic('=', a, b); }
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    '>=': {
        test: function(a, b) { return a >= b; },
        make: function(a, b) { return this.makeDiadic('>=', a, b); }
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    '>': {
        test: function(a, b) { return a > b; },
        make: function(a, b) { return this.makeDiadic('>', a, b); }
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    '\u2260': {
        test: function(a, b) { return a !== b; },
        make: function(a, b) { return this.makeDiadic('<>', a, b); }
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    LIKE: {
        test: function(a, b) { return regExpLIKE.cached(b, true).test(a); },
        make: function(a, b) { return this.makeDiadic(LIKE, a, b); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    'NOT LIKE': {
        test: function(a, b) { return !regExpLIKE.cached(b, true).test(a); },
        make: function(a, b) { return this.makeDiadic(NOT_LIKE, a, b); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    IN: { // TODO: currently forcing string typing; rework calling code to respect column type
        test: function(a, b) { return inOp(a, b) >= 0; },
        make: function(a, b) { return this.makeIN(IN, a, b); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    'NOT IN': { // TODO: currently forcing string typing; rework calling code to respect column type
        test: function(a, b) { return inOp(a, b) < 0; },
        make: function(a, b) { return this.makeIN(NOT_IN, a, b); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    CONTAINS: {
        test: function(a, b) { return containsOp(a, b) >= 0; },
        make: function(a, b) { return this.makeLIKE(LIKE_WILD_CARD, LIKE_WILD_CARD, LIKE, a, b); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    'NOT CONTAINS': {
        test: function(a, b) { return containsOp(a, b) < 0; },
        make: function(a, b) { return this.makeLIKE(LIKE_WILD_CARD, LIKE_WILD_CARD, NOT_LIKE, a, b); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    BEGINS: {
        test: function(a, b) { b = b.toString().toLowerCase(); return beginsOp(a, b.length) === b; },
        make: function(a, b) { return this.makeLIKE(NIL, LIKE_WILD_CARD, LIKE, a, b); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    'NOT BEGINS': {
        test: function(a, b) { b = b.toString().toLowerCase(); return beginsOp(a, b.length) !== b; },
        make: function(a, b) { return this.makeLIKE(NIL, LIKE_WILD_CARD, NOT_LIKE, a, b); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    ENDS: {
        test: function(a, b) { b = b.toString().toLowerCase(); return endsOp(a, b.length) === b; },
        make: function(a, b) { return this.makeLIKE(LIKE_WILD_CARD, NIL, LIKE, a, b); },
        type: 'string'
    },

    /** @type {relationalOperator}
     * @memberof module:conditionals~Operators.prototype
     */
    'NOT ENDS': {
        test: function(a, b) { b = b.toString().toLowerCase(); return endsOp(a, b.length) !== b; },
        make: function(a, b) { return this.makeLIKE(LIKE_WILD_CARD, NIL, NOT_LIKE, a, b); },
        type: 'string'
    },

    /**
     * @memberof module:conditionals~Operators.prototype
     */
    makeLIKE: pureVirtualMethod.bind(this, 'makeLIKE'),

    /**
     * @memberof module:conditionals~Operators.prototype
     */
    makeIN: pureVirtualMethod.bind(this, 'makeIN'),

    /**
     * @memberof module:conditionals~Operators.prototype
     */
    makeDiadic: pureVirtualMethod.bind(this, 'makeDiadic')
});

// some synonyms
Operators.prototype['\u2264'] = Operators.prototype['<='];  // UNICODE 'LESS-THAN OR EQUAL TO'
Operators.prototype['\u2265'] = Operators.prototype['>='];  // UNICODE 'GREATER-THAN OR EQUAL TO'

function pureVirtualMethod(name) {
    throw 'Pure virtual method `Conditionals.prototype.' + name + '` has no implementation on this instance.';
}

function inOp(a, b) {
    return b
        .trim() // remove leading and trailing space chars
        .replace(/\s*,\s*/g, ',') // remove any white-space chars from around commas
        .split(',') // put in an array
        .indexOf(a.toString()); // search array whole matches
}

function containsOp(a, b) {
    return a.toString().toLowerCase().indexOf(b.toString().toLowerCase());
}

function beginsOp(a, length) {
    return a.toString().toLowerCase().substr(0, length);
}

function endsOp(a, length) {
    return a.toString().toLowerCase().substr(-length, length);
}

function sqEsc(string) {
    return string.replace(/'/g, SQT + SQT);
}

function getSqlString(string) {
    return SQT + sqEsc(string) + SQT;
}

function getSqlIdentifier(id) {
    return idQt[0].beg + id + idQt[0].end;
}

/**
 * @constructor
 * @extends Operators
 * @public
 */
var SqlOperators = Operators.extend({
    makeLIKE: function(beg, end, op, a, likePattern) {
        var escaped = likePattern.replace(/([\[_%\]])/g, '[$1]'); // escape all LIKE reserved chars
        return sqlIdentifier(a) + SPC + op + SPC + getSqlString(beg + escaped + end);
    },
    makeIN: function(op, a, b) {
        return sqlIdentifier(a) + SPC + op + SPC + '(' + SQT + sqEsc(b).replace(/\s*,\s*/g, SQT + ', ' + SQT) + SQT + ')';
    },
    makeDiadic: function(op, a, b) {
        return sqlIdentifier(a) + SPC + op + SPC + sqlLiteral(b);
    }
});

function sqlIdentifier(s) {
    return s.literal ? getSqlString(s.literal) : getSqlIdentifier(s.identifier ? s.identifier : s);
}

function sqlLiteral(s) {
    return s.identifier ? getSqlIdentifier(s.identifier) : getSqlString(s.literal ? s.literal : s);
}

/**
 * @constructor
 * @extends Operators
 */
var FilterCellOperators = Operators.extend({
    makeLIKE: function(beg, end, op, a, likePattern) {
        var escaped = likePattern.replace(/([\[_%\]])/g, '[$1]'); // escape all LIKE reserved chars
        return op.toLowerCase() + SPC + beg + escaped + end;
    },
    makeIN: function(op, a, b) {
        return op.toLowerCase() + SPC + b.replace(/\s*,\s*/g, ',');
    },
    makeDiadic: function(op, a, b) {
        return op + b;
    }
});

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

module.exports = {
    /**
     * @type {module:conditionals~Operators}
     */
    operators: new Operators(),

    /**
     * @type {module:conditionals~SqlOperators}
     */
    sqlOperators: new SqlOperators(),

    /**
     * @type {module:conditionals~FilterCellOperators}
     */
    filterCellOperators: new FilterCellOperators(),

    /** Hash of logical operator groups for building your own operator drop-downs.
     * Each group is a {@link menuItem} object.*
     *
     * \* For these groups we're using the "array of strings" variant of `menuItem`.
     * @type {object}
     */
    groups: groups,

    /** Default operator menu when consisting of all of the groups in {@link module:conditionals.groups|groups}. This menu is used when none of the following is otherwise defined:
     * * The `opMenu` property of the column.*
     * * The entry in the node's `typeOpMenus` hash corresponding to the `type` property of the column.*
     * * The node's `treeOpMenus` object.
     *
     * \* The phrase _of the column_ as used here means in the element of the node's `fields` array named for the currently selected column.
     * @type {menuItem[]}
     */
    defaultOpMenus: [ // hierarchical menu of relational operators
        groups.equality,
        groups.inequalities,
        groups.sets,
        groups.strings,
        groups.patterns
    ],
    pushSqlIdQts: pushSqlIdQts,
    popSqlIdQts: popSqlIdQts
};
