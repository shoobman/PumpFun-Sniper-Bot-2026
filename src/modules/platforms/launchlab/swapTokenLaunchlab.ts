import {
	ComputeBudgetProgram,
	PublicKey,
	SystemProgram,
	TransactionInstruction,
	Transaction,
	LAMPORTS_PER_SOL,
	Keypair,
} from '@solana/web3.js'
import {
	getAssociatedTokenAddressSync,
	TOKEN_PROGRAM_ID,
	createAssociatedTokenAccountInstruction,
	createCloseAccountInstruction,
} from '@solana/spl-token'
import { connection } from '@/config/config'
import {
	BUY_AMOUNT_SOL,
	BUY_AMOUNT_USD,
	SWAP_FEE_LAMPORTS,
} from '@/config/constants'
import {
	anchorDataBuf,
	AUTH_SEED,
	getPdaCreatorVault,
	getPdaPlatformVault,
	LAUNCHPAD_PROGRAM,
	struct,
	u64,
} from '@raydium-io/raydium-sdk-v2'
import { BN } from 'bn.js'
import { getAmountInWallet } from '../../../../_unused/getAmountInWallet'
import { sendTransaction } from '@/helpers/sendTransaction'
import { printError } from '@/helpers/printError'

export const swapLaunchLab: TSwapFunc = async (
	mintDetails: IMintDetails,
	action: TSwapAction,
	wallet: Keypair,
) => {
	const walletKey = wallet.publicKey

	try {
		const startSwap = Date.now()
		const { poolInfo, mintType } = mintDetails
		const {
			creator,
			mintA,
			mintB,
			platformId,
			poolId,
			configId,
			vaultA,
			vaultB,
		} = poolInfo

		const userBaseAta = getAssociatedTokenAddressSync(
			new PublicKey(mintA),
			walletKey,
		)
		const userQuoteAta = getAssociatedTokenAddressSync(
			new PublicKey(mintB),
			walletKey,
		)
		const platformFeeVault = getPdaPlatformVault(
			LAUNCHPAD_PROGRAM,
			new PublicKey(platformId),
			new PublicKey(mintB),
		).publicKey
		const creatorFeeVault = getPdaCreatorVault(
			LAUNCHPAD_PROGRAM,
			new PublicKey(creator),
			new PublicKey(mintB),
		).publicKey
		const [authority] = PublicKey.findProgramAddressSync(
			[AUTH_SEED],
			LAUNCHPAD_PROGRAM,
		)
		const [eventAuth] = PublicKey.findProgramAddressSync(
			[Buffer.from('__event_authority')],
			LAUNCHPAD_PROGRAM,
		)

		let data: Buffer
		let discriminator: Uint8Array

		if (action === 'buy') {
			const dataLayout = struct([
				u64('amountB'),
				u64('minAmountA'),
				u64('shareFeeRate'),
			])
			const isSOL = mintType === 'sol'
			const uiAmount = isSOL ? BUY_AMOUNT_SOL : BUY_AMOUNT_USD
			discriminator = anchorDataBuf.buyExactIn
			data = Buffer.alloc(dataLayout.span)
			dataLayout.encode(
				{
					amountB: new BN(
						Math.round(uiAmount * (isSOL ? LAMPORTS_PER_SOL : 1_000_000)),
					),
					minAmountA: new BN(0),
					shareFeeRate: new BN(0),
				},
				data,
			)
		} else {
			const [tokenAmountInWallet] = await Promise.all([
				getAmountInWallet(wallet, mintA),
			])

			const dataLayout = struct([
				u64('amountA'),
				u64('minAmountB'),
				u64('shareFeeRate'),
			])
			discriminator = anchorDataBuf.sellExactIn
			data = Buffer.alloc(dataLayout.span)
			dataLayout.encode(
				{
					amountA: new BN(tokenAmountInWallet),
					minAmountB: new BN(0),
					shareFeeRate: new BN(0),
				},
				data,
			)
		}

		const keys = [
			{ pubkey: walletKey, isSigner: true, isWritable: true },
			{ pubkey: authority, isSigner: false, isWritable: false },
			{ pubkey: configId, isSigner: false, isWritable: false },
			{ pubkey: platformId, isSigner: false, isWritable: false },
			{ pubkey: poolId, isSigner: false, isWritable: true },
			{ pubkey: userBaseAta, isSigner: false, isWritable: true },
			{ pubkey: userQuoteAta, isSigner: false, isWritable: true },
			{ pubkey: vaultA, isSigner: false, isWritable: true },
			{ pubkey: vaultB, isSigner: false, isWritable: true },
			{ pubkey: mintA, isSigner: false, isWritable: false },
			{ pubkey: mintB, isSigner: false, isWritable: false },
			{ pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
			{ pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
			{ pubkey: eventAuth, isSigner: false, isWritable: false },
			{ pubkey: LAUNCHPAD_PROGRAM, isSigner: false, isWritable: false },
			{
				pubkey: SystemProgram.programId,
				isSigner: false,
				isWritable: false,
			},
			{ pubkey: platformFeeVault, isSigner: false, isWritable: true },
			{ pubkey: creatorFeeVault, isSigner: false, isWritable: true },
		]

		const instructions: TransactionInstruction[] = [
			ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 }),
			ComputeBudgetProgram.setComputeUnitPrice({
				microLamports: SWAP_FEE_LAMPORTS,
			}),
		]
		if (action === 'buy') {
			instructions.push(
				createAssociatedTokenAccountInstruction(
					walletKey,
					userBaseAta,
					walletKey,
					new PublicKey(mintA),
				),
			)
		}
		instructions.push(
			new TransactionInstruction({
				keys,
				programId: LAUNCHPAD_PROGRAM,
				data: Buffer.from([...discriminator, ...data]),
			}),
		)
		if (action === 'sell') {
			instructions.push(
				createCloseAccountInstruction(userBaseAta, walletKey, walletKey),
			)
		}

		const transaction = new Transaction().add(...instructions)
		const latestBlockhash = await connection.getLatestBlockhash()
		transaction.recentBlockhash = latestBlockhash.blockhash
		transaction.feePayer = walletKey

		const signature = await sendTransaction(transaction, wallet)
		if (!signature) throw new Error()

		const swapDelay = Date.now() - startSwap
		return { signature, swapDelay }
	} catch (err) {
		printError(`Swap (${action}) Error:`, err)
	}
}
