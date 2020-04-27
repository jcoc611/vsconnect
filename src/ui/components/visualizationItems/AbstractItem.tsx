import * as React from 'react';
import * as classNames from 'classnames';
import { IVisualizationItem, IUserInterface, OpenTextDocumentOptions } from '../../../interfaces';
import { ContextMenuContent, ContextMenuEvent, ContextMenuItem } from '../ContextMenu';

export interface AbstractItemProps<T, TT = T> {
	onChange?: (newValue: TT, overrideItem?: boolean) => void;
	openTextDocument?: (docOptions: OpenTextDocumentOptions, viz?: IVisualizationItem) => void;

	name: string;
	value: T;
	readOnly?: boolean;
	allowedValues?: T[];
	components?: IUserInterface[];
}

export abstract class AbstractItem<T, S={}, TT = T> extends React.Component<AbstractItemProps<T, TT>, S> {
	protected getContextMenuContent(): ContextMenuContent | null {
		let items: ContextMenuItem[] = [
			{
				name: 'Cut',
				keybindings: 'Ctrl+X',
				doAction: () => document.execCommand('cut'),
			},
			{
				name: 'Copy',
				keybindings: 'Ctrl+C',
				doAction: () => document.execCommand('copy'),
			},
			{
				name: 'Paste',
				keybindings: 'Ctrl+V',
				doAction: () => document.execCommand('paste'),
			},
		];
		return { items };
	}

	openContextMenu = (event: React.MouseEvent) => {
		console.log('item contextmenu', event);
		let content = this.getContextMenuContent();
		if (content !== null) {
			const { pageX, pageY } = event;
			window.dispatchEvent(new CustomEvent(
				'vsconnect:contextmenu',
				{ detail: { pageX, pageY, content }} as ContextMenuEvent
			));
		}
	}
}
