import * as React from 'react';
import { IVisualization, IVisualizationItem, ITransaction, ITransactionState } from '../../interfaces';
import { VisualizationItem } from './VisualizationItem';
import { Dropdown } from './visualizationItems/Dropdown';
import classNames = require('classnames');

interface TransactionProps {
	sendCurrentRequest: () => void;
	setProtocol: (protocolId: string) => void;
	updateUI: (viz: IVisualizationItem, currentTransaction: ITransaction) => void;

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
			isExpanded: true,
			openTab: this.getFirstExtraName(props)
		};
	}

	componentWillReceiveProps(props: TransactionProps) {
		const { isExpanded } = this.state;
		for (let item of props.visualization.items) {
			if (item.ui.name === this.state.openTab)
				return;
		}

		this.setState({ isExpanded, openTab: this.getFirstExtraName(props) });
	}

	private getFirstExtraName(props: TransactionProps): string | null {
		let extraItems = props.visualization.items.filter( (i) => i.ui.location === "extra" );
		if (extraItems.length === 0) {
			return null;
		} else {
			return extraItems[0].ui.name;
		}
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
			setProtocol
		} = this.props;

		if (visualization.context === 'outgoing') {
			short.push(<Dropdown name='Protocols' key='Protocols'
				value={visualization.transaction.protocolId}
				allowedValues={allProtocols} readOnly={readOnly} onChange={setProtocol} />);
		} else {
			short.push(<span>{visualization.transaction.protocolId}</span>);
		}

		for (let item of visualization.items) {
			let itemElement = <VisualizationItem
				key={item.ui.name}
				item={item} readOnly={readOnly} onChange={this.handleUIChange} />;

			if (item.ui.location === "short") {
				short.push(itemElement);
			} else {
				headers.push(item);
				extra[item.ui.name] = itemElement;
			}
		}

		if (!readOnly) {
			short.push(<button onClick={sendCurrentRequest}>send</button>);
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

		return <button onClick={() => this.setOpenTab(item.ui.name)}
			className={(this.state.openTab === item.ui.name)? 'selected': ''}>{[item.ui.name, count]}</button>;
	}

	setOpenTab = (openTab: string) => {
		this.setState({ isExpanded: this.state.isExpanded, openTab });
	}

	render() {
		const { isExpanded, openTab } = this.state;
		const { visualization, index } = this.props;
		const { short, headers, extra } = this.getTransactionElements();
		const type = (visualization.context === 'incoming')? 'res': 'req';
		let optionContent: React.ReactNode;
		let optionsLine: JSX.Element[] = [];

		if ( isExpanded ) {
			optionsLine = headers.map(this.renderExtraTab);
			if (openTab !== null)
				optionContent = extra[openTab];
		}

		const resClasses = classNames({
			request: (type === 'req'),
			response: (type === 'res'),
			'is-error': (visualization.transaction.state === ITransactionState.Error),
			'is-pending': (visualization.transaction.state === ITransactionState.Pending),
			'is-success': (visualization.transaction.state === ITransactionState.Sent)
		});

		return <div className={resClasses}>
			<div className="var">${type}{index}</div>
			<div className="prompt">{(type === 'req')? '❯': ''}</div>
			<div className="wrapper">
				<div className="consoleLine">{short}</div>
				<div className="optionsLine">{optionsLine}</div>
				<div className="optionContent">{optionContent}</div>
			</div>
		</div>;
	}
}
