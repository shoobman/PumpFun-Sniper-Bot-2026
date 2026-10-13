import { PublicKey, VersionedTransactionResponse } from '@solana/web3.js'
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import getPoolInfoLaunchlab from './getPoolInfoLaunchlab'
import {
	getPdaLaunchpadPoolId,
	LAUNCHPAD_PROGRAM,
} from '@raydium-io/raydium-sdk-v2'
import getMarketCap from '@/helpers/getMarketCap'

const USD1_MINT = new PublicKey('USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB')

export async function processTokenLaunchlab(
	tx: VersionedTransactionResponse | null,
): Promise<IMintDetails | undefined> {
	try {
		if (!tx?.transaction?.message || !tx.meta) return

		const { staticAccountKeys } = tx.transaction.message
		const [creator, mint] = staticAccountKeys

		const initialTokenAmount = tx.meta?.postTokenBalances
			?.filter((b) => b.uiTokenAmount?.amount)
			.sort((a, b) => {
				const aAmt = BigInt(a.uiTokenAmount.amount)
				const bAmt = BigInt(b.uiTokenAmount.amount)
				return Number(bAmt - aAmt)
			})?.[0]?.uiTokenAmount?.amount

		if (!initialTokenAmount) {
			return
		}

		let poolId = getPdaLaunchpadPoolId(
			LAUNCHPAD_PROGRAM,
			mint,
			USD1_MINT,
		).publicKey

		let mintType: TMintType = 'usd1'
		let poolInfo = await getPoolInfoLaunchlab({
			poolId: poolId.toString(),
		} as IMintDetails)

		if (!poolInfo) {
			poolId = getPdaLaunchpadPoolId(
				LAUNCHPAD_PROGRAM,
				mint,
				NATIVE_MINT,
			).publicKey
			poolInfo = await getPoolInfoLaunchlab({
				poolId: poolId.toString(),
			} as IMintDetails)
			mintType = 'sol'
		}

		if (!poolInfo) return

		const mintDetails: IMintDetails = {
			live: false,
			platform: 'launchlab',
			mint: mint.toString(),
			creator: creator.toString(),
			poolId: poolId.toString(),
			tokenProgram: TOKEN_PROGRAM_ID.toString(),
			mintType,
			curveType: 0,
			tokenDecimals: mintType === 'sol' ? 9 : 6,
			initialSolBalance: getInitialSolUsed(tx),
			initialTokenAmount: BigInt(initialTokenAmount),
			initialMC: 0,
			poolInfo,
		}

		const [initialMC] = await Promise.all([getMarketCap(mintDetails)])

		if (!initialMC) {
			return
		}

		return {
			...mintDetails,
			initialMC,
		}
	} catch (err) {}
}

function getInitialSolUsed(tx: any): number {
	const buyerIndex = 0
	const preBalance = tx.meta.preBalances[buyerIndex]
	const postBalance = tx.meta.postBalances[buyerIndex]
	const fee = tx.meta.fee
	const solUsedLamports = preBalance - postBalance - fee
	return solUsedLamports / 1e9
}
