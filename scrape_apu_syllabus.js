const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Helper to read and parse JSON
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Helper to extract course code
function extractCourseCode(course) {
  return course['__5'] || '';
}

const CONCURRENCY = 10;

(async () => {
  try {
    // 1. Read all courses from the three JSON files
    const dataDir = path.join(__dirname, 'src', 'data');
    const files = ['apm.json', 'aps.json', 'st.json'];
    let allCourses = [];
    for (const file of files) {
      const courses = readJson(path.join(dataDir, file));
      allCourses = allCourses.concat(courses);
    }
    // Only keep valid course codes (8 alphanumeric characters)
    allCourses = allCourses.filter(c => /^[0-9A-Z]{8}$/i.test(c['__5']));
    console.log(`Total valid courses found: ${allCourses.length}`);

    // Prepare all jobs (each course+semester is a job)
    const jobs = [];
    for (const course of allCourses) {
      const code = extractCourseCode(course);
      for (const semester of ['1', '2']) {
        jobs.push({ course, code, semester });
      }
    }

    // 2. Launch Puppeteer in headless mode
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    let count = 0;
    const results = [];

    // Worker function
    async function worker(job) {
      const page = await browser.newPage();
      const { course, code, semester } = job;
      const url = `https://portal2.apu.ac.jp/campusp/slbssbdr.do?value(risyunen)=2025&value(semekikn)=${semester}&value(kougicd)=${code}&value(crclumcd)=`;
      console.log(`(${++count}/${jobs.length}) Visiting: ${url}`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForSelector('table', { timeout: 5000 });
        // Extract all tables and text content
        const detail = await page.evaluate(() => {
          const tables = Array.from(document.querySelectorAll('table')).map(table => {
            return Array.from(table.rows).map(row =>
              Array.from(row.cells).map(cell => cell.innerText.trim())
            );
          });
          const bodyText = document.body.innerText;
          return { tables, bodyText };
        });
        results.push({ ...course, semester, syllabusUrl: url, syllabusDetail: detail });
      } catch (err) {
        console.log(`Failed to scrape ${url}: ${err.message}`);
        results.push({ ...course, semester, syllabusUrl: url, error: err.message });
      }
      await page.close();
    }

    // Simple concurrency pool
    let idx = 0;
    async function runPool() {
      const pool = [];
      for (let i = 0; i < CONCURRENCY; i++) {
        pool.push(
          (async function next() {
            while (idx < jobs.length) {
              const myIdx = idx++;
              await worker(jobs[myIdx]);
            }
          })()
        );
      }
      await Promise.all(pool);
    }

    await runPool();
    await browser.close();
    fs.writeFileSync('all_syllabus_details_2025.json', JSON.stringify(results, null, 2), 'utf-8');
    console.log('All syllabus details saved to all_syllabus_details_2025.json');
  } catch (error) {
    console.error('Error occurred:', error.message);
    console.error('Full error:', error);
  }
})();