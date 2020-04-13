import * as React from 'react';
import { AbstractItem } from './AbstractItem';

export class BooleanInput extends AbstractItem<boolean> {
	render() {
		const { onChange, name, value, readOnly } = this.props;
		let onInputChange;
		if (onChange !== undefined) {
			onInputChange = (e: React.MouseEvent<HTMLButtonElement>) => onChange(!value);
		}

		const buttonStyle: React.CSSProperties = {
			fontWeight: (value)? 'bold': 'lighter'
		};
		const indicatorClass: string = (value)? 'ansiGreen': 'ansiForeground';

		return <button className="btn-default" disabled={readOnly} style={buttonStyle}
			onClick={onInputChange}><span className={indicatorClass}>{(value)? '●': '○'}</span> {name}</button>;
	}
}
