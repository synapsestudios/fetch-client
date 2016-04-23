# synapi-client

Wrapper for fetch that adds shortcuts, middleware and events. This is written and maintained by the fine folks at [Synapse Studios](synapsestudios.com). Our goal is to maintain the fetch api while adding in sensible defaults and hooks to request lifecycle events.

This library is inspired by libraries like [Fetch+](https://github.com/RickWong/fetch-plus) and [http-client](https://github.com/mjackson/http-client). There are differences in the details of how our middleware and events work.

## Installation

```
npm install synapi-client --save
```

Note: synapi-client assumes that fetch is available and _will not_ polyfill fetch for you.

## Usage

By default synapi-client assumes you're consuming json apis and will set `Content-Type` and `Accept` headers to 'application/json' for you.
```
var Client = require('synapi-client');

var myClient = new Client({ url: 'http://my-api.com' });

myClient.get('coolthings') // performs GET request to http://my-api.com/coolthings
  .then(response => {
    // do something with the Response
  });
```

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

### Middleware

Our middleware implementation allows you to register objects with methods that will trigger during request lifecycle. Middleware is more robust than event callbacks because they have access to the event emitter, they are allowed to alter the Response object, and they can register their own helper methods on your client object.

The most basic implementation of a middleware looks like this

```
var myMiddleware = {
  onStart: function(request) {
    return request;
  }
}

myClient.addMiddleware(myMiddleware);
```

#### Middleware Methods
Middleware methods correspond to events and fire under the same conditions with the same arguments.

| Method Name | Trigger Condition                                           | Args              |
| ----------- | ----------------------------------------------------------- | ----------------- |
| onStart     | Fires for every request before the request is even started. | Request           |
| onSuccess   | Fires when a request returns an http status < 400           | Request, Response |
| onFail      | Fires when a request returns an http status >= 400          | Request, Response |
| onError     | Fires when a request errors out. Server timeouts, etc       | Request, err      |

#### Aborting the request with onStart()
If your middlewares `onStart` method returns false or throws an error then the request will be aborted and the promise will be rejected.

```
var myMiddleware = {
  onStart: function(request) {
    return false;
  }
}

myClient.addMiddleware(myMiddleware);
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
class JsonResponseMiddleware {
  function onSuccess(request, response) {
    return response.json();
  }
}

myClient.addMiddleware(new JsonResponseMiddleware());
myClient.get('coolthings').then(json => {
  // we have json now!
});
```
#### Triggering Custom Events
```
class MyMiddleware {
  function onStart(request) {
    // emit a custom event
    this.client.eventEmitter.emit('custom_event', request);
    return request;
  }
}

myClient.addMiddleware(new MyMiddleware());

// register a handler for our custom event
myClient.on('custom_event', request => {
  // do something
});

myClient.get('coolthings').then(response => {
  // handle response
});
```

#### Removing middleware
By adding a name to your middleware object you can then reference it and remove it. Naming middleware is only required if you wish to use this feature to remove middleware.

```
var myMiddleware {
  name: 'myMiddleware',
  onStart: function(request) {
    return request;
  }
}

myClient.addMiddleware(myMiddleware);
myClient.removeMiddleware('myMiddleware');
```

#### Adding helper methods

```
var myMiddleware = {
  helpers : {
    newHelperFunction: function() {
      // do something
    }
  }
}

myClient.addMiddleware(myMiddleware);

// now you can call your custom helper methods on the client object
myClient.newHelperFunction();
```
