const fs = require('fs');
const path = require('path');

const syllabusPath = path.join(__dirname, 'data', 'all_syllabus_details_2025_latest_valid.json');
const courseFiles = [
  'apm_clean_with_syllabus.json',
  'aps_clean_with_syllabus.json',
  'st_clean_with_syllabus.json',
];

const syllabusDetails = JSON.parse(fs.readFileSync(syllabusPath, 'utf-8'));
const syllabusMap = {};
for (const entry of syllabusDetails) {
  if (entry.subjectCode) syllabusMap[entry.subjectCode] = entry;
}

for (const file of courseFiles) {
  const filePath = path.join(__dirname, 'public', 'data', file);
  const courses = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let updated = false;
  for (const course of courses) {
    if (course.subjectCode && syllabusMap[course.subjectCode]) {
      course.syllabusDetail = syllabusMap[course.subjectCode].syllabusDetail || '';
      updated = true;
    }
  }
  if (updated) {
    fs.writeFileSync(filePath, JSON.stringify(courses, null, 2), 'utf-8');
  }
} 