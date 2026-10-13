import { printError } from '@/helpers/printError'

export type TradeFilter = (trade: ITrade) => boolean

export function evaluatorWrapper(
	trade: ITrade,
	filters: Record<string, TradeFilter>,
): IEvaluatorResult {
	try {
		const results = Object.fromEntries(
			Object.entries(filters).map(([name, fn]) => [name, fn(trade)]),
		) as Record<string, boolean>

		const failedFilters = Object.entries(results)
			.filter(([_, passed]) => !passed)
			.map(([name]) => name)

		if (
			failedFilters.length > 0 ||
			!trade.mcPerSec[trade.mcPerSec.length - 1] ||
			trade.mcPerSec[0] > 200
		) {
			return { passed: false, failedFilters }
		}

		return { passed: true, failedFilters: [] }
	} catch (err) {
		printError('Error evaluating token', err)
		return {
			passed: false,
			failedFilters: ['evaluationError'],
		}
	}
}
