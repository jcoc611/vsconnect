import * as React from 'react';
import { KeyValues, IUserInterface, IVisualizationItem } from '../../../interfaces';
import { AbstractItem } from './AbstractItem';
import { VisualizationItem } from '../VisualizationItem';

export class TableEdit extends AbstractItem<any[][]> {
	triggerChange(newValue: any[][]): void {
		if (this.props.onChange && !this.props.readOnly) {
			this.props.onChange(newValue);
		}
	}

	updateValue(row: number, col: number, viz: IVisualizationItem): void {
		const { value } = this.props;
		let newValue: any[][] = this.cloneValue(value);

		if (row < newValue.length) {
			newValue[row][col] = viz.value;
		} else {
			let newRow = this.defaultRowValues();
			newRow[col] = viz.value;
			newValue.push(newRow);
		}

		this.triggerChange(newValue);
	}

	cloneValue(value: any[][]) {
		let clone: any[][] = [];
		for (let i = 0; i < value.length; i++) {
			let row: any[] = [];
			for (let j = 0; j < value[i].length; j++) {
				row.push(value[i][j]);
			}
			clone.push(row);
		}

		return clone;
	}

	defaultRowValues(): any[] {
		let valuesDefault = [];
		for (let component of this.props.components!) {
			if (component.defaultValue !== undefined) {
				valuesDefault.push(component.defaultValue);
			} else {
				valuesDefault.push('');
			}
		}
		return valuesDefault;
	}

	renderHeader( components: IUserInterface[] ): JSX.Element {
		let elements = components.map( (i) => <td key={i.name}>{i.name}</td> );
		return <thead><tr>{elements}</tr></thead>;
	}

	renderRow(row: number, values: any[]) {
		let { components } = this.props;
		let cells = values.map( (v, col) => (
			this.renderCell(row, col, components![col], v)
		) );

		return <tr key={row}>{cells}</tr>;
	}

	renderCell(row: number, col: number, component: IUserInterface, value: any) {
		let item: IVisualizationItem = {
			handlerId: -1,
			ui: component,
			value: value
		};
		return <td key={col}>
			<VisualizationItem
				item={item} readOnly={this.props.readOnly}
				onChange={ (viz) => this.updateValue(row, col, viz) }
				openTextDocument={this.props.openTextDocument!} />
			</td>;
	}

	render() {
		const { components, value, readOnly } = this.props;
		let content: JSX.Element[] = [];

		let header: JSX.Element = <thead></thead>;

		if (readOnly && value.length == 0)
			return <div className='kvedit'>No items</div>;

		if (components) {
			header = this.renderHeader(components);
		}

		for (let i = 0; i < value.length; i++) {
			content.push( this.renderRow(i, value[i]) );
		}

		if (!readOnly) {
			let valuesDefault = this.defaultRowValues();
			content.push( this.renderRow(value.length, valuesDefault) );
		}

		return <div className='kvedit'>
			<table>
				{header}
				<tbody>
					{content}
				</tbody>
			</table>
		</div>;
	}
}
