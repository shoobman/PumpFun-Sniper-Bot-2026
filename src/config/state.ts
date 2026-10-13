import loadTrades, { loadStates } from '@/helpers/loadTrades'
import { IS_LIVE, IS_SERVER } from './constants'

const state = {
	tradeData: [
		...((await loadTrades(true, 2)) as ITrade[]),
		...((await loadTrades(true, 1)) as ITrade[]),
		...((await loadTrades(true, 0)) as ITrade[]),
	],
	regimeStates: <IRegimeState[]>[],
	allTraders: new Set<string>(),
	liveTraders: new Set<string>(),
	isDev: !IS_LIVE,
}

export async function getRegimeState(local = true, onlyLast = false) {
	state.regimeStates = [
		...(IS_SERVER ? [] : ((await loadStates(local, 5)) as IRegimeState[])),
		...(IS_SERVER ? [] : ((await loadStates(local, 4)) as IRegimeState[])),
		...(IS_SERVER ? [] : ((await loadStates(local, 3)) as IRegimeState[])),
		...(IS_SERVER ? [] : ((await loadStates(local, 2)) as IRegimeState[])),
		// ...(IS_SERVER ? [] : ((await loadStates(local, 1)) as IRegimeState[])),
		// ...(IS_SERVER ? [] : ((await loadStates(local, 1)) as IRegimeState[])),
		// ...(IS_SERVER ? [] : ((await loadStates(local, 1)) as IRegimeState[])),
		// ...(IS_SERVER ? [] : ((await loadStates(local, 1)) as IRegimeState[])),
		// ...((await loadStates(onlyLast ? false : local, 1)) as IRegimeState[]),
		...((await loadStates(onlyLast, 1)) as IRegimeState[]),
		...((await loadStates(onlyLast ? false : local, 0)) as IRegimeState[]),
	]
}

await getRegimeState()

export default state
