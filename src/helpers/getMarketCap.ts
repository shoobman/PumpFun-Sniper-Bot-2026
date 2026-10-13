import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Curve } from '@raydium-io/raydium-sdk-v2'
import { meteoraSdk } from '@/config/config'
import { withRetry } from './withRetry'
import getPoolInfoPumpfun from '@/modules/platforms/pumpfun/getPoolInfoPumpfun'
import getPoolInfoLaunchlab from '@/modules/platforms/launchlab/getPoolInfoLaunchlab'
import { printError } from './printError'

export default async function getMarketCap(
	mintDetails: IMintDetails,
): Promise<number> {
	const { platform } = mintDetails

	if (platform === 'pumpfun') {
		return await getMarketCapPumpfun(mintDetails)
	} else if (platform === 'launchlab') {
		return await getMarketCapLaunchlab(mintDetails)
	} else if (platform === 'bags') {
		return await getMarketCapBags(mintDetails)
	}
	return 0
}

export async function getMarketCapPumpfun(
	mintDetails: IMintDetails,
): Promise<number> {
	try {
		const poolState = await withRetry(() => getPoolInfoPumpfun(mintDetails))
		if (!poolState) return 0

		const isSOL = mintDetails.mintType === 'sol'

		const price =
			(Number(poolState.virtualSolReserves) /
				LAMPORTS_PER_SOL /
				(Number(poolState.virtualTokenReserves) / 10 ** 6)) *
			(isSOL ? 1 : 10)

		return Math.max(parseFloat((price * 1e9).toFixed(4)), 0)
	} catch (err) {
		// printError('get market cap error', mintDetails.mint)
	}
	return 0
}

export async function getMarketCapLaunchlab(
	mintDetails: IMintDetails,
): Promise<number> {
	try {
		const poolInfo = await withRetry(() => getPoolInfoLaunchlab(mintDetails))
		if (!poolInfo) return 0

		const price = Curve.getPrice({
			poolInfo,
			curveType: 0,
			decimalA: poolInfo.mintDecimalsA,
			decimalB: poolInfo.mintDecimalsB,
		}).toNumber()

		return Math.max(parseFloat((price * 1e9).toFixed(4)), 0)
	} catch (err) {
		printError(err as any)
	}
	return 0
}

export async function getMarketCapBags(
	mintDetails: IMintDetails,
): Promise<number> {
	try {
		const poolState = await withRetry(() =>
			meteoraSdk!.state.getPool(mintDetails.poolId!),
		)
		if (!poolState) return 0

		// @ts-ignore
		const price = (Number(poolState.sqrtPrice) / 2 ** 64) ** 2
		const scaled = price * 1e9
		return Math.round(scaled * 1000) / 1000
	} catch (err) {
		printError(err as any)
	}
	return 0
}
