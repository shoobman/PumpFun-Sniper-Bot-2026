import { BINANCE_ENDPOINT } from '@/config/constants'
import { COLORS } from '@/helpers/text'

interface IPriceChange {
	usd: number
	pct: number
}

export interface IPriceChanges {
	change24h: IPriceChange
	change12h: IPriceChange
	change2h: IPriceChange
	price: number
}

export async function getPumpPriceChanges(onlyHour = false) {
	const changes: IPriceChanges = {} as IPriceChanges

	try {
		if (!onlyHour) {
			const k12hUrl = `${BINANCE_ENDPOINT}PUMPUSDT&interval=12h&limit=3`
			const k12hRes = await fetch(k12hUrl)
			const k12hData = await k12hRes.json()
			if (!Array.isArray(k12hData) || k12hData.length < 3)
				throw new Error('Invalid 12h kline data')

			const closes12h = k12hData.map((c: any) => parseFloat(c[4]))

			changes.change24h = {
				usd: closes12h[2] - closes12h[0],
				pct: ((closes12h[2] - closes12h[0]) / closes12h[0]) * 100,
			}

			changes.change12h = {
				usd: closes12h[2] - closes12h[1],
				pct: ((closes12h[2] - closes12h[1]) / closes12h[1]) * 100,
			}
		}

		const k2hUrl = `${BINANCE_ENDPOINT}PUMPUSDT&interval=30m&limit=5`
		const k2hRes = await fetch(k2hUrl)
		const k2hData = await k2hRes.json()
		if (!Array.isArray(k2hData) || k2hData.length < 5)
			throw new Error('Invalid 30m kline data')

		const closes30m = k2hData.map((c: any) => parseFloat(c[4]))

		changes.change2h = {
			usd: closes30m[4] - closes30m[0],
			pct: ((closes30m[4] - closes30m[0]) / closes30m[0]) * 100,
		}

		changes.price = k2hData[0][1]

		return changes
	} catch (err) {
		console.error('Error fetching Binance data:', err)
		return null
	}
}

export function printSentiment(
	swing: number,
	label: string,
	solanaPriceMovement: number,
) {
	if (solanaPriceMovement < -swing) {
		return COLORS.red(label)
	} else if (solanaPriceMovement > swing) {
		return COLORS.green(label)
	}
	return COLORS.gray(label)
}
