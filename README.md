# fetch-client

![shippable-badge](https://api.shippable.com/projects/5745e8ba2a8192902e216482/badge?branch=master)

Wrapper for fetch that adds shortcuts, plugins and events. This is written and maintained by the fine folks at [Synapse Studios](http://www.synapsestudios.com). Our goal is to maintain the fetch api while adding in sensible defaults and hooks to request lifecycle events.

This library is inspired by libraries like [Fetch+](https://github.com/RickWong/fetch-plus) and [http-client](https://github.com/mjackson/http-client). There are differences in the details of how our plugins and events work.

## Installation

```
npm install @synapsestudios/fetch-client --save
```

Note: fetch-client assumes that `fetch` and `URLSearchParams` are available and _will not_ polyfill them for you.

## Usage

By default fetch-client assumes you're consuming json apis and will set `Content-Type` and `Accept` headers to 'application/json' for you.
```
var Client = require('@synapsestudios/fetch-client');

var myClient = new Client({ url: 'http://my-api.com' });

myClient.get('coolthings') // performs GET request to http://my-api.com/coolthings
  .then(response => {
    // do something with the Response
  });
```

### Client Methods

The client object provides these methods for making requests:
  - fetch(path, body, options) - wraps fetch and passes body options into the fetch call. Provides event/plugin features.
  - get(path, body, options)
  - post(path, body, options)
  - put(path, body, options)
  - patch(path, body, options)
  - delete(path, options)

The get, post, put, patch and delete helper methods are shortcuts that set the HTTP method and also will encode the body appropriately. Your body will be left alone or encoded as json, FormData or URLSearchParams depending on the 'Content-Type' header and the 'encoding' value set in your client's [defaults](#defaults). The options argument is passed directly on to the `fetch` call and is where you set any custom headers and other request options. See <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch> and <https://github.com/github/fetch> for more information on how to use fetch options.

### Defaults
Configuration defaults can be provided when instantiating the client object. These defaults are used by the get, post, put, patch and delete helper methods to set default options on the request as well as defining a default encoding. By defining a default encoding value the client will be able to determine how (or whether) to modify the `body` argument in helper methods.

```
var defaults = {
  timeout: // integer value for timeout
  encoding: 'json',
  get: {
    // default fetch options for GET requests
  },
  post: {
    // default fetch options for POST requests
  },
  put: {
    // default fetch options for PUT requests
  },
  patch: {
    // default fetch options for PATCH requests
  },
  delete: {
    // default fetch options for DELETE requests
  },
}
```

#### Encoding
The `encoding` property in the defaults object determines how the http request helper methods attempt to encode the body of the request. Valid values are:
  - 'json' - Runs the body through `JSON.stringify()`. Sets 'Content-Type' to 'application/json'
  - 'text' - Does nothing to the body. Sets 'Content-Type' to 'text/plain'
  - 'form-data' - Encodes body as FormData object. Lets fetch determine 'Content-Type' ('multipart/form-data')
  - 'x-www-form-urlencoded' - Encodes body as URLSearchParams. Lets fetch determine 'Content-Type' ('application/x-www-form-urlencoded')
  - false - does nothing to body, does nothing to 'Content-Type'

### Timeout

By default fetch-client has a 10 second request time out. You can override that default with your own value when you instantiate the client (`const myClient = new Client({ timeout: 30000 })`) or in the `options` object on individual requests ( `client.get('path', { timeout: 50000 })` )

If a request is exceeds the timeout time then the promise with be rejected with a `TimeoutError`. It's important to note that fetch requests can not be aborted, so just because your request timed out and the promise was rejected you should not assume that the request is not still pending.

### Events

Client objects will fire lifecycle events that your app can respond to.

| Event Name      | Trigger Condition                                           | Args              |
| --------------- | ----------------------------------------------------------- | ----------------- |
| REQUEST_START   | Fires for every request before the request is even started. | Request           |
| REQUEST_SUCCESS | Fires when a request returns an http status < 400           | Request, Response |
| REQUEST_FAIL    | Fires when a request returns an http status >= 400          | Request, Response |
| REQUEST_ERROR   | Fires when a request errors out. Server timeouts, etc       | Request, err      |

#### Example

```
myClient.on('REQUEST_START', request => {
  console.log('on start');
});

myClient.on('REQUEST_SUCCESS', (request, response) => {
  console.log('on success');
});

myClient.get('coolthings')
  .then(response => {
    console.log('fetch then called');
  });

// Output:
// on start
// on success
// fetch then called
```

### Plugins

Our plugin implementation allows you to register objects with async methods that will trigger during request lifecycle. Plugins are more robust than event callbacks because they have access to the event emitter, they are allowed to alter the Response object, and they can register their own helper methods on your client object. You can also return a Promise which will be resolved before the request lifecycle continues.

The most basic implementation of a plugin looks like this

```
var myPlugin = {
  onStart: async function(request) {
    return request;
  }
}

myClient.addPlugin(myPlugin);
```

#### Plugin Methods
Plugin methods correspond to events and fire under the same conditions with the same arguments.

| Method Name | Trigger Condition                                           | Args              |
| ----------- | ----------------------------------------------------------- | ----------------- |
| onStart     | Fires for every request before the request is even started. | Request           |
| onSuccess   | Fires when a request returns an http status < 400           | Request, Response |
| onFail      | Fires when a request returns an http status >= 400          | Request, Response |
| onError     | Fires when a request errors out. Server timeouts, etc       | Request, err      |

#### Available Plugins

This library includes some built-in plugins:

##### JWT

The JWT plugin sets the JSON web token in the request's Authorization header and emits
AUTH_EXPIRED or AUTH_FAILED events on 401 responses.

```
import { JwtPlugin } from '@synapsestudios/fetch-client';
import store2 from 'store2';

myClient.addPlugin(new JwtPlugin());
myClient.setJwtTokenGetter(() => (store2.get('token').token || {}).token);
myClient.post('endpoint-that-requires-auth');
```

##### JSON

The JSON plugin adds a parsedBody method to the response object that calls
Response.json() if the Content-Type is application/json, and Response.text() otherwise.

```
import { jsonPlugin } from '@synapsestudios/fetch-client';

myClient.addPlugin(jsonPlugin);
myClient.post('endpoint').then(response => {
  response.parsedContent().then(content => {

  });
});
```

#### Aborting the request with onStart()
If your plugin's `onStart` method returns false or throws an error then the request will be aborted and the promise will be rejected.

```
var myPlugin = {
  onStart: function(request) {
    return false;
  }
}

myClient.addPlugin(myPlugin);
myClient.get('coolthings')
  .then(response => {
    // will never execute
  })
  .catch(err => {
    // onStart returned false so we get here
  });
```

#### Altering the response with onSuccess() and onFail()
```
class JsonResponsePlugin {
  function onSuccess(request, response) {
    return response.json();
  }
}

myClient.addPlugin(new JsonResponsePlugin());
myClient.get('coolthings').then(json => {
  // we have json now!
});
```
#### Triggering Custom Events
```
class MyPlugin {
  function onStart(request) {
    // emit a custom event
    this.client.eventEmitter.emit('custom_event', request);
    return request;
  }
}

myClient.addPlugin(new MyPlugin());

// register a handler for our custom event
myClient.on('custom_event', request => {
  // do something
});

myClient.get('coolthings').then(response => {
  // handle response
});
```

#### Removing plugins
By adding a name to your plugin object you can then reference it and remove it. Naming plugins is only required if you wish to use this feature to remove plugins.

```
var myPlugin {
  name: 'myPlugin',
  onStart: function(request) {
    return request;
  }
}

myClient.addPlugin(myPlugin);
myClient.removePlugin('myPlugin');
```

#### Adding helper methods

```
var myPlugin = {
  helpers : {
    newHelperFunction: function() {
      // do something
    }
  }
}

myClient.addPlugin(myPlugin);

// now you can call your custom helper methods on the client object
myClient.newHelperFunction();
```
