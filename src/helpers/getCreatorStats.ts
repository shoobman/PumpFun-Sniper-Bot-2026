import { regime } from '@/config/config'
import state from '@/config/state'
import { getAverage, getMedian, getRisePct } from '@/helpers/mathAndDates'

interface ICreatorTokenStats {
	mint: string
	date: string
	time: string

	// Market cap performance
	profit2s: number
	profit4s: number
	profit6s: number
	profit10s: number
	profit20s: number
	peakProfit: number
	maxDrawdown: number

	// Timing / longevity
	timeTo10: number | null
	timeTo20: number | null
	timeTo50: number | null
	timeToPeak: number
	peakIndex: number

	// Momentum
	earlyMomentum: number
	momentum4s: number
	momentum10s: number
	peakMomentum: number

	// Volume
	buys: number
	sells: number
	traderBuys: number
	traderSells: number
	botBuys: number
	botSells: number

	// Ratios
	traderRatio: number
	botRatio: number
	sellBuyRatio: number
	traderSellBuyRatio: number

	// Errors
	buyErrors: number
	traderBuyErrors: number
	buyErrorRate: number
	traderBuyErrorRate: number

	// Buy activity
	peakBuysPerSec: number
	peakTraderBuysPerSec: number
	averageBuysPerSec: number
	averageTraderBuysPerSec: number

	// Holders
	initialHolders: number
}

interface ICreatorStats {
	creator: string

	// Sample
	numTokens: number

	// Profitability
	averageProfit: number
	medianProfit: number
	winRate: number

	averagePeakProfit: number
	medianPeakProfit: number

	// Risk
	averageMaxDrawdown: number
	medianMaxDrawdown: number

	// Longevity
	medianTimeTo10: number | null
	medianTimeTo20: number | null
	medianTimeTo50: number | null
	medianTimeToPeak: number

	// Momentum
	averageEarlyMomentum: number
	medianEarlyMomentum: number
	averageMomentum4s: number
	averageMomentum10s: number
	averagePeakMomentum: number

	// Trading
	averageBuys: number
	averageSells: number
	averageTraderBuys: number
	averageTraderSells: number
	averageBotBuys: number
	averageBotSells: number

	// Ratios
	averageTraderRatio: number
	medianTraderRatio: number
	averageBotRatio: number
	averageSellBuyRatio: number
	averageTraderSellBuyRatio: number

	// Errors
	averageBuyErrors: number
	averageTraderBuyErrors: number
	averageBuyErrorRate: number
	averageTraderBuyErrorRate: number

	// Buy activity
	averagePeakBuysPerSec: number
	averagePeakTraderBuysPerSec: number
	averageBuysPerSec: number
	averageTraderBuysPerSec: number

	// Holders
	averageInitialHolders: number
	medianInitialHolders: number

	// Consistency
	profitStdDev: number
	profitableTokenPct: number
	strongTokenPct: number

	// Individual token data
	tokens?: ICreatorTokenStats[]
}

