import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import nlp from 'compromise';

/**
 * Pre-defined tech skills dictionary for keyword matching in candidate text
 */
const COMMON_SKILLS_DICTIONARY = [
  'Node.js', 'NodeJS', 'Express', 'Express.js', 'NestJS', 'Angular', 'React', 'Vue.js',
  'TypeScript', 'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang', 'Rust',
  'PHP', 'Ruby', 'Swift', 'Kotlin', 'HTML', 'HTML5', 'CSS', 'CSS3', 'Tailwind', 'Sass',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite', 'Prisma', 'TypeORM',
  'SQL', 'Bash', 'Pandas', 'NumPy', 'Matplotlib', 'Selenium',
  'Docker', 'Kubernetes', 'AWS', 'Amazon Web Services', 'GCP', 'Google Cloud', 'Azure', 'Microsoft Azure',
  'Git', 'GitHub', 'GitLab', 'CI/CD', 'Jenkins', 'Docker Swarm', 'Nginx', 'Linux',
  'REST API', 'RESTful API', 'GraphQL', 'Microservices', 'BullMQ', 'RxJS', 'Tesseract',
  'Unit Testing', 'Jest', 'Mocha', 'Jasmine', 'Cypress', 'Agile', 'Scrum'
];

/**
 * Interface representing extracted candidate profile metadata
 */
export interface ExtractedCandidateDetails {
  candidateName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  skills: string[];
  experienceYears: number | null;
  education: string | null;
}

/**
 * Extracts raw text from native digital PDF buffers using pdf-parse (~5ms fast)
 */
export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(fileBuffer);
    return data.text || '';
  } catch (error: any) {
    console.error('Error parsing PDF buffer:', error.message || error);
    return '';
  }
}

/**
 * Extracts raw text from Microsoft Word (.docx) document buffers using the mammoth library.
 * Why Mammoth? Standard DOCX files are compressed XML archives. Mammoth inspects the underlying XML
 * structure and cleanly extracts raw paragraph text and table contents into plain text while stripping
 * unnecessary Word styling, layout tags, and formatting.
 */
export async function extractTextFromDOCX(fileBuffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value || '';
  } catch (error: any) {
    console.error('Error parsing DOCX buffer:', error.message || error);
    return '';
  }
}

/**
 * Extracts text from scanned image/PDF buffers using Tesseract OCR engine
 */
export async function extractTextWithOCR(fileBuffer: Buffer): Promise<string> {
  let worker;
  try {
    worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(fileBuffer);
    await worker.terminate();
    return text || '';
  } catch (error: any) {
    if (worker) await worker.terminate();
    console.error('Error running Tesseract OCR:', error.message || error);
    return '';
  }
}

/**
 * Smart unified document router:
 * Determines file type (DOCX, Image, PDF) and automatically falls back to Tesseract OCR
 * if native PDF extraction returns less than 30 characters (scanned paper resume).
 */
export async function parseDocument(
  fileBuffer: Buffer,
  mimeType: string,
  originalFilename: string
): Promise<string> {
  const filename = (originalFilename || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  // 1. Word Document (.docx)
  if (mime.includes('word') || filename.endsWith('.docx')) {
    return await extractTextFromDOCX(fileBuffer);
  }

  // 2. Image (.png, .jpg, .jpeg)
  if (mime.includes('image') || filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
    return await extractTextWithOCR(fileBuffer);
  }

  // 3. PDF Document (.pdf) - Handles both Digital PDFs and Scanned Image PDFs
  if (mime.includes('pdf') || filename.endsWith('.pdf')) {
    // Step A: Attempt fast native PDF text extraction first using pdf-parse (~5ms)
    // If it's a Proper Digital PDF, pdf-parse extracts 500+ characters of embedded font text immediately.
    let text = await extractTextFromPDF(fileBuffer);

    // Step B: Auto-Detect Scanned Image PDFs
    // If a candidate uploaded a photo/scan converted to PDF, pdf-parse returns empty text ("")
    // because there are no digital font streams inside an image PDF.
    if (!text || text.trim().length < 30) {
      console.log(`📷 Scanned Image PDF detected for '${originalFilename}'. Falling back to Tesseract OCR...`);
      // Automatically route to Tesseract OCR engine for image optical character recognition!
      text = await extractTextWithOCR(fileBuffer);
    }

    return text;
  }

  // Default fallback
  return await extractTextFromPDF(fileBuffer);
}

/**
 * Disambiguates and ranks name candidates against the email username
 * 
 * @param {string[]} nameCandidates - Array of potential name candidate strings
 * @param {string | null} email - Candidate's email address if found
 * @returns {string | null} Best matched candidate name
 */
export function findBestNameMatch(nameCandidates: string[], email: string | null): string | null {
  if (!nameCandidates || nameCandidates.length === 0) return null;
  if (nameCandidates.length === 1 && !email) return nameCandidates[0];

  // If no email available, pick the first valid multi-word candidate or first candidate
  if (!email) {
    const multiWord = nameCandidates.find(name => name.trim().split(/\s+/).length >= 2);
    return multiWord || nameCandidates[0];
  }

  // 1. Normalize email prefix: "ritik.chaurasia21@gmail.com" -> "ritikchaurasia"
  const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z]/g, '');

  let bestName: string = nameCandidates[0];
  let highestScore = -1;

  for (const name of nameCandidates) {
    const trimmed = name.trim();
    console.log(name + '---' + emailPrefix)
    const nameParts = trimmed.toLowerCase().split(/\s+/).filter(part => part.length >= 2);
    if (nameParts.length === 0) continue;

    let matchScore = 0;
    let matchingPartsCount = 0;

    for (const part of nameParts) {
      if (email.includes(part)) {
        matchScore += part.length; // Longer matching parts get higher weight
        matchingPartsCount++;
      }
    }

    // Bonus for matching both first and last name in email username
    if (matchingPartsCount >= 2) {
      matchScore += 10;
    }

    // Slight preference for standard 2-3 word full names
    if (nameParts.length >= 2 && nameParts.length <= 3) {
      matchScore += 1;
    }

    if (matchScore > highestScore) {
      highestScore = matchScore;
      bestName = trimmed;
    }
  }

  return bestName;
}

