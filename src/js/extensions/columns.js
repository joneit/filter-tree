'use strict';

var groups = require('../Conditionals').groups;
var FilterLeafPrototype = require('../FilterLeaf').prototype;

module.exports = {
    name: 'column = column', // display string for drop-down

    createView: function() {
        // Create the `view` hash and insert the three default elements (`column`, `operator`, `literal`) into `.el`
        FilterLeafPrototype.createView.call(this);

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
