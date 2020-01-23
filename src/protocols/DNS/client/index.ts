import { QuestionType, IMessage, IQuestion } from './interfaces';
import { DnsMessage } from './types';

import * as dgram from 'dgram';
import { BufferIO } from './BufferIO';
import Transport from './transports/Transport';
import TCPTransport from './transports/TCPTransport';

interface DnsQueryOptions {};

export default class DnsClient {
	dnsServerAddress: string;

	constructor(serverAddress: string) {
		this.dnsServerAddress = serverAddress;
	}

	query(question: IQuestion, options: DnsQueryOptions = {}): Promise<IMessage> {
		return this.queryMulti([ question ], options);
	}

	queryMulti(questions: IQuestion[], options: DnsQueryOptions = {}): Promise<IMessage> {
		let msgData: IMessage = {
			header: {
				id: 1, // TODO
				qr: false,
				opcode: 0, // TODO support IQUERY and STATUS
				aa: false,
				tc: false, // TODO truncated support?
				rd: false, // TODO recursion support
				ra: false,
				z: 0,
				rcode: 0,
				qdcount: questions.length,
				ancount: 0,
				nscount: 0,
				arcount: 0,
			},
			questions: questions,
			answers: [],
			authorities: [],
			additionals: [],
		};

		let transport: Transport = new TCPTransport(this.dnsServerAddress);

		return transport.send(msgData);
	}
}
