import { Keypair } from '@solana/web3.js'
import { printError } from '@/helpers/printError'
import { withRetry } from '@/helpers/withRetry'
import { swapBags } from '@/modules/platforms/bags/swapTokenBags'
import { swapLaunchLab } from '@/modules/platforms/launchlab/swapTokenLaunchlab'
import { swapPumpfun } from '@/modules/platforms/pumpfun/swapTokenPumpfun'
import {
	BAR,
	BUY_AMOUNT_SOL,
	BUY_RETRIES,
	SELL_RETRIES,
} from '@/config/constants'

export default async function tradeSwap(
	isDev: boolean,
	mintDetails: IMintDetails,
	swapType: TSwapAction,
	wallet: Keypair,
	buyAmountInSol: number = BUY_AMOUNT_SOL,
): Promise<ISwapResponse | undefined> {
	const { mint, platform } = mintDetails
	const maxAttempts = swapType === 'buy' ? BUY_RETRIES : SELL_RETRIES
	let mintSwap: ISwapResponse | undefined

	return withRetry(
		async () => {
			let swapDelay = 0

			if (!isDev) {
				if (platform === 'pumpfun') {
					mintSwap = await swapPumpfun(mintDetails, swapType, wallet)
				} else if (platform === 'launchlab') {
					mintSwap = await swapLaunchLab(mintDetails, swapType, wallet)
				} else if (platform === 'bags') {
					mintSwap = await swapBags(mintDetails, swapType, wallet)
				}

				if (!mintSwap) {
					throw new Error()
				}

				swapDelay = mintSwap.swapDelay

				console.log(
					`${BAR}  \x1b[95m✔️\x1b[37m Swap completed in ${(swapDelay / 1000).toFixed(2)}s\n`,
				)
			}

			return mintSwap || { profit: 0, swapDelay: 0, signature: '' }
		},
		{
			retries: maxAttempts,
			delayMs: 200,
			onError: (err: any, attempt: number) => {
				if (attempt > maxAttempts) {
					printError(`Error ${swapType}ing token: ${mint}, exiting!`, err)
				} else {
					printError(`Error ${swapType}ing, retrying...`)
				}
			},
		},
	).catch(() => {
		return undefined
	})
}
