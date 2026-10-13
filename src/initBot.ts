import {
	connection,
	connectionAlt,
	initBagsSdk,
	initLogListener,
	initPumpSdk,
	logListener,
} from './config/config'
import {
	BUY_AMOUNT_SOL,
	BUY_AMOUNT_USD,
	SELL_RETRIES,
	SWAP_FEE_LAMPORTS,
	BUY_SLIPPAGE,
	SELL_SLIPPAGE,
	LOG_DIR,
	PRINT_UNTRADED,
	BUY_RETRIES,
	LOG_VOLUME,
	DIVIDER_SHORT,
	IS_LIVE,
	RESTART_EVERY_X_MIN,
	PLATFORMS,
	DIVIDER_SHORTER,
	BAR,
} from './config/constants'
import state from './config/state'
import { strategies } from './config/strategies'
import { delay } from './helpers/delay'
import { bold } from './helpers/text'
import tokenListener from './modules/listeners/tokenListener'
import tokenListener2 from './modules/listeners/tokenListener2'

const { allTraders } = state
let lastMintTimestamp: number = Date.now()

export default async function initBot(
	onMint: (mintDetails: IMintDetails) => void,
	onActivity: (type: TActivityType) => void,
) {
	console.log('1')
	initLogListener()
	console.log('2')
	await printSplash()
	console.log('3')

	const platforms = PLATFORMS.split(',') as TPlatform[]
	if (platforms.includes('pumpfun')) await initPumpSdk()
	if (platforms.includes('bags')) await initBagsSdk()
	// if (platforms.includes('launchlab')) await createWsolAta()

	for (const platform of platforms) {
		tokenListener2(
			platform,
			(mintDetails: IMintDetails) => {
				lastMintTimestamp = Date.now()
				onMint(mintDetails)
			},
			onActivity,
		)
	}

	if (RESTART_EVERY_X_MIN > 0) {
		setTimeout(async () => {
			while (allTraders.size > 0) await delay(0.01)
			process.exit()
		}, RESTART_EVERY_X_MIN * 60_000)
	}

	setInterval(() => {
		if (getSecondsSinceLastMint() > 60 && !allTraders.size) {
			lastMintTimestamp = Date.now()
			logListener?.restart()
		}
	}, 1_000)

	if (IS_LIVE) {
		setInterval(() => {
			connectionAlt.getLatestBlockhash()
		}, 60_000)
	}

	console.log(` \n\x1b[95m┌${DIVIDER_SHORTER}\n${BAR}`)
}

async function printSplash() {
	console.log('\n '.repeat(50))
	console.log(
		'\x1b[36m   ________  ________  ________  ________  ________  ________',
	)
	console.log(
		'\x1b[36m  /        \\/        \\/  /  /  \\/        \\/        \\/  /  /  \\',
	)
	console.log(
		'\x1b[36m /    .    /    .    /         /    .    /    .    /         /',
	)
	console.log(
		'\x1b[36m/       __/        _/         /       __/        _/         /',
	)
	console.log(
		'\x1b[36m\\______/  \\________/\\________/\\______/  \\________/\\________/\n ',
	)

	console.log(DIVIDER_SHORT)
	console.log('\x1b[36mPEWPEW - version 10.0 - ▄︻デ══━一')
	console.log(`${DIVIDER_SHORT}\n `)

	console.log(`\x1b[36m⚙️ \x1b[95m${bold('Bot settings')}\x1b[37m\n `)
	console.log(`Log directory:\t\t\x1b[90m${LOG_DIR}\x1b[37m`)
	console.log(`Log volume:\t\t\x1b[90m${LOG_VOLUME}\x1b[37m`)
	console.log(`Print untraded:\t\t\x1b[90m${PRINT_UNTRADED}\x1b[37m`)
	console.log(`Restart every:\t\t\x1b[90m${RESTART_EVERY_X_MIN} min\x1b[37m`)

	console.log(` \n\x1b[36m🤝 \x1b[95m${bold('Swaps')}\x1b[37m\n `)
	console.log(
		`Buy amount:\t\t\x1b[90m${BUY_AMOUNT_SOL} SOL / ${BUY_AMOUNT_USD} USD1\x1b[37m`,
	)
	console.log(`Swap fee:\t\t\x1b[90m${SWAP_FEE_LAMPORTS} lamports\x1b[37m`)
	console.log(`Retries:\t\t\x1b[90m${BUY_RETRIES} / ${SELL_RETRIES}\x1b[37m`)
	console.log(
		`Slippage:\t\t\x1b[90m${BUY_SLIPPAGE}% / ${SELL_SLIPPAGE}%\x1b[37m`,
	)

	console.log(`\x1b[95m\n${DIVIDER_SHORT}\x1b[37m\n `)
	strategies
		.filter((strat) => strat.enabled)
		.forEach((strat) => printStrategy(strat))
	console.log(`\x1b[95m${DIVIDER_SHORT}\x1b[37m\n `)
	console.log('\x1b[36mInitializing bot:\x1b[37m\n ')
	await printNetworkCheck()
	console.log(
		`🗃️ Loaded back-data for ${state.tradeData.length} trades and ${state.regimeStates.length} states`,
	)
}

function printStrategy(strat: IStrategy) {
	console.log(
		`\x1b[36m📈 ${strat.name.toLocaleUpperCase()}\x1b[37m${strat.live && IS_LIVE ? '\x1b[92m (LIVE)\x1b[37m' : ''}`,
	)
	console.log(
		`\x1b[90mTP: ${strat.takeProfit}% - SL: ${strat.stopLoss}% - SA: ${strat.sellAfter} sec - MONITOR: ${strat.strategyParams.monitorDuration || '-'}/${strat.strategyParams.monitorDelay || '-'}\n `,
	)
}

export async function printNetworkCheck() {
	await connection.getLatestBlockhash()
	const start = Date.now()
	await connection.getLatestBlockhash()
	console.log(`\x1b[36m🌎 \x1b[37mRPC latency: ${Date.now() - start}ms`)
}

export function getSecondsSinceLastMint(): number {
	if (!lastMintTimestamp) return 0
	return (Date.now() - lastMintTimestamp) / 1000
}
