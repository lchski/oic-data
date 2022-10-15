import fs from 'fs';

import MD5 from 'crypto-js/md5.js';

const savedOrderTablesPath = 'order-tables/';
const attachmentIdsPath = 'attachment-ids.json';

// NB: run within the puppeteer Chrome instance—doesn't have access to script scope
async function extractOrderTables() {
	orderTables = Array.from(document.querySelectorAll('main > form > table'));
	
	return orderTables.map((tableNode) => ({
		html: tableNode.outerHTML,
		pcNumber: tableNode.querySelector('tr:nth-of-type(2) > td:nth-of-type(2)').innerText,
		attachments: Array.from(
			tableNode.querySelectorAll('a'))
				.map(linkNode => linkNode.href.replace(linkNode.origin, "").replace("/", "")) // get just "attachment.php" and on
				.filter(linkHref => linkHref.includes('attachment.php'))
				.map(linkHref => linkHref.replace('attachment.php?attach=', ''))
				.map(linkHref => linkHref.replace('&lang=en', ''))
	}));
}

export async function scrapeResultPage(page) {
	await page.waitForSelector('.btn-toolbar');

	let orderTables = await page.evaluate(extractOrderTables);
	
	orderTables = orderTables.map((orderTable) => ({
		...orderTable,
		htmlHash: MD5(orderTable.html).toString()
	}));

	return orderTables;
}

function filenameFromOrderTable(orderTable) {
	return `${orderTable.pcNumber}.json`;
}

export function saveOrderTables(orderTables) {
	let attachmentIds = JSON.parse(fs.readFileSync(attachmentIdsPath));

	orderTables.forEach((orderTable) => {
		console.log(`saving ${filenameFromOrderTable(orderTable)}`);

		// update list of attachment IDs with any new ones from this orderTable
		attachmentIds = [...new Set([...orderTable.attachments, ...attachmentIds])].sort();

		// save orderTable
		fs.writeFileSync(`${savedOrderTablesPath}${filenameFromOrderTable(orderTable)}`, JSON.stringify(orderTable, null, 2));
	});

	// save revised list of attachment IDs
	fs.writeFileSync(attachmentIdsPath, JSON.stringify(attachmentIds, null, 2));
}