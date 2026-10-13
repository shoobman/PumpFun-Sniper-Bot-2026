import { PublicKey } from '@solana/web3.js'
import { getHolders } from '@/helpers/getHolders'
import getMarketCap from '@/helpers/getMarketCap'
import { delay } from '@/helpers/delay'

interface IPumpDevCreate {
	signature: string
	mint: string
	traderPublicKey: string
	txType: 'create'
	name: string
	symbol: string
	uri: string
	initialBuy: number
	initialQuoteAmount: number
	quoteAmountRaw: number
	bondingCurveKey: string
	vTokensInBondingCurve: number
	vQuoteInBondingCurve: number
	tokenProgram: string
	isMayhemMode: boolean
	isCashbackEnabled: boolean
	quoteMint: string
	quoteTokenDecimals: number
	quoteAmount: number
	marketCapQuote: number
	vSolInBondingCurve: number
	solAmount: number
	marketCapSol: number
}

export async function processTokenPumpfun2(
	data: IPumpDevCreate,
): Promise<IMintDetails | undefined> {
	if (!data || data.txType !== 'create') {
		return
	}

	try {
		const mintDetails: IMintDetails = {
			live: false,
			platform: 'pumpfun',
			mint: data.mint,
			creator: data.traderPublicKey,
			poolId: data.bondingCurveKey,
			tokenProgram: data.tokenProgram,
			mintType: 'sol',
			tokenDecimals: 6,
			initialSolBalance: data.solAmount,
			initialTokenAmount: BigInt(Math.floor(data.initialBuy * 1e6)),
			initialMC: data.marketCapSol,
			bondingCurve: data.bondingCurveKey,
		}

		let i = 0
		let passed = false

		let initialMC = 0

		await delay(0.25)
		while (i < 1) {
			// console.log(mintDetails)
			const [initialMCz] = await Promise.all([getMarketCap(mintDetails)])
			if (initialMCz) {
				passed = true
				initialMC = initialMCz
				break
			}
			await delay(0.25)
			i += 1
		}

		if (!passed) return
		// console.log(initialHolders)

		return {
			...mintDetails,
			initialMC,
		}
	} catch (err) {
		console.error(`processTokenPumpDev failed for ${data.mint}:`, err)
	}
}
