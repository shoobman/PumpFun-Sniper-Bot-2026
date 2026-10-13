import { DateTime } from 'luxon'
import {
	BAR,
	BLOCK_SEC,
	FEES_PCT,
	IS_LIVE,
	TICK_INTERVAL,
} from '@/config/constants'
import { printError } from '@/helpers/printError'
import { delay } from '@/helpers/delay'
import { getTradeProfit } from '../../../_unused/getTradeProfit'
import LogVolume from '@/modules/filters/volumeLogger'
import { logListener } from '@/config/config'
import { countFilled } from '@/helpers/mathAndDates'

export default async function tradeMonitor(
	strategy: IStrategy,
	trade: ITrade,
	profitCheckpointsNum: number,
	initialMC: number,
	isDev: boolean,
): Promise<IMonitorData> {
	const { mint } = trade

	const {
		tickSpeed,
		trailingStopLoss,
		stopLoss,
		sellAfter,
		takeProfit,
		sellIfNoMovement,
		sellOnImmediatePriceDrop,
		sellBuyRatio,
		sellBuyRatio2,
	} = strategy

	const profits: number[] = []

	const triggeredTakeProfitBreakpoints: number[] = []
	const takeProfitBreakpointProfits: IMonitorBreakpoint[] = []

	const triggeredStopLossBreakpoints: number[] = []
	const stopLossBreakpointProfits: IMonitorBreakpoint[] = []

	const profitCheckpoints = generateProfitCheckpoints(profitCheckpointsNum)
	const profitSecs: number[] = []

	const tradingVolume = new LogVolume()

	let aborted = false
	let allTimeHigh = 0
	let allTimeLow = 0
	let recentProfits: { time: number; profit: number }[] = []

	let listenerId = undefined
	let listenerInterval = undefined

	let holdTime =
		IS_LIVE && strategy.live && strategy.evaluatorHoldTime
			? strategy.evaluatorHoldTime(trade)
			: sellAfter

	let resolveVolumeSell!: () => void

	const volumeSellPromise = new Promise<void>((resolve) => {
		resolveVolumeSell = resolve
	})

	if (sellBuyRatio) {
		listenerId = logListener!.onLogs(mint, (log) => {
			tradingVolume.log(log)
		})

		listenerInterval = setInterval(() => {
			try {
				tradingVolume.pushTick()

				const { traderBuysPerSec, traderSellsPerSec } = tradingVolume

				if (
					traderBuysPerSec.length >= sellBuyRatio &&
					!countFilled(traderBuysPerSec.slice(-sellBuyRatio)) &&
					countFilled(traderSellsPerSec.slice(-sellBuyRatio)) >=
						sellBuyRatio2
				) {
					aborted = true
					resolveVolumeSell()
				}
			} catch {
				printError('Error processing trading volume')
			}
		}, BLOCK_SEC * 1000)
	}

	const runPriceMonitor = async (): Promise<string | undefined> => {
		const startTime = DateTime.now()

		let currentStopLoss = -stopLoss
		let profit = 0
		let hasPriceMovedInitially = false
		let tick = 0

		while (!aborted) {
			tick += 1

			try {
				const now = DateTime.now()

				const currentSec = Math.floor(
					now.diff(startTime, 'seconds').seconds,
				)

				if (
					now >=
					startTime.plus({
						seconds: holdTime,
					})
				) {
					return `${holdTime} seconds passed`
				}

				profit = await getTradeProfit(trade, initialMC)

				profits.push(profit)

				const nowMs = Date.now()

				recentProfits.push({
					time: nowMs,
					profit,
				})

				recentProfits = recentProfits.filter((p) => nowMs - p.time <= 20000)

				if (!isDev) {
					console.log(
						`${BAR}  ${
							isDev ? '\x1b[36m●' : '\x1b[92m●'
						} \x1b[90m${mint.slice(
							0,
							5,
						)}\x1b[37m ${currentSec}\t\x1b[90m${
							!isDev
								? profit - FEES_PCT > 0
									? '\x1b[92m'
									: '\x1b[31m'
								: ''
						}${(profit - FEES_PCT).toFixed(
							2,
						)}%\t\x1b[37m  ${strategy.name}`,
					)
				}

				for (const [i, checkpoint] of profitCheckpoints.entries()) {
					if (currentSec >= checkpoint && profitSecs.length === i) {
						profitSecs.push(profit)
					}
				}

				if (profit > allTimeHigh) {
					allTimeHigh = profit

					if (trailingStopLoss) {
						currentStopLoss = profit - stopLoss
					}
				} else if (profit < allTimeLow) {
					allTimeLow = profit
				}

				if (!hasPriceMovedInitially && Math.abs(profit) > 2) {
					hasPriceMovedInitially = true
				}

				if (strategy.stopLossBreakpoints?.length) {
					for (const breakpoint of strategy.stopLossBreakpoints) {
						const alreadyTriggered =
							triggeredStopLossBreakpoints.includes(breakpoint)

						if (!alreadyTriggered && profit >= breakpoint) {
							triggeredStopLossBreakpoints.push(breakpoint)

							stopLossBreakpointProfits.push({
								breakpoint,
								profit,
								sec: currentSec,
							})
						}
					}
				}

				if (strategy.takeProfitBreakpoints?.length) {
					for (const breakpoint of strategy.takeProfitBreakpoints) {
						const alreadyTriggered =
							triggeredTakeProfitBreakpoints.includes(breakpoint)

						if (!alreadyTriggered && profit >= breakpoint) {
							triggeredTakeProfitBreakpoints.push(breakpoint)

							takeProfitBreakpointProfits.push({
								breakpoint,
								profit,
								sec: currentSec,
							})
						}
					}
				}

				if (
					sellOnImmediatePriceDrop &&
					profitSecs.length === 1 &&
					profitSecs[0] < 0
				) {
					return 'Price dropped quickly'
				}

				if (profits.at(-1)! >= 300) {
					return 'About to graduate'
				}

				if (
					profits.length >= 6 &&
					profits.at(-1) === profits[profits.length - 5]
				) {
					return 'No price movement'
				}

				if (
					sellIfNoMovement &&
					currentSec >= 20 &&
					recentProfits.length > 1
				) {
					const recentProfitValues = recentProfits.map((p) => p.profit)

					const range =
						Math.max(...recentProfitValues) -
						Math.min(...recentProfitValues)

					if (range <= 2) {
						return 'No movement from start (≤2% in 10s)'
					}
				}

				if (profit <= currentStopLoss) {
					return 'Dropped under stop loss'
				}

				if (profit >= takeProfit) {
					return 'Reached take profit'
				}

				await delay(isDev ? tickSpeed : TICK_INTERVAL)
			} catch {
				printError('Error fetching trade info')
			}
		}
	}

	try {
		const result = await Promise.race([
			runPriceMonitor().then((reason) => ({
				reason,
				source: 'monitor' as const,
			})),

			volumeSellPromise.then(() => ({
				reason: 'Buy volume dropped',
				source: 'volume' as const,
			})),
		])

		return {
			allTimeHigh,
			allTimeLow,
			sellReason: result.reason || '',
			profitSecs,
			stopLossBreakpointProfits,
			takeProfitBreakpointProfits,
			tradingVolume: listenerId ? tradingVolume.getObject() : undefined,
		}
	} catch {
		printError(`Error monitoring ${mint}`)

		return {
			allTimeHigh,
			allTimeLow,
			sellReason: 'Error in trade',
			profitSecs,
			stopLossBreakpointProfits,
			takeProfitBreakpointProfits,
			tradingVolume: listenerId ? tradingVolume.getObject() : undefined,
		}
	} finally {
		if (listenerId) {
			logListener!.removeListener(listenerId)
		}

		if (listenerInterval) {
			clearInterval(listenerInterval)
		}
	}
}

function generateProfitCheckpoints(maxCheckpoints: number) {
	const checkpoints: number[] = []

	for (let i = 1; i <= maxCheckpoints; i++) {
		checkpoints.push(i * 5)
	}

	return checkpoints
}
