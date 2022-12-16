import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

const attachmentIdsPath = 'attachment-ids.json';
const savedAttachmentsPath = 'attachments/';

const attachmentIds = JSON.parse(fs.readFileSync(attachmentIdsPath));

for (const attachmentId of attachmentIds) {
	const savedAttachmentPath = `${savedAttachmentsPath}${attachmentId}.json`;
	const savedAttachment = JSON.parse(fs.readFileSync(savedAttachmentPath));

	if ('undefined' !== typeof savedAttachment.attachmentText) {
		console.log(`already extracted text: ${attachmentId}`);

		continue; // Stop if we've already parsed this attachment.
	}

	const attachmentData = {
		...savedAttachment,
		...extractAttachmentText(savedAttachment.attachmentHtml)
	};

	fs.writeFileSync(savedAttachmentPath, JSON.stringify(attachmentData, null, 2));

	console.log(`parsed and saving: ${attachmentId} at ${savedAttachmentPath}`);
}

function extractAttachmentText(html) {
	const $ = cheerio.load(`<main>${html}</main>`, undefined, false);

	const attachmentText = $('main').prop('innerText');

	return {
		attachmentText
	};
}
