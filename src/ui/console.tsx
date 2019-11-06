import * as React from "react";
import * as ReactDOM from "react-dom";

import { ConsoleSurface } from './components/ConsoleSurface';
import { StateManager } from './StateManager';

let state = new StateManager();

state.onChange( (newHistory) => {
	ReactDOM.render(
		<ConsoleSurface history={ newHistory }
			sendCurrentRequest={ state.sendCurrentRequest.bind(state) }
			updateRequest={ state.updateRequest.bind(state) }
			lastReqId={ state.getLastRequestId() } />,
		document.getElementById("content-wrapper")
	);
} );
