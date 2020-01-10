import * as React from 'react';
import { AbstractItem } from './AbstractItem';

export class Textarea extends AbstractItem<string> {
	render() {
		const { onChange, value, readOnly } = this.props;
		let onInputChange;
		if (onChange !== undefined) {
			onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value);
		}

		return <textarea onChange={onInputChange} value={value} readOnly={readOnly} />;
	}
}
