const fs = require('fs');
const path = require('path');

const files = [
  'apm_clean_with_syllabus.json',
  'aps_clean_with_syllabus.json',
  'st_clean_with_syllabus.json'
];

function is2025Fall(course) {
  // Check for 開講年度 in any table row
  if (course.syllabusDetail && Array.isArray(course.syllabusDetail.tables)) {
    for (const table of course.syllabusDetail.tables) {
      for (const row of table) {
        if (
          Array.isArray(row) &&
          row.length > 0 &&
          (row[0] === '開講年度' || (typeof row[0] === 'string' && row[0].includes('開講年度')))
        ) {
          // Find the last non-empty cell in the row
          const last = row.filter(cell => cell && cell.toString().trim() !== '').pop();
          if (last === '2025' || last === 2025) {
            return true;
          }
        }
      }
    }
  }
  // Fallback: Check if term or semester field includes '2025' and 'fall' (case-insensitive)
  const term = (course.term || '').toLowerCase();
  const semester = (course.semester || '').toString().toLowerCase();
  return (
    (term.includes('2025') && term.includes('fall')) ||
    (semester.includes('2025') && semester.includes('fall'))
  );
}

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const seen = new Set();
  let total2025Fall = 0, missingFields = 0, missingSyllabus = 0, duplicates = 0;
  data.forEach(course => {
    if (!is2025Fall(course)) return;
    total2025Fall++;
    const key = `${course.subjectCode}|${course.term}`;
    if (seen.has(key)) duplicates++;
    else seen.add(key);
    if (!course.subjectCode || !course.nameEn || !course.term) missingFields++;
    if (!course.syllabusDetail) missingSyllabus++;
  });
  console.log(`\n${file}:`);
  console.log(`  2025 Fall courses (開講年度==2025 or term/semester): ${total2025Fall}`);
  console.log(`  Duplicates: ${duplicates}`);
  console.log(`  Missing required fields: ${missingFields}`);
  console.log(`  Missing syllabusDetail: ${missingSyllabus}`);
});

// Extra: Compare st_clean_with_syllabus.json with st.json for missing courses
function checkMissing(rawFile, cleanFile, label) {
  const clean = JSON.parse(fs.readFileSync(path.join(__dirname, cleanFile), 'utf8'));
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, rawFile), 'utf8'));
  const cleanSet = new Set(
    clean.filter(is2025Fall).map(c => `${c.subjectCode}|${c.term}`)
  );
  const missing = [];
  raw.forEach(course => {
    // Try to get subjectCode and term from raw row
    const subjectCode = course['__5'] || course.subjectCode;
    const term = course['term'] || course['__14'] || course['__15'] || '';
    // Try to detect 開講年度 in any cell
    let is2025 = false;
    for (const key in course) {
      if (typeof course[key] === 'string' && course[key].includes('2025')) {
        is2025 = true;
        break;
      }
    }
    if (!is2025) return;
    const key = `${subjectCode}|${term}`;
    if (!cleanSet.has(key)) {
      missing.push({ subjectCode, nameEn: course['__7'] || course.nameEn, term });
    }
  });
  console.log(`\nCourses in ${rawFile} for 2025 but missing from ${cleanFile}:`);
  missing.forEach(c => {
    console.log(`  ${c.subjectCode} | ${c.nameEn} | ${c.term}`);
  });
}

checkMissing('st.json', 'st_clean_with_syllabus.json', 'ST');
checkMissing('apm.json', 'apm_clean_with_syllabus.json', 'APM');
checkMissing('aps.json', 'aps_clean_with_syllabus.json', 'APS'); 