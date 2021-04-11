import { ITransaction, KeyValues, ITransactionState, IProtocolMetadata, IComponentTypes, UITypes, IComponent, BytesValue } from '../../interfaces';

import { ProtocolHandler } from '../../ProtocolHandler';
import { getComponent } from "../../utils/transactionTools";

import DnsClient from "./client"
import { IQuestion, RecordType, QuestionExtraType, RecordClass, IMessage, ResponseCode, IResourceRecord, QuestionType } from './client/interfaces';
import { Formats } from '../../utils/Formats';
import { SimpleVisualizer } from '../../visualizers/SimpleVisualizer';

const recordTypeToStr: { [key in RecordType]: string } = {
	[RecordType.A]     : 'A',
	[RecordType.NS]    : 'NS',
	[RecordType.MD]    : 'MD (obsolete)',
	[RecordType.MF]    : 'MF (obsolete)',
	[RecordType.CNAME] : 'CNAME',
	[RecordType.SOA]   : 'SOA',
	[RecordType.MB]    : 'MB',
	[RecordType.MG]    : 'MG',
	[RecordType.MR]    : 'MR',
	[RecordType.NULL]  : 'NULL',
	[RecordType.WKS]   : 'WKS',
	[RecordType.PTR]   : 'PTR',
	[RecordType.HINFO] : 'HINFO',
	[RecordType.MINFO] : 'MINFO',
	[RecordType.MX]    : 'MX',
	[RecordType.TXT]   : 'TXT',
};

const strToRecordType: { [key: string]: QuestionType } = {
	'A'    : RecordType.A,
	'NS'   : RecordType.NS,
	'MD'   : RecordType.MD,
	'MF'   : RecordType.MF,
	'CNAME': RecordType.CNAME,
	'SOA'  : RecordType.SOA,
	'MB'   : RecordType.MB,
	'MG'   : RecordType.MG,
	'MR'   : RecordType.MR,
	'NULL' : RecordType.NULL,
	'WKS'  : RecordType.WKS,
	'PTR'  : RecordType.PTR,
	'HINFO': RecordType.HINFO,
	'MINFO': RecordType.MINFO,
	'MX'   : RecordType.MX,
	'TXT'  : RecordType.TXT,

	'ALL'  : QuestionExtraType.ALL,
	'AXFR' : QuestionExtraType.AXFR,
	'MAILA': QuestionExtraType.MAILA,
	'MAILB': QuestionExtraType.MAILB,
};

function resourceRecordsToTable(rr: IResourceRecord[]): any[][] {
	return rr.map((r) => [
		r.name,
		recordTypeToStr[r.type],
		Formats.secondsToString(r.ttl),
		r.rdata
	]);
}

export class DNSProtocol extends ProtocolHandler {
	static ID = 'DNS';

	static fromNativeResponse(tReq: ITransaction, msg: IMessage): ITransaction {
		let shortStatus: string;

		switch (msg.header.rcode) {
			case ResponseCode.OK:
				shortStatus = "OK";
				break;
			case ResponseCode.FormatErr:
				shortStatus = "Bad Request: Format Error";
				break;
			case ResponseCode.ServerErr:
				shortStatus = "Server Failure";
				break;
			case ResponseCode.NotFound:
				shortStatus = "Domain Not Found";
				break;
			case ResponseCode.NotImpl:
				shortStatus = "Operation Not Supported";
				break;
			case ResponseCode.Refused:
				shortStatus = "Server Refused";
				break;

			default:
				shortStatus = "Unknown";
		}

		let state: ITransactionState;

		if (msg.header.rcode !== ResponseCode.OK || msg.header.tc) {
			state = ITransactionState.Error;
		} else {
			state = ITransactionState.Sent;
		}

		let response: ITransaction = {
			responseTo: tReq.id,
			protocolId: 'DNS',
			state: state,
			shortStatus: shortStatus,
			components: {
				'id': msg.header.id,
				'authoritative': msg.header.aa,
				'truncated': msg.header.tc,
				'can recurse': msg.header.ra,
				'answers': resourceRecordsToTable(msg.answers),
				'nsRecords': resourceRecordsToTable(msg.authorities),
				'additionals': resourceRecordsToTable(msg.additionals),
			},
		};

		return response;
	}

