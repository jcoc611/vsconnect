// import * as vscode from 'vscode';
import { HTTP } from './protocols/HTTP/HTTP.protocol';
import { Services } from './Services';
import { DNSProtocol } from './protocols/DNS/DNS.protocol';
import { CookieStore } from './protocols/HTTP/stores/CookieStore';

export function registerBuiltins(services: Services) {
	// TODO: add vscode commands so other extensions can call in as well, for example:
	// vscode.commands.executeCommand('vsconnect.registerProtocol', 'HTTP', new HTTP());

	services.addProtocol('HTTP', new HTTP());
	services.addProtocol('DNS', new DNSProtocol());

	services.addStore(new CookieStore());
}
