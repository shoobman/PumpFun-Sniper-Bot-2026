import { PublicKey } from '@solana/web3.js'
import { connection } from '@/config/config'
import { printError } from './printError'

export async function isWalletNew(
	wallet: string,
	thresholdMinutes = 180,
): Promise<boolean | undefined> {
	try {
		const txs = await connection.getSignaturesForAddress(
			new PublicKey(wallet),
			{ limit: 60 },
			'confirmed',
		)

		const blockTime = txs?.[30]?.blockTime
		if (!blockTime) return true

		const now = Math.floor(Date.now() / 1000)
		const isOlderThanAnHour = now - blockTime > thresholdMinutes * 60

		return isOlderThanAnHour
	} catch (error) {
		printError('Error checking wallet age:', error)
	}
}

export async function getWalletFromSignature(
	signature: string,
): Promise<PublicKey | undefined> {
	try {
		const tx = await connection.getTransaction(signature, {
			commitment: 'confirmed',
			maxSupportedTransactionVersion: 0,
		})

		if (!tx?.meta?.loadedAddresses) return

		const message = tx.transaction.message
		const accountKeys = message.getAccountKeys({
			accountKeysFromLookups: tx.meta.loadedAddresses,
		}).staticAccountKeys

		return accountKeys[0] || undefined
	} catch (error) {
		printError('Error getting wallet from signature', error)
	}
}

export async function isSpoofed(signature: string) {
	let wallet: string | undefined

	try {
		if (signature) {
			wallet = (await getWalletFromSignature(signature))?.toString()
		}
		return {
			spoofed: wallet ? await isWalletNew(wallet.toString()) : false,
			wallet,
		}
	} catch {}

	return { spoofed: false, wallet }
}