export function getCreatorStats(
	trade: ITrade,
	lookback: number = 1440,
): ICreatorStats {
	const states = regime.getLastStatesForTrade(
		trade,
		lookback,
	) as IRegimeState[]

	const creatorStates = states.filter((s) => s.creator === trade.creator)

	const tokens = creatorStates.map(getTokenStats)

	const profits = tokens.map((t) => t.profit4s)

	const peakProfits = tokens.map((t) => t.peakProfit)

	const drawdowns = tokens.map((t) => t.maxDrawdown)

	const earlyMomentum = tokens.map((t) => t.earlyMomentum)

	const momentum4s = tokens.map((t) => t.momentum4s)

	const momentum10s = tokens.map((t) => t.momentum10s)

	const peakMomentum = tokens.map((t) => t.peakMomentum)

	const traderRatios = tokens.map((t) => t.traderRatio)

	const botRatios = tokens.map((t) => t.botRatio)

	const sellBuyRatios = tokens.map((t) => t.sellBuyRatio)

	const traderSellBuyRatios = tokens.map((t) => t.traderSellBuyRatio)

	const buyErrorRates = tokens.map((t) => t.buyErrorRate)

	const traderBuyErrorRates = tokens.map((t) => t.traderBuyErrorRate)

	const timeTo10 = tokens.map((t) => t.timeTo10).filter(isNotNull)

	const timeTo20 = tokens.map((t) => t.timeTo20).filter(isNotNull)

	const timeTo50 = tokens.map((t) => t.timeTo50).filter(isNotNull)

	const timeToPeak = tokens.map((t) => t.timeToPeak)

	const initialHolders = tokens.map((t) => t.initialHolders)

	const profitsStdDev = getStdDev(profits)

	return {
		creator: trade.creator,

		numTokens: tokens.length,

		averageProfit: getAverage(profits),
		medianProfit: getMedian(profits),

		winRate: percentage(
			tokens.filter((t) => t.profit2s > 0).length,
			tokens.length,
		),

		averagePeakProfit: getAverage(peakProfits),
		medianPeakProfit: getMedian(peakProfits),

		averageMaxDrawdown: getAverage(drawdowns),
		medianMaxDrawdown: getMedian(drawdowns),

		medianTimeTo10: getMedianOrNull(timeTo10),
		medianTimeTo20: getMedianOrNull(timeTo20),
		medianTimeTo50: getMedianOrNull(timeTo50),
		medianTimeToPeak: getMedian(timeToPeak),

		averageEarlyMomentum: getAverage(earlyMomentum),
		medianEarlyMomentum: getMedian(earlyMomentum),
		averageMomentum4s: getAverage(momentum4s),
		averageMomentum10s: getAverage(momentum10s),
		averagePeakMomentum: getAverage(peakMomentum),

		averageBuys: getAverage(tokens.map((t) => t.buys)),

		averageSells: getAverage(tokens.map((t) => t.sells)),

		averageTraderBuys: getAverage(tokens.map((t) => t.traderBuys)),

		averageTraderSells: getAverage(tokens.map((t) => t.traderSells)),

		averageBotBuys: getAverage(tokens.map((t) => t.botBuys)),

		averageBotSells: getAverage(tokens.map((t) => t.botSells)),

		averageTraderRatio: getAverage(traderRatios),

		medianTraderRatio: getMedian(traderRatios),

		averageBotRatio: getAverage(botRatios),

		averageSellBuyRatio: getAverage(sellBuyRatios),

		averageTraderSellBuyRatio: getAverage(traderSellBuyRatios),

		averageBuyErrors: getAverage(tokens.map((t) => t.buyErrors)),

		averageTraderBuyErrors: getAverage(tokens.map((t) => t.traderBuyErrors)),

		averageBuyErrorRate: getAverage(buyErrorRates),

		averageTraderBuyErrorRate: getAverage(traderBuyErrorRates),

		averagePeakBuysPerSec: getAverage(tokens.map((t) => t.peakBuysPerSec)),

		averagePeakTraderBuysPerSec: getAverage(
			tokens.map((t) => t.peakTraderBuysPerSec),
		),

		averageBuysPerSec: getAverage(tokens.map((t) => t.averageBuysPerSec)),

		averageTraderBuysPerSec: getAverage(
			tokens.map((t) => t.averageTraderBuysPerSec),
		),

		averageInitialHolders: getAverage(initialHolders),

		medianInitialHolders: getMedian(initialHolders),

		profitStdDev: profitsStdDev,

		profitableTokenPct: percentage(
			tokens.filter((t) => t.profit2s > 0).length,
			tokens.length,
		),

		// "Strong" = reached at least +20% at some point
		strongTokenPct: percentage(
			tokens.filter((t) => t.peakProfit >= 20).length,
			tokens.length,
		),

		// tokens,
	}
}

