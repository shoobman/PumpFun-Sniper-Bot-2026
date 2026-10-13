import { delay } from '@/helpers/delay'
import { observerWrapper } from '../observerWrapper'
import getMarketCap from '@/helpers/getMarketCap'

const observerWallet: TObserverFunc = (
	mintDetails: IMintDetails,
	strategy: TStrategy,
): Promise<ITradeMetrics | undefined> => {
	return observerWrapper(
		mintDetails,
		strategy,
		['monitorDelay', 'monitorDuration', 'lookback'],
		async (_mintDetails, volume, mcPerSec) => {
			const params = strategy.strategyParams as Required<
				typeof strategy.strategyParams
			>

			await delay(10)
			const mc = await getMarketCap(_mintDetails)
			mcPerSec.push(mc)

			if (mcPerSec.at(-1)! > mcPerSec[0]) {
				await delay(2)
				const mc = await getMarketCap(_mintDetails)
				mcPerSec.push(mc)
				return true
			}

			return false
		},
	)
}

export default observerWallet
