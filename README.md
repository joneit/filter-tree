# filter-tree
Complex table filter expressions with GUI editor

## Synopsis

To initialize and optionally load persisted state:

```javascript
var fields = ['FirstName', 'LastName', 'Date of Birth'];
var myPreviouslySavedFilterObject = JSON.parse(myStoredJSON);
var filter = new FilterTree({
    fields: fields,
    state: myPersistedFilterObject // optional
});
document.getElementById('filter').appendChild(filter.el);
```

to load or reload from saved state:

```javascript
filter.setState(myFilterStateObject);

// or:

filter.setJSON(myFilterStateJSONstring);
```

to get state to save:

```javascript
if (!filter.validate()) { // `undefined` means valid (otherwise returns error message string)
    // an object to hold in memory for subsequent reloading
    myFilterStateObject = filter.getState();
    
    // or:
    
    // a string to persist to storage
    myFilterStateJSONstring = JSON.stringify(filter);
}
```

to test against data:

```javascript
var myDataObject = { LastName: 'Spade', FirstName: 'Sam', 'Date of Birth': 1910 };
filer.test(myDataObject); // `true` if data consistent with filter logic
```

### API documentation

Thre are useful options such as column aliases. Detailed API docs can be found [here](http://joneit.github.io/filter-tree/filter-tree.html).

### Demo

A demo can be found [here](http://joneit.github.io/filter-tree/demo.html).

### CDN versions

To use in a browser, you have two options:

1. Incorporate the node module into your own browserified project.
2. Use the browserified versions [`filter-tree.js`](http://joneit.github.io/filter-tree/filter-tree.js) or [`filter-tree.min.js`](http://joneit.github.io/filter-tree/filter-tree.min.js) available on the _Github Pages_ CDN.

### Submodules

See the note [Regarding submodules](https://github.com/openfin/rectangular#regarding-submodules)
for important information on cloning this repo or re-purposing its build template.
