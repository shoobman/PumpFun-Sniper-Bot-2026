import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import getMarketCap from '@/helpers/getMarketCap'
import { PUMP_PROGRAM_ID } from '@pump-fun/pump-sdk'
import { getTokenNameAndTicker } from '@/helpers/getMetadata'
import { pumpOnlineSdk, wallets } from '@/config/config'
import {
	LAMPORTS_PER_SOL,
	PublicKey,
	VersionedTransactionResponse,
} from '@solana/web3.js'
import { getHolders } from '@/helpers/getHolders'

export async function processTokenPumpfun(
	tx: VersionedTransactionResponse | null,
): Promise<IMintDetails | undefined> {
	if (!tx || !tx?.meta || tx?.meta?.err) {
		return
	}

	try {
		const { staticAccountKeys: keys } = tx.transaction.message
		const legacy = keys.some(
			(key) => key.toString() === TOKEN_PROGRAM_ID.toString(),
		)
		const tokenProgram = legacy ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID
		const [creator, mint] = keys
		const [bondingCurve] = PublicKey.findProgramAddressSync(
			[Buffer.from('bonding-curve'), mint.toBuffer()],
			PUMP_PROGRAM_ID,
		)
		const tokenNameAndTicker = getTokenNameAndTicker(
			tx.meta.logMessages!,
		) ?? { name: '', ticker: '' }

		const tokenAccounts = {
			mint: mint.toString(),
			creator: creator.toString(),
			bondingCurve: bondingCurve.toString(),
			tokenProgram: tokenProgram.toString(),
			...tokenNameAndTicker,
		}

		let bondingCurveIndex = -1

		const accounts = tx.transaction.message.getAccountKeys({
			accountKeysFromLookups: tx.meta?.loadedAddresses,
		})

		for (let i = 0; i < accounts.length; i++) {
			if (accounts.get(i)?.equals(bondingCurve)) {
				bondingCurveIndex = i
				break
			}
		}

		if (bondingCurveIndex === -1) {
			return
		}

		const beforeSolBalance = tx.meta.preBalances[bondingCurveIndex]
		const afterSolBalance = tx.meta.postBalances[bondingCurveIndex]

		if (afterSolBalance <= beforeSolBalance) {
			return
		}

		const solBalanceChange = afterSolBalance - beforeSolBalance

		let beforeTokenBalance: number = 0
		if (tx.meta.preTokenBalances) {
			const preBalance = tx.meta.preTokenBalances.find((balance: any) =>
				new PublicKey(balance.mint).equals(mint),
			)
			beforeTokenBalance =
				!!preBalance && preBalance.uiTokenAmount.uiAmount
					? preBalance.uiTokenAmount.uiAmount
					: 0
		}

		if (!tx.meta.postTokenBalances) {
			return
		}

		let tokenDecimals = tx.meta.postTokenBalances.find((balance: any) =>
			new PublicKey(balance.mint).equals(mint),
		)?.uiTokenAmount.decimals
		if (!tokenDecimals) {
			tokenDecimals = 0
		}

		const afterTokenBalance = tx.meta.postTokenBalances.find((balance: any) =>
			new PublicKey(balance.mint).equals(mint),
		)?.uiTokenAmount.uiAmount

		if (!afterTokenBalance) {
			return
		}

		const tokenBalanceChange = afterTokenBalance - beforeTokenBalance

		if (
			afterTokenBalance <= beforeTokenBalance ||
			tokenBalanceChange < 1 / LAMPORTS_PER_SOL
		) {
			return
		}

		const mintDetails: IMintDetails = {
			live: false,
			platform: 'pumpfun',
			...tokenAccounts,
			tokenDecimals,
			mintType: 'sol',
			initialSolBalance: solBalanceChange / LAMPORTS_PER_SOL,
			initialTokenAmount: BigInt(
				Math.floor(tokenBalanceChange * 10 ** tokenDecimals),
			),
			initialMC: 0,
			isCashback: false,
			isMayhem: false,
			buyState: undefined,
		}

		const [initialHolders, initialMC, buyState] = await Promise.all([
			[], //getHolders(mintDetails),
			getMarketCap(mintDetails),
			pumpOnlineSdk.fetchBuyState(mint, wallets[0].publicKey),
		])

		const { quoteMint, isMayhemMode, isCashbackCoin } = buyState.bondingCurve
		const mintType: TMintType =
			quoteMint.toString() === '11111111111111111111111111111111'
				? 'sol'
				: 'usdc'

		if (!initialMC || isMayhemMode) {
			return
		}

		return {
			...mintDetails,
			mintType,
			initialHolders,
			initialMC: mintType === 'usdc' ? initialMC * 10 : initialMC,
			buyState,
			isMayhem: isMayhemMode,
			isCashback: isCashbackCoin,
		}
	} catch (err) {}
}
