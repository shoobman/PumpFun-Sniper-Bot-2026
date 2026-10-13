import { printError } from './printError'

export function getEnvVar<T extends string | number | boolean = string>(
	variableName: string,
): T {
	const raw = process.env[variableName]
	if (raw === undefined || raw === '') {
		printError(`${variableName} is not set`)
		process.exit(1)
	}
	if (raw === 'true') return true as T
	if (raw === 'false') return false as T
	if (/^-?\d+(\.\d+)?$/.test(raw)) {
		return Number(raw) as T
	}
	return raw as T
}
