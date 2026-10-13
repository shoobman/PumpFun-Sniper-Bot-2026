import { DateTime } from 'luxon'
import {
	DIVIDER,
	DIVIDER_HALF,
	FEES_PCT,
	MOCK_TRADE_AMOUNT,
} from '@/config/constants'
import { strategies } from '@/config/strategies'
import { EVEN_THRESHOLD } from './analytics'
import { IPriceChanges, printSentiment } from './getPumpPriceChanges'
import {
	calculateVariance,
	getAverage,
	getDate,
	getFirstNonZeroIndex,
	getRisePct,
	getSum,
} from '@/helpers/mathAndDates'
import { COLORS } from '@/helpers/text'
import { regime } from '@/config/config'
import { getCreatorStats } from '@/helpers/getCreatorStats'

const HAIRCUT = 1

type TradeResult = 'wins' | 'losses' | 'even'

function getStrategyTrades(trades: ITrade[], strategy: number) {
	return trades.filter((t) => t.strategy.id === strategy)
}

function resolveProfitIndex(
	trade: ITrade,
	strategy: number,
	profitIndex: number,
	profitIndexTrue: boolean,
) {
	if (!profitIndexTrue) return profitIndex

	const config: IStrategy = strategies[strategy]
	const resolved = config.evaluatorHoldTime(trade)
	return resolved / 5 - 1
}

function getTradeProfit(
	trade: ITrade,
	strategy: number,
	profitIndex: number,
	profitIndexTrue: boolean,
) {
	const index = resolveProfitIndex(
		trade,
		strategy,
		profitIndex,
		profitIndexTrue,
	)

	// const { takeProfitBreakpointProfits, profitSecs, sell_time } = trade

	// return takeProfitBreakpointProfits?.[2] || profitSecs[index]

	// return trade?.stopLossBreakpointProfits?.[0]
	// 	? trade?.stopLossBreakpointProfits?.[0]?.profit
	// 	: trade.profitSecs[index]

	// return trade?.takeProfitBreakpointProfits?.[1]
	// 	? trade?.takeProfitBreakpointProfits?.[1]?.profit
	// 	: trade.profitSecs[index]

	return (
		// takeProfitBreakpointProfits?.[] ??
		trade.profitSecs[index] ??
		trade.profitSecs[trade.profitSecs.length - 1] ??
		0
	)
}

function classifyTrade(profit: number): TradeResult {
	if (profit >= EVEN_THRESHOLD) return 'wins'
	if (profit <= -EVEN_THRESHOLD) return 'losses'
	return 'even'
}

function evaluateTrades(
	trades: ITrade[],
	strategy: number,
	profitIndex: number,
	profitIndexTrue: boolean,
) {
	return trades.map((trade) => {
		const profit = getTradeProfit(
			trade,
			strategy,
			profitIndex,
			profitIndexTrue,
		)

		return {
			trade,
			profit,
			result: classifyTrade(profit),
		}
	})
}

function calculateStats(
	trades: ITrade[],
	strategyIndex: number,
	profitIndex: number,
	profitIndexTrue: boolean,
) {
	const evaluated = evaluateTrades(
		trades,
		strategyIndex,
		profitIndex,
		profitIndexTrue,
	)

	const strategy = strategies[strategyIndex]
	const profits = evaluated.map(
		(t) => (t.profit - FEES_PCT) * strategy.evaluatorBuyMultiplier(t.trade),
	)

	const avgProfit =
		profits.length > 0 ? getSum(profits.map((p) => p)) / profits.length : 0

	const wins = evaluated.filter((t) => t.result === 'wins').length
	const losses = evaluated.filter((t) => t.result === 'losses').length
	const even = evaluated.filter((t) => t.result === 'even').length

	const avgBuySec = trades.length ? getAverage(trades.map((t) => t.buySec)) : 0

	const totalProfit =
		trades.length * (avgProfit * (MOCK_TRADE_AMOUNT / 100)) * HAIRCUT

	const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0

	return {
		evaluated,
		avgProfit,
		totalProfit,
		wins,
		losses,
		even,
		avgBuySec,
		winRate,
	}
}

function printMarketStatus(traders: number) {
	const status = traders / 100

	if (status < 7) {
		return COLORS.red(status.toFixed(2))
	}

	if (status > 9) {
		return COLORS.green(status.toFixed(2))
	}

	return COLORS.orange(status.toFixed(2))
}

