import SyllabusModal from './components/SyllabusTable';
// If you need SyllabusTable as a component, use the following line instead:
// import SyllabusModal, { SyllabusTable } from './components/SyllabusTable';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CourseDetail from './components/CourseDetail';
import { InformationCircleIcon, TrashIcon, PlusIcon, XMarkIcon, ChevronDownIcon, PencilIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';

// Helper to detect on-demand courses
function isOnDemandCourse(course) {
  return (
    (course.period && course.period.toString().toLowerCase() === 'ondemand') ||
    (course.day && course.day.toString().toLowerCase() === 'ondemand') ||
    (course.term && course.term.toString().toLowerCase().includes('on demand'))
  );
}
// Helper to check semester eligibility
function isEligibleSemester(courseSemester, selectedSemester) {
  const num = Number(courseSemester);
  if (!isNaN(num)) return Number(selectedSemester) >= num;
  return true; // If not a number (e.g., '1のみ'), always eligible
}

const COLLEGES = [
  { id: 'apm', name: 'APM' },
  { id: 'aps', name: 'APS' },
  { id: 'st', name: 'ST' },
];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 4, 5, 6];
const QUARTERS = ['Q1', 'Q2'];

const DAY_MAP = {
  'Monday': 'Mon',
  'Tuesday': 'Tue',
  'Wednesday': 'Wed',
  'Thursday': 'Thu',
  'Friday': 'Fri',
  'Saturday': 'Sat',
};

// Helper to determine type and quarter from term
function getTypeAndQuarter(term) {
  if (!term) return { type: null, quarter: null };
  const t = term.trim().toLowerCase();
  if (t === 'semester') {
    return { type: 'semester', quarter: null };
  }
  if (t === '1q' || t === 'q1') {
    return { type: 'quarter', quarter: 'Q1' };
  }
  if (t === '2q' || t === 'q2') {
    return { type: 'quarter', quarter: 'Q2' };
  }
  if (t.startsWith('session')) {
    return { type: 'session', quarter: null };
  }
  return { type: null, quarter: null };
}

// Update useCourses to use _clean_with_syllabus.json files
function useCourses(college) {
  const [courses, setCourses] = React.useState([]);
  React.useEffect(() => {
    import(`./data/${college}_clean_with_syllabus.json`).then(module => {
      setCourses(module.default || module);
    });
  }, [college]);
  return courses;
}

function RemoveCourseModal({ isOpen, onClose, onRemove, course }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Remove Course</h3>
          <button className="text-gray-500 hover:text-gray-800" onClick={onClose}>&times;</button>
        </div>
        <div className="mb-4">
          Are you sure you want to remove <span className="font-semibold text-blue-700">{course.subjectCode} {course.nameEn}</span> from your plan? This will remove it from all its scheduled slots.
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600" onClick={onRemove}>Remove</button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, color }) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-1 ${colorMap[color] || colorMap.gray}`}>{children}</span>
  );
}

function Tooltip({ children, text }) {
  return (
    <span className="relative group cursor-pointer">
      {children}
      <span className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-max min-w-[120px] px-2 py-1 rounded bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-pre-line shadow-lg">
        {text}
      </span>
    </span>
  );
}

