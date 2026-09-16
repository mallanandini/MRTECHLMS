// server/codingSeedData.ts
import { CodingChapter, CodingTopic } from '../src/types';

export const CODING_CHAPTERS: CodingChapter[] = [
  {
    id: "chapter-dsa",
    title: "Data Structures & Algorithms",
    slug: "data-structures-and-algorithms",
    description: "Master essential DSA patterns from Arrays, Two Pointers, and Binary Search to Trees, BFS/DFS, and Dynamic Programming.",
    icon: "Binary",
    orderIndex: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: "chapter-web",
    title: "Full Stack Web Development",
    slug: "web-development",
    description: "Interactive HTML5, modern CSS3 layout and flexbox, vanilla DOM manipulation, event handling, and interactive micro-apps.",
    icon: "Globe",
    orderIndex: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: "chapter-python",
    title: "Python Mastery & Scripting",
    slug: "python-mastery",
    description: "Deep-dive into Python fundamentals, data structures, list comprehensions, object-oriented concepts, and standard libraries.",
    icon: "Code2",
    orderIndex: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: "chapter-java",
    title: "Core Java & Object-Oriented Design",
    slug: "core-java",
    description: "Solidify Java fundamentals, memory model, OOP design patterns, Collections Framework, and algorithmic problem solving.",
    icon: "Coffee",
    orderIndex: 4,
    createdAt: new Date().toISOString()
  },
  {
    id: "chapter-sql",
    title: "Database Design & SQL Mastery",
    slug: "sql-mastery",
    description: "Relational database querying, aggregation, filtering, complex multi-table joins, subqueries, and window analytical functions.",
    icon: "Database",
    orderIndex: 5,
    createdAt: new Date().toISOString()
  }
];

export const CODING_TOPICS: CodingTopic[] = [
  // DSA TOPICS (21 Topics)
  {
    id: "topic-dsa-time-complexity",
    chapterId: "chapter-dsa",
    title: "Time Complexity",
    slug: "time-complexity",
    description: "Big-O notation, asymptotic analysis, worst-case, best-case, and amortized running time.",
    orderIndex: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-space-complexity",
    chapterId: "chapter-dsa",
    title: "Space Complexity",
    slug: "space-complexity",
    description: "Memory footprints, auxiliary stack frames, in-place vs out-of-place algorithmic trade-offs.",
    orderIndex: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-arrays",
    chapterId: "chapter-dsa",
    title: "Arrays",
    slug: "arrays",
    description: "Contiguous memory structures, prefixes, sliding boundaries, and in-place transformations.",
    orderIndex: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-strings",
    chapterId: "chapter-dsa",
    title: "Strings",
    slug: "strings",
    description: "Character manipulation, palindromes, anagrams, parsing, and string matching.",
    orderIndex: 4,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-linear-search",
    chapterId: "chapter-dsa",
    title: "Linear Search",
    slug: "linear-search",
    description: "Sequential traversal, sentinel search, and minimum/maximum tracking in unsorted collections.",
    orderIndex: 5,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-binary-search",
    chapterId: "chapter-dsa",
    title: "Binary Search",
    slug: "binary-search",
    description: "Logarithmic interval bisection, search-space reduction, rotated arrays, and lower/upper bounds.",
    orderIndex: 6,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-sorting",
    chapterId: "chapter-dsa",
    title: "Sorting",
    slug: "sorting",
    description: "Comparison and non-comparison sorting: Quick Sort, Merge Sort, Insertion Sort, and Interval sorting.",
    orderIndex: 7,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-linked-lists",
    chapterId: "chapter-dsa",
    title: "Linked Lists",
    slug: "linked-lists",
    description: "Singly and doubly linked nodes, pointer manipulation, fast-and-slow pointers, and cycle detection.",
    orderIndex: 8,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-stack",
    chapterId: "chapter-dsa",
    title: "Stack",
    slug: "stack",
    description: "Push, pop, monotonic stack techniques, parenthesis validation, and expression evaluation.",
    orderIndex: 9,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-lifo",
    chapterId: "chapter-dsa",
    title: "LIFO Problems",
    slug: "lifo-problems",
    description: "Last-in First-out practical problems: backtracking undo buffers, path simplification, and recursion simulation.",
    orderIndex: 10,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-queue",
    chapterId: "chapter-dsa",
    title: "Queue",
    slug: "queue",
    description: "First-in First-out buffers, circular queues, double-ended queues (deque), and stream processing.",
    orderIndex: 11,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-recursion",
    chapterId: "chapter-dsa",
    title: "Recursion",
    slug: "recursion",
    description: "Base cases, recursive call stacks, divide and conquer, and recursive problem formulation.",
    orderIndex: 12,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-trees",
    chapterId: "chapter-dsa",
    title: "Trees",
    slug: "trees",
    description: "Binary trees, binary search trees (BST), balanced trees, and tree traversals (inorder, preorder, postorder).",
    orderIndex: 13,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-bfs",
    chapterId: "chapter-dsa",
    title: "BFS (Breadth-First Search)",
    slug: "bfs",
    description: "Level-order tree traversal, shortest path in unweighted graphs and grids using queue-driven frontier expansion.",
    orderIndex: 14,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-dfs",
    chapterId: "chapter-dsa",
    title: "DFS (Depth-First Search)",
    slug: "dfs",
    description: "Recursive and stack-based exploration of trees, connected components, graph cycles, and flood fills.",
    orderIndex: 15,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-hashing",
    chapterId: "chapter-dsa",
    title: "Hashing",
    slug: "hashing",
    description: "Hash maps, hash sets, frequency counting, fast O(1) lookups, and collision resolution principles.",
    orderIndex: 16,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-two-pointers",
    chapterId: "chapter-dsa",
    title: "Two Pointers",
    slug: "two-pointers",
    description: "Left-right converging pointers, fast-slow chasing pointers, and paired array inspections.",
    orderIndex: 17,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-sliding-window",
    chapterId: "chapter-dsa",
    title: "Sliding Window",
    slug: "sliding-window",
    description: "Fixed and dynamic size sliding subarrays and substrings for optimization and constraint matching.",
    orderIndex: 18,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-greedy",
    chapterId: "chapter-dsa",
    title: "Greedy Algorithms",
    slug: "greedy",
    description: "Locally optimal choices leading to global solutions: interval scheduling, gas stations, jump games.",
    orderIndex: 19,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-dp",
    chapterId: "chapter-dsa",
    title: "Dynamic Programming",
    slug: "dynamic-programming",
    description: "Overlapping subproblems, optimal substructure, memoization, and bottom-up tabulation.",
    orderIndex: 20,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-dsa-backtracking",
    chapterId: "chapter-dsa",
    title: "Backtracking",
    slug: "backtracking",
    description: "Combinatorial exploration, pruning unpromising branches, permutations, combinations, and N-Queens.",
    orderIndex: 21,
    createdAt: new Date().toISOString()
  },

  // WEB DEVELOPMENT TOPICS (10 Topics)
  {
    id: "topic-web-html-basics",
    chapterId: "chapter-web",
    title: "HTML Basics",
    slug: "html-basics",
    description: "Semantic elements, text formatting, hyperlinks, document structuring, and accessible markup.",
    orderIndex: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-web-css-basics",
    chapterId: "chapter-web",
    title: "CSS Basics",
    slug: "css-basics",
    description: "Selectors, cascading rules, specificity, box model, margins, padding, and typography.",
    orderIndex: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-web-css-layout",
    chapterId: "chapter-web",
    title: "CSS Layout",
    slug: "css-layout",
    description: "Modern CSS Flexbox, Grid layouts, positioning, alignment, and modern component structure.",
    orderIndex: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-web-responsive",
    chapterId: "chapter-web",
    title: "Responsive Design",
    slug: "responsive-design",
    description: "Media queries, mobile-first design, fluid units (rem, vw, vh), and adaptive viewports.",
    orderIndex: 4,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-web-js-basics",
    chapterId: "chapter-web",
    title: "JavaScript Basics",
    slug: "javascript-basics",
    description: "Variables (let, const), primitives, functions, arrow functions, arrays, and template literals.",
    orderIndex: 5,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-web-dom",
    chapterId: "chapter-web",
    title: "DOM Manipulation",
    slug: "dom-manipulation",
    description: "Selecting elements (querySelector), mutating attributes, manipulating classes, and injecting nodes.",
    orderIndex: 6,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-web-events",
    chapterId: "chapter-web",
    title: "Events",
    slug: "events",
    description: "Event listeners, click, keyup, change, event delegation, bubbling, and event objects.",
    orderIndex: 7,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-web-forms",
    chapterId: "chapter-web",
    title: "Forms",
    slug: "forms",
    description: "Input fields, checkboxes, radio groups, preventDefault, and client-side form validation.",
    orderIndex: 8,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-web-fetch",
    chapterId: "chapter-web",
    title: "Fetch / API",
    slug: "fetch-api",
    description: "Asynchronous JavaScript, Promises, async/await, fetching JSON data, and loading indicators.",
    orderIndex: 9,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-web-projects",
    chapterId: "chapter-web",
    title: "Mini Projects",
    slug: "mini-projects",
    description: "End-to-end frontend interactive mini-applications combining HTML, modern CSS, and dynamic JS.",
    orderIndex: 10,
    createdAt: new Date().toISOString()
  },

  // PYTHON TOPICS
  {
    id: "topic-py-basics",
    chapterId: "chapter-python",
    title: "Python Basics & Syntax",
    slug: "python-basics",
    description: "Variables, dynamic typing, operators, string formatting, and standard I/O in Python.",
    orderIndex: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-py-control",
    chapterId: "chapter-python",
    title: "Control Flow & Collections",
    slug: "python-control-flow",
    description: "If-else statements, for/while loops, lists, dictionaries, sets, and list comprehensions.",
    orderIndex: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-py-functions",
    chapterId: "chapter-python",
    title: "Functions & Modules",
    slug: "python-functions",
    description: "Function definitions, *args, **kwargs, lambda functions, map/filter, and importing standard modules.",
    orderIndex: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-py-oop",
    chapterId: "chapter-python",
    title: "Object-Oriented Python",
    slug: "python-oop",
    description: "Classes, dunder methods (__init__, __str__), inheritance, encapsulation, and classmethods.",
    orderIndex: 4,
    createdAt: new Date().toISOString()
  },

  // JAVA TOPICS
  {
    id: "topic-java-basics",
    chapterId: "chapter-java",
    title: "Java Fundamentals",
    slug: "java-fundamentals",
    description: "Static typing, primitive data types, scanner input, control structures, and loops.",
    orderIndex: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-java-oop",
    chapterId: "chapter-java",
    title: "Classes & OOP Principles",
    slug: "java-oop",
    description: "Encapsulation, inheritance, polymorphism, interfaces, and abstract classes.",
    orderIndex: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-java-collections",
    chapterId: "chapter-java",
    title: "Java Collections Framework",
    slug: "java-collections",
    description: "ArrayList, LinkedList, HashMap, HashSet, PriorityQueue, and Iterators.",
    orderIndex: 3,
    createdAt: new Date().toISOString()
  },

  // SQL TOPICS
  {
    id: "topic-sql-basics",
    chapterId: "chapter-sql",
    title: "SQL Basics & Filtering",
    slug: "sql-basics",
    description: "SELECT, WHERE, ORDER BY, LIMIT, DISTINCT, and boolean logical operators.",
    orderIndex: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-sql-aggregates",
    chapterId: "chapter-sql",
    title: "Aggregation & Grouping",
    slug: "sql-aggregation",
    description: "COUNT, SUM, AVG, MIN, MAX, GROUP BY, and HAVING clauses.",
    orderIndex: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: "topic-sql-joins",
    chapterId: "chapter-sql",
    title: "Multi-Table Joins",
    slug: "sql-joins",
    description: "INNER JOIN, LEFT OUTER JOIN, RIGHT JOIN, FULL JOIN, and table aliasing.",
    orderIndex: 3,
    createdAt: new Date().toISOString()
  }
];

