/*

1. [browser scraping stuff, ref https://www.smashingmagazine.com/2021/03/ethical-scraping-dynamic-websites-nodejs-puppeteer/]
    - see how many pages
    - for loop n pages
2. Save all `table` within `main[role=main] > form`
3. Hash contents of each `table`
4. Save contents if (! exists: PC number + #3 hash as filename)
5. [go to next page, continue]

*/

const fs = require('fs');

const puppeteer = require('puppeteer');
const MD5 = require('crypto-js/md5');

const savedOrderTablesPath = 'order-tables/';

// NB: run within the puppeteer Chrome instance—doesn't have access to script scope
async function extractOrderTables() {
	orderTables = Array.from(document.querySelectorAll('main > form > table'));
	
	return orderTables.map((tableNode) => ({
		html: tableNode.outerHTML,
		pcNumber: tableNode.querySelector('tr:nth-of-type(2) > td:nth-of-type(2)').innerText
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
	return `${orderTable.pcNumber}-${orderTable.htmlHash}.json`;
}

function saveOrderTables(orderTables) {
	orderTables.forEach((orderTable) => {
		console.log(`saving ${filenameFromOrderTable(orderTable)}`);
		fs.writeFileSync(`${savedOrderTablesPath}${filenameFromOrderTable(orderTable)}`, JSON.stringify(orderTable, null, 2));
	});
}

(async function scrape() {
	const browser = await puppeteer.launch({ headless: false });
	
	const page = await browser.newPage();
	await page.goto('https://orders-in-council.canada.ca/index.php?lang=en');
	
	await page.waitForSelector('#btnSearch');
	await page.click('#btnSearch');

	// get list of stored tables from disk, convert to comparable form

	let savedOrderTables = fs.readdirSync(savedOrderTablesPath).filter(filename => filename !== ".gitkeep");

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

