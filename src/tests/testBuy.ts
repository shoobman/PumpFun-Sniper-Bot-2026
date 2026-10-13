import {
	connection,
	initBagsSdk,
	initLogListener,
	initPumpSdk,
	wallets,
} from '@/config/config'
import tokenListener from '../modules/listeners/tokenListener'
import tradeSwap from '@/modules/trade/swapToken'
import { delay } from '@/helpers/delay'

const PLATFORM: TPlatform = 'pumpfun'
let bought = false

await initLogListener()
await connection.getLatestBlockhash()

if (PLATFORM === 'pumpfun') await initPumpSdk()
else if (PLATFORM === 'bags') await initBagsSdk()

tokenListener(PLATFORM, buyAndSellToken)

async function buyAndSellToken(mintDetails: IMintDetails) {
	if (mintDetails.mintType === 'sol') return
	if (bought) return
	bought = true

	console.log(`\n\nSwapping ${mintDetails.mint}:\n`)

	await delay(1)
	const sig = await tradeSwap(false, mintDetails, 'buy', wallets[1])
	if (sig) await tradeSwap(false, mintDetails, 'sell', wallets[1])
}
