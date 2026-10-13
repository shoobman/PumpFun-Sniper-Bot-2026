import { wallets } from './config'
import evaluatorVolume2, {
	configBuyMultiplier,
	configHold,
} from '@/modules/filters/evaluators/evaluatorVolume2'
import observerWallet from '@/modules/filters/observers/observerWallet'

export const strategies: IStrategy[] = [
	<TStrategy>{
		id: 0,
		saveMockTrades: true,
		name: 'test strategy',
		enabled: true,
		live: false,
		buyAmount: 0.025,
		wallet: wallets[1],
		testPlatforms: ['pumpfun'],
		livePlatforms: ['pumpfun'],
		dynamicExit: false,
		sellAfter: 20,
		sellBuyRatio: 0,
		sellBuyRatio2: 0,
		sellOnTopHolderSell: false,
		sellOnImmediatePriceDrop: false,
		takeProfit: 60,
		stopLoss: 40,
		stopLossBreakpoints: [20, 30],
		takeProfitBreakpoints: [20, 40, 50],
		trailingStopLoss: true,
		tickSpeed: 1,
		checkTopHolder: false,
		checkDevSolBalance: false,
		logTradingVolume: false,
		checkBuyersData: false,
		checkSellersData: false,
		getFinalMC: true,
		getFinalHolders: true,
		logVolume: false,
		//
		strategyParams: {
			monitorDelay: 0.4,
			monitorDuration: 30,
			lookback: 4,
			window: 5,
			getMC: false,
		},
		observers: {
			pumpfun: observerWallet,
			launchlab: observerWallet,
			bags: observerWallet,
		},
		evaluators: {
			pumpfun: evaluatorVolume2,
			launchlab: evaluatorVolume2,
			bags: evaluatorVolume2,
		},
		evaluatorHoldTime: configHold,
		evaluatorBuyMultiplier: configBuyMultiplier,
	},
]
