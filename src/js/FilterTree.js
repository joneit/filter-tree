/* eslint-env browser */

// This is the main file, usable as is, such as by /test/index.js.

// For npm: require this file
// For CDN: gulpfile.js browserifies this file with sourcemap to /build/filter-tree.js and uglified without sourcemap to /build/filter-tree.min.js. The CDN is https://joneit.github.io/filter-tree.

'use strict';

var unstrungify = require('unstrungify');

var FilterNode = require('./FilterNode');
var TerminalNode = require('./FilterLeaf');
var template = require('./template');
var operators = require('./tree-operators');
var conditionals = require('./conditionals');
var popMenu = require('./pop-menu');


var ordinal = 0;

/** @constructor
 * @summary An object that represents a non-terminal node in a filter tree.
 * @desc A node representing a subexpression in the filter expression. May be thought of as a parenthesized subexpression in algebraic expression syntax. It's children may be either {@link FilterLeaf}* (terminal) nodes or other (nested) `FilterTree`* subexpressions. The same `operator` to be applied to all its `children`.
 *
 * \* Or other "class" objects extended therefrom.
 *
 * Has all the properties of {@link FilterNode} (see), plus the following additional properties:
 *
 * @property {string} [operator='op-and'] - One of:
 * * `'op-and'`
 * * `'op-or'`
 * * `'op-nor'`
 *
 * @property {FilterNode[]} children - A list of descendants of this node. May be any number including 0 (none; empty).
 *
 * @property {fieldItem[]} [ownSchema] - Column menu to be used only by leaf nodes that are children (direct descendants) of this node.
 *
 * Notes:
 * 1. A `FilterTree` may consist of a single leaf, in which case the `operator` is not used and may be left undefined. However, if a second child is added and the operator is still undefined, it will be set to the default (`'op-and'`).
 * 2. The order of the children is undefined as all operators are commutative. For the '`op-or`' operator, evaluation ceases on the first positive result and for efficiency, all simple conditional expressions will be evaluated before any complex subexpressions.
 * 3. A nested `FilterTree` is distinguished from a `Filter` by the presence of a `children` member.
 * 4. Nesting a `FilterTree` containing a single child is valid (albeit pointless).
 */
