async function getTransactions(date) {
	const url = `https://www.barclaycardus.com/servicing/jserv/transaction/getPostedTransactions?cycleDate=${date || ''}&_=${Date.now()}`;
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

	if (data?.redirectURL?.includes('/authenticate')) {
		throw new Error('You must login first');
	}
	return data;
}

function setButtonState(isDownloading) {
	if (isDownloading) {
		download.setAttribute('disabled', true);
		download.innerHTML = '<img src="three-dots.svg" width="100%" />';
	} else {
		download.removeAttribute('disabled');
		download.innerHTML = 'Download';
	}
}

function setFeedbackState(html = '', className = '') {
	feedback.className = className;
	feedback.innerHTML = html;
}

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
	let queryOptions = { active: true, currentWindow: true };
	let [tab] = await chrome.tabs.query(queryOptions);

	return tab;
}

function getStatementDateElementValue() {
	return document.querySelector('#tp_cycles')?.value;
}

async function getStatementDate() {
	const tab = await getCurrentTab();
	const data = await chrome.scripting.executeScript({
		target: { tabId: tab.id },
		func: getStatementDateElementValue,
	});

	return data[0]?.result;
}

function getDateString(date) {
	if (!date) return getDateString(new Date().toISOString());
	return date.split('T')[0];
}

const isBarclaysWebsite = string => /^https:\/\/\w+\.barclaycardus.com/.test(string);

// handlers
async function handleClick(event) {
	event.preventDefault();
	setFeedbackState();
	setButtonState(true);

	try {
		const date = await getStatementDate();
		const data = await getTransactions(date);

		const transactions = data.transactions.map(item => {
			const {
				amount: { fAmount: amount },
				merchantCategoryType,
				merchantLocation,
			} = item;

			return {
				...item,
				amount: item.type === 'PURCHASE' ? amount : -amount,
				merchantCategoryType: `${merchantCategoryType.value} - ${merchantCategoryType.description}`,
				merchantLocation: `${merchantLocation.city} ${merchantLocation.state} ${merchantLocation.zipCode}`,
			};
		});

		const { statementBeginDate, statementDate } = transactions[0];

		const filename = `Barclays ${getDateString(statementBeginDate)} - ${getDateString(statementDate)}.csv`;
		generateCsv(transactions, filename);
		setFeedbackState('Statement download successfully', 'success');
	} catch (err) {
		setFeedbackState(err.message, 'error');
	}
	setButtonState();
}

async function onLoadHandler() {
	const tab = await getCurrentTab();
	if (!tab || !isBarclaysWebsite(tab.url)) {
		const html = 'You must open <a class="underline" target="_blank" href="https://www.barclaycardus.com">https://www.barclaycardus.com</a>';
		setFeedbackState(html, 'error');
		return;
	}

	download.removeAttribute('disabled');
}

// events
download.addEventListener('click', handleClick);
window.onload = onLoadHandler;
