'use strict';

import * as React from 'react';
import { IVisualizationItem, UITypes, OpenTextDocumentOptions, BytesValue } from '../../interfaces';
import { KeyValueEdit } from './visualizationItems/KeyValueEdit';
import { StringInput } from './visualizationItems/StringInput';
import { AbstractItem, AbstractItemProps } from './visualizationItems/AbstractItem';
import { Dropdown } from './visualizationItems/Dropdown';
import { Textarea } from './visualizationItems/Textarea';
import { BooleanInput } from './visualizationItems/BooleanInput';
import { TableEdit } from './visualizationItems/TableEdit';
import { HTML } from './visualizationItems/HTML';
import { BytesBinaryInput, BytesStringInput, BytesInlineInput } from './visualizationItems/BytesInput';
import { ObjectInput } from './visualizationItems/ObjectInput';

interface VisualizationItemProps {
	onChange?: (viz: IVisualizationItem<any>) => void;
	openTextDocument: (docOptions: OpenTextDocumentOptions, viz: IVisualizationItem<BytesValue>) => void;
	getCommandPreview: (command: string) => Promise<IVisualizationItem<any> | null>;

	item: IVisualizationItem<any>;
	// index: number;
	inline?: boolean;
	readOnly?: boolean;
}

interface VisualizationItemState {
	transientValue: any;
	transientValueFunction?: string;
}

export class VisualizationItem extends React.Component<VisualizationItemProps, VisualizationItemState> {
	state: VisualizationItemState;

	constructor(props: VisualizationItemProps) {
		super(props);

		this.state = {
			transientValue: props.item.value,
			transientValueFunction: props.item.valueFunction,
		};
	}

	// Needed (at least for now) to properly keep in sync transient values with upstream
	UNSAFE_componentWillReceiveProps(
		propsNew: VisualizationItemProps
	): void {
		this.setState({
			transientValue: propsNew.item.value,
			transientValueFunction: propsNew.item.valueFunction,
		});
	}

	handleChange = (newValue: any, overrideItem: boolean = false, valueFunctionNew?: any): void => {
		if (this.props.onChange) {
			this.props.onChange(
				(overrideItem)? newValue : Object.assign({}, this.props.item, {
					value: newValue,
					valueFunction: valueFunctionNew
				})
			);
		}

		if (!overrideItem)
			this.setState({ transientValue: newValue, transientValueFunction: valueFunctionNew });
	}

	handleChangeCommand = (valueFunctionNew: string): void => {
		if (this.props.onChange) {
			this.props.getCommandPreview(valueFunctionNew).then((vizNew) => {
				this.props.onChange!(
					Object.assign({}, this.props.item, {
						value: (vizNew === null) ? '' : vizNew.value,
						valueFunction: valueFunctionNew
					})
				);
			});
		}

		this.setState({ transientValueFunction: valueFunctionNew });
	}

	doOpenTextDocument = (docOptions: OpenTextDocumentOptions, item?: IVisualizationItem<BytesValue>) => {
		if (this.props.openTextDocument) {
			this.props.openTextDocument(docOptions, (item)? item : this.props.item);
		}
	}

	render() {
		const { item, readOnly, inline, getCommandPreview } = this.props;
		const value = this.state.transientValue;
		const valueFunction = this.state.transientValueFunction;

		let ElementType: { new(props: AbstractItemProps<any>): AbstractItem<any, any> } | undefined;
		let openTextDocument: (( docOptions: OpenTextDocumentOptions, viz: IVisualizationItem<BytesValue>) => void) | undefined;

		switch (item.ui.type) {
			case UITypes.KeyValues:
				ElementType = KeyValueEdit;
				break;

			case UITypes.String:
				ElementType = StringInput;
				break;

			case UITypes.Enum:
				ElementType = Dropdown;
				break;

			case UITypes.BytesBinary:
				ElementType = BytesBinaryInput;
				break;

			case UITypes.BytesString:
				ElementType = BytesStringInput;
				openTextDocument = this.props.openTextDocument;
				break;

			case UITypes.BytesInline:
				ElementType = BytesInlineInput;
				openTextDocument = this.props.openTextDocument;
				break;

			case UITypes.Textarea:
				ElementType = Textarea;
				break;

			case UITypes.Table:
				ElementType = TableEdit;
				openTextDocument = this.props.openTextDocument;
				break;

			case UITypes.Boolean:
				ElementType = BooleanInput;
				break;

			case UITypes.HTML:
				ElementType = HTML;
				break;

			case UITypes.OneOfMany:
				ElementType = OneOfManyItem;
				openTextDocument = this.props.openTextDocument;
				break;

			case UITypes.Form:
				ElementType = FormItem;
				openTextDocument = this.props.openTextDocument;
				break;

			case UITypes.Object:
				ElementType = ObjectInput;
				break;
		}

		if (ElementType === undefined) {
			console.log('element type is undefined', item);
			return '';
		}

		return <ElementType
			name={item.ui.name}
			value={value}
			valueFunction={valueFunction}
			inline={inline}
			readOnly={readOnly}
			location={item.ui.location}
			onChange={this.handleChange}
			onChangeCommand={this.handleChangeCommand}
			openTextDocument={this.doOpenTextDocument}
			getCommandPreview={getCommandPreview}
			components={item.ui.components}
			allowedValues={item.ui.allowedValues}
			defaultValue={item.ui.defaultValue} />;
	}
}

