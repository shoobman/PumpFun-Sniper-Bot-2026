import { DateTime } from 'luxon'
import { strategies } from '@/config/strategies'
import { getDate, getSum } from '@/helpers/mathAndDates'
import loadTrades from '@/helpers/loadTrades'
import { IPriceChanges } from './getPumpPriceChanges'
import { renderHours, renderMenu, renderTrades } from './renderSections'
import { getRegimeState } from '@/config/state'

export const EVEN_THRESHOLD = 2
export const PROFIT_SEC = 68

const REFRESH_INTERVAL = 60 * 1000
const tradeCache = new Map<string, ITrade[]>()
const platforms: TPlatform[] = ['pumpfun', 'launchlab', 'bags']

interface AppState {
	main: boolean
	timer: NodeJS.Timeout | null

	local: boolean
	filtered: boolean
	showTrueProfitIndex: boolean

	trades: ITrade[]

	platformIndex: number
	strategyIndex: number
	profitIndex: number
	day: number

	pumpPriceMovement: IPriceChanges | null
}

const app: AppState = {
	main: true,
	timer: null,

	local: true,
	filtered: true,
	showTrueProfitIndex: false,

	trades: [],

	platformIndex: 0,
	strategyIndex: 0,
	profitIndex: 3,
	day: 0,

	pumpPriceMovement: null,
}

function getCurrentPlatform() {
	return platforms[app.platformIndex]
}

function getCacheKey() {
	return `${getDate(-app.day)}-${app.local}`
}

function sortTradesByTime(trades: ITrade[]) {
	return trades.sort(
		(a, b) =>
			DateTime.fromISO(a.buy_time).toMillis() -
			DateTime.fromISO(b.buy_time).toMillis(),
	)
}

function removeDuplicateTrades(trades: ITrade[]) {
	const seen = new Set<string>()

	return trades.filter((trade) => {
		const key = `${trade.mint}-${trade.strategy.id}`

		if (
			trade.isMayhem ||
			trade.profit === -100 ||
			seen.has(key) ||
			!trade.mcPerSec
			// ||
			// getSum(trade.profitSecs) === 0
		) {
			return false
		}
		seen.add(key)
		return true
	})
}

function filterPlatformTrades(trades: ITrade[]) {
	return trades.filter((t) => t.platform === getCurrentPlatform())
}

function filterStrategyTrades(trades: ITrade[]) {
	return trades.filter((trade) => {
		try {
			const strategy = strategies.find((s) => s.id === trade.strategy.id)!
			return strategy.evaluators[getCurrentPlatform()](trade).passed
		} catch {
			return false
		}
	})
}

function normalizeTrades(rawTrades: ITrade[]) {
	let trades = [...rawTrades]

	trades = trades.filter(
		(t) =>
			t.strategy.name !== 'wallets xxx' &&
			t.strategy.name !== 'volumezzz sell sellz' &&
			t.strategy.name !== 'volume 3' &&
			t.strategy.name !== '6' &&
			t.strategy.name !== '67' &&
			t.strategy.name !== '1677' &&
			t.strategy.name !== 'zero3',
	)

	trades = sortTradesByTime(trades)
	trades = filterPlatformTrades(trades)
	trades = removeDuplicateTrades(trades)

	if (app.filtered) {
		trades = filterStrategyTrades(trades)
	}

	return trades
}

async function fetchTrades(forceRefresh = false) {
	const cacheKey = getCacheKey()

	let rawTrades: ITrade[]
	console.log('Loading trades...')

	if (tradeCache.has(cacheKey) && !forceRefresh) {
		rawTrades = tradeCache.get(cacheKey)!
	} else {
		rawTrades = await loadTrades(app.local, app.day)
		tradeCache.set(cacheKey, rawTrades)
	}
	// state.tradeData = sortTradesByTime(
	// 	removeDuplicateTrades(filterPlatformTrades([...rawTrades])),
	// )
	app.trades = normalizeTrades(rawTrades)
}

async function ensureMarketData() {
	// if (!app.pumpPriceMovement) {
	// 	app.pumpPriceMovement = await getPumpPriceChanges()
	// }
}

