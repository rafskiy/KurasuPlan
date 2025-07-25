const fs = require('fs');
const path = require('path');

const files = [
  { input: 'apm.json', output: 'apm_clean.json', college: 'apm' },
  { input: 'aps.json', output: 'aps_clean.json', college: 'aps' },
  { input: 'st.json', output: 'st_clean.json', college: 'st' },
];

const dayMap = {
  '月/Mon.': 'Mon',
  '火/Tue.': 'Tue',
  '水/Wed.': 'Wed',
  '木/Thu.': 'Thu',
  '金/Fri.': 'Fri',
  '土/Sat.': 'Sat',
};

const termKeyMap = {
  apm: '2025年度秋セメスター　時間割 (2023カリキュラムAPM生対象科目)',
  aps: '2025年度秋セメスター　時間割 (2023APSカリキュラム生対象科目)',
  st:  '2025年度秋セメスター　時間割 (2023カリキュラムST生対象科目)'
};

files.forEach(({ input, output, college }) => {
  const rawPath = path.join(__dirname, input);
  const outPath = path.join(__dirname, output);
  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

  const headerRow = raw.find(
    (row) => row['__7'] === 'Subject Name' || row['__7'] === 'Subject name'
  );
  if (!headerRow) {
    return;
  }

  const headerIdx = raw.indexOf(headerRow);
  const dataRows = raw.slice(headerIdx + 1);

  let lastTerm = '';
  const cleaned = dataRows
    .map((row) => {
      if (!row['__5'] || !row['__7']) return null;
      const thisTerm = row[termKeyMap[college]] || '';
      if (thisTerm) lastTerm = thisTerm;
      let credits = 2;
      const fieldVal = row['__12'] || '';
      const areaVal = row['__13'] || '';
      if (
        fieldVal.includes('言語') ||
        fieldVal.toLowerCase().includes('language') ||
        areaVal.toLowerCase().includes('language')
      ) {
        credits = 4;
      }
      return {
        college,
        subjectCode: row['__5'],
        nameJa: row['__6'] || '',
        nameEn: row['__7'] || '',
        instructorJa: row['__8'] || '',
        instructorEn: row['__9'] || '',
        day: dayMap[row['']?.trim()] || row[''],
        period: row['__1'] || '',
        classroom: row['__4'] || '',
        language: row['__10'] || '',
        semester: row['__11'] || '',
        field: row['__12'] || '',
        areaOfStudy: row['__13'] || '',
        term: lastTerm,
        credits,
      };
    })
    .filter(Boolean);

  fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
}); 