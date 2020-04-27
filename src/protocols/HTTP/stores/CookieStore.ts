'use strict';

import { Store, StoreItem } from "../../../stores/Store";
import { ITransaction, IContext } from "../../../interfaces";
import { setKeyValueComponent, getComponent, getKeyValueComponent, getKeyValueComponents, deleteKeyValueComponent, hasComponent } from "../../../utils/transactionTools";
import { StringFormats } from "../utils/StringFormats";

export interface CookieItem {
	name: string;
	value: string;

	domain: string;
	path?: string;
	tlsOnly: boolean;
	httpOnly: boolean;
	sameSite: 'strict' | 'lax' | 'none';
}

export class CookieStore extends Store<CookieItem> {
	public shouldProcess(t: ITransaction, context: IContext): boolean {
		return hasComponent(t, 'headers');
	}

	public areItemsEqual(item1: StoreItem<CookieItem>, item2: StoreItem<CookieItem>): boolean {
		if (item1.data.name !== item2.data.name)
			return false;

		if (item1.data.domain !== item2.data.domain)
			return false;

		return true;
	}

	public matchesKey(key: string, item: StoreItem<CookieItem>): boolean {
		if (key === '')
			return false;

		let pathIndex = key.indexOf('/');
		let domain: string, path: string;
		if (pathIndex >= 0) {
			domain = key.substr(0, pathIndex);
			path = key.substr(pathIndex);
		} else {
			domain = key;
			path = '/';
		}

		if (item.data.domain !== undefined && !domain.endsWith(item.data.domain)) {
			return false;
		}

		if (item.data.path !== undefined && !path.startsWith(item.data.path)) {
			return false;
		}

		return true;
	}

	public getKeyFilterFromTransaction(t: ITransaction): string {
		return this.getDomainFromHost(getComponent<string>(t, 'host')) + getComponent<string>(t, 'path', '');
	}

	public getStoreItemsFromTransaction(t: ITransaction, context: IContext): StoreItem<CookieItem>[] {
		if (context === 'incoming') {
			// Set-Cookie: <cookie-name>=<cookie-value>; Domain=<domain-value>; Secure; HttpOnly
			let setCookies: string[] = getKeyValueComponents<string>(t, 'headers', 'set-cookie');
			let host = this.getDomainFromHost(getComponent<string>(t, 'host'));
			return StringFormats.parseSetCookiesHeader(setCookies, host);
		} else {
			// Cookie: <cookie-name>=<cookie-value>; <cookie-name>=<cookie-value>; ...
			let cookieHeader = getKeyValueComponent<string>(t, 'headers', 'cookie', '');
			let keyDomain = this.getDomainFromHost(getComponent<string>(t, 'host'));
			return StringFormats.parseCookieHeader(cookieHeader).map(([key, value]) => {
				let storeItem: StoreItem<CookieItem> = {
					ttlSec: Number.POSITIVE_INFINITY,
					timestampSec: (new Date()).getTime() / 1000,

					data: {
						name: key,
						value: value,

						domain: keyDomain,
						tlsOnly: true,
						httpOnly: true,
						sameSite: 'strict',
					}
				};
				return storeItem;
			});
		}
	}

	public getTransactionFromStoreItems(items: StoreItem<CookieItem>[], tCur: ITransaction): ITransaction {
		if (items.length === 0) {
			return deleteKeyValueComponent(tCur, 'headers', 'cookie');
		}

		let cookieHeader = items.map(
			(item) => encodeURIComponent(item.data.name) + '=' + encodeURIComponent(item.data.value)
		).join('; ');

		return setKeyValueComponent(tCur, 'headers', 'cookie', cookieHeader);
	}

	private getDomainFromHost(host: string): string {
		let res = /(.*?:\/\/|)?([^\/]*)(.*)$/.exec(host);
		let domain = res![2];
		if (!domain)
			return '';
		return domain;
	}
}