'use strict';

export class DOMUtils {
	static hasParentWithClass(ele: HTMLElement, className: string): boolean {
		let eleCur: HTMLElement | null = ele.parentElement;
		while (eleCur && eleCur !== document.body) {
			if (eleCur.classList.contains(className)) {
				return true;
			}

			eleCur = eleCur.parentElement;
		}

		return false;
	}

	static getParentWithClass(ele: HTMLElement, className: string): HTMLElement | null {
		let eleCur: HTMLElement | null = ele.parentElement;
		while (eleCur && eleCur !== document.body) {
			if (eleCur.classList.contains(className)) {
				return eleCur;
			}

			eleCur = eleCur.parentElement;
		}

		return null;
	}
}
