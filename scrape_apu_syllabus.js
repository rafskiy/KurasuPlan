const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function fetchSyllabus(subjectCode) {
  const url = `https://syllabus.apu.ac.jp/syllabus/search/getSyllabusDetail?subjectCode=${subjectCode}`;
  const response = await axios.get(url);
  return response.data;
}

async function main() {
  const inputPath = path.join(__dirname, 'data', 'apm.json');
  const outputPath = path.join(__dirname, 'data', 'apm_clean_with_syllabus.json');
  const courses = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const results = [];

  for (const course of courses) {
    if (!course.subjectCode) continue;
    const syllabusDetail = await fetchSyllabus(course.subjectCode);
    course.syllabusDetail = syllabusDetail;
    results.push(course);
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
}

main();