import { PUMP_PROGRAM_ID as PUMPFUN_PROGRAM } from '@pump-fun/pump-sdk'
import { PUMP_AMM_PROGRAM_ID as PUMPSWAP_PROGRAM } from '@pump-fun/pump-swap-sdk'
import { LAUNCHPAD_PROGRAM as LAUNCHLAB_PROGRAM } from '@raydium-io/raydium-sdk-v2'
import { BAGS_TOKEN_CREATION_AUTHORITY as BAGS_PROGRAM } from '@bagsfm/bags-sdk'
import { processTokenPumpfun } from '@/modules/platforms/pumpfun/processTokenPumpfun'
import { processTokenLaunchlab } from '@/modules/platforms/launchlab/processTokenLaunchlab'
import { processTokenBags } from '@/modules/platforms/bags/processTokenBags'
import { connection, logListener } from '@/config/config'
import { LOG_VOLUME } from '@/config/constants'
import { printError } from '@/helpers/printError'
import { delay } from '@/helpers/delay'

const PLATFORMS = {
	pumpfun: {
		program: PUMPFUN_PROGRAM,
		processFunc: processTokenPumpfun,
	},
	pumpswap: {
		program: PUMPSWAP_PROGRAM,
		processFunc: processTokenPumpfun,
	},
	launchlab: {
		program: LAUNCHLAB_PROGRAM,
		processFunc: processTokenLaunchlab,
	},
	bags: {
		program: BAGS_PROGRAM,
		processFunc: processTokenBags,
	},
}

const seenMints = new Set<string>()
let lastMintTime = 0

export default function tokenListener(
	platform: TPlatform,
	callback: (mintDetails: IMintDetails) => void,
	onBuy?: (type: TActivityType) => void,
) {
	console.log(`\x1b[36m🚀\x1b[37m Initialized ${platform} token listener`)

	logListener!.onLogs(PLATFORMS[platform].program, (log: ILog) => {
		if (log.action === 'mint') {
			processToken(log.signature)
		} else if (onBuy && platform === 'pumpfun' && LOG_VOLUME) {
			if (log.action === 'traderBuy' && log.tradingApp === 'terminal')
				onBuy('traders')
			if (log.action === 'buy') onBuy('bots')
		}
	})

	async function processToken(signature: string) {
		try {
			const now = Date.now()
			if (now - lastMintTime < 100) {
				return
			}
			lastMintTime = now

			for (let i = 0; i < 10; i++) {
				let v = 0
				try {
					const tx = await connection!.getTransaction(signature, {
						commitment: 'confirmed',
						maxSupportedTransactionVersion: v,
					})

					if (tx) {
						const parsedMint = await PLATFORMS[platform].processFunc(tx)
						if (
							parsedMint?.mint &&
							!seenMints.has(parsedMint.mint.toString())
						) {
							seenMints.add(parsedMint.mint.toString())
							callback(parsedMint)
						}
						return
					}
				} catch (err) {
					if (v === 1) v = 2
					else v = 1

					// console.log(JSON.stringify(err, null, 2)
				}
				if (v === 2) return
				await delay(0.25)
			}
		} catch (err) {
			printError(`Error parsing token for ${signature}`)
		}
	}
}
