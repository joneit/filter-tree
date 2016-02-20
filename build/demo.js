/* eslint-env browser */
/* globals FilterTree, Tabz */

'use strict';

var filterTree, tableFilter, columnFilters;  // declared at top-level so debugger can look at easily

window.onload = function() {
    window.harness = {
        initialize: initialize,
        toJSON: toJSON,
        setState: setState,
        getSqlWhereClause: getSqlWhereClause,
        test: test,
        validate: validate,
        moreinfo: moreinfo
    };

    var tabz = new Tabz(); // eslint-disable-line no-unused-vars

    // copy SQL instructions from the SQL tab of the table filter tab to the SQL tab of the column filters tab
    var sqlInstructions = document.querySelector('#table-filter-SQL>div:first-child');
    var otherSqlSection = document.getElementById('column-filters-SQL');
    otherSqlSection.insertBefore(sqlInstructions.cloneNode(true), otherSqlSection.firstElementChild);

    var PROPERTY = {
        AUTO_COLUMN_LOOKUP_BY_NAME: undefined,
        AUTO_COLUMN_LOOKUP_BY_ALIAS: undefined,
        CASE_SENSITIVE_COLUMN_NAMES: undefined
    };

    els('input.property').forEach(function(propertyCheckbox) {
        PROPERTY[propertyCheckbox.id] = propertyCheckbox.checked;
    });

    var quietValidation = {alert: false, focus: false};

    initialize();

    function elid(id) { return document.getElementById(id); }
    //function el(selector) { return document.querySelector(selector); }
    function els(selector, context) { return toArray((context || document).querySelectorAll(selector)); }
    function toArray(arrayLikeObject) { return Array.prototype.slice.call(arrayLikeObject); }


    if (!validate({ alert: false })) {
        elid('where-data').value = filterTree.getState({ syntax: 'SQL' });
        test();
    }

    elid('dataRow').addEventListener('keyup', test.bind(this, false));

    function auto() {
        if (elid('autoget').checked) {
            toJSON(quietValidation);
        }

        getSqlWhereClause();

        test();
    }

    function updateCellsFromTree() {
        columnFilters.children.forEach(function(columnFilter) {
            columnFilter.validate(quietValidation);
            var cell = document.querySelector('input[name=' + columnFilter.children[0].column + ']');
            if (cell) {
                cell.value = columnFilter.getState({ syntax: 'filter-cell' });
            }
        });
    }

    elid('properties').addEventListener('click', function(evt) {
        els('.filter-box').forEach(function(cell) {
            PROPERTY[this.id] = this.checked;
            updateFilter.call(cell);
        }.bind(evt.target));
    });

    var oldArg;

    function enableEditor() {
        oldArg = this.value;
        this.classList.add('filter-box-enable');
        this.readOnly = false;
        this.focus();
        tabz.tabTo('#column-filters-query-builder');
        updateFilter.call(this); // re-run the parser just to redisplay any errors from last edit
    }

    var selectionStart, selectionEnd;

    function disableEditor() {
        if (selectionStart === undefined) {
            this.classList.remove('filter-box-enable');
            this.readOnly = true;
        }
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
            rect = this.getBoundingClientRect();

        msgEl.style.top = window.scrollY + rect.bottom + 8 + 'px';
        msgEl.style.left = window.scrollX + rect.left + 8 + 'px';

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
            columnFilterSubexpressions = tree.children[1].children;

        // Find column filter subexpression for this column
        var subexpression = columnFilterSubexpressions.find(function(subexp) {
            return (subexp.fields[0].name || subexp.fields[0]) === columnName;
        });

        if (subexpression) {
            var reuseIndex = columnFilterSubexpressions.indexOf(subexpression);
            if (newSubtree) {
                // replace existing subexpression locked to this column, with new one
                columnFilterSubexpressions[reuseIndex] = newSubtree;
            } else {
                // no new subexpression so delete the old one
                delete columnFilterSubexpressions[reuseIndex];
            }
        } else if (newSubtree) {
            // add new subexpression for this column
            columnFilterSubexpressions.push(newSubtree);
        }

        setState(tree);

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
     * Ignores _incomplete_ expressions (empty string OR an operator - a value).
     * @param {string} columnName
     * @param {string[]} expressions
     * @returns {expression[]} where `expression` is either `{column: string, operator: string, literal: string}` or `{column: string, operator: string, column2: string, editor: 'Columns'}`
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
                template: 'columnFilter'
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

    els('.filter-box').forEach(function(filterBox) {
        filterBox.onclick = enableEditor;
        filterBox.onblur = disableEditor;
        filterBox.onkeyup = editorKeyUp;

        var filterBoxDropDownIcon = filterBox.nextElementSibling;
        var filterBoxDropDown = filterBoxDropDownIcon.nextElementSibling;
        var menuVisible = false;

        filterBoxDropDown.style.display = 'none';

        filterBoxDropDownIcon.onmousedown = function(event) {
            if (!menuVisible) {
                selectionStart = filterBox.selectionStart;
                selectionEnd = filterBox.selectionEnd;

                filterBoxDropDown.style.display = 'block';
                filterBoxDropDown.scrollTop = 0;
                filterBoxDropDown.selectedIndex = -1;
                menuVisible = true;

                event.stopPropagation();
            }
        };

        window.addEventListener('mousedown', function() {
            hideMe(true);
        });

        filterBoxDropDown.onmousedown = function(event) {
            event.stopPropagation(); // so window's mousedown listener won't hide me before click received
        };

        // add the descrete data to the dropdown, replacing the last option ("Load...")
        filterBoxDropDown.onchange = function() {
            if (filterBoxDropDown.value === 'load') {
                // make sure we show progress cursor for at least 1/3 second, possibly more but no less
                filterBoxDropDown.style.cursor = 'progress';
                setTimeout(function() { filterBoxDropDown.style.cursor = null; }, 333);

                var lastOptGroup = filterBoxDropDown.lastElementChild;
                lastOptGroup.firstElementChild.remove();
                'these are some random words for demonstration purposes'.split(' ').forEach(function(word) {
                    lastOptGroup.appendChild(new Option(word));
                });

                // scroll down a 6 lines so optgroup label moves to top
                filterBoxDropDown.scrollTop += 6 / 8 * filterBoxDropDown.getBoundingClientRect().height;
            } else {
                filterBox.focus();
                filterBox.setRangeText(filterBoxDropDown.value, selectionStart, selectionEnd, 'end');
                hideMe(false);
                updateFilter.call(filterBox);
            }
        };

        function hideMe(doneEditing) {
            if (menuVisible) {
                // hide all the drop-downs
                selectionStart = selectionEnd = undefined;
                els('.filter-box').forEach(function(filterBox) { // eslint-disable-line no-shadow
                    filterBox.nextElementSibling.nextElementSibling.style.display = 'none';
                    if (doneEditing) {
                        disableEditor.call(filterBox);
                    }
                });
                menuVisible = false;
            }
        }
    });

    elid('opMenus').onclick = function(e) {
        if (e.target.type === 'radio') {
            els('input', e.currentTarget).forEach(function(radioButton) {
                elid(radioButton.value).style.display = radioButton.checked ? 'inline' : 'none';
            });
        }
    };

    function rethrow(error) {
        if (error instanceof FilterTree.FilterTreeError) {
            alert(error);
            reveal(error);
        } else {
            throw error;
        }
    }

    /**
     * If a FilterTreeError with a node property and we're focused, search up the DOM to the nearest folder and reveal it.
     * > _Folder_ is defined as a `<section>` tag inside an element of `tabz` class.
     * @param {FilterTreeError} error
     * @param {boolean} [focus=true]
     */
    function reveal(error, focus) {
        if (error instanceof FilterTree.FilterTreeError && error.node && (focus === undefined || focus)) {
            var el = error.node.el;
            while (!(el.tagName === 'SECTION' && el.parentElement.classList.contains('tabz'))) {
                el = el.parentElement;
            }
            tabz.tabTo(el);
        }
        return error;
    }

    function initialize() { // eslint-disable-line no-unused-vars
        try {
            var newFilterTree = new FilterTree({
                fields: getLiteral('fields'),
                typeOpMenus: getLiteral('typeOpMenus'),
                treeOpMenus: getLiteral('treeOpMenus'),
                state: elid('state').value,
                eventHandler: function() {
                    auto();
                    updateCellsFromTree();
                }
            });
        } catch (e) {
            rethrow(e);
            return;
        }

        updateDOM(newFilterTree);

        // populate the filter box operator drop-downs
        els('.filter-box').forEach(function(el) {
            el.value = '';

            var dropdown = el.nextElementSibling.nextElementSibling;

            FilterTree.buildElement(dropdown, opMenus(el.name), {
                prompt: null,
                group: function(groupName) { return FilterTree.conditionals.groups[groupName]; }
            });

            var optgroup = document.createElement('optgroup');
            optgroup.label = 'Conjunctions';
            ['and', 'or', 'nor'].forEach(function(op) {
                optgroup.appendChild(new Option(op, ' ' + op + ' '));
            });
            dropdown.add(optgroup);

            optgroup = document.createElement('optgroup');
            optgroup.label = 'Distinct values';
            var option = new Option('Click to load', 'load');
            option.innerHTML += '&hellip;';
            optgroup.appendChild(option);
            dropdown.add(optgroup);
        });
    }

    function opMenus(fieldName) {
        var typeOps = getLiteral('typeOpMenus'),
            fields = getLiteral('fields'),
            field = findField(fields, fieldName);

        return (
            field && field.opMenus ||
            field && field.type && typeOps && typeOps[field.type] ||
            FilterTree.conditionals.defaultOpMenus
        );
    }

    function getLiteral(id, options) {
        options = options || {};

        var object,
            alert = options.alert === undefined || options.alert,
            value = elid(id).value.replace(/^\s+/, '').replace(/\s+$/, '');

        if (value) {
            try {
                eval('object = ' + value); // eslint-disable-line no-eval
            } catch (e) {
                if (alert) {
                    window.alert('Bad ' + id + ' JavaScript literal!');
                }
            }
        }

        return object;
    }

    function findField(fields, name) {
        var complex, simple;

        simple = fields.find(function(field) {
            if ((field.submenu || field) instanceof Array) {
                return (complex = findField(field.submenu || field, name));
            } else {
                return (field.name || field) === name;
            }
        });

        return complex || simple;
    }

    function validate(options) { // eslint-disable-line no-unused-vars
        reveal(filterTree.validate(options), options && options.focus);
    }

    function toJSON(validateOptions) {
        var valid = !validate(validateOptions),
            ctrl = elid('state');

        if (valid) {
            filterTree.JSONspace = 3; // make it pretty
            ctrl.value = filterTree.getState({ syntax: 'JSON' }, { space: 3 });
        }

        return valid;
    }

    function setState(state) { // eslint-disable-line no-unused-vars
        try {
            filterTree.setState(state);
        } catch (e) {
            rethrow(e);
            return;
        }

        updateDOM(filterTree);

        test();
    }

    /**
     * Normally FilterNode.setState() updates the DOM on its own by updating the root element in `filterTree.el`. However, in this particular UI, the root element is not in the DOM. Instead we are showing two subtrees in two different places in the DOM. These are updated here.
     * @param {FilterTree} newFilterTree - May be an entirely new tree; or may be `filterTree` itself when `filterTree.setState` was called which triggered an internal replaceChild on `filterTree.el`.
     */
    function updateDOM(newFilterTree) {
        var newTableFilter = newFilterTree.children[0],
            newColumnFilters = newFilterTree.children[1];

        if (!filterTree) {
            elid('table-filter-query-builder').appendChild(newTableFilter.el);
            elid('column-filters-query-builder').appendChild(newColumnFilters.el);
        } else {
            elid('table-filter-query-builder').replaceChild(newTableFilter.el, tableFilter.el);
            elid('column-filters-query-builder').replaceChild(newColumnFilters.el, columnFilters.el);
        }

        filterTree = newFilterTree;
        tableFilter = newTableFilter;
        columnFilters = newColumnFilters;
    }

    function getSqlWhereClause(force) {
        if (
            (force || elid('autoGetWhere').checked) &&
            !validate(!force && quietValidation)
        ) {
            elid('where-data').value = filterTree.getState({ syntax: 'SQL' });
        }
    }

    function test(force) {
        if (force || elid('autotest').checked) {
            var result, data,
                options = !force && quietValidation;
            if (validate(options)) {
                result = 'invalid-filter';
            } else if (!(data = getLiteral('dataRow', options))) {
                result = 'invalid-data';
            } else {
                result = filterTree.test(data);
            }
            elid('test-result').className = result;
        }
    }

    /**
     * @param {string} param - querystring parameter
     * @param {boolean} [caseSensitive=false] - Case matters
     * @returns {null|boolean|number|string}
     * * `null` - querystring parameter not found
     * * `undefined` - querystring parameter found but with no associated value
     * * `true` - querystring parameter found with true or yes
     * * `false` - querystring parameter found with false or no
     * * number - querystring parameter found with a string convertible to a number with Number()
     * * string - querystring parameter found with some other value
     */
    function querystring(param, caseSensitive) {
        var matches = (location.search + '&').match(new RegExp('[?&]' + param + '(=(.+?))?&', !caseSensitive && 'i')),
            result = matches && matches.pop();
        if (result === 'true' || result === 'yes') {
            result = true;
        } else if (result === 'false' || result === 'no') {
            result = false;
        } else if (result != null && !isNaN(Number(result))) {
            result = Number(result);
        }
        return result;
    }

    var cc = querystring('cc');

    if (cc == null || cc) {
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
            treeOpMenus: [
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

function moreinfo(el) {
    el.style.display = window.getComputedStyle(el).display === 'none' ? 'block' : 'none';
}
