import * as React from 'react';
import { IVisualizationItem, UITypes } from '../../interfaces';
import classNames = require('classnames');
import { KeyValueEdit } from './visualizationItems/KeyValueEdit';
import { StringInput } from './visualizationItems/StringInput';
import { AbstractItem, AbstractItemProps } from './visualizationItems/AbstractItem';
import { Dropdown } from './visualizationItems/Dropdown';
import { Textarea } from './visualizationItems/Textarea';
import { BooleanInput } from './visualizationItems/BooleanInput';
import { TableEdit } from './visualizationItems/TableEdit';
import { HTML } from './visualizationItems/HTML';
import { BytesBinaryInput, BytesStringInput } from './visualizationItems/BytesInput';

interface VisualizationItemProps {
	onChange?: (viz: IVisualizationItem) => void;

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

	componentWillReceiveProps(newProps: VisualizationItemProps) {
		this.setState({ transientValue: newProps.item.value });
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

	render() {
		const { /*index,*/ item, readOnly } = this.props;
		const value = this.state.transientValue;

		let ElementType: { new(props: AbstractItemProps<any>): AbstractItem<any, any> } | undefined;

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
				break;

			case UITypes.Textarea:
				ElementType = Textarea;
				break;

			case UITypes.Table:
				ElementType = TableEdit;
				break;

			case UITypes.Boolean:
				ElementType = BooleanInput;
				break;

			case UITypes.HTML:
				ElementType = HTML;
				break;

			case UITypes.OneOfMany:
				ElementType = OneOfManyItem;
				break;

			case UITypes.Form:
				ElementType = FormItem;
				break;
		}

		if (ElementType === undefined) {
			console.log('element type is undefined', item);
			return '';
		}

		return <ElementType name={item.ui.name} value={value} readOnly={readOnly}
			onChange={this.handleChange}
			components={item.ui.components}
			allowedValues={item.ui.allowedValues} />;
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
			selected: this.defaultSelected(initialProps),
		}
	}

	private defaultSelected(props: AbstractItemProps<IVisualizationItem[]>): string {
		const { value } = props;
		let filteredIndex = value.findIndex((item) => item.ui.count !== undefined);

		if (filteredIndex >= 0 && value[filteredIndex]!.ui.subName)
			return value[filteredIndex]!.ui.subName || '';

		if (value.length > 0)
			return value[0].ui.subName || '';

		return '';
	}

	componentWillReceiveProps(newProps: AbstractItemProps<IVisualizationItem[]>) {
		if (newProps.value.findIndex((item) => item.ui.subName === this.state.selected) === -1)
			this.setState({ selected: this.defaultSelected(newProps) });
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
		const { name, value, readOnly } = this.props;
		let options = [];
		let selectedItem;

		let radioUniqueId = this.getUniqueId();
		for (let item of value) {
			let isSelected: boolean = (item.ui.subName === this.state.selected);
			options.push(
				<label>
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
		const { components, readOnly, value } = this.props;
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
				<div className="form-item">
					<span>{viz.ui.name}</span>
					<VisualizationItem
						key={i} onChange={this.handleChange}
						item={viz} readOnly={readOnly} />
				</div>
			);
		}

		return <div className="form">{childrenItems}</div>;
	}
}
