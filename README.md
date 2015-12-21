# extend-me
Yet another Backbone-like class extender

## Synopsis

Node.js:

```javascript
var Base = require('extend-me').Base;
```

Browser:

```html
<script src="http://joneit.github.io/extend-me/extend-me.min.js"></script>
```

Usage:

```javascript
var MyClass = Base.extend({
    initialize: function () { ... },
    member1: ...,
    member2: ...
};

var MyChildClass = MyClass.extend({
    initialize: function () { /* called after base class's initialize() */ },
    member1: ..., // overrides base class's definition of member1
    member3: ...
};
```

## Example

```javascript
var Parabola = Base.extend({
    initialize: function (a, b) {
        this.a = a;
        this.b = b;
    },
    calculate: function(x) {
        return this.a * Math.pow(x, 2) + (this.b * x);
    }
});

var ParabolaWithIntercept = Parabola.extend({
    initialize: function(a, b, c) {
        this.c = c;
    },
    calculate: function(x) {
        var y = Parabola.prototype.calculate.apply(this, arguments);
        return y + this.c;
    }
});

var parabola = new ParabolaWithIntercept(3, 2, 1),
    y = ParabolaWithIntercept(-3); // yields 22
```

### Constructors

The `initialize` methods at each level of inheritance are the constructors.
Instantiating a derived class will automatically call `initialize` on all ancestor
classes that implement it, starting with the most distant ancestor all the way to
and including the derived class in question. Each `initialize` method is called
with the same parameters passed to the constructor.

If you intend to instantiate the base class (`Parabola` in the above) directly
(_i.e.,_ it is not "abstract"), include the following in the constructor:

```javascript
function Parabola() {
    this.initialize.apply(this, arguments);
}
```

To add initialization code to be executed before or after this chain of `initialize`
calls, you an define methods `preInitialize` and `postInitialize`.

### API documentation

Detailed API docs can be found [here](http://joneit.github.io/extend-me/extend-me.html).

### Demo

A demo can be found [here](http://joneit.github.io/extend-me/demo.html).

### CDN versions

To use in a browser, you have two options:

1. Incorporate the node module into your own browserified project.
2. Use the browserified versions [`extend-me.js`](http://joneit.github.io/extend-me/extend-me.js) or [`extend-me.min.js`](http://joneit.github.io/extend-me/extend-me.min.js) available on the Github pages CDN.

### Submodules

See the note [Regarding submodules](https://github.com/openfin/rectangular#regarding-submodules)
for important information on cloning this repo or re-purposing its build template.
