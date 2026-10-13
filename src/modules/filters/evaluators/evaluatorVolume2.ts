import { IS_SERVER } from '@/config/constants'
import { getEvaluatorConfig } from '@/modules/filters/getEvaluatorConfig'
import { evaluatorWrapper } from '../evaluatorWrapper'
import { getCreatorStats } from '@/helpers/getCreatorStats'
import { getRisePct } from '@/helpers/mathAndDates'

export const config = {
	holdTime: 20,
	maxTraderBuysInBlock: 5,
}

export const configHourly: IEvaluatorConfigPeriod<Partial<typeof config>>[] =
	!IS_SERVER
		? [
				{
					from: 0,
					to: 24,
					days: [1, 2, 3, 4, 5, 6, 7],
					config: {},
				},
			]
		: [
				{
					from: 0,
					to: 24,
					days: [1, 2, 3, 4, 5, 6, 7],
					config: {},
				},
			]

export const configHold = (trade: ITrade): number => {
	const cfg = getEvaluatorConfig(trade, config, configHourly)
	return cfg?.holdTime || config.holdTime
}

export const configBuyMultiplier = (_trade: ITrade): number => {
	return 1
}

const evaluatorVolume2: TEvaluatorFunc = (trade: ITrade) =>
	evaluatorWrapper(trade, {
		filters: ({ mcPerSec, mintType, volume: {} }) => {
			const cfg = getEvaluatorConfig(trade, config, configHourly)
			if (!cfg || mintType !== 'sol') return false
			const creatorData = getCreatorStats(trade)
			const risePct = getRisePct(mcPerSec)

			return !!(
				mcPerSec.at(-1)! > 60 &&
				creatorData.numTokens > 0 &&
				trade.finalHolders.length >= 20 &&
				trade.mcPerSec.at(-3) !== trade.mcPerSec.at(-1)
			)
		},
	})

export default evaluatorVolume2
