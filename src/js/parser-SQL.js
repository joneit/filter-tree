'use strict';

var reOp = /^((=|>=?|<[>=]?)|(NOT )?(LIKE|IN)\b)/i, // match[1]
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
 * @see {@link https://msdn.microsoft.com/en-us/library/ms173545.aspx SQL Search Condition}
 * @param {menuItem[]} [options.schema] - Column schema for column name validation. Throws an error if name fails validation (but see `resolveAliases`). Omit to skip column name validation.
 * @param {boolean} [options.resolveAliases] - If given and schema given and column name fails validation, instead of throwing an error, search for a column with a matching alias and use the name of the found column. Throws error if no such column found.
 * @param {sqlIdQtsObject} [options.sqlIdQts={beg:'"',end:'"'}]
 */
function ParserSQL(options) {
    options = options || {};
    this.schema = options.schema;
    this.resolveAliases = options.resolveAliases;
    var idQts = options.sqlIdQts || defaultIdQts;
    this.reName = new RegExp('^(' + idQts.beg + '(.+?)' + idQts.end + '|([A-Z_][A-Z_@\\$#]*)\\b)', 'i'); // match[2] || match[3]
}

ParserSQL.prototype = {

    constructor: ParserSQL.prototype.constructor,

    /** Override default properties with properties defined by supplied property resolver.
     * @param {function} [propResolver]
     */
    setOptions: function(propResolver) {
        if (propResolver) {
            for (var key in optionsPrototype) {
                if (optionsPrototype.hasOwnProperty(key)) {
                    var prop = propResolver(key);
                    if (prop !== undefined) {
                        this.options[key] = prop;
                    } else {
                        delete this.options[key]; // reveals prototype (default) value
                    }
                }
            }
        }
    },

    /**
     * @summary Make a "locked" subexpression definition object from an expression chain.
     * @desc _Locked_ means it is locked to a single field.
     *
     * When there is only a single expression in the chain, the `operator` is omitted (defaults to `'op-and'`).
     * @param {string} columnName
     * @param {string} cql - A CQL expression (one or more simple expressions all separated by the same logical operator).
     * @returns {undefined|{operator: string, children: string[], schema: string[]}}
     * `undefined` when there are no complete expressions
     *
     * @memberOf module:CQL
     */

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
    var m, name, op, operand, bool, token, tokens = [];
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
            m = t.substr(i).match(this.reName);
            if (!m) {
                throw new ParserSqlError('Expected identifier or quoted identifier.');
            }
            name = m[2] || m[3];
            if (!/^[A-Z_]/i.test(t[i])) { i += 2; }
            i += name.length;

            if (t[i] === ' ') { ++i; }
            m = t.substr(i).match(reOp);
            if (!m) {
                throw new ParserSqlError('Expected relational operator.');
            }
            op = m[1].toUpperCase();
            i += op.length;

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
            } else {
                m = t.substr(i).match(reLit);
                if (!m) {
                    throw new ParserSqlError('Expected string literal.');
                }
                operand = m[1];
                i += operand.length + 2;
                operand = this.literals[operand];
            }

            if (this.schema) {
                var item = this.schema.findItem(name) ||
                    this.resolveAliases && this.schema.findItem(name, 'alias');

                if (item) {
                    name = item.name;
                } else {
                    throw new ParserSqlError('Expected valid column name.')
                }
            }

            token = {
                column: name,
                operator: op,
                operand: operand
            };
        }

        tokens.push(token);

        if (i < t.length) {
            if (t[i] === ' ') { ++i; }
            m = t.substr(i).match(reBool);
            if (!m) {
                throw new ParserSqlError('Expected boolean opearator.');
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