function groupTradesByHour(trades: ITrade[]) {
	const hours: ITrade[][] = Array.from({ length: 24 }, () => [])

	for (const trade of trades) {
		if (trade.buy_time.split) {
			const hour = parseInt(trade.buy_time.split(':')[0], 10)
			hours[hour].push(trade)
		}
	}

	return hours
}

export function renderMenu(
	platform: TPlatform,
	trades: ITrade[],
	strategy: number,
	profitIndex: number,
	profitIndexTrue: boolean,
	filtered: boolean,
	local: boolean,
	day: number,
	solanaPriceMovement: IPriceChanges | null,
) {
	const strategyTrades = getStrategyTrades(trades, strategy)

	const stats = calculateStats(
		strategyTrades,
		strategy,
		profitIndex,
		profitIndexTrue,
	)

	const date = getDate(-day)

	console.log(
		`\n${DateTime.fromISO(date).weekdayLong} - ${date}\t${COLORS.gray(
			filtered ? '🔍 Filtered' : 'Not filtered',
		)}`,
	)

	console.log(`${DIVIDER}${DIVIDER_HALF}`)

	console.log(
		`Profit per trade:\t${
			strategyTrades.length ? `${stats.avgProfit.toFixed(2)}%` : '-'
		} ${COLORS.gray(`(-${FEES_PCT}%)`)}`,
	)

	console.log(
		`Profit:\t\t\t${
			strategyTrades.length ? `$${stats.totalProfit.toFixed(2)}` : '-'
		}`,
	)

	console.log(`Num trades:\t\t${strategyTrades.length}`)

	console.log(
		`Win rate:\t\t${stats.winRate.toFixed(0)}% ${COLORS.gray(
			`(${stats.wins}/${stats.losses})`,
		)}`,
	)

	console.log(`Average buy sec:\t${stats.avgBuySec.toFixed(2)} sec`)

	console.log(`${DIVIDER}${DIVIDER_HALF}`)

	console.log(
		`⏱️ Profit after ${profitIndexTrue ? 'X' : profitIndex * 5 + 5} sec`,
	)

	console.log(`🌐 Local: ${local}`)
	console.log(`🎯 Strategy: ${strategies[strategy].name}`)
	console.log(`🎯 Platform: ${platform}`)

	if (!solanaPriceMovement) {
		return
	}

	const { change12h, change24h, change2h, price } = solanaPriceMovement

	console.log(
		`\n📈 PUMP price: $${Number(price).toFixed(5)} - ` +
			`${printSentiment(
				2,
				'24 hours',
				change24h?.pct!,
			)} (${change24h?.pct!.toFixed(2)}%) - ` +
			`${printSentiment(
				1,
				'12 hours',
				change12h?.pct!,
			)} (${change12h?.pct!.toFixed(2)}%) - ` +
			`${printSentiment(
				1.5,
				' 2 hour',
				change2h?.pct!,
			)} (${change2h?.pct!.toFixed(2)}%)`,
	)
}

export function renderTrades(
	trades: ITrade[],
	strategy: number,
	type: TradeResult | 'all' = 'all',
	profitIndex: number = 0,
	profitIndexTrue: boolean = false,
) {
	console.clear()

	const strategyTrades = getStrategyTrades(trades, strategy)

	const evaluated = evaluateTrades(
		strategyTrades,
		strategy,
		profitIndex,
		profitIndexTrue,
	)

	const filtered =
		type === 'all' ? evaluated : evaluated.filter((t) => t.result === type)

	if (!filtered.length) {
		console.log('No trades...\n')
		return
	}

	for (const { trade, profit } of filtered) {
		const {
			profitSecs,
			initialHolders,
			finalHolders,
			activity,
			strategy: tradeStrategy,
			mcPerSec,
			volume,
			kols,
			buyState,
			socials,
			description,
			profit: _profit,
			takeProfitBreakpointProfits,
			stopLossBreakpointProfits,
			buyersData,
			sellersData,
			tradingVolume,
			data,
			...tradeData
		} = trade

		const {
			buysPerSec,
			buyErrorsPerSec,
			traderBuysPerSec,
			traderErrorsPerSec,
			traderSellsPerSec,
			sellsPerSec,
			buyFees,
			sellFees,
			traderBuyFees,
			traderSellFees,
			tradingAppBuys,
			tradingAppSells,
			...volumeData
		} = volume

		console.table({
			strategy: tradeStrategy.name,
			profit,
			...tradeData,
			...socials,
		})

		if (buyersData) console.table(buyersData)
		if (sellersData) console.table(sellersData)

		console.log('\nkols:', kols)
		if (initialHolders) console.table(initialHolders)
		if (trade.data) console.table(trade.data)
		console.table(finalHolders)

		const cratorStats = getCreatorStats(trade, 240)
		delete cratorStats.medianInitialHolders
		console.table(cratorStats)

		console.table(volumeData)
		console.log('\nbuysPerSec:\t ', buysPerSec)
		console.log('buysErrorsPerSec:', buyErrorsPerSec)
		console.log('sellsPerSec:\t ', sellsPerSec)
		console.log('traderBuysPerSec:', traderBuysPerSec)
		console.log('traderBuysPerSec:', traderBuysPerSec.filter(Boolean))
		console.log('traderSellsPerSec:', traderSellsPerSec)
		console.log('traderBuyErrorsPerSec:', traderErrorsPerSec)
		console.log('\nmc per sec:', mcPerSec)
		console.log('profit secs:', profitSecs)
		console.log('\n\n\n\n\n\n\n')
	}
}

