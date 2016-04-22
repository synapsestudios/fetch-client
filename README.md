# synapi-client

Wrapper for fetch that adds shortcuts, middleware and events. This is written and maintained by the fine folks at [Synapse Studios](synapsestudios.com). Our goal is to maintain the fetch api while adding in sensible defaults and hooks to request lifecycle events.

This library is inspired by libraries like [Fetch+](https://github.com/RickWong/fetch-plus) and [http-client](https://github.com/mjackson/http-client). There are differences in the details of how our middleware and events work.

## Installation

```
npm install synapi-client --save
```

Note: synapi-client assumes that fetch is available and _will not_ polyfill fetch for you.

## Usage

### Basic Usage

By default synapi-client assumes you're consuming json apis and will set `Content-Type` and `Accept` headers to 'application/json' for you.
```
var Client = require('synapi-client');

var myClient = new Client({ url: 'http://my-api.com' });

myClient.get('coolthings')
  .then(response => {
    // do something with the Response
  });
```
