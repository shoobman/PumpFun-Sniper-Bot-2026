export async function timer<T>(callback: () => Promise<T>): Promise<T> {
	const start = performance.now()
	const result = await callback()
	const end = performance.now()
	console.log(`${(end - start).toFixed(2)}ms`)
	return result
}
