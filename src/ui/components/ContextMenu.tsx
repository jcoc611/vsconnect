'use strict';

import * as React from 'react';
import ReactDOM = require('react-dom');

export interface ContextMenuItem {
	name: string;
	keybindings?: string;
	doAction: () => void;
}

export interface ContextMenuContent {
	items: ContextMenuItem[];
}

export interface ContextMenuEvent {
	detail: {
		pageX: number;
		pageY: number;
		content: ContextMenuContent;
	}
}

interface ContextMenuProps {
	content?: ContextMenuContent;
}

interface ContextMenuState {
	highlightedItem?: number;
}

export class ContextMenu extends React.Component<ContextMenuProps, ContextMenuState> {
	private mounted: boolean;

	state: ContextMenuState;

	constructor(initialProps: ContextMenuProps) {
		super(initialProps);

		this.mounted = false;
		this.state = {};
	}

	componentDidMount () {
		this.mounted = true;
		document.addEventListener('click', this.handleDocumentClick);
		document.addEventListener('touchend', this.handleDocumentClick);
		document.addEventListener('keydown', this.handleKeyDown);
	}

	componentWillUnmount () {
		this.mounted = false;
		document.removeEventListener('click', this.handleDocumentClick);
		document.removeEventListener('touchend', this.handleDocumentClick);
		document.removeEventListener('keydown', this.handleKeyDown);
	}

	handleDocumentClick = (event: MouseEvent | TouchEvent) => {
		if (this.mounted && event.target !== null) {
			if (!ReactDOM.findDOMNode(this)!.contains(event.target as Node)) {
				window.dispatchEvent(new Event('vsconnect:contextmenu:close'));
			}
		}
	}

	handleKeyDown = (event: KeyboardEvent): void => {
		if (!this.mounted)
			return;

		if (this.props.content === undefined)
			return;

		const { highlightedItem } = this.state;
		const items = this.props.content.items;

		if (event.key === 'ArrowDown') {
			if (highlightedItem === undefined) {
				this.setState({ highlightedItem: 0 });
			} else if (highlightedItem < items.length - 1) {
				this.setState({ highlightedItem: highlightedItem + 1 });
			}
			event.stopPropagation();
			event.preventDefault();
		} else if (event.key === 'ArrowUp') {
			if (highlightedItem === undefined) {
				this.setState({ highlightedItem: items.length - 1 });
			} else if (highlightedItem > 0) {
				this.setState({ highlightedItem: highlightedItem - 1 });
			}
			event.stopPropagation();
			event.preventDefault();
		} else if (event.key === 'Enter' && highlightedItem !== undefined) {
			event.stopPropagation();
			event.preventDefault();
			items[highlightedItem].doAction();
			window.dispatchEvent(new Event('vsconnect:contextmenu:close'));
		}
	}

	render() {
		const { highlightedItem } = this.state;
		if (this.props.content === undefined) {
			return <div></div>;
		}

		let items = this.props.content.items.map((item, index) => (
			<div className={'menu-item' + ((index === highlightedItem)? ' active': '')}
			key={index} onClick={() => {
				item.doAction();
				window.dispatchEvent(new Event('vsconnect:contextmenu:close'));
			}}>
				<span>{item.name}</span>
				<span className="menu-keybinding">{item.keybindings}</span>
			</div>
		));

		return <div>{items}</div>
	}
}
