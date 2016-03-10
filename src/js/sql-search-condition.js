'use strict';

/** @module sqlSearchCondition
 *
 * @see {@link https://msdn.microsoft.com/en-us/library/ms173545.aspx SQL Search Condition}
 */

var reName,
    reOp = /^((=|>=?|<[>=]?)|(NOT )?(LIKE|IN)\b)/i, // match[1]
    reLit = /^'(\d+)'/,
    reLitAnywhere = /'(\d+)'/,
    reIn = /^\((.*?)\)/,
    reBool = /^(AND|OR)\b/i,
    reGroup = /^(NOT ?)?\(/i;

var SQT = '\'';

var literals;

var idQt = [];
pushSqlIdQts({
    beg: '"',
    end: '"'
});

/** @typedef {object} sqlIdQtsObject
 * @desc On a practical level, the useful characters are:
 * * SQL-92 standard: "double quotes"
 * * SQL Server: "double quotes" or \[square brackets\]
 * * mySQL: \`tick marks\`
 * @property {string} beg - The open quote character.
 * @property {string} end - The close quote character.
 */

/**
 * Push a new set of quote characters onto the stack for subsequent use by the parser.
 * @param {sqlIdQtsObject} qts
 * @returns {Number}
 */
function pushSqlIdQts(qts) {
    reName = new RegExp('^(' + qts.beg + '(.+?)' + qts.end + '|([A-Z_][A-Z_@\\$#]*)\\b)', 'i'); // match[2] || match[3]
    return idQt.unshift(qts);
}

/**
 * Pop the current quote characters off the stack revealing the previous set to the parser..
 * @returns {sqlIdQtsObject}
 */
function popSqlIdQts() {
    return idQt.shift();
}

/**
 *
 * @param {string} whereClause
 *
 * @param {sqlIdQtsObject} [options.sqlIdQts] - The SQL identifier quote characters to accept while parsing the provided SQL. Alternatively, you can set the quote characters using the {@link module:sqlSearchCondition.pushSqlIdQts|pushSqlIdQts} method.
 * @returns {*}
 * @memberOf module:sqlSearchCondition
 */
function parser(whereClause, options) {
    var whereTree;

    if (options) {
        pushSqlIdQts(options);
    }

    whereTree = walk(stripLiterals(whereClause));

    if (options) {
        popSqlIdQts();
    }

    return whereTree;
}

function walk(t) {
    var m, name, op, arg, bool, token, tokens = [];
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
                throw 'Expected ")"';
            }
            token = walk(t.substr(i, j - 1 - i));
            if (typeof token !== 'object') {
                return token;
            }

            if (not) {
                if (token.operator !== 'op-or') {
                    throw 'Expected OR in NOT(...) subexpression but found ' + token.operator.substr(3).toUpperCase() + '.';
                }
                token.operator = 'op-nor';
            }

            i = j;
        } else {
            m = t.substr(i).match(reName);
            if (!m) {
                throw 'Expected identifier or quoted identifier.';
            }
            name = m[2] || m[3];
            if (!/^[A-Z_]/i.test(t[i])) { i += 2; }
            i += name.length;

            if (t[i] === ' ') { ++i; }
            m = t.substr(i).match(reOp);
            if (!m) {
                throw 'Expected relational operator.';
            }
            op = m[1].toUpperCase();
            i += op.length;

            if (t[i] === ' ') { ++i; }
            if (m[4] && m[4].toUpperCase() === 'IN') {
                m = t.substr(i).match(reIn);
                if (!m) {
                    throw 'Expected parenthesized list.';
                }
                arg = m[1];
                i += arg.length + 2;
                while ((m = arg.match(reLitAnywhere))) {
                    arg = arg.replace(reLitAnywhere, literals[m[1]]);
                }
            } else {
                m = t.substr(i).match(reLit);
                if (!m) {
                    throw 'Expected string literal.';
                }
                arg = m[1];
                i += arg.length + 2;
                arg = literals[arg];
            }

            token = {
                column: name,
                operator: op,
                literal: arg
            };
        }

        tokens.push(token);

        if (i < t.length) {
            if (t[i] === ' ') { ++i; }
            m = t.substr(i).match(reBool);
            if (!m) {
                throw 'Expected boolean opearator.';
            }
            bool = m[1].toLowerCase();
            i += bool.length;
            bool = 'op-' + bool;
            if (tokens.operator && tokens.operator !== bool) {
                throw 'Expected same boolean operator throughout subexpression.';
            }
            tokens.operator = bool;
        }

        if (t[i] === ' ') { ++i; }
    }

    return (
        tokens.length === 1
            ? tokens[0]
            : {
                operator: tokens.operator,
                children: tokens
            }
    );
}

function stripLiterals(t) {
    var i = 0, j = 0, k;

    literals = [];

    while ((j = t.indexOf(SQT, j)) >= 0) {
        k = j;
        do {
            k = t.indexOf(SQT, k + 1);
            if (k < 0) {
                throw 'Expected ' + SQT + ' (single quote).';
            }
        } while (t[++k] === SQT);
        literals.push(t.slice(++j, --k).replace(/''/g, SQT));
        t = t.substr(0, j) + i + t.substr(k);
        j = j + 1 + (i + '').length + 1;
        i++;
    }

    return t;
}

module.exports = {
    parser: parser,
    pushSqlIdQts: pushSqlIdQts,
    popSqlIdQts: popSqlIdQts
};