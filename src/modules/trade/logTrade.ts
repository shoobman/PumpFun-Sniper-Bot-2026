import { AXIOM_URL, DEXSCREENER_URL, TERMINAL_URL } from '@/config/constants'
import { getDate } from '@/helpers/mathAndDates'
import { printError } from '@/helpers/printError'
import { saveToFile } from '@/helpers/saveToFile'
import { getTraderNames } from '@/helpers/traderWallets'

export default function logTrade(
	trade: ITrade,
	monitorData: IMonitorData,
	strategy: IStrategy,
	activity: ITradeActivity,
	errorSelling: boolean,
	mintedTime: string,
	profit: number,
	buyTime: string,
	sellTime: string,
	profitSecs: number[],
	buyDelay: number,
	sellDelay: number,
): ITrade | undefined {
	try {
		const { mint, bondingCurve, poolId, finalHolders } = trade

		const loggedTrade: ITrade = {
			profit,
			...trade,
			...monitorData,
			errorSelling,
			minted_time: mintedTime,
			buy_time: buyTime,
			sell_time: sellTime,
			chartDexscreener: `${DEXSCREENER_URL}${mint}?maker=${strategy.wallet.publicKey}`,
			chartTerminal: `${TERMINAL_URL}${mint}`,
			chartAxiom: `${AXIOM_URL}${bondingCurve || poolId}?chain=sol`,
			kols: getTraderNames(finalHolders).map((t) => t.name),
			buyDelay,
			sellDelay,
			profitSecs,
			strategy,
			activity,
		}
		saveToFile(`${getDate()}_trades.json`, loggedTrade)

		return trade
	} catch (err) {
		printError('Error logging trade', err)
	}
}
