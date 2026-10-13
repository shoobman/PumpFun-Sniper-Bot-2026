import { DateTime } from 'luxon'

export function getSum(arr: readonly number[]): number {
	if (!arr?.length) return 0
	return arr.reduce((acc, i) => {
		if (!i || i === Infinity || isNaN(i)) {
			i = 0
		}
		return acc + (i || 0)
	}, 0)
}

export function getHalf(arr: readonly any[]): any[] {
	return arr.slice(0, arr.length / 2)
}

export function getAverage(values: number[]): number {
	return getSum(values) / values.length
}

export function getMedian(values: number[]): number {
	const n = values.length
	const sorted = [...values].sort((a, b) => a - b)
	const mid = Math.floor(n / 2)

	if (n % 2 !== 0) {
		return sorted[mid]
	}
	return (sorted[mid - 1] + sorted[mid]) / 2
}

export function hasDulicates(arr: any[]) {
	return [...new Set(arr)].length !== arr.length
}

export function countFilled(arr: number[]) {
	return arr.filter(Boolean).length
}

export function getConsistencyScore(values: number[]): number {
	const positions = values
		.map((value, index) => (value !== 0 ? index : -1))
		.filter((index) => index !== -1)

	if (positions.length < 3) {
		return 1
	}
	const gaps = positions.slice(1).map((position, i) => position - positions[i])
	const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
	const variance =
		gaps.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / gaps.length

	const stdDev = Math.sqrt(variance)
	const cv = stdDev / mean

	return 1 / (1 + cv)
}

export function getTrendQuality(values: number[]): number {
	if (values.length < 2) return 0
	const n = values.length

	let sumX = 0,
		sumY = 0,
		sumXY = 0,
		sumXX = 0
	for (let i = 0; i < n; i++) {
		sumX += i
		sumY += values[i]
		sumXY += i * values[i]
		sumXX += i * i
	}

	const denominator = n * sumXX - sumX * sumX
	if (denominator === 0) return 0

	const slope = (n * sumXY - sumX * sumY) / denominator
	const intercept = (sumY - slope * sumX) / n

	const mean = sumY / n
	let ssTot = 0,
		ssRes = 0

	for (let i = 0; i < n; i++) {
		const predicted = intercept + slope * i
		ssRes += (values[i] - predicted) ** 2
		ssTot += (values[i] - mean) ** 2
	}

	if (ssTot === 0) return 1 // Flat line
	const r2 = 1 - ssRes / ssTot

	// Penalize downward trends even if they are clean linear drops
	return slope > 0 ? Math.max(0, r2) : 0
}

export function getUpwardVolatilityRatio(values: number[]): number {
	if (values.length < 2) return 0

	let upwardVariance = 0
	let downwardVariance = 0

	for (let i = 1; i < values.length; i++) {
		const diff = values[i] - values[i - 1]
		if (diff > 0) upwardVariance += diff ** 2
		else downwardVariance += diff ** 2
	}

	const totalDev = Math.sqrt(upwardVariance) + Math.sqrt(downwardVariance)
	if (totalDev === 0) return 0.5

	return Math.sqrt(upwardVariance) / totalDev
}

export function getPathEfficiency(values: number[]): number {
	if (values.length < 2) return 0

	const netTravel = values[values.length - 1] - values[0]
	let totalPath = 0

	for (let i = 1; i < values.length; i++) {
		totalPath += Math.abs(values[i] - values[i - 1])
	}

	if (totalPath === 0) return 0

	// Returns negative efficiency if net direction is downward
	return netTravel / totalPath
}

