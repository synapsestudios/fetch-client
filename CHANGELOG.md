CHANGELOG
=========
## [v1.0.3](https://github.com/synapsestudios/fetch-client/compare/v1.0.2...v1.0.3) (2017-09-28)

* Fixed issue where headers passed to client.get were not used in the request

## [v1.0.2](https://github.com/synapsestudios/fetch-client/compare/v1.0.1...v1.0.2) (2017-01-10)

* Updated JWT plugin to not include Authorization header if there is no token

## [v1.0.1](https://github.com/synapsestudios/fetch-client/compare/v1.0.0...v1.0.1) (2017-01-04)

* Updated JWT plugin to not throw exceptions over malformed tokens

## [v1.0.0](https://github.com/synapsestudios/fetch-client/compare/v0.3.0...v1.0.0) (2016-12-02)

* Updated Client to use Hapi-compatible array syntax in query strings by default
* Added queryStringifier option to Client constructor
* Added bracketStyleArrays option to Client constructor
