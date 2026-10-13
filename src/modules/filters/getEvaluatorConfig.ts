import { DateTime } from 'luxon'

export function getEvaluatorConfig<TConfig>(
	trade: ITrade,
	configBase: TConfig,
	hourlyConfig: IEvaluatorConfigPeriod<Partial<TConfig>>[],
): TConfig | undefined {
	const dt = DateTime.fromISO(trade.buy_time)
	const d = DateTime.fromISO(trade.date!)

	if (!dt.isValid || !d.isValid) return

	const hour = dt.hour + dt.minute / 60 + dt.second / 3600
	const weekday = d.weekday as TDay
	const configExt = hourlyConfig.find((r) => {
		const dayMatch = r.days?.includes(weekday)
		const hourMatch = hour >= r.from && hour <= r.to
		return dayMatch && hourMatch
	})?.config

	if (!configExt) return

	return {
		...configBase,
		...configExt,
	}
}
