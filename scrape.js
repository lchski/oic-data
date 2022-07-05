/*

1. [browser scraping stuff, ref https://www.smashingmagazine.com/2021/03/ethical-scraping-dynamic-websites-nodejs-puppeteer/]
    - see how many pages
    - for loop n pages
2. Save all `table` within `main[role=main] > form`
3. Hash contents of each `table`
4. Save contents if (! exists: PC number + #3 hash as filename)
5. [go to next page, continue]

*/

const puppeteer = require('puppeteer');
const MD5 = require('crypto-js/md5');


// NB: run within the puppeteer Chrome instance—doesn't have access to script scope
async function extractOrderTables() {
	orderTables = Array.from(document.querySelectorAll('main > form > table'));
	
	return orderTables.map((tableNode) => ({
		html: tableNode.outerHTML,
		pcNumber: tableNode.querySelector('tr:nth-of-type(2) > td:nth-of-type(2)').innerText
	}));
}

(async function scrape() {
	const browser = await puppeteer.launch({ headless: false });
	
	const page = await browser.newPage();
	await page.goto('https://orders-in-council.canada.ca/index.php?lang=en');
	
	await page.waitForSelector('#btnSearch');
	await page.click('#btnSearch');

	await page.waitForSelector('.btn-toolbar');

	let pageCount = await page.evaluate(() => {
		return parseInt(document.querySelector('.btn-toolbar + .pagebutton').innerText);
	});

	let orderTables = await page.evaluate(extractOrderTables);
	
	orderTables = orderTables.map((orderTable) => ({
		...orderTable,
		htmlHash: MD5(orderTable.html).toString()
	}));

	console.log(pageCount);
	console.log(orderTables);

	// await browser.close();
})();

