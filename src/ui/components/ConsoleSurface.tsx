import * as React from 'react';

import { IVisualization, IVisualizationItem, ITransaction, OpenTextDocumentOptions, BytesValue } from '../../interfaces';
import { Transaction } from './Transaction';
// import { Interpreter } from './InterpreterHacky';

interface ConsoleSurfaceProps {
	sendRequest: (tId: number) => void;
	setProtocol: (protocolId: string) => void;
	updateUI: (vizItem: IVisualizationItem<any>, tId: number) => void;
	openTextDocument: (docOptions: OpenTextDocumentOptions, vizId: number, vizItem: IVisualizationItem<BytesValue>) => void;
	getFunctionPreview: (command: string) => Promise<IVisualizationItem<any> | null>;
	rerun: () => void;
	clear: () => void;

	currentRequest: IVisualization;
	history: IVisualization[];
	allProtocols: string[];
	rerunQueue?: IVisualization[];
}

export class ConsoleSurface extends React.Component<ConsoleSurfaceProps> {
	componentDidMount() {
		document.addEventListener('keypress', (e) => {
			if (e.target && e.target instanceof Element) {
				let target: Element = e.target;

				// TODO this logic is hardcoded and may be wrong. Currently, every keypress
				// on an element other than a text area will trigger key bindings.
				if (target.nodeName === 'TEXTAREA' || target.nodeName === 'BUTTON') {
					return;
				}
			}

			if (e.key === 'Enter') {
				this.props.sendRequest(this.props.currentRequest.transaction.id!);
			}
		});
	}

	cbOpenTextDocument = (viz: IVisualization): ((docOptions: OpenTextDocumentOptions, vizItem: IVisualizationItem<BytesValue>) => void) => {
		return (
			docOptions: OpenTextDocumentOptions,
			vizItem: IVisualizationItem<BytesValue>
		) => this.props.openTextDocument(docOptions, viz.transaction.id!, vizItem);
	}

	render() {
		// const history = this.props.history;
		const {
			history, currentRequest, rerunQueue, allProtocols,
			sendRequest, setProtocol, updateUI, getFunctionPreview,
			rerun, clear,
		} = this.props;

		let reqCount = 0;
		let resCount = 0;

		let content = history.map( (item, indexHistory) => {
			let index;
			if (item.context === 'outgoing') {
				index = reqCount++;
			} else {
				index = resCount++;
			}

			// TODO: Some of the method props not needed in this case, remove
			return <Transaction
				index={index}
				isCurrent={false}
				key={indexHistory}
				readOnly={item.context === 'incoming'}
				visualization={item}
				allProtocols={allProtocols}

				updateUI={(vizItem) => updateUI(vizItem, item.transaction.id!)}
				setProtocol={setProtocol}
				sendCurrentRequest={() => sendRequest(item.transaction.id!)}
				openTextDocument={this.cbOpenTextDocument(item)}
				getFunctionPreview={getFunctionPreview} />;
		} );

		let rerunContent: JSX.Element[] = [];
		if (rerunQueue !== undefined && rerunQueue.length > 0) {
			rerunContent = rerunQueue.map((item, index) => {
				// TODO: Some of the method props not needed in this case, remove
				return <Transaction
					index={index}
					key={index}
					readOnly={true}
					isCurrent={false}
					visualization={item}
					allProtocols={allProtocols}

					updateUI={(vizItem) => null}
					setProtocol={setProtocol}
					sendCurrentRequest={() => null}
					openTextDocument={this.cbOpenTextDocument(item)}
					getFunctionPreview={getFunctionPreview} />;
			});
		} else {
			content.push(
				<Transaction
					index={reqCount++}
					key={history.length}
					readOnly={false}
					isCurrent={true}
					visualization={currentRequest}
					allProtocols={allProtocols}

					updateUI={(vizItem) => updateUI(vizItem, currentRequest.transaction.id!)}
					setProtocol={setProtocol}
					sendCurrentRequest={() => sendRequest(currentRequest.transaction.id!)}
					openTextDocument={this.cbOpenTextDocument(currentRequest)}
					getFunctionPreview={getFunctionPreview} />
			);
		}

		return <div id="content">
			<div style={({'marginTop':'15px'})}>🧪 Thanks for trying out the <i>alpha</i> version of VSConnect! All feedback is welcome on <a target="_blank" href="https://github.com/jcoc611/vsconnect/issues">Github</a>.</div>
			{content}
			<div style={({'opacity': '0.6'})}>{rerunContent}</div>
		</div>;
	}
}
