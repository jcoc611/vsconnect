import * as React from 'react';
import { IPayload } from '../../interfaces';
import classNames = require('classnames');

interface ResponseProps {
	payload: IPayload;
	index: number;
}

export class Response extends React.Component<ResponseProps, {}> {

	constructor( props: Readonly<ResponseProps> ) {
		super( props );
	}

	render() {
		const { index, payload } = this.props;

		const shortStatusClass = ( payload.isError )? 'metadata-error': 'metadata-success';

		const resClasses = classNames({
			response: true,
			'is-error': payload.isError,
			'is-pending': payload.isPending,
			'is-success': !payload.isError
		});

		// style="color: var(--vscode-terminal-ansiBrightGreen);"
		return <div className={resClasses}>
			<div className="var">$res{index}</div>
			<div className="prompt"></div>
			<div className="wrapper">
				<div className="metadata">
					<b>Status </b>
					<span className={shortStatusClass}>{payload.shortStatus}</span>
				</div>
				<textarea readOnly className="body" value={payload.body} />
			</div>
		</div>;
	}
}
