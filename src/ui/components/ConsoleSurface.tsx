import * as React from 'react';

import { IVisualization, IVisualizationItem, ITransaction } from '../../interfaces';
import { Transaction } from './Transaction';

interface ConsoleSurfaceProps {
	sendCurrentRequest: () => void;
	setProtocol: (protocolId: string) => void;
	updateUI: (viz: IVisualizationItem, currentTransaction: ITransaction) => void;

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
			sendCurrentRequest, setProtocol, updateUI
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

			return <Transaction
				index={index}
				readOnly={true}
				visualization={item}
				allProtocols={allProtocols}

				updateUI={updateUI}
				setProtocol={setProtocol}
				sendCurrentRequest={sendCurrentRequest} />;
		} );

		content.push(
			<Transaction
				index={++reqCount}
				readOnly={false}
				visualization={currentRequest}
				allProtocols={allProtocols}

				updateUI={updateUI}
				setProtocol={setProtocol}
				sendCurrentRequest={sendCurrentRequest} />
		);

		return <div id="content">{content}</div>;
	}
}
