import {
	Keypair,
	sendAndConfirmTransaction,
	Transaction,
} from '@solana/web3.js'
import { connectionAlt } from '@/config/config'
import { printError } from './printError'

export async function sendTransaction(
	transaction: Transaction,
	wallet: Keypair,
): Promise<string> {
	try {
		transaction.sign(wallet)

		const signature = await sendAndConfirmTransaction(
			connectionAlt,
			transaction,
			[wallet],
			{
				skipPreflight: true,
				commitment: 'processed',
			},
		)

		return signature
	} catch (error) {
		printError('Error sending transaction, most likely slippage', error)
	}
	return ''
}
