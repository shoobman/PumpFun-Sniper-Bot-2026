export default class LogVolume {
	public buys = 0
	public sells = 0
	public traderBuys = 0
	public traderSells = 0

	public buyErrors = 0
	public sellErrors = 0
	public traderBuyErrors = 0
	public traderSellErrors = 0

	public buysPerSec: number[] = []
	public buysErrorsPerSec: number[] = []
	public sellsPerSec: number[] = []
	public traderBuysPerSec: number[] = []
	public traderErrorsPerSec: number[] = []
	public traderSellsPerSec: number[] = []

	public buyFees: number[] = []
	public sellFees: number[] = []
	public traderBuyFees: number[] = []
	public traderSellFees: number[] = []

	public tradingAppBuys: any = {}
	public tradingAppSells: any = {}

	public traderBuySignatures: string[] = []
	public traderSellSignatures: string[] = []

	//

	public buyTxs: string[] = []
	public sellTxs: string[] = []
	public traderBuyTxs: string[] = []
	public traderSellTxs: string[] = []

	private last = {
		buys: 0,
		buyErrors: 0,
		sells: 0,
		traderBuys: 0,
		traderBuyErrors: 0,
		traderSells: 0,
	}

	//

	public log(log: ILog): void {
		const { tradingApp, meta, action, fees, signature } = log
		const isError = meta === 'error'

		switch (action) {
			case 'buy':
				this.buys++
				if (fees) this.buyFees.push(fees)
				if (isError) this.buyErrors++
				this.buyTxs.push(signature)
				break

			case 'sell':
				this.sells++
				if (fees) this.sellFees.push(fees)
				if (isError) this.sellErrors++
				this.sellTxs.push(signature)
				break

			case 'traderBuy':
				this.traderBuys++
				this.traderBuySignatures.push(signature)

				if (!this.tradingAppBuys[tradingApp])
					this.tradingAppBuys[tradingApp] = 0
				this.tradingAppBuys[tradingApp] += 1

				if (fees) this.traderBuyFees.push(fees)
				if (isError) this.traderBuyErrors++
				this.traderBuyTxs.push(signature)

				break

			case 'traderSell':
				this.traderSells++
				this.traderSellSignatures.push(signature)

				if (!this.tradingAppSells[tradingApp])
					this.tradingAppSells[tradingApp] = 0
				this.tradingAppSells[tradingApp] += 1

				if (fees) this.traderSellFees.push(fees)
				if (isError) this.traderSellErrors++
				this.traderSellTxs.push(signature)
				break
		}
	}

	public pushTick(): void {
		this.buysPerSec.push(this.buys - this.last.buys)
		this.buysErrorsPerSec.push(this.buyErrors - this.last.buyErrors)
		this.sellsPerSec.push(this.sells - this.last.sells)
		this.traderBuysPerSec.push(this.traderBuys - this.last.traderBuys)
		this.traderErrorsPerSec.push(
			this.traderBuyErrors - this.last.traderBuyErrors,
		)
		this.traderSellsPerSec.push(this.traderSells - this.last.traderSells)

		this.last.buys = this.buys
		this.last.buyErrors = this.buyErrors
		this.last.sells = this.sells
		this.last.traderBuys = this.traderBuys
		this.last.traderBuyErrors = this.traderBuyErrors
		this.last.traderSells = this.traderSells
	}

	public getObject(): ITradeVolume {
		return {
			buys: this.buys,
			sells: this.sells,
			traderBuys: this.traderBuys,
			traderSells: this.traderSells,

			buyErrors: this.buyErrors,
			sellErrors: this.sellErrors,
			traderBuyErrors: this.traderBuyErrors,
			traderSellErrors: this.traderSellErrors,

			buysPerSec: [...this.buysPerSec],
			buyErrorsPerSec: [...this.buysErrorsPerSec],
			sellsPerSec: [...this.sellsPerSec],
			traderBuysPerSec: [...this.traderBuysPerSec],
			traderErrorsPerSec: [...this.traderErrorsPerSec],
			traderSellsPerSec: [...this.traderSellsPerSec],

			buyFees: [...this.buyFees],
			sellFees: [...this.sellFees],
			traderBuyFees: [...this.traderBuyFees],
			traderSellFees: [...this.traderSellFees],

			tradingAppBuys: { ...this.tradingAppBuys },
			tradingAppSells: { ...this.tradingAppSells },
		}
	}
}
