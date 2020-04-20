'use strict';

import * as React from 'react';
import { AbstractItem } from './AbstractItem';

export class HTML extends AbstractItem<string> {
	render() {
		const { value } = this.props;

		let src = 'data:text/html;base64,' + Buffer.from(value, 'utf8').toString('base64');
		return <iframe sandbox={''} src={src} />;
	}
}
