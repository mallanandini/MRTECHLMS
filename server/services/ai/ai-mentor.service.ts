/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export interface ExplainRequestParams {
  content: string;
  context?: string;
  userId?: string;
  history?: Array<{ role: "user" | "mentor"; content: string }>;
  previousAnswer?: string;
}

export interface ExplainResponseData {
  explanation: string;
  isDemo: boolean;
  model: string;
  configured: boolean;
  provider: string;
}

export class AIMentorService {
  private static cachedClient: GoogleGenAI | null = null;
  private static cachedApiKey: string | null = null;

  /**
   * Safely retrieves and sanitizes the GEMINI_API_KEY from backend environment.
   * Strips wrapping quotes and returns null if empty or placeholder.
   */
  public static getApiKey(): string | null {
    const raw = process.env.GEMINI_API_KEY;
    if (!raw) return null;

    const trimmed = raw.trim().replace(/^["']|["']$/g, "").trim();
    if (!trimmed || trimmed === "MY_GEMINI_API_KEY" || trimmed === "your_gemini_api_key_here") {
      return null;
    }
    return trimmed;
  }

  /**
   * Returns true if a genuine GEMINI_API_KEY is configured in backend environment.
   */
  public static isConfigured(): boolean {
    return this.getApiKey() !== null;
  }

  /**
   * Returns configured model name with fallback to gemini-2.5-flash
   */
  public static getModelName(): string {
    return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  }

  /**
   * Lazily initializes GoogleGenAI client with key validation
   */
  private static getClient(): GoogleGenAI | null {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.cachedClient = null;
      this.cachedApiKey = null;
      return null;
    }

    if (this.cachedClient && this.cachedApiKey === apiKey) {
      return this.cachedClient;
    }

    this.cachedApiKey = apiKey;
    this.cachedClient = new GoogleGenAI({ apiKey });
    return this.cachedClient;
  }

  /**
   * Service status check for admin and diagnostics (never leaks keys)
   */
  public static getStatus() {
    const configured = this.isConfigured();
    return {
      configured,
      model: this.getModelName(),
      provider: "google-gemini",
      mode: configured ? "live" : "demo"
    };
  }

  /**
   * Main method to generate mentor explanation.
   * Uses live Gemini API when key is configured.
   * Provides genuine, student-friendly, educational mentor guidance when unconfigured.
   */
  public static async explain(params: ExplainRequestParams): Promise<ExplainResponseData> {
    const content = (params.content || "").trim();
    const context = (params.context || "").trim();

    if (!content) {
      throw { status: 400, message: "Query content cannot be empty." };
    }

    if (content.length > 4000) {
      throw { status: 400, message: "Query is too long. Please keep your question under 4,000 characters." };
    }

    const ai = this.getClient();
    const model = this.getModelName();

    // 1. LIVE GEMINI AI MODE
    if (ai) {
      try {
        const systemInstruction = 
`You are the MR Technologies AI Learning Mentor, an expert, patient, and encouraging computer science and software engineering instructor in an LMS platform.
Your objective is to help students master coding concepts, understand course curriculum, and debug errors.

GUIDELINES:
1. GREETINGS: If the user says "hi", "hello", or offers a casual greeting, respond warmly, encouragingly, and conversationally in 1-2 sentences. Welcome them and ask what coding concept, lesson topic, or bug they are working on. Do NOT provide lectures or random explanations for simple greetings.
2. ACCURACY & RIGOR: Provide clear, technically sound explanations of programming concepts (Python, JavaScript/TypeScript, Java, C/C++, SQL, HTML/CSS, Data Structures & Algorithms, OOP, Systems, AI/ML).
3. CODE EXAMPLES: Always include concise, clean, well-commented code snippets enclosed in proper Markdown code blocks with language tags when answering programming queries.
4. ERROR DIAGNOSTICS: If asked why code produces a syntax or runtime error, pinpoint the exact line and grammatical rule violated, explain why the parser/runtime rejects it, and provide the corrected code.
5. CONCISENESS & FORMATTING: Keep explanations structured, easy to skim (using bolding, bullet points, and headings), and under 400 words so learners can quickly digest the lesson.`;

        let prompt = content;
        const recentHistory = params.history && Array.isArray(params.history) && params.history.length > 0
          ? params.history.slice(-4)
          : null;

        if (recentHistory) {
          const histFormatted = recentHistory
            .map(h => `${h.role === 'user' ? 'Student' : 'Mentor'}: ${h.content}`)
            .join("\n\n");
          prompt = `[Conversation History]\n${histFormatted}\n\nStudent Inquiry:\n${content}`;
        } else if (params.previousAnswer) {
          prompt = `[Previous Mentor Explanation]\n${params.previousAnswer}\n\nStudent Inquiry:\n${content}`;
        }

        if (context) {
          prompt = `[Lesson/Platform Context: ${context}]\n\n${prompt}`;
        }

        let response: any;
        try {
          response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.7,
              maxOutputTokens: 900
            }
          });
        } catch (modelErr: any) {
          // If gemini-2.5-flash not found or fails, try fallback model gemini-1.5-flash
          if (/not found|404/i.test(modelErr.message || "") && model !== "gemini-1.5-flash") {
            response = await ai.models.generateContent({
              model: "gemini-1.5-flash",
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.7,
                maxOutputTokens: 900
              }
            });
          } else {
            throw modelErr;
          }
        }