export function getVolatility(values: number[]): number {
	if (values.length < 2) return 0

	const n = values.length

	let sumX = 0
	let sumY = 0
	let sumXY = 0
	let sumXX = 0

	for (let i = 0; i < n; i++) {
		sumX += i
		sumY += values[i]
		sumXY += i * values[i]
		sumXX += i * i
	}

	const denominator = n * sumXX - sumX * sumX
	if (denominator === 0) return 0

	const slope = (n * sumXY - sumX * sumY) / denominator
	const intercept = (sumY - slope * sumX) / n
	let squaredError = 0

	for (let i = 0; i < n; i++) {
		const predicted = intercept + slope * i
		const error = values[i] - predicted
		squaredError += error * error
	}

	const residual = Math.sqrt(squaredError / n)
	const mean = values.reduce((a, b) => a + b, 0) / values.length

	return mean === 0 ? 0 : residual / mean
}

export function calculateVariance(
	data: number[],
	asPercentage: boolean = false,
	isSample: boolean = true,
): number {
	const mean = data.reduce((sum, val) => sum + val, 0) / data.length

	const squaredDifferencesSum = data.reduce((sum, val) => {
		const difference = val - mean
		return sum + difference * difference
	}, 0)
	const divisor = isSample ? data.length - 1 : data.length
	const absoluteVariance = squaredDifferencesSum / divisor

	if (asPercentage) {
		const standardDeviation = Math.sqrt(absoluteVariance)
		const coefficientOfVariation = (standardDeviation / mean) * 100
		return coefficientOfVariation
	}

	return absoluteVariance
}

export function hasDropPct(values: number[], pct: number): boolean {
	for (let i = 1; i < values.length; i++) {
		const dropPct = ((values[i - 1] - values[i]) / values[i - 1]) * 100
		if (dropPct >= pct) {
			return true
		}
	}
	return false
}

export function hasMinNonZeroNumbersInObject(
	obj: Record<string, any>,
	minCount: number,
): boolean {
	const values = Object.values(obj)
	const nonZeroNumbers = values.filter(
		(val): val is number => typeof val === 'number' && val !== 0,
	)
	return nonZeroNumbers.length >= minCount
}

export const getSpreadPercentage = (
	values: number[],
	decimals: number = 2,
): number => {
	const min = values[0]
	const max = values[values.length - 1]
	const avg = values.reduce((a, b) => a + b, 0) / values.length

	if (avg === 0) return 0
	const spread = ((max - min) / Math.abs(avg)) * 100

	return Number(spread.toFixed(decimals))
}

export function getRisePct(arr: number[]) {
	if (arr.some((a) => a === undefined)) return 0
	return (arr.at(-1)! / arr[0] - 1) * 100
}

export const countDuplicateValues = (arr: any, key: string) => {
	const counts = new Map()
	const duplicates = []

	for (const item of arr) {
		const val = item[key]
		counts.set(val, (counts.get(val) || 0) + 1)
	}

	for (const [val, count] of counts) {
		if (count > 1) {
			duplicates.push(val)
		}
	}
	return duplicates
}

export function getTime(
	rounded: boolean = false,
	showMs: boolean = true,
): string {
	const dateNow = DateTime.now()
		.setZone('America/New_York')
		.toISOTime({ suppressMilliseconds: !showMs, includeOffset: false })!

	if (rounded) return dateNow.split('.')[0]
	return dateNow
}

export function getFirstNonZeroIndex(arr: number[]): number {
	return arr.findIndex((value) => value !== 0)
}

export function getSecondsBetween(time1: string, time2: string): number {
	const parseTimeToSeconds = (timeStr: string): number => {
		const [hours, minutes, seconds] = timeStr.split(':').map(Number)
		return hours * 3600 + minutes * 60 + seconds
	}

	const seconds1 = parseTimeToSeconds(time1)
	const seconds2 = parseTimeToSeconds(time2)
	return Math.abs(seconds2 - seconds1)
}

export function getDate(days: number = 0) {
	return DateTime.now().setZone('America/New_York').plus({ days }).toISODate()!
}

export function getHour(days: number = 0) {
	return DateTime.now().setZone('America/New_York').plus({ days }).hour
}

export function getDateTimeNow() {
	return DateTime.now().setZone('America/New_York')!
}
