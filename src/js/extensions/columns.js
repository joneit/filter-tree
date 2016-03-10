'use strict';

var groups = require('../conditionals').groups;

module.exports = {
    key: 'Columns', // key in `this.parent.editors` hash

    name: 'column = column', // display string for drop-down

    createView: function() {
        // Create the `view` hash and insert the three default elements (`column`, `operator`, `literal`) into `.el`
        this.super.createView.call(this);

        // Remove the `literal` element from the `view` hash
        delete this.view.literal;

        this.view.column2 = this.makeElement(this.root.schema, 'column', this.sortColumnMenu);
        //this.view.column2 = this.el.firstElementChild.cloneNode(true);

        // Replace the 3rd element with the new one. There are no event listeners to worry about.
        this.el.replaceChild(this.view.column2, this.el.children[2]);
    },

    treeOpMenu: [
        groups.equality,
        groups.inequalities,
        groups.sets
    ],

    q: function(dataRow) {
        return dataRow[this.column2];
    },

    getSyntax: function(ops) {
        return ops[this.operator].make.call(ops, this.name, this.column2);
    }
};
