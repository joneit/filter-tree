/* eslint-env browser */

'use strict';

var templex = require('templex');

var extract = /\/\*\s*([^]+?)\s+\*\//; // finds the string inside the /* ... */; the group excludes the whitespace
var encoders = /\{(\d+)\:encode\}/g;

function Templates() {}

Templates.prototype = {

    constructor: Templates.prototype.constructor,  // preserve constructor

    subtree: function() {
        /*
         <span class="filter-tree">
         Match
         <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-or">any</label>
         <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-and">all</label>
         <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-nor">none</label>
         of the following:
         <select>
         <option value="">New expression&hellip;</option>
         <option value="subexp" style="border-bottom:1px solid black">Subexpression</option>
         </select>
         <ol></ol>
         </span>
         */
    },

    columnFilter: function() {
        /*
         <span class="filter-tree">
         <strong><span>{2} </span>column filter subexpression:</strong><br>
         Match
         <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-or">any</label>
         <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-and">all</label>
         <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-nor">none</label>
         of the following:
         <select>
         <option value="">New expression&hellip;</option>
         </select>
         <ol></ol>
         </span>
         */
    },

    columnFilters: function() {
        /*
         <span class="filter-tree filter-tree-type-column-filters">
         Match <strong>all</strong> of the following column filters:
         <ol></ol>
         </span>
         */
    },

    lockedColumn: function() {
        /*
         <span>
         {1:encode}
         <input type="hidden" value="{2}">
         </span>
         */
    },

    'column-CQL-syntax': function() {
        /*
         <li>
         <button type="button" class="copy"></button>
         <div class="filter-tree-remove-button" title="delete conditional"></div>
         {1}:
         <input name="{2}" class="{4}" value="{3:encode}">
         </li>
         */
    },

    'column-SQL-syntax': function() {
        /*
         <li>
         <button type="button" class="copy"></button>
         <div class="filter-tree-remove-button" title="delete conditional"></div>
         {1}:
         <textarea name="{2}" rows="1" class="{4}">{3:encode}</textarea>
         </li>
         */
    },

    removeButton: function() {
        /*
         <div class="filter-tree-remove-button" title="delete conditional"></div>
         */
    },

    note: function() {
        /*
         <div class="footnotes">
         <div class="footnote"></div>
         <p>Select a new value or delete the expression altogether.</p>
         </div>
         */
    },

    notes: function() {
        /*
         <div class="footnotes">
         <p>Note the following error conditions:</p>
         <ul class="footnote"></ul>
         <p>Select new values or delete the expression altogether.</p>
         </div>
         */
    },

    optionMissing: function() {
        /*
         The requested value of <span class="field-name">{1:encode}</span>
         (<span class="field-value">{2:encode}</span>) is not valid.
         */
    },

    get: function(templateName) {
        var temp = document.createElement('div');
        var text = this[templateName].toString().match(extract)[1];
        var args = Array.prototype.slice.call(arguments, 1);

        text = dress(text, encoders, function(key) {
            temp.textContent = args[key];
            args[key] = temp.innerHTML;
        });

        temp.innerHTML = templex.apply(this, [text].concat(args));

        // if only one HTMLElement, return it; otherwise entire list of nodes
        return temp.children.length === 1 && temp.childNodes.length === 1 ? temp.firstChild : temp.childNodes;
    }
};

function dress(text, regex, transformer) {
    var keys, matches = {};

    regex.lastIndex = 0;
    while ((keys = regex.exec(text))) {
        matches[keys[1]] = true;
    }
    keys = Object.keys(matches);
    if (keys.length) {
        keys.forEach(transformer);
        text = text.replace(regex, '{$1}');
    }

    return text;
}

module.exports = Templates;
