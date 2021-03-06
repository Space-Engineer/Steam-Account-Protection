function trade_window() {
	if (!is_valid) return;		// If the trade window is in an error state, or otherwise is incompatible, do nothing.

	/* ------------------------- Variables and constants ------------------------ */
	// Short-hands
	const { api_warning, tw_impersonator_scanner, tw_reputation_scanner } = sap_extension.settings.trade_window;

	// Partner
	const partner = {
		personaname: qsa('.offerheader')[1].childNodes[2].nextSibling.innerText.split("'s items:\nThese are the items you will receive in the trade.")[0],
		steamid: qs('#inventories').children[3].id.split('_')[1],
		profile_picture: qsa('.avatarIcon')[1].childNodes[0].childNodes[0].src.split('.jpg')[0] + '_full.jpg',
		url: qsa('.trade_partner_steam_level_desc,.trade_partner_info_text')[1].childNodes[1].href,
		level: qsa('.trade_partner_info_text')[2].innerText.replace('has a Steam Level of ', ''),
		// Below is data not normally provided by this type of object.
		is_friend: !qs(`.trade_partner_not_friends`),
		account_creation_date: qs(`.trade_partner_member_since `).innerText
	};
	var buddy = {};

	/* --------------------------------- Master --------------------------------- */
	buddy = storage.find_buddy(partner.steamid);
	load_custom_content();
	show_trade_toolbar();

	if (api_warning) show_api_warning();
	if (tw_impersonator_scanner) impersonator_scanner(partner);
	if (tw_reputation_scanner) rep_scan();

	/* -------------------------------- Functions ------------------------------- */
	function load_custom_content() {
		qs(`head`).insertAdjacentHTML(`beforeend`, `<link type="text/css" rel="stylesheet" href="${chrome.extension.getURL(`html/stylesheets/overlay.css`)}">`);
		qs(`head`).insertAdjacentHTML(`beforeend`, `<link type="text/css" rel="stylesheet" href="${chrome.extension.getURL(`html/stylesheets/trade_window.css`)}">`);
		qs(`head`).insertAdjacentHTML(`beforeend`, `<link type="text/css" rel="stylesheet" href="${chrome.extension.getURL(`html/stylesheets/generic.css`)}">`);
	}

	function show_trade_toolbar() {
		load_trade_toolbar();
		qsa(`#trade-toolbar .bpanel`).forEach(add_events);  // Add listeners to the buttons

		function load_trade_toolbar() {
			qs(`.trade_partner_header`).lastChild.remove();
			qs(`#mainContent .trade_partner_header`).innerHTML = html_elements.trade_window.trade_toolbar(partner);
			qs(`.trade_partner_header`).insertAdjacentHTML(`beforeend`, `<div style="clear:left;"></div>`);
		}
		function add_events(button_element) {
			button_element.addEventListener(`click`, () => open_trade_toolbar_box(button_element.dataset.target, button_element));
		}
		function open_trade_toolbar_box(target, button_element) {
			// Panel
			qsa(`.info-box`).forEach((info_box) => info_box.classList.add(`hidden`));
			qs(`#trade-toolbar-${target}`).classList.remove(`hidden`);

			// Button
			qsa(`#trade-toolbar .button`).forEach((button) => button.classList.remove(`btn_active`));
			button_element.classList.add(`btn_active`);
			button_element.blur();
		}
	}
	function show_api_warning() {
		webrequest(`get`, `https://steamcommunity.com/dev/apikey`)
			.then(has_api_key)
			.then(load_warning)
			.catch(() => error());

		function has_api_key(response) {
			return response.includes(`Key: `);
		}

		function load_warning(has_key) {
			if (has_key) add_warning_to_toolbar(`API key is registered`);
		}
		function error() {
			add_warning_to_toolbar(`API key detection error`);
		}
	}
	function add_warning_to_toolbar(text) {
		const warning_button = qs(`#trade-toolbar #warning-button`);
		const warning_element = qs(`#trade-toolbar-warnings`);

		warning_button.classList.remove(`hidden`);
		warning_button.classList.add(`btn_bad`);
		warning_element.insertAdjacentHTML(`beforeend`, html_elements.trade_window.trade_toolbar_box(text));
	}

	function rep_scan() {
		qs(`#trade-toolbar #reputation-button`).classList.remove(`hidden`);
		const reputation_element = qs(`#reputation-results`);
		const last_check_element = qs(`#reputation-last-check`);

		reputation_scanner(partner.steamid)
			.then(show_on_toolbar)
			.catch(error);

		function show_on_toolbar(reputation) {
			last_check_element.innerText = time.utc_to_string(reputation.last_check);

			if (reputation.bad_tags.length !== 0) {
				reputation_element.classList.add(`sap-critical`);
				reputation_element.innerText = array_to_string(reputation.bad_tags);
				add_warning_to_toolbar(`Bad Reputation`);
			} else if (reputation.good_tags.length !== 0) {
				reputation_element.classList.add(`sap-good`);
				reputation_element.innerText = array_to_string(reputation.good_tags);
			} else {
				reputation_element.innerText = `Normal`;
			}
		}
		function error() {
			last_check_element.innerText = `Error`;
			reputation_element.innerText = `Error`;
			reputation_element.classList.add(`sap-warning`);
		}
	}
	function is_valid() {
		return document.getElementsByClassName('offerheader')[1] && document.getElementsByClassName('avatarIcon')[1];
	}
}