import * as React from 'react';
import { ITransaction } from '../../interfaces';
import { Dropdown } from './forms/Dropdown';

interface RequestProps {
	sendCurrentRequest: () => void;
	updateRequest: ( i: number, t: ITransaction ) => void;

	transaction: ITransaction;
	isCurrent: boolean;
	index: number;
}

interface RequestState {
	openTab: string | null;
}

export class Request extends React.Component<RequestProps, RequestState> {

	state: RequestState = {
		openTab: null
	};

	// constructor( props: Readonly<RequestProps> ) {
	// 	super( props );
	// }

	sendRequest() : void {
		this.props.sendCurrentRequest();
	}

	updateEndpoint( event: React.ChangeEvent<HTMLInputElement> ) {
		let newTransaction = Object.assign({}, this.props.transaction, {
			endpoint: event.target.value
		} ) as ITransaction;
		this.props.updateRequest( this.props.index, newTransaction );
	}

	updateVerb = ( verbId: string | null ) => {
		if ( verbId === null ) {
			return;
		}

		let newTransaction = Object.assign({}, this.props.transaction, {
			verb: { verbId }
		} ) as ITransaction;
		this.props.updateRequest( this.props.index, newTransaction );
	}

	setOpenTab = (openTab: string) => {
		this.setState({ openTab });
	}

	render() {
		// let reqIndex = 1;
		// let protocol = 'HTTP(S)';
		// let verb = 'GET';

		const { index, transaction, isCurrent } = this.props;
		const { openTab } = this.state;

		const options = ['Query', 'Headers', 'Body', 'Auth'];

		let optionsLine, optionContent;
		if ( isCurrent ) {
			optionsLine = <div className="optionsLine">
				{options.map( (o) => <button
					onClick={() => this.setOpenTab(o)}
					className={(openTab === o)? 'selected': ''}
					>{o}</button> )}
			</div>;
		} else {
			optionsLine = <div className="optionsLine"></div>;
		}

		if (openTab !== null) {
			optionContent = <div className="optionContent">{openTab}</div>;
		} else {
			optionContent = <div className="optionContent"></div>;
		}

		// <span className="verb">{transaction.verb.verbId}</span>
		// <div className="suggestWidget">
		// 	<div className="suggestItem suggestItemActive">GET</div>
		// 	<div className="suggestItem">POST</div>
		// 	<div className="suggestItem">PUT</div>
		// 	<div className="suggestItem">DELETE</div>
		// </div>

		return <div className="request">
			<div className="var">$req{index}</div>
			<div className="prompt">{'❯'}</div>
			<div className="wrapper">
				<div className="consoleLine">
					<Dropdown disabled={!isCurrent} options={['HTTP']} value={transaction.protocolId} />
					<Dropdown disabled={!isCurrent} options={['GET', 'POST', 'PUT', 'DELETE']}
						value={transaction.verb.verbId}
						onChange={this.updateVerb} />
					<input id="currentInput" className="endpoint"
						type="text" autoFocus
						value={transaction.endpoint}
						onChange={this.updateEndpoint.bind(this)} />
					{(isCurrent)? <button onClick={this.sendRequest.bind(this)}>send</button>: null}
				</div>
				{optionsLine}
				{optionContent}
			</div>
		</div>;
	}
}