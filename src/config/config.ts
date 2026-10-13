import { Connection, Keypair } from '@solana/web3.js'
import {
	RPC_ALT_ENDPOINT,
	RPC_ALT_WS_ENDPOINT,
	RPC_ENDPOINT,
	RPC_WS_ENDPOINT,
	WALLET_PK1,
	WALLET_PK2,
	WALLET_PK3,
} from './constants'
import { OnlinePumpSdk, PumpSdk } from '@pump-fun/pump-sdk'
import { LogListener } from '@/modules/listeners/logListener'
import base58 from 'bs58'
import { BagsSDK } from '@bagsfm/bags-sdk'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import { RegimeChecker } from '@/modules/regime/regimeChecker'
import state from './state'

// REGIME

export const regime = new RegimeChecker(state.regimeStates)

// WALLETS

export const wallets = [WALLET_PK1, WALLET_PK2, WALLET_PK3].map((wallet) =>
	Keypair.fromSecretKey(base58.decode(wallet)),
)

// RPC

export const connection = new Connection(RPC_ENDPOINT, {
	commitment: 'processed',
	wsEndpoint: RPC_WS_ENDPOINT,
})
export const connectionAlt = new Connection(RPC_ALT_ENDPOINT, {
	commitment: 'processed',
	wsEndpoint: RPC_ALT_WS_ENDPOINT,
})

// LOG LISTENER

export let logListener: LogListener | null = null
export const initLogListener = async () => {
	logListener = new LogListener()
}

// PUMP SDK

export const pumpOnlineSdk = new OnlinePumpSdk(connectionAlt)
export const pumpSDK = new PumpSdk()
export let pumpGlobal: any = null
export let pumpFeeConfig: any = null
export const initPumpSdk = async () => {
	pumpGlobal = await pumpOnlineSdk.fetchGlobal()
	pumpFeeConfig = await pumpOnlineSdk.fetchFeeConfig()
}

// BAGS / METEORA SDK

export let meteoraSdk: DynamicBondingCurveClient | undefined
export let bagsSdk: BagsSDK | undefined
export const initBagsSdk = async () => {
	meteoraSdk = new DynamicBondingCurveClient(connection, 'processed')
	// bagsSdk = new BagsSDK(BAGS_API_KEY, connection, 'processed')
}
