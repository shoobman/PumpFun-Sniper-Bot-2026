import {
	getBuyTokenAmountFromSolAmount,
	getSellSolAmountFromTokenAmount,
} from '@pump-fun/pump-sdk'
import {
	ComputeBudgetProgram,
	Keypair,
	LAMPORTS_PER_SOL,
	PublicKey,
	Transaction,
} from '@solana/web3.js'
import {
	connectionAlt,
	pumpFeeConfig,
	pumpGlobal,
	pumpOnlineSdk,
	pumpSDK,
} from '@/config/config'
import {
	BUY_AMOUNT_SOL,
	BUY_AMOUNT_USD,
	BUY_SLIPPAGE,
	SELL_SLIPPAGE,
	SWAP_FEE_LAMPORTS,
	USDC_MINT,
} from '@/config/constants'
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	createCloseAccountInstruction,
	getAssociatedTokenAddress,
	NATIVE_MINT,
} from '@solana/spl-token'
import { BN } from 'bn.js'
import { printError } from '@/helpers/printError'
import { getAmountInWallet } from '../../../../_unused/getAmountInWallet'
import { sendTransaction } from '@/helpers/sendTransaction'

export const swapPumpfun: TSwapFunc = async (
	mintDetails: IMintDetails,
	action: TSwapAction,
	wallet: Keypair,
) => {
	const {
		mint: mintStr,
		tokenProgram: tokenProgramStr,
		mintType,
	} = mintDetails
	const isSOL = mintType === 'sol'
	const mint = new PublicKey(mintStr)
	const tokenProgram = new PublicKey(tokenProgramStr)
	const tx = new Transaction()
	const walletKey = wallet.publicKey
	tx.feePayer = walletKey

	try {
		if (action === 'buy') {
			const [state, latestBlockHash] = await Promise.all([
				pumpOnlineSdk.fetchBuyState(mint, walletKey),
				connectionAlt.getLatestBlockhash(),
			])

			const {
				bondingCurveAccountInfo,
				bondingCurve,
				associatedUserAccountInfo,
			} = state

			const amountToBuy = isSOL
				? BUY_AMOUNT_SOL * LAMPORTS_PER_SOL
				: BUY_AMOUNT_USD * 1_000_000
			const buyAmount = new BN(amountToBuy)

			const amount = getBuyTokenAmountFromSolAmount({
				global: pumpGlobal,
				bondingCurve,
				amount: buyAmount,
				feeConfig: pumpFeeConfig,
				quoteMint: isSOL ? NATIVE_MINT : USDC_MINT,
				mintSupply: bondingCurve.tokenTotalSupply,
			})

			const instructions = await pumpSDK.buyInstructions({
				global: pumpGlobal,
				bondingCurveAccountInfo,
				bondingCurve,
				associatedUserAccountInfo,
				mint,
				user: walletKey,
				solAmount: buyAmount,
				tokenProgram,
				amount,
				slippage: BUY_SLIPPAGE,
			})

			tx.recentBlockhash = latestBlockHash.blockhash
			tx.add(
				ComputeBudgetProgram.setComputeUnitPrice({
					microLamports: SWAP_FEE_LAMPORTS,
				}),
				...instructions,
			)
		}

		if (action === 'sell') {
			const [tokenAccount, state, latestBlockHash] = await Promise.all([
				getAssociatedTokenAddress(
					mint,
					walletKey,
					true,
					tokenProgram,
					ASSOCIATED_TOKEN_PROGRAM_ID,
				),
				pumpOnlineSdk.fetchSellState(mint, walletKey, tokenProgram),
				connectionAlt.getLatestBlockhash(),
			])

			const [tokenAmountInWallet] = await Promise.all([
				getAmountInWallet(wallet, mint, tokenAccount),
			])

			const { bondingCurveAccountInfo, bondingCurve } = state
			const { isMayhemMode } = bondingCurve

			const solAmount = getSellSolAmountFromTokenAmount({
				global: pumpGlobal,
				bondingCurve,
				amount: new BN(tokenAmountInWallet),
				feeConfig: pumpFeeConfig,
				mintSupply: bondingCurve.tokenTotalSupply,
			})

			const instructions = await pumpSDK.sellInstructions({
				global: pumpGlobal,
				bondingCurve,
				bondingCurveAccountInfo,
				mint,
				user: walletKey,
				amount: new BN(tokenAmountInWallet),
				tokenProgram,
				mayhemMode: isMayhemMode,
				solAmount,
				slippage: SELL_SLIPPAGE,
				cashback: mintDetails.isCashback,
			})

			tx.recentBlockhash = latestBlockHash.blockhash
			tx.add(
				ComputeBudgetProgram.setComputeUnitPrice({
					microLamports: SWAP_FEE_LAMPORTS,
				}),
				...instructions,
				createCloseAccountInstruction(
					tokenAccount,
					walletKey,
					walletKey,
					[],
					tokenProgram,
				),
			)
		}

		const signature = await sendTransaction(tx, wallet)
		if (!signature) throw new Error('Transaction failed')

		return signature
	} catch (err) {
		printError(`Swap (${action}) Error:`, err)
	}
}
