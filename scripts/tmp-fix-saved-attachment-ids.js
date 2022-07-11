const fs = require('fs');

const savedOrderTablesPath = 'order-tables/';
const savedOrderTables = fs.readdirSync(savedOrderTablesPath).filter(filename => filename.endsWith("json"));

for (let orderTableFilename of savedOrderTables) {
	let orderTablePath = savedOrderTablesPath + orderTableFilename;

	let orderTable = JSON.parse(fs.readFileSync(orderTablePath));

	orderTable.attachments = orderTable.attachments
		.map(attachmentUrl => attachmentUrl.replace('attachment.php?attach=', ''))
		.map(attachmentUrl => attachmentUrl.replace('&lang=en', ''));

	fs.writeFileSync(
		orderTablePath,
		JSON.stringify(orderTable, null, 2)
	);

	console.log(`updated ${orderTablePath}`);
}
