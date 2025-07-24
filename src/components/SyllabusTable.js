import React, { useState, useEffect } from 'react';
import apmData from '../data/apm_clean_with_syllabus.json';
import apsData from '../data/aps_clean_with_syllabus.json';
import stData from '../data/st_clean_with_syllabus.json';

const allCourses = [...apmData, ...apsData, ...stData];

function SyllabusModal({ syllabusDetail, onClose, course }) {
  useEffect(() => {}, [course]);
  if (!syllabusDetail) return <div className="p-4">No syllabus data available.</div>;

  // Prefer using the array-of-arrays structure if available
  let tableRows = [];
  if (Array.isArray(syllabusDetail.tables) && syllabusDetail.tables.length > 0) {
    // Flatten all tables into one array of rows
    tableRows = syllabusDetail.tables.flat().filter(row => Array.isArray(row) && row.some(cell => cell && cell.trim() !== ''));
    // Map to label/value pairs: left = first non-empty, right = last non-empty
    tableRows = tableRows
      .map(row => {
        const nonEmpty = row.filter(cell => cell && cell.trim() !== '');
        if (nonEmpty.length < 2) return null;
        return { label: nonEmpty[0].trim(), value: nonEmpty[nonEmpty.length - 1].trim() };
      })
      .filter(Boolean);
  } else {
    // Fallback: parse bodyText as before
    let fullBodyText = '';
    if (syllabusDetail.bodyText) {
      fullBodyText = syllabusDetail.bodyText;
      if (typeof fullBodyText === 'string' && fullBodyText.trim().startsWith('[')) {
        try {
          const arr = JSON.parse(fullBodyText);
          fullBodyText = arr.flat(Infinity).filter(Boolean).join(' ');
        } catch {}
      }
    }
    function parseToTableRows(text) {
      if (!text) return [];
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      return lines.map((line, i) => {
        let [label, ...rest] = line.split(/\t+/);
        if (!rest.length) {
          [label, ...rest] = line.split(/\s{2,}/);
        }
        const value = rest.join(' ').trim();
        return { label: label.trim(), value };
      });
    }
    tableRows = parseToTableRows(fullBodyText);
  }

  // Helper to render URLs as clickable links
  function renderValue(value) {
    if (!value) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = value.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#aa003e] underline break-all hover:text-[#880030]">{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white/90 rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-2xl max-h-[95vh] overflow-y-auto relative border border-[#e5b3c3] transition-all duration-300 scale-100">
        <button
          className="absolute top-4 right-4 text-white bg-[#aa003e] hover:bg-[#880030] rounded-full w-12 h-12 flex items-center justify-center text-3xl shadow-lg focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] transition-all duration-150"
          onClick={onClose}
          aria-label="Close modal"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { onClose(); } }}
        >&times;</button>
        <div className="mb-8 border-b pb-4">
          <h2 className="text-4xl font-extrabold mb-2 flex flex-wrap items-center gap-2 text-[#aa003e]" id="modal-title">
            {course.subjectCode} <span className="font-normal text-2xl sm:text-3xl text-gray-700">{course.nameEn}</span>
          </h2>
          <p className="mb-2 text-lg sm:text-xl text-gray-600">Instructor: <span className="font-semibold">{course.instructorEn}</span></p>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="inline-block bg-[#f8e6ec] text-[#aa003e] text-base px-3 py-1 rounded-full" aria-label="College">{course.college?.toUpperCase() || ''}</span>
            <span className="inline-block bg-green-100 text-green-800 text-base px-3 py-1 rounded-full" aria-label="Semester">Semester: {course.semester || 'N/A'}</span>
            <span className="inline-block bg-yellow-100 text-yellow-800 text-base px-3 py-1 rounded-full">Credits: {course.credits}</span>
            {course.term && <span className="inline-block bg-purple-100 text-purple-800 text-base px-3 py-1 rounded-full">Term: {course.term}</span>}
          </div>
        </div>
        <div className="mb-2">
          <h3 className="text-2xl font-bold mb-4 text-[#aa003e] border-b pb-2">Full Syllabus</h3>
          <div className="grid gap-4">
            {tableRows.length > 0 ? (
              tableRows.map((row, i) => (
                <div
                  key={i}
                  className={
                    'flex flex-col sm:flex-row bg-white/80 rounded-xl shadow p-4 border border-[#e5b3c3] hover:shadow-lg transition ' +
                    (i % 2 === 0 ? 'bg-[#fdf6f9]' : 'bg-white')
                  }
                >
                  <div className="font-bold text-[#aa003e] w-full sm:w-1/3 mb-2 sm:mb-0 text-base sm:text-lg">{row.label}</div>
                  <div className="text-gray-900 w-full sm:w-2/3 text-base sm:text-lg">{renderValue(row.value)}</div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-lg">No detailed syllabus available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SyllabusTable() {
  const [search, setSearch] = useState('');
  const [modalCourse, setModalCourse] = useState(null);
  const [view, setView] = useState('table'); // 'table' or 'card'

  const filtered = allCourses.filter(course => {
    const code = course.subjectCode || '';
    const name = course.nameEn || '';
    const instructor = course.instructorEn || '';
    return (
      code.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      instructor.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 text-center text-[#aa003e] drop-shadow">APU 2025 Syllabus</h1>
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl shadow mb-4 border border-[#e5b3c3]">
        <input
          className="border border-[#e5b3c3] p-2 mb-2 sm:mb-0 w-full sm:w-1/2 rounded-xl shadow-sm focus:ring-2 focus:ring-[#e5b3c3] text-sm sm:text-base bg-white/80"
          type="text"
          placeholder="Search by code, name, or instructor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button
            className={`px-3 py-1 rounded-xl font-semibold text-xs sm:text-sm border ${view === 'table' ? 'bg-[#aa003e] text-white' : 'bg-white/80 text-[#aa003e] border-[#aa003e]'} transition focus:outline-none focus:ring-2 focus:ring-[#e5b3c3]`}
            onClick={() => setView('table')}
            aria-label="Table view"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setView('table'); } }}
          >
            Table
          </button>
          <button
            className={`px-3 py-1 rounded-xl font-semibold text-xs sm:text-sm border ${view === 'card' ? 'bg-[#aa003e] text-white' : 'bg-white/80 text-[#aa003e] border-[#aa003e]'} transition focus:outline-none focus:ring-2 focus:ring-[#e5b3c3]`}
            onClick={() => setView('card')}
            aria-label="Card view"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setView('card'); } }}
          >
            Card
          </button>
        </div>
      </div>
      {view === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-[320px] sm:min-w-full border border-[#e5b3c3] rounded-2xl shadow-xl text-xs sm:text-base bg-white/80 overflow-hidden">
            <thead className="sticky top-0 bg-[#fdf6f9] z-10">
              <tr>
                <th className="border-b border-[#e5b3c3] px-2 py-3 text-[#aa003e] font-bold text-base">Course Code</th>
                <th className="border-b border-[#e5b3c3] px-2 py-3 text-[#aa003e] font-bold text-base">Course Name</th>
                <th className="border-b border-[#e5b3c3] px-2 py-3 text-[#aa003e] font-bold text-base">Instructor</th>
                <th className="border-b border-[#e5b3c3] px-2 py-3 text-[#aa003e] font-bold text-base">Syllabus</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course, idx) => (
                <tr key={idx} className={
                  'transition ' +
                  (idx % 2 === 0 ? 'bg-[#fdf6f9]' : 'bg-white/80') +
                  ' hover:shadow-lg hover:bg-[#f8e6ec]'}>
                  <td className="border-b border-[#e5b3c3] px-2 py-2 font-mono break-all max-w-[120px] align-middle">{course.subjectCode}</td>
                  <td className="border-b border-[#e5b3c3] px-2 py-2 break-all max-w-[180px] align-middle">{course.nameEn}</td>
                  <td className="border-b border-[#e5b3c3] px-2 py-2 break-all max-w-[120px] align-middle">{course.instructorEn}</td>
                  <td className="border-b border-[#e5b3c3] px-2 py-2 text-center align-middle">
                    {course.syllabusDetail ? (
                      <button
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-3 py-2 rounded-xl bg-[#aa003e] hover:bg-[#880030] text-white text-sm sm:text-base font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] transition mb-1 sm:mb-0"
                        style={{ minHeight: '40px' }}
                        onClick={() => setModalCourse(course)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="hidden xs:inline">View Syllabus</span>
                      </button>
                    ) : (
                      <span className="text-gray-400">No syllabus</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
          {filtered.map((course, idx) => (
            <div key={idx} className={
              'bg-white/80 border border-[#e5b3c3] rounded-2xl shadow-xl p-6 flex flex-col gap-2 hover:shadow-2xl hover:bg-[#f8e6ec] transition ' +
              (idx % 2 === 0 ? 'bg-[#fdf6f9]' : 'bg-white/80')
            }>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs bg-[#f8e6ec] text-[#aa003e] px-2 py-1 rounded-full">{course.subjectCode}</span>
                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{course.college?.toUpperCase() || ''}</span>
              </div>
              <div className="font-bold text-lg text-[#aa003e] mb-1">{course.nameEn}</div>
              <div className="text-xs text-gray-600 mb-1">Instructor: <span className="font-semibold">{course.instructorEn}</span></div>
              <div className="text-xs text-gray-500 mb-1">Semester: {course.semester || 'N/A'}</div>
              <div className="flex-1"></div>
              <div className="flex justify-end flex-col sm:flex-row gap-2 mt-2">
                {course.syllabusDetail ? (
                  <button
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-3 py-2 rounded-xl bg-[#aa003e] hover:bg-[#880030] text-white text-sm sm:text-base font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] transition"
                    style={{ minHeight: '40px' }}
                    onClick={() => setModalCourse(course)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="hidden xs:inline">View Syllabus</span>
                  </button>
                ) : (
                  <span className="text-gray-400">No syllabus</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs sm:text-sm text-gray-500 text-center">Showing {filtered.length} of {allCourses.length} courses</p>
      {modalCourse && (
        <SyllabusModal
          syllabusDetail={modalCourse.syllabusDetail}
          onClose={() => setModalCourse(null)}
          course={modalCourse}
        />
      )}
    </div>
  );
}

export default SyllabusModal; 