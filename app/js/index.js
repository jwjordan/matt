// include the ipc module to communicate with main process.
const ipcRenderer = require('electron').ipcRenderer;

// Extended DataStore class from Electron Store
// path is relative to index.html, which loads index.js as a module
const DataStore = require('./js/DataStore.js');
const appData = new DataStore({ name: 'AppData' });

const formSubmit = document.getElementById('talkForm');
const formClear = document.getElementById('clearTalk');
const speechInput = document.getElementById('speech');
const sideBar = document.getElementById('right_sidebar');
const favoritesSection = document.getElementById('favorites_section');

var sidebarContents = [
	"a", "an", "and", "but", "by", "for", "the", "with",
	"Hello", "Goodbye", "Yes", "No", "Thanks", "No Thanks"
];

const addToSpeechInput = (text) => {
	let speechInput = document.getElementById('speech');
	speechInput.value = (speechInput.value.trim() + ' ' + text).trim() + ' ';

	fetchSuggestions();
	speechInput.focus();
}

const fetchSuggestions = () => {
	const text = document.getElementById('speech').value;
	if (!text) return;
	ipcRenderer.invoke('suggest', text).then((r) => {
		if (r[0]) $('#predictive_button_1').html(r[0]);
		if (r[1]) $('#predictive_button_2').html(r[1]);
		if (r[2]) $('#predictive_button_3').html(r[2]);
	});
}

// credit https://codeburst.io/throttling-and-debouncing-in-javascript-b01cad5c8edf
const debounce = (func, delay) => {
  let inDebounce
  return function() {
    const context = this
    const args = arguments
    clearTimeout(inDebounce)
    inDebounce = setTimeout(() => func.apply(context, args), delay)
  }
}

// Bootstrap favorite placeholders for initial app load
if (appData.favorites.length == 0) {
	for (var i=1; i<=9; i++) {
		let placeholderObj = {number: i, name: "Favorite", value: "", color: ""};
		appData.addFavorite(placeholderObj);
	}
}

var mode = "view";

function renderFavorites() {
	let favorites = appData.favorites,
		favoritesHTML = "",
		favCount = 0,
		rowCount = 0;
	
	favorites.forEach(fav => {
		favCount++;

		if ((favCount % 3) == 1) {
			favoritesHTML += '<div class="row">';
		}

		// Using the color property in bootstrap requires a lot more than this
		//favoritesHTML += '<div class="col"><button class="btn btn-primary favorite_button" style="background-color: '+fav.color+'; border-color: '+fav.color+'" value='+fav.number+'>'+fav.name+'</button></div>';

		favoritesHTML += '<div class="col"><button class="btn btn-favorite favorite_button" value='+fav.number+'>';
		if (mode == "edit") {
			favoritesHTML += '<i class="fas fa-pen"></i> ';
		}
		favoritesHTML += fav.name+'</button></div>';

		if ((favCount % 3) == 0) {
			favoritesHTML += '</div>';
		}
	});
	favoritesSection.innerHTML = favoritesHTML;

	$('.favorite_button').click(function() {
		console.log("Category Button Clicked: ", $(this).val());

		// Get the value of the favorite
		let fav = favorites.find(f => f.number == $(this).val());

		// Check if we're in Edit mode
		if (mode == "edit") {
			$('#favorite-number').val($(this).val());
			$('#favorite-name').val(fav ? fav.name : "");
			$('#favorite-value').val(fav ? fav.value : "");
			$('#favorite-color').val(fav ? fav.color : "");
			$('#favEditModal').modal();
		} else {
			// Set the text box with the value
			addToSpeechInput(fav.value);
		}
	});
}


// Populate the page on document ready
$( document ).ready(function() {
	let favorites = appData.favorites;

	// Populate favorites
	renderFavorites();

	// Populate the right sidebar
	let sidebarHTML = "";
	sidebarContents.forEach(word => {
		sidebarHTML += '<button class="btn btn-secondary article_button">'+word+'</button>';
	});
	sideBar.innerHTML = sidebarHTML;
	
	// Populate the settings
	let appSettings = appData.getAppSettings();
	$('#rangeSpeed').val(appSettings.speed);
	$('#voiceSelect').val(appSettings.voice);

	$('.predictive_button').click(function() {
		console.log("Predictive Button Clicked: ", $( this ).text());
		addToSpeechInput($(this).text());
	});

	$('.article_button').click(function() {
		console.log("Article Button Clicked: ", $( this ).text());
		addToSpeechInput($(this).text());
	});

	$('#edit').click(function() {
		if (mode == "view") {
			// The user clicked Edit
			console.log("Edit clicked");
			mode = "edit";

			// Add edit visualization to each favorite button
			$('.favorite_button').each(function() {
				$(this).html('<i class="fas fa-pen"></i> ' + $(this).html());
			});

			// Toggle to Save button
			$('#edit').html('<i class="fas fa-save"></i>');
		} else {
			// The user clicked Save
			console.log("Save clicked");
			mode = "view";

			// Remove the edit visualization from each favorite button
			$('.favorite_button').each(function() {
				$(this).find('.fa-pen').removeClass('fa-pen');
			});

			// Toggle to Edit button
			$('#edit').html('<i class="fas fa-pen"></i>');
		}
	});
	
	$('#settings').click(function() {
		$('#settingsModal').modal();
	});
	
	$('#saveSettings').click(function() {
		let speed = $('#rangeSpeed').val(),
			 voice = $('#voiceSelect').val();
		
		appData.saveAppSettings({speed: speed, voice: voice});
		
		let settings = appData.getAppSettings();
		console.log("Settings: ", settings);
		
		$('#settingsModal').modal('hide');
	});

	$('#saveFav').click(function() {
		console.log("Clicked Save, mode is", mode);

		// Update the favorite
		let favorite = {
			number: $('#favorite-number').val(),
			name: $('#favorite-name').val(),
			value: $('#favorite-value').val(),
			color: $('#favorite-color').val()
		}
		console.log("Favorite data: ", favorite);

		appData.updateFavorite($('#favorite-number').val(), favorite);

		// Re-render the favorites list
		renderFavorites();

		$('#favEditModal').modal('hide');
	})
});


formSubmit.addEventListener('submit', function (e) {
	e.preventDefault();
	var arg = document.getElementById('speech').value;

	if (arg) {
		const originalHtml = $('#talk').html();
		$('#talk').attr('disabled', true);
		$('#talk').html('Speaking...');

		var arg = document.getElementById('speech').value;

		//send the info to main process . we can pass any arguments as second param.
		// ipcRender.invoke will pass the information to main process
		ipcRenderer.invoke('formSubmit', arg).then((r) => {
			// Clear the input box for the next round
			$('#talk').attr('disabled', false);
			$('#talk').html(originalHtml);
			speechInput.value = '';
		});
	}
});

formClear.addEventListener('click', function () {
	speechInput.value = '';
});

speechInput.addEventListener('keyup', debounce(function () {
	fetchSuggestions();
}, 500));