var FilterTree = FilterNode.extend('FilterTree', {

    preInitialize: function(options) {
        if (options && (options.type || options.state && options.state.type) === 'columnFilter') { // TODO: Move to CustomFilter class
            this.schema = [ popMenu.findItem(options.parent.root.schema, options.state.children[0].column) ];
        }

        if (options && options.editors) {
            this.editors = options.editors;
        }
    },

    /**
     * Hash of constructors for objects that extend from {@link FilterLeaf}, which is the `Default` member here.
     *
     * Add additional editors to this object (in the prototype) prior to instantiating a leaf node that refers to it.
     *
     * Alternatively, you could also override the entire object in your instance but if you do so, be sure to include the default editor, for example: `{ Default: FilterTree.prototype.editors.Default, ... }`. (One way of overriding would be to include such an object in an `editors` member of the options object passed to the constructor on instantiation. This works because all miscellaneous members are simply copied to the new instance. Not to be confused with the standard option `editor` which is a string containing a key from this hash and tells the leaf node what type to use.)
     */
    editors: {
        Default: TerminalNode
    },

    addEditor: function(key, overrides) {
        if (overrides) {
            this.editors[key] = TerminalNode.extend(overrides);
        } else {
            delete this.editors[key];
        }
    },

    createView: function() {
        this.el = template(
            this.type || 'subtree',
            ++ordinal,
            popMenu.formatItem(this.schema[0])
        );

        // Add the expression editors to the "add new" drop-down
        var addNewCtrl = this.el.querySelector(':scope>select');
        if (addNewCtrl) {
            var submenu, optgroup,
                editors = this.editors;

            if (addNewCtrl.length === 1 && this.editors.length === 1) {
                // this editor is the only option besides the null prompt option
                // so make it th eonly item i the drop-down
                submenu = addNewCtrl;
            } else {
                // there are already options and/or multiple editors
                submenu = optgroup = document.createElement('optgroup');
                optgroup.label = 'Conditional Expressions';
            }
            Object.keys(editors).forEach(function(key) {
                var name = editors[key].prototype.name || key;
                submenu.appendChild(new Option(name, key));
            });
            if (optgroup) {
                addNewCtrl.add(optgroup);
            }
            this.el.addEventListener('change', onchange.bind(this));
        }

        this.el.addEventListener('click', catchClick.bind(this));
    },

    loadState: function() {
        var state = this.state;

        this.operator = 'op-and';
        this.children = [];

        if (!state) {
            this.add();
        } else {
            // Validate `state.children` (required)
            if (!(state.children instanceof Array)) {
                throw new FilterNode.FilterTreeError('Expected `children` property to be an array.');
            }

            // Validate `state.operator` (if given)
            if (state.operator) {
                if (!operators[state.operator]) {
                    throw new FilterNode.FilterTreeError('Expected `operator` property to be one of: ' + Object.keys(operators));
                }

                this.operator = state.operator;
            }

            state.children.forEach(this.add.bind(this));
        }
    },

    render: function() {
        var radioButton = this.el.querySelector(':scope > label > input[value=' + this.operator + ']'),
            addFilterLink = this.el.querySelector('.filter-tree-add-conditional');

        if (radioButton) {
            radioButton.checked = true;
            this['filter-tree-op-choice']({
                target: radioButton
            });
        }

        // when multiple filter editors available, simulate click on the new "add conditional" link
        if (addFilterLink && !this.children.length && Object.keys(this.editors).length > 1) {
            this['filter-tree-add-conditional']({
                target: addFilterLink
            });
        }

        // proceed with render
        FilterNode.prototype.render.call(this);
    },

    /**
     * @summary Create a new node as per `state`.
     *
     * @param {object} [options] - May be one of:
     *
     * * an `options` object containing a `state` property
     * * a `state` object (in which case there is no `options` object)
     *
     * In any case, if resulting `state` object has...
     * * a `children` property, attempt to add a new subtree.
     * * an `editor` property, add a leaf using `this.editors[state.editor]`.
     * * neither (or was omitted), add a leaf using `this.editors.Default`.
     *
     * @param {boolean} [stateOrOptions.focus=false] Call invalid() after inserting to focus on first blank control (if any).
     */
    add: function(options) {
        var Constructor, newNode;

        options = options || {};

        if (!options.state) {
            options = { state: options };
        }

        if (options.state.children) {
            Constructor = FilterTree;
        } else {
            Constructor = this.editors[options.state.editor || 'Default'];
        }

        options.parent = this;
        newNode = new Constructor(options);
        this.children.push(newNode);

        if (options.focus) {
            // focus on blank control a beat after adding it
            setTimeout(function() { newNode.invalid({ alert: false }); }, 750);
        }
    },

    /**
     * Search the expression tree for a node with certain characteristics as described by the type of search (`type`) and the search args.
     * @param {string} [type='find'] - Name of method to use on terminal nodes; characterizes the type of search. Must exist in your terminal node object.
     * @param {boolean} [deep=false] - Must be explicit `true` or `false` (not merely truthy or falsy); or omitted.
     * @param {*} firstSearchArg - May not be boolean type in case `deep` omitted (accommodation to overload logic).
     * @param {...*} [additionalSearchArgs]
     * @returns {boolean|FilterLeaf|FilterTree}
     * * `false` - Not found. (`true` is never returned.)
     * * `FilterLeaf` (or instance of an object extended from same) - Sought node (typical).
     * * 'FilterTree` - Sought node (rare).
     */
    find: function find(type, deep) {
        var result, n, treeArgs = arguments, leafArgs;

        if (arguments.length > 1 && typeof type === 'string') {
            n = 1;
        } else {
            n = 0;
            deep = type;
            type = 'find';
        }

        if (typeof deep === 'boolean') {
            n += 1;
        } else {
            deep = false;
        }

        leafArgs = Array.prototype.slice.call(arguments, n);

        // TODO: Following could be broken out into separate method (as in FilterLeaf)
        if (type === 'findByEl' && this.el === leafArgs[0]) {
            return this;
        }

        // walk tree recursively, ending on defined `result` (first node found)
        return this.children.find(function(child) {
            if (child instanceof TerminalNode) {
                // always recurse on terminal nodes
                result = child[type].apply(child, leafArgs);
            } else if (deep && child.children.length) {
                // only recurse on subtrees if going `deep` and not childless
                result = find.apply(child, treeArgs);
            }
            return result;
        });
    },

    'filter-tree-op-choice': function(evt) {
        var radioButton = evt.target;

        this.operator = radioButton.value;

        // display strike-through
        var radioButtons = this.el.querySelectorAll('label>input.filter-tree-op-choice[name=' + radioButton.name + ']');
        Array.prototype.forEach.call(radioButtons, function(radioButton) {
            radioButton.parentElement.style.textDecoration = radioButton.checked ? 'none' : 'line-through';
        });

        // display operator between filters by adding operator string as a CSS class of this tree
        for (var key in operators) {
            this.el.classList.remove(key);
        }
        this.el.classList.add(this.operator);
    },

    'filter-tree-remove-button': function(evt) {
        this.remove(evt.target.nextElementSibling, true);
    },

    /** Removes a child node and it's .el; or vice-versa
     * @param {HTMLElement|FilterNode} node
     * @param {boolean} [deep=false]
     */
    remove: function(node, deep) {
        if (node instanceof HTMLElement) {
            node = this.find('findByEl', !!deep, node);
        }

        remove.call(this, node);

        if (this.eventHandler) {
            this.eventHandler({ type: 'delete' });
        }
    },

    /**
     * @param {boolean} [object.rethrow=false] - Throw (do not catch) `FilterTreeError`s.
     * @param {boolean} [object.alert=true] - Announce error via window.alert() before returning.
     * @param {boolean} [object.focus=true] - Place the focus on the offending control and give it error color.
     * @returns {undefined|FilterTreeError} `undefined` if valid; or the caught `FilterTreeError` if error.
     */
    invalid: function(options) {
        options = options || {};

        var alert = options.alert === undefined || options.alert,
            rethrow = options.rethrow,
            result;

        try {
            invalid.call(this, options);
        } catch (err) {
            result = err;

            // Throw when requested OR when unexpected (not a filter tree error)
            if (rethrow || !(err instanceof FilterNode.FilterTreeError)) {
                throw err;
            }

            if (alert) {
                window.alert(err.message); // eslint-disable-line no-alert
            }
        }

        return result;
    },

    test: function test(dataRow) {
        var operator = operators[this.operator],
            result = operator.seed,
            noChildrenDefined = true;

        this.children.find(function(child) {
            if (child) {
                noChildrenDefined = false;
                if (child instanceof TerminalNode) {
                    result = operator.reduce(result, child.test(dataRow));
                } else if (child.children.length) {
                    result = operator.reduce(result, test.call(child, dataRow));
                }
                return result === operator.abort;
            }

            return false;
        });

        return noChildrenDefined || (operator.negate ? !result : result);
    },

    /**
     * Get a representation of the filer (sub)tree state.
     * @param {string} [options.syntax='object'] - A case-sensitive string indicating the expected type and format of the return value:
     * * `'object'` (default) walks the tree using `{@link https://www.npmjs.com/package/unstrungify|unstrungify()}`, respecting `JSON.stringify()`'s "{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON()_behavior|toJSON() behavior}," and returning a plain object suitable for resubmitting to {@link FilterNode#setState|setState}.
     * * `'JSON'` walks the tree using `{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON()_behavior|JSON.stringify()}`, returning a JSON string by calling toJSON at every node. Suitable for text-based storage media.
     * * `'SQL'` walks the tree, returning a SQL where clause string. Suitable for creating SQL `SELECT` statements.
     * * `'filter-cell'` walks the tree, returning a string suitable for a Hypergrid filter cell. This syntax should only be called for from a subtree containing homogeneous column names and no subexpressions.
     * @param {number|string} [options.space] - When `options.syntax === 'JSON'`, forwarded to `JSON.stringify`'s third parameter, `space` (see).
     * @param {object} [options.sqlIdQts] - When `options.syntax === 'SQL'`, forwarded to `conditionals.pushSqlIdQts()`.
     * @returns {object|string} Returns object when `options.syntax === 'object'`; otherwise returns string.
     */
    getState: function getState(options) {
        var result = '',
            syntax = options && options.syntax || 'object';

        switch (syntax) {
            case 'object':
                result = unstrungify.call(this);
                break;

            case 'JSON':
                result = JSON.stringify(this, null, options && options.space) || '';
                break;

            case 'SQL':
                var lexeme = operators[this.operator].SQL,
                    qts = !this.parent && options && options.sqlIdQts;

                if (qts) {
                    conditionals.pushSqlIdQts(qts);
                }

                this.children.forEach(function(child, idx) {
                    var op = idx ? ' ' + lexeme.op + ' ' : '';
                    if (child) {
                        if (child instanceof TerminalNode) {
                            result += op + child.getState(options);
                        } else if (child.children.length) {
                            result += op + getState.call(child, options);
                        }
                    }
                });

                if (qts) {
                    conditionals.popSqlIdQts();
                }

                result = lexeme.beg + (result || 'NULL IS NULL') + lexeme.end;
                break;

            case 'filter-cell':
                var operator = operators[this.operator].filterCell.op;
                this.children.forEach(function(child, idx) {
                    if (child) {
                        if (child instanceof TerminalNode) {
                            if (idx) {
                                result += ' ' + operator + ' ';
                            }
                            result += child.getState(options);
                        } else if (child.children.length) {
                            throw new FilterNode.FilterTreeError('Expected conditional but found subexpression (not supported in filter cell syntax).');
                        }
                    }
                });
                break;

            default:
                throw new FilterNode.FilterTreeError('Unknown syntax option "' + syntax + '"');
        }

        return result;
    },

    toJSON: function toJSON() {
        var state = {
            operator: this.operator,
            children: []
        };

        this.children.forEach(function(child) {
            if (child) {
                if (child instanceof TerminalNode) {
                    state.children.push(child);
                } else {
                    var ready = toJSON.call(child);

                    for (var key in FilterNode.optionsSchema) {
                        if (
                            FilterNode.optionsSchema.hasOwnProperty(key) &&
                            child[key] && (
                                FilterNode.optionsSchema[key].own ||
                                child[key] !== child.parent[key]
                            )
                        ) {
                            ready[key] = child[key];
                        }
                    }

                    state.children.push(ready);
                }
            }
        });

        return state;
    }

});

