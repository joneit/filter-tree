'use strict';

var groups = require('../Conditionals').groups;
var FilterLeaf = require('../FilterLeaf');

/**
 * Similar to {@link FilterLeaf} except:
 * 1. Instead of a `literal` property, has an `identifier` property.
 * 2. Operators are limited to equality, inequalities, and sets (IN/NOT IN). Omitted are the string and pattern scans (BEGINS/NOT BEGINS, ENDS/NOT ENDS, CONTAINS/NOT CONTAINS, and LIKE/NOT LIKE).
 *
 * @extends FilterLeaf
 *
 * @property {string} identifier - Name of member of data row to compare against the member of data row named by `column`.
 */
var ColumnLeaf = {
    name: 'column = column', // display string for drop-down

    createView: function() {
        // Create the `view` hash and insert the three default elements (`column`, `operator`, `literal`) into `.el`
        FilterLeaf.prototype.createView.call(this);

        // Remove the `literal` element from the `view` hash
        delete this.view.literal;

        this.view.identifier = this.makeElement(this.root.schema, 'column', this.sortColumnMenu);

        // Replace the 3rd element with the new one. There are no event listeners to worry about.
        this.el.replaceChild(this.view.identifier, this.el.children[2]);
    },

    treeOpMenu: [
        groups.equality,
        groups.inequalities,
        groups.sets
    ],

    q: function(dataRow) {
        return dataRow[this.identifier];
    }
};

module.exports = ColumnLeaf;
