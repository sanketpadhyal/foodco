module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
      },
    }],
  },
  moduleNameMapper: {
    // Stub native / asset imports that would fail in Node
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^react-native$': '<rootDir>/__mocks__/reactNativeMock.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/asyncStorageMock.js',
    '^../auth-page/authService$': '<rootDir>/__mocks__/authServiceMock.js',
    '^../../api/universalbackendapi$': '<rootDir>/__mocks__/backendApiMock.js',
    '\\.json$': '<rootDir>/__mocks__/jsonMock.js',
  },
  transformIgnorePatterns: ['node_modules/(?!(@react-native|react-native|expo)/)'],
};
