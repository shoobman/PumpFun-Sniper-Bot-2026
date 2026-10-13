import { getAverage } from '@/helpers/mathAndDates'

export interface IRegimeMetrics {
	score: number
	currentRate: number
	momentum: number
	zScore: number
	percentile: number
	mean: number
	stdDev: number
	currentSampleCount: number
}

export interface IRegimeConfig {
	baseScore: number
	minSample: number
	zWeight: number
	percentileWeight: number
	momentumWeight: number
	rollingStepMinutes: number
	scoreMin: number
	scoreMax: number
	absoluteDeadFloor: number
	absoluteWeakFloor: number
	weakFloorMaxScore: number
}

export const DEFAULT_REGIME_CONFIG: IRegimeConfig = {
	baseScore: 50,
	minSample: 5,
	zWeight: 20,
	percentileWeight: 0,
	momentumWeight: 50,
	rollingStepMinutes: 5,
	scoreMin: 0,
	scoreMax: 100,
	absoluteDeadFloor: -Infinity,
	absoluteWeakFloor: -Infinity,
	weakFloorMaxScore: 25,
}

export interface IParsedState {
	raw: IRegimeState
	timestamp: number
}

export interface IMintRatioResult {
	relativeRatio: number
	immediateRatio: number
	recentCount: number
	baselineAverage: number
	bucketCounts: [number, number, number, number]
	baselineStdDev: number
	acceleration: number
}

const DEFAULT_MINT_RATIO: IMintRatioResult = {
	relativeRatio: 1,
	immediateRatio: 1,
	recentCount: 0,
	baselineAverage: 0,
	bucketCounts: [0, 0, 0, 0],
	baselineStdDev: 0,
	acceleration: 0,
}

const FALLBACK_METRICS: IRegimeMetrics = {
	score: 0,
	currentRate: 0,
	momentum: 0,
	zScore: 0,
	percentile: 0.5,
	mean: 0,
	stdDev: 0,
	currentSampleCount: 0,
}

export type RegimeEvaluator = (
	state: IRegimeState,
) => number | boolean | null | undefined

// Stat Helpers
const calcMean = (nums: number[]) =>
	nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
const calcStdDev = (nums: number[], mean = calcMean(nums)) =>
	nums.length
		? Math.sqrt(
				nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / nums.length,
			)
		: 0

export class RegimeChecker {
	private states: IParsedState[] = []
	private cache = new Map<string, (number | null)[]>()

	constructor(allRawStates: IRegimeState[]) {
		this.states = allRawStates
			.map((raw) => ({
				raw,
				timestamp:
					(raw as any)._timestamp ??
					RegimeChecker.parseTimestamp(raw.date, raw.time),
			}))
			.sort((a, b) => a.timestamp - b.timestamp)
	}

	public static parseTimestamp(dateStr: string, timeStr: string): number {
		const [y, m, d] = dateStr.split('-').map(Number)
		const [h, min, s] = timeStr.slice(0, 8).split(':').map(Number)
		const ms = timeStr.length > 8 ? Number(timeStr.slice(9)) : 0
		return Date.UTC(y, m - 1, d, h, min, s, ms)
	}

	public addState(newState: IRegimeState): void {
		const timestamp =
			(newState as any)._timestamp ??
			RegimeChecker.parseTimestamp(newState.date, newState.time)
		this.states.push({ raw: newState, timestamp })
		this.cache.clear()
	}

	public get isEmpty(): boolean {
		return this.states.length === 0
	}

	public get rawStates(): IRegimeState[] {
		return this.states.map((s) => s.raw)
	}

	// --- Trade State Lookups ---

	private findIndexAtOrBefore(targetMs: number): number {
		let low = 0,
			high = this.states.length - 1,
			best = -1
		while (low <= high) {
			const mid = (low + high) >> 1
			if (this.states[mid].timestamp <= targetMs) {
				best = mid
				low = mid + 1
			} else {
				high = mid - 1
			}
		}
		return best
	}

	private findStateSlice(
		trade: ITrade,
		filterFn?: (
			tradeMs: number,
			startIndex: number,
			endIndex: number,
		) => number,
	): IRegimeState[] {
		if (!this.states.length) return []
		const tradeMs = RegimeChecker.parseTimestamp(trade.date!, trade.buy_time)
		const endIndex = this.findIndexAtOrBefore(tradeMs)
		if (endIndex === -1) return []

		const startIndex = filterFn ? filterFn(tradeMs, 0, endIndex) : 0
		return this.states.slice(startIndex, endIndex + 1).map((s) => s.raw)
	}

