#!/Users/aryankinha/.nvm/versions/node/v20.20.2/bin/node

// const { spawn } = require("child_process");
// const fs = require("fs");
// const path = require("path")
// const select = require('@inquirer/select').default;
// const SONG_DIR = path.join(__dirname, "song")

// // function listSong(dir_path) { 
// //     const scanner = spawn("ls", [dir_path]);

// //     scanner.stdout.on("data", (data) => {
// //         const arr = data.toString().split("\n");

// //         arr.forEach((song, index) => {
// //             if (song) {
// //                 console.log(`${index}: ${song}`);
// //             }
// //         });
// //     });
// // }

// function listSong(dir_path) {
//     const arr = fs.readdirSync(dir_path).filter(file => file.endsWith('.mp3'));
//     // arr.forEach((song, index) => {
//     //     if (song) {
//     //         console.log(`${index}: ${song}`);
//     //     }
//     // });
//     return arr;
// }

// function playSong(song) {
//     const scanner = spawn("ffplay", [song]);
// }

// async function songSelector() {
//     const arr = listSong(SONG_DIR);
//     const choice = await select({
//         message: 'Select a song',
//         choices: arr.map((song) => ({
//             name: `${song}`,
//             value: song
//         })),
//     });

//     playSong(`${SONG_DIR}/${choice}`);
// }

// songSelector();
// // process.stdin.on("data", (data) => {
// //     const index = Number(data.toString().trim());

// //     playSong(`${SONG_DIR}/${arr[index]}`);
// // });

/// ------ CLASS CODE


const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SONGS_DIR = path.join(__dirname, 'song');

let songs = [];
let userSelectionIndex = 0;
let currentPlayer = null;
let linesPrinted = 0;

let isPaused = false;

// List available songs
function listSongs(songDirectoryPath) {
    songs = fs.readdirSync(songDirectoryPath)
        .filter((file) => file.endsWith('.mp3'));

    // Move cursor up by the number of lines printed in the previous render
    if (linesPrinted > 0) {
        process.stdout.write(`\x1b[${linesPrinted}A`);
    }

    let output = '';

    songs.forEach((song, ind) => {
        if (ind === userSelectionIndex) {
            output += `\x1b[2K> ${song}\n`;
        } else {
            output += `\x1b[2K  ${song}\n`;
        }
    });

    output += '\x1b[2K\n';
    output += '\x1b[2K\n';
    output += '\x1b[2K↑/↓ Navigate | n/b Next/Prev & Play | Enter Play | Space Pause | Ctrl+C Exit\n';

    process.stdout.write(output);

    linesPrinted = songs.length + 3;
}


// Play a song
function playSong(songFilePath) {

    // Stop previous VLC process
    if (currentPlayer) {
        currentPlayer.kill();
        currentPlayer = null;
    }

    isPaused = false;

    currentPlayer = spawn(
        'vlc',
        [
            '--intf', 'rc',
            songFilePath
        ],
        {
            stdio: ['pipe', 'ignore', 'ignore']
        }
    );

    currentPlayer.on('exit', () => {
        currentPlayer = null;
        isPaused = false;
    });
}


// Pause / Resume
function togglePause() {

    if (!currentPlayer || !currentPlayer.stdin) {
        return;
    }

    currentPlayer.stdin.write('pause\n');

    isPaused = !isPaused;
}


// Hide cursor
process.stdout.write('\x1b[?25l');

listSongs(SONGS_DIR);


// Enable raw keyboard input
process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on('data', (rawUserInput) => {

    // Ctrl+C
    if (rawUserInput[0] === 0x03) {

        if (currentPlayer) {
            currentPlayer.kill();
        }

        process.stdin.setRawMode(false);
        process.stdin.pause();

        process.stdout.write('\x1b[?25h');

        if (linesPrinted > 0) {
            process.stdout.write(`\x1b[${linesPrinted}A\x1b[J`);
        }

        process.exit(0);
    }


    // Enter → Play selected song
    if (rawUserInput[0] === 0x0d) {

        const selectedSong = songs[userSelectionIndex];

        if (selectedSong) {
            playSong(
                path.join(SONGS_DIR, selectedSong)
            );
        }

        return;
    }


    // Space → Pause / Resume
    if (rawUserInput[0] === 0x20) {

        togglePause();

        return;
    }


    // n → Next song
    if (
        rawUserInput[0] === 0x6e ||
        rawUserInput[0] === 0x4e
    ) {

        userSelectionIndex = Math.min(
            songs.length - 1,
            userSelectionIndex + 1
        );

        listSongs(SONGS_DIR);

        const selectedSong = songs[userSelectionIndex];

        if (selectedSong) {
            playSong(
                path.join(SONGS_DIR, selectedSong)
            );
        }

        return;
    }


    // b → Previous song
    if (
        rawUserInput[0] === 0x62 ||
        rawUserInput[0] === 0x42
    ) {

        userSelectionIndex = Math.max(
            0,
            userSelectionIndex - 1
        );

        listSongs(SONGS_DIR);

        const selectedSong = songs[userSelectionIndex];

        if (selectedSong) {
            playSong(
                path.join(SONGS_DIR, selectedSong)
            );
        }

        return;
    }


    // Arrow keys
    if (
        rawUserInput[0] === 0x1b &&
        rawUserInput[1] === 0x5b
    ) {

        // Up arrow
        if (rawUserInput[2] === 0x41) {

            userSelectionIndex = Math.max(
                0,
                userSelectionIndex - 1
            );
        }


        // Down arrow
        if (rawUserInput[2] === 0x42) {

            userSelectionIndex = Math.min(
                songs.length - 1,
                userSelectionIndex + 1
            );
        }

        listSongs(SONGS_DIR);
    }
});