const fs = require('fs');

const savedOrderTablesPath = 'order-tables/';
const savedOrderTables = fs.readdirSync(savedOrderTablesPath).filter(filename => filename !== ".gitkeep").filter(filename => filename.endsWith("json"));



function listAttachmentUrls() {
	let attachmentUrls = [];

	for (let orderTableFilename of savedOrderTables) {
		let orderTablePath = savedOrderTablesPath + orderTableFilename;
	
		let orderTable = JSON.parse(fs.readFileSync(orderTablePath));
	
		attachmentUrls = [...new Set([...orderTable.attachments, ...attachmentUrls])].sort();
	
		if (orderTable.attachments.length > 0) {
			fs.writeFileSync('attachment-urls.json', JSON.stringify(attachmentUrls, null, 2));
		}
		console.log(`${orderTablePath} - ${orderTable.attachments.length} attachments`);
	}

	fs.writeFileSync('attachment-urls.json', JSON.stringify(attachmentUrls, null, 2));
}
listAttachmentUrls();


