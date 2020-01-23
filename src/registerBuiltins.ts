// import * as vscode from 'vscode';
import { HTTP } from './protocols/HTTP/HTTP.protocol';
import { Services } from './Services';
import { DNSProtocol } from './protocols/DNS/DNS.protocol';

export function registerBuiltins(services: Services) {
    // TODO
    // vscode.commands.executeCommand('vsconnect.registerProtocol', HTTP);
    services.addProtocol('HTTP', new HTTP());
    services.addProtocol('DNS', new DNSProtocol());
}
