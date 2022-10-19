export const setButtonState = (btn, isLoading = true) => {
	const spinner = btn.children[0];
	const label = btn.children[1];
	const loadingText = btn.children[2];

	spinner?.classList[isLoading ? 'remove' : 'add']('hidden');
	label?.classList[isLoading ? 'add' : 'remove']('hidden');
	loadingText?.classList[isLoading ? 'remove' : 'add']('hidden');
};

export const buttonState = new Proxy(setButtonState, {
	apply: (target, _, argsList) => {
		const { id, isLoading = true } = argsList[0] || {};

		if (id) {
			const element = document.getElementById(id);

			if (element) {
				return target(element, isLoading);
			}
		}
	},
});