// TimetableGrid: update table and cell classes
function TimetableGrid({ plannedCourses, onCellClick, onSyllabusClick }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-[900px] w-full border-collapse border-spacing-0 table-fixed rounded-2xl shadow-xl bg-white/80 border border-[#e5b3c3] overflow-hidden">
        <colgroup>
          <col style={{ width: '120px' }} />
          {DAYS.map(() => <col style={{ width: '1fr' }} />)}
        </colgroup>
        <thead>
          <tr>
            <th className="border border-[#e5b3c3] px-4 py-4 bg-[#fdf6f9] text-center text-base font-bold rounded-tl-2xl align-middle sticky left-0 z-10 text-[#aa003e]">Day / Period</th>
            {DAYS.map((day, i) => (
              <th key={day} className={`border border-[#e5b3c3] px-4 py-4 bg-[#fdf6f9] text-center text-base font-bold align-middle text-[#aa003e] ${i === DAYS.length - 1 ? 'rounded-tr-2xl' : ''}`} style={{ minWidth: '120px', maxWidth: '180px' }}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((period, pIdx) => (
            QUARTERS.map((quarter, qIdx) => (
              <tr key={`period-${period}-quarter-${quarter}`}
                  className={((pIdx * 2 + qIdx) % 2 === 0) ? 'bg-[#fdf6f9]' : 'bg-white/80'}>
                <td className="border border-[#e5b3c3] px-4 py-4 text-center bg-[#f8e6ec] font-medium text-base align-middle sticky left-0 z-0 text-[#aa003e]">
                  {quarter} <span className="font-bold">{period}</span>
                </td>
                {DAYS.map(day => {
                  const cellKey = `${day}-${period}-${quarter}`;
                  const planned = plannedCourses[cellKey];
                  let typeLabel = '', termLabel = '', badgeColor = 'gray';
                  if (planned) {
                    const { type } = getTypeAndQuarter(planned.term);
                    typeLabel = type === 'semester' ? 'Semester' : type === 'quarter' ? 'Quarter' : '';
                    termLabel = planned.term || '';
                    badgeColor = type === 'semester' ? '#aa003e' : type === 'quarter' ? 'green' : 'gray';
                  }
                  return (
                    <td
                      key={cellKey}
                      className={`border border-[#e5b3c3] px-2 py-4 cursor-pointer transition text-center align-middle relative group ${planned ? 'bg-[#f8e6ec] hover:bg-[#f3c6d6]' : 'hover:bg-[#f8e6ec]'} ${planned ? 'font-semibold text-[#aa003e]' : ''} rounded-xl`}
                      style={{ minWidth: '120px', maxWidth: '180px', verticalAlign: 'middle' }}
                      onClick={() => onCellClick(day, period, quarter, planned)}
                      tabIndex={0}
                      aria-label={planned ? `${planned.subjectCode} ${planned.nameEn}` : 'Add course'}
                    >
                      {planned ? (
                        <Tooltip text={`Instructor: ${planned.instructorEn}\nCredits: ${planned.credits}\n${typeLabel && `Type: ${typeLabel}`}\n${termLabel && `Term: ${termLabel}`}`.replace(/\n/g, '\n')}>
                          <div className="flex flex-col items-center justify-center min-h-[56px]">
                            <div className="flex items-center gap-1 justify-center">
                              <Badge color={badgeColor}>{typeLabel}</Badge>
                              <span className="font-semibold text-[#aa003e] text-xs truncate max-w-[90px]">{planned.nameEn}</span>
                            </div>
                            <div className="text-xs text-gray-600 truncate max-w-[90px]">{planned.instructorEn}</div>
                            <div className="flex items-center gap-1 mt-1 justify-center">
                              <Badge color="purple">{planned.credits} cr</Badge>
                              {termLabel && <Badge color="yellow">{termLabel}</Badge>}
                            </div>
                            {planned.syllabusDetail && (
                              <button
                                className="mt-2 px-2 py-1 bg-[#aa003e] text-white rounded-xl text-xs hover:bg-[#880030] focus:outline-none focus:ring-2 focus:ring-[#e5b3c3]"
                                onClick={e => { e.stopPropagation(); onSyllabusClick(planned); }}
                                tabIndex={0}
                                aria-label="View syllabus"
                              >
                                View Syllabus
                              </button>
                            )}
                          </div>
                        </Tooltip>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MultiSelectDropdown({ options, selected, onChange, label }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative min-w-[120px]">
      <label className="block text-xs font-semibold mb-1">{label}</label>
      <button
        type="button"
        className="w-full p-1 border rounded text-sm flex items-center justify-between bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={() => setOpen(o => !o)}
      >
        <span>{selected.length === 0 ? 'All' : selected.join(', ')}</span>
        <ChevronDownIcon className="w-4 h-4 ml-2" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
          <div className="p-2">
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={e => {
                    if (e.target.checked) onChange([...selected, opt]);
                    else onChange(selected.filter(f => f !== opt));
                  }}
                  className="accent-blue-600"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs font-semibold mr-2 mb-1">
      {children}
      {onRemove && (
        <button className="ml-1 p-0.5 hover:bg-blue-200 rounded-full" onClick={onRemove}>
          <XMarkIcon className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

function CourseSelectModal({ isOpen, onClose, courses, onSelect, cell, plannedCourses, warning, onSyllabusClick }) {
  const [blockWarning, setBlockWarning] = useState("");
  const [termType, setTermType] = useState('All');
  const [fieldTypes, setFieldTypes] = useState([]); // multi-select
  React.useEffect(() => { setBlockWarning(""); setTermType('All'); setFieldTypes([]); }, [isOpen, cell]);
  if (!isOpen) return null;

  // Get unique fields for the field filter
  const uniqueFields = Array.from(new Set(courses.map(c => c.field).filter(Boolean)));

  // Filter courses by term type and field
  const filtered = courses.filter(course => {
    const { type } = getTypeAndQuarter(course.term);
    let termMatch = true;
    if (termType === 'Semester') termMatch = type === 'semester';
    else if (termType === 'Quarter') termMatch = type === 'quarter';
    else if (termType === 'Session') termMatch = course.term && course.term.toLowerCase().startsWith('session');
    else if (termType === 'OnDemand') termMatch = isOnDemandCourse(course);
    let fieldMatch = fieldTypes.length === 0 || fieldTypes.includes(course.field);
    let semesterMatch = true;
    if (course.semester !== undefined) {
      semesterMatch = isEligibleSemester(course.semester, cell?.semester || 1);
    }
    return (termType === 'All' || termMatch) && fieldMatch && semesterMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white/90 rounded-3xl shadow-2xl p-8 w-full max-w-lg max-h-[95vh] overflow-y-auto relative border border-[#e5b3c3] transition-all duration-300 scale-100">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white/90 z-10 rounded-t-3xl">
          <h3 className="text-2xl font-extrabold text-[#aa003e]">Select Course for {cell.quarter} / Period {cell.period} / {cell.day}</h3>
          <button className="text-white bg-[#aa003e] hover:bg-[#880030] rounded-full w-10 h-10 flex items-center justify-center text-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] transition-all duration-150" onClick={onClose}>&times;</button>
        </div>
        {/* Filters */}
        <div className="flex gap-4 mb-4 p-4 bg-[#fdf6f9] rounded-2xl shadow-sm border border-[#e5b3c3]">
          <div>
            <label className="block text-xs font-semibold mb-1">Term Type</label>
            <select
              className="p-2 border border-[#e5b3c3] rounded-xl text-sm bg-white/80 focus:ring-2 focus:ring-[#e5b3c3]"
              value={termType}
              onChange={e => setTermType(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Semester">Semester</option>
              <option value="Quarter">Quarter</option>
              <option value="Session">Session</option>
              <option value="OnDemand">On Demand</option>
            </select>
          </div>
          <MultiSelectDropdown
            options={uniqueFields}
            selected={fieldTypes}
            onChange={setFieldTypes}
            label="Field"
          />
        </div>
        {/* Chips for selected fields */}
        {fieldTypes.length > 0 && (
          <div className="mb-2 flex flex-wrap">
            {fieldTypes.map(f => (
              <Chip key={f} onRemove={() => setFieldTypes(fieldTypes.filter(x => x !== f))}>{f}</Chip>
            ))}
          </div>
        )}
        {(blockWarning || warning) && (
          <div className="mb-2 p-2 bg-red-100 text-red-700 rounded text-sm">{blockWarning || warning}</div>
        )}
        {filtered.length === 0 ? (
          <div className="text-gray-500">No courses available for this slot.</div>
        ) : (
          <ul className="divide-y divide-[#e5b3c3] max-h-64 overflow-y-auto">
            {filtered.map(course => {
              const { type, quarter } = getTypeAndQuarter(course.term);
              let typeLabel = type === 'semester' ? 'Semester' : type === 'quarter' ? 'Quarter' : '';
              let termLabel = course.term || '';
              // Determine all slots this course would fill
              let slotsToCheck = [];
              if (type === 'semester') {
                slotsToCheck = ['Q1', 'Q2'].map(q => `${Object.keys(DAY_MAP).find(k => DAY_MAP[k] === course.day)}-${course.period}-${q}`);
              } else if (type === 'quarter') {
                slotsToCheck = [`${Object.keys(DAY_MAP).find(k => DAY_MAP[k] === course.day)}-${course.period}-${quarter}`];
              } else if (course.term && course.term.toLowerCase().startsWith('session')) {
                slotsToCheck = [`Session|${course.subjectCode}|${course.term}`];
              } else if (isOnDemandCourse(course)) {
                slotsToCheck = [`OnDemand|${course.subjectCode}|${course.term}`];
              }
              // Check for conflicts
              const conflicts = slotsToCheck.filter(slot => plannedCourses[slot] && plannedCourses[slot].subjectCode !== course.subjectCode);
              const hasBlock = conflicts.length > 0;
              return (
                <li key={course.subjectCode + course.nameEn + course.day + course.period}
                    className={`py-4 px-4 rounded-2xl mb-2 ${hasBlock ? 'bg-red-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:bg-[#f8e6ec]'} ${(plannedCourses[`Session|${course.subjectCode}|${course.term}`] || plannedCourses[`OnDemand|${course.subjectCode}|${course.term}`]) ? 'bg-green-100' : 'bg-white/80 border border-[#e5b3c3] shadow'}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="font-bold text-[#aa003e] text-lg">{course.subjectCode} {course.nameEn}</div>
                    <div className="text-sm text-gray-700">{course.instructorEn} {course.instructorJa && <span className="text-xs text-gray-400 ml-1">({course.instructorJa})</span>}</div>
                    <div className="text-xs text-gray-500">Classroom: {course.classroom} | Language: {course.language} | Semester: {course.semester}</div>
                    <div className="text-xs text-gray-600 mt-1">Type: <span className="font-semibold">{typeLabel}</span>{typeLabel && termLabel ? ' / ' : ''}{termLabel && <span>Term: <span className="font-semibold">{termLabel}</span></span>}</div>
                    {course.syllabusDetail && (
                      <button
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl bg-[#aa003e] hover:bg-[#880030] text-white text-base font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] transition mt-2 sm:w-auto sm:text-base sm:px-4 sm:py-2"
                        style={{ minHeight: '40px' }}
                        onClick={e => { e.stopPropagation(); if (typeof onSyllabusClick === 'function') onSyllabusClick(course); }}
                        tabIndex={0}
                        aria-label="View syllabus"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        View Syllabus
                      </button>
                    )}
                  </div>
                  <div>
                    <button
                      className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl bg-green-600 hover:bg-green-800 text-white text-base font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition mt-2 sm:w-auto sm:text-base sm:px-4 sm:py-2"
                      style={{ minHeight: '40px' }}
                      disabled={hasBlock}
                      onClick={() => { if (!hasBlock) onSelect(course); else setBlockWarning('Cannot add this course: one or more of its scheduled periods is already occupied by another course.'); }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Add
                    </button>
                  </div>
                  {hasBlock && (
                    <div className="text-xs text-red-600 mt-1">Conflict with: {conflicts.map(slot => plannedCourses[slot]?.subjectCode + ' ' + plannedCourses[slot]?.nameEn).join(', ')}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function getFieldLabel(field) {
  if (!field) return '';
  const parts = field.split('/');
  return parts[parts.length - 1].trim();
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function CourseList({ courses, onSyllabusClick }) {
  const [search, setSearch] = useState('');
  const [termType, setTermType] = useState('All');
  const [fieldTypes, setFieldTypes] = useState([]); // store lowercased values
  const [sortBy, setSortBy] = useState('nameEn');
  const [sortDir, setSortDir] = useState('asc');

  // Build uniqueFields from all available courses for the selected college/semester
  const allFields = Array.from(
    new Set(
      courses
        .map(c => getFieldLabel(c.field))
        .filter(Boolean)
    )
  );
  const uniqueFields = allFields.map(f => ({
    value: f.toLowerCase().trim(),
    label: capitalize(f.trim())
  }));

  // Filtered courses
  let filtered = courses.filter(course => {
    // Search by name or instructor
    const searchMatch =
      !search ||
      (course.nameEn && course.nameEn.toLowerCase().includes(search.toLowerCase())) ||
      (course.instructorEn && course.instructorEn.toLowerCase().includes(search.toLowerCase()));
    // Term type
    const { type } = getTypeAndQuarter(course.term);
    let termMatch = true;
    if (termType === 'Semester') termMatch = type === 'semester';
    else if (termType === 'Quarter') termMatch = type === 'quarter';
    else if (termType === 'Session') termMatch = course.term && course.term.toLowerCase().startsWith('session');
    else if (termType === 'OnDemand') termMatch = isOnDemandCourse(course);
    // Field (compare using lowercased value)
    const fieldValue = getFieldLabel(course.field).toLowerCase().trim();
    let fieldMatch = fieldTypes.length === 0 || fieldTypes.includes(fieldValue);
    return searchMatch && (termType === 'All' || termMatch) && fieldMatch;
  });

  // Sorting (only for table view)
  const sorted = filtered.slice().sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    if (sortBy === 'credits' || sortBy === 'period') {
      aVal = Number(aVal);
      bVal = Number(bVal);
    } else {
      aVal = aVal.toString().toLowerCase();
      bVal = bVal.toString().toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  };

  const sortIcon = (col) => sortBy === col ? (sortDir === 'asc' ? '▲' : '▼') : '';

  return (
    <div className="w-full max-w-6xl mx-auto bg-white/80 rounded-2xl shadow-xl p-8 mt-8 mb-8 border border-[#e5b3c3]">
      <h2 className="text-2xl font-extrabold mb-6 text-[#aa003e] text-center drop-shadow">All Available Courses</h2>
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div className="flex flex-col">
          <label className="text-xs font-semibold mb-1">Search</label>
          <input
            className="p-2 border border-[#e5b3c3] rounded-xl text-sm bg-white/80 focus:ring-2 focus:ring-[#e5b3c3]"
            placeholder="Course name or instructor"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold mb-1">Term Type</label>
          <select
            className="p-2 border border-[#e5b3c3] rounded-xl text-sm bg-white/80 focus:ring-2 focus:ring-[#e5b3c3]"
            value={termType}
            onChange={e => setTermType(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Semester">Semester</option>
            <option value="Quarter">Quarter</option>
            <option value="Session">Session</option>
          </select>
        </div>
        <div className="flex flex-col min-w-[160px]">
          <label className="text-xs font-semibold mb-1">Field</label>
          <MultiSelectDropdown
            options={uniqueFields.map(f => f.label)}
            selected={fieldTypes.map(val => uniqueFields.find(f => f.value === val)?.label || val)}
            onChange={labels => {
              setFieldTypes(labels.map(lab => {
                const found = uniqueFields.find(f => f.label === lab);
                return found ? found.value : lab.toLowerCase();
              }));
            }}
          />
        </div>
      </div>
      {/* Card/list view for mobile, table for desktop */}
      <div className="block sm:hidden">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-500 p-4">No courses found.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((course, idx) => (
              <div key={course.subjectCode + course.term + idx} className={
                'bg-white/80 border border-[#e5b3c3] rounded-2xl shadow-xl p-6 flex flex-col gap-2 hover:shadow-2xl hover:bg-[#f8e6ec] transition ' +
                (idx % 2 === 0 ? 'bg-[#fdf6f9]' : 'bg-white/80')
              }>
                <div className="font-bold text-lg text-[#aa003e] mb-1">{course.nameEn}</div>
                <div className="text-xs text-gray-600 mb-1">Instructor: <span className="font-semibold">{course.instructorEn}</span></div>
                <div className="flex flex-wrap gap-2 text-xs mt-1">
                  <span className="bg-[#f8e6ec] text-[#aa003e] rounded-full px-2 py-0.5">Credits: {course.credits}</span>
                  <span className="bg-green-100 text-green-800 rounded-full px-2 py-0.5">Term: {course.term}</span>
                  <span className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5">Day: {course.day}</span>
                  <span className="bg-purple-100 text-purple-800 rounded-full px-2 py-0.5">Period: {course.period}</span>
                  <span className="bg-gray-200 text-gray-800 rounded-full px-2 py-0.5">{capitalize(getFieldLabel(course.field))}</span>
                </div>
                {course.syllabusDetail && (
                  <button
                    className="mt-2 px-3 py-2 rounded-xl bg-[#aa003e] hover:bg-[#880030] text-white text-sm font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] w-fit"
                    onClick={() => onSyllabusClick(course)}
                    tabIndex={0}
                    aria-label="View syllabus"
                  >
                    View Syllabus
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="hidden sm:block w-full">
        <table className="min-w-[700px] w-full border border-[#e5b3c3] rounded-2xl shadow-xl bg-white/80 overflow-hidden">
          <thead>
            <tr className="bg-[#fdf6f9]">
              <th className={`p-2 border-b border-[#e5b3c3] cursor-pointer text-[#aa003e] font-bold text-base ${sortBy === 'nameEn' ? 'bg-[#f8e6ec]' : ''}`} onClick={() => handleSort('nameEn')}>Course Name {sortIcon('nameEn')}</th>
              <th className={`p-2 border-b border-[#e5b3c3] cursor-pointer text-[#aa003e] font-bold text-base ${sortBy === 'instructorEn' ? 'bg-[#f8e6ec]' : ''}`} onClick={() => handleSort('instructorEn')}>Instructor {sortIcon('instructorEn')}</th>
              <th className={`p-2 border-b border-[#e5b3c3] cursor-pointer text-[#aa003e] font-bold text-base ${sortBy === 'credits' ? 'bg-[#f8e6ec]' : ''}`} onClick={() => handleSort('credits')}>Credits {sortIcon('credits')}</th>
              <th className={`p-2 border-b border-[#e5b3c3] cursor-pointer text-[#aa003e] font-bold text-base ${sortBy === 'term' ? 'bg-[#f8e6ec]' : ''}`} onClick={() => handleSort('term')}>Term {sortIcon('term')}</th>
              <th className={`p-2 border-b border-[#e5b3c3] cursor-pointer text-[#aa003e] font-bold text-base ${sortBy === 'day' ? 'bg-[#f8e6ec]' : ''}`} onClick={() => handleSort('day')}>Day {sortIcon('day')}</th>
              <th className={`p-2 border-b border-[#e5b3c3] cursor-pointer text-[#aa003e] font-bold text-base ${sortBy === 'field' ? 'bg-[#f8e6ec]' : ''}`} onClick={() => handleSort('field')}>Field {sortIcon('field')}</th>
              <th className="p-2 border-b border-[#e5b3c3] text-[#aa003e] font-bold text-base">Syllabus</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-gray-500 p-4">No courses found.</td></tr>
            ) : (
              sorted.map((course, idx) => (
                <tr key={course.subjectCode + course.term + idx} className={idx % 2 === 0 ? 'bg-[#fdf6f9]' : 'bg-white/80'}>
                  <td className="p-2 border-b border-[#e5b3c3] font-semibold text-[#aa003e]">{course.nameEn}</td>
                  <td className="p-2 border-b border-[#e5b3c3]">{course.instructorEn}</td>
                  <td className="p-2 border-b border-[#e5b3c3] text-center">{course.credits}</td>
                  <td className="p-2 border-b border-[#e5b3c3] text-center">{course.term}</td>
                  <td className="p-2 border-b border-[#e5b3c3] text-center">{course.day}</td>
                  <td className="p-2 border-b border-[#e5b3c3] text-center">{course.period}</td>
                  <td className="p-2 border-b border-[#e5b3c3] text-center">{capitalize(getFieldLabel(course.field))}</td>
                  <td className="p-2 border-b border-[#e5b3c3] text-center">
                    {course.syllabusDetail && (
                      <button
                        className="px-3 py-2 rounded-xl bg-[#aa003e] hover:bg-[#880030] text-white text-xs font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] w-fit"
                        onClick={() => onSyllabusClick(course)}
                        tabIndex={0}
                        aria-label="View syllabus"
                      >
                        View Syllabus
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// TimetableListView: update card/list style
function TimetableListView({ plannedCourses, onCellClick, onSyllabusClick }) {
  return (
    <div className="w-full flex flex-col gap-2">
      {DAYS.map(day => (
        <div key={day} className="bg-white/80 rounded-2xl shadow-xl border border-[#e5b3c3]">
          <div className="px-4 py-2 font-bold bg-[#f8e6ec] rounded-t-2xl text-[#aa003e]">{day}</div>
          <div className="divide-y divide-[#f8e6ec]">
            {PERIODS.map(period => (
              QUARTERS.map(quarter => {
                const cellKey = `${day}-${period}-${quarter}`;
                const planned = plannedCourses[cellKey];
                let typeLabel = '', termLabel = '', badgeColor = 'gray';
                if (planned) {
                  const { type } = getTypeAndQuarter(planned.term);
                  typeLabel = type === 'semester' ? 'Semester' : type === 'quarter' ? 'Quarter' : '';
                  termLabel = planned.term || '';
                  badgeColor = type === 'semester' ? '#aa003e' : type === 'quarter' ? 'green' : 'gray';
                }
                return (
                  <div
                    key={cellKey}
                    className={`flex items-center px-4 py-3 cursor-pointer transition ${planned ? 'bg-[#fdf6f9] hover:bg-[#f8e6ec] font-semibold text-[#aa003e]' : 'hover:bg-[#f8e6ec]'} group rounded-xl`}
                    onClick={() => onCellClick(day, period, quarter, planned)}
                    tabIndex={0}
                    aria-label={planned ? `${planned.subjectCode} ${planned.nameEn}` : 'Add course'}
                  >
                    <div className="w-20 text-xs text-gray-500 font-medium flex-shrink-0">
                      {quarter} <span className="font-bold">{period}</span>
                    </div>
                    {planned ? (
                      <Tooltip text={`Instructor: ${planned.instructorEn}\nCredits: ${planned.credits}\n${typeLabel && `Type: ${typeLabel}`}\n${termLabel && `Term: ${termLabel}`}`.replace(/\n/g, '\n')}>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <Badge color={badgeColor}>{typeLabel}</Badge>
                            <span className="font-semibold text-[#aa003e] text-xs truncate">{planned.nameEn}</span>
                          </div>
                          <div className="text-xs text-gray-600 truncate">{planned.instructorEn}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge color="purple">{planned.credits} cr</Badge>
                            {termLabel && <Badge color="yellow">{termLabel}</Badge>}
                          </div>
                          {planned.syllabusDetail && (
                            <button
                              className="mt-2 px-2 py-1 bg-[#aa003e] text-white rounded-xl text-xs hover:bg-[#880030] focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] w-fit"
                              onClick={e => { e.stopPropagation(); onSyllabusClick(planned); }}
                              tabIndex={0}
                              aria-label="View syllabus"
                            >
                              View Syllabus
                            </button>
                          )}
                        </div>
                      </Tooltip>
                    ) : (
                      <span className="text-gray-400 text-xs">(empty)</span>
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const CREDIT_LIMITS = {
  1: 18,
  2: 18,
  3: 20,
  4: 20,
  5: 20,
  6: 20,
  7: 24,
  8: 24, // 8th semester and over
};

function getTotalPlannedCredits(plannedCourses, selectedSemester) {
  const unique = {};
  Object.values(plannedCourses).forEach(course => {
    if (!course || !course.subjectCode || !course.term) return;
    // Only count courses for the current semester or earlier
    if (Number(selectedSemester) >= Number(course.semester)) {
      const key = `${course.subjectCode}|${course.term}`;
      unique[key] = course;
    }
  });
  return Object.values(unique).reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
}

function generatePlanId() {
  return 'plan_' + Math.random().toString(36).substr(2, 9);
}

function getInitialPlans() {
  try {
    const saved = localStorage.getItem('timetables');
    if (saved) return JSON.parse(saved);
  } catch {}
  // Default: one plan
  const id = generatePlanId();
  return {
    plans: {
      [id]: { name: 'Main Plan', plannedCourses: {} }
    },
    currentPlanId: id
  };
}

function exportPlanToExcel(plan, planName) {
  const plannedCourses = plan.plannedCourses || {};
  // Timetable grid setup
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [1, 2, 3, 4, 5, 6];
  const quarters = ['Q1', 'Q2'];
  // Build grid rows
  const gridRows = [];
  for (const period of periods) {
    for (const quarter of quarters) {
      const row = { 'Period': `${quarter} ${period}` };
      for (const day of days) {
        const cellKey = `${day}-${period}-${quarter}`;
        const course = plannedCourses[cellKey];
        row[day] = course ? `${course.nameEn || ''}` : '';
      }
      gridRows.push(row);
    }
  }
  // Session classes
  const sessionCourses = Object.values(plannedCourses).filter(
    c => c && c.term && c.term.toLowerCase().startsWith('session')
  );
  const sessionRows = sessionCourses.length > 0 ? [
    {},
    { 'Session Classes': 'Course Name' },
    ...sessionCourses.map(c => ({ 'Session Classes': c.nameEn || '' }))
  ] : [];
  // Combine for export
  const wsData = [
    { 'Period': '', ...Object.fromEntries(days.map(d => [d, d])) },
    ...gridRows,
    ...sessionRows
  ];
  const ws = XLSX.utils.json_to_sheet(wsData, { skipHeader: true });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
  XLSX.writeFile(wb, `${planName.replace(/\s+/g, '_')}_timetable.xlsx`);
}

function App() {
  const [syllabusModalOpen, setSyllabusModalOpen] = useState(false);
  const [syllabusModalCourse, setSyllabusModalCourse] = useState(null);
  // Timetable management state
  const [timetables, setTimetables] = useState(getInitialPlans());
  const { plans, currentPlanId } = timetables;
  const [planNameEdit, setPlanNameEdit] = useState('');
  const [showRename, setShowRename] = useState(false);

  const [selectedCollege, setSelectedCollege] = useState('apm');
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedCell, setSelectedCell] = useState(null); // { day, period, quarter }
  const [modalOpen, setModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [modalWarning, setModalWarning] = useState("");
  const [sessionMode, setSessionMode] = useState(false); // true when adding session class
  const [onDemandMode, setOnDemandMode] = useState(false); // true when adding on-demand class
  const [courseToRemove, setCourseToRemove] = useState(null);
  const courses = useCourses(selectedCollege);

  // Planned courses for the current plan
  const plannedCourses = plans[currentPlanId]?.plannedCourses || {};

  // Save timetables to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('timetables', JSON.stringify(timetables));
  }, [timetables]);

  // Filter session classes
  const sessionCourses = courses.filter(course =>
    course.term && course.term.toLowerCase().startsWith('session')
  );
  // Planned session classes (unique by subjectCode+term)
  const plannedSessionCourses = Object.values(plannedCourses).filter(
    c => c && c.term && c.term.toLowerCase().startsWith('session')
  ).reduce((acc, c) => {
    const key = `${c.subjectCode}|${c.term}`;
    if (!acc.some(x => x.subjectCode === c.subjectCode && x.term === c.term)) acc.push(c);
    return acc;
  }, []);

  // Planned on-demand classes (unique by subjectCode+term)
  const plannedOnDemandCourses = Object.values(plannedCourses).filter(
    c => c && isOnDemandCourse(c)
  ).reduce((acc, c) => {
    const key = `${c.subjectCode}|${c.term}`;
    if (!acc.some(x => x.subjectCode === c.subjectCode && x.term === c.term)) acc.push(c);
    return acc;
  }, []);

  // Filter courses for the selected cell or session mode
  let filteredCourses = [];
  if (sessionMode) {
    filteredCourses = sessionCourses.filter(course =>
      Number(selectedSemester) >= Number(course.semester)
    );
  } else if (onDemandMode) {
    filteredCourses = courses.filter(course =>
      isOnDemandCourse(course) &&
      isEligibleSemester(course.semester, selectedSemester)
    );
  } else if (selectedCell) {
    filteredCourses = courses.filter(course => {
      const { type, quarter } = getTypeAndQuarter(course.term);
      return (
        course.day === DAY_MAP[selectedCell.day] &&
        Number(course.period) === Number(selectedCell.period) &&
        Number(selectedSemester) >= Number(course.semester) &&
        (
          (type === 'semester') ||
          (type === 'quarter' && quarter === selectedCell.quarter)
        )
      );
    });
  }

  // Handle cell click: if planned, open remove modal; if empty, open select modal
  const handleCellClick = (day, period, quarter, planned) => {
    if (planned) {
      setCourseToRemove(planned);
      setRemoveModalOpen(true);
    } else {
      setSelectedCell({ day, period, quarter });
      setModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedCell(null);
    setSessionMode(false);
    setOnDemandMode(false);
  };

  const handleRemoveModalClose = () => {
    setRemoveModalOpen(false);
    setCourseToRemove(null);
  };

  const totalCredits = getTotalPlannedCredits(plannedCourses, selectedSemester);
  const creditLimit = CREDIT_LIMITS[selectedSemester] || CREDIT_LIMITS[8];

  // Add session class handler
  const handleAddSessionClass = () => {
    setSessionMode(true);
    setModalOpen(true);
    setSelectedCell(null);
  };

  // Add on-demand class handler
  const handleAddOnDemandClass = () => {
    setOnDemandMode(true);
    setModalOpen(true);
    setSelectedCell(null);
  };

  // Remove session class handler
  const handleRemoveSessionClass = (course) => {
    setPlannedCourses(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key].subjectCode === course.subjectCode && updated[key].term === course.term) {
          delete updated[key];
        }
      });
      return updated;
    });
  };

  // Updated handleCourseSelect to support session mode
  const handleCourseSelect = (course) => {
    if (!sessionMode && !onDemandMode && !selectedCell) return;
    const { type, quarter } = getTypeAndQuarter(course.term);

    // Session class logic
    if (sessionMode) {
      // Check for duplicate
      const alreadyPlanned = Object.values(plannedCourses).some(
        c => c && c.subjectCode === course.subjectCode && c.term === course.term
      );
      if (alreadyPlanned) {
        setModalWarning('This session class is already in your plan.');
        return;
      }
      // Credit limit check
      const unique = {};
      Object.values(plannedCourses).forEach(c => {
        if (!c || !c.subjectCode || !c.term) return;
        if (Number(selectedSemester) >= Number(c.semester)) {
          const key = `${c.subjectCode}|${c.term}`;
          unique[key] = c;
        }
      });
      unique[`${course.subjectCode}|${course.term}`] = course;
      const newTotalCredits = Object.values(unique).reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
      if (newTotalCredits > creditLimit) {
        setModalWarning(`Cannot add this session class: adding it would exceed the credit limit (${creditLimit} credits) for this semester. Your total would be ${newTotalCredits} credits.`);
        return;
      }
      // Add session class (use a special key)
      setPlannedCourses(prev => {
        const updated = { ...prev };
        // Use a unique key for session classes
        const cellKey = `Session|${course.subjectCode}|${course.term}`;
        updated[cellKey] = { ...course };
        return updated;
      });
      setModalOpen(false);
      setSessionMode(false);
      setModalWarning("");
      return;
    }

    // On-Demand class logic
    if (onDemandMode) {
      // Check for duplicate
      const alreadyPlanned = Object.values(plannedCourses).some(
        c => c && c.subjectCode === course.subjectCode && c.term === course.term
      );
      if (alreadyPlanned) {
        setModalWarning('This on-demand class is already in your plan.');
        return;
      }
      // Credit limit check
      const unique = {};
      Object.values(plannedCourses).forEach(c => {
        if (!c || !c.subjectCode || !c.term) return;
        if (Number(selectedSemester) >= Number(c.semester)) {
          const key = `${c.subjectCode}|${c.term}`;
          unique[key] = c;
        }
      });
      unique[`${course.subjectCode}|${course.term}`] = course;
      const newTotalCredits = Object.values(unique).reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
      if (newTotalCredits > creditLimit) {
        setModalWarning(`Cannot add this on-demand class: adding it would exceed the credit limit (${creditLimit} credits) for this semester. Your total would be ${newTotalCredits} credits.`);
        return;
      }
      // Add on-demand class (use a special key)
      setPlannedCourses(prev => {
        const updated = { ...prev };
        // Use a unique key for on-demand classes
        const cellKey = `OnDemand|${course.subjectCode}|${course.term}`;
        updated[cellKey] = { ...course };
        return updated;
      });
      setModalOpen(false);
      setOnDemandMode(false);
      setModalWarning("");
      return;
    }

    // Find all entries for this subjectCode and term in the current course list (for the selected semester and onward)
    const relatedCourses = courses.filter(c =>
      c.subjectCode === course.subjectCode &&
      c.term === course.term &&
      Number(selectedSemester) >= Number(c.semester)
    );

    // Check for conflicts in any slot
    const conflict = relatedCourses.some(c => {
      const { type: cType, quarter: cQuarter } = getTypeAndQuarter(c.term);
      if (cType === 'semester') {
        return ['Q1', 'Q2'].some(q => {
          const cellKey = `${Object.keys(DAY_MAP).find(k => DAY_MAP[k] === c.day)}-${c.period}-${q}`;
          return plannedCourses[cellKey] && plannedCourses[cellKey].subjectCode !== course.subjectCode;
        });
      } else if (cType === 'quarter') {
        const cellKey = `${Object.keys(DAY_MAP).find(k => DAY_MAP[k] === c.day)}-${c.period}-${cQuarter}`;
        return plannedCourses[cellKey] && plannedCourses[cellKey].subjectCode !== course.subjectCode;
      }
      return false;
    });

    if (conflict) {
      setModalWarning('Cannot add this course: one or more of its scheduled periods is already occupied by another course.');
      return;
    }

    // Credit limit check for regular classes
    const unique = {};
    Object.values(plannedCourses).forEach(c => {
      if (!c || !c.subjectCode || !c.term) return;
      if (Number(selectedSemester) >= Number(c.semester)) {
        const key = `${c.subjectCode}|${c.term}`;
        unique[key] = c;
      }
    });
    relatedCourses.forEach(c => {
      const key = `${c.subjectCode}|${c.term}`;
      unique[key] = c;
    });
    const newTotalCredits = Object.values(unique).reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
    if (newTotalCredits > creditLimit) {
      setModalWarning(`Cannot add this course: adding it would exceed the credit limit (${creditLimit} credits) for this semester. Your total would be ${newTotalCredits} credits.`);
      return;
    }

    setPlannedCourses(prev => {
      const updated = { ...prev };
      relatedCourses.forEach(c => {
        const { type: cType, quarter: cQuarter } = getTypeAndQuarter(c.term);
        if (cType === 'semester') {
          ['Q1', 'Q2'].forEach(q => {
            const cellKey = `${Object.keys(DAY_MAP).find(k => DAY_MAP[k] === c.day)}-${c.period}-${q}`;
            updated[cellKey] = { ...c };
          });
        } else if (cType === 'quarter') {
          const cellKey = `${Object.keys(DAY_MAP).find(k => DAY_MAP[k] === c.day)}-${c.period}-${cQuarter}`;
          updated[cellKey] = { ...c };
        }
      });
      return updated;
    });
    setModalOpen(false);
    setSelectedCell(null);
    setModalWarning("");
  };

  // Remove all slots for the selected subjectCode
  const handleRemoveCourse = () => {
    if (!courseToRemove) return;
    setPlannedCourses(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key].subjectCode === courseToRemove.subjectCode) {
          delete updated[key];
        }
      });
      return updated;
    });
    setRemoveModalOpen(false);
    setCourseToRemove(null);
  };

  // Add a button to clear the plan
  const handleClearPlan = () => {
    setPlannedCourses({});
    localStorage.removeItem('plannedCourses');
  };

  // Timetable management handlers
  const handleSelectPlan = (planId) => {
    setTimetables(prev => ({ ...prev, currentPlanId: planId }));
  };
  const handleNewPlan = (copy = false) => {
    const newId = generatePlanId();
    setTimetables(prev => ({
      ...prev,
      plans: {
        ...prev.plans,
        [newId]: {
          name: `Plan ${Object.keys(prev.plans).length + 1}`,
          plannedCourses: copy ? { ...plannedCourses } : {}
        }
      },
      currentPlanId: newId
    }));
  };
  const handleDeletePlan = () => {
    if (Object.keys(plans).length === 1) return;
    if (!window.confirm('Delete this plan?')) return;
    setTimetables(prev => {
      const newPlans = { ...prev.plans };
      delete newPlans[currentPlanId];
      const newCurrent = Object.keys(newPlans)[0];
      return { plans: newPlans, currentPlanId: newCurrent };
    });
  };
  const handleRenamePlan = () => {
    if (!planNameEdit.trim()) return;
    setTimetables(prev => ({
      ...prev,
      plans: {
        ...prev.plans,
        [currentPlanId]: {
          ...prev.plans[currentPlanId],
          name: planNameEdit.trim()
        }
      }
    }));
    setShowRename(false);
  };

  // Update plannedCourses in the current plan
  const setPlannedCourses = (updater) => {
    setTimetables(prev => ({
      ...prev,
      plans: {
        ...prev.plans,
        [currentPlanId]: {
          ...prev.plans[currentPlanId],
          plannedCourses: typeof updater === 'function' ? updater(prev.plans[currentPlanId].plannedCourses) : updater
        }
      }
    }));
  };

  // UI for plan management
  const planOptions = Object.entries(plans).map(([id, plan]) => (
    <option key={id} value={id}>{plan.name}</option>
  ));

  const [mobileGridMode, setMobileGridMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Syllabus modal handler
  const handleSyllabusClick = (course) => {
    console.log('Syllabus modal opened for course:', course);
    setSyllabusModalCourse(course);
    setSyllabusModalOpen(true);
  };
  const handleSyllabusModalClose = () => {
    setSyllabusModalOpen(false);
    setSyllabusModalCourse(null);
  };
  // Wrap the UI in Router and add navigation
  useEffect(() => { document.title = 'Kurasu Plan'; }, []);

  return (
    <Router>
      <nav className="w-full bg-[#aa003e] text-white py-3 px-4 flex gap-4 mb-4 shadow">
        <span className="font-bold">Kurasu Plan</span>
      </nav>
      <Routes>
        <Route path="/" element={
          <div className="flex flex-col min-h-screen items-center bg-gray-50 text-gray-800 p-2 sm:p-4">
            {/* Plan management dropdown and actions */}
            <div className="w-full max-w-4xl flex flex-col sm:flex-row flex-wrap items-center gap-3 mb-4 sm:mb-6 p-4 bg-white rounded-lg shadow border border-gray-200">
              <div className="flex items-center gap-2 w-full sm:w-auto mb-2 sm:mb-0">
                <label className="font-semibold text-base">Current Plan:</label>
                <select
                  className="p-2 border rounded text-base font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-400"
                  value={currentPlanId}
                  onChange={e => handleSelectPlan(e.target.value)}
                >
                  {planOptions}
                </select>
              </div>
              <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                <button
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                  onClick={() => handleNewPlan(false)}
                  title="Create a new empty plan"
                >
                  <PlusIcon className="w-4 h-4" /> New Plan
                </button>
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                  onClick={() => handleNewPlan(true)}
                  title="Duplicate current plan"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" /> Duplicate
                </button>
                <button
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center gap-1"
                  onClick={() => { setPlanNameEdit(plans[currentPlanId].name); setShowRename(true); }}
                  title="Rename current plan"
                >
                  <PencilIcon className="w-4 h-4" /> Rename
                </button>
                <button
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1"
                  onClick={handleDeletePlan}
                  disabled={Object.keys(plans).length === 1}
                  title="Delete current plan"
                >
                  <TrashIcon className="w-4 h-4" /> Delete
                </button>
              </div>
              <button
                className="w-full sm:w-auto mt-2 sm:mt-0 sm:ml-auto px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                onClick={() => exportPlanToExcel(plans[currentPlanId], plans[currentPlanId].name)}
                title="Export current plan to Excel"
              >
                <InformationCircleIcon className="w-4 h-4" /> Export to Excel
              </button>
            </div>
            <div className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="font-semibold text-base" htmlFor="college-picker">College:</label>
                <select
                  id="college-picker"
                  className="p-2 border rounded text-base font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-400"
                  value={selectedCollege}
                  onChange={e => setSelectedCollege(e.target.value)}
                >
                  {COLLEGES.map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="font-semibold text-base" htmlFor="semester-picker">Semester:</label>
                <select
                  id="semester-picker"
                  className="p-2 border rounded text-base font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-400"
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(Number(e.target.value))}
                >
                  {SEMESTERS.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="w-full max-w-4xl border-b border-gray-300 mb-4 sm:mb-6"></div>
            {/* Rename modal */}
            {showRename && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs flex flex-col items-center">
                  <h3 className="text-lg font-bold mb-2">Rename Plan</h3>
                  <input
                    className="p-2 border rounded w-full mb-4"
                    value={planNameEdit}
                    onChange={e => setPlanNameEdit(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleRenamePlan}>Save</button>
                    <button className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400" onClick={() => setShowRename(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            {/* Credits and Timetable */}
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-2 sm:gap-4">
              <div className="flex justify-end mb-2">
                <div className="bg-gray-100 px-4 py-2 rounded shadow text-sm font-semibold">
                  Credits planned: <span className={totalCredits > creditLimit ? 'text-red-600' : 'text-blue-700'}>{totalCredits}</span> / {creditLimit}
                </div>
              </div>
              <div className="rounded-lg shadow bg-white p-2 sm:p-6 w-full">
                {/* Mobile toggle for grid/list */}
                <div className="block sm:hidden mb-2 text-right">
                  <button
                    className="inline-block px-3 py-1 bg-blue-500 text-white rounded shadow text-xs font-semibold"
                    onClick={() => setMobileGridMode(m => !m)}
                  >
                    {mobileGridMode ? 'View as List' : 'View as Grid'}
                  </button>
                </div>
                {isMobile ? (
                  mobileGridMode ? (
                    <div className="overflow-x-auto">
                      <TimetableGrid plannedCourses={plannedCourses} onCellClick={handleCellClick} onSyllabusClick={handleSyllabusClick} />
                    </div>
                  ) : (
                    <TimetableListView plannedCourses={plannedCourses} onCellClick={handleCellClick} onSyllabusClick={handleSyllabusClick} />
                  )
                ) : (
                  <TimetableGrid plannedCourses={plannedCourses} onCellClick={handleCellClick} onSyllabusClick={handleSyllabusClick} />
                )}
              </div>
            </div>
            {/* Session Classes Section */}
            <div className="w-full max-w-4xl bg-white/80 rounded-2xl shadow-xl p-6 mt-4 mb-4 flex flex-col gap-2 border border-[#e5b3c3]">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-2 gap-2">
                <h2 className="text-xl font-extrabold text-[#aa003e]">Session Classes</h2>
                <button
                  className="px-3 py-2 rounded-xl bg-[#aa003e] hover:bg-[#880030] text-white text-sm font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] flex items-center gap-1"
                  onClick={handleAddSessionClass}
                >
                  <PlusIcon className="w-4 h-4" /> Add Session Class
                </button>
              </div>
              {plannedSessionCourses.length === 0 ? (
                <div className="text-gray-500 text-sm">No session classes planned.</div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {plannedSessionCourses.map(course => (
                    <div key={course.subjectCode + course.term} className="flex items-center bg-white/80 border border-[#e5b3c3] rounded-2xl shadow-xl px-6 py-3 gap-4 w-full sm:w-auto hover:shadow-2xl hover:bg-[#f8e6ec] transition">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-[#f8e6ec] text-[#aa003e] rounded-full px-2 py-0.5 text-xs font-bold">Session</span>
                          <span className="font-semibold text-[#aa003e]">{course.subjectCode} {course.nameEn}</span>
                        </div>
                        <div className="text-xs text-gray-600">{course.instructorEn}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="bg-purple-100 text-purple-800 rounded-full px-2 py-0.5 text-xs">{course.credits} cr</span>
                          <span className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs">{course.term}</span>
                        </div>
                        {course.syllabusDetail && (
                          <button
                            className="mt-2 px-3 py-2 rounded-xl bg-[#aa003e] hover:bg-[#880030] text-white text-xs font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] w-fit"
                            onClick={() => handleSyllabusClick(course)}
                            tabIndex={0}
                            aria-label="View syllabus"
                          >
                            View Syllabus
                          </button>
                        )}
                      </div>
                      <button
                        className="ml-2 p-1 bg-red-100 hover:bg-red-200 rounded-full"
                        onClick={() => handleRemoveSessionClass(course)}
                        aria-label="Remove session class"
                      >
                        <TrashIcon className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div> {/* End of Session Classes Section */}
            {/* On-Demand Classes Section */}
            <div className="w-full max-w-4xl bg-white/80 rounded-2xl shadow-xl p-6 mt-4 mb-4 flex flex-col gap-2 border border-[#e5b3c3]">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-2 gap-2">
                <h2 className="text-xl font-extrabold text-[#aa003e]">On-Demand Classes</h2>
                <button
                  className="px-3 py-2 rounded-xl bg-[#aa003e] hover:bg-[#880030] text-white text-sm font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] flex items-center gap-1"
                  onClick={handleAddOnDemandClass}
                >
                  <PlusIcon className="w-4 h-4" /> Add On-Demand Class
                </button>
              </div>
              {plannedOnDemandCourses.length === 0 ? (
                <div className="text-gray-500 text-sm">No on-demand classes planned.</div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {plannedOnDemandCourses.map(course => (
                    <div key={course.subjectCode + course.term} className="flex items-center bg-white/80 border border-[#e5b3c3] rounded-2xl shadow-xl px-6 py-3 gap-4 w-full sm:w-auto hover:shadow-2xl hover:bg-[#f8e6ec] transition">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-[#f8e6ec] text-[#aa003e] rounded-full px-2 py-0.5 text-xs font-bold">On-Demand</span>
                          <span className="font-semibold text-[#aa003e]">{course.subjectCode} {course.nameEn}</span>
                        </div>
                        <div className="text-xs text-gray-600">{course.instructorEn}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="bg-purple-100 text-purple-800 rounded-full px-2 py-0.5 text-xs">{course.credits} cr</span>
                          <span className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs">{course.term}</span>
                        </div>
                        {course.syllabusDetail && (
                          <button
                            className="mt-2 px-3 py-2 rounded-xl bg-[#aa003e] hover:bg-[#880030] text-white text-xs font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#e5b3c3] w-fit"
                            onClick={() => handleSyllabusClick(course)}
                            tabIndex={0}
                            aria-label="View syllabus"
                          >
                            View Syllabus
                          </button>
                        )}
                      </div>
                      <button
                        className="ml-2 p-1 bg-red-100 hover:bg-red-200 rounded-full"
                        onClick={() => handleRemoveSessionClass(course)}
                        aria-label="Remove on-demand class"
                      >
                        <TrashIcon className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div> {/* End of On-Demand Classes Section */}
            {/* Course List (fixed width, no horizontal scroll) */}
            <div className="w-full">
            <CourseList 
              courses={courses.filter(course => Number(selectedSemester) >= Number(course.semester))}
              onSyllabusClick={handleSyllabusClick}
            />
            </div>
            {/* Modal for course selection */}
            <CourseSelectModal
              isOpen={modalOpen}
              onClose={handleModalClose}
              courses={filteredCourses}
              onSelect={handleCourseSelect}
              cell={{...selectedCell, semester: selectedSemester} || {}}
              plannedCourses={plannedCourses}
              warning={modalWarning}
              onSyllabusClick={handleSyllabusClick}
            />
            {syllabusModalOpen && syllabusModalCourse && (
              <SyllabusModal
                syllabusDetail={syllabusModalCourse.syllabusDetail}
                onClose={handleSyllabusModalClose}
                course={syllabusModalCourse}
              />
            )}
            {/* Modal for removing a course */}
            <RemoveCourseModal
              isOpen={removeModalOpen}
              onClose={handleRemoveModalClose}
              onRemove={handleRemoveCourse}
              course={courseToRemove || {}}
            />
          </div>
        } />
        <Route path="/syllabus/course/:idx" element={<CourseDetail />} />
      </Routes>
      <p className="mt-8 mb-2 text-xs text-gray-400 text-center">
        also check out <a href="https://shift-kiroku.web.app" target="_blank" rel="noopener noreferrer" className="underline text-[#aa003e] hover:text-[#880030]">shift-kiroku.web.app</a> to track your baito shift and manage it to calendar
      </p>
    </Router>
  );
}

export default App;
