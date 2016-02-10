/* eslint-env browser */
/* globals FilterTree */

'use strict';

window.onload = function() {
    window.harness = {
        initialize: initialize,
        toJSON: toJSON,
        setState: setState,
        getSqlWhereClause: getSqlWhereClause,
        test: test,
        validate: validate
    };

    var filterTree;

    var PROPERTY = {
        AUTO_COLUMN_LOOKUP_BY_NAME: undefined,
        AUTO_COLUMN_LOOKUP_BY_ALIAS: undefined,
        CASE_SENSITIVE_COLUMN_NAMES: undefined
    };

    toArray(document.querySelectorAll('input.property')).forEach(function(propertyCheckbox) {
        PROPERTY[propertyCheckbox.id] = propertyCheckbox.checked;
    });

    var quietValidation = {alert: false, focus: false};

    try {
        filterTree = makeNewTree();
    } catch (e) {
        rethrow(e);
    }

    document.getElementById('filter').appendChild(filterTree.el);

    if (!validate({ alert: false })) {
        document.getElementById('where-data').value = filterTree.getSqlWhereClause();
        test();
    }

    document.getElementById('dataRow').addEventListener('keyup', test.bind(this, false));

    function auto() {
        if (document.getElementById('autoget').checked) {
            toJSON(quietValidation);
        }

        getSqlWhereClause();

        test();
    }

    function makeNewTree() {
        return new FilterTree({
            fields: getLiteral('fields'),
            state: document.getElementById('json-data').value,
            eventHandler: function() {
                auto();
                updateCellsFromTree();
            }
        });
    }

    function updateCellsFromTree() {
        filterTree.children.forEach(function(subexp) {
            if (subexp.isColumnFilter) {
                var cell = document.querySelector('input[name=' + subexp.children[0].column + ']');
                if (cell && !subexp.validate(quietValidation)) {
                    cell.value = subexp.getFilterCellExpression();
                }
            }
        });
    }

    document.getElementById('properties').addEventListener('click', function(evt) {
        toArray(document.querySelectorAll('.filter-box')).forEach(function(cell) {
            PROPERTY[this.id] = this.checked;
            updateFilter.call(cell);
        }.bind(evt.target));
    });

    function toArray(arrayLikeObject) {
        return Array.prototype.slice.call(arrayLikeObject);
    }

    var oldArg;

    function enableEditor() {
        oldArg = this.value;
        this.classList.add('filter-box-enable');
        this.readOnly = false;
        this.focus();
        updateFilter.call(this); // re-run the parser just to redisplay any errors from last edit
    }
    function disableEditor() {
        this.classList.remove('filter-box-enable');
        this.readOnly = true;
    }

    function closeMsgBox() {
        this.parentElement.style.display = 'none';
    }

    /**
     * Display an error message box.
     * @this {Element} The offending input field.
     * @param {string} messageHTML
     */
    function msgBox(messageHTML) {
        var msgEl = document.querySelector('.msg-box'),
            box = this.getBoundingClientRect();

        msgEl.style.top = window.scrollY + box.bottom + 8 + 'px';
        msgEl.style.left = window.scrollX + box.left + 8 + 'px';

        msgEl.style.display = 'block';

        msgEl.querySelector('.msg-box-close').addEventListener('click', closeMsgBox);
        msgEl.querySelector('.msg-box-content').innerHTML = messageHTML;

        this.classList.add('filter-box-warn');
    }

    function dismissMsgBox() {
        var msgEl = document.querySelector('.msg-box');
        msgEl.style.display = 'none';
    }

    var orphanedOpMsg;

    function updateFilter() {
        // trim & collapse spaces
        var columnName = this.name,
            input = this.value.trim().replace(/\s\s+/g, ' '),
            newSubtree, err;

        dismissMsgBox();

        if (input) {
            try {
                newSubtree = makeSubtree(columnName, input);
            } catch (error) {
                msgBox.call(this, error);
                err = true;
                newSubtree = undefined;
            }

            if (orphanedOpMsg) {
                msgBox.call(this, orphanedOpMsg);
                err = true;
            }
        }

        if (!err) {
            this.classList.remove('filter-box-warn');
            dismissMsgBox();
        }

        // newSubtree may be an object OR undefined (no input or no complete expression)

        var tree = filterTree.getState(),
            rootExpressions = tree.children;

        // Find column filter subexpression for this column
        var subexpression = rootExpressions.find(function(subexp) {
            return subexp.isColumnFilter && (subexp.fields[0].name || subexp.fields[0]) === columnName;
        });

        if (subexpression) {
            var reuseIndex = rootExpressions.indexOf(subexpression);
            if (newSubtree) {
                // replace existing subexpression locked to this column, with new one
                rootExpressions[reuseIndex] = newSubtree;
            } else {
                // no new subexpression so delete the old one
                delete rootExpressions[reuseIndex];
            }
        } else if (newSubtree) {
            // add new subexpression for this column
            rootExpressions.unshift(newSubtree);
        }

        filterTree.setState(tree);

        auto();
    }

    var REGEXP_BOOLS = /\b(AND|OR|NOR)\b/gi,
        REGEXP_CELL_FILTER = /^\s*(<=|>=|<>|[<≤≠≥>=]|(NOT )?(IN|CONTAINS|BEGINS|ENDS|LIKE) )?(.*?)\s*$/i,
        EXP = '(.*?)', BR = '\\b',
        PREFIX = '^' + EXP + BR,
        INFIX = BR + EXP + BR,
        POSTFIX = BR + EXP + '$',
        opMap = { '>=': '≥', '<=': '≤', '<>': '≠' };

    /**
     * @summary Extract the boolean operators from an expression chain.
     * @desc Returns list of homogeneous operators transformed to lower case.
     *
     * Throws an error if all the boolean operators in the chain are not identical.
     * @param {string} expressionChain
     * @returns {string[]}
     */
    function captureBooleans(expressionChain) {
        var booleans = expressionChain.match(REGEXP_BOOLS);

        if (booleans) {
            var heterogeneousOperator = booleans.find(function(op, i) {
                booleans[i] = op.toLowerCase();
                return booleans[i] !== booleans[0];
            });

            if (heterogeneousOperator) {
                throw new Error([
                    'Expected homogeneous boolean operators.',
                    'You cannot mix <code>AND</code>, <code>OR</code>, and <code>NOR</code> operators here.',
                    '(Everything after your <code style="color:red">' + heterogeneousOperator.toUpperCase() + '</code> was ignored.)',
                    '<i>Tip: You can create more complex filters by using Manage Filters.</i>'
                ].join('<br>'));
            }
        }

        return booleans;
    }

    /**
     * Break an expression chain into a list of expressions.
     * @param {string} expressionChain
     * @returns {string[]}
     */
    function captureExpressions(expressionChain, booleans) {
        var expressions, re;

        if (booleans) {
            re = new RegExp(PREFIX + booleans.join(INFIX) + POSTFIX, 'i');
            expressions = expressionChain.match(re);
            expressions.shift(); // discard [0] (input)
        } else {
            expressions = [expressionChain];
        }

        return expressions;
    }

    /**
     * @summary Make a list of children out of a list of expressions.
     * @desc Uses only _complete_ expressions (a value OR an operator + a value).
     *
     * Ignores _inncomplete_ expressions (empty string OR an operator - a value).
     * @param {string} columnName
     * @param {string[]} expressions
     * @returns {{operator: string, children: string[], fields: string[]}}
     */
    function makeChildren(columnName, expressions) {
        var children = [],
            orphanedOps = [];

        expressions.forEach(function(expression) {
            if (expression) {
                var parts = expression.match(REGEXP_CELL_FILTER),
                    op = parts[1] && parts[1].trim().toUpperCase() || '=',
                    literal = parts[parts.length - 1];

                if (!literal) {
                    orphanedOps.push(op);
                } else {
                    var compareLiteral = comparable(literal);
                    var fieldName = filterTree.fields.find(function(field) {
                        return (
                            compareLiteral === (PROPERTY.AUTO_COLUMN_LOOKUP_BY_NAME && comparable(field.name || field)) ||
                            compareLiteral === (PROPERTY.AUTO_COLUMN_LOOKUP_BY_ALIAS && comparable(field.alias))
                        );
                    });

                    var child = {
                        column: columnName,
                        operator: opMap[op] || op
                    };

                    if (fieldName) {
                        child.column2 = fieldName.name || fieldName;
                        child.editor = 'Columns';
                    } else {
                        child.literal = literal;
                    }

                    children.push(child);
                }
            }
        });

        function comparable(name) {
            if (!PROPERTY.CASE_SENSITIVE_COLUMN_NAMES && typeof name === 'string') {
                name = name.toLowerCase();
            }

            return name;
        }

        if (children.length > 0 && orphanedOps.length > 0 || orphanedOps.length > 1) {
            var RED = ' <code style="color:red">';
            if (orphanedOps.length === 1) {
                orphanedOps = [
                    'Expected a value following' + RED + orphanedOps +
                        '</code> to compare against the column.',
                    'The incomplete expression was ignored.'
                ];
            } else {
                orphanedOps = [
                    'Expected values following' + RED + orphanedOps.join('</code> and' + RED) + '</code> to compare against the column.',
                    'The incomplete expressions were ignored.'
                ];
            }
            orphanedOpMsg = orphanedOps.join('<br>');
        } else {
            orphanedOpMsg = undefined;
        }

        return children;
    }

    /**
     * @summary Make a "locked" subexpression definition object from an expression chain.
     * @desc _Locked_ means it is locked to a single field.
     *
     * When there is only a single expression in the chain, the `operator` field defaults to `'op-and'`.
     * @param {string} columnName
     * @param {string} expressionChain
     * @returns {undefined|{operator: string, children: string[], fields: string[]}}
     * `undefined` when there are no complete expressions
     */
    function makeSubtree(columnName, expressionChain) {
        var booleans = captureBooleans(expressionChain),
            expressions = captureExpressions(expressionChain, booleans),
            children = makeChildren(columnName, expressions),
            operator = booleans && booleans[0] || 'and';

        //console.log(booleans, expressions, children, operator);

        if (children.length) {
            return {
                operator: 'op-' + operator,
                children: children,
                fields: [columnName],
                isColumnFilter: true
            };
        }
    }

    var RETURN_KEY = 0x0d, ESCAPE_KEY = 0x1b;
    function editorKeyUp(e) {
        switch (e.keyCode) {
            case ESCAPE_KEY:
                this.value = oldArg;
            case RETURN_KEY: // eslint-disable-line no-fallthrough
                this.blur();
                break;
            default:
                updateFilter.call(this, e);
        }
    }

    var els = document.querySelectorAll('.filter-box');
    for (var i = 0; i < els.length; ++i) {
        els[i].onclick = enableEditor;
        els[i].onblur = disableEditor;
        els[i].onkeyup = editorKeyUp;
    }

    function rethrow(error) {
        if (error.toString().indexOf('filter-tree') >= 0) {
            alert(error);
        } else {
            throw error;
        }
    }

    function initialize() { // eslint-disable-line no-unused-vars
        try {
            var newTree = makeNewTree();
        } catch (e) {
            rethrow(e);
        }

        document.getElementById('filter').replaceChild(newTree.el, filterTree.el);
        filterTree = newTree;
    }

    function getLiteral(id, options) {
        options = options || {};

        var alert = options.alert === undefined || options.alert,
            value = document.getElementById(id).value;

        try {
            var object;
            eval('object = ' + value); // eslint-disable-line no-eval
            return object;

        } catch (e) {
            if (alert) {
                window.alert('Bad ' + id + ' JavaScript literal!');
            }
        }
    }

    function validate(options) { // eslint-disable-line no-unused-vars
        return filterTree.validate(options);
    }

    function toJSON(validateOptions) {
        var valid = !validate(validateOptions),
            ctrl = document.getElementById('json-data');

        if (valid) {
            filterTree.JSONspace = 3; // make it pretty
            ctrl.value = filterTree.getJSON();
        }

        return valid;
    }

    function setState(id) { // eslint-disable-line no-unused-vars
        var value = document.getElementById(id).value;
        try {
            filterTree.setState(value);
        } catch (e) {
            rethrow(e);
        }
        test();
    }

    function getSqlWhereClause(force) {
        if (
            (force || document.getElementById('autoGetWhere').checked) &&
            !validate(!force && quietValidation)
        ) {
            document.getElementById('where-data').value = filterTree.getSqlWhereClause();
        }
    }

    function test(force) {
        if (force || document.getElementById('autotest').checked) {
            var result, data,
                options = !force && quietValidation;
            if (validate(options)) {
                result = 'invalid-filter';
            } else if (!(data = getLiteral('dataRow', options))) {
                result = 'invalid-data';
            } else {
                result = filterTree.test(data);
            }
            document.getElementById('test-result').className = result;
        }
    }

    function querystringHasParam(param) {
        return new RegExp('[\\?&]' + param + '[\\?&=]|[\\?&]' + param + '$').test(location.search);
    }

    if (querystringHasParam('cc')) {
        // You can make a new filter editor by extending FilterLeaf. The following code patches two existing methods but is highly dependent on the existing code. A more reliable approach would be to override the two methods completely -- rather than extending them (which is essentially what we're doing here by calling them first).

        var DefaultEditor = FilterTree.prototype.editors.Default;

        FilterTree.prototype.addEditor('Columns', {
            name: 'Compare one column to another',
            createView: function() {
                // Create the `view` hash and insert the three default elements (`column`, `operator`, `literal`) into `.el`
                DefaultEditor.prototype.createView.call(this);

                // Remove the `literal` element from the `view` hash
                delete this.view.literal;

                // Add the `column2` element to the view hash using the secondary fields list
                var fields2 = this.fields2;
                if (!fields2) {
                    // fall back to the root fields list (or most senior list available)
                    var root = this;
                    do {
                        root = root.parent;
                        if (root && root.fields) {
                            fields2 = root.fields;
                        }
                    } while (root);
                }

                this.view.column2 = fields2
                    ? this.makeElement(this.el, fields2, 'column', true)
                    : this.el.firstElementChild.cloneNode(true);

                // Replace the 3rd element with the new one. There are no event listeners to worry about.
                this.el.replaceChild(this.view.column2, this.el.children[2]);
            },
            operatorMenu: [
                FilterTree.conditionals.groups.equality,
                FilterTree.conditionals.groups.inequalities,
                FilterTree.conditionals.groups.sets
            ],
            q: function(dataRow) {
                return dataRow[this.column2];
            },
            getSyntax: function(ops) {
                return ops[this.operator].make.call(ops, this.column, this.column2);
            }
        });
    }

};
