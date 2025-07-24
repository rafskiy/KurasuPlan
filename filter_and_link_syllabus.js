const fs = require('fs');
const path = require('path');

// Load all syllabus results
const syllabus = JSON.parse(fs.readFileSync('src/data/all_syllabus_details_2025.json', 'utf-8'));

// Filter out blank/error results
const filtered = syllabus.filter(entry => {
  if (entry.error) return false;
  if (!entry.syllabusDetail) return false;
  // At least one non-empty cell in any table
  return entry.syllabusDetail.tables.some(table =>
    table.some(row => row.some(cell => cell && cell.trim() !== ''))
  );
});

// Build a map for fast lookup: { code+semester: syllabusEntry }
const syllabusMap = {};
filtered.forEach(entry => {
  const code = entry['__5'];
  const semester = entry.semester;
  syllabusMap[`${code}_${semester}`] = entry;
});

// Now, for each course in your clean data, add a syllabus link if available
const cleanFiles = ['apm_clean.json', 'aps_clean.json', 'st_clean.json'];
cleanFiles.forEach(file => {
  const filePath = path.join('src', 'data', file);
  const courses = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const updated = courses.map(course => {
    const code = course.subjectCode;
    // Try both semesters for a match
    let syllabusEntry = syllabusMap[`${code}_1`] || syllabusMap[`${code}_2`];
    if (syllabusEntry) {
      return { ...course, syllabusUrl: syllabusEntry.syllabusUrl };
    }
    return course;
  });
  fs.writeFileSync(filePath.replace('.json', '_with_syllabus.json'), JSON.stringify(updated, null, 2), 'utf-8');
  console.log(`Updated ${filePath.replace('.json', '_with_syllabus.json')}`);
}); 