function remove(node) { // call in context
    // remove the subtree from the object tree
    this.children.splice(this.children.indexOf(node), 1);

    if (this.children.length || this.persist) {
        // remove the <li> from the DOM tree
        node.el.parentElement.remove();
    } else if (!this.persist && this.parent) {
        // empty non-root node so remove self, recursing up the tree until not empty
        this.parent.remove(this);
    }
}

function onchange(evt) { // bound context
    var ctrl = evt.target;
    if (ctrl.parentElement === this.el) {
        this.add(ctrl.value !== 'subexp' && {
            state: { editor: ctrl.value },
            focus: true
        });
        ctrl.selectedIndex = 0;
    }
}

function catchClick(evt) { // bound context
    var elt = evt.target;

    var handler = this[elt.className] || this[elt.parentNode.className];
    if (handler) {
        handler.call(this, evt);
        evt.stopPropagation();
    }

    if (this.eventHandler) {
        this.eventHandler(evt);
    }
}

/**
 * Throws error if invalid expression tree.
 * Caught by {@link FilterTree#invalid|FilterTree.prototype.invalid()}.
 * @param {boolean} [options.focus=true] - Move focus to offending control.
 * @returns {undefined} if valid
 * @private
 */
function invalid(options) { // must be called with context
    //if (this instanceof FilterTree && !this.children.length) {
    //    throw new FilterNode.FilterTreeError('Empty subexpression (no filters).');
    //}

    this.children.forEach(function(child) {
        if (child instanceof TerminalNode) {
            child.invalid(options);
        } else if (child.children.length) {
            invalid.call(child, options);
        }
    });
}


module.exports = FilterTree;
