# VSConnect

[![Badge for version for Visual Studio Code extension](https://vsmarketplacebadge.apphb.com/version-short/jcoc611.vsconnect.svg?color=blue&style=flat-square&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=jcoc611.vsconnect) [![Installs](https://vsmarketplacebadge.apphb.com/installs-short/jcoc611.vsconnect.svg?color=blue&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=jcoc611.vsconnect) [![Status](https://img.shields.io/badge/status-beta-blue?color=blue&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=jcoc611.vsconnect) [![The MIT License](https://img.shields.io/badge/license-MIT-orange.svg?color=blue&style=flat-square)](http://opensource.org/licenses/MIT)

![Screenshot Preview of v0.3.1](docs/assets/screenshot-client-v0.2.8.gif)

VSConnect `("OSS - Connect")` is the ultimate network client for VS Code. It provides an interface
similar to a command line where you can submit network requests and receive network responses. It
comes with basic industry-standard Protocols such as HTTP, WebSockets, and DNS, and it also provides 
several extension points so you can add extra Protocols and Visualizers via separate VSCode extensions.

## Features
 - **HTTP and DNS:** Make REST calls, query for DNS records, and more!
 - **WebSockets:** Connect to websocket endpoints and exchange frames!
 - **Scripting:** Use JavaScript to compute values for your requests, even based on previous ones!
 - **Synergy:** Well integrated with the things you love about VS Code, like text editing, themes and customizations!

## Building
To build the extension:
```bash
npm install
npm run compile
```

And for dev testing you can run `npm run watch`

Either of these will create the necessary files in `dist/`. Use the launch configuration on VS Code
to execute the extension on the Extension Host.

## Contribute
Contributions, PRs and issues welcome! For new protocols and visualizers, you can either contribute
them directly to this repo, or create a separate extension and use the commands provided to add them
to the VSConnect UI *(TODO - not available yet, open an Issue if you are interested)*.

## Disclaimer
VSConnect is not affiliated with Visual Studio or Microsoft.

## LICENSE
The code and other assets in this repo are licensed under the MIT license, except for the VSConnect
logo and name.
