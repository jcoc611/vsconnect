'use strict';

import * as FormData from 'form-data';
import * as fs from 'fs';
import { MultipartValue } from "../components/BodyMultipart";

export class BodyUtils {
	static multipartFormData(multipart: MultipartValue): FormData {
		let form = new FormData();

		for (let [name, data, contentType] of multipart) {
			if (data.type === 'empty') {
				form.append(name, '', { contentType });
			} else if (data.type === 'string') {
				form.append(name, data.rawValue, { contentType });
			} else if (data.type === 'file') {
				form.append(name, fs.readFileSync(data.path), {
					contentType,
					filename: data.name,
					knownLength: data.sizeBytes
				});
			}
		}

		return form;
	}
}
