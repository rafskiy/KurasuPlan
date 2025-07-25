import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function CourseDetail() {
  const { idx } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/data/all_syllabus_details_2025.json')
      .then(res => res.json())
      .then(data => {
        setCourse(data[idx]);
        setLoading(false);
      });
  }, [idx]);

  if (loading) return <div>Loading...</div>;
  if (!course) return <div>Course not found.</div>;

  return (
    <div className="p-4">
      <Link to="/" className="text-blue-600 underline">&larr; Back to all courses</Link>
      <h1 className="text-2xl font-bold mb-2 mt-2">{course['__6']} ({course['__5']})</h1>
      <p className="mb-2"><strong>Instructor:</strong> {course['__8']}</p>
      <p className="mb-2"><strong>Semester:</strong> {course['__1'] || course['__11'] || 'N/A'}</p>
      <h2 className="text-xl font-semibold mt-4 mb-2">Syllabus Details</h2>
      {course.syllabusDetail ? (
        <div>
          {course.syllabusDetail.tables && course.syllabusDetail.tables.length > 0 ? (
            <div className="overflow-x-auto mb-4">
              {course.syllabusDetail.tables.map((table, tIdx) => (
                <table key={tIdx} className="mb-4 border min-w-max">
                  <tbody>
                    {table.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="border px-2 py-1">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          ) : (
            <div>No syllabus tables available.</div>
          )}
        </div>
      ) : (
        <div>No syllabus details available.</div>
      )}
    </div>
  );
}

export default CourseDetail; 