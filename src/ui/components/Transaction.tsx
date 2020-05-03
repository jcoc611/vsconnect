import * as React from 'react';
import { IVisualization, IVisualizationItem, ITransaction, ITransactionState, UITypes, OpenTextDocumentOptions } from '../../interfaces';
import { VisualizationItem } from './VisualizationItem';
import { Dropdown } from './visualizationItems/Dropdown';
import classNames = require('classnames');

interface TransactionProps {
	sendCurrentRequest: () => void;
	setProtocol: (protocolId: string) => void;
	updateUI: (viz: IVisualizationItem, currentTransaction: ITransaction) => void;
	openTextDocument: (docOptions: OpenTextDocumentOptions, viz: IVisualizationItem) => void;

	allProtocols: string[];

	visualization: IVisualization;
	readOnly: boolean;
	index: number;
}

interface TransactionState {
	isExpanded: boolean;
	openTab: string | null;
}

interface TransactionElements {
	short: JSX.Element[];
	headers: IVisualizationItem[];
	extra: { [name: string]: JSX.Element };
}

export class Transaction extends React.Component<TransactionProps, TransactionState> {
	state: TransactionState;

	constructor(props: TransactionProps) {
		super(props);

		this.state = {
			// expanded by default unless it is a sent outgoing message
			isExpanded: !(props.visualization.context === 'outgoing' && props.readOnly),
			openTab: Transaction.getFirstExtraName(props),
		};
	}

	static getDerivedStateFromProps(
		propsNew: TransactionProps,
		stateOld: TransactionState
	): TransactionState | null {
		const { isExpanded, openTab } = stateOld;
		for (let item of propsNew.visualization.items) {
			if (item.ui.name === openTab)
				return null;
		}

		return { isExpanded, openTab: Transaction.getFirstExtraName(propsNew) };
	}

	private static getFirstExtraName(props: TransactionProps): string | null {
		let extraItems = props.visualization.items.filter( (i) => i.ui.location === 'extra' );
		if (extraItems.length === 0) {
			return null;
		} else {
			return extraItems[0].ui.name;
		}
	}

	toggleExpanded = () => {
		const { isExpanded, openTab } = this.state;
		this.setState({
			isExpanded: !isExpanded,
			openTab
		});
	}

	private getTransactionElements(): TransactionElements {
		let short: JSX.Element[] = [];
		let headers: IVisualizationItem[] = [];
		let extra: { [name: string]: JSX.Element } = {};

		const {
			visualization,
			readOnly,
			allProtocols,
			sendCurrentRequest,
			setProtocol,
			openTextDocument
		} = this.props;

		if (visualization.context === 'outgoing') {
			short.push(<Dropdown name='Protocol' key='Protocol'
				location={'short'}
				value={visualization.transaction.protocolId}
				allowedValues={allProtocols} readOnly={readOnly} onChange={setProtocol} />);
		} else {
			short.push(<span className='protocol' key='Protocol'>
				{visualization.transaction.protocolId}</span>);
		}

		for (let item of visualization.items) {
			let itemElement = <VisualizationItem
				item={item} readOnly={readOnly} onChange={this.handleUIChange}
				openTextDocument={openTextDocument} />;

			if (item.ui.location === 'short') {
				if (visualization.context === 'incoming') {
					if (item.ui.type === UITypes.Boolean) {
						short.push(
							<span className='shortItem' key={item.ui.name}>
								{itemElement}
							</span>
						);
					} else {
						short.push(
							<span className='shortItem' key={item.ui.name}>
								<span className='shortItem-name'>{item.ui.name}</span>
								{itemElement}
							</span>
						);
					}
				} else {
					short.push(
						<span className='shortItem' key={item.ui.name}>
							{itemElement}
						</span>
					);
				}
			} else {
				headers.push(item);
				extra[item.ui.name] = itemElement;
			}
		}

		if (!readOnly) {
			short.push(<button onClick={sendCurrentRequest} key='send'>send</button>);
		}

		return { short, headers, extra };
	}

	handleUIChange = (viz: IVisualizationItem): void => {
		this.props.updateUI(viz, this.props.visualization.transaction);
	}

	renderExtraTab = (item: IVisualizationItem): JSX.Element => {
		let count;
		if (item.ui.count)
			count = <span className='count'>{item.ui.count}</span>;

		return <button onClick={() => this.setOpenTab(item.ui.name)} key={`tab-${item.ui.name}`}
			className={(this.state.openTab === item.ui.name)? 'selected': ''}>{item.ui.name}{count}</button>;
	}

	renderShortTabPreview = (item: IVisualizationItem): JSX.Element => (
		<span className='shortItem' key={item.ui.name}>
			<span className='shortItem-name'>{item.ui.name}</span>
			<span>{item.ui.count}</span>
		</span>
	)

	setOpenTab = (openTab: string) => {
		this.setState({ isExpanded: this.state.isExpanded, openTab });
	}

	render() {
		const { isExpanded, openTab } = this.state;
		const { visualization, index, readOnly } = this.props;
		const { short, headers, extra } = this.getTransactionElements();
		const type = (visualization.context === 'incoming')? 'res': 'req';
		let optionContent: React.ReactNode;
		let optionsLine: JSX.Element[] = [];

		let content: JSX.Element;

		if ( isExpanded ) {
			optionsLine = headers.map(this.renderExtraTab);
			if (openTab !== null)
				optionContent = extra[openTab];
			content = <div className='wrapper'>
				<div className='consoleLine'>{short}</div>
				<div className='optionsLine'>{optionsLine}</div>
				<div className='optionContent'>{optionContent}</div>
			</div>;
		} else if (type === 'res') {
			let shortPlusHeaders = short.concat(headers.map(this.renderShortTabPreview));
			content = <div className='wrapper'>
				<div className='consoleLine'>{shortPlusHeaders}</div>
			</div>;
		} else {
			content = <div className='wrapper'>
				<div className='consoleLine'>{short}</div>
			</div>;
		}

		const resClasses = classNames({
			request: (type === 'req'),
			response: (type === 'res'),
			'is-error': (visualization.transaction.state === ITransactionState.Error),
			'is-pending': (visualization.transaction.state === ITransactionState.Pending),
			'is-success': (visualization.transaction.state === ITransactionState.Sent),
			'is-current': !readOnly
		});

		return <div className={resClasses}>
			<div className='var'>${type}{index}</div>
			<div className='prompt'>{(type === 'req')? '❯': '❮'}</div>
			<div className='expansionToggle' onClick={this.toggleExpanded}>{(isExpanded)? '🞃' : '🞂'}</div>
			{content}
		</div>;
	}
}
