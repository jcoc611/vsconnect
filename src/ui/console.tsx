import * as React from "react";
import * as ReactDOM from "react-dom";

import { ConsoleSurface } from './components/ConsoleSurface';
import { StateManager } from './StateManager';

let state = StateManager.GetInstance();

state.getAllProtocols().then( (protocols) => {
	state.onChange( (newHistory) => {
		ReactDOM.render(
			<ConsoleSurface
				history={ newHistory }
				allProtocols={protocols}
				currentRequest={state.getCurrentRequest()}
				sendCurrentRequest={ state.sendCurrentRequest.bind(state) }
				setProtocol={ state.setProtocol.bind(state) }
				updateUI={ state.updateUI.bind(state) } />,
			document.getElementById("content-wrapper")
		);
		window.scrollTo(0,document.body.scrollHeight);
	} );
});
