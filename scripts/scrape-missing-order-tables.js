import fs from 'fs';

import puppeteer from 'puppeteer';
import MD5 from 'crypto-js/md5.js';

import { parse } from 'csv-parse';

const savedOrderTablesPath = 'order-tables/';
const attachmentIdsPath = 'attachment-ids.json';

const missingOrdersPath = 'processed-csvs/missing-oic-pc-numbers.csv';

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

async function scrapeResultPage(page) {
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

function saveOrderTables(orderTables) {
	let attachmentIds = JSON.parse(fs.readFileSync(attachmentIdsPath));

	orderTables.forEach((orderTable) => {
		console.log(`saving ${filenameFromOrderTable(orderTable)}`);

		attachmentIds = [...new Set([...orderTable.attachments, ...attachmentIds])].sort();

		fs.writeFileSync(`${savedOrderTablesPath}${filenameFromOrderTable(orderTable)}`, JSON.stringify(orderTable, null, 2));
	});

	fs.writeFileSync(attachmentIdsPath, JSON.stringify(attachmentIds, null, 2));
}

(async function scrape() {
	const browser = await puppeteer.launch({ headless: true });

	const page = await browser.newPage();
	await page.goto('https://orders-in-council.canada.ca/index.php?lang=en');

	const missingOrders = [];

	const missingOrdersParser = fs.createReadStream(missingOrdersPath)
		.pipe(
			parse({
				delimiter: ',',
				columns: true,
				ltrim: true,
			})
		);
	
	for await (const missingOrder of missingOrdersParser) {
		await page.waitForSelector('#btnSearch');

		await page.type('#pcNumber', missingOrder.pc_number);
		await page.click('#btnSearch');

		await page.waitForNavigation();
		await page.waitForSelector('.btn-toolbar');

		console.log(`attempting to scrape missing OIC ${missingOrder.pc_number}`);
		let orderTables = await scrapeResultPage(page);

		console.log('scraped', orderTables);
		saveOrderTables(orderTables);

		// wait for five seconds, to be polite
		await new Promise(r => setTimeout(r, 5000));

		// scraped the tables present, go back to search
		await page.goto('https://orders-in-council.canada.ca/index.php?lang=en');

		missingOrders.push(missingOrder);
	}

	console.log(missingOrders);

	await browser.close();
	return;
})();

