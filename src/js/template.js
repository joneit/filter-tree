/* eslint-env browser */

'use strict';

var templex = require('templex');

var templates = {

tree: function() {/*
<span class="filter-tree"">
    Match
    <label><input type="radio" class="filter-tree-choose-operator" name="treeOp{1}" value="op-or">any</label>
    <label><input type="radio" class="filter-tree-choose-operator" name="treeOp{1}" value="op-and">all</label>
    <label><input type="radio" class="filter-tree-choose-operator" name="treeOp{1}" value="op-nor">none</label>
    of:<br/>
    <span class="filter-tree-add-filter" title="Add a new conditional to this match.">
        <div></div>conditional
    </span>
    <span class="filter-tree-add" title="Add a new submatch under this match.">
        <div></div>subexpression
    </span>
    <ol></ol>
</span>
*/},

removeButton: function() {/*
<div class="filter-tree-remove" title="delete conditional"></div>
*/}

};

function getAll(templateName) {
    var temp = document.createElement('div');
    var text = templates[templateName].toString();
    var beg = text.indexOf('/*');
    var end = text.lastIndexOf('*/');
    if (beg === -1 || end === -1) {
        throw 'bad template';
    }
    beg += 2;
    text = text.substr(beg, end - beg);
    text = templex.apply(this, [text].concat(Array.prototype.slice.call(arguments, 1)));
    temp.innerHTML = text;
    return temp.children;
}

function getFirst() {
    return getAll.apply(this, arguments)[0];
}

getFirst.getAll = getAll;

module.exports = getFirst;
