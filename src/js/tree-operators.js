'use strict';

module.exports = {
    'op-and': { SQL: { op: 'AND', beg: '(', end: ')' } },
    'op-or': { SQL: { op: 'OR', beg: '(', end: ')' } },
    'op-nor': { SQL: { op: 'AND', beg: 'NOT  (', end: ')' } }
};
