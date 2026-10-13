import { BAR, DIVIDER_SHORTER, PRINT_UNTRADED } from '@/config/constants'
import logTrade from './logTrade'
import { FEES_PCT } from '@/config/constants'
import { getTime } from '@/helpers/mathAndDates'
import { printError } from '@/helpers/printError'
import { delay } from '@/helpers/delay'
import getMarketCap from '@/helpers/getMarketCap'
import { getTradeProfit } from '../../../_unused/getTradeProfit'
import tradeMonitor from './tradeMonitor'
import tradeSwap from './swapToken'
import { bold } from '@/helpers/text'
import state from '@/config/state'

export default async function tradeToken(
	trade: ITrade,
	onKill: (trade: ITrade | undefined) => any,
) {
	const { liveTraders } = state
	const { mint, live, strategy } = trade
	let loggedTrade: ITrade | undefined
	let errorSelling = false

	try {
		if ((!liveTraders.size && PRINT_UNTRADED) || live) {
			console.log(
				`${BAR}\n` +
					`\x1b[95m└${DIVIDER_SHORTER}\n \n` +
					`\x1b[33m B \x1b[36m${getTime(true)} - ${live ? '\x1b[92mLIVE\x1b[36m' : 'MOCK'} - Buying token ${mint.slice(0, 5)}\x1b[37m\n` +
					`   ${bold('Strategy:')} ${strategy.name}\n \n` +
					`\x1b[95m┌${DIVIDER_SHORTER}\n` +
					`${BAR}`,
			)
		}

		const [buySwap, { time: buyTime, mc: entryMC }] = await Promise.all([
			tradeSwap(!live, trade, 'buy', strategy.wallet, strategy.buyAmount),
			setSwapMCAndTime(trade, !live),
		])
		if (!buySwap) return

		const monitorData = await tradeMonitor(
			strategy,
			trade,
			strategy.sellAfter / 5,
			entryMC,
			!live,
		)

		const [sellSwap, { time: sellTime, mc: finalMC }] = await Promise.all([
			tradeSwap(!live, trade, 'sell', strategy.wallet),
			setSwapMCAndTime(trade, !live),
		])
		if (!sellSwap) errorSelling = true
		const profit = await getTradeProfit(trade, entryMC, finalMC)

		if ((!liveTraders.size && PRINT_UNTRADED) || live) {
			console.log(
				`${BAR}\n` +
					`\x1b[95m└${DIVIDER_SHORTER}\n \n` +
					`\x1b[92m S \x1b[36m${getTime(true)} - ${live ? '\x1b[92mLIVE\x1b[36m' : 'MOCK'} - Sold token ${mint.slice(0, 5)} - Profit: ${(profit - FEES_PCT).toFixed(2)}%\x1b[37m\n` +
					`   ${bold('Sell reason:')} ${monitorData.sellReason}\n` +
					`   ${bold('Strategy:')} ${strategy.name}\n \n` +
					`\x1b[95m┌${DIVIDER_SHORTER}\n` +
					`${BAR}`,
			)
		}

		const { profitSecs } = monitorData
		profitSecs.push(profit)
		while (profitSecs.length < strategy.sellAfter / 5) {
			profitSecs.push(profit)
		}

		loggedTrade = logTrade(
			trade,
			monitorData,
			strategy,
			trade.activity,

			errorSelling,
			trade.minted_time,
			profit,
			buyTime,
			sellTime,
			profitSecs,
			buySwap.swapDelay / 1000,
			(sellSwap?.swapDelay || 0) / 1000,
		)
	} catch (err) {
		printError(`Error trading ${mint}`, err)
	} finally {
		onKill(loggedTrade)
	}
}

async function setSwapMCAndTime(mintDetails: IMintDetails, isDev: boolean) {
	if (mintDetails.platform === 'bags' && isDev) await delay(0.6)
	await delay(0.4)

	const time = getTime()
	const mc = await getMarketCap(mintDetails)

	if (isDev) await delay(0.2)
	return { time, mc }
}
