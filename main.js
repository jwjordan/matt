const {
    app,
    BrowserWindow,
    ipcMain
} = require('electron');
const rp = require('request-promise-native');

const DataStore = require('./app/js/DataStore.js');

// Windows-only TTS library
//var tts = require('sapi_tts/tts.js');

// Windows / Linux / Mac TTS library
const say = require('say');

// Save the current operating system
const platform = process.platform;

// Auto-reload window plugin
require('electron-reload')(__dirname);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
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
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

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
    console.log("Argument: ", arg);

    /*tts.speakText({
        voice_id: "tts:HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\TTS_MS_EN-US_DAVID_11.0",
        text: arg,
        success: function () {
            console.log("done speaking!");
        }
    });*/

	//@TODO replace these with real values
	const voice = null;
	const speed = null;
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
ipcMain.handle('suggest', function(event, arg) {
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

console.log("Current OS: ", platform);

// Proof of concept of platofrm differentiation
if (platform === "win32") {
	tts.getAvailableVoices({
		success: function (list) {
			console.log(list);
		}
	});
}
