async function getTransactions() {
	console.log('fetching transactions...');
	const url = 'https://www.barclaycardus.com/servicing/jserv/transaction/getPostedTransactions?cycleDate=06/12/22&_=1656346342702';
	const options = {
		headers: {
			accept: 'application/json, text/javascript',
			'accept-language': 'en',
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			'sec-ch-ua': '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
			'x-requested-with': 'XMLHttpRequest',
		},
		referrer: 'https://www.barclaycardus.com/servicing/activity',
		referrerPolicy: 'strict-origin-when-cross-origin',
		body: null,
		method: 'GET',
		mode: 'cors',
		credentials: 'include',
	};

	const res = await fetch(url, options);
	const data = await res.json();

	return data;
}

async function handleClick(event) {
	event.preventDefault();

	console.log(await getCurrentTab());
	return;
	try {
		const data = await getTransactions();

		const transactions = data.transactions.map(item => ({
			...item,
			amount: item.amount.fAmount,
			merchantCategoryType: `${item.merchantCategoryType.value} - ${item.merchantCategoryType.description}`,
			merchantLocation: `${item.merchantLocation.city} ${item.merchantLocation.state} ${item.merchantLocation.zipCode}`,
		}));

		console.log(data);
		generateCsv(transactions, 'test.csv');
	} catch (err) {
		console.log(err);
	}
}

download.addEventListener('click', handleClick);

function saveAs(blob, filename) {
	const url = window.URL.createObjectURL(blob);
	const _element = document.createElement('a');
	_element.href = url;
	_element.setAttribute('download', filename);
	_element.click();
}

function generateCsv(items, filename) {
	const csv = Papa.unparse(items);
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	saveAs(blob, filename);
}

async function getCurrentTab() {
	let queryOptions = { active: true };
	let [tab] = await chrome.tabs.query(queryOptions);
	console.log(tab);
	const scriptToExec = `(${scrapeThePage})()`;
	console.log(scriptToExec);

	// Run the script in the context of the tab
	const scraped = await chrome.scripting.executeScript({
		target: { tabId: tab.id },
		func: scrapeThePage,
	});
	console.log(scraped);

	return tab;
}

function scrapeThePage() {
	return document.querySelector('#answer-14362608 > div > div.answercell.post-layout--right > div.mt24 > div > div:nth-child(3) > div').innerHTML;
}
