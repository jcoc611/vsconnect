'use strict'

import DnsClient from "."

let client = new DnsClient("10.50.50.50")
client.query({name: "google.com", type: 1, qClass: 1}).then((msg) => {
	console.log("message", JSON.stringify(msg))
})
