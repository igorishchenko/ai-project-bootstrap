/**
 * Jest configuration for {{projectName}}.
{{#if has.react-native}} *
 * `transformIgnorePatterns` is the line you will come back to: React Native
 * packages ship untranspiled ESM, and Jest ignores node_modules by default. A
 * new dependency causing "Unexpected token 'export'" belongs in that list.
{{/if}} */
module.exports = {
{{#if has.react-native}}  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
{{/if}}{{#unless has.react-native}}  testEnvironment: 'jsdom',
  // jest-dom first: it registers the DOM matchers the setup file assumes.
  setupFilesAfterEnv: ['@testing-library/jest-dom', '<rootDir>/jest.setup.js'],
{{/unless}}  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/test/**'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
{{#unless has.react-native}}    '\\.(css|less|scss|sass)$': '<rootDir>/src/test/styleMock.js',
{{/unless}}  },
{{#if has.react-native}}  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))',
  ],
{{/if}}};
