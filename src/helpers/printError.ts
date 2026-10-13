import { BAR } from '@/config/constants'

export function printError(label: string, error?: any): void {
	console.log(`${BAR}  \x1b[31m⛔\x1b[0m ${label} -`, error || '')
}
