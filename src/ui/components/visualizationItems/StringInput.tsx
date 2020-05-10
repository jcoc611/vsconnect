'use strict';

import * as React from 'react';
import { AbstractItem } from './AbstractItem';
// import { IVisualizationItem } from '../../../interfaces';

interface StringInputState {
	focused: boolean;
}

export class StringInput extends AbstractItem<string, StringInputState> {
	state: StringInputState = { focused: false };

	handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const { valueFunction, onChange, onChangeCommand } = this.props;
		let valueNew: string = e.currentTarget.value;
		if (valueFunction !== undefined) {
			onChangeCommand!(valueNew);
		} else {
			onChange!(valueNew);
		}
	}

	toggleCode = (e: React.SyntheticEvent) => {
		const {value, valueFunction, onChange, onChangeCommand} = this.props;
		if (valueFunction !== undefined) {
			onChange!(valueFunction);
		} else {
			onChangeCommand!(value);
		}
		e.preventDefault();
	}

	handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === ' ' && e.ctrlKey) {
			// TODO: scripting
			// this.toggleCode(e);
		}
	}

	render() {
		const { value, valueFunction, readOnly, inline, location } = this.props;
		const { focused } = this.state;
		let hasFunction = (valueFunction !== undefined);

		let valueDisplay: string = (valueFunction === undefined)? value : valueFunction;
		let wrapperClass = 'stringInput-wrapper' + ((inline)? ' inline' : '');

		if (readOnly) {
			let width: string = (inline)? Math.max(Math.min(value.length + 2, 150), 20) + 'ch': 'auto';
			return <span className={wrapperClass}>
				<span className='stringInput' style={({ width })}>{value}</span>
			</span>;
		}

		let inputClass = (valueFunction === undefined)? 'stringInput-normal': 'stringInput-function';
		let codeClass = 'stringInput-code' + ((valueFunction === undefined)? '' : ' active');
		// TODO: Scripting
		// <span className={codeClass} onClick={this.toggleCode}
		// 		title='Toggle dynamic JavaScript value for this field (Ctrl+Space)'>{'{}'}</span>
		// 	{(focused && hasFunction)? <span className="stringInput-preview"><span>{'❮'}</span>{value}</span> : undefined}
		return <span className={wrapperClass}>
			<input value={valueDisplay} autoFocus={(location === 'short')}
				className={inputClass}
				onChange={this.handleChange} onContextMenu={this.openContextMenu}
				onFocus={() => this.setState({ focused: true })}
				onBlur={() => this.setState({ focused: false })}
				onKeyUp={this.handleKeyPress} />
		</span>;
	}
}
