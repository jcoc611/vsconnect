'use strict';

import * as React from 'react';
import { AbstractItem } from './AbstractItem';

interface ObjectInputState {
	isExpanded: boolean;
}

export class ObjectInput extends AbstractItem<object, ObjectInputState> {
	state: ObjectInputState = { isExpanded: false };

	renderArray(arr: any[], isExpanded: boolean): JSX.Element[] {
		const { getFunctionPreview } = this.props;
		let parts: JSX.Element[] = [];
		for (let i = 0; i < 10 && i < arr.length; i++) {
			if (isExpanded) {
				parts.push(<div key={i}>
					<ObjectInput name={''} value={arr[i]} location={'extra'} hasRecursed={false}
						getFunctionPreview={getFunctionPreview} />
				</div>);
			} else {
				parts.push(<span key={i}>
					<ObjectInput name={''} value={arr[i]} location={'extra'} hasRecursed={true}
						getFunctionPreview={getFunctionPreview} />
					{(i == 9 || i == arr.length - 1)? null : <span className='objectInput-separator'>,</span>}
				</span>);
			}
		}
		return parts;
	}

	renderObject(obj: object, isExpanded: boolean): JSX.Element[] {
		const { getFunctionPreview } = this.props;
		let keys: string[] = Object.keys(obj);
		let parts: JSX.Element[] = [];
		for (let i = 0; i < 10 && i < keys.length; i++) {
			// @ts-ignore don't mind
			let val: any = obj[keys[i]];

			if (isExpanded) {
				parts.push(<div key={keys[i]}>
					<span className="objectInput-key">{keys[i]}: </span>
					<ObjectInput name={''} value={val} location={'extra'} hasRecursed={false}
						getFunctionPreview={getFunctionPreview} />
				</div>);
			} else {
				parts.push(<span key={keys[i]}>
					<span className="objectInput-key">{keys[i]}: </span>
					<ObjectInput name={''} value={val} location={'extra'} hasRecursed={true}
						getFunctionPreview={getFunctionPreview} />
					{(i == 9 || i == keys.length - 1)? null : <span className='objectInput-separator'>,</span>}
				</span>);
			}
		}
		return parts;
	}

	toggleExpanded = () => {
		this.setState({ isExpanded: !this.state.isExpanded });
	}

	toggleMouseDown = (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
	}

	render() {
		const { isExpanded } = this.state;
		const { value, hasRecursed } = this.props;

		if (typeof(value) === 'object') {
			if (Array.isArray(value)) {
				if (hasRecursed)
					return <span className="objectInput objectInput-array"><span>{'[...]'}</span></span>;

				return <span className="objectInput objectInput-array">
					<span className='expansionToggle' onClick={this.toggleExpanded}
						onMouseDown={this.toggleMouseDown}>{(isExpanded)? '🞃' : '🞂'}</span>
					<span>{(isExpanded)? `Array(${value.length})`: `(${value.length}) [`}</span>
					{this.renderArray(value, isExpanded)}
					{(!isExpanded)? <span>{']'}</span> : null}
				</span>;
			} else if (value === null) {
				return <span className="objectInput objectInput-object"><span>null</span></span>;
			} else {
				if (hasRecursed)
					return <span className="objectInput objectInput-array"><span>{'{...}'}</span></span>;

				return <span className="objectInput objectInput-object">
					<span className='expansionToggle' onClick={this.toggleExpanded}
						onMouseDown={this.toggleMouseDown}>{(isExpanded)? '🞃' : '🞂'}</span>
					<span>{(isExpanded)? 'Object': '{'}</span>
					{this.renderObject(value, isExpanded)}
					{(!isExpanded)? <span>{'}'}</span> : null}
				</span>;
			}
		}

		if (typeof(value) === 'undefined')
			return <span className="objectInput"><span>undefined</span></span>;

		if (typeof(value) === 'number')
			return <span className="objectInput objectInput-number">{value}</span>;

		let valueStr = String(value);
		if (valueStr.length > 20) {
			valueStr = valueStr.substr(0, 20) + '…';
		}
		return <span className="objectInput objectInput-string">
			<span>"</span>
			{String(valueStr)}
			<span>"</span>
		</span>;
	}
}
