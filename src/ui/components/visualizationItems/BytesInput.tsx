'use strict';
import * as React from 'react';
import { AbstractItem, AbstractItemProps } from './AbstractItem';
import { BytesValue } from '../../../interfaces';
import { Formats } from '../../../utils/Formats';
import { Dropdown } from './Dropdown';

export class BytesBinaryInput extends AbstractItem<BytesValue> {
	render() {
		const { onChange, value, readOnly } = this.props;
		let onInputChange;
		let valueStr: string;

		if (onChange !== undefined) {
			onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
				if (e.target.files && e.target.files.length > 0) {
					// @ts-ignore path doesn't officially exist
					const { name, size, path } = e.target.files[0];
					onChange({ type: 'file', name, sizeBytes: size, path });
				} else {
					onChange({ type: 'empty' });
				}
			}
		}

		if (value.type === 'file') {
			valueStr = value.name + ' (' + Formats.byteCountToString(value.sizeBytes) + ')';
		} else {
			valueStr = 'No file chosen';
		}

		if (readOnly) {
			return <span className="stringInput">{valueStr!}</span>;
		}

		return <div className="fileInput">
			<label><span className="btn-plain">Choose file</span> <span>{valueStr}</span> <input type="file" onChange={onInputChange} /></label>
		</div>;
	}
}

export class BytesStringInput extends AbstractItem<BytesValue> {
	private openInNewTab = () => {
		if (this.props.openTextDocument) {
			this.props.openTextDocument({
				name: this.props.name,
				language: '',
				content: this.valueActual(),
				shouldSync: !this.props.readOnly
			});
		}
	}

	private valueActual(): string {
		const { value } = this.props;
		if (value.type === 'string')
			return value.rawValue;
		else if (value.type === 'empty')
			return '';
		else
			return '<Binary data - edit to delete>';
	}

	render() {
		const { onChange, readOnly, inline } = this.props;
		let onInputChange;
		if (onChange !== undefined) {
			onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange({
				type: 'string',
				rawValue: e.target.value
			});
		}

		let valueActual: string = this.valueActual();

		return <div className="bytesStringInput">
			<textarea value={valueActual} readOnly={readOnly}
				onChange={onInputChange} onContextMenu={this.openContextMenu}
				autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
			{(inline)? null : <div className="bytes-bottomBar"><button onClick={this.openInNewTab}>open in new tab</button></div>}
		</div>;
	}
}

interface BytesInlineState {
	type: 'file' | 'text';
}

export class BytesInlineInput extends AbstractItem<BytesValue, BytesInlineState> {
	state: BytesInlineState;

	constructor(props: AbstractItemProps<BytesValue>) {
		super(props);

		this.state = { type: 'text' };
	}

	setType = (newType: string) => {
		if (newType === 'text' || newType === 'file') {
			this.setState({ type: newType });
		}
	}

	render() {
		const {
			onChange, openTextDocument, getFunctionPreview,

			name, value, location,
			readOnly, allowedValues,
			components
		} = this.props;
		const { type } = this.state;

		let editItem: JSX.Element;
		if (type === 'file') {
			editItem = <BytesBinaryInput name={name} value={value}
				location={location}
				readOnly={readOnly} allowedValues={allowedValues}
				components={components} inline={true}

				onChange={onChange} openTextDocument={openTextDocument}
				getFunctionPreview={getFunctionPreview} />;
		} else {
			editItem = <BytesStringInput name={name} value={value}
				location={location}
				readOnly={readOnly} allowedValues={allowedValues}
				components={components} inline={true}

				onChange={onChange} openTextDocument={openTextDocument}
				getFunctionPreview={getFunctionPreview} />;
		}


		return <div className="bytesInlineInput inline">
			<Dropdown name="bytes inline type" value={type} location={location}
				allowedValues={['text', 'file']} readOnly={readOnly}
				onChange={this.setType}
				getFunctionPreview={getFunctionPreview} />
			{editItem}
		</div>;
	}
}
