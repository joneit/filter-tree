[THIS DOCUMENT NEEDS FURTHER REVIEW, STARTING AT LINE 20.] The standard filter-tree options are generally specified in the `state` object or the optional `options` object passed to the `setState` method or the constructor.

> *Caveat:* Although the node objects themselves contain properties with the same names as the options, it is a poor practice to set these properties directly because they do not represent an API; they are not smart "setter" methods but rather simple, dumb properties. While doing so could be made to work with aditional code, you would need to know details of internal workings of the module, details that are not guaranteed to remain the same in future versions. For this reason, we do not in general recommend manipulating the node objects directly. Nevertheless, at the bottom of this comment, I'll include a discussion to illustrate the difficulties one would encounter in taking this approach.

### Using the API

First I'll discuss the proper API way to set up filter-tree options. Filter-tree supports several strategies for specifying standard options (in priority order):

1. *In the `options` object* passed to the `setState` method; or to the constructor (which passes it to `setState`). Bound to the root of the subtree being set or instantiated; copied to subordinate nodes.
2. *In any node in the `state`* object passed to `setState`; or as an option to the constructor (which passes it to `setState`). Bound to nodes in which it is found in the `state` object; copied to subordinate nodes.
3. *In the node's parent node.* (This is the copying mechanism referred to above.)
4. *Default values* are defined for some standard options when not defined by any of the above strategies.
5. *In the column schema* (`options.schema`). Not bound to any tree node, but looked to at run time by leaf nodes specifically for the `type` and `opMenu` standard options when not previously defined on the node.
6. *Special strategy for operator menu:* When `opMenu` option not already defined for a conditional expression (leaf node) by one of the above strategies. When the column `type` is known from one of the above strategies _and_ `typeOfMap` is defined on the root node _and_ it has an entry for the column's type, the column will use the mapped operator menu.

