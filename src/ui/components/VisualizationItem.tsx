import * as React from 'react';
import { IVisualizationItem, UITypes, OpenTextDocumentOptions } from '../../interfaces';
import { KeyValueEdit } from './visualizationItems/KeyValueEdit';
import { StringInput } from './visualizationItems/StringInput';
import { AbstractItem, AbstractItemProps } from './visualizationItems/AbstractItem';
import { Dropdown } from './visualizationItems/Dropdown';
import { Textarea } from './visualizationItems/Textarea';
import { BooleanInput } from './visualizationItems/BooleanInput';
import { TableEdit } from './visualizationItems/TableEdit';
import { HTML } from './visualizationItems/HTML';
import { BytesBinaryInput, BytesStringInput, BytesInlineInput } from './visualizationItems/BytesInput';

interface VisualizationItemProps {
	onChange?: (viz: IVisualizationItem) => void;
	openTextDocument: (docOptions: OpenTextDocumentOptions, viz: IVisualizationItem) => void;

	item: IVisualizationItem;
	// index: number;
	readOnly?: boolean;
}

interface VisualizationItemState {
	transientValue: any;
}

export class VisualizationItem extends React.Component<VisualizationItemProps, VisualizationItemState> {
	state: VisualizationItemState;

	constructor(props: VisualizationItemProps) {
		super(props);

		this.state = {
			transientValue: props.item.value,
		};
	}

	static getDerivedStateFromProps(
		propsNew: VisualizationItemProps,
		stateOld: VisualizationItemState
	): VisualizationItemState | null {
		return { transientValue: propsNew.item.value };
	}

	handleChange = (newValue: any, overrideItem: boolean = false): void => {
		if (this.props.onChange) {
			this.props.onChange(
				(overrideItem)? newValue : Object.assign({}, this.props.item, {
					value: newValue
				})
			);
		}

		if (!overrideItem)
			this.setState({ transientValue: newValue });
	}

	doOpenTextDocument = (docOptions: OpenTextDocumentOptions, item?: IVisualizationItem) => {
		if (this.props.openTextDocument) {
			this.props.openTextDocument(docOptions, (item)? item : this.props.item);
		}
	}

	render() {
		const { item, readOnly } = this.props;
		const value = this.state.transientValue;

		let ElementType: { new(props: AbstractItemProps<any>): AbstractItem<any, any> } | undefined;
		let openTextDocument: (( docOptions: OpenTextDocumentOptions, viz: IVisualizationItem) => void) | undefined;

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
		}

		if (ElementType === undefined) {
			console.log('element type is undefined', item);
			return '';
		}

		return <ElementType name={item.ui.name} value={value}
			readOnly={readOnly} location={item.ui.location}
			onChange={this.handleChange}
			openTextDocument={this.doOpenTextDocument}
			components={item.ui.components}
			allowedValues={item.ui.allowedValues}
			defaultValue={item.ui.defaultValue} />;
	}
}

interface OneOfManyState {
	selected: string;
}

class OneOfManyItem extends AbstractItem<IVisualizationItem[], OneOfManyState, any> {
	state: OneOfManyState;

	constructor(initialProps: AbstractItemProps<IVisualizationItem[]>) {
		super(initialProps);

		this.state = {
			selected: OneOfManyItem.defaultSelected(initialProps),
		}
	}

	private static defaultSelected(props: AbstractItemProps<IVisualizationItem[]>): string {
		const { value } = props;
		let filteredIndex = value.findIndex((item) => item.ui.count !== undefined);

		if (filteredIndex >= 0 && value[filteredIndex]!.ui.subName)
			return value[filteredIndex]!.ui.subName || '';

		if (value.length > 0)
			return value[0].ui.subName || '';

		return '';
	}

	static getDerivedStateFromProps(
		propsNew: AbstractItemProps<IVisualizationItem[]>,
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
		const { name, value, readOnly, openTextDocument } = this.props;
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
					onChange={(item) => {
						(this.props.onChange)? this.props.onChange(item, true) : null
					}}
					openTextDocument={(docOptions, vizChild) => (
						openTextDocument!(docOptions, (vizChild)? vizChild: item)
					)}
					item={item}	readOnly={readOnly} />;
			}
		}

		return <div>
			<div className="oneOfMany-options">{options}</div>
			<div>{selectedItem}</div>
		</div>;
	}
}

class FormItem extends AbstractItem<any[]> {
	handleChange = (item: IVisualizationItem) => {
		if (this.props.onChange) {
			let newVal = this.props.value.map((item) => {
				if (typeof(item) === 'object')
					return Object.assign({}, item);

				return item;
			});

			newVal[item.handlerId] = item.value;
			this.props.onChange(newVal);
		}
	}

	render() {
		const { components, readOnly, value, openTextDocument } = this.props;
		let childrenItems: JSX.Element[] = [];

		if (!components)
			return <div>No items</div>;

		for (let i = 0; i < components.length; i++) {
			let viz: IVisualizationItem = {
				handlerId: i,
				ui: components[i],
				value: value[i],
			};
			childrenItems.push(
				<div className="form-item" key={i}>
					<span>{viz.ui.name}</span>
					<VisualizationItem
						key={i} onChange={this.handleChange}
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
