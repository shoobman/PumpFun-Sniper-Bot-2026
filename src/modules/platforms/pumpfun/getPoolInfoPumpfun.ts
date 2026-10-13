import { PublicKey } from '@solana/web3.js'
import { connection as connectionMain, connectionAlt } from '@/config/config'

const PUMP_CURVE_STATE_SIGNATURE = Uint8Array.from([
	0x17, 0xb7, 0xf8, 0x37, 0x60, 0xd8, 0xac, 0x60,
])
const PUMP_CURVE_STATE_SIZE = 0x29
const PUMP_CURVE_STATE_OFFSETS = {
	VIRTUAL_TOKEN_RESERVES: 0x08,
	VIRTUAL_SOL_RESERVES: 0x10,
	REAL_TOKEN_RESERVES: 0x18,
	REAL_SOL_RESERVES: 0x20,
	TOKEN_TOTAL_SUPPLY: 0x28,
	COMPLETE: 0x30,
}

export default async function getPoolInfoPumpfun(
	mintDetails: IMintDetails,
): Promise<ICurveState> {
	const connection = mintDetails.live ? connectionAlt : connectionMain
	const response = await connection!.getAccountInfo(
		new PublicKey(mintDetails.bondingCurve!),
		{
			commitment: 'processed',
		},
	)
	if (
		!response ||
		!response.data ||
		response.data.byteLength <
			PUMP_CURVE_STATE_SIGNATURE.byteLength + PUMP_CURVE_STATE_SIZE
	) {
		throw new Error('unexpected curve state')
	}

	const idlSignature = readBytes(
		response.data,
		0,
		PUMP_CURVE_STATE_SIGNATURE.byteLength,
	)
	if (idlSignature.compare(PUMP_CURVE_STATE_SIGNATURE) !== 0) {
		throw new Error('unexpected curve state IDL signature')
	}

	return {
		virtualTokenReserves: readBigUintLE(
			response.data,
			PUMP_CURVE_STATE_OFFSETS.VIRTUAL_TOKEN_RESERVES,
			8,
		),
		virtualSolReserves: readBigUintLE(
			response.data,
			PUMP_CURVE_STATE_OFFSETS.VIRTUAL_SOL_RESERVES,
			8,
		),
		realTokenReserves: readBigUintLE(
			response.data,
			PUMP_CURVE_STATE_OFFSETS.REAL_TOKEN_RESERVES,
			8,
		),
		realSolReserves: readBigUintLE(
			response.data,
			PUMP_CURVE_STATE_OFFSETS.REAL_SOL_RESERVES,
			8,
		),
		tokenTotalSupply: readBigUintLE(
			response.data,
			PUMP_CURVE_STATE_OFFSETS.TOKEN_TOTAL_SUPPLY,
			8,
		),
		complete: readBoolean(
			response.data,
			PUMP_CURVE_STATE_OFFSETS.COMPLETE,
			1,
		),
	}
}

function readBytes(buf: Buffer, offset: number, length: number): Buffer {
	const end = offset + length
	if (buf.byteLength < end) throw new RangeError('range out of bounds')
	return buf.subarray(offset, end)
}

function readBigUintLE(buf: Buffer, offset: number, length: number): bigint {
	switch (length) {
		case 1:
			return BigInt(buf.readUint8(offset))
		case 2:
			return BigInt(buf.readUint16LE(offset))
		case 4:
			return BigInt(buf.readUint32LE(offset))
		case 8:
			return buf.readBigUint64LE(offset)
	}
	throw new Error(`unsupported data size (${length} bytes)`)
}

function readBoolean(buf: Buffer, offset: number, length: number): boolean {
	const data = readBytes(buf, offset, length)
	for (const b of data) {
		if (b) return true
	}
	return false
}
