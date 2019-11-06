import * as React from 'react';

import { Request } from './Request';
import { Response } from './Response';
import { IPayload, ITransaction } from '../../interfaces';

interface ConsoleSurfaceProps {
	sendCurrentRequest: () => void;
	updateRequest: ( i: number, t: ITransaction ) => void;

	history: Array<ITransaction | IPayload>;
	lastReqId: number;
}

export class ConsoleSurface extends React.Component<ConsoleSurfaceProps, {}> {
	sendRequest() : void {

	}

	render() {
		const history = this.props.history;

		let reqCount = 0;
		let resCount = 0;

		let content = history.map( (item, i) => {
			if (item.type === 'Transaction') {
				return <Request index={++reqCount} transaction={item}
					sendCurrentRequest={this.props.sendCurrentRequest}
					updateRequest={this.props.updateRequest}
					isCurrent={this.props.lastReqId === reqCount} />
			} else {
				return <Response index={++resCount} payload={item} />
			}
		} );

		return <div id="content">
			{content}
		</div>;
	}
}
