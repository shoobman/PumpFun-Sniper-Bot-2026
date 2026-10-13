// import WebSocket from 'ws'

// const ws = new WebSocket(
// 	'wss://pumpdev.io/ws?key=S-y_M3hsL4iNEvleutuDoeSv3RQuMaW8mdZ_7uWN3-7j07dBmA-C2ZWjzmfm73i_',
// )

// ws.on('open', () => {
// 	// ws.send(JSON.stringify({ method: 'subscribeNewToken' }))
// 	ws.send(
// 		JSON.stringify({
// 			method: 'subscribeTokenTrade',
// 			keys: ['8Hfw1tkSwYFdqY5wSq64UcobtBCYWNp6i1ri6Jdmvoid'],
// 		}),
// 	)
// 	// ws.send(
// 	// 	JSON.stringify({
// 	// 		method: 'subscribeAccountTrade',
// 	// 		keys: ['WalletAddress1'],
// 	// 	}),
// 	// )
// })

// ws.on('message', (raw) => {
// 	const event = JSON.parse(raw.toString())
// 	if (event.type) return // control frame
// 	console.log(event)
// })

// ws.on('error', (err) => console.error(err.message))
