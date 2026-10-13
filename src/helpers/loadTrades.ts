import { IS_SERVER, LOG_DIR, SERVER_PUBLIC_URL } from '@/config/constants'
import { getDate } from './mathAndDates'
import fs from 'fs'
import state from '@/config/state'

interface IHourStats {
	hour: number
	trades: number
	winRate: number
	avgProfit: number
	avgProfitPct?: number
}

export default async function loadTrades(
	local: boolean = true,
	minusDays: number = 0,
): Promise<ITrade[]> {
	const dateStr = getDate(-minusDays)
	const fileName = `${dateStr}_trades.json`
	let trades: ITrade[] = []

	try {
		if (!local) {
			const url = `${SERVER_PUBLIC_URL}/logs/${fileName}`
			const res = await fetch(url)
			const t = await res.text()

			fs.writeFileSync(`logs/${fileName}`, t)
			trades = JSON.parse(`[${t.trim().replace(/,$/, '')}]`)
		} else {
			const filePath = `${LOG_DIR}/${fileName}`

			try {
				const content = fs.readFileSync(filePath).toString()
				trades = JSON.parse(`[${content.trim().replace(/,$/, '')}]`)
			} catch {
				trades = []
			}
		}
	} catch {
		trades = []
	}

	return trades
}

export async function loadStates(
	local: boolean = true,
	minusDays: number = 0,
): Promise<IRegimeState[]> {
	const dateStr = getDate(-minusDays)
	const fileName = `${dateStr}_state.json`
	let trades: IRegimeState[] = []

	try {
		if (!local) {
			const url = `${SERVER_PUBLIC_URL}/logs/states/${fileName}`
			const res = await fetch(url)
			const t = await res.text()

			if (!IS_SERVER) {
				fs.writeFileSync(`logs/states/${fileName}`, t)
			}
			trades = JSON.parse(`[${t.trim().replace(/,$/, '')}]`)
		} else {
			const filePath = `${LOG_DIR}/states/${fileName}`

			try {
				const content = fs.readFileSync(filePath).toString()
				trades = JSON.parse(`[${content.trim().replace(/,$/, '')}]`)
			} catch {
				trades = []
			}
		}
	} catch {
		trades = []
	}

	return trades
}

export async function loadTradesRange(
	days: number,
	offset: number = 0,
	local = true,
) {
	const results: ITrade[] = []

	for (let i = 0; i < days; i++) {
		const daily = await loadTrades(local, i - offset)
		results.push(...daily)
	}

	return results
}

export function getHourlyStats(trades: ITrade[]): IHourStats[] {
	const buckets: Record<
		number,
		{
			trades: number
			wins: number
			sumProfit: number
		}
	> = {}

	for (const trade of trades) {
		const hour = Number(trade.buy_time.slice(0, 2))

		if (!buckets[hour]) {
			buckets[hour] = {
				trades: 0,
				wins: 0,
				sumProfit: 0,
			}
		}

		const b = buckets[hour]

		b.trades++
		b.sumProfit += trade.profit! - 5
		if (trade.profit! > 0) b.wins++
	}

	// normalize
	return Object.entries(buckets)
		.map(([hourStr, b]) => {
			const hour = Number(hourStr)

			return {
				hour,
				trades: b.trades,
				winRate: b.trades ? b.wins / b.trades : 0,
				avgProfit: b.trades ? b.sumProfit / b.trades : 0,
			}
		})
		.sort((a, b) => a.hour - b.hour)
}

export function normalizePerDay(stats: IHourStats[], days: number) {
	return stats.map((s) => ({
		...s,
		tradesPerDay: s.trades / days,
	}))
}

export function getGlobalStats(trades: ITrade[]) {
	if (!trades.length) {
		return {
			avgProfit: 0,
			winRate: 0,
			totalTrades: 0,
		}
	}

	let sumProfit = 0
	let wins = 0

	for (const t of trades) {
		sumProfit += t.profit!

		if (t.profit! > 0) wins++
	}

	return {
		totalTrades: trades.length,
		avgProfit: sumProfit / trades.length - 4,
		winRate: wins / trades.length,
	}
}

export function getLastTrades(
	trade: ITrade,
	limit: number = 100,
	filterFunc: (trade: ITrade) => boolean = () => true,
) {
	const cutoff = `${trade.date}T${trade.buy_time}`

	const trades = state.tradeData.filter(filterFunc)
	const result: ITrade[] = []

	for (let i = trades.length - 1; i >= 0; i--) {
		const previousTrade = trades[i]

		if (previousTrade.strategy.id !== trade.strategy.id) continue

		const previousTradeTime = `${previousTrade.date}T${previousTrade.buy_time}`

		if (previousTradeTime >= cutoff) continue

		result.push(previousTrade)

		if (result.length >= limit) break
	}

	return result.reverse()
}

export function getLastTradesByTime(
	trade: ITrade,
	minutesAgo: number = 10,
	filterFunc: (trade: ITrade) => boolean = () => true,
) {
	const cutoff =
		new Date(`${trade.date}T${trade.buy_time}`).getTime() -
		minutesAgo * 60 * 1000

	const trades = state.tradeData.filter(filterFunc)
	const result: ITrade[] = []

	for (let i = trades.length - 1; i >= 0; i--) {
		const previousTrade = trades[i]

		if (previousTrade.strategy.id !== trade.strategy.id) continue

		const previousTradeTime = new Date(
			`${previousTrade.date}T${previousTrade.buy_time}`,
		).getTime()

		if (
			previousTradeTime >=
			new Date(`${trade.date}T${trade.buy_time}`).getTime() - 1000
		) {
			continue
		}

		if (previousTradeTime < cutoff) break

		result.push(previousTrade)
	}

	return result.reverse()
}
