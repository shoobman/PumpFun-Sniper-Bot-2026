export async function delay(sec: number = 0): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, sec * 1000))
}
