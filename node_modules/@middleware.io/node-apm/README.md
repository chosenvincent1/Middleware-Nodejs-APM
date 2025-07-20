## Middleware Node APM 

## Introduction

@middleware.io/node-apm is the official Middleware client for Node.js that sends your runtime metrics, traces/spans, and custom logs to [Middleware.io](https://middleware.io/).

## Example

```javascript

const tracker = require('@middleware.io/node-apm');
tracker.track({
    projectName:"Your application name",
    serviceName:"Your service name",
})

tracker.error(new Error('your error message'));

tracker.info('your info messaege');

tracker.warn('your warning message');

tracker.debug('your debug message');

```