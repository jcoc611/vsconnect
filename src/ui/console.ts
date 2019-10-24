import { IProtocol, IPayload } from '../interfaces';

import { Payload } from '../payloads/Payload';
import { WebViewServices } from './utils/WebViewServices';

var currentInput : HTMLInputElement = document.getElementById( 'currentInput' ) as HTMLInputElement;
var services : WebViewServices = WebViewServices.GetInstance();

window.addEventListener( 'keydown', function() {
	if ( currentInput !== document.activeElement ) {
		currentInput!.focus();
	}
} )

function sendRequest() {
	// @ts-ignore allow global services
	window.services.getProtocol( 'HTTP' ).then( (httpService) => {
		if ( httpService === null ) {
			throw new Error( 'ups' );
		}

		httpService.do( 'GET', new Payload( currentInput!.value ) ).then( (res: Payload) => {
			let text: string = res.body;
			let ele = document.createElement( 'div' );
			ele.className = 'response';
			ele.innerHTML = `<div class="metadata">
				<span>Status </span>
				<span style="color: var(--vscode-terminal-ansiBrightGreen);">200 OK</span>
			</div><div class="body">${text}</div>`;

			document.body.appendChild( ele );
		} )
	} )
}

// @ts-ignore allow global sendRequest
window.sendRequest = sendRequest;
// @ts-ignore allow global services
window.services = services;
