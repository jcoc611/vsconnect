import * as React from 'react';
import { IVisualization, IVisualizationItem, ITransaction, ITransactionState, UITypes, OpenTextDocumentOptions, BytesValue } from '../../interfaces';
import { VisualizationItem } from './VisualizationItem';
import { Dropdown } from './visualizationItems/Dropdown';
import classNames = require('classnames');

interface TransactionProps {
	sendCurrentRequest: () => void;
	setProtocol: (protocolId: string) => void;
	updateUI: (viz: IVisualizationItem<any>, currentTransaction: ITransaction) => void;
	openTextDocument: (docOptions: OpenTextDocumentOptions, viz: IVisualizationItem<BytesValue>) => void;
	getCommandPreview: (command: string) => Promise<IVisualizationItem<any> | null>;

	allProtocols: string[];

	visualization: IVisualization;
	readOnly: boolean;
	index: number;
}

interface TransactionContentProps {
	handleUIChange: (viz: IVisualizationItem<any>) => void;
	openTextDocument: (docOptions: OpenTextDocumentOptions, viz: IVisualizationItem<BytesValue>) => void;
	getCommandPreview: (command: string) => Promise<IVisualizationItem<any> | null>;

	itemsExtra: IVisualizationItem<any>[];
	readOnly: boolean;
}

interface TransactionState {
	isExpanded: boolean;
}

interface TransactionContentState {
	openTab: string | null;
}

class TransactionContent extends React.Component<TransactionContentProps, TransactionContentState> {
	state: TransactionContentState;

	constructor(props: TransactionContentProps) {
		super(props);

		this.state = {
			openTab: TransactionContent.getFirstExtraName(props),
		}
	}

	static getDerivedStateFromProps(
		propsNew: TransactionContentProps,
		stateOld: TransactionContentState
	): TransactionContentState | null {
		const { openTab } = stateOld;
		for (let item of propsNew.itemsExtra) {
			if (item.ui.name === openTab)
				return null;
		}

		return { openTab: TransactionContent.getFirstExtraName(propsNew) };
	}

	private static getFirstExtraName(props: TransactionContentProps): string | null {
		const { itemsExtra } = props;
		if (itemsExtra.length === 0) {
			return null;
		} else {
			return itemsExtra[0].ui.name;
		}
	}

	setOpenTab = (openTab: string) => {
		this.setState({ openTab });
	}

	renderExtraTab(item: IVisualizationItem<any>): JSX.Element {
		let count;
		if (item.ui.count)
			count = <span className='count'>{item.ui.count}</span>;

		return <button onClick={() => this.setOpenTab(item.ui.name)} key={`tab-${item.ui.name}`}
			className={(this.state.openTab === item.ui.name)? 'selected': ''}>{item.ui.name}{count}</button>;
	}

	render() {
		const { openTab } = this.state;
		const {
			itemsExtra, readOnly,
			handleUIChange, openTextDocument, getCommandPreview
		} = this.props;

		let optionContent: React.ReactNode;
		let optionsLine: JSX.Element[] = [];

		for (let item of itemsExtra) {
			optionsLine.push(this.renderExtraTab(item));
			if (item.ui.name === openTab) {
				optionContent = <VisualizationItem
					item={item} readOnly={readOnly}
					onChange={handleUIChange}
					openTextDocument={openTextDocument}
					getCommandPreview={getCommandPreview} />;
			}
		}

		return <div className='optionsWrapper'>
			<div className='optionsLine'>{optionsLine}</div>
			<div className='optionContent'>{optionContent}</div>
		</div>;
	}
}

export class Transaction extends React.Component<TransactionProps, TransactionState> {
	state: TransactionState;

	constructor(props: TransactionProps) {
		super(props);

		this.state = {
			// expanded by default unless it is a sent outgoing message
			isExpanded: !(props.visualization.context === 'outgoing' && props.readOnly),
		};
	}

	toggleExpanded = () => {
		const { isExpanded } = this.state;
		this.setState({
			isExpanded: !isExpanded,
		});
	}

	renderShort = (item: IVisualizationItem<any>): JSX.Element => {
		const {
			visualization,
			readOnly,
			openTextDocument,
			getCommandPreview
		} = this.props;

		let itemElement = <VisualizationItem
			item={item} readOnly={readOnly} onChange={this.handleUIChange}
			openTextDocument={openTextDocument}
			getCommandPreview={getCommandPreview} />;
		if (visualization.context === 'incoming') {
			if (item.ui.type === UITypes.Boolean) {
				return <span className='shortItem' key={item.ui.name}>
					{itemElement}
				</span>;
			} else {
				return <span className='shortItem' key={item.ui.name}>
					<span className='shortItem-name'>{item.ui.name}</span>
					{itemElement}
				</span>;
			}
		} else {
			return <span className='shortItem' key={item.ui.name}>
				{itemElement}
			</span>;
		}
	}

	handleUIChange = (viz: IVisualizationItem<any>): void => {
		this.props.updateUI(viz, this.props.visualization.transaction);
	}

	renderShortTabPreview = (item: IVisualizationItem<any>): JSX.Element => (
		<span className='shortItem' key={item.ui.name}>
			<span className='shortItem-name'>{item.ui.name}</span>
			<span>{item.ui.count}</span>
		</span>
	)

	render() {
		const { isExpanded } = this.state;
		const {
			visualization, index, readOnly, allProtocols,
			setProtocol, sendCurrentRequest, openTextDocument, getCommandPreview
		} = this.props;
		const type = (visualization.context === 'incoming')? 'res': 'req';

		let itemsExtra: IVisualizationItem<any>[] = [];
		let short: JSX.Element[] = [];

		if (visualization.context === 'outgoing') {
			short.push(<Dropdown name='Protocol' key='Protocol'
				location={'short'}
				value={visualization.transaction.protocolId}
				allowedValues={allProtocols} readOnly={readOnly} onChange={setProtocol}
				getCommandPreview={getCommandPreview} />);
		} else {
			short.push(<span className='protocol' key='Protocol'>
				{visualization.transaction.protocolId}</span>);
		}

		for (let item of visualization.items) {
			if (item.ui.location === 'short') {
				short.push(this.renderShort(item));
			} else {
				itemsExtra.push(item);
			}
		}

		if (!readOnly) {
			short.push(<button onClick={sendCurrentRequest} key='send'>send</button>);
		}

		if (!isExpanded && type === 'res') {
			short = short.concat(itemsExtra.map(this.renderShortTabPreview));
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
			<div className='var'>{`$${type}[${index}]`}</div>
			<div className='prompt'>{(type === 'req')? '❯': '❮'}</div>
			<div className='expansionToggle' onClick={this.toggleExpanded}>{(isExpanded)? '🞃' : '🞂'}</div>
			<div className='wrapper'>
				<div className='consoleLine'>{short}</div>
				{(isExpanded)?
					<TransactionContent itemsExtra={itemsExtra} readOnly={readOnly}
						handleUIChange={this.handleUIChange}
						getCommandPreview={getCommandPreview}
						openTextDocument={openTextDocument} />
					: null
				}
			</div>
		</div>;
	}
}
