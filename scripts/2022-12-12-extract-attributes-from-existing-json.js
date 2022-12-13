import fs from 'fs';

import xpath from 'xpath';
import { DOMParser as dom } from 'xmldom';

const savedOrderTablesPath = 'order-tables/';

let savedOrderTables = fs.readdirSync(savedOrderTablesPath).filter(filename => filename.endsWith("json"));



function textFromCellReference(domContext, tr_num, td_num) {
	return xpath.select(`string(.//tr[${tr_num}]/td[${td_num}])`, domContext);
}

function textFromXpath(domContext, xpathSelector) { // xpath must start with './/' to be inside `node` context
	return xpath.select(`string(${xpathSelector})`, domContext);
}

function registrationFromNode(domContext) {
	return xpath.select('string(.//td[text()="Registration"]/following-sibling::td[@colspan=5 or @id="registration"])', domContext);
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

savedOrderTables = [
	"2008-0046.json",
	"2022-1314.json",
	"2022-1294.json",
	"2022-1293.json",
]

for (const savedOrderTableFilename of savedOrderTables) {
	const orderTablePath = `${savedOrderTablesPath}${savedOrderTableFilename}`;

	const savedOrderTable = JSON.parse(fs.readFileSync(orderTablePath));

	if ('undefined' !== typeof savedOrderTable.date) {
		console.log(`${savedOrderTable.pcNumber} already has date attribute, skipping`);

		continue; // this OT already has a `date` attribute, so we assume it's been parsed
	}

	console.log(`extracting additional attributes for ${savedOrderTable.pcNumber}`);

	const orderTableDom = new dom().parseFromString(savedOrderTable.html.replaceAll('&nbsp;', ''));

	const expandedOrderTable = {
		...savedOrderTable,
		date: textFromCellReference(orderTableDom, 2, 3),
		chapter: textFromCellReference(orderTableDom, 2, 4),
		bill: textFromCellReference(orderTableDom, 2, 5),
		department: textFromCellReference(orderTableDom, 2, 6),
		act: textFromXpath(orderTableDom, './/td[text()="Act"]/following-sibling::td[@colspan=5]'),
		subject: textFromXpath(orderTableDom, './/td[text()="Subject"]/following-sibling::td[@colspan=5]'),
		precis: textFromXpath(orderTableDom, './/td[text()="Precis"]/following-sibling::td[@colspan=5 or @id="precis"]'),
		registration: registrationFromNode(orderTableDom),
		registration_type: parseRegistration(registrationFromNode(orderTableDom))['type'],
		registration_id: parseRegistration(registrationFromNode(orderTableDom))['id'],
		registration_publication_date: parseRegistration(registrationFromNode(orderTableDom))['publication_date'],
	}

	fs.writeFileSync(orderTablePath, JSON.stringify(expandedOrderTable, null, 2));
}