	getMetadata(): IProtocolMetadata {
		const questionComponents: IComponent[] = [
			{
				name: 'name',
				type: IComponentTypes.String,
				required: true,
				// default: '',
			},
			{
				name: 'type',
				type: IComponentTypes.Enum,
				allowedValues: [
					'ALL',
					'A', 'NS', 'MD', 'MF', 'CNAME', 'SOA', 'MB', 'MG', 'MR', 'NULL',
					'WKS', 'PTR', 'HINFO', 'MINFO', 'MX', 'TXT', 'AXFR', 'MAILB',
					'MAILA',
				],
				required: true,
				// default: 'A',
			},
		];
		const recordComponents: IComponent[] = [
			{
				name: 'name',
				type: IComponentTypes.String,
				required: true,
				// default: '',
			},
			{
				name: 'type',
				type: IComponentTypes.Enum,
				allowedValues: [
					'A', 'NS', 'MD', 'MF', 'CNAME', 'SOA', 'MB', 'MG', 'MR', 'NULL',
					'WKS', 'PTR', 'HINFO', 'MINFO', 'MX', 'TXT',
				],
				required: true,
				// default: 'ALL',
			},
			{
				name: 'ttl',
				type: IComponentTypes.String,
				required: true,
				// default: '',
			},
			{
				name: 'record',
				type: IComponentTypes.Object,
				required: true,
				// default: null,
			},
		];

		const componentId: IComponent = {
			name: 'id',
			type: IComponentTypes.String,
			required: false,
		};
		const componentOperation: IComponent = {
			name: 'operation',
			type: IComponentTypes.Enum,
			required: true,
			allowedValues: [ 'QUERY', 'IQUERY', 'STATUS' ],
		};
		const componentHost: IComponent = {
			name: 'host',
			type: IComponentTypes.String,
			required: true,
		};
		const componentAuthoritative: IComponent = {
			name: 'authoritative',
			type: IComponentTypes.Boolean,
			required: false,
		};
		const componentTruncated: IComponent = {
			name: 'truncated',
			type: IComponentTypes.Boolean,
			required: true,
		};
		const componentUseRecursion: IComponent = {
			name: 'use recursion',
			type: IComponentTypes.Boolean,
			required: false,
		};
		const componentCanRecurse: IComponent = {
			name: 'can recurse',
			type: IComponentTypes.Boolean,
			required: false,
		};
		const componentQuestions: IComponent = {
			name: 'questions',
			type: IComponentTypes.Table,
			required: false,
			components: questionComponents,
		};
		const componentAnswers: IComponent = {
			name: 'answers',
			type: IComponentTypes.Table,
			required: false,
			components: recordComponents,
		};
		const componentNsRecords: IComponent = {
			name: 'nsRecords',
			type: IComponentTypes.Table,
			required: false,
			components: recordComponents,
		};
		const componentAdditionals: IComponent = {
			name: 'additionals',
			type: IComponentTypes.Table,
			required: false,
			components: recordComponents,
		};

		return {
			id: DNSProtocol.ID,
			isConnectionOriented: false,
			components: [
				componentId,
				componentOperation,
				componentHost,
				componentAuthoritative,
				componentTruncated,
				componentUseRecursion,
				componentCanRecurse,
				componentQuestions,
				componentAnswers,
				componentNsRecords,
				componentAdditionals,
			],
			defaultVisualizers: [
				SimpleVisualizer.ForComponent(DNSProtocol.ID, componentOperation, {
					location: 'short',
					type: UITypes.Enum,
					name: 'operation',
	
					allowedValues: [ 'QUERY', 'IQUERY', 'STATUS' ],
					contextType: 'outgoing',
				}),
				SimpleVisualizer.ForComponent(DNSProtocol.ID, componentHost, 'short'),
				SimpleVisualizer.ForComponent(DNSProtocol.ID, componentAuthoritative, {
					location: 'short',
					name: 'authoritative',
					type: UITypes.Boolean,
					contextType: 'incoming'
				}),
				SimpleVisualizer.ForComponent(DNSProtocol.ID, componentTruncated, {
					location: 'short',
					name: 'truncated',
					type: UITypes.Boolean,
					contextType: 'incoming'
				}),
				SimpleVisualizer.ForComponent(DNSProtocol.ID, componentUseRecursion, {
					location: 'short',
					name: 'use recursion',
					type: UITypes.Boolean,
					contextType: 'outgoing'
				}),
				SimpleVisualizer.ForComponent(DNSProtocol.ID, componentCanRecurse, {
					location: 'short',
					name: 'can recurse',
					type: UITypes.Boolean,
					contextType: 'incoming'
				}),
				SimpleVisualizer.ForComponent(DNSProtocol.ID, componentQuestions, {
					location: 'extra',
					name: 'questions',
					type: UITypes.Table,
					contextType: 'outgoing'
				}),
				SimpleVisualizer.ForComponent(DNSProtocol.ID, componentAnswers, {
					location: 'extra',
					name: 'answers',
					type: UITypes.Table,
					contextType: 'incoming'
				}),
				SimpleVisualizer.ForComponent(DNSProtocol.ID, componentNsRecords, {
					location: 'extra',
					name: 'nsRecords',
					type: UITypes.Table,
					contextType: 'incoming'
				}),
				SimpleVisualizer.ForComponent(DNSProtocol.ID, componentAdditionals, {
					location: 'extra',
					name: 'additionals',
					type: UITypes.Table,
					contextType: 'incoming'
				}),
			]
		};
	}

	send(tReq: ITransaction, sourceId?: number): void {
		let questions: IQuestion[] = getComponent<[string, string][]>(tReq, 'questions').map(
			([name, typeStr]: [string, string]) => ({
				name,
				type: strToRecordType[typeStr],
				qClass: RecordClass.IN,
			})
		);

		let client = new DnsClient(getComponent<string>(tReq, 'host'));
		client.queryMulti(questions).then((msg) => {
			this.trigger('response', DNSProtocol.fromNativeResponse(tReq, msg), sourceId);
		});
	}

	getDefaultTransaction(connectionId?: number): ITransaction {
		return {
			protocolId: DNSProtocol.ID,
			connectionId,
			state: ITransactionState.Pending,
			shortStatus: '',
			components: {
				'id': '',
				'operation': 'QUERY',
				'host': '',
				// 'authoritative': false,
				// 'truncated': false,
				'use recursion': false,
				// 'can recurse': false,
				'questions': [],
				'answers': [],
				'nsRecords': [],
				'additionals': [],
			}
		};
	}
}
