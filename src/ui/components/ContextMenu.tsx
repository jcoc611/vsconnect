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

export class ContextMenu extends React.Component<ContextMenuProps> {
	private mounted: boolean;

	constructor(initialProps: ContextMenuProps) {
		super(initialProps);

		this.mounted = false;
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

	handleDocumentClick = (event: MouseEvent | TouchEvent) => {
		if (this.mounted && event.target !== null) {
			if (!ReactDOM.findDOMNode(this)!.contains(event.target as Node)) {
				window.dispatchEvent(new Event('vsconnect:contextmenu:close'));
			}
		}
	}

	render() {
		if (this.props.content === undefined) {
			return <div></div>;
		}
		let items = this.props.content.items.map((item) => (
			<div className="menu-item" onClick={() => {
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
