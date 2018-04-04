CHANGELOG
=========
## [v1.0.4](https://github.com/synapsestudios/fetch-client/compare/v1.0.3...v1.0.4) (2017-04-04)

* Fixed issue where x-www-form-urlencoded and form-data requests were supplying a `Content-Type: 'undefined'` header
* Fixed issue where the client would throw a `One of the sources for assign has an enumerable key on the prototype chain.` error when preparing requests with a with x-www-form-urlencoded body because URLSearchParams isn't available from within the React Native bundle.

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
