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
             <span style="margin:0;white-space:normal;line-height:1.25em;font-weight:bold">
                 Column &ldquo;{2}&rdquo; filter cell:
             </span>
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

    root: function() {
        /*
        <span class="filter-tree op-and">
            <div style="margin:0;white-space:normal;line-height:initial;">
                <p style="margin:0">
                    <strong>This is the &ldquo;root&rdquo; of the filter tree.</strong>
                    It's called a &ldquo;tree&rdquo; because it contains both <i>branches</i> and <i>leaves</i>.
                    The leaves represent <i>conditional expressions</i> (or simply <i>conditionals</i>).
                    The branches, also known as <i>subtrees</i>, contain leaves and/or other branches and represent subexpressions that group conditionals together.
                    Grouped conditionals are evaluated together, before conditionals outside the group.
                </p>
                <p style="margin:.5em 0">
                    Things to understand about the root expression include&hellip;
                </p>
                <ul style="margin:.4em;padding-left:1.7em">
                    <li>The root expression is permanent. I cannot be deleted, although it may be empty.</li>
                    <li>The root match operator is <em>always</em> set to <strong>all</strong>.</li>
                    <li>All the column filter cell subexpressions are found on the root level of the tree.</li>
                    <li>You may add additional subexpressions to the root for more complex filtering.</li>
                </ul>
                Match all of the following conditionals:
            </div>
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

    removeButton: function() {
        /*
        <div class="filter-tree-remove" title="delete conditional"></div>
        */
    },

    note: function() {
        /*
        <div class="footnotes">
            <em>Note regarding the above expression:</em>
            <span></span>
            Select a new value or delete the expression altogether.
        </div>
        */
    },

    notes: function() {
        /*
         <div class="footnotes">
            <em>Notes regarding the above expression:</em>
            <ol></ol>
            Select new values or delete the expression altogether.
         </div>
         */
    },

    optionMissing: function() {
        /*
        The previous <span class="field-name">{1:encode}</span>
        value <span class="field-value">{2:encode}</span>
        is no longer valid.
        */
    }

};

var extract = /\/\*\s*([^]+?)\s+\*\//; // finds the string inside the /* ... */; the group excludes the whitespace
var encoders = /\{(\d+)\:encode\}/g;

function get(templateName) {
    var temp = document.createElement('div');
    var text = templates[templateName].toString().match(extract)[1];
    var templexArgs = [text].concat(Array.prototype.slice.call(arguments, 1));
    var keys, encoder = {};

    encoders.lastIndex = 0;
    while ((keys = encoders.exec(text))) {
        encoder[keys[1]] = true;
    }
    keys = Object.keys(encoder);
    if (keys.length) {
        keys.forEach(function(key) {
            temp.textContent = templexArgs[key];
            templexArgs[key] = temp.innerHTML;
        });
        templexArgs[0] = text.replace(encoders, '{$1}');
    }

    temp.innerHTML = templex.apply(this, templexArgs);

    // if only one HTMLElement, return it; otherwise entire list of nodes
    return temp.children.length === 1 && temp.childNodes.length === 1 ? temp.firstChild : temp.childNodes;
}

module.exports = get;
