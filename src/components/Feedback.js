import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'suggestion', label: 'General Suggestion' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' },
];

const Feedback = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
    feedbackType: '',
    wantsResponse: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.feedbackType) {
      setError('Please select a feedback type.');
      return;
    }
    if (!form.message.trim()) {
      setError('Please enter your feedback message.');
      return;
    }
    if (form.wantsResponse && !form.email.trim()) {
      setError('Please enter your email if you want a response.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        name: form.name,
        email: form.wantsResponse ? form.email : '',
        message: form.message,
        feedbackType: form.feedbackType,
        wantsResponse: form.wantsResponse,
        createdAt: Timestamp.now(),
      });
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit feedback. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-4 px-1 sm:py-8 sm:px-2">
      <div className="w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl bg-white/80 rounded-2xl shadow-xl border border-[#e5b3c3] p-4 sm:p-6 md:p-10 mx-auto mt-4 sm:mt-8 relative">
        <Link
          to="/"
          className="absolute left-4 top-4 sm:left-6 sm:top-6 flex items-center gap-1 px-3 py-1 border border-[#aa003e] text-[#aa003e] bg-white/80 rounded-lg text-sm font-semibold hover:bg-[#f8e6ec] transition"
          aria-label="Back to Home"
        >
          <span className="text-lg">&#8592;</span> <span className="hidden xs:inline">Back to Home</span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#aa003e] mb-4 sm:mb-6 text-center">Feedback</h2>
        {submitted ? (
          <div className="p-4 text-green-600 text-center text-lg font-semibold">Thank you for your feedback!</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block mb-1 font-medium">Type <span className="text-red-500">*</span></label>
              <select
                name="feedbackType"
                value={form.feedbackType}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-base"
                required
              >
                <option value="">Select type...</option>
                {FEEDBACK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-base"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Message <span className="text-red-500">*</span></label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-base"
                rows={4}
                required
              />
            </div>
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                name="wantsResponse"
                checked={form.wantsResponse}
                onChange={handleChange}
                id="wantsResponse"
                className="mr-2 h-5 w-5"
              />
              <label htmlFor="wantsResponse" className="font-medium">I want a response</label>
            </div>
            {form.wantsResponse && (
              <div>
                <label className="block mb-1 font-medium">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 text-base"
                  required={form.wantsResponse}
                  autoComplete="email"
                />
              </div>
            )}
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-[#aa003e] text-white px-6 py-2 rounded-xl hover:bg-[#880030] font-semibold disabled:opacity-60 shadow w-full sm:w-auto"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Feedback; 