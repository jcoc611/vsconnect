import * as React from 'react';
import { KeyValues, IUserInterface, UITypes } from '../../../interfaces';
import { AbstractItem } from './AbstractItem';
import { TableEdit } from './TableEdit';

type TableEditOnChange = (valueNew: any[][], overrideItem?: boolean, valueFunctionNew?: any) => void;

export class KeyValueEdit extends AbstractItem<KeyValues<string>> {
	render() {
		const {
			getFunctionPreview, onChange, onChangeCommand, openTextDocument,

			name, value, valueFunction, valuePreview, location,

			readOnly, allowedValues, defaultValue, /*components,*/ inline,
		} = this.props;

		let components: IUserInterface[] = [
			{
				location,
				type: UITypes.String,
				name: 'Name',
				defaultValue: '',
				// shortDescription?: string;
				// allowedValues?: any[];
			},
			{
				location,
				type: UITypes.String,
				name: 'Value',
				defaultValue: '',
				// shortDescription?: string;
				// allowedValues?: any[];
			}
		];
		return <TableEdit
			getFunctionPreview={getFunctionPreview}
			onChange={onChange as TableEditOnChange}
			onChangeCommand={onChangeCommand}
			openTextDocument={openTextDocument}

			name={name}
			value={value}
			valueFunction={valueFunction}
			valuePreview={valuePreview}
			location={location}

			readOnly={readOnly}
			allowedValues={allowedValues}
			defaultValue={defaultValue}
			components={components}
			inline={inline} />
	}
}