/**
 * Parses raw text string using Regex + NLP (compromise) to extract structured fields:
 * Email, Phone Number, Candidate Name, Location, Tech Skills, Experience Years, and Education Degrees.
 */
export function extractCandidateDetails(rawText: string): ExtractedCandidateDetails {
  if (!rawText || typeof rawText !== 'string') {
    return {
      candidateName: null,
      email: null,
      phone: null,
      location: null,
      skills: [],
      experienceYears: null,
      education: null,
    };
  }

  // 1. Extract Email via Regex
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  const email = emailMatch ? emailMatch[0].trim() : null;

  // 2. Extract Phone Number via Regex
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : null;

  // 3. Extract Candidate Name using NLP compromise (#Person & #ProperNoun) + Header scanning + Email matching
  let candidateName: string | null = null;
  const doc = nlp(rawText);
  const nameCandidates: string[] = [];

  // A. Collect candidates from compromise doc.people()
  const people = doc.people().out('array');
  if (people && people.length > 0) {
    for (const p of people) {
      if (p && p.trim().length > 1 && !nameCandidates.includes(p.trim())) {
        nameCandidates.push(p.trim());
      }
    }
  }

  // B. Scan first 5 lines (Header) for #ProperNoun sequences (captures diverse / non-Western names)
  const headerLines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.includes('@') && !l.includes('http') && !l.match(/\d{5,}/))
    .slice(0, 5);
  nameCandidates.push(headerLines[0]);
  for (const line of headerLines) {
    if (/^(resume|curriculum vitae|cv|profile|summary|contact|personal|experience|education|skills)/i.test(line)) {
      continue;
    }

    const lineDoc = nlp(line);
    const properNouns = lineDoc.match('#ProperNoun+').out('array');
    for (const pn of properNouns) {
      const trimmed = pn.trim();
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2 && parts.length <= 4 && !nameCandidates.includes(trimmed)) {
        nameCandidates.push(trimmed);
      }
    }

    // Also fallback to clean title-case multi-word lines in header
    if (/^[A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,3}$/.test(line) && !nameCandidates.includes(line)) {
      nameCandidates.push(line);
    }
  }
  // C. Disambiguate using email username matching or fallback to top candidate
  candidateName = findBestNameMatch(nameCandidates, email);

  // D. Ultimate fallback: first clean non-empty line of text
  if (!candidateName && headerLines.length > 0 && headerLines[0].length < 40) {
    candidateName = headerLines[0];
  }

  // 4. Extract Location using NLP places or City/State/Country regex
  let location: string | null = null;
  const places = doc.places().out('array');
  if (places && places.length > 0) {
    location = places[0];
  } else {
    const locMatch = rawText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2}|[A-Z][a-z]+)\b/);
    if (locMatch) {
      location = locMatch[0].trim();
    }
  }

  // 5. Extract Tech Skills using dictionary word boundary matching
  const foundSkillsSet = new Set<string>();
  COMMON_SKILLS_DICTIONARY.forEach(skill => {
    const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
    if (regex.test(rawText)) {
      foundSkillsSet.add(skill);
    }
  });

  // 6. Extract Years of Experience via Regex
  let experienceYears: number | null = null;
  const expMatch = rawText.match(/(\d+(?:\.\d+)?)\s*(?:\+|\s*plus)?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)?/i);
  if (expMatch) {
    const yearsParsed = parseFloat(expMatch[1]);
    if (!isNaN(yearsParsed) && yearsParsed < 50) {
      experienceYears = yearsParsed;
    }
  }

  // 7. Extract Education Degree via Regex
  let education: string | null = null;
  const eduDegrees = ['Ph.D', 'Doctor of Philosophy', 'Master', 'M.Tech', 'M.S.', 'M.C.A.', 'Bachelor', 'B.Tech', 'B.S.', 'B.C.A.', 'Diploma'];
  for (const degree of eduDegrees) {
    const regex = new RegExp(`\\b${degree}\\b[^\\n,.]{0,50}`, 'i');
    const match = rawText.match(regex);
    if (match) {
      education = match[0].trim();
      break;
    }
  }

  return {
    candidateName,
    email,
    phone,
    location,
    skills: Array.from(foundSkillsSet),
    experienceYears,
    education,
  };
}
