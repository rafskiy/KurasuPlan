function hasValidSyllabus(entry) {
  if (!entry.syllabusDetail || !Array.isArray(entry.syllabusDetail.tables)) return false;
  return entry.syllabusDetail.tables.some(table => {
    const flat = table.flat(Infinity).join('\n');
    return flat && !flat.includes('[SB-00011] 講義情報が見つかりません');
  });
}
