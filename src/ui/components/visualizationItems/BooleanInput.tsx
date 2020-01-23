import * as React from 'react';
import { AbstractItem } from './AbstractItem';

export class BooleanInput extends AbstractItem<boolean> {
	render() {
		const { onChange, name, value, readOnly } = this.props;
		let onInputChange;
		if (onChange !== undefined) {
			onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked);
		}

		return <label>
			<input type="checkbox" onChange={onInputChange} checked={value} readOnly={readOnly} />
			{name}
		</label>;
	}
}
