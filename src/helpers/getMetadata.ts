import { delay } from './delay'

export function getTokenNameAndTicker(logMessages: string[]): {
	name: string
	ticker: string
	metadataUri: string
} | null {
	for (const log of logMessages) {
		if (!log.startsWith('Program data:')) continue

		try {
			const b64 = log.slice('Program data:'.length).trim()
			const buf = Buffer.from(b64, 'base64')

			let offset = 8

			const nameLen = buf.readUInt32LE(offset)
			offset += 4
			const name = buf.toString('utf8', offset, offset + nameLen)
			offset += nameLen

			const symbolLen = buf.readUInt32LE(offset)
			offset += 4
			const ticker = buf.toString('utf8', offset, offset + symbolLen)
			offset += symbolLen

			const uriLen = buf.readUInt32LE(offset)
			offset += 4
			const metadataUri = buf.toString('utf8', offset, offset + uriLen)

			if (!metadataUri.startsWith('http')) continue

			return {
				name,
				ticker,
				metadataUri,
			}
		} catch (e) {
			continue
		}
	}

	return {
		name: '',
		ticker: '',
		metadataUri: '',
	}
}

export async function getMetadata(metadataURL: string, delaySec?: number) {
	if (metadataURL) {
		if (delaySec) await delay(delaySec)
		try {
			const metaRes = await fetch(metadataURL)
			const json = await metaRes.json()
			const metadata = {
				twitter: json?.twitter,
				website: json?.website,
				description: json?.description,
			}
			return metadata
		} catch {}
	}
	return { twitter: '', website: '', description: '' }
}

export function hasSocials(trade: ITrade) {
	const { socials } = trade
	return !socials || socials.twitter || socials.website
}
