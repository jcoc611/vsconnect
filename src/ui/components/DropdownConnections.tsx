import * as React from 'react';
import * as classNames from 'classnames';
import ReactDOM = require('react-dom');

interface DropdownConnectionsProps {
	onChange?: (connectionId?: number) => void;

	connectionsAvailable: number[];
	value: number | null | undefined;
	isReadOnly: boolean;
}

interface DropdownConnectionsState {
	isOpen: boolean;
	value: number | null;
}

export class DropdownConnections extends React.Component<DropdownConnectionsProps, DropdownConnectionsState> {
	mounted: boolean;
	state: DropdownConnectionsState;

	constructor(initialProps: DropdownConnectionsProps) {
		super(initialProps);

		this.mounted = false;
		this.state = {
			isOpen: false,
			value: initialProps.value || null
		};
	}

	static getDerivedStateFromProps(
		propsNew: DropdownConnectionsProps,
		stateOld: DropdownConnectionsState
	): DropdownConnectionsState | null {
		if (propsNew.value) {
			if (propsNew.value !== stateOld.value) {
				return { isOpen: stateOld.isOpen, value: propsNew.value };
			}
		} else if(stateOld.value !== null) {
			return { isOpen: stateOld.isOpen, value: null };
		}

		return null;
	}

	static renderConnectionItem(connectionsAvailable: number[], connectionId: number | null | undefined): JSX.Element {
		let isDead = (typeof(connectionId) === 'number' && connectionsAvailable.indexOf(connectionId) === -1);
		if (!connectionId) {
			return <span>New connection</span>;
		} else if (isDead) {
			return <span><span className='symbol-disconnected'>X</span> {`Connection ${connectionId}`}</span>;
		} else {
			return <span><span className='symbol-connected'>●</span> {`Connection ${connectionId}`}</span>;
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

		if (!this.props.isReadOnly) {	
			this.setState({
				isOpen: !this.state.isOpen
			});
		}
	}

	setValue(option: number | null | undefined, isDead?: boolean) {
		if (isDead || this.props.isReadOnly)
			return;

		let newState: DropdownConnectionsState = {
			value: option || null,
			isOpen: false
		};

		this.fireChangeEvent(newState);
		this.setState(newState);
	}

	fireChangeEvent(newState: DropdownConnectionsState) {
		if (newState.value !== this.state.value && this.props.onChange) {
			this.props.onChange(newState.value)
		}
	}

	renderConnection(connectionsAvailable: number[], option?: number | null, isDead?: boolean) {
		let isSelected = (option === this.state.value);

		const optionClass = classNames({
			'dropdown-option': true,
			'is-selected': isSelected
		});

		let labelOption = DropdownConnections.renderConnectionItem(connectionsAvailable, option);

		return <div
			key={option}
			className={optionClass}
			onMouseDown={() => this.setValue(option, isDead)}
			onClick={() => this.setValue(option, isDead)}
			role='option'
			aria-selected={isSelected ? 'true' : 'false'}>
			{labelOption}
		</div>;
	}

	buildMenu(): JSX.Element[] {
		const { connectionsAvailable, value } = this.props;

		let items: JSX.Element[] = [];
		items.push(this.renderConnection(connectionsAvailable));

		if (typeof(value) === 'number' && connectionsAvailable.indexOf(value) === -1)
			this.renderConnection(connectionsAvailable, value, true);

		for (let connectionId of connectionsAvailable) {
			items.push(this.renderConnection(connectionsAvailable, connectionId));
		}

		return items;
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
		const { isReadOnly, connectionsAvailable } = this.props;
		const placeHolderValue = this.state.value;

		const baseClassName = 'dropdown';
		const dropdownClass = classNames({
			[`${baseClassName}-root`]: true,
			'is-open': this.state.isOpen,
		});
		const controlClass = classNames({
			[`${baseClassName}-control`]: true,
			'disabled': (!!isReadOnly)
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

		const value = <div className={placeholderClass}>{DropdownConnections.renderConnectionItem(connectionsAvailable, placeHolderValue)}</div>;
		let menu = null;
		if (this.state.isOpen) {
			menu = <div className={menuClass} aria-expanded='true'>{this.buildMenu()}</div>;
		}

		return <div className={dropdownClass}>
			<div className={controlClass} onMouseDown={this.handleMouseDown}
				onTouchEnd={this.handleMouseDown} aria-haspopup='listbox'>
				{value}
				<span className={`${baseClassName}-arrow-wrapper`}>{(isReadOnly)? '': '▾'}</span>
			</div>
			{menu}
		</div>;
	}
}
