import { LOG_DIR } from '@/config/constants'
import fs from 'fs'

export function saveToFile(file: string, log: any) {
	const filePath = `${LOG_DIR}/${file}`

	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR, { recursive: true })
	}

	const { initialTokenAmount, ...logJSON } = log
	const line = JSON.stringify(logJSON) + ',\n'
	fs.appendFileSync(filePath, line)
}
