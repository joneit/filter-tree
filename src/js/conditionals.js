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

var Operators = Base.extend({
    '<': {
        test: function(a, b) { return a < b; },
        make: function(a, b) { return this.makeDiadic('<', a, b); }
    },
    '\u2264': {
        test: function(a, b) { return a <= b; },
        make: function(a, b) { return this.makeDiadic('<=', a, b); }
    },
    '=': {
        test: function(a, b) { return a === b; },
        make: function(a, b) { return this.makeDiadic('=', a, b); }
    },
    '\u2265': {
        test: function(a, b) { return a >= b; },
        make: function(a, b) { return this.makeDiadic('>=', a, b); }
    },
    '>': {
        test: function(a, b) { return a > b; },
        make: function(a, b) { return this.makeDiadic('>', a, b); }
    },
    '\u2260': {
        test: function(a, b) { return a !== b; },
        make: function(a, b) { return this.makeDiadic('<>', a, b); }
    },
    LIKE: {
        test: function(a, b) { return regExpLIKE.cached(b, true).test(a); },
        make: function(a, b) { return this.makeDiadic(LIKE, a, b); },
        type: 'string'
    },
    'NOT LIKE': {
        test: function(a, b) { return !regExpLIKE.cached(b, true).test(a); },
        make: function(a, b) { return this.makeDiadic(NOT_LIKE, a, b); },
        type: 'string'
    },
    IN: { // TODO: currently forcing string typing; rework calling code to respect column type
        test: function(a, b) { return inOp(a, b) >= 0; },
        make: function(a, b) { return this.makeIN(IN, a, b); },
        type: 'string'
    },
    'NOT IN': { // TODO: currently forcing string typing; rework calling code to respect column type
        test: function(a, b) { return inOp(a, b) < 0; },
        make: function(a, b) { return this.makeIN(NOT_IN, a, b); },
        type: 'string'
    },
    CONTAINS: {
        test: function(a, b) { return containsOp(a, b) >= 0; },
        make: function(a, b) { return this.makeLIKE(LIKE_WILD_CARD, LIKE_WILD_CARD, LIKE, a, b); },
        type: 'string'
    },
    'NOT CONTAINS': {
        test: function(a, b) { return containsOp(a, b) < 0; },
        make: function(a, b) { return this.makeLIKE(LIKE_WILD_CARD, LIKE_WILD_CARD, NOT_LIKE, a, b); },
        type: 'string'
    },
    BEGINS: {
        test: function(a, b) { b = b.toString().toLowerCase(); return beginsOp(a, b.length) === b; },
        make: function(a, b) { return this.makeLIKE(NIL, LIKE_WILD_CARD, LIKE, a, b); },
        type: 'string'
    },
    'NOT BEGINS': {
        test: function(a, b) { b = b.toString().toLowerCase(); return beginsOp(a, b.length) !== b; },
        make: function(a, b) { return this.makeLIKE(NIL, LIKE_WILD_CARD, NOT_LIKE, a, b); },
        type: 'string'
    },
    ENDS: {
        test: function(a, b) { b = b.toString().toLowerCase(); return endsOp(a, b.length) === b; },
        make: function(a, b) { return this.makeLIKE(LIKE_WILD_CARD, NIL, LIKE, a, b); },
        type: 'string'
    },
    'NOT ENDS': {
        test: function(a, b) { b = b.toString().toLowerCase(); return endsOp(a, b.length) !== b; },
        make: function(a, b) { return this.makeLIKE(LIKE_WILD_CARD, NIL, NOT_LIKE, a, b); },
        type: 'string'
    },
    makeLIKE: pureVirtualMethod.bind(this, 'makeLIKE'),
    makeIN: pureVirtualMethod.bind(this, 'makeIN'),
    makeDiadic: pureVirtualMethod.bind(this, 'makeDiadic')
});

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

/** @typedef {string|operatorGroup} operatorGroup
 * @property {string} label - The <optgroup> label.
 * @property {operatorItem[]} submenu - Hierarchical list of operators.
 */

/** @typedef {string[]|operatorGroup} operatorItem
 * @property {string} [label] - The <optgroup> label when string[]. Default to a generated name.
 */

/** Hash of column names, each being an array of {@link operatorItem} objects that represents an `<optgroup>...<optgroup>` element (submenu in a drop-down). For building operator drop-downs.
 * @type {object}
 */
var groups = {
    equality: {
        label: 'Equality',
        submenu: ['=']
    },
    inequalities: {
        label: 'Inequality',
        submenu: ['<', '\u2264', '\u2260', '\u2265', '>']
    },
    sets: {
        label: 'Set scan',
        submenu: ['IN', 'NOT IN']
    },
    strings: {
        label: 'String scan',
        submenu: [
            'CONTAINS', 'NOT CONTAINS',
            'BEGINS', 'NOT BEGINS',
            'ENDS', 'NOT ENDS'
        ]
    },
    patterns: {
        label: 'Pattern matching',
        submenu: ['LIKE', 'NOT LIKE']
    }
};

// add a `name` prop to each group
_(groups).each(function(group, key) { group.name = key; });

module.exports = {
    operators: new Operators(),
    sqlOperators: new SqlOperators(),
    filterCellOperators: new FilterCellOperators(),
    groups: groups,
    menu: [ // hierarchical menu of relational operators
        groups.equality,
        groups.inequalities,
        groups.sets,
        groups.strings,
        groups.patterns
    ],
    pushSqlIdQts: pushSqlIdQts,
    popSqlIdQts: popSqlIdQts
};