export const CODING_CHALLENGES_EXPANSION: any[] = [
  // ==========================================
  // BINARY SEARCH PROBLEMS (6 Problems Required)
  // ==========================================
  {
    id: "challenge-bs-1-basic",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-binary-search",
    orderIndex: 1,
    title: "Binary Search",
    slug: "binary-search-basic",
    description: "Given an array of integers `nums` sorted in ascending order, and an integer `target`, write a function to search for `target` in `nums`.\n\nIf target exists, return its 0-based index. Otherwise, return -1.\nYou must write an algorithm with `O(log n)` runtime complexity.",
    difficulty: "easy",
    category: "Binary Search",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if len(lines) >= 2:\n        nums = [int(x) for x in lines[0].split()]\n        target = int(lines[1])\n        print(search(nums, target))\n`,
      javascript: `const fs = require('fs');\n\nfunction search(nums, target) {\n    let left = 0, right = nums.length - 1;\n    while (left <= right) {\n        const mid = Math.floor((left + right) / 2);\n        if (nums[mid] === target) return mid;\n        if (nums[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n    const nums = lines[0].trim().split(/\\s+/).map(Number);\n    const target = Number(lines[1].trim());\n    console.log(search(nums, target));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static int search(int[] nums, int target) {\n        int left = 0, right = nums.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        if (!sc.hasNextInt()) return;\n        int target = sc.nextInt();\n        System.out.println(search(nums, target));\n    }\n}\n`
    }),
    inputFormat: "Line 1: space-separated sorted integers\nLine 2: integer target",
    outputFormat: "Single integer representing the index or -1",
    constraints: "1 <= nums.length <= 10^5\nAll integers are distinct\nnums is sorted in ascending order",
    examples: JSON.stringify([
      { input: "-1 0 3 5 9 12\n9", output: "4", explanation: "9 exists in nums and its index is 4" },
      { input: "-1 0 3 5 9 12\n2", output: "-1", explanation: "2 does not exist in nums so return -1" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "-1 0 3 5 9 12\n9", expectedOutput: "4", isPublic: true },
      { id: "tc-2", input: "-1 0 3 5 9 12\n2", expectedOutput: "-1", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "5\n5", expectedOutput: "0", isPublic: false },
      { id: "tc-4", input: "2 4 6 8 10 12 14 16 18 20\n16", expectedOutput: "7", isPublic: false }
    ]),
    hints: JSON.stringify(["Use two pointers left and right, and compare nums[mid] with target."]),
    solutionExplanation: "Standard binary search dividing search interval in half each iteration achieving O(log n) time.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-bs-2-insert-position",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-binary-search",
    orderIndex: 2,
    title: "Search Insert Position",
    slug: "search-insert-position",
    description: "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.\n\nYou must write an algorithm with `O(log n)` runtime complexity.",
    difficulty: "easy",
    category: "Binary Search",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef search_insert(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return left\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if len(lines) >= 2:\n        nums = [int(x) for x in lines[0].split()]\n        target = int(lines[1])\n        print(search_insert(nums, target))\n`,
      javascript: `const fs = require('fs');\n\nfunction searchInsert(nums, target) {\n    let left = 0, right = nums.length - 1;\n    while (left <= right) {\n        const mid = Math.floor((left + right) / 2);\n        if (nums[mid] === target) return mid;\n        if (nums[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return left;\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n    const nums = lines[0].trim().split(/\\s+/).map(Number);\n    const target = Number(lines[1].trim());\n    console.log(searchInsert(nums, target));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static int searchInsert(int[] nums, int target) {\n        int left = 0, right = nums.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return left;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        if (!sc.hasNextInt()) return;\n        int target = sc.nextInt();\n        System.out.println(searchInsert(nums, target));\n    }\n}\n`
    }),
    inputFormat: "Line 1: space-separated sorted integers\nLine 2: target integer",
    outputFormat: "Integer representing insertion index",
    constraints: "1 <= nums.length <= 10^4\nnums contains distinct values sorted in ascending order",
    examples: JSON.stringify([
      { input: "1 3 5 6\n5", output: "2" },
      { input: "1 3 5 6\n2", output: "1" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "1 3 5 6\n5", expectedOutput: "2", isPublic: true },
      { id: "tc-2", input: "1 3 5 6\n2", expectedOutput: "1", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "1 3 5 6\n7", expectedOutput: "4", isPublic: false }
    ]),
    hints: JSON.stringify(["When binary search terminates without finding the target, 'left' points to the insertion point."]),
    solutionExplanation: "Binary search stops when left > right, where left holds the exact lower bound index.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-bs-3-first-last-position",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-binary-search",
    orderIndex: 3,
    title: "Find First and Last Position of Element",
    slug: "find-first-and-last-position",
    description: "Given an array of integers `nums` sorted in non-decreasing order, find the starting and ending position of a given `target` value.\n\nIf target is not found in the array, return `-1 -1`.\nYou must write an algorithm with `O(log n)` runtime complexity.",
    difficulty: "medium",
    category: "Binary Search",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef find_range(nums, target):\n    def find_bound(is_first):\n        left, right = 0, len(nums) - 1\n        res = -1\n        while left <= right:\n            mid = (left + right) // 2\n            if nums[mid] == target:\n                res = mid\n                if is_first:\n                    right = mid - 1\n                else:\n                    left = mid + 1\n            elif nums[mid] < target:\n                left = mid + 1\n            else:\n                right = mid - 1\n        return res\n\n    return f\"{find_bound(True)} {find_bound(False)}\"\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if len(lines) >= 2:\n        nums = [int(x) for x in lines[0].split()]\n        target = int(lines[1])\n        print(find_range(nums, target))\n`,
      javascript: `const fs = require('fs');\n\nfunction findRange(nums, target) {\n    function findBound(isFirst) {\n        let left = 0, right = nums.length - 1, res = -1;\n        while (left <= right) {\n            const mid = Math.floor((left + right) / 2);\n            if (nums[mid] === target) {\n                res = mid;\n                if (isFirst) right = mid - 1;\n                else left = mid + 1;\n            } else if (nums[mid] < target) {\n                left = mid + 1;\n            } else {\n                right = mid - 1;\n            }\n        }\n        return res;\n    }\n    return \`\${findBound(true)} \${findBound(false)}\`;\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n    const nums = lines[0].trim().split(/\\s+/).map(Number);\n    const target = Number(lines[1].trim());\n    console.log(findRange(nums, target));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    private static int findBound(int[] nums, int target, boolean isFirst) {\n        int left = 0, right = nums.length - 1, res = -1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] == target) {\n                res = mid;\n                if (isFirst) right = mid - 1;\n                else left = mid + 1;\n            } else if (nums[mid] < target) {\n                left = mid + 1;\n            } else {\n                right = mid - 1;\n            }\n        }\n        return res;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        if (!sc.hasNextInt()) return;\n        int target = sc.nextInt();\n        System.out.println(findBound(nums, target, true) + \" \" + findBound(nums, target, false));\n    }\n}\n`
    }),
    inputFormat: "Line 1: space-separated sorted integers\nLine 2: target integer",
    outputFormat: "Two space-separated integers e.g. '3 4' or '-1 -1'",
    constraints: "0 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9\nnums is sorted in non-decreasing order",
    examples: JSON.stringify([
      { input: "5 7 7 8 8 10\n8", output: "3 4" },
      { input: "5 7 7 8 8 10\n6", output: "-1 -1" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "5 7 7 8 8 10\n8", expectedOutput: "3 4", isPublic: true },
      { id: "tc-2", input: "5 7 7 8 8 10\n6", expectedOutput: "-1 -1", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "8 8 8 8 8\n8", expectedOutput: "0 4", isPublic: false }
    ]),
    hints: JSON.stringify(["Run binary search twice: once biasing left to find the first occurrence, once biasing right."]),
    solutionExplanation: "Two binary search passes: first searches with right = mid - 1 on match, second with left = mid + 1 on match.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-bs-4-rotated-min",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-binary-search",
    orderIndex: 4,
    title: "Find Minimum in Rotated Sorted Array",
    slug: "find-minimum-in-rotated-sorted-array",
    description: "Suppose an array of length `n` sorted in ascending order is rotated between `1` and `n` times.\nGiven the sorted rotated array `nums` of unique elements, return the minimum element of this array.\n\nYou must write an algorithm that runs in `O(log n)` time.",
    difficulty: "medium",
    category: "Binary Search",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef find_min(nums):\n    left, right = 0, len(nums) - 1\n    while left < right:\n        mid = (left + right) // 2\n        if nums[mid] > nums[right]:\n            left = mid + 1\n        else:\n            right = mid\n    return nums[left]\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        nums = [int(x) for x in line.split()]\n        print(find_min(nums))\n`,
      javascript: `const fs = require('fs');\n\nfunction findMin(nums) {\n    let left = 0, right = nums.length - 1;\n    while (left < right) {\n        const mid = Math.floor((left + right) / 2);\n        if (nums[mid] > nums[right]) {\n            left = mid + 1;\n        } else {\n            right = mid;\n        }\n    }\n    return nums[left];\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    const nums = input.split(/\\s+/).map(Number);\n    console.log(findMin(nums));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static int findMin(int[] nums) {\n        int left = 0, right = nums.length - 1;\n        while (left < right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] > nums[right]) {\n                left = mid + 1;\n            } else {\n                right = mid;\n            }\n        }\n        return nums[left];\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        System.out.println(findMin(nums));\n    }\n}\n`
    }),
    inputFormat: "Single line of space-separated integers",
    outputFormat: "Single integer representing the minimum element",
    constraints: "1 <= nums.length <= 5000\nAll values are unique",
    examples: JSON.stringify([
      { input: "3 4 5 1 2", output: "1" },
      { input: "4 5 6 7 0 1 2", output: "0" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "3 4 5 1 2", expectedOutput: "1", isPublic: true },
      { id: "tc-2", input: "4 5 6 7 0 1 2", expectedOutput: "0", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "11 13 15 17", expectedOutput: "11", isPublic: false }
    ]),
    hints: JSON.stringify(["Compare nums[mid] to nums[right]. If nums[mid] > nums[right], the minimum is strictly in the right half."]),
    solutionExplanation: "The inflection point where the array wraps around contains the minimum element.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-bs-5-mountain-peak",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-binary-search",
    orderIndex: 5,
    title: "Peak Index in Mountain Array",
    slug: "peak-index-in-mountain-array",
    description: "An array `arr` is a mountain if `arr.length >= 3` and there exists some `i` with `0 < i < arr.length - 1` such that:\n- `arr[0] < arr[1] < ... < arr[i - 1] < arr[i]`\n- `arr[i] > arr[i + 1] > ... > arr[arr.length - 1]`\n\nGiven a mountain array `arr`, return the index `i` of the peak element in `O(log n)` time.",
    difficulty: "medium",
    category: "Binary Search",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef peak_index(arr):\n    left, right = 0, len(arr) - 1\n    while left < right:\n        mid = (left + right) // 2\n        if arr[mid] < arr[mid + 1]:\n            left = mid + 1\n        else:\n            right = mid\n    return left\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        arr = [int(x) for x in line.split()]\n        print(peak_index(arr))\n`,
      javascript: `const fs = require('fs');\n\nfunction peakIndex(arr) {\n    let left = 0, right = arr.length - 1;\n    while (left < right) {\n        const mid = Math.floor((left + right) / 2);\n        if (arr[mid] < arr[mid + 1]) {\n            left = mid + 1;\n        } else {\n            right = mid;\n        }\n    }\n    return left;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    const arr = input.split(/\\s+/).map(Number);\n    console.log(peakIndex(arr));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static int peakIndex(int[] arr) {\n        int left = 0, right = arr.length - 1;\n        while (left < right) {\n            int mid = left + (right - left) / 2;\n            if (arr[mid] < arr[mid + 1]) {\n                left = mid + 1;\n            } else {\n                right = mid;\n            }\n        }\n        return left;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] arr = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i]);\n        System.out.println(peakIndex(arr));\n    }\n}\n`
    }),
    inputFormat: "Single line of space-separated integers representing the mountain array",
    outputFormat: "Single integer representing the peak index",
    constraints: "3 <= arr.length <= 10^5\narr is guaranteed to be a mountain array",
    examples: JSON.stringify([
      { input: "0 1 0", output: "1" },
      { input: "0 2 1 0", output: "1" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "0 1 0", expectedOutput: "1", isPublic: true },
      { id: "tc-2", input: "0 2 1 0", expectedOutput: "1", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "1 3 5 4 2", expectedOutput: "2", isPublic: false }
    ]),
    hints: JSON.stringify(["Compare arr[mid] with arr[mid + 1]. If it is climbing upwards, the peak is to the right."]),
    solutionExplanation: "Binary search on slope gradient identifies the highest point in O(log n) comparisons.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-bs-6-sqrt",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-binary-search",
    orderIndex: 6,
    title: "Square Root (Integer Sqrt)",
    slug: "integer-square-root",
    description: "Given a non-negative integer `x`, return the square root of `x` rounded down to the nearest integer. The returned integer should be non-negative as well.\n\nYou must not use any built-in exponent function or operator, such as `pow(x, 0.5)` in Python or `Math.sqrt`.\nCalculate the result in `O(log x)`.",
    difficulty: "easy",
    category: "Binary Search",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef my_sqrt(x):\n    if x < 2: return x\n    left, right = 1, x // 2\n    ans = 1\n    while left <= right:\n        mid = (left + right) // 2\n        if mid * mid <= x:\n            ans = mid\n            left = mid + 1\n        else:\n            right = mid - 1\n    return ans\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        x = int(line)\n        print(my_sqrt(x))\n`,
      javascript: `const fs = require('fs');\n\nfunction mySqrt(x) {\n    if (x < 2) return x;\n    let left = 1, right = Math.floor(x / 2), ans = 1;\n    while (left <= right) {\n        const mid = Math.floor((left + right) / 2);\n        if (mid * mid <= x) {\n            ans = mid;\n            left = mid + 1;\n        } else {\n            right = mid - 1;\n        }\n    }\n    return ans;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    const x = Number(input);\n    console.log(mySqrt(x));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static int mySqrt(int x) {\n        if (x < 2) return x;\n        long left = 1, right = x / 2, ans = 1;\n        while (left <= right) {\n            long mid = left + (right - left) / 2;\n            if (mid * mid <= x) {\n                ans = mid;\n                left = mid + 1;\n            } else {\n                right = mid - 1;\n            }\n        }\n        return (int) ans;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int x = sc.nextInt();\n        System.out.println(mySqrt(x));\n    }\n}\n`
    }),
    inputFormat: "Single non-negative integer x",
    outputFormat: "Single integer representing integer square root",
    constraints: "0 <= x <= 2^31 - 1",
    examples: JSON.stringify([
      { input: "4", output: "2" },
      { input: "8", output: "2" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "4", expectedOutput: "2", isPublic: true },
      { id: "tc-2", input: "8", expectedOutput: "2", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "0", expectedOutput: "0", isPublic: false }
    ]),
    hints: JSON.stringify(["Binary search on range [1, x // 2]. Check if mid * mid <= x."]),
    solutionExplanation: "Binary search on monotonic function f(k) = k^2 <= x.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // ==========================================
  // ARRAYS PROBLEMS (8 Problems Required)
  // ==========================================
  {
    id: "challenge-arr-1-max-subarray",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-arrays",
    orderIndex: 1,
    title: "Maximum Subarray (Kadane's Algorithm)",
    slug: "maximum-subarray-kadane",
    description: "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
    difficulty: "medium",
    category: "Arrays",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef max_sub_array(nums):\n    max_sum = cur_sum = nums[0]\n    for num in nums[1:]:\n        cur_sum = max(num, cur_sum + num)\n        max_sum = max(max_sum, cur_sum)\n    return max_sum\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        nums = [int(x) for x in line.split()]\n        print(max_sub_array(nums))\n`,
      javascript: `const fs = require('fs');\n\nfunction maxSubArray(nums) {\n    let maxSum = nums[0], curSum = nums[0];\n    for (let i = 1; i < nums.length; i++) {\n        curSum = Math.max(nums[i], curSum + nums[i]);\n        maxSum = Math.max(maxSum, curSum);\n    }\n    return maxSum;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    const nums = input.split(/\\s+/).map(Number);\n    console.log(maxSubArray(nums));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static int maxSubArray(int[] nums) {\n        int maxSum = nums[0], curSum = nums[0];\n        for (int i = 1; i < nums.length; i++) {\n            curSum = Math.max(nums[i], curSum + nums[i]);\n            maxSum = Math.max(maxSum, curSum);\n        }\n        return maxSum;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        System.out.println(maxSubArray(nums));\n    }\n}\n`
    }),
    inputFormat: "Single line of space-separated integers",
    outputFormat: "Single integer representing the maximum subarray sum",
    constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
    examples: JSON.stringify([
      { input: "-2 1 -3 4 -1 2 1 -5 4", output: "6" },
      { input: "5 4 -1 7 8", output: "23" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6", isPublic: true },
      { id: "tc-2", input: "5 4 -1 7 8", expectedOutput: "23", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "-1", expectedOutput: "-1", isPublic: false }
    ]),
    hints: JSON.stringify(["Use Kadane's Algorithm: at each position decide whether to add to current running sum or start fresh."]),
    solutionExplanation: "Kadane's algorithm computes max subarray ending at each index in O(n) time and O(1) space.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-arr-2-stock-profit",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-arrays",
    orderIndex: 2,
    title: "Best Time to Buy and Sell Stock",
    slug: "best-time-to-buy-and-sell-stock",
    description: "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day.\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve. If you cannot achieve any profit, return `0`.",
    difficulty: "easy",
    category: "Arrays",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef max_profit(prices):\n    min_price = float('inf')\n    profit = 0\n    for p in prices:\n        if p < min_price:\n            min_price = p\n        elif p - min_price > profit:\n            profit = p - min_price\n    return profit\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        prices = [int(x) for x in line.split()]\n        print(max_profit(prices))\n`,
      javascript: `const fs = require('fs');\n\nfunction maxProfit(prices) {\n    let minPrice = Infinity, maxProfit = 0;\n    for (const p of prices) {\n        if (p < minPrice) minPrice = p;\n        else if (p - minPrice > maxProfit) maxProfit = p - minPrice;\n    }\n    return maxProfit;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    const prices = input.split(/\\s+/).map(Number);\n    console.log(maxProfit(prices));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static int maxProfit(int[] prices) {\n        int minPrice = Integer.MAX_VALUE, maxProfit = 0;\n        for (int p : prices) {\n            if (p < minPrice) minPrice = p;\n            else if (p - minPrice > maxProfit) maxProfit = p - minPrice;\n        }\n        return maxProfit;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] prices = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) prices[i] = Integer.parseInt(parts[i]);\n        System.out.println(maxProfit(prices));\n    }\n}\n`
    }),
    inputFormat: "Single line of space-separated daily stock prices",
    outputFormat: "Single integer maximum profit",
    constraints: "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
    examples: JSON.stringify([
      { input: "7 1 5 3 6 4", output: "5" },
      { input: "7 6 4 3 1", output: "0" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "7 1 5 3 6 4", expectedOutput: "5", isPublic: true },
      { id: "tc-2", input: "7 6 4 3 1", expectedOutput: "0", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "2 4 1", expectedOutput: "2", isPublic: false }
    ]),
    hints: JSON.stringify(["Track the minimum price observed so far as you iterate through the list."]),
    solutionExplanation: "Maintain the lowest valley encountered so far and calculate profit at each peak.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-arr-3-contains-duplicate",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-arrays",
    orderIndex: 3,
    title: "Contains Duplicate",
    slug: "contains-duplicate",
    description: "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
    difficulty: "easy",
    category: "Arrays",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef contains_duplicate(nums):\n    seen = set()\n    for x in nums:\n        if x in seen:\n            return True\n        seen.add(x)\n    return False\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        nums = [int(x) for x in line.split()]\n        print(\"true\" if contains_duplicate(nums) else \"false\")\n`,
      javascript: `const fs = require('fs');\n\nfunction containsDuplicate(nums) {\n    const seen = new Set();\n    for (const x of nums) {\n        if (seen.has(x)) return true;\n        seen.add(x);\n    }\n    return false;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    const nums = input.split(/\\s+/).map(Number);\n    console.log(containsDuplicate(nums) ? \"true\" : \"false\");\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static boolean containsDuplicate(int[] nums) {\n        Set<Integer> seen = new HashSet<>();\n        for (int x : nums) {\n            if (!seen.add(x)) return true;\n        }\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        System.out.println(containsDuplicate(nums) ? \"true\" : \"false\");\n    }\n}\n`
    }),
    inputFormat: "Single line of space-separated integers",
    outputFormat: "'true' or 'false'",
    constraints: "1 <= nums.length <= 10^5",
    examples: JSON.stringify([
      { input: "1 2 3 1", output: "true" },
      { input: "1 2 3 4", output: "false" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "1 2 3 1", expectedOutput: "true", isPublic: true },
      { id: "tc-2", input: "1 2 3 4", expectedOutput: "false", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "1 1 1 3 3 4 3 2 4 2", expectedOutput: "true", isPublic: false }
    ]),
    hints: JSON.stringify(["Use a Hash Set to track seen elements in O(1) amortized time."]),
    solutionExplanation: "HashSet gives an O(n) time and O(n) space solution.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-arr-4-move-zeroes",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-arrays",
    orderIndex: 4,
    title: "Move Zeroes",
    slug: "move-zeroes",
    description: "Given an integer array `nums`, move all `0`'s to the end of it while maintaining the relative order of the non-zero elements.\n\nNote that you must do this in-place without making a copy of the array. Print the space-separated resulting array.",
    difficulty: "easy",
    category: "Arrays",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef move_zeroes(nums):\n    insert_pos = 0\n    for x in nums:\n        if x != 0:\n            nums[insert_pos] = x\n            insert_pos += 1\n    while insert_pos < len(nums):\n        nums[insert_pos] = 0\n        insert_pos += 1\n    return nums\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        nums = [int(x) for x in line.split()]\n        print(\" \".join(map(str, move_zeroes(nums))))\n`,
      javascript: `const fs = require('fs');\n\nfunction moveZeroes(nums) {\n    let insertPos = 0;\n    for (let i = 0; i < nums.length; i++) {\n        if (nums[i] !== 0) {\n            nums[insertPos++] = nums[i];\n        }\n    }\n    while (insertPos < nums.length) {\n        nums[insertPos++] = 0;\n    }\n    return nums;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    const nums = input.split(/\\s+/).map(Number);\n    console.log(moveZeroes(nums).join(' '));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void moveZeroes(int[] nums) {\n        int insertPos = 0;\n        for (int i = 0; i < nums.length; i++) {\n            if (nums[i] != 0) nums[insertPos++] = nums[i];\n        }\n        while (insertPos < nums.length) {\n            nums[insertPos++] = 0;\n        }\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        moveZeroes(nums);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < nums.length; i++) {\n            sb.append(nums[i]);\n            if (i < nums.length - 1) sb.append(\" \");\n        }\n        System.out.println(sb.toString());\n    }\n}\n`
    }),
    inputFormat: "Single line of space-separated integers",
    outputFormat: "Single line of space-separated integers with zeroes moved to end",
    constraints: "1 <= nums.length <= 10^4",
    examples: JSON.stringify([
      { input: "0 1 0 3 12", output: "1 3 12 0 0" },
      { input: "0", output: "0" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "0 1 0 3 12", expectedOutput: "1 3 12 0 0", isPublic: true },
      { id: "tc-2", input: "0", expectedOutput: "0", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "4 2 4 0 0 3 0 5 1 0", expectedOutput: "4 2 4 3 5 1 0 0 0 0", isPublic: false }
    ]),
    hints: JSON.stringify(["Use a two-pointer approach: one reads all numbers, the other writes non-zero values."]),
    solutionExplanation: "Iterate to overwrite non-zero elements at the front, then fill remaining slots with zeroes.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-arr-5-rotate-array",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-arrays",
    orderIndex: 5,
    title: "Rotate Array",
    slug: "rotate-array-k-steps",
    description: "Given an integer array `nums`, rotate the array to the right by `k` steps, where `k` is non-negative.\nPrint the rotated space-separated array.",
    difficulty: "medium",
    category: "Arrays",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef rotate(nums, k):\n    n = len(nums)\n    k %= n\n    def reverse(l, r):\n        while l < r:\n            nums[l], nums[r] = nums[r], nums[l]\n            l += 1\n            r -= 1\n    reverse(0, n - 1)\n    reverse(0, k - 1)\n    reverse(k, n - 1)\n    return nums\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if len(lines) >= 2:\n        nums = [int(x) for x in lines[0].split()]\n        k = int(lines[1])\n        print(\" \".join(map(str, rotate(nums, k))))\n`,
      javascript: `const fs = require('fs');\n\nfunction rotate(nums, k) {\n    const n = nums.length;\n    k %= n;\n    function reverse(l, r) {\n        while (l < r) {\n            const temp = nums[l];\n            nums[l] = nums[r];\n            nums[r] = temp;\n            l++; r--;\n        }\n    }\n    reverse(0, n - 1);\n    reverse(0, k - 1);\n    reverse(k, n - 1);\n    return nums;\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n    const nums = lines[0].trim().split(/\\s+/).map(Number);\n    const k = Number(lines[1].trim());\n    console.log(rotate(nums, k).join(' '));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    private static void reverse(int[] nums, int l, int r) {\n        while (l < r) {\n            int tmp = nums[l];\n            nums[l] = nums[r];\n            nums[r] = tmp;\n            l++; r--;\n        }\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        if (!sc.hasNextInt()) return;\n        int k = sc.nextInt();\n        int n = nums.length;\n        k %= n;\n        reverse(nums, 0, n - 1);\n        reverse(nums, 0, k - 1);\n        reverse(nums, k, n - 1);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < n; i++) {\n            sb.append(nums[i]);\n            if (i < n - 1) sb.append(\" \");\n        }\n        System.out.println(sb.toString());\n    }\n}\n`
    }),
    inputFormat: "Line 1: space-separated integers\nLine 2: non-negative integer k",
    outputFormat: "Single line of rotated integers",
    constraints: "1 <= nums.length <= 10^5\n0 <= k <= 10^5",
    examples: JSON.stringify([
      { input: "1 2 3 4 5 6 7\n3", output: "5 6 7 1 2 3 4" },
      { input: "-1 -100 3 99\n2", output: "3 99 -1 -100" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "1 2 3 4 5 6 7\n3", expectedOutput: "5 6 7 1 2 3 4", isPublic: true },
      { id: "tc-2", input: "-1 -100 3 99\n2", expectedOutput: "3 99 -1 -100", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "1 2\n3", expectedOutput: "2 1", isPublic: false }
    ]),
    hints: JSON.stringify(["Reversing the whole array, then reversing first k and remaining n-k elements rotates in O(1) extra space."]),
    solutionExplanation: "Three reverse steps achieve in-place rotation in O(n) time and O(1) space.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-arr-6-majority-element",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-arrays",
    orderIndex: 6,
    title: "Majority Element (Boyer-Moore)",
    slug: "majority-element-boyer-moore",
    description: "Given an array `nums` of size `n`, return the majority element.\nThe majority element is the element that appears more than `⌊n / 2⌋` times. You may assume that the majority element always exists in the array.",
    difficulty: "easy",
    category: "Arrays",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef majority_element(nums):\n    candidate = None\n    count = 0\n    for num in nums:\n        if count == 0:\n            candidate = num\n        count += (1 if num == candidate else -1)\n    return candidate\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        nums = [int(x) for x in line.split()]\n        print(majority_element(nums))\n`,
      javascript: `const fs = require('fs');\n\nfunction majorityElement(nums) {\n    let candidate = null, count = 0;\n    for (const num of nums) {\n        if (count === 0) candidate = num;\n        count += (num === candidate ? 1 : -1);\n    }\n    return candidate;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    const nums = input.split(/\\s+/).map(Number);\n    console.log(majorityElement(nums));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static int majorityElement(int[] nums) {\n        int candidate = 0, count = 0;\n        for (int num : nums) {\n            if (count == 0) candidate = num;\n            count += (num == candidate ? 1 : -1);\n        }\n        return candidate;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        System.out.println(majorityElement(nums));\n    }\n}\n`
    }),
    inputFormat: "Single line of space-separated integers",
    outputFormat: "Single integer majority element",
    constraints: "1 <= nums.length <= 5 * 10^4",
    examples: JSON.stringify([
      { input: "3 2 3", output: "3" },
      { input: "2 2 1 1 1 2 2", output: "2" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "3 2 3", expectedOutput: "3", isPublic: true },
      { id: "tc-2", input: "2 2 1 1 1 2 2", expectedOutput: "2", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "6 5 5", expectedOutput: "5", isPublic: false }
    ]),
    hints: JSON.stringify(["Boyer-Moore Voting Algorithm finds the majority in O(n) time and O(1) space."]),
    solutionExplanation: "Since majority element occurs > n/2 times, its count will strictly dominate all other elements combined.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-arr-7-merge-sorted",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-arrays",
    orderIndex: 7,
    title: "Merge Two Sorted Arrays",
    slug: "merge-two-sorted-arrays",
    description: "Given two sorted arrays of integers `nums1` and `nums2`, merge `nums2` into a single sorted array.\nPrint all elements of the merged sorted array separated by spaces.",
    difficulty: "easy",
    category: "Arrays",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef merge(nums1, nums2):\n    i = j = 0\n    res = []\n    while i < len(nums1) and j < len(nums2):\n        if nums1[i] <= nums2[j]:\n            res.append(nums1[i])\n            i += 1\n        else:\n            res.append(nums2[j])\n            j += 1\n    res.extend(nums1[i:])\n    res.extend(nums2[j:])\n    return res\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if len(lines) >= 2:\n        nums1 = [int(x) for x in lines[0].split()]\n        nums2 = [int(x) for x in lines[1].split()]\n        print(\" \".join(map(str, merge(nums1, nums2))))\n`,
      javascript: `const fs = require('fs');\n\nfunction merge(nums1, nums2) {\n    let i = 0, j = 0;\n    const res = [];\n    while (i < nums1.length && j < nums2.length) {\n        if (nums1[i] <= nums2[j]) res.push(nums1[i++]);\n        else res.push(nums2[j++]);\n    }\n    while (i < nums1.length) res.push(nums1[i++]);\n    while (j < nums2.length) res.push(nums2[j++]);\n    return res;\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n    const nums1 = lines[0].trim().split(/\\s+/).map(Number);\n    const nums2 = lines[1].trim().split(/\\s+/).map(Number);\n    console.log(merge(nums1, nums2).join(' '));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] p1 = sc.nextLine().trim().split(\"\\\\s+\");\n        if (!sc.hasNextLine()) return;\n        String[] p2 = sc.nextLine().trim().split(\"\\\\s+\");\n        \n        int[] a = new int[p1.length];\n        for (int i = 0; i < p1.length; i++) a[i] = Integer.parseInt(p1[i]);\n        int[] b = new int[p2.length];\n        for (int i = 0; i < p2.length; i++) b[i] = Integer.parseInt(p2[i]);\n\n        int i = 0, j = 0;\n        StringBuilder sb = new StringBuilder();\n        while (i < a.length && j < b.length) {\n            if (a[i] <= b[j]) sb.append(a[i++]).append(\" \");\n            else sb.append(b[j++]).append(\" \");\n        }\n        while (i < a.length) sb.append(a[i++]).append(\" \");\n        while (j < b.length) sb.append(b[j++]).append(\" \");\n        System.out.println(sb.toString().trim());\n    }\n}\n`
    }),
    inputFormat: "Line 1: space-separated integers for nums1\nLine 2: space-separated integers for nums2",
    outputFormat: "Single line of merged space-separated integers",
    constraints: "1 <= nums1.length, nums2.length <= 10^5",
    examples: JSON.stringify([
      { input: "1 3 5\n2 4 6", output: "1 2 3 4 5 6" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "1 3 5\n2 4 6", expectedOutput: "1 2 3 4 5 6", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "5\n1", expectedOutput: "1 5", isPublic: false }
    ]),
    hints: JSON.stringify(["Use two pointers starting at the beginning of each array."]),
    solutionExplanation: "Classic O(n + m) two-pointer merge operation.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-arr-8-product-except-self",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-arrays",
    orderIndex: 8,
    title: "Product of Array Except Self",
    slug: "product-of-array-except-self",
    description: "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\nYou must write an algorithm that runs in `O(n)` time and without using the division operation.\nPrint space-separated results.",
    difficulty: "medium",
    category: "Arrays",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef product_except_self(nums):\n    n = len(nums)\n    res = [1] * n\n    prefix = 1\n    for i in range(n):\n        res[i] = prefix\n        prefix *= nums[i]\n    postfix = 1\n    for i in range(n - 1, -1, -1):\n        res[i] *= postfix\n        postfix *= nums[i]\n    return res\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        nums = [int(x) for x in line.split()]\n        print(\" \".join(map(str, product_except_self(nums))))\n`,
      javascript: `const fs = require('fs');\n\nfunction productExceptSelf(nums) {\n    const n = nums.length;\n    const res = new Array(n).fill(1);\n    let prefix = 1;\n    for (let i = 0; i < n; i++) {\n        res[i] = prefix;\n        prefix *= nums[i];\n    }\n    let postfix = 1;\n    for (let i = n - 1; i >= 0; i--) {\n        res[i] *= postfix;\n        postfix *= nums[i];\n    }\n    return res;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    const nums = input.split(/\\s+/).map(Number);\n    console.log(productExceptSelf(nums).join(' '));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int n = parts.length;\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) nums[i] = Integer.parseInt(parts[i]);\n        \n        int[] res = new int[n];\n        int prefix = 1;\n        for (int i = 0; i < n; i++) {\n            res[i] = prefix;\n            prefix *= nums[i];\n        }\n        int postfix = 1;\n        for (int i = n - 1; i >= 0; i--) {\n            res[i] *= postfix;\n            postfix *= nums[i];\n        }\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < n; i++) {\n            sb.append(res[i]);\n            if (i < n - 1) sb.append(\" \");\n        }\n        System.out.println(sb.toString());\n    }\n}\n`
    }),
    inputFormat: "Single line of space-separated integers",
    outputFormat: "Space-separated integers for answer array",
    constraints: "2 <= nums.length <= 10^5\n-30 <= nums[i] <= 30",
    examples: JSON.stringify([
      { input: "1 2 3 4", output: "24 12 8 6" },
      { input: "-1 1 0 -3 3", output: "0 0 9 0 0" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "1 2 3 4", expectedOutput: "24 12 8 6", isPublic: true },
      { id: "tc-2", input: "-1 1 0 -3 3", expectedOutput: "0 0 9 0 0", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "2 3", expectedOutput: "3 2", isPublic: false }
    ]),
    hints: JSON.stringify(["Compute prefix products from left to right, then postfix products from right to left."]),
    solutionExplanation: "The product for index i is prefix[i-1] * postfix[i+1], achievable in two linear passes.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // ==========================================
  // STACK & LIFO PROBLEMS (6 Problems Required)
  // ==========================================
  {
    id: "challenge-stk-1-valid-parentheses",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-stack",
    orderIndex: 1,
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    description: "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\nPrint `true` or `false`.",
    difficulty: "easy",
    category: "Stack",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef is_valid(s):\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else '#'\n            if mapping[char] != top:\n                return False\n        else:\n            stack.append(char)\n    return len(stack) == 0\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    print(\"true\" if is_valid(line) else \"false\")\n`,
      javascript: `const fs = require('fs');\n\nfunction isValid(s) {\n    const stack = [];\n    const mapping = { ')': '(', '}': '{', ']': '[' };\n    for (const char of s) {\n        if (char in mapping) {\n            const top = stack.length ? stack.pop() : '#';\n            if (mapping[char] !== top) return false;\n        }\n        else stack.push(char);\n    }\n    return stack.length === 0;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(isValid(input) ? \"true\" : \"false\");\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static boolean isValid(String s) {\n        Stack<Character> stack = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(') stack.push(')');\n            else if (c == '{') stack.push('}');\n            else if (c == '[') stack.push(']');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNext() ? sc.next() : \"\";\n        System.out.println(isValid(s) ? \"true\" : \"false\");\n    }\n}\n`
    }),
    inputFormat: "Single line string s",
    outputFormat: "'true' or 'false'",
    constraints: "1 <= s.length <= 10^4",
    examples: JSON.stringify([
      { input: "()", output: "true" },
      { input: "()[]{}", output: "true" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "()", expectedOutput: "true", isPublic: true },
      { id: "tc-2", input: "()[]{}", expectedOutput: "true", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "([)]", expectedOutput: "false", isPublic: false }
    ]),
    hints: JSON.stringify(["Push closing bracket counterparts to stack when seeing openers."]),
    solutionExplanation: "Classic LIFO stack data structure: each closing bracket must match the most recently pushed opening bracket.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-stk-2-eval-rpn",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-stack",
    orderIndex: 2,
    title: "Evaluate Reverse Polish Notation",
    slug: "evaluate-reverse-polish-notation",
    description: "Evaluate the value of an arithmetic expression in Reverse Polish Notation (Postfix).\nValid operators are `+`, `-`, `*`, and `/`. Each operand may be an integer or another expression.\nDivision between two integers should truncate toward zero.",
    difficulty: "medium",
    category: "Stack",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef eval_rpn(tokens):\n    stack = []\n    for token in tokens:\n        if token in \"+-*/\":\n            b = stack.pop()\n            a = stack.pop()\n            if token == '+': stack.append(a + b)\n            elif token == '-': stack.append(a - b)\n            elif token == '*': stack.append(a * b)\n            elif token == '/': stack.append(int(a / b))\n        else:\n            stack.append(int(token))\n    return stack[0]\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        tokens = line.split()\n        print(eval_rpn(tokens))\n`,
      javascript: `const fs = require('fs');\n\nfunction evalRPN(tokens) {\n    const stack = [];\n    for (const t of tokens) {\n        if (['+', '-', '*', '/'].includes(t)) {\n            const b = stack.pop();\n            const a = stack.pop();\n            if (t === '+') stack.push(a + b);\n            else if (t === '-') stack.push(a - b);\n            else if (t === '*') stack.push(a * b);\n            else if (t === '/') stack.push(Math.trunc(a / b));\n        } else {\n            stack.push(Number(t));\n        }\n    }\n    return stack[0];\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    console.log(evalRPN(input.split(/\\s+/)));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] tokens = sc.nextLine().trim().split(\"\\\\s+\");\n        Stack<Integer> stack = new Stack<>();\n        for (String t : tokens) {\n            if (\"+\".equals(t)) stack.push(stack.pop() + stack.pop());\n            else if (\"*\".equals(t)) stack.push(stack.pop() * stack.pop());\n            else if (\"-\".equals(t)) {\n                int b = stack.pop(), a = stack.pop();\n                stack.push(a - b);\n            } else if (\"/\".equals(t)) {\n                int b = stack.pop(), a = stack.pop();\n                stack.push(a / b);\n            } else {\n                stack.push(Integer.parseInt(t));\n            }\n        }\n        System.out.println(stack.peek());\n    }\n}\n`
    }),
    inputFormat: "Space-separated postfix tokens on one line",
    outputFormat: "Single integer evaluated result",
    constraints: "1 <= tokens.length <= 10^4",
    examples: JSON.stringify([
      { input: "2 1 + 3 *", output: "9" },
      { input: "4 13 5 / +", output: "6" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "2 1 + 3 *", expectedOutput: "9", isPublic: true },
      { id: "tc-2", input: "4 13 5 / +", expectedOutput: "6", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "10 6 9 3 + -11 * / * 17 + 5 +", expectedOutput: "22", isPublic: false }
    ]),
    hints: JSON.stringify(["Push numbers onto stack. When encountering an operator, pop the two most recent operands and apply."]),
    solutionExplanation: "Postfix notation naturally matches the stack's LIFO evaluation model.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-stk-3-daily-temperatures",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-stack",
    orderIndex: 3,
    title: "Daily Temperatures (Monotonic Stack)",
    slug: "daily-temperatures-monotonic-stack",
    description: "Given an array of integers `temperatures` represents the daily temperatures, return an array `answer` such that `answer[i]` is the number of days you have to wait after the `i-th` day to get a warmer temperature. If there is no future day for which this is possible, keep `answer[i] == 0` instead.\n\nPrint space-separated waiting days.",
    difficulty: "medium",
    category: "Stack",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef daily_temperatures(temperatures):\n    n = len(temperatures)\n    ans = [0] * n\n    stack = []\n    for i, t in enumerate(temperatures):\n        while stack and stack[-1][0] < t:\n            prev_t, prev_i = stack.pop()\n            ans[prev_i] = i - prev_i\n        stack.append((t, i))\n    return ans\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        temps = [int(x) for x in line.split()]\n        print(\" \".join(map(str, daily_temperatures(temps))))\n`,
      javascript: `const fs = require('fs');\n\nfunction dailyTemperatures(temperatures) {\n    const n = temperatures.length;\n    const ans = new Array(n).fill(0);\n    const stack = [];\n    for (let i = 0; i < n; i++) {\n        while (stack.length && temperatures[stack[stack.length - 1]] < temperatures[i]) {\n            const prev = stack.pop();\n            ans[prev] = i - prev;\n        }\n        stack.push(i);\n    }\n    return ans;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    console.log(dailyTemperatures(input.split(/\\s+/).map(Number)).join(' '));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int n = parts.length;\n        int[] t = new int[n];\n        for (int i = 0; i < n; i++) t[i] = Integer.parseInt(parts[i]);\n\n        int[] ans = new int[n];\n        Stack<Integer> stack = new Stack<>();\n        for (int i = 0; i < n; i++) {\n            while (!stack.isEmpty() && t[stack.peek()] < t[i]) {\n                int prev = stack.pop();\n                ans[prev] = i - prev;\n            }\n            stack.push(i);\n        }\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < n; i++) {\n            sb.append(ans[i]);\n            if (i < n - 1) sb.append(\" \");\n        }\n        System.out.println(sb.toString());\n    }\n}\n`
    }),
    inputFormat: "Single line of space-separated temperatures",
    outputFormat: "Single line of space-separated waiting days",
    constraints: "1 <= temperatures.length <= 10^5",
    examples: JSON.stringify([
      { input: "73 74 75 71 69 72 76 73", output: "1 1 4 2 1 1 0 0" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "73 74 75 71 69 72 76 73", expectedOutput: "1 1 4 2 1 1 0 0", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "30 40 50 60", expectedOutput: "1 1 1 0", isPublic: false }
    ]),
    hints: JSON.stringify(["Maintain a decreasing monotonic stack of indices."]),
    solutionExplanation: "Monotonic decreasing stack resolves the next greater element in amortized O(n) time.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-lifo-4-simplify-path",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-lifo",
    orderIndex: 4,
    title: "Simplify Unix Path (LIFO Path Resolution)",
    slug: "simplify-unix-path-lifo",
    description: "Given a string `path`, which is an absolute path (starting with a slash '/') to a file or directory in a Unix-style file system, convert it to the simplified canonical path.\n\nIn Unix-style:\n- A period '.' refers to the current directory.\n- A double period '..' refers to the parent directory (pop from LIFO stack).\n- Multiple consecutive slashes '//' are treated as a single slash '/'.\n\nReturn the simplified canonical path.",
    difficulty: "medium",
    category: "LIFO Problems",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef simplify_path(path):\n    parts = path.split('/')\n    stack = []\n    for p in parts:\n        if p == '' or p == '.':\n            continue\n        elif p == '..':\n            if stack:\n                stack.pop()\n        else:\n            stack.append(p)\n    return '/' + '/'.join(stack)\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    print(simplify_path(line))\n`,
      javascript: `const fs = require('fs');\n\nfunction simplifyPath(path) {\n    const parts = path.split('/');\n    const stack = [];\n    for (const p of parts) {\n        if (!p || p === '.') continue;\n        if (p === '..') {\n            if (stack.length) stack.pop();\n        } else {\n            stack.push(p);\n        }\n    }\n    return '/' + stack.join('/');\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(simplifyPath(input));\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static String simplifyPath(String path) {\n        String[] parts = path.split(\"/\");\n        Deque<String> stack = new ArrayDeque<>();\n        for (String p : parts) {\n            if (p.isEmpty() || \".\".equals(p)) continue;\n            if (\"..\".equals(p)) {\n                if (!stack.isEmpty()) stack.pop();\n            } else {\n                stack.push(p);\n            }\n        }\n        List<String> list = new ArrayList<>(stack);\n        Collections.reverse(list);\n        return \"/\" + String.join(\"/\", list);\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String path = sc.hasNext() ? sc.next() : \"/\";\n        System.out.println(simplifyPath(path));\n    }\n}\n`
    }),
    inputFormat: "Single line Unix path string",
    outputFormat: "Canonical simplified Unix path",
    constraints: "1 <= path.length <= 3000",
    examples: JSON.stringify([
      { input: "/home/", output: "/home" },
      { input: "/../", output: "/" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "/home/", expectedOutput: "/home", isPublic: true },
      { id: "tc-2", input: "/../", expectedOutput: "/", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "/a/./b/../../c/", expectedOutput: "/c", isPublic: false }
    ]),
    hints: JSON.stringify(["Split by '/' and push directory names to a LIFO stack. Pop on '..'."]),
    solutionExplanation: "Directories are pushed sequentially; '..' pops the last inserted element obeying LIFO semantics.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-lifo-5-min-stack",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-lifo",
    orderIndex: 5,
    title: "Min Stack Operations",
    slug: "min-stack-operations",
    description: "Implement a LIFO stack that supports `push`, `pop`, and retrieving the minimum element in `O(1)` time.\nInput is a sequence of operations: `PUSH x`, `POP`, `MIN`.\nOutput the value of each `MIN` query on a new line.",
    difficulty: "medium",
    category: "LIFO Problems",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef process_min_stack(commands):\n    stack = []\n    min_stack = []\n    out = []\n    for cmd in commands:\n        parts = cmd.split()\n        if not parts: continue\n        op = parts[0]\n        if op == \"PUSH\":\n            val = int(parts[1])\n            stack.append(val)\n            if not min_stack or val <= min_stack[-1]:\n                min_stack.append(val)\n        elif op == \"POP\":\n            if stack:\n                val = stack.pop()\n                if val == min_stack[-1]:\n                    min_stack.pop()\n        elif op == \"MIN\":\n            if min_stack:\n                out.append(str(min_stack[-1]))\n    return \"\\n\".join(out)\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    print(process_min_stack(lines))\n`,
      javascript: `const fs = require('fs');\n\nfunction processMinStack(commands) {\n    const stack = [];\n    const minStack = [];\n    const out = [];\n    for (const cmd of commands) {\n        const parts = cmd.trim().split(/\\s+/);\n        if (!parts[0]) continue;\n        const op = parts[0];\n        if (op === 'PUSH') {\n            const val = Number(parts[1]);\n            stack.push(val);\n            if (!minStack.length || val <= minStack[minStack.length - 1]) {\n                minStack.push(val);\n            }\n        } else if (op === 'POP') {\n            if (stack.length) {\n                const val = stack.pop();\n                if (val === minStack[minStack.length - 1]) {\n                    minStack.pop();\n                }\n            }\n        } else if (op === 'MIN') {\n            if (minStack.length) {\n                out.push(minStack[minStack.length - 1]);\n            }\n        }\n    }\n    return out.join('\\n');\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nconsole.log(processMinStack(input));\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        Stack<Integer> stack = new Stack<>();\n        Stack<Integer> minStack = new Stack<>();\n        while (sc.hasNextLine()) {\n            String line = sc.nextLine().trim();\n            if (line.isEmpty()) continue;\n            String[] parts = line.split(\"\\\\s+\");\n            String op = parts[0];\n            if (\"PUSH\".equals(op)) {\n                int val = Integer.parseInt(parts[1]);\n                stack.push(val);\n                if (minStack.isEmpty() || val <= minStack.peek()) {\n                    minStack.push(val);\n                }\n            } else if (\"POP\".equals(op)) {\n                if (!stack.isEmpty()) {\n                    int val = stack.pop();\n                    if (val == minStack.peek()) minStack.pop();\n                }\n            } else if (\"MIN\".equals(op)) {\n                if (!minStack.isEmpty()) {\n                    System.out.println(minStack.peek());\n                }\n            }\n        }\n    }\n}\n`
    }),
    inputFormat: "Multiple lines with commands: PUSH x, POP, MIN",
    outputFormat: "Minimum values printed line by line",
    constraints: "At most 10^4 operations",
    examples: JSON.stringify([
      { input: "PUSH -2\nPUSH 0\nPUSH -3\nMIN\nPOP\nMIN", output: "-3\n-2" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "PUSH -2\nPUSH 0\nPUSH -3\nMIN\nPOP\nMIN", expectedOutput: "-3\n-2", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "PUSH 5\nMIN\nPUSH 3\nMIN", expectedOutput: "5\n3", isPublic: false }
    ]),
    hints: JSON.stringify(["Use an auxiliary min-stack that only tracks non-increasing minimums."]),
    solutionExplanation: "Auxiliary stack stores prefix minimums with synchronized push and pop.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-stk-6-next-greater",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-stack",
    orderIndex: 6,
    title: "Next Greater Element",
    slug: "next-greater-element",
    description: "Given an array `nums`, find the first greater element for each element in the array.\nThe next greater element of an element `x` is the first greater element to its right.\nIf it does not exist, return `-1` for this number.\n\nPrint space-separated next greater values.",
    difficulty: "medium",
    category: "Stack",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef next_greater(nums):\n    n = len(nums)\n    res = [-1] * n\n    stack = []\n    for i in range(n):\n        while stack and nums[stack[-1]] < nums[i]:\n            idx = stack.pop()\n            res[idx] = nums[i]\n        stack.append(i)\n    return res\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        nums = [int(x) for x in line.split()]\n        print(\" \".join(map(str, next_greater(nums))))\n`,
      javascript: `const fs = require('fs');\n\nfunction nextGreater(nums) {\n    const n = nums.length;\n    const res = new Array(n).fill(-1);\n    const stack = [];\n    for (let i = 0; i < n; i++) {\n        while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {\n            const idx = stack.pop();\n            res[idx] = nums[i];\n        }\n        stack.push(i);\n    }\n    return res;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    console.log(nextGreater(input.split(/\\s+/).map(Number)).join(' '));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int n = parts.length;\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) nums[i] = Integer.parseInt(parts[i]);\n\n        int[] res = new int[n];\n        Arrays.fill(res, -1);\n        Stack<Integer> stack = new Stack<>();\n        for (int i = 0; i < n; i++) {\n            while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {\n                res[stack.pop()] = nums[i];\n            }\n            stack.push(i);\n        }\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < n; i++) {\n            sb.append(res[i]);\n            if (i < n - 1) sb.append(\" \");\n        }\n        System.out.println(sb.toString());\n    }\n}\n`
    }),
    inputFormat: "Single line of space-separated integers",
    outputFormat: "Single line of space-separated next greater integers",
    constraints: "1 <= nums.length <= 10^5",
    examples: JSON.stringify([
      { input: "4 5 2 25", output: "5 25 25 -1" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "4 5 2 25", expectedOutput: "5 25 25 -1", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "1 2 3 4 5", expectedOutput: "2 3 4 5 -1", isPublic: false }
    ]),
    hints: JSON.stringify(["Iterate from left to right pushing indices to stack, popping whenever current element is strictly greater."]),
    solutionExplanation: "Monotonic stack efficiently records the first strictly larger element for every index.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // ==========================================
  // BFS PROBLEMS (4 Problems Required)
  // ==========================================
  {
    id: "challenge-bfs-1-grid-path",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-bfs",
    orderIndex: 1,
    title: "Shortest Path in Unweighted Grid (BFS)",
    slug: "shortest-path-unweighted-grid-bfs",
    description: "Given an `m x n` binary grid where `0` represents an open cell and `1` represents an obstacle, return the length of the shortest clear path from top-left `(0,0)` to bottom-right `(m-1, n-1)`.\nYou can move in 4 cardinal directions (Up, Down, Left, Right).\nIf no clear path exists, return `-1`.\nPath length is measured by number of cells visited.",
    difficulty: "medium",
    category: "BFS",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\nfrom collections import deque\n\ndef shortest_path_binary_grid(grid):\n    R, C = len(grid), len(grid[0])\n    if grid[0][0] != 0 or grid[R-1][C-1] != 0:\n        return -1\n    queue = deque([(0, 0, 1)])\n    visited = {(0, 0)}\n    while queue:\n        r, c, dist = queue.popleft()\n        if r == R - 1 and c == C - 1:\n            return dist\n        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:\n            nr, nc = r + dr, c + dc\n            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 0 and (nr, nc) not in visited:\n                visited.add((nr, nc))\n                queue.append((nr, nc, dist + 1))\n    return -1\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if lines:\n        grid = [[int(x) for x in row.split()] for row in lines]\n        print(shortest_path_binary_grid(grid))\n`,
      javascript: `const fs = require('fs');\n\nfunction shortestPath(grid) {\n    const R = grid.length, C = grid[0].length;\n    if (grid[0][0] !== 0 || grid[R - 1][C - 1] !== 0) return -1;\n    const queue = [[0, 0, 1]];\n    const visited = Array.from({ length: R }, () => new Array(C).fill(false));\n    visited[0][0] = true;\n    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];\n    let head = 0;\n    while (head < queue.length) {\n        const [r, c, dist] = queue[head++];\n        if (r === R - 1 && c === C - 1) return dist;\n        for (const [dr, dc] of dirs) {\n            const nr = r + dr, nc = c + dc;\n            if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 0 && !visited[nr][nc]) {\n                visited[nr][nc] = true;\n                queue.push([nr, nc, dist + 1]);\n            }\n        }\n    }\n    return -1;\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length) {\n    const grid = lines.map(line => line.trim().split(/\\s+/).map(Number));\n    console.log(shortestPath(grid));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        List<int[]> rows = new ArrayList<>();\n        while (sc.hasNextLine()) {\n            String line = sc.nextLine().trim();\n            if (line.isEmpty()) continue;\n            String[] parts = line.split(\"\\\\s+\");\n            int[] r = new int[parts.length];\n            for (int i = 0; i < parts.length; i++) r[i] = Integer.parseInt(parts[i]);\n            rows.add(r);\n        }\n        if (rows.isEmpty()) return;\n        int R = rows.size(), C = rows.get(0).length;\n        int[][] grid = rows.toArray(new int[R][C]);\n        if (grid[0][0] != 0 || grid[R - 1][C - 1] != 0) {\n            System.out.println(-1);\n            return;\n        }\n\n        Queue<int[]> queue = new LinkedList<>();\n        queue.add(new int[]{0, 0, 1});\n        boolean[][] visited = new boolean[R][C];\n        visited[0][0] = true;\n        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\n        int ans = -1;\n\n        while (!queue.isEmpty()) {\n            int[] curr = queue.poll();\n            int r = curr[0], c = curr[1], dist = curr[2];\n            if (r == R - 1 && c == C - 1) {\n                ans = dist;\n                break;\n            }\n            for (int[] d : dirs) {\n                int nr = r + d[0], nc = c + d[1];\n                if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] == 0 && !visited[nr][nc]) {\n                    visited[nr][nc] = true;\n                    queue.add(new int[]{nr, nc, dist + 1});\n                }\n            }\n        }\n        System.out.println(ans);\n    }\n}\n`
    }),
    inputFormat: "Rows of space-separated 0s and 1s",
    outputFormat: "Single integer shortest path distance or -1",
    constraints: "1 <= m, n <= 100",
    examples: JSON.stringify([
      { input: "0 0 0\n1 1 0\n1 1 0", output: "5" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "0 0 0\n1 1 0\n1 1 0", expectedOutput: "5", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "0 1\n1 0", expectedOutput: "-1", isPublic: false }
    ]),
    hints: JSON.stringify(["BFS with a queue guarantees finding the shortest path first in an unweighted grid."]),
    solutionExplanation: "Queue explores nodes in increasing order of distance, guaranteeing optimal path length upon arrival.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-bfs-2-level-order",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-bfs",
    orderIndex: 2,
    title: "Binary Tree Level Order Traversal",
    slug: "binary-tree-level-order-traversal-bfs",
    description: "Given the root of a binary tree encoded in level-order array format with `null` representing absent nodes, return the level order traversal of its nodes' values.\nPrint each level on a new line with space-separated values.",
    difficulty: "medium",
    category: "BFS",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\nfrom collections import deque\n\ndef level_order(tokens):\n    if not tokens or tokens[0] == \"null\":\n        return\n    queue = deque([0])\n    cur_level_nodes = [0]\n    while cur_level_nodes:\n        level_vals = []\n        next_level = []\n        for idx in cur_level_nodes:\n            if idx < len(tokens) and tokens[idx] != \"null\":\n                level_vals.append(tokens[idx])\n                left = 2 * idx + 1\n                right = 2 * idx + 2\n                if left < len(tokens) and tokens[left] != \"null\":\n                    next_level.append(left)\n                if right < len(tokens) and tokens[right] != \"null\":\n                    next_level.append(right)\n        if level_vals:\n            print(\" \".join(level_vals))\n        cur_level_nodes = next_level\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        level_order(line.split())\n`,
      javascript: `const fs = require('fs');\n\nfunction levelOrder(tokens) {\n    if (!tokens.length || tokens[0] === 'null') return;\n    let curLevel = [0];\n    while (curLevel.length) {\n        const levelVals = [];\n        const nextLevel = [];\n        for (const idx of curLevel) {\n            if (idx < tokens.length && tokens[idx] !== 'null') {\n                levelVals.push(tokens[idx]);\n                const left = 2 * idx + 1;\n                const right = 2 * idx + 2;\n                if (left < tokens.length && tokens[left] !== 'null') nextLevel.push(left);\n                if (right < tokens.length && tokens[right] !== 'null') nextLevel.push(right);\n            }\n        }\n        if (levelVals.length) console.log(levelVals.join(' '));\n        curLevel = nextLevel;\n    }\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) levelOrder(input.split(/\\s+/));\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] tokens = sc.nextLine().trim().split(\"\\\\s+\");\n        if (tokens.length == 0 || \"null\".equals(tokens[0])) return;\n\n        List<Integer> cur = new ArrayList<>();\n        cur.add(0);\n        while (!cur.isEmpty()) {\n            List<String> vals = new ArrayList<>();\n            List<Integer> next = new ArrayList<>();\n            for (int idx : cur) {\n                if (idx < tokens.length && !\"null\".equals(tokens[idx])) {\n                    vals.add(tokens[idx]);\n                    int left = 2 * idx + 1, right = 2 * idx + 2;\n                    if (left < tokens.length && !\"null\".equals(tokens[left])) next.add(left);\n                    if (right < tokens.length && !\"null\".equals(tokens[right])) next.add(right);\n                }\n            }\n            if (!vals.isEmpty()) {\n                System.out.println(String.join(\" \", vals));\n            }\n            cur = next;\n        }\n    }\n}\n`
    }),
    inputFormat: "Space-separated tree elements in level order (e.g. 3 9 20 null null 15 7)",
    outputFormat: "Each level values printed on a separate line",
    constraints: "Number of nodes <= 2000",
    examples: JSON.stringify([
      { input: "3 9 20 null null 15 7", output: "3\n9 20\n15 7" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "3 9 20 null null 15 7", expectedOutput: "3\n9 20\n15 7", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "1 2 3 4 5", expectedOutput: "1\n2 3\n4 5", isPublic: false }
    ]),
    hints: JSON.stringify(["Use BFS queue tracking node count at each level."]),
    solutionExplanation: "FIFO queue processes trees layer by layer cleanly.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-bfs-3-rotten-oranges",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-bfs",
    orderIndex: 3,
    title: "Rotting Oranges (Multi-source BFS)",
    slug: "rotting-oranges-multisource-bfs",
    description: "You are given an `m x n` grid where each cell has one of three values:\n- `0` representing an empty cell\n- `1` representing a fresh orange\n- `2` representing a rotten orange\n\nEvery minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten.\nReturn the minimum number of minutes that must elapse until no cell has a fresh orange. If this is impossible, return `-1`.",
    difficulty: "medium",
    category: "BFS",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\nfrom collections import deque\n\ndef oranges_rotting(grid):\n    R, C = len(grid), len(grid[0])\n    queue = deque()\n    fresh = 0\n    for r in range(R):\n        for c in range(C):\n            if grid[r][c] == 2:\n                queue.append((r, c, 0))\n            elif grid[r][c] == 1:\n                fresh += 1\n    if fresh == 0: return 0\n\n    minutes = 0\n    while queue:\n        r, c, m = queue.popleft()\n        minutes = max(minutes, m)\n        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:\n            nr, nc = r + dr, c + dc\n            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1:\n                grid[nr][nc] = 2\n                fresh -= 1\n                queue.append((nr, nc, m + 1))\n    return minutes if fresh == 0 else -1\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if lines:\n        grid = [[int(x) for x in line.split()] for line in lines]\n        print(oranges_rotting(grid))\n`,
      javascript: `const fs = require('fs');\n\nfunction orangesRotting(grid) {\n    const R = grid.length, C = grid[0].length;\n    const queue = [];\n    let fresh = 0;\n    for (let r = 0; r < R; r++) {\n        for (let c = 0; c < C; c++) {\n            if (grid[r][c] === 2) queue.push([r, c, 0]);\n            else if (grid[r][c] === 1) fresh++;\n        }\n    }\n    if (fresh === 0) return 0;\n    let minutes = 0, head = 0;\n    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];\n    while (head < queue.length) {\n        const [r, c, m] = queue[head++];\n        minutes = Math.max(minutes, m);\n        for (const [dr, dc] of dirs) {\n            const nr = r + dr, nc = c + dc;\n            if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 1) {\n                grid[nr][nc] = 2;\n                fresh--;\n                queue.push([nr, nc, m + 1]);\n            }\n        }\n    }\n    return fresh === 0 ? minutes : -1;\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length) {\n    const grid = lines.map(line => line.trim().split(/\\s+/).map(Number));\n    console.log(orangesRotting(grid));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        List<int[]> rows = new ArrayList<>();\n        while (sc.hasNextLine()) {\n            String line = sc.nextLine().trim();\n            if (line.isEmpty()) continue;\n            String[] parts = line.split(\"\\\\s+\");\n            int[] r = new int[parts.length];\n            for (int i = 0; i < parts.length; i++) r[i] = Integer.parseInt(parts[i]);\n            rows.add(r);\n        }\n        if (rows.isEmpty()) return;\n        int R = rows.size(), C = rows.get(0).length;\n        int[][] grid = rows.toArray(new int[R][C]);\n\n        Queue<int[]> queue = new LinkedList<>();\n        int fresh = 0;\n        for (int r = 0; r < R; r++) {\n            for (int c = 0; c < C; c++) {\n                if (grid[r][c] == 2) queue.add(new int[]{r, c, 0});\n                else if (grid[r][c] == 1) fresh++;\n            }\n        }\n        if (fresh == 0) {\n            System.out.println(0);\n            return;\n        }\n\n        int minutes = 0;\n        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\n        while (!queue.isEmpty()) {\n            int[] curr = queue.poll();\n            int r = curr[0], c = curr[1], m = curr[2];\n            minutes = Math.max(minutes, m);\n            for (int[] d : dirs) {\n                int nr = r + d[0], nc = c + d[1];\n                if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] == 1) {\n                    grid[nr][nc] = 2;\n                    fresh--;\n                    queue.add(new int[]{nr, nc, m + 1});\n                }\n            }\n        }\n        System.out.println(fresh == 0 ? minutes : -1);\n    }\n}\n`
    }),
    inputFormat: "Grid rows representing orange states",
    outputFormat: "Single integer minutes or -1",
    constraints: "1 <= m, n <= 10",
    examples: JSON.stringify([
      { input: "2 1 1\n1 1 0\n0 1 1", output: "4" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "2 1 1\n1 1 0\n0 1 1", expectedOutput: "4", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "0 2", expectedOutput: "0", isPublic: false }
    ]),
    hints: JSON.stringify(["Initialize BFS queue with all initially rotten oranges simultaneously (multi-source BFS)."]),
    solutionExplanation: "Simultaneous multi-source frontier expansion records exact time steps in O(R * C).",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-bfs-4-word-ladder-dist",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-bfs",
    orderIndex: 4,
    title: "Word Ladder Transformation Length",
    slug: "word-ladder-transformation-length",
    description: "A transformation sequence from word `beginWord` to word `endWord` using a dictionary `wordList` is a sequence of words `beginWord -> s1 -> s2 -> ... -> sk` such that every adjacent pair differs by exactly one letter.\n\nGiven `beginWord`, `endWord`, and `wordList`, return the number of words in the shortest transformation sequence from `beginWord` to `endWord`, or `0` if no such sequence exists.",
    difficulty: "hard",
    category: "BFS",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\nfrom collections import deque\n\ndef ladder_length(begin_word, end_word, word_list):\n    words = set(word_list)\n    if end_word not in words:\n        return 0\n    queue = deque([(begin_word, 1)])\n    visited = {begin_word}\n    while queue:\n        word, length = queue.popleft()\n        if word == end_word:\n            return length\n        for i in range(len(word)):\n            for c in 'abcdefghijklmnopqrstuvwxyz':\n                next_word = word[:i] + c + word[i+1:]\n                if next_word in words and next_word not in visited:\n                    visited.add(next_word)\n                    queue.append((next_word, length + 1))\n    return 0\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if len(lines) >= 3:\n        begin = lines[0].strip()\n        end = lines[1].strip()\n        word_list = lines[2].strip().split()\n        print(ladder_length(begin, end, word_list))\n`,
      javascript: `const fs = require('fs');\n\nfunction ladderLength(beginWord, endWord, wordList) {\n    const words = new Set(wordList);\n    if (!words.has(endWord)) return 0;\n    const queue = [[beginWord, 1]];\n    const visited = new Set([beginWord]);\n    let head = 0;\n    while (head < queue.length) {\n        const [word, length] = queue[head++];\n        if (word === endWord) return length;\n        for (let i = 0; i < word.length; i++) {\n            for (let code = 97; code <= 122; code++) {\n                const c = String.fromCharCode(code);\n                const nextWord = word.slice(0, i) + c + word.slice(i + 1);\n                if (words.has(nextWord) && !visited.has(nextWord)) {\n                    visited.add(nextWord);\n                    queue.push([nextWord, length + 1]);\n                }\n            }\n        }\n    }\n    return 0;\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length >= 3) {\n    const begin = lines[0].trim();\n    const end = lines[1].trim();\n    const wordList = lines[2].trim().split(/\\s+/);\n    console.log(ladderLength(begin, end, wordList));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String begin = sc.nextLine().trim();\n        if (!sc.hasNextLine()) return;\n        String end = sc.nextLine().trim();\n        if (!sc.hasNextLine()) return;\n        String[] wordsArr = sc.nextLine().trim().split(\"\\\\s+\");\n\n        Set<String> words = new HashSet<>(Arrays.asList(wordsArr));\n        if (!words.contains(end)) {\n            System.out.println(0);\n            return;\n        }\n\n        Queue<String> queue = new LinkedList<>();\n        queue.add(begin);\n        Map<String, Integer> dist = new HashMap<>();\n        dist.put(begin, 1);\n\n        while (!queue.isEmpty()) {\n            String word = queue.poll();\n            int curDist = dist.get(word);\n            if (word.equals(end)) {\n                System.out.println(curDist);\n                return;\n            }\n            char[] chars = word.toCharArray();\n            for (int i = 0; i < chars.length; i++) {\n                char orig = chars[i];\n                for (char c = 'a'; c <= 'z'; c++) {\n                    chars[i] = c;\n                    String next = new String(chars);\n                    if (words.contains(next) && !dist.containsKey(next)) {\n                        dist.put(next, curDist + 1);\n                        queue.add(next);\n                    }\n                }\n                chars[i] = orig;\n            }\n        }\n        System.out.println(0);\n    }\n}\n`
    }),
    inputFormat: "Line 1: beginWord\nLine 2: endWord\nLine 3: space-separated wordList",
    outputFormat: "Single integer length or 0",
    constraints: "1 <= beginWord.length <= 10\nwordList.length <= 5000",
    examples: JSON.stringify([
      { input: "hit\ncog\nhot dot dog lot log cog", output: "5" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "hit\ncog\nhot dot dog lot log cog", expectedOutput: "5", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "hit\ncog\nhot dot dog lot log", expectedOutput: "0", isPublic: false }
    ]),
    hints: JSON.stringify(["Treat words as graph vertices and single letter mutations as edges. BFS finds shortest distance."]),
    solutionExplanation: "Standard unweighted shortest path BFS from source string to target string.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // ==========================================
  // DFS PROBLEMS (5 Problems Required)
  // ==========================================
  {
    id: "challenge-dfs-1-islands",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-dfs",
    orderIndex: 1,
    title: "Number of Islands (DFS)",
    slug: "number-of-islands-dfs",
    description: "Given an `m x n` 2D binary grid `grid` which represents a map of '1's (land) and '0's (water), return the number of islands.\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
    difficulty: "medium",
    category: "DFS",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef num_islands(grid):\n    if not grid: return 0\n    R, C = len(grid), len(grid[0])\n    count = 0\n    \n    def dfs(r, c):\n        if r < 0 or r >= R or c < 0 or c >= C or grid[r][c] != '1':\n            return\n        grid[r][c] = '0'\n        dfs(r + 1, c)\n        dfs(r - 1, c)\n        dfs(r, c + 1)\n        dfs(r, c - 1)\n\n    for r in range(R):\n        for c in range(C):\n            if grid[r][c] == '1':\n                count += 1\n                dfs(r, c)\n    return count\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if lines:\n        grid = [line.split() for line in lines]\n        print(num_islands(grid))\n`,
      javascript: `const fs = require('fs');\n\nfunction numIslands(grid) {\n    if (!grid.length) return 0;\n    const R = grid.length, C = grid[0].length;\n    let count = 0;\n\n    function dfs(r, c) {\n        if (r < 0 || r >= R || c < 0 || c >= C || grid[r][c] !== '1') return;\n        grid[r][c] = '0';\n        dfs(r + 1, c);\n        dfs(r - 1, c);\n        dfs(r, c + 1);\n        dfs(r, c - 1);\n    }\n\n    for (let r = 0; r < R; r++) {\n        for (let c = 0; c < C; c++) {\n            if (grid[r][c] === '1') {\n                count++;\n                dfs(r, c);\n            }\n        }\n    }\n    return count;\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length) {\n    const grid = lines.map(l => l.trim().split(/\\s+/));\n    console.log(numIslands(grid));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    private static void dfs(char[][] grid, int r, int c, int R, int C) {\n        if (r < 0 || r >= R || c < 0 || c >= C || grid[r][c] != '1') return;\n        grid[r][c] = '0';\n        dfs(grid, r + 1, c, R, C);\n        dfs(grid, r - 1, c, R, C);\n        dfs(grid, r, c + 1, R, C);\n        dfs(grid, r, c - 1, R, C);\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        List<String[]> rows = new ArrayList<>();\n        while (sc.hasNextLine()) {\n            String line = sc.nextLine().trim();\n            if (line.isEmpty()) continue;\n            rows.add(line.split(\"\\\\s+\"));\n        }\n        if (rows.isEmpty()) return;\n        int R = rows.size(), C = rows.get(0).length;\n        char[][] grid = new char[R][C];\n        for (int i = 0; i < R; i++) {\n            for (int j = 0; j < C; j++) grid[i][j] = rows.get(i)[j].charAt(0);\n        }\n\n        int count = 0;\n        for (int i = 0; i < R; i++) {\n            for (int j = 0; j < C; j++) {\n                if (grid[i][j] == '1') {\n                    count++;\n                    dfs(grid, i, j, R, C);\n                }\n            }\n        }\n        System.out.println(count);\n    }\n}\n`
    }),
    inputFormat: "Grid matrix of 1s and 0s separated by spaces",
    outputFormat: "Single integer total island count",
    constraints: "1 <= m, n <= 300",
    examples: JSON.stringify([
      { input: "1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0", output: "1" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0", expectedOutput: "1", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1", expectedOutput: "3", isPublic: false }
    ]),
    hints: JSON.stringify(["Whenever an unvisited '1' is reached, launch DFS to sink the entire connected land mass."]),
    solutionExplanation: "Connected components traversal with DFS marks visited lands in O(R * C) time.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-dfs-2-flood-fill",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-dfs",
    orderIndex: 2,
    title: "Flood Fill Algorithm",
    slug: "flood-fill-algorithm-dfs",
    description: "An image is represented by an `m x n` integer grid `image` where `image[i][j]` represents the pixel value.\nYou are also given three integers `sr`, `sc`, and `color`. Perform a flood fill on the image starting from pixel `image[sr][sc]`.\n\nPrint the modified image rows.",
    difficulty: "easy",
    category: "DFS",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef flood_fill(image, sr, sc, new_color):\n    orig = image[sr][sc]\n    if orig == new_color: return image\n    R, C = len(image), len(image[0])\n\n    def dfs(r, c):\n        if r < 0 or r >= R or c < 0 or c >= C or image[r][c] != orig:\n            return\n        image[r][c] = new_color\n        dfs(r + 1, c)\n        dfs(r - 1, c)\n        dfs(r, c + 1)\n        dfs(r, c - 1)\n\n    dfs(sr, sc)\n    return image\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if len(lines) >= 2:\n        sr, sc, color = [int(x) for x in lines[0].split()]\n        image = [[int(x) for x in line.split()] for line in lines[1:]]\n        res = flood_fill(image, sr, sc, color)\n        for row in res:\n            print(\" \".join(map(str, row)))\n`,
      javascript: `const fs = require('fs');\n\nfunction floodFill(image, sr, sc, newColor) {\n    const orig = image[sr][sc];\n    if (orig === newColor) return image;\n    const R = image.length, C = image[0].length;\n\n    function dfs(r, c) {\n        if (r < 0 || r >= R || c < 0 || c >= C || image[r][c] !== orig) return;\n        image[r][c] = newColor;\n        dfs(r + 1, c);\n        dfs(r - 1, c);\n        dfs(r, c + 1);\n        dfs(r, c - 1);\n    }\n    dfs(sr, sc);\n    return image;\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n    const [sr, sc, color] = lines[0].trim().split(/\\s+/).map(Number);\n    const image = lines.slice(1).map(l => l.trim().split(/\\s+/).map(Number));\n    const res = floodFill(image, sr, sc, color);\n    for (const row of res) console.log(row.join(' '));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    private static void dfs(int[][] img, int r, int c, int orig, int color, int R, int C) {\n        if (r < 0 || r >= R || c < 0 || c >= C || img[r][c] != orig) return;\n        img[r][c] = color;\n        dfs(img, r + 1, c, orig, color, R, C);\n        dfs(img, r - 1, c, orig, color, R, C);\n        dfs(img, r, c + 1, orig, color, R, C);\n        dfs(img, r, c - 1, orig, color, R, C);\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] first = sc.nextLine().trim().split(\"\\\\s+\");\n        int sr = Integer.parseInt(first[0]), scCol = Integer.parseInt(first[1]), color = Integer.parseInt(first[2]);\n\n        List<int[]> rows = new ArrayList<>();\n        while (sc.hasNextLine()) {\n            String line = sc.nextLine().trim();\n            if (line.isEmpty()) continue;\n            String[] parts = line.split(\"\\\\s+\");\n            int[] r = new int[parts.length];\n            for (int i = 0; i < parts.length; i++) r[i] = Integer.parseInt(parts[i]);\n            rows.add(r);\n        }\n        int R = rows.size(), C = rows.get(0).length;\n        int[][] img = rows.toArray(new int[R][C]);\n        if (img[sr][scCol] != color) {\n            dfs(img, sr, scCol, img[sr][scCol], color, R, C);\n        }\n        for (int i = 0; i < R; i++) {\n            StringBuilder sb = new StringBuilder();\n            for (int j = 0; j < C; j++) {\n                sb.append(img[i][j]);\n                if (j < C - 1) sb.append(\" \");\n            }\n            System.out.println(sb.toString());\n        }\n    }\n}\n`
    }),
    inputFormat: "Line 1: sr sc color\nLines 2+: image matrix rows",
    outputFormat: "Modified matrix rows",
    constraints: "1 <= m, n <= 50",
    examples: JSON.stringify([
      { input: "1 1 2\n1 1 1\n1 1 0\n1 0 1", output: "2 2 2\n2 2 0\n2 0 1" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "1 1 2\n1 1 1\n1 1 0\n1 0 1", expectedOutput: "2 2 2\n2 2 0\n2 0 1", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "0 0 0\n0 0 0\n0 0 0", expectedOutput: "0 0 0\n0 0 0", isPublic: false }
    ]),
    hints: JSON.stringify(["Use recursion to re-color adjacent cells that share the original pixel value."]),
    solutionExplanation: "Classic bucket fill algorithm recursively replacing connected matching pixels.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-dfs-3-max-depth",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-dfs",
    orderIndex: 3,
    title: "Maximum Depth of Binary Tree",
    slug: "maximum-depth-of-binary-tree-dfs",
    description: "Given a binary tree encoded in level-order format where 'null' indicates missing nodes, return its maximum depth.\nA binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
    difficulty: "easy",
    category: "DFS",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef max_depth(tokens):\n    if not tokens or tokens[0] == \"null\": return 0\n    def get_depth(i):\n        if i >= len(tokens) or tokens[i] == \"null\": return 0\n        left = get_depth(2 * i + 1)\n        right = get_depth(2 * i + 2)\n        return 1 + max(left, right)\n    return get_depth(0)\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    print(max_depth(line.split()) if line else 0)\n`,
      javascript: `const fs = require('fs');\n\nfunction maxDepth(tokens) {\n    if (!tokens.length || tokens[0] === 'null') return 0;\n    function getDepth(i) {\n        if (i >= tokens.length || tokens[i] === 'null') return 0;\n        const left = getDepth(2 * i + 1);\n        const right = getDepth(2 * i + 2);\n        return 1 + Math.max(left, right);\n    }\n    return getDepth(0);\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(input ? maxDepth(input.split(/\\s+/)) : 0);\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    private static int getDepth(String[] tokens, int i) {\n        if (i >= tokens.length || \"null\".equals(tokens[i])) return 0;\n        int left = getDepth(tokens, 2 * i + 1);\n        int right = getDepth(tokens, 2 * i + 2);\n        return 1 + Math.max(left, right);\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) { System.out.println(0); return; }\n        String[] tokens = sc.nextLine().trim().split(\"\\\\s+\");\n        System.out.println(getDepth(tokens, 0));\n    }\n}\n`
    }),
    inputFormat: "Level order tree representation space-separated",
    outputFormat: "Single integer maximum depth",
    constraints: "Tree size <= 10^4",
    examples: JSON.stringify([
      { input: "3 9 20 null null 15 7", output: "3" },
      { input: "1 null 2", output: "2" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "3 9 20 null null 15 7", expectedOutput: "3", isPublic: true },
      { id: "tc-2", input: "1 null 2", expectedOutput: "2", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-3", input: "1", expectedOutput: "1", isPublic: false }
    ]),
    hints: JSON.stringify(["Depth of tree is 1 + max(depth(left), depth(right))."]),
    solutionExplanation: "DFS recursively visits each subtree to evaluate maximum branch depth.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-dfs-4-path-sum",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-dfs",
    orderIndex: 4,
    title: "Path Sum in Binary Tree",
    slug: "path-sum-binary-tree-dfs",
    description: "Given a binary tree and an integer `targetSum`, return `true` if the tree has a root-to-leaf path such that adding up all the values along the path equals `targetSum`.\nA leaf is a node with no children.",
    difficulty: "easy",
    category: "DFS",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef has_path_sum(tokens, target):\n    if not tokens or tokens[0] == \"null\": return False\n    def dfs(i, current_sum):\n        if i >= len(tokens) or tokens[i] == \"null\": return False\n        val = int(tokens[i])\n        left = 2 * i + 1\n        right = 2 * i + 2\n        is_leaf = (left >= len(tokens) or tokens[left] == \"null\") and (right >= len(tokens) or tokens[right] == \"null\")\n        if is_leaf: return current_sum + val == target\n        return dfs(left, current_sum + val) or dfs(right, current_sum + val)\n    return dfs(0, 0)\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if len(lines) >= 2:\n        tokens = lines[0].split()\n        target = int(lines[1])\n        print(\"true\" if has_path_sum(tokens, target) else \"false\")\n`,
      javascript: `const fs = require('fs');\n\nfunction hasPathSum(tokens, target) {\n    if (!tokens.length || tokens[0] === 'null') return false;\n    function dfs(i, cur) {\n        if (i >= tokens.length || tokens[i] === 'null') return false;\n        const val = Number(tokens[i]);\n        const left = 2 * i + 1;\n        const right = 2 * i + 2;\n        const isLeaf = (left >= tokens.length || tokens[left] === 'null') &&\n                       (right >= tokens.length || tokens[right] === 'null');\n        if (isLeaf) return cur + val === target;\n        return dfs(left, cur + val) || dfs(right, cur + val);\n    }\n    return dfs(0, 0);\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n    const tokens = lines[0].trim().split(/\\s+/);\n    const target = Number(lines[1].trim());\n    console.log(hasPathSum(tokens, target) ? \"true\" : \"false\");\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    private static boolean dfs(String[] tokens, int i, int cur, int target) {\n        if (i >= tokens.length || \"null\".equals(tokens[i])) return false;\n        int val = Integer.parseInt(tokens[i]);\n        int left = 2 * i + 1, right = 2 * i + 2;\n        boolean isLeaf = (left >= tokens.length || \"null\".equals(tokens[left])) &&\n                         (right >= tokens.length || \"null\".equals(tokens[right]));\n        if (isLeaf) return cur + val == target;\n        return dfs(tokens, left, cur + val, target) || dfs(tokens, right, cur + val, target);\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] tokens = sc.nextLine().trim().split(\"\\\\s+\");\n        if (!sc.hasNextInt()) return;\n        int target = sc.nextInt();\n        System.out.println(dfs(tokens, 0, 0, target) ? \"true\" : \"false\");\n    }\n}\n`
    }),
    inputFormat: "Line 1: level order tree\nLine 2: target sum",
    outputFormat: "'true' or 'false'",
    constraints: "Number of nodes <= 5000",
    examples: JSON.stringify([
      { input: "5 4 8 11 null 13 4 7 2 null null null 1\n22", output: "true" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "5 4 8 11 null 13 4 7 2 null null null 1\n22", expectedOutput: "true", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "1 2 3\n5", expectedOutput: "false", isPublic: false }
    ]),
    hints: JSON.stringify(["Subtract current node value from target at each recursive step until reaching a leaf node."]),
    solutionExplanation: "DFS recursively evaluates path accumulations from root down to all leaves.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "challenge-dfs-5-target-sum-subsets",
    chapterId: "chapter-dsa",
    topicId: "topic-dsa-dfs",
    orderIndex: 5,
    title: "Target Sum Subsets (Backtracking DFS)",
    slug: "target-sum-subsets-dfs",
    description: "You are given an integer array `nums` and an integer `target`.\nYou want to build an expression out of nums by adding one of the symbols '+' and '-' before each integer in nums and then concatenate all the integers.\nReturn the number of different expressions that you can build, which evaluate to `target`.",
    difficulty: "medium",
    category: "DFS",
    challengeType: "programming",
    supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
    starterCode: JSON.stringify({
      python: `import sys\n\ndef find_target_sum_ways(nums, target):\n    memo = {}\n    def dfs(i, current_sum):\n        if i == len(nums): return 1 if current_sum == target else 0\n        state = (i, current_sum)\n        if state in memo: return memo[state]\n        ways = dfs(i + 1, current_sum + nums[i]) + dfs(i + 1, current_sum - nums[i])\n        memo[state] = ways\n        return ways\n    return dfs(0, 0)\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if len(lines) >= 2:\n        nums = [int(x) for x in lines[0].split()]\n        target = int(lines[1])\n        print(find_target_sum_ways(nums, target))\n`,
      javascript: `const fs = require('fs');\n\nfunction findTargetSumWays(nums, target) {\n    const memo = new Map();\n    function dfs(i, cur) {\n        if (i === nums.length) return cur === target ? 1 : 0;\n        const key = \`\${i},\${cur}\`;\n        if (memo.has(key)) return memo.get(key);\n        const ways = dfs(i + 1, cur + nums[i]) + dfs(i + 1, cur - nums[i]);\n        memo.set(key, ways);\n        return ways;\n    }\n    return dfs(0, 0);\n}\n\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n    const nums = lines[0].trim().split(/\\s+/).map(Number);\n    const target = Number(lines[1].trim());\n    console.log(findTargetSumWays(nums, target));\n}\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    private static Map<String, Integer> memo = new HashMap<>();\n    private static int dfs(int[] nums, int i, int cur, int target) {\n        if (i == nums.length) return cur == target ? 1 : 0;\n        String key = i + \",\" + cur;\n        if (memo.containsKey(key)) return memo.get(key);\n        int ways = dfs(nums, i + 1, cur + nums[i], target) + dfs(nums, i + 1, cur - nums[i], target);\n        memo.put(key, ways);\n        return ways;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        if (!sc.hasNextInt()) return;\n        int target = sc.nextInt();\n        System.out.println(dfs(nums, 0, 0, target));\n    }\n}\n`
    }),
    inputFormat: "Line 1: space-separated integers nums\nLine 2: integer target",
    outputFormat: "Single integer total number of valid expressions",
    constraints: "1 <= nums.length <= 20\n0 <= nums[i] <= 1000",
    examples: JSON.stringify([
      { input: "1 1 1 1 1\n3", output: "5" }
    ]),
    publicTestCases: JSON.stringify([
      { id: "tc-1", input: "1 1 1 1 1\n3", expectedOutput: "5", isPublic: true }
    ]),
    privateTestCases: JSON.stringify([
      { id: "tc-2", input: "1 0\n1", expectedOutput: "2", isPublic: false }
    ]),
    hints: JSON.stringify(["At each index explore both +nums[i] and -nums[i] with memoization."]),
    solutionExplanation: "Binary decision tree evaluated via depth-first search with state memoization.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // ==========================================
  // WEB DEVELOPMENT CHALLENGES
  // ==========================================
  {
    id: "challenge-web-form-val",
    chapterId: "chapter-web",
    topicId: "topic-web-forms",
    orderIndex: 1,
    title: "Client-side Form Validation",
    slug: "web-client-form-validation",
    description: "Build an interactive registration form with real-time field validation for Email format, Password length (>= 8 chars), and Terms checkbox agreement with dynamic error banners.",
    difficulty: "medium",
    category: "Web Development",
    challengeType: "web",
    supportedLanguages: JSON.stringify(["html", "css", "javascript"]),
    starterCode: JSON.stringify({}),
    htmlStarterCode: `<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>Account Registration</title>\n</head>\n<body>\n  <div class=\"card\">\n    <h2>Student Registration</h2>\n    <form id=\"regForm\">\n      <div class=\"field\">\n        <label>Email Address</label>\n        <input type=\"text\" id=\"email\" placeholder=\"student@domain.com\">\n        <span class=\"err\" id=\"emailErr\"></span>\n      </div>\n      <div class=\"field\">\n        <label>Password</label>\n        <input type=\"password\" id=\"password\" placeholder=\"At least 8 characters\">\n        <span class=\"err\" id=\"passErr\"></span>\n      </div>\n      <div class=\"field check\">\n        <input type=\"checkbox\" id=\"terms\">\n        <label for=\"terms\">I agree to LMS Code of Conduct</label>\n      </div>\n      <button type=\"submit\" id=\"submitBtn\">Create Account</button>\n      <div id=\"successMsg\" class=\"success hidden\">Registration Successful!</div>\n    </form>\n  </div>\n</body>\n</html>`,
    cssStarterCode: `body {\n  background: #0f172a;\n  color: #f8fafc;\n  font-family: system-ui, sans-serif;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n  margin: 0;\n}\n.card {\n  background: #1e293b;\n  padding: 2rem;\n  border-radius: 12px;\n  width: 100%;\n  max-width: 400px;\n}\n.field { margin-bottom: 1.25rem; }\nlabel { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; color: #cbd5e1; }\ninput[type=\"text\"], input[type=\"password\"] {\n  width: 100%;\n  padding: 10px;\n  border-radius: 6px;\n  border: 1px solid #334155;\n  background: #0f172a;\n  color: white;\n  box-sizing: border-box;\n}\n.err { color: #f87171; font-size: 0.8rem; display: block; margin-top: 4px; }\n.check { display: flex; align-items: center; gap: 8px; }\n.check label { margin-bottom: 0; }\nbutton {\n  width: 100%;\n  padding: 10px;\n  background: #3b82f6;\n  color: white;\n  border: none;\n  border-radius: 6px;\n  font-weight: 600;\n  cursor: pointer;\n}\nbutton:hover { background: #2563eb; }\n.success { margin-top: 1rem; padding: 10px; background: #065f46; color: #6ee7b7; border-radius: 6px; text-align: center; }\n.hidden { display: none; }`,
    javascriptStarterCode: `const form = document.getElementById('regForm');\nconst email = document.getElementById('email');\nconst pass = document.getElementById('password');\nconst terms = document.getElementById('terms');\n\nform.onsubmit = (e) => {\n  e.preventDefault();\n  let valid = true;\n  document.getElementById('emailErr').textContent = '';\n  document.getElementById('passErr').textContent = '';\n  \n  if (!email.value.includes('@') || !email.value.includes('.')) {\n    document.getElementById('emailErr').textContent = 'Please enter a valid email address.';\n    valid = false;\n  }\n  if (pass.value.length < 8) {\n    document.getElementById('passErr').textContent = 'Password must be at least 8 characters long.';\n    valid = false;\n  }\n  if (!terms.checked) {\n    alert('Please accept terms.');\n    valid = false;\n  }\n  if (valid) {\n    document.getElementById('successMsg').classList.remove('hidden');\n  }\n};`,
    inputFormat: "Interactive browser inputs",
    outputFormat: "Interactive form submission feedback",
    constraints: "Client-side validation preventing invalid submission",
    examples: JSON.stringify([]),
    publicTestCases: JSON.stringify([]),
    privateTestCases: JSON.stringify([]),
    hints: JSON.stringify(["Use preventDefault to stop standard browser reload and execute checks."]),
    solutionExplanation: "JavaScript intercepts submit events, validates values against regex/length conditions, and displays messages.",
    timeLimit: 3000,
    memoryLimit: 256,
    createdAt: new Date().toISOString(),
  }
];

import { INCOMPLETE_STARTER_CODES, WEB_STARTERS } from "./applyStarterCodeUpdates.js";

for (const c of CODING_CHALLENGES_EXPANSION) {
  if (INCOMPLETE_STARTER_CODES[c.id]) {
    c.starterCode = JSON.stringify(INCOMPLETE_STARTER_CODES[c.id]);
  }
  if (WEB_STARTERS[c.id]) {
    c.javascriptStarterCode = WEB_STARTERS[c.id].javascriptStarterCode;
  }
}

