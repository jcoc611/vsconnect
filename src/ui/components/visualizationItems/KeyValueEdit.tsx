import * as React from 'react';
import { KeyValues } from '../../../interfaces';
import { AbstractItem } from './AbstractItem';

export class KeyValueEdit extends AbstractItem<KeyValues<string>> {
	triggerChange(newValue: KeyValues<string>) {
		if (this.props.onChange && !this.props.readOnly) {
			this.props.onChange(newValue);
		}
	}

	updateKey(index: number, newKey: string) {
		const { value } = this.props;
		let newTuples: KeyValues<string> = [];

		for (let i = 0; i < value.length; i++) {
			if (index === i) {
				if (newKey !== '' || value[i][1] !== '') {
					newTuples.push([ newKey, value[i][1] ]);
				}
			} else {
				newTuples.push(value[i]);
			}
		}

		if (index === value.length && newKey !== '') {
			newTuples.push([ newKey, '' ]);
		}

		this.triggerChange(newTuples);
	}

	updateValue(index: number, newValue: string) {
		const { value } = this.props;
		let newTuples: KeyValues<string> = [];

		for (let i = 0; i < value.length; i++) {
			if (index === i) {
				if (value[i][0] !== '' || newValue !== '') {
					newTuples.push([ value[i][0], newValue ]);
				}
			} else {
				newTuples.push(value[i]);
			}
		}

		if (index === value.length && newValue !== '') {
			newTuples.push([ '', newValue ]);
		}

		this.triggerChange(newTuples);
	}

	renderRow(index: number, [key, value]: [string, string]) {
		let keyWidth: string = Math.max(Math.min(key.length + 2, 150), 20) + 'ch';
		let valueWidth: string = Math.max(Math.min(value.length + 2, 150), 20) + 'ch';
		return <tr>
			<td><input type="text" placeholder="Name" value={key} readOnly={this.props.readOnly}
				style={({ width: keyWidth })}
				onContextMenu={this.openContextMenu}
				onChange={(e) => this.updateKey(index, e.target.value)} /></td>
			<td><input type="text" placeholder="Value" value={value} readOnly={this.props.readOnly}
				style={({ width: valueWidth })}
				onContextMenu={this.openContextMenu}
				onChange={(e) => this.updateValue(index, e.target.value)} /></td>
		</tr>;
	}

	render() {
		const { value, readOnly } = this.props;
		let content: JSX.Element[] = [];

		if (readOnly && value.length == 0)
			return <div className="kvedit">No items</div>;

		for (let i = 0; i < value.length; i++) {
			content.push( this.renderRow(i, value[i]) );
		}

		if (!readOnly) {
			content.push( this.renderRow(value.length, ['', '']) );
		}

		return <div className="kvedit">
			<table>
				<thead>
					<tr>
						<td>Name</td>
						<td>Value</td>
					</tr>
				</thead>
				<tbody>
					{content}
				</tbody>
			</table>
		</div>;
	}
}
