'use strict';

import Transport from "./Transport";
import { IMessage } from "../interfaces";
import { BufferIO } from "../BufferIO";
import { DnsMessage } from "../types";

import * as net from 'net';

export default class TCPTransport extends Transport {
	public send(msgData: IMessage): Promise<IMessage> {
		let buf = Buffer.alloc(512, 0, "binary");
		let writer = new BufferIO(buf);

		return new Promise((resolve, reject) => {
			const socket = new net.Socket();
			socket.on('data', (msg) => {
				console.log('response received');
				let reader = new BufferIO(msg);
				reader.readUInt(16); // Reads TCP two-byte message length
				resolve( DnsMessage.fromBuffer(reader) );
			});

			socket.on('error', (err)=> console.error(err));
			socket.on('close', () => console.log('dns TCP socket closed'));

			DnsMessage.toBuffer(writer, msgData);

			socket.connect(53, this.resolverAddress, () => {
				console.log('connected')
				let offsetBytes = ~~(writer.getOffsetBits() / 8);

				let lenBuf = Buffer.alloc(2, 0, "binary");
				lenBuf.writeInt16BE(offsetBytes, 0);

				console.log('sending buf', buf, offsetBytes );
				socket.write(Buffer.concat([lenBuf, buf]), (err) => {
					if (err) {
						console.error(err)
					}
				});
			});
		});
	}
}