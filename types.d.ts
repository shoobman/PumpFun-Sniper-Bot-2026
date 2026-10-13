import { Keypair } from '@solana/web3.js'
import LogVolume from './src/modules/filters/volumeLogger'

declare global {
	type TSwapAction = 'buy' | 'sell'

	type TPlatform = 'pumpfun' | 'pumpswap' | 'launchlab' | 'bags'
	type TPlatformMap<T> = {
		[K in TPlatform]: T
	}

	type TTradingAppStats = Partial<Record<TTradingApp, number>>
	type TTradingApp =
		'axiom' | 'stb' | 'terminal' | 'bullx' | 'gmgm' | 'photon' | 'trojan'

	type TMintType = 'sol' | 'usd1' | 'usdc'

	type TActivityType = 'traders' | 'bots' | 'minted'

	type TLogActionType =
		'mint' | 'migrate' | 'buy' | 'sell' | 'traderBuy' | 'traderSell' | 'other'

	type TSwapFunc = (
		mintDetails: any,
		swapAction: TSwapAction,
		wallet: Keypair,
		buyAmount?: number,
	) => Promise<string | undefined>

	type TEvaluatorFunc = (trade: ITrade) => IEvaluatorResult

	type TObserverFunc = (
		mintDetails: IMintDetails,
		strategy: IStrategy,
	) => Promise<ITradeMetrics | undefined>

	type TMonitorFunc = (
		mintDetails: IMintDetails,
		volume: LogVolume,
		mcPerSec: number[],
	) => Promise<boolean>

	type TDay = 1 | 2 | 3 | 4 | 5 | 6 | 7

	interface ILog {
		readonly mint: string
		readonly signature: string
		readonly action: TLogActionType
		readonly tradingApp: TTradingApp
		readonly meta: 'error'
		readonly fees: number
	}

	interface IEvaluatorConfig {
		readonly holdTime: number
	}

	interface IEvaluatorConfigPeriod<TConfig = unknown> {
		readonly from: number
		readonly to: number
		readonly config: TConfig
		readonly days?: TDay[]
	}

	interface IStrategy {
		readonly observers: TPlatformMap<TObserverFunc>
		readonly evaluators: TPlatformMap<TEvaluatorFunc>
		readonly evaluatorHoldTime: (trade: ITrade) => number
		readonly evaluatorBuyMultiplier: (trade: ITrade) => number
		readonly id: number
		readonly saveMockTrades: boolean
		readonly enabled: boolean
		readonly wallet: Keypair
		readonly buyAmount: number
		readonly live: boolean
		readonly name: string
		readonly testPlatforms: TPlatform[]
		readonly livePlatforms: TPlatform[]
		readonly dynamicExit: boolean
		readonly sellAfter: number
		readonly sellOnImmediatePriceDrop: boolean
		readonly sellOnTopHolderSell: boolean
		readonly sellBuyRatio: number
		readonly sellBuyRatio2: number
		readonly sellBuyRatioTick: number
		readonly stopLoss: number
		readonly stopLossBreakpoints: number[]
		readonly takeProfitBreakpoints: number[]
		readonly takeProfit: number
		readonly trailingStopLoss: boolean
		readonly getFinalMC: boolean
		readonly getFinalHolders: boolean
		readonly tickSpeed: number
		readonly logTradingVolume: boolean
		readonly sellIfNoMovement: boolean
		readonly checkTopHolder: boolean
		readonly checkBuyersData: boolean
		readonly checkSellersData: boolean
		readonly checkDevSolBalance: boolean
		readonly logVolume: boolean
		readonly strategyParams: {
			readonly monitorDelay?: number
			readonly monitorDuration?: number
			readonly window?: number
			readonly lookback?: number
			readonly lookback2?: number
			readonly val?: any
			readonly getMC?: boolean
		}
	}

	type TStrategy<T = {}> = Omit<IStrategy, 'strategyParams'> & {
		readonly strategyParams: IStrategy['strategyParams'] & T
	}

	interface ITradeActivityObject {
		readonly traders: number[]
		readonly bots: number[]
		readonly minted: number[]
	}

	interface ITradeActivity {
		traders: number
		bots: number
		minted: number
	}

	interface IMintDetails {
		data?: any
		data2?: any
		live: boolean
		readonly platform: TPlatform
		readonly mint: string
		readonly mintType: TMintType
		readonly creator: string
		readonly tokenProgram: string
		readonly initialSolBalance: number
		readonly initialTokenAmount: bigint
		readonly initialHolders?: IHolder[]
		finalHolders?: IHolder[]
		readonly tokenDecimals: number
		readonly initialMC: number
		readonly name?: string | undefined
		readonly ticker?: string | undefined
		readonly metadataUri?: string

		// pumpfun
		readonly buyState?: any
		readonly bondingCurve?: string
		readonly isCashback?: boolean
		readonly isMayhem?: boolean

		// bags & launchlab
		readonly curveType?: number
		readonly poolId?: string
		readonly poolInfo?: any
	}

	interface ITradeMetrics {
		data?: any
		data2?: any
		readonly finalHolders: readonly IHolder[]
		readonly mcPerSec: number[]
		readonly buySec: number
		readonly volume: ITradeVolume
		readonly topHolderNew?: boolean
		readonly devSolBalance?: number | undefined
		readonly buyersData: IBuyerData[] | undefined
		readonly sellersData: IBuyerData[] | undefined
		readonly firstTraderWallet?: string
		readonly description?: string | undefined
		readonly socials?: { twitter: string; website: string }
	}

	interface IMonitorBreakpoint {
		breakpoint: number
		profit: number
		sec: number
	}

	interface IMonitorData {
		readonly allTimeHigh: number
		readonly allTimeLow: number
		readonly sellReason: string
		readonly profitSecs: number[]
		readonly stopLossBreakpointProfits: IMonitorBreakpoint[]
		readonly takeProfitBreakpointProfits: IMonitorBreakpoint[]
		readonly tradingVolume?: ITradeVolume
	}

	interface ITrade<TStrategyParams = {}>
		extends ITradeMetrics, IMintDetails, IMonitorData {
		readonly strategy: TStrategy<TStrategyParams>
		readonly mintType: TMintType
		readonly errorSelling: boolean
		readonly minted_time: string
		readonly buy_time: string
		readonly sell_time: string
		readonly buyDelay: number
		readonly sellDelay: number
		readonly initialSolBalance: number
		readonly date?: string
		readonly profit?: number
		readonly allTimeHigh: number
		readonly allTimeLow: number
		readonly sellReason: string
		readonly chartDexscreener: string
		readonly chartTerminal: string
		readonly chartAxiom: string
		readonly activity: ITradeActivity
		readonly blacklisted: boolean
		readonly kols: string[]
		readonly isCashback?: boolean
		readonly isMayhem?: boolean
	}

	interface ITradeVolume {
		buys: number
		sells: number
		traderBuys: number
		traderSells: number
		buyErrors: number
		sellErrors: number
		traderBuyErrors: number
		traderSellErrors: number
		tradingAppBuys: TTradingAppStats
		tradingAppSells: TTradingAppStats
		readonly buyFees: number[]
		readonly traderBuyFees: number[]
		readonly sellFees: number[]
		readonly traderSellFees: number[]
		readonly buysPerSec: number[]
		readonly buyErrorsPerSec: number[]
		readonly sellsPerSec: number[]
		readonly traderBuysPerSec: number[]
		readonly traderErrorsPerSec: number[]
		readonly traderSellsPerSec: number[]
	}

	interface IRegimeState {
		mcPerSec: number[]
		readonly creator: string
		readonly mint: string
		readonly time: string
		readonly date: string
		readonly activity: ITradeActivity
		readonly volume: ITradeVolume
		readonly initialHolders: string[]
	}

	interface IEvaluatorResult {
		readonly passed: boolean
		readonly failedFilters: string[]
	}

	interface IHolder {
		readonly owner: string
		readonly amount: string
		readonly uiAmount: number
		readonly percentage: number
	}

	interface IWallet {
		readonly name: string
		readonly wallet: string
	}

	interface ISwapResponse {
		readonly signature: string
		readonly swapDelay: number
	}

	interface IBuyerData {
		readonly wallet: string
		readonly amountSol: number
	}

	interface ICurveState {
		readonly virtualTokenReserves: bigint
		readonly virtualSolReserves: bigint
		readonly realTokenReserves: bigint
		readonly realSolReserves: bigint
		readonly tokenTotalSupply: bigint
		readonly complete: boolean
	}
}
