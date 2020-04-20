'use strict';

const msToS = 1000;
const sToMin = 60;
const minToHour = 60;

export class Formats {
	static msToString(ms: number): string {
		if (ms < msToS) {
			return ms.toFixed(2) + ' ms';
		}

		let s = ms / msToS;

		if (s < sToMin) {
			return s.toFixed(2) + ' s';
		}

		let min = s / sToMin;

		if (min < minToHour) {
			return min.toFixed(2) + ' min';
		}

		let hours = min / minToHour;

		if (hours === 1) {
			return '1 hour';
		}

		return hours.toFixed(2) + 'hours';
	}

	static byteCountToString(byteCount: number): string {
		if (byteCount < (1 << 10))
			return `${byteCount} B`;
		else if (byteCount < (1 << 20))
			return `${(byteCount / (1 << 10)).toFixed(2)} KB`;
		else if (byteCount < (1 << 30))
			return `${(byteCount / (1 << 20)).toFixed(2)} MB`;
		else if (byteCount < (1 << 40))
			return `${(byteCount / (1 << 30)).toFixed(2)} GB`;
		else
			return `${(byteCount / (1 << 40)).toFixed(2)} TB`;
	}
}
