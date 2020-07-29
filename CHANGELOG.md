# CHANGELOG

## [v2.0.1](https://github.com/synapsestudios/fetch-client/compare/v2.0.0...v2.0.1) (2019-08-07)

### Fixed

- [#107](https://github.com/synapsestudios/fetch-client/issues/107) oauth: Simultaneous 401s can cause a "already read" error

## [v2.0.0](https://github.com/synapsestudios/fetch-client/compare/v1.1.3...v2.0.0) (2019-07-18)

### Added

- [#70](https://github.com/synapsestudios/fetch-client/issues/70) Update plugin interface to be async
- [#98](https://github.com/synapsestudios/fetch-client/issues/70) Add timeout handling
- [#64](https://github.com/synapsestudios/fetch-client/issues/64) jwtPlugin exports a function that returns a new plugin

### Fixed

- [#49](https://github.com/synapsestudios/fetch-client/issues/49) Calling helper methods without a path results in calls to `undefined`
- [#75](https://github.com/synapsestudios/fetch-client/issues/75) get() helper doesn't pass default options through
- [#102](https://github.com/synapsestudios/fetch-client/issues/102) oauth plugin: When retrying a request that failed due to a 401 headers are concatenated together

## [v1.1.3](https://github.com/synapsestudios/fetch-client/compare/v1.1.2...v1.1.3) (2019-05-08)

- fixed bug where retried 401 request returns undefined

## [v1.1.2](https://github.com/synapsestudios/fetch-client/compare/v1.1.1...v1.1.2) (2019-04-26)

- fixed bug where multiple refresh requests were made with the same refresh token if simultaneous requests 401

## [v1.1.1](https://github.com/synapsestudios/fetch-client/compare/v1.1.0...v1.1.1) (2019-04-24)

- fixed bug in oauth plugin that caused an infinite request loop if token refresh failed

## [v1.1.0](https://github.com/synapsestudios/fetch-client/compare/v1.0.4...v1.1.0) (2019-03-20)

- updated oauth plugin to know about refresh tokens and to automatically fetch new authorization and id tokens

## [v1.0.4](https://github.com/synapsestudios/fetch-client/compare/v1.0.3...v1.0.4) (2017-04-04)

- Fixed issue where x-www-form-urlencoded and form-data requests were supplying a `Content-Type: 'undefined'` header
- Fixed issue where the client would throw a `One of the sources for assign has an enumerable key on the prototype chain.` error when preparing requests with a with x-www-form-urlencoded body because URLSearchParams isn't available from within the React Native bundle.

## [v1.0.3](https://github.com/synapsestudios/fetch-client/compare/v1.0.2...v1.0.3) (2017-09-28)

- Fixed issue where headers passed to client.get were not used in the request

## [v1.0.2](https://github.com/synapsestudios/fetch-client/compare/v1.0.1...v1.0.2) (2017-01-10)

- Updated JWT plugin to not include Authorization header if there is no token

## [v1.0.1](https://github.com/synapsestudios/fetch-client/compare/v1.0.0...v1.0.1) (2017-01-04)

- Updated JWT plugin to not throw exceptions over malformed tokens

## [v1.0.0](https://github.com/synapsestudios/fetch-client/compare/v0.3.0...v1.0.0) (2016-12-02)

- Updated Client to use Hapi-compatible array syntax in query strings by default
- Added queryStringifier option to Client constructor
- Added bracketStyleArrays option to Client constructor
