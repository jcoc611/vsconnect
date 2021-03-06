import { UITypes, ITransaction, IUserInterface, IContext, BytesValue, IComponent, DefaultComponentUI } from "../interfaces";
import { Visualizer } from "./Visualizer";
import { hasComponent, getComponent, setComponent, getBinaryComponentSize } from "../utils/transactionTools";
import { Formats } from "../utils/Formats";

export class SimpleVisualizer<T> extends Visualizer<T> {
	protected readonly protocolId: string;
	protected readonly uiSpec: IUserInterface;

	/** 
	 * @field If true, only displays when there is a connection. If false, only displays when there isn't a connection.
	 * If undefined, always displays.
	 */
	protected readonly requireConnection?: boolean;

	constructor(protocolId: string, uiSpec: IUserInterface, requireConnection?: boolean) {
		super()

		this.protocolId = protocolId;
		this.uiSpec = uiSpec;
		this.requireConnection = requireConnection;
	}

	static ForComponent<T>(
		protocolId: string,
		component: IComponent,
		defaultUI: IUserInterface | "short" | "extra",
		requireConnection?: boolean
	) : Visualizer<T> {
		let ui: IUserInterface;
		if (typeof(defaultUI) === "string") {
			ui = {
				type: DefaultComponentUI[component.type],
				name: component.name,
				location: defaultUI,
			}
		} else {
			ui = defaultUI;
		}

		if (component.allowedValues && ui.allowedValues === undefined) {
			ui.allowedValues = component.allowedValues;
		}

		if (component.components && ui.components === undefined) {
			ui.components = component.components.map( (c) => ({
				name: c.name,
				type: DefaultComponentUI[c.type],
				required: c.required,
				// default: c.default,
				allowedValues: c.allowedValues,
				location: ui.location,
			}));
		}

		return new SimpleVisualizer<T>(protocolId, ui, requireConnection);
	}

	getUI(t: ITransaction, context: IContext): IUserInterface {
		const currentValue: T = this.getValueFromTransaction(t, context);
		let ui: IUserInterface = Object.assign({}, this.uiSpec);
		if (Array.isArray(currentValue))
			ui.count = `${currentValue.length}`;

		if (ui.type === UITypes.BytesString || ui.type === UITypes.BytesBinary) {
			let bytesVal: BytesValue = currentValue as any;
			if (
				(bytesVal.type === 'file' && ui.type === UITypes.BytesBinary) ||
				(bytesVal.type === 'string' && ui.type === UITypes.BytesString)
			) {
				let byteCount = getBinaryComponentSize(t, ui.name);
				if (byteCount > 0) {
					ui.count = Formats.byteCountToString(byteCount);
				}
			}
		}

		return ui;
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		if (t.protocolId !== this.protocolId) {
			return false;
		}

		if ((this.requireConnection === true && !t.connectionId)
			|| (this.requireConnection === false && t.connectionId)) {
			return false;
		}

		if (this.uiSpec.contextType !== undefined && this.uiSpec.contextType !== context) {
			return false;
		}

		return hasComponent(t, this.uiSpec.name);
	}

	getTransactionFromValue(valueNew: T, tCurrent: ITransaction): ITransaction {
		return setComponent(tCurrent, this.uiSpec.name, valueNew);
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): T {
		return getComponent<T>(tNew, this.uiSpec.name);
	}
}
