import { NATIVE_MINT } from '@solana/spl-token'
import { bagsSdk, connection } from '@/config/config'
import { getAmountInWallet } from '../../../../_unused/getAmountInWallet'
import { signAndSendTransaction } from '@bagsfm/bags-sdk'
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { BUY_AMOUNT_SOL, BUY_SLIPPAGE, SELL_SLIPPAGE } from '@/config/constants'
import { printError } from '@/helpers/printError'

export const swapBags: TSwapFunc = async (
	mintDetails: IMintDetails,
	action: TSwapAction,
	wallet: Keypair,
	buyAmount: number = BUY_AMOUNT_SOL,
) => {
	try {
		const startSwap = Date.now()
		const { mint: mintStr } = mintDetails
		const isBuy = action === 'buy'
		const mint = new PublicKey(mintStr)
		let amount

		if (!isBuy) {
			amount = Number(await getAmountInWallet(wallet, mint))
		} else {
			amount = buyAmount * LAMPORTS_PER_SOL
		}

		const quote = await bagsSdk!.trade.getQuote({
			inputMint: isBuy ? NATIVE_MINT : mint,
			outputMint: isBuy ? mint : NATIVE_MINT,
			amount,
			slippageMode: 'manual',
			slippageBps: (isBuy ? BUY_SLIPPAGE : SELL_SLIPPAGE) * 100,
		})

		const tx = await bagsSdk!.trade.createSwapTransaction({
			quoteResponse: quote,
			userPublicKey: wallet.publicKey,
		})

		tx.transaction

		const signature = await signAndSendTransaction(
			// @ts-ignore
			connection,
			'processed',
			tx.transaction,
			wallet,
		)
		if (!signature) throw new Error('Transaction failed')

		const swapDelay = Date.now() - startSwap
		return { signature, swapDelay }
	} catch (err) {
		printError(`Swap (${action}) Error:`, err)
	}
}
