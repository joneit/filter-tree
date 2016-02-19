/* eslint-env browser */

'use strict';

var templex = require('templex');

var templates = {

    subtree: function() {
/*
<span class="filter-tree">
    Match
    <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-or">any</label>
    <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-and">all</label>
    <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-nor">none</label>
    of the following conditionals:<br/>
    <span class="filter-tree-add-filter" title="Add a new conditional to this match.">
       <div></div>conditional
    </span>
    <span class="filter-tree-add" title="Add a new sub-match under this match.">
       <div></div>subexpression
    </span>
    <ol></ol>
</span>
*/
    },

    columnFilter: function() {
/*
<span class="filter-tree">
    <strong>&ldquo;{2}&rdquo; column filter subexpression:</strong><br>
    Match
    <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-or">any</label>
    <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-and">all</label>
    <label><input type="radio" class="filter-tree-op-choice" name="treeOp{1}" value="op-nor">none</label>
    of the following conditionals:<br/>
    <span class="filter-tree-add-filter" title="Add a new conditional to this match.">
       <div></div>conditional
    </span>
    <ol></ol>
</span>
*/
    },

    columnFiltersRoot: function() {
/*
<span class="filter-tree">
    Match <strong>all</strong> of the following column filters:<br/>
    <span class="filter-tree-add" title="Add a new sub-match under this match.">
       <div></div>column filter
    </span>
    <ol></ol>
</span>
*/
    },
    removeButton: function() {
/*
<div class="filter-tree-remove" title="delete conditional"></div>
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
The previous value of <span class="field-name">{1:encode}</span>
<span class="field-value">{2:encode}</span> is no longer valid.
*/
    }

};

var extract = /\/\*\s*([^]+?)\s+\*\//; // finds the string inside the /* ... */; the group excludes the whitespace
var encoders = /\{(\d+)\:encode\}/g;

function get(templateName) {
    var temp = document.createElement('div');
    var text = templates[templateName].toString().match(extract)[1];
    var args = Array.prototype.slice.call(arguments, 1);

    text = dress(text, encoders, function(key) {
        temp.textContent = args[key];
        args[key] = temp.innerHTML;
    });

    temp.innerHTML = templex.apply(this, [text].concat(args));

    // if only one HTMLElement, return it; otherwise entire list of nodes
    return temp.children.length === 1 && temp.childNodes.length === 1 ? temp.firstChild : temp.childNodes;
}

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

module.exports = get;
