import { PublicKey } from '@solana/web3.js'
import { LaunchpadPool } from '@raydium-io/raydium-sdk-v2'
import { connection } from '@/config/config'

export default async function getPoolInfoLaunchlab(mintDetails: IMintDetails) {
	const { poolId } = mintDetails
	try {
		const r = await connection.getAccountInfo(new PublicKey(poolId!), {
			commitment: 'processed',
		})
		const poolInfo = LaunchpadPool.decode(r!.data)
		return { ...poolInfo, poolId }
	} catch (err) {}
}
