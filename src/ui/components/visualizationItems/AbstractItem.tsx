import * as React from 'react';
import * as classNames from 'classnames';
import { IVisualizationItem } from '../../../interfaces';

export interface AbstractItemProps<T> {
	onChange?: (newValue: T) => void;

	value: T;
	readOnly?: boolean;
	allowedValues?: T[];
}

export class AbstractItem<T, S={}> extends React.Component<AbstractItemProps<T>, S> {

}
