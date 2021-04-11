// import * as vscode from 'vscode';
import { HTTP } from './protocols/HTTP/HTTP.protocol';
import { Services } from './Services';
import { DNSProtocol } from './protocols/DNS/DNS.protocol';
import { CookieStore } from './protocols/HTTP/stores/CookieStore';
import { UserAgentStore } from './protocols/HTTP/stores/UserAgentStore';
import { WebSocketsProtocol } from './protocols/WebSockets/WebSockets.protocol';

export function registerBuiltins(services: Services) {
	// TODO: add vscode commands so other extensions can call in as well, for example:
	// vscode.commands.executeCommand('vsconnect.registerProtocol', new HTTP());

	services.addProtocol(new HTTP());
	services.addProtocol(new DNSProtocol());
	services.addProtocol(new WebSocketsProtocol());

	services.addStore(new CookieStore());
	services.addStore(new UserAgentStore());
}
