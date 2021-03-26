'use strict';

import { ProtocolHandler } from '../../ProtocolHandler';
import { ITransaction, IProtocolMetadata, IComponentTypes, UITypes, BytesValue } from '../../interfaces';

import { HTTPClient, getDefaultTimeout } from './HTTPClient';

import { QueryComponent } from "./components/Query";
import { StatusTextComponent } from "./components/StatusText";
import { URLComponent } from "./components/URL";
import { TLSComponent } from "./components/TLS";
import { AuthBasicComponent } from "./components/AuthBasic";
import { AuthOAuth1Component } from "./components/AuthOauth1";
import { BodyPreviewComponent } from "./components/BodyPreview";
import { BodyBinaryComponent } from "./components/BodyBinary";
import { BodyUrlencodedComponent } from "./components/BodyUrlencoded";
import { BodyMultipartComponent, MultipartValue } from "./components/BodyMultipart";
import { CookiesComponent } from "./components/Cookies";
import { BodyRawComponent } from './components/BodyRaw';

export class HTTP extends ProtocolHandler {
	async initialize(params: any[]): Promise<boolean> {
		return true; // no setup needed
	}

	getMetadata(): IProtocolMetadata {
		return {
			id: 'HTTP',
			components: [
				{
					name: 'verb',
					type: IComponentTypes.Enum,
					required: true,
					allowedValues: [
						'GET', 'HEAD', 'POST', 'PUT',
						'DELETE', 'CONNECT', 'OPTIONS',
						'TRACE', 'PATCH'
					],
					default: 'GET',
					ui: 'short'
				},
				{
					name: 'host',
					type: IComponentTypes.String,
					required: true,
					default: ''
				},
				{
					name: 'path',
					type: IComponentTypes.String,
					required: true,
					default: ''
				},
				{
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
				},
				new QueryComponent(),
				{
					name: 'body',
					type: IComponentTypes.Bytes,
					required: true,
					default: { type: 'empty' },
				},
				new BodyUrlencodedComponent(),
				new BodyMultipartComponent(),
				new BodyRawComponent(),
				new BodyBinaryComponent(),
				new BodyPreviewComponent(),
				{
					name: 'headers',
					type: IComponentTypes.KeyValues,
					required: false,
					default: [
						// Hard-coded common chrome user agent.
						// TODO: better UI for selecting alternatives.
						['User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'],
						['Content-Length', 'auto'],
					],
					ui: 'extra'
				},
				{
					name: 'version',
					type: IComponentTypes.String,
					required: true,
					default: '1.1'
				},
				new StatusTextComponent(),
				{
					name: 'duration',
					type: IComponentTypes.String,
					required: false,
					ui: {
						name: 'duration',
						location: 'short',
						type: UITypes.String,
						contextType: 'incoming'
					},
					default: '',
				},
				new URLComponent(),
				new TLSComponent(),
				new CookiesComponent(),
				new AuthBasicComponent(),
				new AuthOAuth1Component(),
				{
					name: 'options',
					type: IComponentTypes.KeyValues,
					required: false,
					default: [
						['timeout', getDefaultTimeout().toString() ]
					],
					ui: 'extra'
				},
			]
		};
	}

	do(t: ITransaction, sourceId?: number): void {
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
