const fs = require('fs');

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const savedOrderTablesPath = 'order-tables/';
const savedOrderTables = fs.readdirSync(savedOrderTablesPath).filter(filename => filename !== ".gitkeep");

function extractAttachmentUrls(orderTable) {
	orderTableDom = new JSDOM(orderTable.html);

	return Array.from(orderTableDom.window.document.querySelectorAll('a'))
		.map(linkNode => linkNode.href)
		.filter(linkHref => linkHref.includes('attachment.php'));
}

for (let orderTablePath in savedOrderTables) {
	let orderTable = JSON.parse(fs.readFileSync(orderTablePath));
	
	fs.writeFileSync(
		orderTablePath,
		JSON.stringify({
			...orderTable,
			attachments: extractAttachmentUrls(orderTable)
		}, null, 2)
	);

	console.log(`updated ${orderTablePath}`);
}
