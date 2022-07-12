import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

const attachmentIdsPath = 'attachment-ids.json';
const savedAttachmentsPath = 'attachments/';

const attachmentIds = JSON.parse(fs.readFileSync(attachmentIdsPath));

for (const attachmentId of attachmentIds) {
	const savedAttachmentPath = `${savedAttachmentsPath}${attachmentId}.json`;

	if (fs.existsSync(savedAttachmentPath)) {
		console.log(`already saved: ${attachmentId}`);

		continue; // Stop if we've already saved this attachment.
	}

	const attachmentUrl = `https://orders-in-council.canada.ca/attachment.php?attach=${attachmentId}&lang=en`;

	const pageHtml = await fetchPage(attachmentUrl);

	const articleContent = extractArticle(pageHtml);

	const attachmentData = {
		id: attachmentId,
		...articleContent
	};

	fs.writeFileSync(savedAttachmentPath, JSON.stringify(attachmentData, null, 2));

	console.log(`scraped and saving: ${attachmentId} at ${savedAttachmentPath}`);
}

async function fetchPage(pageUrl) {
	const response = await fetch(pageUrl, {
		"headers": {
			"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
			"accept-language": "en-US,en;q=0.9",
			"cache-control": "max-age=0"
		  },
		  "body": null,
		  "method": "GET"
	});
	const responseHTML = await response.text();

	return responseHTML;
}

function extractArticle(html) {
	const $ = cheerio.load(html);

	const attachmentHtml = $('main').html();

	return {
		attachmentHtml
	};
}
