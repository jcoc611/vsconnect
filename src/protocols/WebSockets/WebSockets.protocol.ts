import { exception } from "node:console";
import { ITransaction, IProtocolMetadata, IComponentTypes, IComponent, ITransactionState, BytesValue, UITypes } from "../../interfaces";
import { ProtocolHandler } from "../../ProtocolHandler";
import { getComponent } from "../../utils/transactionTools";
import { SimpleVisualizer } from "../../visualizers/SimpleVisualizer";
import { WSConnection } from "./WSConnection";



export class WebSocketsProtocol extends ProtocolHandler
{
	static ID = 'WebSockets';

	private connectionCount: number = 1;
	private connections: { [id: number]: WSConnection} = {};

	getMetadata(): IProtocolMetadata {
		const componentVerb: IComponent = {
			name: 'verb',
			required: true,
			type: IComponentTypes.Enum,
			allowedValues: [
				'Connect', // an http request with 'Upgrade'
				'Disconnect', // opcode 8 (connection close frame)
				'Ping', 'Pong', // opcodes 9, 10

				// frames (opcodes 1 for Text, 2 for Binary)
				'Message',

				// note: continuations don't receive their own transactions
			]
		};
		const componentUri: IComponent = {
			name: 'uri',
			type: IComponentTypes.String,
			required: false,
		};
		const componentBody: IComponent = {
			name: 'body',
			type: IComponentTypes.Bytes,
			required: false, // optional for Ping, Pong, Disconnect.
		};
		const componentCloseCode: IComponent = {
			name: 'closeCode',
			type: IComponentTypes.String,
			required: false,
			// 1000: Normal Closure
			// 1001: Going Away
			// 1002: Protocol error
			// 1003: Unsupported Data
			// 1004: ---Reserved----
			// 1005: No Status Rcvd
			// 1006: Abnormal Closure
			// 1007: Invalid frame payload data
			// 1008: Policy Violation
			// 1009: Message Too Big
			// 1010: Mandatory Ext
			// 1011: Internal Server Error
			// 1015: TLS handshake
		}

		return {
			id: WebSocketsProtocol.ID,
			isConnectionOriented: true,
			components: [
				// general
				componentVerb,
				componentBody,

				// for connection (all similar to http)
				// - uri (don't parse)
				componentUri,
				// - *tls
				// - *sub protocols (list of str)
				// - *protocol (response)
				// - *extensions (list of str)
				// - *advanced
				//   - use compression
				//   
				// - *headers

				// disconnect
				componentCloseCode,
			],
			defaultVisualizers: [
				SimpleVisualizer.ForComponent(WebSocketsProtocol.ID, componentVerb, {
					location: 'short',
					type: UITypes.Enum,
					name: 'verb',
					// 'Connect' is missing as it is not an option once the connection is established
					allowedValues: ['Message', 'Ping', 'Pong', 'Disconnect' ],
					contextType: 'outgoing',
				}, true),
				SimpleVisualizer.ForComponent(WebSocketsProtocol.ID, componentBody, 'extra', true),
				SimpleVisualizer.ForComponent(WebSocketsProtocol.ID, componentUri, 'short', false),
			],
		};
	}

	send(t: ITransaction, sourceId?: number): void {
		if (t.connectionId)
		{
			if (this.connections[t.connectionId])
			{
				this.connections[t.connectionId].send(t);
			}
		}
		else
		{
			let connectionId = this.connectionCount++;
			let connectionNew = new WSConnection(connectionId, sourceId!, {
				address: getComponent(t, 'uri'),
				// protocols?: string[];
				shouldCompress: false,
			});
			
			connectionNew.on('connected', () => this.trigger('connected', connectionId, t.id!, sourceId));
			connectionNew.on('message', (tRes: ITransaction) => this.trigger('response', tRes, sourceId));
			connectionNew.on('disconnected', () => this.trigger('disconnected', connectionId, sourceId));
			connectionNew.initialize();

			this.connections[connectionId] = connectionNew;
		}
	}

	getDefaultTransaction(connectionId?: number): ITransaction
	{
		if (!connectionId) {
			return {
				protocolId: WebSocketsProtocol.ID,
				state: ITransactionState.Pending,
				shortStatus: '',
				components: {
					'verb': 'Connect',
					'uri': 'wss://',
				}
			};
		} else {
			return {
				protocolId: WebSocketsProtocol.ID,
				connectionId,
				state: ITransactionState.Pending,
				shortStatus: '',
				components: {
					'verb': 'Message',
					'body': <BytesValue> { type: 'empty' },
				}
			};
		}
	}
}
