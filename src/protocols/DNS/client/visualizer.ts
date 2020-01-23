import { BufferIO } from "./BufferIO";
import { DnsMessage } from "./types";
import { IMessage } from "./interfaces";

export class DnsMessageVisualizer {
	static visualizeBuffer(buf: Buffer) {
		let reader = new BufferIO(buf)
		let message: IMessage = DnsMessage.fromBuffer(reader)
		let res = 'DNS '

		res += ( (message.header.qr)? 'Response': 'Request')
		if (message.header.opcode === 0) {
			res += ' (QUERY)'
		} else if (message.header.opcode === 1) {
			res += ' (IQUERY)'
		} else {
			res += ' (STATUS)'
		}

		if (message.header.aa) {
			res += ' [Authoritative]'
		}

		if (message.header.tc) {
			res += ' [Truncated]'
		}

		res += ` [Response ${message.header.rcode}]`

		res += ' {\n'
		
		res += `\tQuestions (${message.header.qdcount}):\n`

		for (let i = 0; i < message.questions.length; i++) {
			let q = message.questions[i]
			res += `\t\t${q.name} ${q.type} ${q.qClass}\n`
		}
		res += `\tAnswers (${message.header.ancount}):\n`
		res += `\tAuthoritative (${message.header.nscount}):\n`
		res += `\tAdditional (${message.header.arcount}):\n`
		res += '}\n'
		
		console.log(res)
	}
}