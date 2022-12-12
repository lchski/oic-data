import fs from 'fs';

import MD5 from 'crypto-js/md5.js';

const savedOrderTablesPath = 'order-tables/';
const attachmentIdsPath = 'attachment-ids.json';

// NB: run within the puppeteer Chrome instance—doesn't have access to script scope
async function extractOrderTables() {
	orderTables = Array.from(document.querySelectorAll('main > form > table'));

	function textFromCellReference(node, tr_num, td_num) {
		return node.querySelector('tr:nth-of-type(' + tr_num + ') > td:nth-of-type(' + td_num + ')').innerText;
	}

	function textFromXpath(node, xpath) { // xpath must start with './/' to be inside `node` context
		return document.evaluate(xpath, node, null, XPathResult.STRING_TYPE).stringValue;
	}

	function registrationFromNode(node) {
		return textFromXpath(node, './/td[text()="Registration"]/following-sibling::td[@colspan=5 or @id="registration"]')
	}

	function parseRegistration(registrationText) {
		let registrationRegex = "Registration: ([A-Z]*) ?\/(?: ([0-9]{4}-[0-9]{4})  Publication Date: ([0-9]{4}-[0-9]{2}-[0-9]{2}))?";

		let parsedRegistration = registrationText.match(registrationRegex);

		if (null == parsedRegistration) {
			return {
				type: '',
				id: '',
				publication_date: '',
			}
		}

		return {
			type: parsedRegistration[1],
			id: null == parsedRegistration[2] ? '' : parsedRegistration[2],
			publication_date: null == parsedRegistration[3] ? '' : parsedRegistration[3],
		}
	}

	return orderTables.map((tableNode) => ({
		html: tableNode.outerHTML,
		pcNumber: textFromCellReference(tableNode, 2, 2),
		date: textFromCellReference(tableNode, 2, 3),
		chapter: textFromCellReference(tableNode, 2, 4),
		bill: textFromCellReference(tableNode, 2, 5),
		department: textFromCellReference(tableNode, 2, 6),
		act: textFromXpath(tableNode, './/td[text()="Act"]/following-sibling::td[@colspan=5]'),
		subject: textFromXpath(tableNode, './/td[text()="Subject"]/following-sibling::td[@colspan=5]'),
		precis: textFromXpath(tableNode, './/td[text()="Precis"]/following-sibling::td[@colspan=5 or @id="precis"]'),
		registration: registrationFromNode(tableNode),
		registration_type: parseRegistration(registrationFromNode(tableNode))['type'],
		registration_id: parseRegistration(registrationFromNode(tableNode))['id'],
		registration_publication_date: parseRegistration(registrationFromNode(tableNode))['publication_date'],
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

export function filenameFromOrderTable(orderTable) {
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