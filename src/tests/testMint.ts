import { initBagsSdk, initLogListener, initPumpSdk } from '@/config/config'
import tokenListener from '../modules/listeners/tokenListener'
import { timer } from '@/helpers/timer'
import getMarketCap from '@/helpers/getMarketCap'

const PLATFORM: TPlatform = 'pumpfun'

await initLogListener()

if (PLATFORM === 'pumpfun') {
	await initPumpSdk()
} else if (PLATFORM === 'bags') {
	await initBagsSdk()
}

tokenListener(PLATFORM, onMint)

async function onMint(mintDetails: IMintDetails) {
	timer(async () => {
		await getMarketCap(mintDetails)
	})
}
