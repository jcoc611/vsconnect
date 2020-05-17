'use strict';

import * as React from 'react';

import { IUserInterface, IVisualizationItem } from '../../../interfaces';
import { AbstractItem } from './AbstractItem';
import { VisualizationItem } from '../VisualizationItem';

export class TableEdit extends AbstractItem<any[][]> {
	private updateValue(row: number, col: number, viz: IVisualizationItem<any>): void {
		const { value, valueFunction, valuePreview } = this.props;
		let newValue: any[][] = this.cloneValue(value);

		if (row < newValue.length) {
			newValue[row][col] = viz.value;
		} else {
			let newRow = this.defaultRowValues();
			newRow[col] = viz.value;
			newValue.push(newRow);
		}

		let valueFunctionNew;
		if (viz.valueFunction === undefined && valueFunction === undefined) {
			valueFunctionNew = valueFunction;
		} else {
			valueFunctionNew = this.cloneOrNew(valueFunction);
			if (row < valueFunctionNew.length) {
				valueFunctionNew[row][col] = viz.valueFunction;
			} else {
				let newRowFunction = new Array(this.props.components!.length);
				newRowFunction[col] = viz.valueFunction;
				valueFunctionNew.push(newRowFunction);
			}
		}

		let valuePreviewNew;
		if (viz.valuePreview === undefined && valuePreview === undefined) {
			valuePreviewNew = valuePreview;
		} else {
			valuePreviewNew = this.cloneOrNew(valuePreview);
			if (row < valuePreviewNew.length) {
				valuePreviewNew[row][col] = viz.valuePreview;
			} else {
				let newRowPreview = new Array(this.props.components!.length);
				newRowPreview[col] = viz.valuePreview;
				valuePreviewNew.push(newRowPreview);
			}
		}

		this.props.onChange!(newValue, false, valueFunctionNew, valuePreviewNew);
	}

	private deleteRow(row: number): void {
		const { value, valueFunction, valuePreview } = this.props;
		let newValue: any[][] = this.cloneValue(value);
		newValue.splice(row, 1);

		let valueFunctionNew;
		if (valueFunction === undefined) {
			valueFunctionNew = valueFunction;
		} else {
			valueFunctionNew = this.cloneOrNew(valueFunction);
			valueFunctionNew.splice(row, 1);
		}

		let valuePreviewNew;
		if (valuePreview === undefined) {
			valuePreviewNew = valuePreview;
		} else {
			valuePreviewNew = this.cloneOrNew(valuePreview);
			valuePreviewNew.splice(row, 1);
		}

		this.props.onChange!(newValue, false, valueFunctionNew, valuePreviewNew);
	}

	private cloneValue(value: any[][]): any[][] {
		return value.map((row) => row.slice(0));
	}

	private cloneOrNew(arr?: any[][]): any[][] {
		if (arr === undefined) {
			let arrEmpty: any[][] = [];
			for (let i = 0; i < this.props.value.length; i++) {
				arrEmpty.push(new Array(this.props.value[i].length));
			}
			return arrEmpty;
		}

		return arr.map((row) => row.slice(0));
	}

	private defaultRowValues(): any[] {
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

	private renderHeader( components: IUserInterface[] ): JSX.Element {
		const { readOnly } = this.props;
		let elements: JSX.Element[] = [];

		for (let i = 0; i < components.length; i++) {
			let component = components[i];
			elements.push(<td key={component.name}
				colSpan={(!readOnly && i == components.length - 1)? 2 : 1}>{component.name}</td>);
		}

		return <thead><tr>{elements}</tr></thead>;
	}

	private renderRow(row: number, values: any[], valuesFunction?: any[], valuesPreview?: any[]) {
		let { components, readOnly } = this.props;
		let cells: JSX.Element[] = [];

		for (let col = 0; col < values.length; col++) {
			let valueFunction = (valuesFunction !== undefined)? valuesFunction[col] : undefined;
			let valuePreview = (valuesPreview !== undefined)? valuesPreview[col] : undefined;
			cells.push(this.renderCell(
				row, col, components![col], values[col], valueFunction, valuePreview
			));
		}

		if (!readOnly) {
			cells.push(
				<td key={values.length} className='tableEdit-deleteRow' title="Delete this row (Shift + Delete)">
					<button onClick={() => this.deleteRow(row)}>X</button>
				</td>
			);
		}

		return <tr key={row} onKeyUp={(e) => {
			if (e.key === 'Delete' && e.shiftKey) {
				this.deleteRow(row);
			}
		}}>{cells}</tr>;
	}

	private renderCell(
		row: number, col: number,
		component: IUserInterface,
		value: any,
		valueFunction?: any,
		valuePreview?: any,
	) {
		let item: IVisualizationItem<any> = {
			handlerId: -1,
			ui: component,
			value,
			valueFunction: (valueFunction === null)? undefined : valueFunction,
			valuePreview: (valuePreview === null)? undefined : valuePreview,
		};
		return <td key={col}>
			<VisualizationItem
				item={item} readOnly={this.props.readOnly} inline={true}
				onChange={ (viz) => this.updateValue(row, col, viz) }
				getFunctionPreview={this.props.getFunctionPreview}
				openTextDocument={this.props.openTextDocument!} />
			</td>;
	}

	render() {
		const { components, value, valueFunction, valuePreview, readOnly } = this.props;
		let content: JSX.Element[] = [];

		let header: JSX.Element = <thead></thead>;

		if (readOnly && value.length == 0)
			return <div className='tableEdit'>No items</div>;

		let count: number = value.length;
		if (
			valueFunction !== undefined
			&& valueFunction.length > value.length
			&& valueFunction[valueFunction.length - 1].some((v: any) => (v !== undefined))
		) {
			count = valueFunction.length;
		}

		if (components) {
			header = this.renderHeader(components);
		}

		for (let i = 0; i < count; i++) {
			let valueRow = (i >= value.length)? this.defaultRowValues() : value[i];
			let valueFunctionRow = (valueFunction !== undefined)? valueFunction[i]: undefined;
			let valuePreviewRow = (valuePreview !== undefined)? valuePreview[i]: undefined;
			content.push( this.renderRow(i, valueRow, valueFunctionRow, valuePreviewRow) );
		}

		if (!readOnly) {
			let valuesDefault = this.defaultRowValues();
			content.push( this.renderRow(count, valuesDefault) );
		}

		return <div className='tableEdit'>
			<table>
				{header}
				<tbody>
					{content}
				</tbody>
			</table>
		</div>;
	}
}
