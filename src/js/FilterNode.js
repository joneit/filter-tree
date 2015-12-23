/* eslint-env browser */

'use strict';

var extend = require('extend-me');
var Base = extend.Base;

var template = require('./template');

extend.debug = true;

var FilterNode = Base.extend({

    initialize: function(options) {
        var parent = this.parent = options && options.parent,
            json = this.json = options && options.json;

        this.fields =
            options && options.fields ||
            json && json.fields ||
            parent && parent.fields;

        if (!this.fields) {
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
    CSS_CLASS_NAME: 'filter-tree'

});

module.exports = FilterNode;
