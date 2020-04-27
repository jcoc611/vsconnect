import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, getKeyValueComponent, setKeyValueComponent, getKeyValueComponents, deleteKeyValueComponent } from "../../../utils/transactionTools";
import { StringFormats } from "../utils/StringFormats";

export class CookiesComponent extends UserInterfaceHandler<KeyValues<string>> {
	getUI(t: ITransaction, context: IContext): IUserInterface {
		let valueCurrent = this.getValueFromTransaction(t, context);
		return {
			type: UITypes.KeyValues,
			name: 'cookies',
			location: 'extra',
			count: String(valueCurrent.length),
		}
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		return hasComponent(t, 'headers');
	}

	getTransactionFromValue(valueNew: KeyValues<string>, tCurrent: ITransaction): ITransaction {
		if (valueNew.length > 0) {
			return setKeyValueComponent(
				tCurrent, 'headers', 'cookie', StringFormats.serializeCookieHeader(valueNew)
			);
		} else {
			return deleteKeyValueComponent(tCurrent, 'headers', 'cookie');
		}
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): KeyValues<string> {
		if (context === 'incoming') {
			let setCookies = getKeyValueComponents(tNew, 'headers', 'set-cookie');
			let host = getComponent<string>(tNew, 'host');
			return StringFormats.parseSetCookiesHeader(setCookies, host).map(
				(storeItem) => [storeItem.data.name, storeItem.data.value]
			);
		} else {
			let cookieHeader = getKeyValueComponent<string>(tNew, 'headers', 'cookie', '');
			return StringFormats.parseCookieHeader(cookieHeader);
		}
	}
}
