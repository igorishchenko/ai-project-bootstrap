/**
 * Global test setup for {{projectName}}.
 *
{{#if has.react-native}} * Native modules have no JavaScript implementation in a Jest environment, so
 * anything reaching the native layer must be mocked here or the import itself
 * throws. Where this project wraps an SDK in a service, prefer mocking the
 * service in the individual test instead.
{{/if}}{{#unless has.react-native}} * Anything that exists only in a real browser must be stubbed here or in the
 * individual test. Where this project wraps an SDK in a service, prefer mocking
 * the service.
{{/unless}} */
{{#if has.react-native}}
// Reanimated and gesture handler ship their own test mocks.
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
{{/if}}{{#unless has.react-native}}
// jsdom implements neither of these, and component libraries assume both.
global.matchMedia ??= (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

global.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
{{/unless}}
// Silence the noisy-but-harmless act() warnings from async state updates.
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return;
  originalWarn(...args);
};

// A test that only passes in isolation is broken — reset between each one.
beforeEach(() => {
  jest.clearAllMocks();
});
