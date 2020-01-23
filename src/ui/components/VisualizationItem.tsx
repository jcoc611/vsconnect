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

interface VisualizationItemProps {
	onChange?: (viz: IVisualizationItem) => void;

	item: IVisualizationItem;
	// index: number;
	readOnly?: boolean;
}

export class VisualizationItem extends React.Component<VisualizationItemProps, {}> {

	handleChange = (newValue: any): void => {
		if (this.props.onChange) {
			this.props.onChange(
				Object.assign({}, this.props.item, {
					value: newValue
				})
			);
		}
	}

	render() {
		const { /*index,*/ item, readOnly } = this.props;

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

			case UITypes.Bytes:
				ElementType = Textarea;
				break;

			case UITypes.Table:
				ElementType = TableEdit;
				break;

			case UITypes.Boolean:
				ElementType = BooleanInput;
				break;
		}

		if (ElementType === undefined) {
			return '';
		}

		return <ElementType name={item.ui.name} value={item.value} readOnly={readOnly}
			onChange={this.handleChange}
			components={item.ui.components}
			allowedValues={item.ui.allowedValues} />;
	}
}
