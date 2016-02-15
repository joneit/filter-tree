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
                <strong>
                    &#x21D0;
                    This edge represents the
                    <a href="javascript:void(0)" onclick="with(this.parentElement.nextElementSibling.style){display=display==='none'?'block':'none'}">root level</a>
                    of the filter tree.
                </strong>
                <div style="display:none">
                    It's called a <dfn>tree</dfn> because it contains both <dfn>branches</dfn> and <dfn>leaves</dfn>.
                    The leaves represent <dfn>conditional expressions</dfn> (or simply <dfn>conditionals</dfn>).
                    The branches, also known as <dfn>subtrees</dfn>, contain leaves and/or other branches and represent subexpressions that group conditionals together.
                    Grouped conditionals are evaluated together, before conditionals outside the group.
                    <p style="margin:.5em 0">
                        Things to understand about the root expression include&hellip;
                    </p>
                    <ul style="margin:.4em;padding-left:1.7em">
                        <li>The root expression is permanent. It cannot be deleted, although it may be empty.</li>
                        <li>The root match operator is <em>always</em> set to <strong>all</strong>.</li>
                        <li>All the column filter cell subexpressions are found on the root level of the tree.</li>
                        <li>You may add additional subexpressions to the root for more complex filtering.</li>
                    </ul>
                </div>
                <p style="margin:.5em 0">Match <strong><em>all</em></strong> of the following conditionals:</p>
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
