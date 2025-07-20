const tracker = require('@middleware.io/node-apm');
tracker.track({
  serviceName: "Node APM Example",
  accessToken: "hmetylqdrnlkcskzothsbgflgsonhrhcnvjt",
  // target: "https://ccang.middleware.io",
});

// tracker.info('Info sample');
// tracker.warn('Warning sample');
// tracker.debug('Debugging Sample');
// tracker.error('Error Sample');