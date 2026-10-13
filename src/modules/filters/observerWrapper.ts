import { printError } from '@/helpers/printError'
import LogVolume from '@/modules/filters/volumeLogger'
import getMarketCap from '@/helpers/getMarketCap'
import { getHolders } from '@/helpers/getHolders'
import { logListener } from '@/config/config'
import { isWalletNew } from '@/helpers/wallet'
import { getSignaturesData } from '../../../_unused/getSwapAmounts'
import { PublicKey } from '@solana/web3.js'
import { getSolBalance } from '../../../_unused/getSolBalance'

export async function observerWrapper(
	mintDetails: IMintDetails,
	strategy: IStrategy,
	requiredParams: string[],
	runMonitor: TMonitorFunc,
): Promise<ITradeMetrics | undefined> {
	const { mint, initialMC } = mintDetails
	const {
		getFinalMC,
		getFinalHolders,
		checkBuyersData,
		checkSellersData,
		checkTopHolder,
		checkDevSolBalance,
		logVolume,
	} = strategy
	const params = strategy.strategyParams || {}
	const volume = new LogVolume()
	const startTime = Date.now()
	const mcPerSec = [initialMC]
	let listenerId: number | null = null

	if (
		requiredParams.some(
			(key) => params[key as keyof typeof params] === undefined,
		)
	) {
		printError(`Observer missing params: ${mint}`)
		return
	}

	try {
		if (logVolume) {
			listenerId = logListener!.onLogs(mint, (log) => volume.log(log))
		}

		const [passed, metadata] = await Promise.all([
			runMonitor(mintDetails, volume, mcPerSec),
			{} as any,
		])
		if (!passed) return

		let finalHolders: IHolder[] = []
		let topHolderNew = undefined
		let buyersData = undefined
		let sellersData = undefined
		let devSolBalance = undefined

		if (getFinalHolders || getFinalMC) {
			const [holders, finalMC] = await Promise.all([
				getFinalHolders ? getHolders(mintDetails) : [],
				getFinalMC ? getMarketCap(mintDetails) : null,
			])
			if (finalMC) mcPerSec.push(finalMC)
			if (holders) finalHolders = holders
		} else {
			if (mintDetails.finalHolders) {
				finalHolders = { ...mintDetails.finalHolders }
				delete mintDetails.finalHolders
			}
		}

		if (checkTopHolder || checkBuyersData || checkDevSolBalance) {
			const topHolder = finalHolders.filter(
				(h) => h.owner !== mintDetails.creator,
			)[0].owner

			const [
				walletNew,
				recentBuyersData,
				recentSellersData,
				creatorSolBalance,
			] = await Promise.all([
				checkTopHolder ? await isWalletNew(topHolder) : undefined,
				checkBuyersData
					? await getSignaturesData(volume.traderBuySignatures)
					: undefined,
				checkSellersData
					? await getSignaturesData(volume.traderSellSignatures)
					: undefined,
				checkDevSolBalance
					? getSolBalance(new PublicKey(mintDetails.creator))
					: undefined,
				,
			])
			devSolBalance = creatorSolBalance
			topHolderNew = walletNew
			buyersData = recentBuyersData
			sellersData = recentSellersData
		}

		return {
			volume: volume.getObject(),
			buySec: (Date.now() - startTime) / 1000,
			finalHolders: finalHolders || mintDetails.finalHolders,
			mcPerSec,
			topHolderNew,
			devSolBalance,
			description: metadata?.description,
			buyersData,
			sellersData,
			socials: {
				twitter: metadata?.twitter,
				website: metadata?.website,
			},
		}
	} catch (err) {
		printError(`Error observing ${mint}`, err)
	} finally {
		if (listenerId !== null) {
			logListener!.removeListener(listenerId)
		}
	}
}
