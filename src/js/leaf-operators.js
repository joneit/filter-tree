'use strict';

var regExpLIKE = require('regexp-like');

var LIKE = 'LIKE ',
    NOT_LIKE = 'NOT ' + LIKE,
    LIKE_WILD_CARD = '%';

var leafOperators = {
    '<': {
        test: function(a, b) { return a < b; },
        sql: sqlDiadic.bind(this, '<')
    },
    '\u2264': {
        test: function(a, b) { return a <= b; },
        sql: sqlDiadic.bind(this, '<=')
    },
    '=': {
        test: function(a, b) { return a === b; },
        sql: sqlDiadic.bind(this, '=')
    },
    '\u2265': {
        test: function(a, b) { return a >= b; },
        sql: sqlDiadic.bind(this, '>=')
    },
    '>': {
        test: function(a, b) { return a > b; },
        sql: sqlDiadic.bind(this, '>')
    },
    '\u2260': {
        test: function(a, b) { return a !== b; },
        sql: sqlDiadic.bind(this, '<>')
    },
    LIKE: {
        test: function(a, b) { return regExpLIKE.cached(b, true).test(a); },
        sql: sqlDiadic.bind(this, 'LIKE'),
        type: 'string'
    },
    'NOT LIKE': {
        test: function(a, b) { return !regExpLIKE.cached(b, true).test(a); },
        sql: sqlDiadic.bind(this, 'NOT LIKE'),
        type: 'string'
    },
    IN: { // TODO: currently forcing string typing; rework calling code to respect column type
        test: function(a, b) { return inOp(a, b) >= 0; },
        sql: sqlIN.bind(this, 'IN'),
        type: 'string'
    },
    'NOT IN': { // TODO: currently forcing string typing; rework calling code to respect column type
        test: function(a, b) { return inOp(a, b) < 0; },
        sql: sqlIN.bind(this, 'NOT IN'),
        type: 'string'
    },
    CONTAINS: {
        test: function(a, b) { return containsOp(a, b) >= 0; },
        sql: sqlLIKE.bind(this, LIKE_WILD_CARD, LIKE_WILD_CARD, LIKE),
        type: 'string'
    },
    'NOT CONTAINS': {
        test: function(a, b) { return containsOp(a, b) < 0; },
        sql: sqlLIKE.bind(this, LIKE_WILD_CARD, LIKE_WILD_CARD, NOT_LIKE),
        type: 'string'
    },
    BEGINS: {
        test: function(a, b) { b = b.toString().toLowerCase(); return beginsOp(a, b.length) === b; },
        sql: sqlLIKE.bind(this, '', LIKE_WILD_CARD, LIKE),
        type: 'string'
    },
    'NOT BEGINS': {
        test: function(a, b) { b = b.toString().toLowerCase(); return beginsOp(a, b.length) !== b; },
        sql: sqlLIKE.bind(this, '', LIKE_WILD_CARD, NOT_LIKE),
        type: 'string'
    },
    ENDS: {
        test: function(a, b) { b = b.toString().toLowerCase(); return endsOp(a, b.length) === b; },
        sql: sqlLIKE.bind(this, LIKE_WILD_CARD, '', LIKE),
        type: 'string'
    },
    'NOT ENDS': {
        test: function(a, b) { b = b.toString().toLowerCase(); return endsOp(a, b.length) !== b; },
        sql: sqlLIKE.bind(this, LIKE_WILD_CARD, '', NOT_LIKE),
        type: 'string'
    }
};

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

function sqlLIKE(beg, end, LIKE_OR_NOT_LIKE, a, likePattern) {
    var escaped = likePattern.replace(/([\[_%\]])/g, '[$1]'); // escape all LIKE reserved chars
    return identifier(a) + ' ' + LIKE_OR_NOT_LIKE + ' ' + getSqlString(beg + escaped + end);
}

function sqlIN(op, a, b) {
    return identifier(a) + ' ' + op + ' (\'' + sqEsc(b).replace(/\s*,\s*/g, '\', \'') + '\')';
}

function identifier(s) {
    return s.literal ? getSqlString(s.literal) : getSqlIdentifier(s.identifier ? s.identifier : s);
}

function literal(s) {
    return s.identifier ? getSqlIdentifier(s.identifier) : getSqlString(s.literal ? s.literal : s);
}

function sqlDiadic(op, a, b) {
    return identifier(a) + op + literal(b);
}

function sqEsc(string) {
    return string.replace(/'/g, '\'\'');
}

function getSqlString(string) {
    return '\'' + sqEsc(string) + '\'';
}

function getSqlIdentifier(id) {
    return '\"' + sqEsc(id) + '\"';
}

// List the operators as drop-down options in an hierarchical array (rendered as option groups):

var equality, inequalities, sets, strings, patterns;

equality = ['='];
equality.label = 'Equality';

inequalities = ['<', '\u2264', '\u2260', '\u2265', '>'];
inequalities.label = 'Inquality';

sets = ['IN', 'NOT IN'];
sets.label = 'Set scan';

strings = [
    'CONTAINS', 'NOT CONTAINS',
    'BEGINS', 'NOT BEGINS',
    'ENDS', 'NOT ENDS'
];
strings.label = 'String scan';

// Alternatively, option groups can also be set up as an object with .options and .label properties:

patterns = { options: ['LIKE', 'NOT LIKE'], label: 'Pattern matching' };

leafOperators.options = [
    equality,
    inequalities,
    sets,
    strings,
    patterns
];

module.exports = leafOperators;
