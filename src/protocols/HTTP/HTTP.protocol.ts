'use strict';

import { ProtocolHandler } from '../../ProtocolHandler';
import { ITransaction, IProtocolMetadata, IComponentTypes, UITypes, BytesValue, IComponent } from '../../interfaces';

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
	async initialize(params: any[]): Promise<boolean> {
		return true; // no setup needed
	}

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
			default: 'GET',
		};
		const componentHost: IComponent = {
			name: 'host',
			type: IComponentTypes.String,
			required: true,
			default: ''
		};
		const componentPath: IComponent = {
			name: 'path',
			type: IComponentTypes.String,
			required: true,
			default: ''
		};
		const componentTLS: IComponent = {
			name: 'tls',
			type: IComponentTypes.Object,
			required: true,
			default: {
				enabled: false
			},
			components: [
				{
					name: 'enabled',
					type: IComponentTypes.Boolean,
					default: false,
					required: true
				},
				// TODO versions, cipher suites
			],
		};
		const componentBody: IComponent = {
			name: 'body',
			type: IComponentTypes.Bytes,
			required: true,
			default: { type: 'empty' },
		};
		const componentHeaders: IComponent = {
			name: 'headers',
			type: IComponentTypes.KeyValues,
			required: false,
			default: [
				// Hard-coded common chrome user agent.
				// TODO: better UI for selecting alternatives.
				['User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'],
				['Content-Length', 'auto'],
			],
		};
		const componentVersion: IComponent = {
			name: 'version',
			type: IComponentTypes.String,
			required: true,
			default: '1.1'
		};
		const componentDuration: IComponent = {
			name: 'duration',
			type: IComponentTypes.String,
			required: false,
			default: '',
		};
		const componentOptions: IComponent = {
			name: 'options',
			type: IComponentTypes.KeyValues,
			required: false,
			default: [
				['timeout', getDefaultTimeout().toString() ]
			],
		};

		return {
			id: 'HTTP',
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
				SimpleVisualizer.ForComponent('HTTP', componentVerb, 'short'),
				// for requests only:
				new URLVisualizer(),
				new TLSVisualizer(),
				// for responses only:
				new StatusTextVisualizer(),
				SimpleVisualizer.ForComponent('HTTP', componentDuration, {
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
				SimpleVisualizer.ForComponent('HTTP', componentHeaders, 'extra'),
				new CookiesVisualizer(),
				new AuthBasicVisualizer(),
				new AuthOAuth1Visualizer(),
				SimpleVisualizer.ForComponent('HTTP', componentOptions, 'extra'),
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
}