export function renderHours(
	day: number,
	trades: ITrade[],
	profitIndex: number,
	profitIndexTrue: boolean = false,
	strategy: number,
) {
	console.clear()

	const strategyTrades = getStrategyTrades(trades, strategy)

	const hours = groupTradesByHour(strategyTrades)

	console.log(`\t\twins\teven\tlosses\tprofit %\tprofit\t\tmarket condition`)
	console.log(`${DIVIDER}${DIVIDER_HALF}\n`)

	for (const hourIndex in hours) {
		const hourTrades = hours[hourIndex]

		const stats = calculateStats(
			hourTrades,
			strategy,
			profitIndex,
			profitIndexTrue,
		)

		const hoursWithBuys = hourTrades.filter((b) => b.activity)

		const traders =
			getSum(hoursWithBuys.map((trade) => trade.activity.traders * 20)) /
			hoursWithBuys.length

		const bots =
			getSum(hoursWithBuys.map((trade) => trade.activity.bots / 200)) /
			hoursWithBuys.length

		const mints =
			getSum(hoursWithBuys.map((trade) => trade.activity.minted)) /
			hoursWithBuys.length

		const firsBuy = getAverage(
			hoursWithBuys
				.filter((t) => t.volume.traderBuys > 3)
				.map((trade) =>
					getFirstNonZeroIndex(trade.volume.traderBuysPerSec),
				),
		)

		const botsTraderRatio = traders / mints / 100
		const mintsTraderRatio = bots / mints / 100

		console.log(
			`${COLORS.gray(`${hourIndex.toString().padStart(2, '0')}:00`)}\t\t` +
				`${COLORS.bold(COLORS.green(String(stats.wins || ' ')))}\t` +
				`${COLORS.gray(String(stats.even || ' '))}\t` +
				`${COLORS.red(String(stats.losses || ' '))}\t` +
				`${COLORS.gray(
					stats.avgProfit
						? `${stats.avgProfit < 0 ? '' : ' '}${stats.avgProfit.toFixed(
								1,
							)}%`
						: '',
				)}\t\t` +
				`${hourTrades.length ? `$${stats.totalProfit.toFixed(2)}` : ''}   \t` +
				`${traders ? printMarketStatus(traders) : ''}\t` +
				`${mints ? mints.toFixed(1) : ''}\t` +
				`${bots ? bots.toFixed(1) : ''}\t` +
				`${botsTraderRatio ? botsTraderRatio.toFixed(2) : ''}\t` +
				`${mintsTraderRatio ? mintsTraderRatio.toFixed(2) : ''}\t` +
				`${firsBuy ? firsBuy.toFixed(2) : ''}`,
		)
	}
}

export function renderProfitableHours(trades: ITrade[]) {
	console.log(`\n\nProfitable wallets:\n${DIVIDER}`)

	const grouped = getGroupedTradesByCreator(trades, 'asa')

	for (const creator in grouped) {
		const { count, totalProfit } = grouped[creator]

		if (count === 1) continue

		const avgProfit = totalProfit / count

		console.log(
			`${creator}: ${count} trades - avg profit: ${avgProfit.toFixed(2)}%`,
		)
	}
}

export function getGroupedTradesByCreator(trades: ITrade[], time: string) {
	return trades.reduce((acc: any, trade: any) => {
		const { creator, profit } = trade

		if (DateTime.fromISO(time) >= DateTime.fromISO(trade.buy_time)) {
			return acc
		}

		if (!acc[creator]) {
			acc[creator] = {
				count: 0,
				totalProfit: 0,
			}
		}

		acc[creator].count++
		acc[creator].totalProfit += profit

		return acc
	}, {})
}