interface OneOfManyState {
	selected: string;
}

class OneOfManyItem extends AbstractItem<IVisualizationItem<any>[], OneOfManyState, any> {
	state: OneOfManyState;

	constructor(initialProps: AbstractItemProps<IVisualizationItem<any>[]>) {
		super(initialProps);

		this.state = {
			selected: OneOfManyItem.defaultSelected(initialProps),
		}
	}

	private static defaultSelected(props: AbstractItemProps<IVisualizationItem<any>[]>): string {
		const { value } = props;
		let filteredIndex = value.findIndex((item) => item.ui.count !== undefined);

		if (filteredIndex >= 0 && value[filteredIndex]!.ui.subName)
			return value[filteredIndex]!.ui.subName || '';

		if (value.length > 0)
			return value[0].ui.subName || '';

		return '';
	}

	static getDerivedStateFromProps(
		propsNew: AbstractItemProps<IVisualizationItem<any>[]>,
		stateOld: OneOfManyState
	): OneOfManyState | null {
		if (propsNew.value.findIndex((item) => item.ui.subName === stateOld.selected) === -1)
			return { selected: OneOfManyItem.defaultSelected(propsNew) };

		return null;
	}

	selectItem = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ selected: e.target.value });
	}

	private getUniqueId(): string {
		// TODO: Replace with `${transaction id}-${ui name}-${ui sub name}`
		const len = 8;
		let arr = new Uint8Array(len);
		window.crypto.getRandomValues(arr);
		return Array.from(arr, (dec) => ('0' + dec.toString(16)).substr(-2)).join('');
	}

	render() {
		const { value, readOnly, openTextDocument, getCommandPreview } = this.props;
		let options = [];
		let selectedItem;

		let radioUniqueId = this.getUniqueId();
		for (let item of value) {
			let isSelected: boolean = (item.ui.subName === this.state.selected);
			options.push(
				<label key={item.ui.subName}>
					<input type="radio" name={`oneOfMany-${radioUniqueId}`} value={item.ui.subName}
						onChange={this.selectItem} checked={isSelected} />
					{item.ui.subName}
				</label>
			);

			if (isSelected) {
				selectedItem = <VisualizationItem
					item={item}	readOnly={readOnly}
					onChange={(item) => {
						(this.props.onChange)? this.props.onChange(item, true) : null
					}}
					openTextDocument={(docOptions, vizChild) => (
						openTextDocument!(docOptions, (vizChild)? vizChild: item)
					)}
					getCommandPreview={getCommandPreview} />;
			}
		}

		return <div>
			<div className="oneOfMany-options">{options}</div>
			<div>{selectedItem}</div>
		</div>;
	}
}

class FormItem extends AbstractItem<any[]> {
	handleChange = (item: IVisualizationItem<any>) => {
		let valueNew = this.cloneValue();
		let valueFunctionNew = this.cloneValueFunction();

		valueNew[item.handlerId] = item.value;
		valueFunctionNew[item.handlerId] = item.valueFunction;
		this.props.onChange!(valueNew, false, valueFunctionNew);
	}

	private cloneValue(): any[] {
		return this.props.value.map((item) => {
			if (typeof(item) === 'object')
				return Object.assign({}, item);

			return item;
		});
	}

	private cloneValueFunction(): (string | undefined)[] {
		if (this.props.valueFunction === undefined) {
			return new Array(this.props.value.length);
		}

		return this.props.valueFunction.slice(0);
	}

	render() {
		const {
			components, readOnly, value, valueFunction,
			openTextDocument, getCommandPreview
		} = this.props;
		let childrenItems: JSX.Element[] = [];

		if (!components)
			return <div>No items</div>;

		for (let i = 0; i < components.length; i++) {
			let viz: IVisualizationItem<any> = {
				handlerId: i,
				ui: components[i],
				value: value[i],
				valueFunction: (valueFunction === undefined)? undefined: valueFunction[i],
			};
			childrenItems.push(
				<div className="form-item" key={i}>
					<span className="form-item-label">{viz.ui.name}</span>
					<VisualizationItem
						key={i} onChange={this.handleChange}
						getCommandPreview={getCommandPreview}
						openTextDocument={(docOptions, vizChild) => (
							openTextDocument!(docOptions, (vizChild)? vizChild: viz)
						)}
						item={viz} readOnly={readOnly} />
				</div>
			);
		}

		return <div className="form">{childrenItems}</div>;
	}
}
