import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey, VersionedTransactionResponse } from '@solana/web3.js'
import { getHolders } from '@/helpers/getHolders'
import getMarketCap from '@/helpers/getMarketCap'

export async function processTokenBags(
	tx: VersionedTransactionResponse | null,
): Promise<IMintDetails | undefined> {
	if (!tx || !tx?.meta || tx?.meta?.err) {
		return
	}

	try {
		const { staticAccountKeys: keys } = tx.transaction.message
		const [creator, mint, _, poolId] = keys

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

		const mintDetails: IMintDetails = {
			live: false,
			platform: 'bags',
			mint: mint.toString(),
			creator: creator.toString(),
			poolId: poolId.toString(),
			tokenProgram: TOKEN_PROGRAM_ID.toString(),
			mintType: 'sol',
			tokenDecimals: 9,
			initialSolBalance: getInitialSolUsed(tx),
			initialTokenAmount: BigInt(initialTokenAmount),
			initialMC: 0,
		}

		const [initialHolders, initialMC] = await Promise.all([
			getHolders(mintDetails),
			getMarketCap(mintDetails),
		])

		if (!initialHolders || !initialMC) {
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
