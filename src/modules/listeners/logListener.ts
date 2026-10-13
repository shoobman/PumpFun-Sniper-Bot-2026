import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { PublicKey } from '@solana/web3.js'
import readline from 'readline'
import { delay } from '@/helpers/delay'
import { printError } from '@/helpers/printError'

type TLogCallback = (log: ILog) => void

export class LogListener {
	private rust: ChildProcessWithoutNullStreams
	private rl?: readline.Interface
	private restarting = false
	private shuttingDown = false
	private nextListenerId = 1

	private subscriptions = new Map<
		string,
		{
			id: number
			callback: TLogCallback
		}[]
	>()

	private listenerIdMap = new Map<number, string>()

	constructor(private rustPath = './ws/target/debug/_rust_ws') {
		console.log('\x1b[36m🧾\x1b[37m Initialized log listener')

		this.rust = spawn(this.rustPath)
		this.setup()

		this.rust.on('error', (err) => {
			if (!this.shuttingDown) {
				printError('Rust process error', err)
				this.restart().catch(printError)
			}
		})

		this.rust.on('exit', (code) => {
			if (!this.shuttingDown && code !== 0) {
				console.log(`Rust exited (${code}), restarting...`)
				this.restart().catch(printError)
			}
		})

		process.once('SIGINT', () => this.shutdown())
		process.once('SIGTERM', () => this.shutdown())
		process.once('exit', () => this.shutdown())
	}

	public onLogs(mint: string | PublicKey, callback: TLogCallback): number {
		const mintStr = typeof mint === 'string' ? mint : mint.toBase58()

		let subs = this.subscriptions.get(mintStr)

		if (!subs) {
			subs = []
			this.subscriptions.set(mintStr, subs)

			if (!this.restarting) {
				this.rust.stdin.write(JSON.stringify({ subscribe: mintStr }) + '\n')
			}
		}

		const id = this.nextListenerId++

		subs.push({ id, callback })
		this.listenerIdMap.set(id, mintStr)

		return id
	}

	public removeListener(id: number): boolean {
		const mint = this.listenerIdMap.get(id)
		if (!mint) return false

		this.listenerIdMap.delete(id)

		const subs = this.subscriptions.get(mint)
		if (!subs) return false

		const index = subs.findIndex((s) => s.id === id)
		if (index !== -1) subs.splice(index, 1)

		if (subs.length === 0) {
			this.subscriptions.delete(mint)

			if (!this.restarting) {
				this.rust.stdin.write(JSON.stringify({ unsubscribe: mint }) + '\n')
			}
		}

		return true
	}

	public async restart() {
		if (this.restarting || this.shuttingDown) return

		this.restarting = true

		try {
			this.rust.kill()

			await delay(2)

			this.rust = spawn(this.rustPath)
			this.setup()

			for (const mint of this.subscriptions.keys()) {
				this.rust.stdin.write(JSON.stringify({ subscribe: mint }) + '\n')
			}
		} finally {
			this.restarting = false
		}
	}

	private setup() {
		this.rl?.close()

		this.rl = readline.createInterface({
			input: this.rust.stdout,
		})

		this.rl.on('line', (line) => {
			try {
				const tx = JSON.parse(line)

				if (!tx?.mint) return

				const subs = this.subscriptions.get(tx.mint)
				if (!subs) return

				for (const { callback } of subs) {
					try {
						callback({ ...tx, mint: tx.mint })
					} catch (err) {
						printError('Log callback failed', err)
					}
				}
			} catch {
				printError('Failed to parse Rust log', line)
			}
		})

		this.rust.stderr.on('data', (data) => {
			printError('Rust stderr', data.toString())
			this.restart()
		})
	}

	private shutdown() {
		if (this.shuttingDown) return

		this.shuttingDown = true

		this.rl?.close()
		this.rust.kill()
	}
}
