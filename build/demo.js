/* eslint-env browser */
/* globals FilterTree */

'use strict';

var filterTree;
var quietValidation = {alert: false, focus: false};

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
        json: document.getElementById('json-data').value,
        eventHandler: auto
    });
}

window.onload = function() {
    try {
        filterTree = makeNewTree();
    } catch (e) {
        if (!(e instanceof SyntaxError)) { throw e; }
        alert('Bad JSON format:\n\n' + e);
        return;
    }

    document.getElementById('filter').appendChild(filterTree.el);

    if (!filterTree.validate({ alert: false })) {
        document.getElementById('SQL').value = filterTree.getSqlWhereClause();
        test();
    }

    document.getElementById('dataRow').addEventListener('keyup', test.bind(this, false));

    var oldArg;

    function enableEditor() {
        oldArg = this.value;
        this.classList.add('enable');
        this.readOnly = false;
        this.focus();
    }
    function disableEditor() {
        this.classList.remove('enable');
        this.readOnly = true;
    }

    var EXP = '(.+?)',
        REQEXP_BOOLS = / (AND|OR|NOR) /gi,
        REGEXP_CELL_FILTER = /^((<= ?)|(>= ?)|(<> ?)|([<≤≠≥>=] ?)|((NOT )?(IN|CONTAINS|BEGINS|ENDS|LIKE) ))?(.*)$/i;

    function updateFilter(evt) {
        // trim & collapse spaces
        var column = this.name,
            expression = this.value = this.value.trim().replace(/\s\s+/g, ' '),
            newSubtree;

        if (expression) {
            newSubtree = makeSubtree(column, expression);
        }

        if (typeof newSubtree === 'string') {
            // subexpression had a syntax error
            if (confirm(newSubtree)) {
                evt.target.focus();
                evt.preventDefault();
            } else {
                evt.target.value = '';
                disableEditor.call(this);
            }
        } else {
            // may be an object; or undefined if expression was blank

            disableEditor.call(this);

            var tree = filterTree.getState(),
                subexpressions = tree.children;

            // Search tree base for existing subexpression "locked" to this column
            var subexpression = subexpressions.find(function(subexp) {
                return (
                    subexp.children && // we're looking for a subexpression...
                    !subexp.children.find(function(child) { // ...all of whose children are...
                        return !(
                            child.column === column && // ...this column and...
                            child.fields && child.fields.length === 1 // ...locked
                        );
                    })
                );
            });

            if (subexpression) {
                var reuseIndex = subexpressions.indexOf(subexpression);
                if (newSubtree) {
                    // replace existing subexpression locked to this column, with new one
                    subexpressions[reuseIndex] = newSubtree;
                } else {
                    // no new subexpression so delete the old one
                    delete subexpressions[subexpressions.indexOf(subexpression)];
                }
            } else if (newSubtree) {
                // add new subexpression locked to this column
                tree.children.unshift(newSubtree);
            }

            filterTree.setState(tree);

            auto();
        }
    }

    function makeSubtree(columnName, expressionChain) {
        var booleans = expressionChain.match(REQEXP_BOOLS),
            operator,
            expressions;

        if (booleans) {
            operator = booleans && booleans[0].toUpperCase();

            if (booleans.find(function(op) { return op.toUpperCase() !== operator; })) {
                return 'You cannot mix operators AND, OR, and NOR here.\n\n' +
                    'For more complex filters, use Manage Filters.';
            }

            expressions = expressionChain.match(new RegExp('^' + EXP + booleans.join(EXP) + EXP + '$'));
            expressions.shift(); // [0] ::= regex input (discard)
        } else {
            operator = 'and';
            expressions = [expressionChain];
        }

        return {
            operator: 'op-' + operator.trim().toLowerCase(),
            children: expressions.reduce(addChild, [])
        };

        function addChild(children, simpleExpression) {
            var parts = simpleExpression.match(REGEXP_CELL_FILTER),
                literal = parts[parts.length - 1],
                op = parts[1] && parts[1].trim().toUpperCase() || '=';

            switch (op) {
                case '>=': op = '≥'; break;
                case '<=': op = '≤'; break;
                case '<>': op = '≠'; break;
            }

            children.push({
                fields: [columnName],
                column: columnName,
                operator: op,
                literal: literal
            });

            return children;
        }
    }

    var RETURN_KEY = 0x0d, ESCAPE_KEY = 0x1b;
    function blurOnReturn(e) {
        switch (e.keyCode) {
            case RETURN_KEY:
                this.blur();
                break;
            case ESCAPE_KEY:
                this.value = oldArg;
                disableEditor.call(this);
                break;
        }
    }

    var els = document.querySelectorAll('.filter-box');
    for (var i = 0; i < els.length; ++i) {
        els[i].onclick = enableEditor;
        els[i].onblur = updateFilter;
        els[i].onkeyup = blurOnReturn;
    }
};

function initialize() { // eslint-disable-line no-unused-vars
    try {
        var newTree = makeNewTree();
    } catch (e) {
        if (!(e instanceof SyntaxError)) { throw e; }
        alert('Bad JSON format:\n\n' + e);
        return;
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
    var valid = !filterTree.validate(validateOptions),
        ctrl = document.getElementById('json-data');
    ctrl.classList.toggle('warn', !valid);
    if (valid) {
        filterTree.JSONspace = 3; // make it pretty
        ctrl.value = filterTree.getJSON();
    }
    return valid;
}

function fromJSON() { // eslint-disable-line no-unused-vars
    try {
        filterTree.setJSON(document.getElementById('json-data').value);
    } catch (e) {
        if (!(e instanceof SyntaxError)) { throw e; }
        alert('Bad JSON format:\n\n' + e);
        return;
    }
    test();
}

function getSqlWhereClause(force) {
    if (
        (force || document.getElementById('autowhere').checked) &&
        !filterTree.validate(!force && quietValidation)
    ) {
        document.getElementById('SQL').value = filterTree.getSqlWhereClause();
    }
}

function test(force) {
    if (force || document.getElementById('autotest').checked) {
        var result, data,
            options = !force && quietValidation;
        if (filterTree.validate(options)) {
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

            // Clone the first element and call it `column2`
            this.view.column2 = this.el.firstElementChild.cloneNode(true);

            // Replace the 3rd element with the clone. There are no event listeners to worry about.
            this.el.replaceChild(this.view.column2, this.el.children[2]);

            var select = this.view.operator,
                optgroups = select.querySelectorAll('optgroup:not([label$=quality])');
            for (var i = 0; i < optgroups.length; ++i) {
                select.removeChild(optgroups[i]);
            }
        },
        p: function(dataRow) {
            return dataRow[this.column];
        },
        q: function(dataRow) {
            return dataRow[this.column2];
        },
        getSqlWhereClause: function() {
            return this.op.sql(this.column, { identifier: this.column2 });
        }
    });
}
