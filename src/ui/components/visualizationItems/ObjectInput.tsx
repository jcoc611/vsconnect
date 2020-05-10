'use strict';

import * as React from 'react';
import { AbstractItem } from './AbstractItem';

export class ObjectInput extends AbstractItem<object> {
	render() {
		const { value } = this.props;

		return <div className="objectInput">{JSON.stringify(value)}</div>;
	}
}
