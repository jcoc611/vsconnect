import * as WebSocket from "ws";
import { BytesValue, ITransaction, ITransactionState } from "../../interfaces";
import { EventEmitter } from "../../utils/EventEmitter";
import { getBinaryComponentValue, getComponent } from "../../utils/transactionTools";

export interface IWSConnectionProps
{
	address: string;
	protocols?: string[];
	shouldCompress: boolean;
}

export class WSConnection extends EventEmitter
{
	readonly id: number;       // connection id
	readonly sourceId: number; // view (e.g. which tab owns the connnection)
	readonly connectionProps: IWSConnectionProps;
	socket?: WebSocket;

	constructor(id:number, sourceId: number, connectionProps: IWSConnectionProps) {
		super();
		this.id = id;
		this.sourceId = sourceId;
		this.connectionProps = connectionProps;
	}

	async initialize() {
		this.socket = new WebSocket(this.connectionProps.address, this.connectionProps.protocols);
		this.socket.on('open', () => this.trigger('connected'));
		this.socket.on('close', (code, reason) => {
			this.trigger('message', this.tClose(code, reason));
			this.trigger('disconnected');
		});
		this.socket.on('error', (err) => {
			this.trigger('disconnected');
			console.log(err);
		});
		this.socket.on('message', (data) => this.trigger('message', this.tMessage(data)));
		this.socket.on('pong', (data) => this.trigger('message', this.tPong(data)));
		// this.socket.on('upgrade')
		// this.socket.on('ping')
		// this.socket.on('unexpected-response')
	}

	async send(t: ITransaction) {
		if (this.socket === undefined)
			throw new Error("Connection not initialized");

		let body = getBinaryComponentValue(t, 'body');
		const mask = true;
		
		switch (getComponent(t, 'verb'))
		{
			case 'Message':
				this.socket.send(body, {
					mask,
					binary: (body instanceof Buffer),
					compress: this.connectionProps.shouldCompress,
					fin: true,
				});
				break;

			case 'Disconnect':
				this.socket.close(Number.parseInt(getComponent(t, 'closeCode', '1000')), body.toString());
				break;

			case 'Ping':
				this.socket.ping(body, mask);
				break;
		}
	}

	private tPing(): ITransaction {
		return {
			protocolId: 'WebSockets',
			connectionId: this.id,
			state: ITransactionState.Sent,
			shortStatus: 'Ping',
			components: {
				verb: 'Ping',
				// body: this.getBodyValue(data)
			}
		};
	}

	private tPong(data: Buffer): ITransaction {
		return {
			protocolId: 'WebSockets',
			connectionId: this.id,
			state: ITransactionState.Sent,
			shortStatus: 'Pong',
			components: {
				verb: 'Pong',
				body: this.getBodyValue(data)
			}
		};
	}

	private tClose(code: number, reason: string): ITransaction {
		return {
			protocolId: 'WebSockets',
			connectionId: this.id,
			state: ITransactionState.Sent,
			shortStatus: 'Close',
			components: {
				verb: 'Disconnect',
				code: code.toString(),
				body: this.getBodyValue(reason)
			}
		};
	}

	private tMessage(data: WebSocket.Data) : ITransaction {
		//type Data = string | Buffer | ArrayBuffer | Buffer[];
		return {
			protocolId: 'WebSockets',
			connectionId: this.id,
			state: ITransactionState.Sent,
			shortStatus: (typeof(data) === 'string')? 'Text' : 'Binary',
			components: {
				verb: 'Message',
				body: this.getBodyValue(data)
			}
		};
	}

	private getBodyValue(data: WebSocket.Data): BytesValue {
		if (typeof(data) === "string")
		{
			return {
				type: 'string',
				rawValue: data,
			};
		}
		else
		{
			// TODO: should handle binary data separately
			return {
				type: 'string',
				rawValue: data.toString(),
			};
		}
	}
}