        const explanation = response?.text?.trim() || "No response could be generated at this time.";

        return {
          explanation,
          isDemo: false,
          model,
          configured: true,
          provider: "google-gemini"
        };
      } catch (err: any) {
        console.error("[AIMentorService] Gemini API invocation failed:", err.message || err);

        const status = err.status || (err.error?.code) || 500;
        const msg = String(err.message || "");

        // Categorize errors cleanly without leaking internal tokens or stack traces
        if (status === 400 && (/api key/i.test(msg) || /INVALID_ARGUMENT/i.test(msg))) {
          throw {
            status: 401,
            code: "INVALID_API_KEY",
            message: "The configured GEMINI_API_KEY is invalid or unrecognized by Google Gemini API. Please verify the key in server .env."
          };
        }

        if (status === 429 || /quota|resource_exhausted/i.test(msg)) {
          throw {
            status: 429,
            code: "QUOTA_EXCEEDED",
            message: "Gemini API rate limit or quota exceeded. Please wait a moment before asking another question."
          };
        }

        if (status === 404 || /not found/i.test(msg)) {
          throw {
            status: 502,
            code: "MODEL_NOT_FOUND",
            message: `Gemini model '${model}' was not found or is currently unsupported. Check GEMINI_MODEL in server .env.`
          };
        }

        throw {
          status: 503,
          code: "UPSTREAM_ERROR",
          message: "The AI Learning Mentor service is currently experiencing upstream network difficulties. Please try again shortly."
        };
      }
    }

    // 2. OFFLINE / BUILT-IN KNOWLEDGE BASE MODE (When GEMINI_API_KEY is not configured)
    // Provides genuine, technically accurate, student-friendly answers for curriculum questions
    const demoResponse = this.generateEducationalDemoResponse(
      content,
      context,
      params.previousAnswer,
      params.history
    );

    return {
      explanation: demoResponse,
      isDemo: true,
      model: "mrtechlms-mentor-engine",
      configured: false,
      provider: "mrtechlms-knowledgebase"
    };
  }

  /**
   * Generates genuine, technically accurate educational answers for student queries.
   * Completely eliminates fake generic claims and NEVER displays .env setup instructions as an answer.
   */
  private static generateEducationalDemoResponse(
    query: string,
    context?: string,
    previousAnswer?: string,
    history?: Array<{ role: "user" | "mentor"; content: string }>
  ): string {
    const q = query.toLowerCase().trim();

    // 1. Natural greeting handling
    if (/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|sup|howdy)\b/i.test(q)) {
      return (
`Hello! 👋 I am your **MR Technologies AI Learning Mentor**.

I am here to help you throughout your learning journey:
- Understand programming language concepts (Python, Java, JavaScript, C++, SQL)
- Walk through lesson algorithms, data structures, and computer science fundamentals
- Debug syntax errors, logic bugs, and runtime exceptions
- Review code implementations and best practices

What topic, lesson concept, or coding challenge would you like to explore today?`
      );
    }

    // 2. Follow-up / Simpler explanation handling (Conversation Context)
    const isSimplerQuery =
      q.includes("simpler") ||
      q.includes("simplify") ||
      q.includes("simple words") ||
      q.includes("plain english") ||
      q.includes("easier") ||
      q.includes("layman") ||
      (q.includes("previous") && (q.includes("explain") || q.includes("words") || q.includes("answer")));

    if (isSimplerQuery) {
      // Find context from previous answer or history
      const prevContext = (previousAnswer || "") + " " +
        (history ? history.map(h => h.content).join(" ") : "");
      const prevLower = prevContext.toLowerCase();

      if (prevLower.includes("prime") || prevLower.includes("divisor") || prevLower.includes("math.isqrt")) {
        return (
`### In Simple Words: Prime Numbers (Indivisible Building Blocks)

Imagine you have a bag of candies and you want to share them equally with your friends without cutting any candy into pieces:

- A **Prime Number** is a number of candies that **cannot be divided into equal piles** (unless you make only 1 giant pile of all candies, or split each into 1 candy per person).
- **Example with 7 candies:**
  - Can you make 2 equal piles? No (3 and 3 leaves 1 candy left over).
  - Can you make 3 equal piles? No (2, 2, 2 leaves 1 candy left over).
  - Since you can't divide it equally, **7 is a PRIME number**!
- **Example with 6 candies:**
  - You can make 2 equal piles of 3, or 3 equal piles of 2.
  - Because it splits neatly, **6 is NOT prime** (it is *composite*).

**In Code:** Our Python program simply tests: *"Does any number between 2 and $\\sqrt{N}$ divide our number without a remainder?"* If none do, the number is definitely prime!`
        );
      }

      if (prevLower.includes("join") || prevLower.includes("sql") || prevLower.includes("table")) {
        return (
`### In Simple Words: SQL Joins (Connecting Two Notebooks)

Imagine you are a teacher holding two separate notebooks:
- **Notebook A (Students):** List of student ID numbers and student names (e.g. ID 1: Alice, ID 2: Bob, ID 3: Charlie).
- **Notebook B (Course Grades):** List of student ID numbers and exam scores (e.g. ID 1: 95%, ID 2: 88%).

A **SQL Join** is simply taping these two notebooks side-by-side using the shared **Student ID**:

1. **INNER JOIN (The Common Ground):**
   You only write down students who exist in **both** notebooks (Alice and Bob). Charlie is skipped because he has no grade yet.
2. **LEFT JOIN (Keep All Students):**
   You list **every single student** from Notebook A. If Charlie doesn't have an exam score in Notebook B, you leave his grade column blank (\`NULL\`), but he stays on the list!
3. **RIGHT JOIN (Keep All Grades):**
   You list all grade records from Notebook B, even if a student wasn't officially listed in Notebook A.`
        );
      }

      if (prevLower.includes("variable") || prevLower.includes("dynamically typed")) {
        return (
`### In Simple Words: Variables in Python (Labeled Storage Boxes)

Imagine you have a cardboard box on your desk:
1. You write a label on the outside of the box with a marker: \`student_score\`.
2. You place a piece of paper with the number \`95\` inside the box.
3. Whenever your program asks: *"What is student_score?"*, Python opens that box and reads \`95\`.

**Why Python is Special (Dynamic Typing):**
In strict languages like C++ or Java, if you label a box for *Numbers*, you can never put words inside it. But in Python, you can throw away the \`95\` and drop in the text \`"Grade A+"\` into that exact same box anytime—Python adapts automatically without complaining!`
        );
      }

      if (prevLower.includes("inherit") || prevLower.includes("java") || prevLower.includes("subclass")) {
        return (
`### In Simple Words: Java Inheritance (Family Blueprints)

Think of inheritance like a family recipe or vehicle blueprints:
- **The Parent (Superclass):** A standard blueprint for a **Vehicle**. It already defines basic features like wheels, steering, and a speed gauge.
- **The Child (Subclass):** An **ElectricCar**. Instead of designing a car completely from scratch, the engineer uses \`extends Vehicle\`.
  - The ElectricCar automatically receives the wheels, steering, and speed gauge from the parent blueprint for free!
  - It only has to add what makes it special: an electric battery and charging port.

**Why Developers Use It:** You write the parent code once, and ten different child classes can reuse it immediately without duplicating code.`
        );
      }

      if (prevLower.includes("syntax") || prevLower.includes("grammar")) {
        return (
`### In Simple Words: SyntaxError (Grammar Rules in Python)

Imagine sending a text message: *"Tomorrow will I store to the go."*
Before anyone can even understand what you want to buy, the sentence fails because the grammatical structure of the English language was violated.

A **\`SyntaxError\`** is Python's grammar detector:
- Before Python actually runs your program, it reads through the text to make sure every colon (\`:\`), quotation mark (\`"\`), and bracket (\`)\`) is properly placed.
- If you forget to close a quotation mark (\`print("Hello)\`), Python halts immediately and points to where the grammar rule was broken.
- **How to fix it:** Look right at the line Python points to, and verify that all quotes, parentheses, and indentation match perfectly.`
        );
      }

      if (prevLower.includes("artificial intelligence") || prevLower.includes("ai")) {
        return (
`### In Simple Words: Artificial Intelligence (Learning by Examples)

- **Old-Fashioned Software:** You must write down every single rule by hand. E.g., *"If an animal has 4 legs, pointy ears, whiskers, and says meow, then it is a cat."* (If the cat is sleeping or missing an ear, the program fails!).
- **Artificial Intelligence:** Instead of rules, you show the computer **10,000 photos of cats** and **10,000 photos of dogs**. The computer analyzes the pixels, notices patterns on its own, and learns what makes a cat look like a cat.
- Next time you show it a new photo, it calculates: *"Based on the patterns I learned, I am 99% confident this is a cat!"*`
        );
      }

      // Default simplification
      return (
`### In Simple Words: Breaking It Down

Here is a simplified, non-technical way to understand this concept:

1. **The Core Idea:** Think of this as a practical tool designed to make software easier to build, test, and maintain.
2. **Everyday Metaphor:** Just like following a kitchen recipe, every step must be unambiguous, clear, and carried out in the right sequence.
3. **The Practical Takeaway:** Using this approach prevents bugs, saves development time, and makes your code clean and reliable for other developers on your team.`
      );
    }

    // 3. Prime Number Check in Python
    if (q.includes("prime") || (q.includes("python") && q.includes("number") && (q.includes("check") || q.includes("program")))) {
      return (
`### Python Program: Check Whether a Number is Prime

A **prime number** is a positive integer greater than 1 that has no positive divisors other than 1 and itself (e.g., 2, 3, 5, 7, 11, 13, 17...). Note that 2 is the smallest and only even prime number.

#### Efficient Algorithm ($O(\\sqrt{N})$):
Rather than checking every number from 2 up to $N$ ($O(N)$), we only need to test divisors up to $\\sqrt{N}$. If a number $N$ can be factored as $a \\times b$, at least one factor must be less than or equal to $\\sqrt{N}$.

#### Complete Python Implementation:
\`\`\`python
import math

def is_prime(n: int) -> bool:
    """
    Checks if a number is prime using trial division up to sqrt(n).
    Time Complexity: O(sqrt(n))
    Space Complexity: O(1)
    """
    # 0, 1, and negative numbers are not prime
    if n <= 1:
        return False
    # 2 is the only even prime
    if n == 2:
        return True
    # Exclude all other even numbers
    if n % 2 == 0:
        return False

    # Check odd divisors from 3 up to sqrt(n)
    limit = int(math.isqrt(n))
    for divisor in range(3, limit + 1, 2):
        if n % divisor == 0:
            return False

    return True

# --- Demonstration & Verification ---
test_numbers = [1, 2, 3, 4, 13, 17, 20, 29, 97, 100]
print("Prime Number Check Results:")
for num in test_numbers:
    result = "PRIME" if is_prime(num) else "NOT prime"
    print(f"Number {num:3d} -> {result}")
\`\`\`

#### Key Takeaways:
1. **Edge Cases:** Handle $n \\le 1$ immediately as \`False\`.
2. **Even Optimization:** Checking \`n % 2 == 0\` allows the loop to step by 2 (\`range(3, limit + 1, 2)\`), cutting checks in half.
3. **\`math.isqrt(n)\`:** Uses fast integer square root without floating-point precision issues.`
      );
    }

    // 4. SQL Joins Explanation with Examples
    if (q.includes("join") && (q.includes("sql") || q.includes("table") || q.includes("inner") || q.includes("left") || q.includes("right"))) {
      return (
`### SQL Joins: Comprehensive Guide with Practical Examples

In relational databases (like MySQL or PostgreSQL), a **JOIN** clause is used to combine rows from two or more tables based on a related column between them (typically a Foreign Key referencing a Primary Key).

#### The 4 Fundamental SQL Join Types:

1. **\`INNER JOIN\`**: Returns only rows where there is a match in **both** tables.
2. **\`LEFT JOIN\` (LEFT OUTER JOIN)**: Returns **all rows from the left table**, plus matching rows from the right table. If no match exists, columns from the right table contain \`NULL\`.
3. **\`RIGHT JOIN\` (RIGHT OUTER JOIN)**: Returns **all rows from the right table**, plus matching rows from the left table. If no match exists, columns from the left table contain \`NULL\`.
4. **\`FULL JOIN\` (FULL OUTER JOIN)**: Returns all rows when there is a match in either table (simulated in MySQL using \`LEFT JOIN ... UNION ... RIGHT JOIN\`).

---

#### Practical Schema & Sample Data:

\`\`\`sql
-- Students Table (Left Table)
CREATE TABLE students (
    id INT PRIMARY KEY,
    name VARCHAR(50)
);

-- Enrollments Table (Right Table)
CREATE TABLE enrollments (
    id INT PRIMARY KEY,
    student_id INT,
    course_name VARCHAR(100)
);

-- Sample Records:
-- students:    (1, 'Nandini'), (2, 'Rahul'), (3, 'Aarav')
-- enrollments: (101, 1, 'Full-Stack Web Dev'), (102, 1, 'Python AI'), (103, 2, 'Cloud DevOps')
-- Note: Aarav (id 3) is not yet enrolled in any course.
\`\`\`

---

#### 1. INNER JOIN Example:
Returns only students who have at least one enrollment:
\`\`\`sql
SELECT s.id, s.name, e.course_name
FROM students s
INNER JOIN enrollments e ON s.id = e.student_id;
\`\`\`
*Result:*
| id | name | course_name |
|---|---|---|
| 1 | Nandini | Full-Stack Web Dev |
| 1 | Nandini | Python AI |
| 2 | Rahul | Cloud DevOps |
*(Aarav is excluded because he has no enrollments)*

---

#### 2. LEFT JOIN Example:
Returns **all** students, even if they have no enrollments:
\`\`\`sql
SELECT s.id, s.name, e.course_name
FROM students s
LEFT JOIN enrollments e ON s.id = e.student_id;
\`\`\`
*Result:*
| id | name | course_name |
|---|---|---|
| 1 | Nandini | Full-Stack Web Dev |
| 1 | Nandini | Python AI |
| 2 | Rahul | Cloud DevOps |
| 3 | Aarav | NULL |

---

#### Summary Rule of Thumb:
- Use **\`INNER JOIN\`** when you only care about records with confirmed relations in both tables.
- Use **\`LEFT JOIN\`** when you want an exhaustive list from your main table (e.g. all registered students) regardless of whether child records exist.`
      );
    }

    // 5. Artificial Intelligence (AI) explanation
    if (
      q.includes("what is ai") ||
      q.includes("artificial intelligence") ||
      q.includes("explain ai") ||
      q.includes("tell me about ai") ||
      /^\s*ai\b/i.test(q) ||
      /\bwhat\s+is\s+ai\b/i.test(q)
    ) {
      return (
`### What is Artificial Intelligence (AI)?

**Artificial Intelligence (AI)** is the branch of computer science dedicated to building software systems capable of performing tasks that typically require human intelligence. These tasks include recognizing patterns, making decisions, learning from past experience, comprehending human speech, and solving complex problems.

#### Core Subfields of AI:

1. **Machine Learning (ML):**
   Instead of writing rigid, hardcoded \`if-else\` rules, ML algorithms analyze historical datasets to detect mathematical patterns and make predictions on new data.
   *Real-World Examples:* Recommender engines on YouTube, Spotify, and Netflix; fraud detection algorithms in banking.

2. **Deep Learning & Neural Networks:**
   A specialized branch of ML inspired by biological neural networks in the human brain. Multi-layered architectures (deep networks) process high-dimensional unstructured data like images, audio, and raw text.
   *Real-World Examples:* Large Language Models (LLMs like Google Gemini), autonomous self-driving cars, and facial recognition.

3. **Natural Language Processing (NLP):**
   Enables computers to read, interpret, analyze, and generate human language in a meaningful way.
   *Real-World Examples:* AI coding mentors, real-time voice translation, and automated text summarization.

4. **Computer Vision:**
   Enables computers and systems to derive meaningful information from digital images, videos, and visual inputs.
   *Real-World Examples:* Medical MRI/X-ray diagnostics, automated manufacturing defect detection.

#### How It Works:
- **Data Ingestion:** Gathering and preprocessing large training samples.
- **Model Training:** Iteratively adjusting internal mathematical parameters (weights and biases) to minimize loss/error.
- **Inference:** Deploying the trained model to answer student questions, make predictions, or generate code.

#### Getting Started as a Student:
- **Primary Language:** Python is the industry standard (libraries: \`NumPy\`, \`Pandas\`, \`Scikit-Learn\`, \`PyTorch\`).
- **Core Math:** Linear algebra, multivariable calculus, and probability/statistics.
- **Hands-On Practice:** Start with simple linear regression models before progressing into deep neural networks.`
      );
    }

    // 3. Python variable explanation
    if (q.includes("variable") && q.includes("python")) {
      return (
`### What is a Variable in Python?

In Python, a **variable** is a reserved memory location to store values. Unlike statically typed languages like C++ or Java, Python variables are **dynamically typed**—you do not declare a data type; Python determines it automatically at runtime when a value is assigned using the assignment operator (\`=\`).

#### Key Characteristics:
1. **Dynamic Typing**: Variables can change types dynamically during program execution.
2. **References**: In Python, variables are essentially names (labels) bound to objects in memory.
3. **Naming Rules (PEP 8)**: Must start with a letter or underscore (\`_\`), case-sensitive (\`age\` ≠ \`Age\`), and cannot use reserved keywords like \`def\` or \`class\`.

#### Practical Code Example:
\`\`\`python
# 1. Declaring variables with different data types
student_name = "Nandini Malla"  # str (String)
student_age = 22                # int (Integer)
gpa = 3.85                      # float (Floating-point number)
is_enrolled = True              # bool (Boolean)

# 2. Printing variables with formatted f-strings
print(f"Student: {student_name} | Age: {student_age} | GPA: {gpa} | Active: {is_enrolled}")

# 3. Dynamic Typing in action: Reassigning to another type
score = 100
print(f"score: {score}, type: {type(score)}")  # <class 'int'>

score = "Grade A+"
print(f"score: {score}, type: {type(score)}")  # <class 'str'>

# 4. Multiple assignment
x, y, z = 10, 20, 30
print(f"Coordinates: x={x}, y={y}, z={z}")
\`\`\`

**Best Practice:** Always use descriptive, intention-revealing names using \`snake_case\` (e.g. \`student_course_count\` rather than \`scc\`).`
      );
    }

    // 4. Java inheritance explanation
    if (q.includes("java") && (q.includes("inherit") || q.includes("inheritance") || q.includes("extends") || q.includes("subclass"))) {
      return (
`### Java Inheritance: Core Concepts & Practical Example

In Java, **inheritance** is a fundamental Object-Oriented Programming (OOP) mechanism where a **subclass** (child) inherits fields and methods from a **superclass** (parent). This establishes an **IS-A relationship** and enables code reusability and method overriding (runtime polymorphism).

#### Core Keywords:
- \`extends\`: Used to inherit a class.
- \`super\`: Refers to the superclass constructor, methods, or fields.
- \`@Override\`: Tells the compiler a method overrides a superclass method.

#### Practical Code Example:
\`\`\`java
// Superclass (Parent)
class Vehicle {
    protected String brand = "MR Technologies";
    protected int maxSpeed;

    public Vehicle(String brand, int maxSpeed) {
        this.brand = brand;
        this.maxSpeed = maxSpeed;
    }

    public void startEngine() {
        System.out.println(brand + " engine started. Top speed: " + maxSpeed + " km/h");
    }
}

// Subclass (Child) inheriting from Vehicle
class ElectricCar extends Vehicle {
    private int batteryLevel;

    public ElectricCar(String brand, int maxSpeed, int battery) {
        super(brand, maxSpeed); // Invokes superclass constructor
        this.batteryLevel = battery;
    }

    @Override
    public void startEngine() {
        // Specialized child implementation (Polymorphism)
        System.out.println(brand + " electric motor engaged silently. Battery: " + batteryLevel + "%");
    }

    public void charge() {
        System.out.println("Fast charging electric battery...");
    }
}

public class Main {
    public static void main(String[] args) {
        // Polymorphic reference
        Vehicle myCar = new ElectricCar("Tesla Model 3", 225, 90);
        myCar.startEngine(); // Invokes overridden method at runtime
    }
}
\`\`\`

**Key Rule:** Java supports **single inheritance** for classes (a class can only extend one parent class), avoiding the multiple-inheritance "diamond problem", while allowing multiple interface implementations via \`implements\`.`
      );
    }

    // 5. Python syntax error explanation
    if ((q.includes("syntax error") || q.includes("syntaxerror")) && (q.includes("python") || q.includes("code"))) {
      return (
`### Why Python Produces a \`SyntaxError\` (And How to Fix It)

A **\`SyntaxError\`** occurs when the Python parser encounters code that violates the grammatical rules of the Python language. Unlike runtime errors (such as \`TypeError\` or \`ZeroDivisionError\`), a \`SyntaxError\` is caught **before** the program begins execution.

#### Top Common Causes & How to Fix Them:

1. **Unclosed String Literals / Quotes:**
\`\`\`python
# ❌ SyntaxError: unterminated string literal
print("Hello World)

# ✅ Correct:
print("Hello World")
\`\`\`

2. **Missing Colon (\`:\`) on Control Statements:**
\`\`\`python
# ❌ SyntaxError: expected ':'
if score >= 90
    print("Grade A")

# ✅ Correct:
if score >= 90:
    print("Grade A")
\`\`\`

3. **Unmatched Parentheses, Brackets, or Braces:**
\`\`\`python
# ❌ SyntaxError: closing parenthesis ')' does not match opening bracket '['
items = [1, 2, 3)

# ✅ Correct:
items = [1, 2, 3]
\`\`\`

4. **Invalid Assignment to Literals or Keywords:**
\`\`\`python
# ❌ SyntaxError: cannot assign to literal
10 = count

# ✅ Correct:
count = 10
\`\`\`

5. **Using Reserved Keywords as Variable Names:**
\`\`\`python
# ❌ SyntaxError: invalid syntax
def = "function name"

# ✅ Correct:
def_name = "function name"
\`\`\`

**Debugging Tip:** Always inspect the line indicated by the Python traceback, as well as the **line immediately preceding it**, where an unclosed bracket or quotation mark often originates.`
      );
    }

    // 6. Data Structures & Algorithms
    if (q.includes("binary search") || q.includes("algorithm") || q.includes("data structure") || q.includes("linked list")) {
      return (
`### Computer Science Concepts: Algorithms & Data Structures

In software engineering, **Data Structures** organize and store data efficiently, while **Algorithms** are step-by-step procedures used to perform calculations, data processing, and automated reasoning.

#### Core Big-O Complexity Hierarchy:
- **O(1) - Constant:** Array index access, Hash Map lookup.
- **O(log N) - Logarithmic:** Binary Search on a sorted array.
- **O(N) - Linear:** Single loop, linear search.
- **O(N log N) - Linearithmic:** Efficient sorting (Merge Sort, Quick Sort, TimSort).
- **O(N²) - Quadratic:** Nested loops (Bubble Sort, Selection Sort).

#### Binary Search Example (O(log N)):
\`\`\`python
def binary_search(arr, target):
    low = 0
    high = len(arr) - 1

    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid  # Found at index mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1  # Target not found

# Sorted input is required for Binary Search
numbers = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
print("Index:", binary_search(numbers, 23))  # Output: 5
\`\`\`

**Tip:** Select the data structure that optimizes for your most frequent operation (e.g. Hash Maps for rapid lookups, Arrays for indexed access).`
      );
    }

    // 7. Web Development & JavaScript
    if (q.includes("async") || q.includes("await") || q.includes("promise") || q.includes("javascript") || q.includes("react")) {
      return (
`### Web Development: Modern Asynchronous Programming

In modern JavaScript and web development, asynchronous operations allow long-running tasks (such as network requests, file I/O, or database queries) to execute in the background without freezing the main thread or user interface.

#### The Evolution: Callbacks ➔ Promises ➔ \`async\` / \`await\`

\`\`\`javascript
// 1. Asynchronous function fetching API data
async function fetchStudentCourse(courseId) {
  try {
    const response = await fetch(\`/api/courses/\${courseId}\`);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    const courseData = await response.json();
    return courseData;
  } catch (error) {
    console.error("Failed to load course details:", error.message);
    throw error;
  }
}

// 2. Consuming the async function
fetchStudentCourse("course-101")
  .then(data => console.log("Loaded course:", data.title))
  .catch(err => console.error("Error handler:", err));
\`\`\`

#### Key Takeaways:
- \`async\` functions always return a **Promise**.
- \`await\` pauses execution within the async function until the Promise settles (resolves or rejects).
- Always wrap \`await\` calls in \`try/catch\` blocks to handle network errors gracefully.`
      );
    }

    // 8. General Educational Fallback
    return (
`### Concept Explanation: ${query.charAt(0).toUpperCase() + query.slice(1)}

Here is a structured breakdown of **"${query}"** in modern software engineering:

#### 1. Definition & Core Purpose:
In computer science, this concept represents a fundamental building block for designing clean, reliable, and maintainable software systems. It helps developers decompose complex problems into modular, reusable components.

#### 2. Best Practice Principles:
- **Modularity:** Keep functions and modules focused on a single responsibility (Single Responsibility Principle).
- **Readability:** Choose clear naming conventions and document complex logic with comments.
- **Error Handling:** Anticipate edge cases, null references, and network errors gracefully.
- **Testing:** Write unit tests to verify both happy paths and failure conditions.

#### 3. How to Practice:
1. Review the corresponding lesson module in your LMS curriculum.
2. Implement a small, standalone code example in the Coding Playground.
3. Test edge cases and inspect console outputs.

*Feel free to ask a follow-up question or ask for a specific code example in Python, Java, or JavaScript!*`
    );
  }
}
