function getCursorPosition() {
  return new Promise((resolve) => {
    // 1. Put stdin into raw mode so it reads characters one by one without waiting for Enter
    process.stdin.setRawMode(true);
    process.stdin.resume();

    // 2. Listen for the terminal's response
    process.stdin.once('data', (data) => {
      // Turn off raw mode immediately so the terminal returns to normal
      process.stdin.setRawMode(false);
      process.stdin.pause();

      // The terminal responds with a string like: \u001b[Row;ColumnR (e.g., \u001b[12;1R)
      const str = data.toString();
      const match = str.match(/\[(\d+);(\d+)R/);

      if (match) {
        resolve({
          row: parseInt(match[1], 10),
          col: parseInt(match[2], 10)
        });
      } else {
        resolve(null);
      }
    });

    // 3. Send the escape code asking the terminal for the cursor position
    process.stdout.write('\u001b[6n');
  });
}

// Execute the function
async function main() {
  const pos = await getCursorPosition();
  if (pos) {
    console.log(`\nRow: ${pos.row}, Column: ${pos.col}`);
  } else {
    console.log('\nCould not determine position.');
  }
}

main();
