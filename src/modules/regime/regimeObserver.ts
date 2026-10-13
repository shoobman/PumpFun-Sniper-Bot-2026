import { logListener, regime } from '@/config/config'
import { delay } from '@/helpers/delay'
import getMarketCap from '@/helpers/getMarketCap'
import LogVolume from '@/modules/filters/volumeLogger'
import { getDate, getTime } from '@/helpers/mathAndDates'
import state from '@/config/state'
import { saveToFile } from '@/helpers/saveToFile'
import { getHolders } from '@/helpers/getHolders'

export default async function regimeObserver(
	mintDetails: IMintDetails,
	activity: ITradeActivity,
) {
	const volume = new LogVolume()
	const { initialMC, initialHolders } = mintDetails
	let tickInterval = undefined
	// let listenerId: number | null = logListener!.onLogs(
	// 	mintDetails.mint,
	// 	(log) => volume.log(log),
	// )

	const mcPerSec = [initialMC]

	try {
		tickInterval = setInterval(() => volume.pushTick(), 1000)
		let initialHolders: IHolder[] = []

		for (let i = 0; i < 10; i += 1) {
			await delay(2)
			if (i === 0) {
				initialHolders = await getHolders(mintDetails)
			}
			const mc = await getMarketCap(mintDetails)
			mcPerSec.push(mc)
		}

		const newState: IRegimeState = {
			creator: mintDetails.creator,
			mint: mintDetails.mint,
			time: getTime(),
			date: getDate(),
			initialHolders: initialHolders!.map((h) => h.owner),
			mcPerSec,
			activity,
			volume: volume.getObject(),
		}

		regime.addState(newState)
		saveToFile(`states/${getDate()}_state.json`, newState)
	} finally {
		if (tickInterval) clearInterval(tickInterval)
		// if (listenerId !== null) {
		// 	logListener!.removeListener(listenerId)
		// }
	}
}
