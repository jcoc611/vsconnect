'use strict';

import * as React from "react";
import * as ReactDOM from "react-dom";

import { ConsoleSurface } from './components/ConsoleSurface';
import { StateManager } from './StateManager';
import { ContextMenu } from "./components/ContextMenu";

let state = StateManager.GetInstance();

state.getAllProtocols().then( (protocols) => {
	state.onChange( (newHistory) => {
		ReactDOM.render(
			<ConsoleSurface
				history={ newHistory }
				rerunQueue={ state.getRerunQueue() }
				allProtocols={protocols}
				currentRequest={state.getCurrentRequest()}
				sendRequest={ state.sendRequest.bind(state) }
				setProtocol={ state.setProtocol.bind(state) }
				updateUI={ state.updateUI.bind(state) }
				openTextDocument={ state.openTextDocument.bind(state) }
				getFunctionPreview={ state.getFunctionPreview.bind(state) }
				rerun={ state.rerun.bind(state) }
				clear={ state.clear.bind(state) } />,
			document.getElementById("content-wrapper")
		);
		window.scrollTo(0,document.body.scrollHeight);

		ReactDOM.render(
			<div className="topBar">
				<button onClick={ state.rerun.bind(state) } title='Resend every request one after the other'>🔄 Rerun</button>
				<button onClick={ state.clear.bind(state) } title='Delete everything in this tab'>🗑️ Clear</button>
			</div>,
			document.getElementById("topBar-wrapper")
		);

		let contextMenuWrapper = document.getElementById('contextmenu-wrapper');
		ReactDOM.render(
			<ContextMenu
				content={state.getContextMenuContent()} />,
			contextMenuWrapper
		);
		if (state.hasContextMenu()) {
			const { top, left } = state.getContextMenuLocation();
			contextMenuWrapper!.style.display = "block";
			contextMenuWrapper!.style.top = `${top}px`;
			contextMenuWrapper!.style.left = `${left}px`;
		} else {
			contextMenuWrapper!.style.display = "none";
		}
	} );
});
