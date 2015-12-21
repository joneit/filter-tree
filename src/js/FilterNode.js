/* eslint-env browser */

'use strict';

var extend = require('extend-me');
var Base = extend.Base;

var template = require('./template');

extend.debug = true;

var FilterNode = Base.extend({

    initialize: function(fieldNames, json, parent) {
        if (!(fieldNames instanceof Array)) {
            // 1st param `fieldNames` omitted; shift other params
            parent = json;
            json = fieldNames;
            fieldNames = undefined;
        }

        this.parent = parent;

        this.fieldNames = fieldNames ||
            json && json.fieldNames ||
            parent && parent.fieldNames;

        if (!this.fieldNames) {
            throw this.Error('No field names list.');
        }

        this.newView();
        this.fromJSON(json);
        this.render();
    },

    render: function() {
        if (this.parent) {
            var newListItem = document.createElement(this.CHILD_TAG);
            newListItem.appendChild(template('removeButton'));
            newListItem.appendChild(this.el);
            this.parent.el.querySelector(this.CHILDREN_TAG).appendChild(newListItem);
        }
    },

    Error: function(msg) {
        return new Error('FilterTree: ' + msg);
    },

    CHILDREN_TAG: 'OL',
    CHILD_TAG: 'LI',
    CSS_CLASS_NAME: 'filter-tree',

    filters: { }

});

module.exports = FilterNode;
