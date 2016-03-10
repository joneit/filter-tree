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
