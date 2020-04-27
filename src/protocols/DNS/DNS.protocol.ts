import { ITransaction, KeyValues, ITransactionState, IProtocolMetadata, IComponentTypes, UITypes, IComponent } from '../../interfaces';

import { ProtocolHandler } from '../../ProtocolHandler';
import { getComponent } from "../../utils/transactionTools";

import DnsClient from "./client"
import { IQuestion, RecordType, QuestionExtraType, RecordClass, IMessage, ResponseCode, IResourceRecord, QuestionType } from './client/interfaces';
import { Formats } from '../../utils/Formats';

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

function resourceRecordsToTable(rr: IResourceRecord[]): string[][] {
	return rr.map((r) => [
		r.name,
		recordTypeToStr[r.type],
		Formats.secondsToString(r.ttl),
		JSON.stringify(r.rdata)
	]);
}

export class DNSProtocol extends ProtocolHandler {

	static fromNativeResponse(msg: IMessage): ITransaction {
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

	async initialize(params: any[]): Promise<boolean> {
		return true; // no setup needed
	}

	getMetadata(): IProtocolMetadata {
		const questionComponents: IComponent[] = [
			{
				name: 'name',
				type: IComponentTypes.String,
				required: true,
				default: '',
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
				default: 'A',
			},
		];
		const recordComponents: IComponent[] = [
			{
				name: 'name',
				type: IComponentTypes.String,
				required: true,
				default: '',
			},
			{
				name: 'type',
				type: IComponentTypes.Enum,
				allowedValues: [
					'A', 'NS', 'MD', 'MF', 'CNAME', 'SOA', 'MB', 'MG', 'MR', 'NULL',
					'WKS', 'PTR', 'HINFO', 'MINFO', 'MX', 'TXT',
				],
				required: true,
				default: 'ALL',
			},
			{
				name: 'ttl',
				type: IComponentTypes.String,
				required: true,
				default: '',
			},
			{
				name: 'record',
				type: IComponentTypes.String,
				required: true,
				default: '',
			},
		];

		return {
			id: 'DNS',
			components: [
				{
					name: 'id',
					type: IComponentTypes.String,
					required: false,
					default: '',
				},
				{
					name: 'operation',
					type: IComponentTypes.Enum,
					required: true,
					allowedValues: [ 'QUERY', 'IQUERY', 'STATUS' ],
					default: 'QUERY',
					ui: {
						location: 'short',
						type: UITypes.Enum,
						name: 'operation',

						allowedValues: [ 'QUERY', 'IQUERY', 'STATUS' ],
						contextType: 'outgoing',
					},
				},
				{
					name: 'host',
					type: IComponentTypes.String,
					required: true,
					default: '',
					ui: 'short'
				},
				{
					name: 'authoritative',
					type: IComponentTypes.Boolean,
					required: false,
					default: false,
					ui: {
						location: 'short',
						name: 'authoritative',
						type: UITypes.Boolean,
						contextType: 'incoming'
					},
				},
				{
					name: 'truncated',
					type: IComponentTypes.Boolean,
					required: true,
					default: false,
					ui: {
						location: 'short',
						name: 'truncated',
						type: UITypes.Boolean,
						contextType: 'incoming'
					},
				},
				{
					name: 'use recursion',
					type: IComponentTypes.Boolean,
					required: false,
					default: false,
					ui: {
						location: 'short',
						name: 'use recursion',
						type: UITypes.Boolean,
						contextType: 'outgoing'
					},
				},
				{
					name: 'can recurse',
					type: IComponentTypes.Boolean,
					required: false,
					default: false,
					ui: {
						location: 'short',
						name: 'can recurse',
						type: UITypes.Boolean,
						contextType: 'incoming'
					},
				},
				{
					name: 'questions',
					type: IComponentTypes.Table,
					required: false,
					default: [],
					components: questionComponents,
					ui: {
						location: 'extra',
						name: 'questions',
						type: UITypes.Table,
						contextType: 'outgoing'
					},
				},
				{
					name: 'answers',
					type: IComponentTypes.Table,
					required: false,
					default: [],
					components: recordComponents,
					ui: {
						location: 'extra',
						name: 'answers',
						type: UITypes.Table,
						contextType: 'incoming'
					},
				},
				{
					name: 'nsRecords',
					type: IComponentTypes.Table,
					required: false,
					default: [],
					components: recordComponents,
					ui: {
						location: 'extra',
						name: 'nsRecords',
						type: UITypes.Table,
						contextType: 'incoming'
					},
				},
				{
					name: 'additionals',
					type: IComponentTypes.Table,
					required: false,
					default: [],
					components: recordComponents,
					ui: {
						location: 'extra',
						name: 'additionals',
						type: UITypes.Table,
						contextType: 'incoming'
					},
				},
			],
		};
	}

	do( transaction: ITransaction ): void {
		let questions: IQuestion[] = getComponent<[string, string][]>(transaction, 'questions').map(
			([name, typeStr]: [string, string]) => ({
				name,
				type: strToRecordType[typeStr],
				qClass: RecordClass.IN,
			})
		);

		let client = new DnsClient(getComponent<string>(transaction, 'host'));
		client.queryMulti(questions).then( (msg) => {
			this.trigger( 'response', DNSProtocol.fromNativeResponse(msg) );
		} )
	}
}
