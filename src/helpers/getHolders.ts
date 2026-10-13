import { TOKEN_PROGRAM_ID, unpackAccount } from '@solana/spl-token'
import { connectionAlt } from '@/config/config'
import { printError } from './printError'
import { withRetry } from './withRetry'
import { PublicKey } from '@solana/web3.js'

export const getHolders = async (
	mintDetails: IMintDetails,
	commitment: 'processed' | 'confirmed' = 'processed',
): Promise<IHolder[]> => {
	const { tokenDecimals, initialTokenAmount, tokenProgram, mint } = mintDetails

	return withRetry(
		async () => {
			const filters: any[] = [
				{
					memcmp: {
						offset: 0,
						bytes: mint,
					},
				},
			]

			if (tokenProgram === TOKEN_PROGRAM_ID.toString()) {
				filters.push({ dataSize: 165 })
			}

			const accounts = await connectionAlt.getProgramAccounts(
				new PublicKey(tokenProgram),
				{
					filters,
					commitment,
				},
			)

			const holders: IHolder[] = []
			const initialTokenAmountUI =
				Number(initialTokenAmount) / Math.pow(10, tokenDecimals!)

			for (const account of accounts) {
				try {
					const parsedAccount = unpackAccount(
						account.pubkey,
						account.account,
						new PublicKey(tokenProgram),
					)

					if (parsedAccount.amount === BigInt(0)) continue

					const uiAmount =
						Number(parsedAccount.amount) / Math.pow(10, tokenDecimals!)
					const percentage = (uiAmount / initialTokenAmountUI) * 100

					holders.push({
						owner: parsedAccount.owner.toBase58(),
						amount: parsedAccount.amount.toString(),
						uiAmount,
						percentage,
					})
				} catch {}
			}

			if (holders.length === 0) {
				return accounts.length > 0 ? holders : []
			}

			holders.sort((a, b) => b.uiAmount - a.uiAmount)
			return holders.slice(1)
		},
		{
			onError: (err: any, attempt: number) => {
				printError(
					`getHolders failed for ${mint} (attempt ${attempt}): ${String(
						err,
					)}`,
				)
			},
		},
	)
}
