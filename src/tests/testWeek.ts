import {
	getGlobalStats,
	getHourlyStats,
	loadTradesRange,
	normalizePerDay,
} from '@/helpers/loadTrades'
import evaluatorVolume from '@/modules/filters/evaluators/evaluatorVolume2'

const days = 5

const trades = (await loadTradesRange(days, 0)).filter(
	(t) => t.strategy.id === 0 && evaluatorVolume(t).passed,
)
console.log(trades.length)
const hourly = getHourlyStats(trades)
const normalized = normalizePerDay(hourly, days)
const global = getGlobalStats(trades)

console.log({
	hourly: normalized,
	global,
})
