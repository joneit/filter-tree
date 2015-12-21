/* eslint-env browser */

'use strict';

function StandardConditionalEditor(fieldNames, json) {
    this.initialize(fieldNames, json);
}

StandardConditionalEditor.prototype = {
    initialize: function(fieldNames, json) {
        this.fieldNames = fieldNames;
        this.json = json;
    },
    render: function() {
        this.container = document.createElement('span');
        makeElement.call(this, 'field', this.fieldNames.slice().sort());
        makeElement.call(this, 'operator', ['=', '≠', '<', '>', '≤', '≥']);
        makeElement.call(this, 'argument');
        return this.container;
    },
    toJSON: function() {
        var json = {};
        for (var key in this.element) {
            json[key] = this.element[key].value;
        }
        return json;
    }
};

function makeElement(name, options) {
    var element = document.createElement(options ? 'select' : 'input');
    element.name = name;
    addOptions(options, element);
    if (this.json) {
        element.value = this.json[name];
    }
    this.container.appendChild(element);
}

function addOptions(options, element) {
    if (options) {
        options.forEach(function(option) {
            var newElement;
            if ((option.options || option) instanceof Array) {
                newElement = document.createElement('optgroup');
                addOptions(option.options || option, newElement);
                newElement.label = option.label;
                element.add(newElement);
            } else {
                newElement = typeof option === 'object' ? new Option(option.text, option.value) : new Option(option);
                if (element.add) {
                    element.add(newElement);
                } else {
                    element.appendChild(newElement);
                }
            }
        });
    }
}

module.exports = StandardConditionalEditor;
