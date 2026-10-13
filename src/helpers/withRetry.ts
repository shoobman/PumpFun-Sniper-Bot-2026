export async function withRetry<T>(
	fn: () => Promise<T>,
	options?: {
		retries?: number
		delayMs?: number
		backoff?: 'linear' | 'exponential'
		onError?: (err: unknown, attempt: number) => void
	},
): Promise<T> {
	const {
		retries = 5,
		delayMs = 0,
		backoff = 'linear',
		onError,
	} = options || {}

	let attempt = 0

	while (true) {
		try {
			return await fn()
		} catch (err) {
			attempt++
			onError?.(err, attempt)

			if (attempt > retries) throw err

			const wait =
				backoff === 'exponential'
					? delayMs * 2 ** (attempt - 1)
					: delayMs * attempt

			await new Promise((res) => setTimeout(res, wait))
		}
	}
}
