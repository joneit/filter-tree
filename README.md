# filter-tree
Complex table filter expressions with GUI editor

## Synopsis

To initialize and optionally load persisted state:

```javascript
var schema = ['FirstName', 'LastName', 'Date of Birth'];
var filter = new FilterTree({
    schema: schema,
    state: state
});
document.getElementById('filter').appendChild(filter.el);
```

To load or reload from saved state:

```javascript
filter.setState(myFilterState);
```
where `myFilterState` can be JSON or SQL.

To extract the state for saving:

```javascript
if (!filter.invalid()) {
    // an object to hold in memory for subsequent reloading
    myFilterStateObject = filter.getState();
}
```

`.getstate()` can take a `syntax` option which can be `'object`' (the default), ``'JSON'`, or `'SQL'`:

```javascript
if (!filter.invalid()) {
    // an object to hold in memory for subsequent reloading
    myFilterStateObject = filter.getState({ syntax: 'JSON', space: 3 });
}
```

(`space` is forwarded to [JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).)

to test against data:

```javascript
var myTestData = { LastName: 'Spade', FirstName: 'Sam', 'Date of Birth': 1910 };
filer.test(myTestData); // `true` if data consistent with filter logic
```

### API documentation

Thre are useful options such as column aliases. Detailed API docs can be found [here](http://joneit.github.io/filter-tree/filter-tree.html).

### Demo

An enhanced demo can be found [here](http://joneit.github.io/filter-tree/demo.html).

### Events

If the tree's UI element (`myTree.el`) is in the DOM, you can listen for the events listed below.

The current version drives all these events to a single event handler. Provide your handler to the `options` hash on instantiation using the key `eventHandler`. This handler will be triggered by the UI, bound to the node object's context, and with the event object as the first and only parameter. You can test which event triggered the handler by checking `event.type`. You can access the target with `event.target`.

#### `keyup`

Triggered with a {@link http://developer.mozilla.org/en-US/docs/DOM/KeyboardEvent|KeyboardEvent} object when a {@link https://developer.mozilla.org/en-US/docs/Web/Events/keyup|keyup} event fires on any textbox in any of the subtree's leaf nodes.

#### `change`

Triggered with an {@link http://developer.mozilla.org/en-US/docs/DOM/KeyboardEvent|Event} object when a {@link https://developer.mozilla.org/en-US/docs/Web/Events/change|change} event fires on any element in of the subtree's leaf nodes.

#### `delete`

This pseudo-event is triggered with pseudo event object when a user clicks a node's delete icon.

The pseudo event object is a plain JavaScript object with one property, `type` (set to `'delete'`), and one method `preventDefault()` (call to avert node deletion). 

Note that this event has no `target` parameter. You can tell what the user is deleting by inspecting the context (which is the node object).

### Extending the conditional expression object

Other types of expressions can be implemented by extending from `FilterLeaf` and registering your extension with `FilterTree`'s `addEditor()` method. Such an implementation must be able to:
* Save (`getState()`) and load (`loadState()`) the state of the conditional.
* If you want to support the UI feature, you need to create the DOM objects that allow the user to edit the state of the conditional (`createView()`) and render them to the UI (`render()`).
* Filter a table by implementing one or more of the following:
  * Apply the conditional logic to local table row data (`test()`).
  * Apply the conditional logic to a remote data-store that understands SQL by generating a **SQL** _WHERE_ clause (`toSQL()`).
  * Other data-stores could be supported by implementing addtional methods (such as `toQ()`, _etc._).

An example of this can be found in src/js/extensions/columns.js

### Discussion

#### Instantiating a filter

Generally speaking, it is recommended that you always provide at least a rudimentary `schema` listing all the available columns, whether or not you provide `state`. You can instantiate a filter without any state or schema or any other options, although it will be of limited usefulness.

Therefore, the specific recommendation is that you specify a filter state, schema, or both:
* `FilterTreeStateObject` (for convenience, when you have no other options to specify);
* `FilterTreeOptionsObject` with a defined `state` property; or
* `FilterTreeOptionsObject` with a defined `schema` property.

Without node `state`, the result is a null (empty) filter. One use case for a null filter is in support of the generated UI; an instantiated filter is required in order to render the UI, even if it is empty.

Without column `schema`, the UI will be pretty much DOA because it depends on the schema to populate its column selection drop-downs. Without a schema, the drop-downs will be empty, and users will not be able to add any expressions manually. (Users do not have the option to type column names directly into the UI.)

Without column `schema`, expressions (leaf nodes) and subexpressions (whole subtrees) can still be added, but only programmatically:
* By calling `setState(state)` explicitly on an existing node. This replaces the whole node.
* Upon instantiation of a new node by the constructor when `state` is provided. This calls `setState()`.
* By calling `add(state)` on an existing root or branch node. This uses the constructor to create the new node(s), adding them as child nodes to the existing node.

If you are not using the UI, this may work fine for you. Otherwise, so the UI's drop-downs won't be empty, you should always provide at least a rudimentary `schema` listing all the available columns, whether or not you provide `state`. Doing so also allows you to specify column metadata, such as column aliases (headers), type, available operators, _etc._

### CDN versions

To use in a browser, you have two options:

1. Incorporate the node module into your own browserified project.
2. Use the browserified versions [`filter-tree.js`](http://joneit.github.io/filter-tree/filter-tree.js) or [`filter-tree.min.js`](http://joneit.github.io/filter-tree/filter-tree.min.js) available on the _Github Pages_ CDN.

### Submodules

See the note [Regarding submodules](https://github.com/openfin/rectangular#regarding-submodules)
for important information on cloning this repo or re-purposing its build template.
