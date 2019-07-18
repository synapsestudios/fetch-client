Upgrade Guide
=============
1.x.x -> 2.0.0
-----------------
### Jwt plugin exports a class
Before you did `client.addPlugin(jwtPlugin)` now you should do `client.addPlugin(new jwtPlugin())`

### Default timeout is 10 seconds
If you're doing long running requests they might fail unless you set a higher timeout than the default

### Plugins are async
plugin functions (like onStart) are called with await now, so they can be async functions

Pre-1.0.0 -> 1.0.0
------------------

### Default array syntax in query strings changed

If you were relying on arrays in query strings to use bracket syntax (e.g. `foo[]=bar&foo[]=baz`),
you need to pass `bracketStyleArrays: true` to the Client constructor.
