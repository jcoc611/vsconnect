import * as React from 'react';
import * as classNames from 'classnames';
import { IVisualizationItem } from '../../../interfaces';
import { AbstractItem, AbstractItemProps } from './AbstractItem';
import ReactDOM = require('react-dom');

// interface DropdownProps {
// 	onChange?: (newValue: string) => void;

// 	options: string[];
// 	value: string | null;
// 	readOnly?: boolean;
// }

interface DropdownState {
	isOpen: boolean;
	value: string | null;
}

export class Dropdown extends AbstractItem<string, DropdownState> {
	mounted: boolean;
	state: DropdownState;

	constructor(initialProps: AbstractItemProps<string>) {
		super(initialProps);

		this.mounted = false;
		this.state = {
			isOpen: false,
			value: initialProps.value
		};
	}

	componentWillReceiveProps(newProps: AbstractItemProps<string>) {
		if (newProps.value) {
			if (newProps.value !== this.state.value) {
				this.setState({ value: newProps.value })
			}
		} else {
			this.setState({ value: null });
		}
	}

	componentDidMount () {
		this.mounted = true;
		document.addEventListener('click', this.handleDocumentClick);
		document.addEventListener('touchend', this.handleDocumentClick);
	}

	componentWillUnmount () {
		this.mounted = false;
		document.removeEventListener('click', this.handleDocumentClick);
		document.removeEventListener('touchend', this.handleDocumentClick);
	}

	handleMouseDown = (event: React.MouseEvent | React.TouchEvent) => {
		// if (event.type === 'mousedown' && event.button !== 0) return;
		event.stopPropagation();
		event.preventDefault();

		if ( !this.props.readOnly ) {
			this.setState({
				isOpen: !this.state.isOpen
			});
		}
	}

	setValue(option: string) {
		let newState: DropdownState = {
			value: option,
			isOpen: false
		};

		this.fireChangeEvent(newState);
		this.setState(newState);
	}

	fireChangeEvent(newState: DropdownState) {
		if (newState.value !== this.state.value && this.props.onChange && newState.value !== null) {
			this.props.onChange(newState.value)
		}
	}

	renderOption(option: string) {
		let isSelected = (option === this.state.value);

		const optionClass = classNames({
			'dropdown-option': true,
			'is-selected': isSelected
		});

		return <div
			key={option}
			className={optionClass}
			onMouseDown={() => this.setValue(option)}
			onClick={() => this.setValue(option)}
			role='option'
			aria-selected={isSelected ? 'true' : 'false'}>
			{option}
		</div>;
	}

	buildMenu() {
		const { allowedValues } = this.props;

		if (!allowedValues || allowedValues.length === 0) {
			return <div className={`dropdown-noresults`}>
				No options found
			</div>;
		}

		return allowedValues.map( (option) => {
			return this.renderOption(option)
		} );
	}

	handleDocumentClick = (event: MouseEvent | TouchEvent) => {
		if (this.mounted && event.target !== null) {
			if (!ReactDOM.findDOMNode(this)!.contains(event.target as Node)) {
				if (this.state.isOpen) {
					this.setState({ isOpen: false, value: this.state.value });
				}
			}
		}
	}

	isValueSelected (): boolean {
		return (this.state.value !== null);
	}

	render () {
		const { readOnly } = this.props;
		const placeHolderValue = this.state.value;

		const baseClassName = 'dropdown';
		const dropdownClass = classNames({
			[`${baseClassName}-root`]: true,
			'is-open': this.state.isOpen,
		});
		const controlClass = classNames({
			[`${baseClassName}-control`]: true,
			['disabled']: !!this.props.readOnly,
		});
		const placeholderClass = classNames({
			[`${baseClassName}-placeholder`]: true,
			'is-selected': this.isValueSelected(),
		});
		const menuClass = classNames({
			[`${baseClassName}-menu`]: true,
		});
		const arrowClass = classNames({
			[`${baseClassName}-arrow`]: true,
		});

		const value = <div className={placeholderClass}>{placeHolderValue}</div>;
		let menu = null;
		if (this.state.isOpen) {
			menu = <div className={menuClass} aria-expanded='true'>{this.buildMenu()}</div>;
		}

		return <div className={dropdownClass}>
			<div className={controlClass} onMouseDown={this.handleMouseDown}
				onTouchEnd={this.handleMouseDown} aria-haspopup='listbox'>
				{value}
				<span className={`${baseClassName}-arrow-wrapper`}>{(readOnly)? '': '▾'}</span>
			</div>
			{menu}
		</div>;
	}
}