function getTokenStats(state: IRegimeState): ICreatorTokenStats {
	const mc = state.mcPerSec

	const profit2s = getProfitAtIndex(mc, 1)
	const profit4s = getProfitAtIndex(mc, 2)
	const profit6s = getProfitAtIndex(mc, 3)
	const profit10s = getProfitAtIndex(mc, 5)
	const profit20s = getProfitAtIndex(mc, 10)

	const peakIndex = getPeakIndex(mc)
	const peakProfit = getProfitAtIndex(mc, peakIndex)

	const maxDrawdown = getMaxDrawdown(mc)

	const timeTo10 = getTimeToProfit(mc, 10)
	const timeTo20 = getTimeToProfit(mc, 20)
	const timeTo50 = getTimeToProfit(mc, 50)

	const timeToPeak = peakIndex * 2

	const earlyMomentum = getRisePct(getValues(mc, 0, 1))

	const momentum4s = getRisePct(getValues(mc, 0, 2))

	const momentum10s = getRisePct(getValues(mc, 0, 5))

	const peakMomentum = getPeakMomentum(mc)

	const { buys, sells, traderBuys, traderSells, buyErrors, traderBuyErrors } =
		state.volume

	const botBuys = Math.max(0, buys - traderBuys)

	const botSells = Math.max(0, sells - traderSells)

	return {
		mint: state.mint,
		date: state.date,
		time: state.time,

		profit2s,
		profit4s,
		profit6s,
		profit10s,
		profit20s,

		peakProfit,
		maxDrawdown,

		timeTo10,
		timeTo20,
		timeTo50,
		timeToPeak,
		peakIndex,

		earlyMomentum,
		momentum4s,
		momentum10s,
		peakMomentum,

		buys,
		sells,
		traderBuys,
		traderSells,
		botBuys,
		botSells,

		traderRatio: ratio(traderBuys, buys),

		botRatio: ratio(botBuys, buys),

		sellBuyRatio: ratio(sells, buys),

		traderSellBuyRatio: ratio(traderSells, traderBuys),

		buyErrors,
		traderBuyErrors,

		buyErrorRate: ratio(buyErrors, buys),

		traderBuyErrorRate: ratio(traderBuyErrors, traderBuys),

		peakBuysPerSec: getMax(state.volume.buysPerSec),

		peakTraderBuysPerSec: getMax(state.volume.traderBuysPerSec),

		averageBuysPerSec: getAverage(state.volume.buysPerSec),

		averageTraderBuysPerSec: getAverage(state.volume.traderBuysPerSec),

		initialHolders: state.initialHolders,
	}
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getProfitAtIndex(values: number[], index: number): number {
	if (values.length < 2) {
		return 0
	}

	const safeIndex = Math.min(Math.max(index, 1), values.length - 1)

	return getRisePct([values[0], values[safeIndex]])
}

function getValues(values: number[], start: number, end: number): number[] {
	if (values.length <= end) {
		return values
	}

	return [values[start], values[end]]
}

function getPeakIndex(values: number[]): number {
	if (!values.length) {
		return 0
	}

	let index = 0

	for (let i = 1; i < values.length; i++) {
		if (values[i] > values[index]) {
			index = i
		}
	}

	return index
}

function getPeakMomentum(values: number[]): number {
	if (values.length < 2) {
		return 0
	}

	let peak = -Infinity

	for (let i = 1; i < values.length; i++) {
		const momentum = getRisePct([values[i - 1], values[i]])

		if (momentum > peak) {
			peak = momentum
		}
	}

	return peak === -Infinity ? 0 : peak
}

function getMaxDrawdown(values: number[]): number {
	if (values.length < 2) {
		return 0
	}

	let peak = values[0]
	let maxDrawdown = 0

	for (const value of values) {
		if (value > peak) {
			peak = value
		}

		if (peak <= 0) {
			continue
		}

		const drawdown = ((value - peak) / peak) * 100

		if (drawdown < maxDrawdown) {
			maxDrawdown = drawdown
		}
	}

	return maxDrawdown
}

function getTimeToProfit(values: number[], targetPct: number): number | null {
	if (values.length < 2) {
		return null
	}

	const initial = values[0]

	if (!initial) {
		return null
	}

	for (let i = 1; i < values.length; i++) {
		const profit = getRisePct([initial, values[i]])

		if (profit >= targetPct) {
			return i * 2
		}
	}

	return null
}

function ratio(numerator: number, denominator: number): number {
	if (!denominator) {
		return 0
	}

	return numerator / denominator
}

function percentage(numerator: number, denominator: number): number {
	if (!denominator) {
		return 0
	}

	return numerator / denominator
}

function getMax(values: number[]): number {
	if (!values.length) {
		return 0
	}

	return Math.max(...values)
}

function getStdDev(values: number[]): number {
	if (!values.length) {
		return 0
	}

	const average = getAverage(values)

	const variance = getAverage(values.map((value) => (value - average) ** 2))

	return Math.sqrt(variance)
}

function getMedianOrNull(values: number[]): number | null {
	return values.length ? getMedian(values) : null
}

function isNotNull<T>(value: T | null): value is T {
	return value !== null
}