	public getRawStatesForTrade(trade: ITrade): IRegimeState[] {
		return this.findStateSlice(trade)
	}

	public getStatesForTrade(trade: ITrade, count: number): IRegimeState[] {
		return this.findStateSlice(trade, (_, __, endIndex) =>
			Math.max(0, endIndex - count + 1),
		)
	}

	public getLastStatesForTrade(
		trade: ITrade,
		lookbackMinutes: number = 15,
	): IRegimeState[] {
		return this.findStateSlice(trade, (tradeMs, low, high) => {
			const startMs = tradeMs - lookbackMinutes * 60 * 1000
			while (low <= high) {
				const mid = (low + high) >> 1
				if (this.states[mid].timestamp >= startMs) high = mid - 1
				else low = mid + 1
			}
			return low
		})
	}

	public getAverageExtremeSecond(
		trade: ITrade,
		type: 'peak' | 'bottom' = 'peak',
		minBack: number = 15,
	) {
		const states = this.getLastStatesForTrade(trade, minBack)
		const seconds = states
			.map((state) => {
				const values = state.mcPerSec
				if (!values?.length) return null
				return this.getHighestSecond(values, type)
			})
			.filter((value): value is number => value !== null)

		if (!seconds.length) return 0

		return getAverage(seconds)
	}

	public getHighestSecond(values: number[], type: 'peak' | 'bottom' = 'peak') {
		let extremeIndex = 0
		for (let i = 1; i < values.length; i++) {
			if (
				type === 'peak'
					? values[i] > values[extremeIndex]
					: values[i] < values[extremeIndex]
			) {
				extremeIndex = i
			}
		}
		return extremeIndex * 2
	}

	public getAverageRisePct(
		trade: ITrade,
		type: 'peak' | 'bottom' = 'peak',
		minBack: number = 15,
	) {
		const states = this.getLastStatesForTrade(trade, minBack)

		const risePcts = states
			.map((state) => {
				const values = state.mcPerSec

				if (!values?.length || values[0] === 0) return null

				let extreme = values[0]

				for (let i = 1; i < values.length; i++) {
					if (
						type === 'peak' ? values[i] > extreme : values[i] < extreme
					) {
						extreme = values[i]
					}
				}

				return ((extreme - values[0]) / values[0]) * 100
			})
			.filter((value): value is number => value !== null)

		if (!risePcts.length) return 0

		return risePcts.reduce((sum, value) => sum + value, 0) / risePcts.length
	}

	public getMintRatio(trade: ITrade): IMintRatioResult {
		if (!this.states.length) return DEFAULT_MINT_RATIO

		const newestMs = RegimeChecker.parseTimestamp(trade.date!, trade.buy_time)
		const endIndex = this.findIndexAtOrBefore(newestMs)
		if (endIndex === -1) return DEFAULT_MINT_RATIO

		const minMs = newestMs - 60 * 60 * 1000
		const bucketCounts: [number, number, number, number] = [0, 0, 0, 0]

		for (let i = endIndex; i >= 0 && this.states[i].timestamp >= minMs; i--) {
			const minsAgo = (newestMs - this.states[i].timestamp) / 60000
			const bucket = Math.floor(minsAgo / 15)
			if (bucket >= 0 && bucket < 4) bucketCounts[bucket]++
		}

		const [recent, prev, b2, b3] = bucketCounts
		const baselineAverage = (prev + b2 + b3) / 3
		const baselineStdDev = calcStdDev([prev, b2, b3], baselineAverage)

		const calcRatio = (denom: number) =>
			denom === 0
				? recent > 0
					? recent
					: 1
				: Number((recent / denom).toFixed(2))

		return {
			relativeRatio: calcRatio(baselineAverage),
			immediateRatio: calcRatio(prev),
			recentCount: recent,
			baselineAverage: Number(baselineAverage.toFixed(2)),
			bucketCounts,
			baselineStdDev: Number(baselineStdDev.toFixed(2)),
			acceleration: recent - b3,
		}
	}

	private getOrCreateValues(
		key: string,
		evaluator: RegimeEvaluator,
	): (number | null)[] {
		if (!this.cache.has(key)) {
			const values = this.states.map((s) => {
				const val = evaluator(s.raw)
				if (val == null || (typeof val === 'number' && Number.isNaN(val)))
					return null
				return typeof val === 'boolean' ? (val ? 1 : 0) : val
			})
			this.cache.set(key, values)
		}
		return this.cache.get(key)!
	}

