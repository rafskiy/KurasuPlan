// clean_latest_valid_syllabus.js
// Keeps only the latest valid syllabus for each course (by name and instructor), from 2024 onwards

const fs = require('fs');

const inputPath = 'src/data/all_syllabus_details_2025.json';
const outputPath = 'src/data/all_syllabus_details_2025_latest_valid.json';

const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// Helper to extract year and semester as a sortable value
function getYearSemester(entry) {
  // Try to extract year from the course title or a field
  let year = 0;
  if (entry['2025年度秋セメスター　時間割 (2023カリキュラムAPM生対象科目)']) {
    // e.g., "1Q" or similar, not year
    year = 2025;
  } else if (entry['2024年度秋セメスター　時間割 (2023カリキュラムAPM生対象科目)']) {
    year = 2024;
  } else if (entry['2023年度秋セメスター　時間割 (2023カリキュラムAPM生対象科目)']) {
    year = 2023;
  }
  // Fallback: try to parse from syllabusDetail or other fields if needed
  if (entry.syllabusDetail && entry.syllabusDetail.tables) {
    const t = entry.syllabusDetail.tables.flat(2).join('\n');
    const match = t.match(/開講年度\s*([0-9]{4})/);
    if (match) year = parseInt(match[1], 10);
  }
  // Semester: try to use entry.semester (as number or string)
  let semester = 0;
  if (entry.semester) {
    semester = parseInt(entry.semester, 10) || 0;
  }
  return { year, semester };
}

// Helper to check if syllabus is valid (not error-only)
function hasValidSyllabus(entry) {
  if (!entry.syllabusDetail || !Array.isArray(entry.syllabusDetail.tables)) return false;
  return entry.syllabusDetail.tables.some(table => {
    const flat = table.flat(Infinity).join('\n');
    return flat && !flat.includes('[SB-00011] 講義情報が見つかりません');
  });
}

// Map: key = name + instructor, value = latest valid entry
const latestMap = {};

data.forEach(entry => {
  // Only consider 2024 and later
  const { year, semester } = getYearSemester(entry);
  if (year < 2024) return;
  if (!hasValidSyllabus(entry)) return;
  const name = entry['__6'] || entry['__7'] || '';
  const instructor = entry['__8'] || entry['__9'] || '';
  const key = name + '|' + instructor;
  if (!latestMap[key]) {
    latestMap[key] = { entry, year, semester };
  } else {
    // Compare year/semester
    const prev = latestMap[key];
    if (year > prev.year || (year === prev.year && semester > prev.semester)) {
      latestMap[key] = { entry, year, semester };
    }
  }
});

const latestValid = Object.values(latestMap).map(obj => obj.entry);
fs.writeFileSync(outputPath, JSON.stringify(latestValid, null, 2), 'utf-8');
console.log(`Saved latest valid syllabus entries to ${outputPath}`);
