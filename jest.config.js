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

    '\\.(png|jpg|jpeg|gif|webp|svg|mp4)$': '<rootDir>/__mocks__/fileMock.js',
    '^react-native$': '<rootDir>/__mocks__/reactNativeMock.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/asyncStorageMock.js',
    '^expo-status-bar$': '<rootDir>/__mocks__/expoStatusBarMock.js',
    '^expo-video$': '<rootDir>/__mocks__/expoVideoMock.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/vectorIconsMock.js',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/safeAreaMock.js',
    '^../auth-page/authService$': '<rootDir>/__mocks__/authServiceMock.js',
    '^../../api/universalbackendapi$': '<rootDir>/__mocks__/backendApiMock.js',
  },
  transformIgnorePatterns: ['node_modules/(?!(@react-native|react-native|expo)/)'],
};
