import * as vscode from 'vscode';
import { HTTP } from './protocols/HTTP/HTTP.protocol';

export function registerBuiltins() {
    vscode.commands.executeCommand('vsconnect.registerProtocol', HTTP);
}