function renderMainView() {
	renderHours(
		app.day,
		app.trades,
		app.profitIndex,
		app.showTrueProfitIndex,
		app.strategyIndex,
	)

	renderMenu(
		getCurrentPlatform(),
		app.trades,
		app.strategyIndex,
		app.profitIndex,
		app.showTrueProfitIndex,
		app.filtered,
		app.local,
		app.day,
		app.pumpPriceMovement,
	)
}

function renderTradeView(type: 'all' | 'wins' | 'losses' | 'even') {
	renderTrades(
		app.trades,
		app.strategyIndex,
		type,
		app.profitIndex,
		app.showTrueProfitIndex,
	)
}

async function refresh(forceRefresh = false, forceRender = false) {
	await fetchTrades(forceRefresh)

	if (app.main || forceRender) {
		renderMainView()
	}
}

function startRefreshLoop() {
	if (app.timer) return

	app.timer = setInterval(async () => {
		if (!app.main || app.local) return

		await refresh(true, true)
	}, REFRESH_INTERVAL)
}

async function init() {
	await ensureMarketData()

	startRefreshLoop()

	await refresh(true, true)
}

async function toggleFilter() {
	app.filtered = !app.filtered
	await refresh(false, true)
}

async function toggleLocal() {
	app.local = !app.local
	if (!app.local) {
		console.log('Loading regime state...')
		await getRegimeState(true, true)
	}
	await refresh(true, true)
}

async function switchPlatform() {
	app.platformIndex = (app.platformIndex + 1) % platforms.length
	await refresh(false, true)
}

function nextProfitWindow() {
	app.profitIndex = (app.profitIndex + 1) % PROFIT_SEC
	renderMainView()
}

function previousProfitWindow() {
	app.profitIndex = (app.profitIndex - 1 + PROFIT_SEC) % PROFIT_SEC
	renderMainView()
}

function nextStrategy() {
	app.strategyIndex = (app.strategyIndex + 1) % strategies.length
	renderMainView()
}

function previousStrategy() {
	app.strategyIndex =
		(app.strategyIndex - 1 + strategies.length) % strategies.length
	renderMainView()
}

async function nextDay() {
	if (app.day === 0) return
	app.day -= 1
	await refresh(false, true)
}

async function previousDay() {
	app.day += 1
	await refresh(false, true)
}

function toggleDynamicProfitIndex() {
	app.showTrueProfitIndex = !app.showTrueProfitIndex
	renderMainView()
}

async function handleKeyPress(key: string) {
	switch (key) {
		case 'f':
			app.main = true
			await toggleFilter()
			return

		case 's':
			app.main = true
			renderMainView()
			return

		case 'r':
			app.main = true
			console.log('\nRefreshing...')
			await refresh(true, true)
			return

		case 'p':
			app.main = true
			await toggleLocal()
			return

		case 'x':
			app.main = true
			toggleDynamicProfitIndex()
			return

		case 'j':
			app.main = true
			await switchPlatform()
			return

		case 'a':
			app.main = false
			renderTradeView('all')
			return

		case 'w':
			app.main = false
			renderTradeView('wins')
			return

		case 'l':
			app.main = false
			renderTradeView('losses')
			return

		case 'e':
			app.main = true
			nextProfitWindow()
			return

		case 'q':
			app.main = true
			previousProfitWindow()
			return

		case 'z':
			app.main = true
			previousStrategy()
			return

		case 'c':
			app.main = true
			nextStrategy()
			return

		case '\u001b[C':
			if (app.day !== 0) console.log('\nLoading...')
			app.main = true
			await nextDay()
			return

		case '\u001b[D':
			console.log('\nLoading...')
			app.main = true
			await previousDay()
			return

		case '\u0003':
			process.exit()
	}
}

process.stdin.setRawMode(true)
process.stdin.setEncoding('utf8')

process.stdin.on('data', async (key: string) => {
	try {
		await handleKeyPress(key)
	} catch (err) {
		console.error(err)
	}
})

init()