	public getMetric(
		trade: ITrade,
		key: string,
		evaluator: RegimeEvaluator,
		sampleSizeMinutes: number = 15,
		lookbackMinutes: number = 240,
		config: Partial<IRegimeConfig> = {},
	): IRegimeMetrics {
		if (!this.states.length) return FALLBACK_METRICS

		const nowMs = RegimeChecker.parseTimestamp(trade.date!, trade.buy_time)
		const endIndex = this.findIndexAtOrBefore(nowMs)
		if (endIndex === -1) return FALLBACK_METRICS

		const cfg = { ...DEFAULT_REGIME_CONFIG, ...config }
		const values = this.getOrCreateValues(key, evaluator)

		const currentWindowMs = sampleSizeMinutes * 60 * 1000
		const currentStart = nowMs - currentWindowMs
		const previousStart = nowMs - currentWindowMs * 2

		let currSum = 0,
			currCount = 0
		let prevSum = 0,
			prevCount = 0

		for (
			let i = endIndex;
			i >= 0 && this.states[i].timestamp >= previousStart;
			i--
		) {
			const ts = this.states[i].timestamp
			const val = values[i]
			if (val == null) continue

			if (ts >= currentStart) {
				currCount++
				currSum += val
			} else {
				prevCount++
				prevSum += val
			}
		}

		if (currCount < cfg.minSample) {
			return { ...FALLBACK_METRICS, currentSampleCount: currCount }
		}

		const currentVal = currSum / currCount
		const previousVal =
			prevCount >= cfg.minSample ? prevSum / prevCount : currentVal
		const momentum = currentVal - previousVal

		// Sliding Window Means
		const baselineStart = nowMs - lookbackMinutes * 60 * 1000
		const stepMs = cfg.rollingStepMinutes * 60 * 1000
		const windowMeans: number[] = []

		let left = 0,
			right = 0,
			runningSum = 0,
			runningCount = 0

		for (
			let wStart = baselineStart;
			wStart <= currentStart;
			wStart += stepMs
		) {
			const wEnd = wStart + currentWindowMs

			while (left <= endIndex && this.states[left].timestamp < wStart) {
				const val = values[left++]
				if (val != null) {
					runningSum -= val
					runningCount--
				}
			}
			while (right <= endIndex && this.states[right].timestamp < wEnd) {
				const val = values[right++]
				if (val != null) {
					runningSum += val
					runningCount++
				}
			}

			if (runningCount >= cfg.minSample) {
				windowMeans.push(runningSum / runningCount)
			}
		}

		if (windowMeans.length < 6) {
			return { ...FALLBACK_METRICS, currentSampleCount: currCount }
		}

		const mean = calcMean(windowMeans)
		const stdDev = calcStdDev(windowMeans, mean)

		const zScore = (currentVal - mean) / Math.max(stdDev, 0.0001)
		const percentile =
			windowMeans.filter((v) => v < currentVal).length / windowMeans.length

		let score =
			cfg.baseScore +
			zScore * cfg.zWeight +
			(percentile - 0.5) * cfg.percentileWeight +
			momentum * cfg.momentumWeight

		if (currentVal < cfg.absoluteDeadFloor) {
			score = cfg.scoreMin
		} else if (currentVal < cfg.absoluteWeakFloor) {
			score = Math.min(score, cfg.weakFloorMaxScore)
		}

		return {
			score: score / 100,
			currentRate: currentVal,
			momentum,
			zScore,
			percentile,
			mean,
			stdDev,
			currentSampleCount: currCount,
		}
	}

	public getPercentile(
		trade: ITrade,
		key: string,
		evaluator: RegimeEvaluator,
		sampleSizeMinutes: number = 15,
		lookbackMinutes: number = 240,
		config: Partial<IRegimeConfig> = {},
	): number {
		return this.getMetric(
			trade,
			key,
			evaluator,
			sampleSizeMinutes,
			lookbackMinutes,
			config,
		).percentile
	}

	public getScore(
		trade: ITrade,
		key: string,
		evaluator: RegimeEvaluator,
		sampleSizeMinutes: number = 15,
		lookbackMinutes: number = 240,
		config: Partial<IRegimeConfig> = {},
	): number {
		return this.getMetric(
			trade,
			key,
			evaluator,
			sampleSizeMinutes,
			lookbackMinutes,
			config,
		).score
	}
}
