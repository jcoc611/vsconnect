'use strict';

import { ProtocolHandler } from '../../ProtocolHandler';
import { ITransaction, IProtocolMetadata, IComponentTypes, UITypes, BytesValue, IComponent, ITransactionState } from '../../interfaces';

import { HTTPClient, getDefaultTimeout } from './HTTPClient';

import { QueryVisualizer } from "./visualizers/Query";
import { StatusTextVisualizer } from "./visualizers/StatusText";
import { URLVisualizer } from "./visualizers/URL";
import { TLSVisualizer } from "./visualizers/TLS";
import { AuthBasicVisualizer } from "./visualizers/AuthBasic";
import { AuthOAuth1Visualizer } from "./visualizers/AuthOauth1";
import { BodyPreviewVisualizer } from "./visualizers/BodyPreview";
import { BodyBinaryVisualizer } from "./visualizers/BodyBinary";
import { BodyUrlencodedVisualizer } from "./visualizers/BodyUrlencoded";
import { BodyMultipartVisualizer, MultipartValue } from "./visualizers/BodyMultipart";
import { CookiesVisualizer } from "./visualizers/Cookies";
import { BodyRawVisualizer } from './visualizers/BodyRaw';
import { SimpleVisualizer } from '../../visualizers/SimpleVisualizer';

export class HTTP extends ProtocolHandler {
	static ID = 'HTTP';

	getMetadata(): IProtocolMetadata {
		const componentVerb: IComponent = {
			name: 'verb',
			type: IComponentTypes.Enum,
			required: true,
			allowedValues: [
				'GET', 'HEAD', 'POST', 'PUT',
				'DELETE', 'CONNECT', 'OPTIONS',
				'TRACE', 'PATCH'
			],
		};
		const componentHost: IComponent = {
			name: 'host',
			type: IComponentTypes.String,
			required: true,
		};
		const componentPath: IComponent = {
			name: 'path',
			type: IComponentTypes.String,
			required: true,
		};
		const componentTLS: IComponent = {
			name: 'tls',
			type: IComponentTypes.Object,
			required: true,
			components: [
				{
					name: 'enabled',
					type: IComponentTypes.Boolean,
					// default: false,
					required: true
				},
				// TODO versions, cipher suites
			],
		};
		const componentBody: IComponent = {
			name: 'body',
			type: IComponentTypes.Bytes,
			required: true,
		};
		const componentHeaders: IComponent = {
			name: 'headers',
			type: IComponentTypes.KeyValues,
			required: false,
		};
		const componentVersion: IComponent = {
			name: 'version',
			type: IComponentTypes.String,
			required: true,
		};
		const componentDuration: IComponent = {
			name: 'duration',
			type: IComponentTypes.String,
			required: false,
		};
		const componentOptions: IComponent = {
			name: 'options',
			type: IComponentTypes.KeyValues,
			required: false,
		};

		return {
			id: HTTP.ID,
			isConnectionOriented: false,
			components: [
				componentVerb,
				componentHost,
				componentPath,
				componentTLS,
				componentBody,
				componentHeaders,
				componentVersion,
				componentDuration,
				componentOptions,
			],
			defaultVisualizers: [
				// short
				SimpleVisualizer.ForComponent(HTTP.ID, componentVerb, 'short'),
				// for requests only:
				new URLVisualizer(),
				new TLSVisualizer(),
				// for responses only:
				new StatusTextVisualizer(),
				SimpleVisualizer.ForComponent(HTTP.ID, componentDuration, {
					name: 'duration',
					location: 'short',
					type: UITypes.String,
					contextType: 'incoming'
				}),

				// extra
				new QueryVisualizer(),
				new BodyUrlencodedVisualizer(),
				new BodyMultipartVisualizer(),
				new BodyRawVisualizer(),
				new BodyBinaryVisualizer(),
				new BodyPreviewVisualizer(),
				SimpleVisualizer.ForComponent(HTTP.ID, componentHeaders, 'extra'),
				new CookiesVisualizer(),
				new AuthBasicVisualizer(),
				new AuthOAuth1Visualizer(),
				SimpleVisualizer.ForComponent(HTTP.ID, componentOptions, 'extra'),
			]
		};
	}

	send(t: ITransaction, sourceId?: number): void {
		HTTPClient.request(t).then( ( tRes: ITransaction ) => {
			this.trigger('response', tRes, sourceId);
		} ).catch( (err: any, tRes?: ITransaction) => {
			console.log('HTTP error', err);
			if (tRes !== undefined) {
				this.trigger('response', tRes, sourceId);
			}
		} );
	}

	getDefaultTransaction(connectionId?: number): ITransaction {
		return {
			protocolId: HTTP.ID,
			connectionId,
			state: ITransactionState.Pending,
			shortStatus: '',
			components: {
				'verb': 'GET',
				'host': '',
				'path': '',
				'tls': { enabled: false },
				'body': <BytesValue> { type: 'empty' },
				'headers': <[string, string][]> [
					// Hard-coded common chrome user agent.
					// TODO: better UI for selecting alternatives.
					['User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'],
					['Content-Length', 'auto'],
				],
				'version': '1.1',
				'duration': '',
				'options': <[string, string][]> [
					['timeout', getDefaultTimeout().toString() ]
				],
			}
		};
	}
}
