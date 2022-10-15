/*

1. [browser scraping stuff, ref https://www.smashingmagazine.com/2021/03/ethical-scraping-dynamic-websites-nodejs-puppeteer/]
    - see how many pages
    - for loop n pages
2. Save all `table` within `main[role=main] > form`
3. Hash contents of each `table`
4. Save contents if (! exists: PC number + #3 hash as filename)
5. [go to next page, continue]

*/

import fs from 'fs';

import puppeteer from 'puppeteer';

import { scrapeResultPage, saveOrderTables, filenameFromOrderTable } from './lib/scraping.js';

const savedOrderTablesPath = 'order-tables/';

(async function scrape() {
	const browser = await puppeteer.launch({ headless: true });
	
	const page = await browser.newPage();
	await page.goto('https://orders-in-council.canada.ca/index.php?lang=en');
	
	await page.waitForSelector('#btnSearch');
	await page.click('#btnSearch');

	// get list of stored tables from disk, convert to comparable form

	let savedOrderTables = fs.readdirSync(savedOrderTablesPath).filter(filename => filename.endsWith("json"));

	await page.waitForSelector('.btn-toolbar');

	let currentPage = 1;
	const totalPages = await page.evaluate(() => {
		return parseInt(document.querySelector('.btn-toolbar + .pagebutton').innerText);
	});

	while(currentPage <= totalPages) {
		console.log(`scraping page ${currentPage}`);
		let orderTables = await scrapeResultPage(page);

		// if all scraped order tables have already been saved, quit
		if (orderTables.map(filenameFromOrderTable).every((filename) => savedOrderTables.includes(filename))) {
			console.log('scraped orders already saved, quitting');
			break;
		}

		console.log('new tables, saving');
		saveOrderTables(orderTables);

		currentPage++;
		await page.goto(`https://orders-in-council.canada.ca/results.php?pageNum=${currentPage}&lang=en`);
	}

	await browser.close();
	return;
})();

