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
	extra: { [name: string]: JSX.Element };
}

export class Transaction extends React.Component<TransactionProps, TransactionState> {
	state: TransactionState;

	constructor(props: TransactionProps) {
		super(props);
		const isIncoming = (props.visualization.context === 'incoming');

		this.state = {
			isExpanded: true,
			openTab: (isIncoming)? this.getFirstExtraName(props): null
		};
	}

	componentWillReceiveProps(props: TransactionProps) {
		if (props.visualization.context === 'incoming' && this.state.openTab === null) {
			this.setState({ openTab: this.getFirstExtraName(props) });
		}
	}

	private getFirstExtraName(props: TransactionProps): string | null {
		let extraItems = props.visualization.items.filter( (i) => i.ui.location === "extra" );
		if (extraItems.length === 0) {
			return null;
		} else {
			console.log('selecting tab', extraItems[0].ui.name, props.visualization);
			return extraItems[0].ui.name;
		}
	}

	private getTransactionElements(): TransactionElements {
		let short: JSX.Element[] = [];
		let extra: { [name: string]: JSX.Element } = {};

		const {
			visualization,
			readOnly,
			allProtocols,
			sendCurrentRequest,
			setProtocol
		} = this.props;

		if (visualization.context === 'outgoing') {
			short.push(<Dropdown value={visualization.transaction.protocolId}
				allowedValues={allProtocols} readOnly={readOnly} onChange={setProtocol} />);
		}

		for (let item of visualization.items) {
			let itemElement = <VisualizationItem
				item={item} readOnly={readOnly} onChange={this.handleUIChange} />;

			if (item.ui.location === "short") {
				short.push(itemElement);
			} else {
				extra[item.ui.name] = itemElement;
			}
		}

		if (!readOnly) {
			short.push(<button onClick={sendCurrentRequest}>send</button>);
		}

		return { short, extra };
	}

	handleUIChange = (viz: IVisualizationItem): void => {
		this.props.updateUI(viz, this.props.visualization.transaction);
	}

	renderExtraTab = (extraName: string): JSX.Element => {
		return <button onClick={() => this.setOpenTab(extraName)}
			className={(this.state.openTab === extraName)? 'selected': ''}>{extraName}</button>;
	}

	setOpenTab = (openTab: string) => {
		this.setState({ openTab });
	}

	render() {
		const { isExpanded } = this.state;
		const { visualization, index } = this.props;
		const { short, extra } = this.getTransactionElements();
		const type = (visualization.context === 'incoming')? 'res': 'req';
		let optionContent: React.ReactNode;
		let optionsLine: React.ReactNode;

		if ( isExpanded ) {
			optionsLine = Object.keys(extra).map(this.renderExtraTab);
			if (this.state.openTab !== null) {
				optionContent = extra[this.state.openTab];
			}
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
