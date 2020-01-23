import * as React from 'react';
import * as classNames from 'classnames';
import { IVisualizationItem, IUserInterface } from '../../../interfaces';

export interface AbstractItemProps<T> {
	onChange?: (newValue: T) => void;

	name: string;
	value: T;
	readOnly?: boolean;
	allowedValues?: T[];
	components?: IUserInterface[];
}

export class AbstractItem<T, S={}> extends React.Component<AbstractItemProps<T>, S> {

}
