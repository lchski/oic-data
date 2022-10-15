import fs from 'fs';

import puppeteer from 'puppeteer';

import { parse } from 'csv-parse';

import { scrapeResultPage, saveOrderTables } from './lib/scraping.js';

const missingOrdersPath = 'processed-csvs/missing-oic-pc-numbers.csv';

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

		console.log(`attempting to scrape unpublished OIC ${missingOrder.pc_number}`);
		let orderTables = await scrapeResultPage(page);

		console.log('scraped', orderTables);
		saveOrderTables(orderTables);

		// wait for five seconds, to be polite
		await new Promise(r => setTimeout(r, 5000));

		// scraped the tables present, go back to search
		await page.goto('https://orders-in-council.canada.ca/index.php?lang=en');

		missingOrders.push(missingOrder);
	}

	await browser.close();
	return;
})();

