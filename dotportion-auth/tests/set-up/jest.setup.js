jest.setTimeout(30000);

// Silence console logs during tests
console.info = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();
