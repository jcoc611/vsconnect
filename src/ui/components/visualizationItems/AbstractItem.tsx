import * as React from 'react';
import * as classNames from 'classnames';
import { IVisualizationItem, IUserInterface } from '../../../interfaces';

export interface AbstractItemProps<T, TT = T> {
	onChange?: (newValue: TT, overrideItem?: boolean) => void;

	name: string;
	value: T;
	readOnly?: boolean;
	allowedValues?: T[];
	components?: IUserInterface[];
}

export class AbstractItem<T, S={}, TT = T> extends React.Component<AbstractItemProps<T, TT>, S> {

}
