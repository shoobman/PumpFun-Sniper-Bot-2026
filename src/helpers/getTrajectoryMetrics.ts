export interface ITrajectoryMetrics {
	slope: number
	r2: number
	positivePct: number
	peakSec: number
	trajectoryScore: number
}

export const getTrajectoryMetrics = (
	values: number[],
	secondsPerPoint: number = 2,
): ITrajectoryMetrics => {
	if (values.length < 2 || !values[0]) {
		return {
			slope: 0,
			r2: 0,
			positivePct: 0,
			peakSec: 0,
			trajectoryScore: 0,
		}
	}

	// Normalize to initial MC, then use log values so
	// the slope represents percentage growth.
	const normalized = values.map((value) => value / values[0])
	const logValues = normalized.map((value) => Math.log(value))

	const n = logValues.length
	const xMean = (n - 1) / 2
	const yMean = logValues.reduce((sum, value) => sum + value, 0) / n

	let numerator = 0
	let denominator = 0

	for (let i = 0; i < n; i++) {
		const xDiff = i - xMean
		const yDiff = logValues[i] - yMean

		numerator += xDiff * yDiff
		denominator += xDiff * xDiff
	}

	const slope = denominator ? numerator / denominator : 0

	// R²
	const intercept = yMean - slope * xMean

	let ssRes = 0
	let ssTot = 0

	for (let i = 0; i < n; i++) {
		const predicted = intercept + slope * i

		ssRes += (logValues[i] - predicted) ** 2
		ssTot += (logValues[i] - yMean) ** 2
	}

	const r2 = ssTot ? Math.max(0, 1 - ssRes / ssTot) : 0

	// How consistently does the trajectory move upward?
	let positiveMoves = 0

	for (let i = 1; i < values.length; i++) {
		if (values[i] > values[i - 1]) {
			positiveMoves++
		}
	}

	const positivePct = positiveMoves / (values.length - 1)

	// Peak location
	let peakIndex = 0

	for (let i = 1; i < values.length; i++) {
		if (values[i] > values[peakIndex]) {
			peakIndex = i
		}
	}

	const peakSec = peakIndex * secondsPerPoint

	// Convert log slope to percentage growth per interval.
	const growthPerInterval = Math.exp(slope) - 1

	// Strong only when the trajectory is both steep and coherent.
	const trajectoryScore = growthPerInterval * r2

	return {
		slope: growthPerInterval,
		r2,
		positivePct,
		peakSec,
		trajectoryScore,
	}
}
