'use strict';

import * as React from 'react';
import * as classNames from 'classnames';

import { AbstractItem } from './AbstractItem';
import { ObjectInput } from './ObjectInput';
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
			this.toggleCode(e);
		}
	}

	render() {
		const { value, valueFunction, valuePreview, readOnly, inline, location } = this.props;
		const { focused } = this.state;
		let hasFunction = (valueFunction !== undefined);

		let valueDisplay: string = (hasFunction)? valueFunction : value;
		// let wrapperClass = 'stringInput-wrapper' + ((inline)? ' inline' : '');
		let wrapperClass = classNames({
			'stringInput-wrapper': true,
			'inline': inline,
			'has-function': hasFunction
		});

		if (readOnly) {
			let width: string = (inline)? Math.max(Math.min(value.length + 2, 150), 20) + 'ch': 'auto';
			return <span className={wrapperClass}>
				<span className='stringInput' style={({ width })}>{value}</span>
			</span>;
		}

		let inputClass = (hasFunction)? 'stringInput-function' : 'stringInput-normal';
		let codeClass = 'stringInput-code' + ((hasFunction)? ' active' : '');

		return <span className={wrapperClass}
				onFocus={() => this.setState({ focused: true })}
				onBlur={() => this.setState({ focused: false })}>
			{(hasFunction)? <span className='stringInput-prompt'>{'❯'}</span> : null}
			<input value={valueDisplay} autoFocus={(location === 'short')}
				className={inputClass}
				onChange={this.handleChange} onContextMenu={this.openContextMenu}
				onKeyUp={this.handleKeyPress} />
			<span className={codeClass} onClick={this.toggleCode}
				title='Toggle dynamic JavaScript value for this field (Ctrl+Space)'>{'{}'}</span>
			{(focused && hasFunction)? <span className="stringInput-preview">
					<span>{'❮'}</span>
					<ObjectInput name={'preview'} value={valuePreview || value} location={'extra'} />
				</span> : undefined}
		</span>;
	}
}
