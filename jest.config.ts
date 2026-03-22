import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'jsdom',
	roots: ['<rootDir>/src'],
	testMatch: ['**/*.test.ts'],
	moduleNameMapper: {
		'^utils/(.*)$': '<rootDir>/src/utils/$1',
		'^managers/(.*)$': '<rootDir>/src/managers/$1',
	},
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
	},
};

export default config;
