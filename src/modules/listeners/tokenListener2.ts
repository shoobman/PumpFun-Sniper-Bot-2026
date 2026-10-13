import { printError } from '@/helpers/printError'
import { processTokenPumpfun2 } from '../platforms/pumpfun/processTokenPumpfun2'

const PUMPDEV_WS = 'wss://pumpdev.io/ws'

const seenMints = new Set<string>()

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

export default function tokenListener2(
	platform: TPlatform,
	callback: (mintDetails: IMintDetails) => void,
	onBuy?: (type: TActivityType) => void,
) {
	if (platform !== 'pumpfun') {
		throw new Error(
			`PumpDev token listener only supports pumpfun, received: ${platform}`,
		)
	}

	connect()

	function connect() {
		try {
			ws = new WebSocket(PUMPDEV_WS)

			ws.onopen = () => {
				ws!.send(
					JSON.stringify({
						method: 'subscribeNewToken',
					}),
				)

				console.log(
					`\x1b[36m🚀\x1b[37m Initialized PumpDev ${platform} token listener`,
				)
			}

			ws.onmessage = async (event) => {
				try {
					const data =
						typeof event.data === 'string'
							? JSON.parse(event.data)
							: event.data

					if (!data || data.txType !== 'create' || !data.mint) {
						return
					}

					if (seenMints.has(data.mint)) {
						return
					}

					seenMints.add(data.mint)

					const parsedMint = await processTokenPumpfun2(data)
					if (parsedMint?.mint) {
						callback(parsedMint)
					}
				} catch (err) {
					printError(`Error processing PumpDev token: ${String(err)}`)
				}
			}

			ws.onerror = (err) => {
				printError(`PumpDev WebSocket error: ${String(err)}`)
			}

			ws.onclose = () => {
				console.log('\x1b[33m⚠\x1b[37m PumpDev WebSocket disconnected')

				scheduleReconnect()
			}
		} catch (err) {
			printError(`Failed to connect to PumpDev: ${String(err)}`)
			scheduleReconnect()
		}
	}

	function scheduleReconnect() {
		if (reconnectTimer) {
			return
		}

		reconnectTimer = setTimeout(() => {
			reconnectTimer = null
			connect()
		}, 1000)
	}
}
