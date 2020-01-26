const {
	app,
	BrowserWindow,
	ipcMain
} = require('electron');
const rp = require('request-promise-native');

const DataStore = require('./app/js/DataStore.js');
const appData = new DataStore({ name: 'AppData' });

// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
	// squirrel event handled and app will exit in 1000ms, so don't do anything else
	return;
}

function handleSquirrelEvent() {
	if (process.argv.length === 1) {
		return false;
	}

	const ChildProcess = require('child_process');
	const path = require('path');

	const appFolder = path.resolve(process.execPath, '..');
	const rootAtomFolder = path.resolve(appFolder, '..');
	const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
	const exeName = path.basename(process.execPath);

	const spawn = function (command, args) {
		let spawnedProcess, error;

		try {
			spawnedProcess = ChildProcess.spawn(command, args, {
				detached: true
			});
		} catch (error) {}

		return spawnedProcess;
	};

	const spawnUpdate = function (args) {
		return spawn(updateDotExe, args);
	};

	const squirrelEvent = process.argv[1];
	switch (squirrelEvent) {
		case '--squirrel-install':
		case '--squirrel-updated':
			// Optionally do things such as:
			// - Add your .exe to the PATH
			// - Write to the registry for things like file associations and
			//   explorer context menus

			// Install desktop and start menu shortcuts
			spawnUpdate(['--createShortcut', exeName]);

			setTimeout(app.quit, 1000);
			return true;

		case '--squirrel-uninstall':
			// Undo anything you did in the --squirrel-install and
			// --squirrel-updated handlers

			// Remove desktop and start menu shortcuts
			spawnUpdate(['--removeShortcut', exeName]);

			setTimeout(app.quit, 1000);
			return true;

		case '--squirrel-obsolete':
			// This is called on the outgoing version of your app before
			// we update to the new version - it's the opposite of
			// --squirrel-updated

			app.quit();
			return true;
	}
};

// Windows / Linux / Mac TTS library
const say = require('say');

// Save the current operating system
const platform = process.platform;
console.log("Current OS: ", platform);

// Auto-reload window plugin
require('electron-reload')(__dirname);
// Auto update
require('update-electron-app')()

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

// create a global var, wich will keep a reference to out loadingScreen window
let loadingScreen;
const createLoadingScreen = () => {
	// create a browser window
	loadingScreen = new BrowserWindow(
		Object.assign({
			/// define width and height for the window
			width: 1024,
			height: 665,
			/// remove the window frame, so it will become a frameless window
			frame: false,
			/// and set the transparency, to remove any window background color
			transparent: true
		})
	);
	loadingScreen.setResizable(false);
	loadingScreen.loadURL(
		'file://' + __dirname + '/app/loading.html'
	);
	loadingScreen.on('closed', () => (loadingScreen = null));
	loadingScreen.webContents.on('did-finish-load', () => {
		loadingScreen.show();
	});
};

function createWindow() {
	// Create the browser window.
	win = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true
		},
		// show to false mean than the window will proceed with its lifecycle, but will not render until we show it
		show: false
	})

	win.maximize();

	// and load the index.html of the app.
	win.loadFile('app/index.html');

	// Emitted when the window is closed.
	win.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		win = null
	});

	/// keep listening on the did-finish-load event, when the mainWindow content has loaded
	win.webContents.on('did-finish-load', () => {
		/// then close the loading screen window and show the main window
		if (loadingScreen) {
			loadingScreen.close();
		}
		win.show();
	});
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
	createLoadingScreen();
	setTimeout(() => {
		createWindow();
	}, 2000);
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (win === null) {
		createWindow()
	}
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.handle("formSubmit", function (event, arg) {
	console.log("Speaking: ", arg);

	/*tts.speakText({
	    voice_id: "tts:HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\TTS_MS_EN-US_DAVID_11.0",
	    text: arg,
	    success: function () {
	        console.log("done speaking!");
	    }
	});*/

	//@TODO replace these with real values
	let settings = appData.getAppSettings();
	console.log("App settings: ", settings);
	let voice = null,
		 speed = null;
	if (settings.voice != "System Default") {
		voice = settings.voice;
	}
	if (settings.speed) {
		speed = settings.speed;
	}
	console.log("Voice", voice, "at", speed, "speed");
	return new Promise((resolve, reject) => {
		say.speak(arg, voice, speed, (err) => {
			if (err) return reject(err);
			resolve();
		});
	});
});

// Suggest words with datamuse API, see https://www.datamuse.com/api/
// @TODO clip to last word of arg only, since that's all datamuse will use anyway
// @TODO cache results
ipcMain.handle('suggest', function (event, arg) {
	const encodedArg = encodeURIComponent(arg);
	return rp.get('https://api.datamuse.com/words?max=20&md=p&lc=' + encodedArg).then((r) => {
		let results = JSON.parse(r) || [];
		results = results
			// only identifiable parts of speech
			.filter(w => w.tags && w.tags.length)
			// only words containing exclusively letters
			.filter(w => w.word.match(/^[a-zA-Z]+$/))
			.map(r => r.word)
			.slice(0, 3);
		return results;
	});
});