Upgrade Guide
=============
Pre-1.0.0 -> 1.0.0
------------------

### Default array syntax in query strings changed

If you were relying on arrays in query strings to use bracket syntax (e.g. `foo[]=bar&foo[]=baz`),
you need to pass `bracketStyleArrays: true` to the Client constructor.