Note that "the constructor" refers to node instantiation, and will be one of the following or objects extended therefrom. (Note that both are themselves extended from `FilterNode` which handles the bulk of the instantiation for both types of nodes.)
* `FilterTree` objects, which are `"branches," _i.e..,_ subexpressions (either the root or a subtree); or
* `FilterLeaf` objects, which are "leaves," _i.e..,_ conditional expressions.

In addition, 

#### Constructor and setState API
Both the constructor and setState API accept properties as members of either an `options` object or at any node in a `state` object. Either object can have an `opMenu` property, which sets the operator choices for the target node (the root node of the subtree being set). In the case of `state`, a distinct `opMenu` property can also appear in _any_ subnode. _See examples under Operator Menus, below._
bq. This was formerly called `treeOpMenu`. It has been renamed to `opMenu` for two reasons: (1) to highlight it's parallel functionality with the {{opMenu}} schema property; and (2) because it isn't a tree property really. It is not bound to the root; it can be placed on any node.

#### `schema` option
In addition, a column schema can have an `opMenus` property too, so that wherever the column is referenced in the filter tree, it will have the same operator choices as specified here. _See example under Column Menus, below._

#### `typeOpMap` root option
In the root node of a filter tree, you can specify a hash of types mapped to operator menus. Any column of that type lacking the above strategies will get the operator menu so mapped to that type. Example:
```javascript
{ // state or options object
   typeOpMap: [
      'int': [ '=', '<', '<=', '<>', '>=','>' ],
      'string': [ 'contains', 'begins', 'ends' ]
   ],
   ...
}
```
> NOTE: This was formerly named `typeOfMenu`. I changed the name because it is not really a "menu" (as described below), and was confusing.

### Menus

The term _menu_ as used here refers to a list of choices. These lists are rendered as drop-downs in the Query Builder UI, hence the term menu.

Menus are used for all of the various elements of a conditional expression:
* The column schema, which is rendered in the column drop-down.
* The operator list, which is rendered in the operator drop-down.
* The operand is usually a text box but may also be a copy of the column schema (with the exception that the current column is elided).

Menus are arrays, specifically an array of menuItem objects, formally defined [here|http://joneit.github.io/pop-menu/global.htm#menuIteml] using jsdoc @typedef directives. Because this formal definition is a little impenetrable, I'm offering the following examples to make it much more digestible.

#### Operator Menus

Like column menus, operator menus are basically flat lists of strings:
```javascript
[ '=', '<', '>', '<>' ]
```
Alternatively, they can be arranged in hierarchies. The basic mechanism for describing a hierarchy is to replace some items with (nested) arrays:
```javascript
var opMenu = [ // menuItem array
   '=',
   [ '<', '>', '<>' ]
];
```
This structure forms an _n_-ary tree, with nodes (as arrays to contain the child nodes) and terminal nodes (as strings).

bq. NOTE: For the purposes of rendering hierarchical drop-downs, a maximum of one level deep, as shown above, is all that most browsers will render. Deeper levels are ignored so we do not recommend using them.

Although a complete hierarchical menu can be described with simple arrays and strings, as above, it turns out these structures are often insufficient because they only carry one piece of information, the list and its strings. In practice, we often need to include additional information. We do this by using objects instead. Actually, in the case of operators, the name of the operator doubles as the operator symbol and there is no more information. For the submenus, though, we would like to be able to include a label. Sine arrays are objects, you could add a `label` property like this:
```javascript
var ineqs = [ '<', '>' ];
ineqs.label = 'Inequalities';
var opMenu = [ '=', ineqs ]; // menuItem array
```
Unfortunately, as you can see, this extra piece of information cannot be specified succinctly in JavaScript's object literal syntax. For this reason [submenuItem|http://joneit.github.io/pop-menu/global.html] objects, which have `label` and `submenu` properties, are also parsed as nested arrays and look like this:
```javascript
var opMenu = [ // menuItem array
   { label: 'Equality', submenu: [ '=' ] }, // valueItem object
   { label: 'Inequalities', submenu: [ '<', '>', '<>' ] } // valueItem object
];
```

#### Column Menus

Continuing with the case of column menus, there are several other pieces of information we might want to include: `type`, `alias` (column header text), `hidden`, and `opMenu` (the custom operators menu). To specify these, we can substitute another type of object with the primitive string in the {{name}} property:
```javascript
var columnMenu = [ // menuItem array
   { label: 'Officer Name', submenu: [ // submenuItem object
      { name: 'last_name', alias: 'Family Name', opMenu: [ 'begins', 'contains', 'ends' ] }, // valueItem object
      { name: 'first_name', alias: 'Given Name', opMenu: [ 'begins', 'contains', 'ends' ] } // valueItem object
   ]}
];
```

> NOTE: The schema hierarchy does not at this time support inheritance down its tree as the filter tree nodes do. Which is to say, you cannot move the above `opMenu` properties to the superior object and expect it to be work for the two columns.

### Manipulating filter tree nodes directly (not recommended)

Let's now go back to your attempt to manipulate the nodes directly, just to give you some idea of what's involved.

First of all you cannot really say:
```javascript
filter.treeOpMenu = ['equality']
```
because you have left out the "group" function. I think what you meant to say was:
```javascript
filter.treeOpMenu = ['group(equality)']
```
But even the above _will not work_ because of two separate issues:
1. Setting this on a tree or subtree (a node with child nodes) will not be propagated to the sub-nodes because (for efficiency's sake) we don't search _up the tree_ at each node when running the filter, but rather the properties are copied to each node _when they are created._ To resolve this issue, you would either need to propagate them _down the tree_ yourself or leave the original array in place (assuming there was one!) and modify it, thus:
```javascript
filter.treeOpMenu.length = 0;
filter.treeOpMenu.push('group(equality)');
```
2. As noted, node properties are not setters; the "group" function will not be interpreted* and dereferenced. To resolve this issue, do one of the following:
   1. Supply a direct reference to the "equality" group:
```javascript
var conditionals = require('filter-tree/js/conditionals'); // or fin.Hypergrid.filterTree.Conditionals
filter.treeOpMenu = conditionals.groups.equality; // now `opMenu`
```
   2. You can also just supply a "menu" of your own, either flat:
```javascript
filter.treeOpMenu.length = 0;
filter.treeOpMenu.push('=');
```
   3. Or hierarchical, with a group label:
```javascript
filter.treeOpMenu.length = 0;
var myGroup = ['='];
myGroup.label = 'Equality';
filter.treeOpMenu.push();
```
   4. As discussed in the previous section, the following also works, and can be done entirely with object literal syntax:
```javascript
filter.treeOpMenu.length = 0;
filter.treeOpMenu.push({ label: 'Equality', submenu: ['='] });
```

\* Actually, the group function will be interpreted by the filter cell drop down because that is run _late._ However, the Query Builder UI in the Manage Filters dialog is rendered _early_ by setState generally at instantiation time (called by the constructor) and possibly directly by the developer.
