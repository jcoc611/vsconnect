import * as React from 'react';
import { IVisualizationItem, IUserInterface, OpenTextDocumentOptions, BytesValue } from '../../../interfaces';
import { ContextMenuContent, ContextMenuEvent, ContextMenuItem } from '../ContextMenu';

export interface AbstractItemProps<T, TT = T> {
	onChange?: (valueNew: TT, overrideItem?: boolean, valueFunctionNew?: any) => void;
	onChangeCommand?: (command: string) => void;
	openTextDocument?: (docOptions: OpenTextDocumentOptions, viz?: IVisualizationItem<BytesValue>) => void;
	getCommandPreview: (command: string) => Promise<IVisualizationItem<any> | null>;

	name: string;
	value: T;
	valueFunction?: any;
	location: IUserInterface['location'];

	readOnly?: boolean;
	allowedValues?: T[];
	defaultValue?: T;
	components?: IUserInterface[];
	inline?: boolean;
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
