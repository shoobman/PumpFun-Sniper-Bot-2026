import initBot from './initBot'
import tradeToken from './modules/trade/tradeToken'
import { strategies } from './config/strategies'
import { getDate, getTime } from './helpers/mathAndDates'
import { printError } from './helpers/printError'
import state from './config/state'
import {
	BAR,
	COLLECT_MOCK_TRADES,
	PRINT_UNTRADED,
	TERMINAL_URL,
} from './config/constants'
import regimeObserver from './modules/regime/regimeObserver'

const { allTraders, liveTraders, tradeData } = state
const activityLog: ITradeActivityObject = {
	traders: [],
	bots: [],
	minted: [],
}

init()

async function init() {
	await initBot(onMint, logActivity)
}

function onMint(mintDetails: IMintDetails) {
	const { mint, platform } = mintDetails

	const activity = getActivity()
	regimeObserver(mintDetails, activity)
	logActivity('minted')

	if (!liveTraders.size && PRINT_UNTRADED) {
		console.log(
			`${BAR}  \x1b[37m${getTime(true)} \x1b[90m` +
				`\x1b[36mMINT: \x1b[90m\x1b]8;;${TERMINAL_URL}${mint}\x1b\\` +
				`${mint}` +
				`\x1b]8;;\x1b\\` +
				`\x1b[0m`,
		)
	}

	for (const strategy of strategies) {
		if (!strategy.enabled) continue

		const supportsPlatform =
			strategy.testPlatforms.includes(platform) ||
			strategy.livePlatforms.includes(platform)

		if (!supportsPlatform) continue

		monitorToken(mintDetails, strategy, activity)
	}
}

async function monitorToken(
	mintDetails: IMintDetails,
	strategy: IStrategy,
	activity: ITradeActivity,
) {
	try {
		const { mint, platform } = mintDetails
		const mintedTime = getTime()
		const metrics = await strategy.observers[platform](mintDetails, strategy)

		if (!metrics) return

		const trade: ITrade = {
			...metrics,
			...mintDetails,
			minted_time: mintedTime,
			strategy,
			activity,
			buy_time: getTime(),
			date: getDate(),
		} as ITrade

		const { passed } = strategy.evaluators[platform](trade)
		const shouldSave = COLLECT_MOCK_TRADES || strategy.saveMockTrades

		if (!shouldSave && !passed) return

		const isLive =
			!state.isDev &&
			passed &&
			strategy.live &&
			strategy.livePlatforms.includes(trade.platform)

		trade.live = isLive

		const traderName = `${mint}_${strategy.id}`

		allTraders.add(traderName)
		if (isLive) liveTraders.add(traderName)

		const killTrade = (finalTrade?: ITrade) => {
			if (finalTrade) tradeData.push(finalTrade)
			allTraders.delete(traderName)
			if (isLive) liveTraders.delete(traderName)
		}

		tradeToken(trade, (trade: ITrade | undefined) => killTrade(trade))
	} catch (err) {
		printError('Error monitoring token at root', err)
	}
}

function logActivity(type: TActivityType) {
	const now = Date.now()
	activityLog[type].push(now)
}

function getActivity(seconds = 60) {
	const cutoff = Date.now() - seconds * 1000

	const result: ITradeActivity = {
		traders: 0,
		bots: 0,
		minted: 0,
	}

	for (const type of ['traders', 'bots', 'minted'] as const) {
		const arr = activityLog[type]
		const firstValid = arr.findIndex((t) => t >= cutoff)

		if (firstValid > 0) arr.splice(0, firstValid)

		result[type] = arr.length
	}

	return result
}
