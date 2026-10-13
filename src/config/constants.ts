import path from 'path'
import { getEnvVar } from '@/helpers/getEnvVar'
import { primary } from '@/helpers/text'
import { PublicKey } from '@solana/web3.js'

////////////////////////////////////
// GLOBAL VARIABLES
////////////////////////////////////

export const BLACKLIST_PATH = path.resolve('blacklisted.txt')
export const FEES_PCT = 4
export const MOCK_TRADE_AMOUNT = 10
export const BLOCK_SEC = 0.4
export const DIVIDER = primary('—'.repeat(62))
export const DIVIDER_SHORT = primary('—'.repeat(62))
export const DIVIDER_SHORTER = primary('—'.repeat(61))
export const DIVIDER_HALF = primary('—'.repeat(31))
export const BAR = '\x1b[95m│\x1b[37m'
export const USDC_MINT = new PublicKey(
	'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
)
export const TERMINAL_URL = 'https://trade.padre.gg/trade/solana/'
export const DEXSCREENER_URL = 'https://dexscreener.com/solana/'
export const AXIOM_URL = 'https://axiom.trade/meme/'

////////////////////////////////////
// ENV VARIABLES
////////////////////////////////////

export const WALLET_PK1 = getEnvVar<string>('WALLET_PK1')
export const WALLET_PK2 = getEnvVar<string>('WALLET_PK2')
export const WALLET_PK3 = getEnvVar<string>('WALLET_PK3')

export const GET_HOLDERS = getEnvVar<boolean>('GET_HOLDERS')
export const PLATFORMS = getEnvVar<string>('PLATFORMS')
export const IS_LIVE = getEnvVar<boolean>('IS_LIVE')
export const IS_SERVER = getEnvVar<boolean>('IS_SERVER')
export const RPC_ENDPOINT = getEnvVar<string>('RPC_ENDPOINT')
export const RPC_WS_ENDPOINT = getEnvVar<string>('RPC_WS_ENDPOINT')
export const RPC_ALT_ENDPOINT = getEnvVar<string>('RPC_ALT_ENDPOINT')
export const RPC_ALT_WS_ENDPOINT = getEnvVar<string>('RPC_ALT_WS_ENDPOINT')
export const SERVER_PUBLIC_URL = getEnvVar<string>('SERVER_PUBLIC_URL')
export const BAGS_API_KEY = getEnvVar<string>('BAGS_API_KEY')
export const BINANCE_ENDPOINT = getEnvVar<string>('BINANCE_ENDPOINT')

export const BLACKLIST_DIR = getEnvVar<string>('BLACKLIST_DIR')
export const LOG_DIR = getEnvVar<string>('LOG_DIR')
export const LOG_VOLUME = getEnvVar<boolean>('LOG_VOLUME')
export const COLLECT_MOCK_TRADES = getEnvVar<boolean>('COLLECT_MOCK_TRADES')
export const PRINT_UNTRADED = getEnvVar<boolean>('PRINT_UNTRADED')

export const RESTART_EVERY_X_MIN = getEnvVar<number>('RESTART_EVERY_X_MIN')
export const TICK_INTERVAL = getEnvVar<number>('TICK_INTERVAL')
export const BUY_AMOUNT_SOL = getEnvVar<number>('BUY_AMOUNT_SOL')
export const BUY_AMOUNT_USD = getEnvVar<number>('BUY_AMOUNT_USD')
export const SWAP_FEE_LAMPORTS = getEnvVar<number>('SWAP_FEE_LAMPORTS')
export const BLACKLIST_PCT = getEnvVar<number>('BLACKLIST_PCT')

export const BUY_RETRIES = getEnvVar<number>('BUY_RETRIES')
export const BUY_SLIPPAGE = getEnvVar<number>('BUY_SLIPPAGE')
export const SELL_RETRIES = getEnvVar<number>('SELL_RETRIES')
export const SELL_SLIPPAGE = getEnvVar<number>('SELL_SLIPPAGE')
