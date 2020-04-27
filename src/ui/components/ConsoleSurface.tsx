import * as React from 'react';

import { IVisualization, IVisualizationItem, ITransaction, OpenTextDocumentOptions } from '../../interfaces';
import { Transaction } from './Transaction';

interface ConsoleSurfaceProps {
	sendCurrentRequest: () => void;
	setProtocol: (protocolId: string) => void;
	updateUI: (viz: IVisualizationItem, currentTransaction: ITransaction) => void;
	openTextDocument: (docOptions: OpenTextDocumentOptions, viz: IVisualizationItem) => void;

	currentRequest: IVisualization;
	history: IVisualization[];
	allProtocols: string[];
}

export class ConsoleSurface extends React.Component<ConsoleSurfaceProps, {}> {
	componentDidMount() {
		document.addEventListener('keypress', (e) => {
			if (e.target && e.target instanceof Element) {
				let target: Element = e.target;

				// TODO this logic is hardcoded and may be wrong. Currently, every keypress
				// on an element other than a text area will trigger key bindings.
				if (target.nodeName === 'TEXTAREA') {
					return;
				}
			}

			if (e.key === 'Enter') {
				this.props.sendCurrentRequest();
			}
		});
	}

	render() {
		// const history = this.props.history;
		const {
			history, currentRequest, allProtocols,
			sendCurrentRequest, setProtocol, updateUI, openTextDocument
		} = this.props;

		let reqCount = 0;
		let resCount = 0;

		let content = history.map( (item) => {
			let index;
			if (item.context === 'outgoing') {
				index = ++reqCount;
			} else {
				index = ++resCount;
			}

			// TODO: Some of the method props not needed in this case, remove
			return <Transaction
				index={index}
				key={reqCount + resCount}
				readOnly={true}
				visualization={item}
				allProtocols={allProtocols}

				updateUI={updateUI}
				setProtocol={setProtocol}
				sendCurrentRequest={sendCurrentRequest}
				openTextDocument={openTextDocument} />;
		} );

		content.push(
			<Transaction
				index={++reqCount}
				key={reqCount + resCount}
				readOnly={false}
				visualization={currentRequest}
				allProtocols={allProtocols}

				updateUI={updateUI}
				setProtocol={setProtocol}
				sendCurrentRequest={sendCurrentRequest}
				openTextDocument={openTextDocument} />
		);

		return <div id="content">
			<div style={({'marginTop':'15px'})}>🧪 Thanks for trying out the <i>alpha</i> version of VSConnect! All feedback is welcome on <a target="_blank" href="https://github.com/jcoc611/vsconnect/issues">Github</a>.</div>
			{content}
		</div>;
	}
}
