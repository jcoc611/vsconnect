import * as React from 'react';
import { AbstractItem } from './AbstractItem';

export class StringInput extends AbstractItem<string> {
	render() {
		const { onChange, value, readOnly } = this.props;
		let onInputChange;

		if (onChange !== undefined) {
			onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value);
		}

		if (readOnly)
			return <span className="stringInput">{value}</span>

		return <input onChange={onInputChange} onContextMenu={this.openContextMenu} value={value} />;
	}
}
