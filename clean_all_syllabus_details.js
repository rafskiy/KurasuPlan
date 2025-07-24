const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'src', 'data', 'all_syllabus_details_2025.json');
const outputPath = path.join(__dirname, 'src', 'data', 'all_syllabus_details_2025_clean.json');

function isValidCourse(entry) {
  // Adjust this logic if the error field is different
  // Remove if entry has an 'error' property or course property contains 'error'
  if (!entry) return false;
  if (entry.error) return false;
  if (entry.course && typeof entry.course === 'string' && entry.course.toLowerCase().includes('error')) return false;
  return true;
}

function cleanLargeJsonFile(input, output) {
  const readStream = fs.createReadStream(input, { encoding: 'utf8' });
  const writeStream = fs.createWriteStream(output, { encoding: 'utf8' });

  let buffer = '';
  let isFirst = true;

  writeStream.write('[');

  readStream.on('data', chunk => {
    buffer += chunk;
    let boundary = buffer.lastIndexOf('},');
    if (boundary === -1) return;
    let items = buffer.substring(0, boundary + 1);
    buffer = buffer.substring(boundary + 1);
    items = items.trim();
    if (items.endsWith(',')) items = items.slice(0, -1);
    let objects = items.split('},').map((item, idx, arr) => item + (idx < arr.length - 1 ? '}' : ''));
    for (let objStr of objects) {
      try {
        let obj = JSON.parse(objStr);
        if (isValidCourse(obj)) {
          if (!isFirst) writeStream.write(',\n');
          writeStream.write(JSON.stringify(obj));
          isFirst = false;
        }
      } catch (e) {
        // skip invalid JSON
      }
    }
  });

  readStream.on('end', () => {
    // Try to parse the last buffer
    buffer = buffer.trim();
    if (buffer.endsWith(']')) buffer = buffer.slice(0, -1);
    if (buffer.startsWith(',')) buffer = buffer.slice(1);
    if (buffer) {
      let objects = buffer.split('},').map((item, idx, arr) => item + (idx < arr.length - 1 ? '}' : ''));
      for (let objStr of objects) {
        try {
          let obj = JSON.parse(objStr);
          if (isValidCourse(obj)) {
            if (!isFirst) writeStream.write(',\n');
            writeStream.write(JSON.stringify(obj));
            isFirst = false;
          }
        } catch (e) {
          // skip invalid JSON
        }
      }
    }
    writeStream.write(']\n');
    writeStream.end();
    console.log('Cleaning complete. Output written to', output);
  });

  readStream.on('error', err => {
    console.error('Error reading file:', err);
  });
  writeStream.on('error', err => {
    console.error('Error writing file:', err);
  });
}

cleanLargeJsonFile(inputPath, outputPath);
