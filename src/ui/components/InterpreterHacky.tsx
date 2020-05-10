// 'use strict';

// import * as React from 'react';
// import { IVisualizationItem } from '../../interfaces';
// import { VisualizationItem } from './VisualizationItem';

// interface InterpreterProps {
// 	getCommandPreview: (command: string) => Promise<IVisualizationItem | null>;
// }

// interface InterpreterState {
// 	value: string;
// 	preview?: IVisualizationItem;
// }

// export class Interpreter extends React.Component<InterpreterProps, InterpreterState> {
// 	state: InterpreterState = { value: '' };

// 	onChange = (e : React.ChangeEvent<HTMLInputElement>) => {
// 		this.setState({ value: e.target.value, preview: undefined });
// 		this.props.getCommandPreview(e.target.value).then((viz) => {
// 			if (viz !== null) {
// 				this.setState({ value: this.state.value, preview: viz });
// 			}
// 		});
// 	}

// 	render() {
// 		const {value, preview} = this.state;
// 		let previewElement: JSX.Element | undefined;
// 		if (preview !== undefined) {
// 			previewElement = <VisualizationItem item={preview} openTextDocument={() => undefined} />;
// 		}
// 		return <div className="interpreter">
// 			<input type="text" value={value} onChange={this.onChange} />
// 			<div className="interpreter-preview">{previewElement}</div>
// 		</div>;
// 	}
// }