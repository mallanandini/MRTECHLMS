/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { 
  User, UserRole, Course, Module, Lesson, LessonType, 
  Enrollment, Progress, Assessment, Question, QuestionType, 
  Submission, CodingSubmission, Blog, Comment, Review 
} from "../src/types.js";

const DATA_DIR = path.join(process.cwd(), "data");

// Helper to ensure data directory and collection files exist
function ensureCollectionFile<T>(filename: string, defaultData: T[] = []): string {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify(defaultData, null, 2), "utf-8");
  }
  return filepath;
}

class Collection<T extends { id: string }> {
  private filepath: string;

  constructor(filename: string, defaultData: T[] = []) {
    this.filepath = ensureCollectionFile(filename, defaultData);
  }

  private read(): T[] {
    try {
      const content = fs.readFileSync(this.filepath, "utf-8");
      return JSON.parse(content) as T[];
    } catch (e) {
      console.error(`Error reading database file: ${this.filepath}`, e);
      return [];
    }
  }

  private write(data: T[]): void {
    try {
      fs.writeFileSync(this.filepath, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error(`Error writing database file: ${this.filepath}`, e);
    }
  }

  public find(query: Partial<T> = {}): T[] {
    const data = this.read();
    return data.filter(item => {
      for (const key in query) {
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
  }

  public findOne(query: Partial<T>): T | null {
    const items = this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  public insert(item: Omit<T, "id"> & { id?: string }): T {
    const data = this.read();
    const newItem = {
      ...item,
      id: item.id || crypto.randomUUID(),
    } as T;
    data.push(newItem);
    this.write(data);
    return newItem;
  }

  public update(id: string, updates: Partial<T>): T | null {
    const data = this.read();
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return null;

    const updatedItem = {
      ...data[index],
      ...updates,
      id // Ensure ID cannot be changed
    };
    data[index] = updatedItem;
    this.write(data);
    return updatedItem;
  }

  public delete(id: string): boolean {
    const data = this.read();
    const initialLength = data.length;
    const filtered = data.filter(item => item.id !== id);
    if (filtered.length === initialLength) return false;
    this.write(filtered);
    return true;
  }
}

// Seed Users
const seedUsers: (User & { passwordHash: string })[] = [
  {
    id: "student-1",
    name: "Alex Johnson",
    email: "student@lms.com",
    role: UserRole.STUDENT,
    passwordHash: crypto.createHash("sha256").update("student123").digest("hex"),
    createdAt: new Date("2026-01-10").toISOString(),
    status: "active"
  },
  {
    id: "trainer-1",
    name: "Dr. Sarah Mitchell",
    email: "trainer@lms.com",
    role: UserRole.TRAINER,
    passwordHash: crypto.createHash("sha256").update("trainer123").digest("hex"),
    createdAt: new Date("2025-11-15").toISOString(),
    status: "active"
  },
  {
    id: "admin-1",
    name: "System Administrator",
    email: "admin@lms.com",
    role: UserRole.ADMIN,
    passwordHash: crypto.createHash("sha256").update("admin123").digest("hex"),
    createdAt: new Date("2025-10-01").toISOString(),
    status: "active"
  }
];

// Seed Courses
const seedCourses: Course[] = [
  {
    id: "course-1",
    title: "Introduction to Full-Stack Web Development",
    description: "Learn HTML, CSS, JavaScript, React, Node.js, and Express to build scalable and highly polished full-stack web applications from scratch.",
    thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80",
    instructorId: "trainer-1",
    instructorName: "Dr. Sarah Mitchell",
    category: "Web Development",
    requirements: [
      "Basic understanding of computers",
      "No programming experience required"
    ],
    skillsCovered: [
      "Modern React (v19)",
      "Express.js REST APIs",
      "Tailwind CSS Layouts",
      "TypeScript Type Safety"
    ],
    status: "published",
    isFeatured: true,
    rating: 4.8,
    reviewsCount: 150,
    createdAt: new Date("2026-01-15").toISOString()
  },
  {
    id: "course-2",
    title: "Mastering Python for AI and Data Science",
    description: "Go from absolute beginner to master in Python programming, covering lists, dictionaries, data analysis, and integrating Gemini AI models.",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
    instructorId: "trainer-1",
    instructorName: "Dr. Sarah Mitchell",
    category: "Artificial Intelligence",
    requirements: [
      "A working computer with Python installed"
    ],
    skillsCovered: [
      "Python Object-Oriented Programming",
      "Data Manipulation with Pandas",
      "Gemini AI SDK Integration",
      "Statistical Analysis"
    ],
    status: "published",
    isFeatured: false,
    rating: 4.6,
    reviewsCount: 75,
    createdAt: new Date("2026-02-01").toISOString()
  }
];

// Seed Modules
const seedModules: Module[] = [
  { id: "mod-1", courseId: "course-1", title: "Module 1: JavaScript & Web Foundations", order: 1 },
  { id: "mod-2", courseId: "course-1", title: "Module 2: Building UIs with Modern React", order: 2 },
  { id: "mod-3", courseId: "course-2", title: "Module 1: Python Core Foundations", order: 1 },
  { id: "mod-4", courseId: "course-2", title: "Module 2: Real-World Coding & AI Solutions", order: 2 }
];

// Seed Lessons
const seedLessons: Lesson[] = [
  {
    id: "les-1",
    moduleId: "mod-1",
    courseId: "course-1",
    title: "Welcome to Full-Stack Development",
    type: LessonType.VIDEO,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-his-computer-34282-large.mp4",
    order: 1,
    durationMinutes: 5,
    content: "## Welcome!\nWelcome to the course. We'll start our full-stack engineering journey in this lesson by looking at the internet structure, clients, and servers."
  },
  {
    id: "les-2",
    moduleId: "mod-1",
    courseId: "course-1",
    title: "Understanding JavaScript ES6+ Features",
    type: LessonType.TEXT,
    order: 2,
    durationMinutes: 10,
    content: `## JavaScript ES6+ Concepts

In this lesson, we will cover key ES6+ additions that make React development simple and elegant:

### 1. Arrow Functions
Provides a concise syntax for writing function expressions.
\`\`\`javascript
const double = (x) => x * 2;
\`\`\`

### 2. Destructuring
Easily extract fields from arrays or objects.
\`\`\`javascript
const user = { name: "Alex", role: "Student" };
const { name, role } = user;
\`\`\`

### 3. Spread/Rest Operator
Clone or join arrays and objects efficiently.
\`\`\`javascript
const list = [1, 2];
const newList = [...list, 3, 4];
\`\`\``
  },
  {
    id: "les-3",
    moduleId: "mod-2",
    courseId: "course-1",
    title: "Creating React Functional Components",
    type: LessonType.TEXT,
    order: 1,
    durationMinutes: 12,
    content: `## React Functional Components

React components are JavaScript functions that return markup. Let's look at how to declare them using TypeScript!

\`\`\`tsx
interface CardProps {
  title: string;
  count: number;
}

export function StatCard({ title, count }: CardProps) {
  return (
    <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition">
      <h4 className="text-sm font-medium text-gray-500 uppercase">{title}</h4>
      <p className="mt-2 text-3xl font-semibold text-gray-950">{count}</p>
    </div>
  );
}
\`\`\``
  },
  {
    id: "les-4",
    moduleId: "mod-3",
    courseId: "course-2",
    title: "Python Variables and Control Flow",
    type: LessonType.TEXT,
    order: 1,
    durationMinutes: 15,
    content: `## Python Variable Allocation & Logical Paths

Welcome to Python! Let's review standard variables and conditions:

\`\`\`python
# Declaring a simple profile status
name = "Alex Johnson"
score = 88
passed = score >= 50

if passed:
    print(f"Congratulations {name}! You successfully passed.")
else:
    print(f"Keep practicing, {name}. Try again!")
\`\`\``
  },
  {
    id: "les-5",
    moduleId: "mod-4",
    courseId: "course-2",
    title: "Hands-on Coding Practice: Python Prime Numbers",
    type: LessonType.CODING,
    order: 1,
    durationMinutes: 20,
    codingPrompt: {
      id: "prob-1",
      title: "Check If Prime Number",
      description: "Write a function `is_prime(n)` in Python that takes an integer `n` and returns `True` if `n` is prime, and `False` otherwise.",
      difficulty: "easy",
      allowedLanguages: ["python", "javascript"],
      starterCode: {
        python: "def is_prime(n):\n    # Write your logic here\n    pass\n",
        javascript: "function isPrime(n) {\n    // Write your logic here\n    return false;\n}\n"
      },
      testCases: [
        { id: "tc-1", input: "5", expectedOutput: "True", isPublic: true },
        { id: "tc-2", input: "4", expectedOutput: "False", isPublic: true },
        { id: "tc-3", input: "1", expectedOutput: "False", isPublic: false },
        { id: "tc-4", input: "2", expectedOutput: "True", isPublic: false }
      ],
      hints: ["Prime numbers are strictly greater than 1.", "A number is prime if it has no positive divisors other than 1 and itself."]
    }
  }
];

// Seed Assessments
const seedAssessments: Assessment[] = [
  {
    id: "assess-1",
    courseId: "course-1",
    moduleId: "mod-1",
    title: "Foundational Web and JS Assessment",
    description: "Test your understanding of HTML, CSS, JavaScript structures, array operations, and functional programming before moving on to React.",
    durationMinutes: 15,
    passingScore: 70,
    totalPoints: 10,
    questionsCount: 2,
    createdAt: new Date("2026-01-20").toISOString(),
    status: "published"
  }
];

// Seed Questions
const seedQuestions: Question[] = [
  {
    id: "q-1",
    assessmentId: "assess-1",
    type: QuestionType.MCQ_SINGLE,
    questionText: "Which JavaScript array method is used to create a new array with all elements that pass the test implemented by the provided function?",
    options: ["map()", "filter()", "reduce()", "forEach()"],
    correctAnswers: ["filter()"],
    points: 5
  },
  {
    id: "q-2",
    assessmentId: "assess-1",
    type: QuestionType.TRUE_FALSE,
    questionText: "Arrow functions in JavaScript bind their own 'this' value dynamically.",
    options: ["True", "False"],
    correctAnswers: ["False"],
    points: 5
  }
];

// Seed Blogs
const seedBlogs: Blog[] = [
  {
    id: "blog-1",
    title: "The Future of Web Engineering: React 19 & Next-Gen Bundlers",
    content: `## The Evolution of React

React 19 introduces major features like **Server Actions**, the **React Compiler**, and out-of-the-box support for async transitions. In this blog, we'll look at why React continues to dominate full-stack interfaces:

### 1. The Compiler (React Forget)
No more manual memoization using \`useMemo\` and \`useCallback\`. The compiler auto-optimizes the render pathways, saving developer cycles and minimizing re-render cascades.

### 2. Unified Asset Loading
React 19 supports loading stylesheets, fonts, and scripts eagerly before the page finishes compiling, resulting in lightning-fast initial load times.`,
    summary: "An in-depth look at Server Actions, automatic compiler optimizations, and unified document asset loading introduced in React 19.",
    coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=80",
    authorId: "trainer-1",
    authorName: "Dr. Sarah Mitchell",
    category: "Web Development",
    tags: ["react", "frontend", "webdev"],
    likesCount: 45,
    bookmarksCount: 12,
    status: "approved",
    createdAt: new Date("2026-02-15").toISOString()
  }
];

// Exporting collections
export const usersDb = new Collection<{ id: string; name: string; email: string; role: UserRole; profilePhoto?: string; createdAt: string; status: "active" | "suspended"; passwordHash: string }>("users.json", seedUsers);
export const coursesDb = new Collection<Course>("courses.json", seedCourses);
export const modulesDb = new Collection<Module>("modules.json", seedModules);
export const lessonsDb = new Collection<Lesson>("lessons.json", seedLessons);
export const enrollmentsDb = new Collection<Enrollment>("enrollments.json", []);
export const progressDb = new Collection<Progress>("progress.json", []);
export const assessmentsDb = new Collection<Assessment>("assessments.json", seedAssessments);
export const questionsDb = new Collection<Question>("questions.json", seedQuestions);
export const submissionsDb = new Collection<Submission>("submissions.json", []);
export const codingSubmissionsDb = new Collection<CodingSubmission>("coding_submissions.json", []);
export const blogsDb = new Collection<Blog>("blogs.json", seedBlogs);
export const commentsDb = new Collection<Comment>("comments.json", []);
export const reviewsDb = new Collection<Review>("reviews.json", []);
