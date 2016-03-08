# filter-tree
Complex table filter expressions with GUI editor

## Synopsis

To initialize and optionally load persisted state:

```javascript
var schema = ['FirstName', 'LastName', 'Date of Birth'];
var myPreviouslySavedFilterObject = JSON.parse(myStoredJSON);
var filter = new FilterTree({
    schema: schema,
    state: myPersistedFilterObject // optional
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

### CDN versions

To use in a browser, you have two options:

1. Incorporate the node module into your own browserified project.
2. Use the browserified versions [`filter-tree.js`](http://joneit.github.io/filter-tree/filter-tree.js) or [`filter-tree.min.js`](http://joneit.github.io/filter-tree/filter-tree.min.js) available on the _Github Pages_ CDN.

### Submodules

See the note [Regarding submodules](https://github.com/openfin/rectangular#regarding-submodules)
for important information on cloning this repo or re-purposing its build template.
