/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "./mysql.js";

interface Starters {
  python?: string;
  javascript?: string;
  java?: string;
  sql?: string;
}

export const INCOMPLETE_STARTER_CODES: Record<string, Starters> = {
  // 1. Two Sum
  "challenge-two-sum": {
    python: `import sys

def two_sum(nums, target):
    # TODO: Write your solution here
    return ""

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 2:
        nums = [int(x) for x in lines[0].split()]
        target = int(lines[1])
        res = two_sum(nums, target)
        if res:
            print(res)
`,
    javascript: `const fs = require('fs');

function twoSum(nums, target) {
    // TODO: Write your solution here
    return "";
}

const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (input.length >= 2) {
    const nums = input[0].trim().split(/\\s+/).map(Number);
    const target = Number(input[1].trim());
    const res = twoSum(nums, target);
    if (res) console.log(res);
}
`,
    java: `import java.util.*;

public class Solution {
    public static String twoSum(int[] nums, int target) {
        // TODO: Write your solution here
        return "";
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        if (!sc.hasNextInt()) return;
        int target = sc.nextInt();
        String res = twoSum(nums, target);
        if (res != null && !res.isEmpty()) {
            System.out.println(res);
        }
    }
}
`
  },

  // 2. Prime Number
  "challenge-prime": {
    python: `import sys

def is_prime(n):
    # TODO: Write your primality test here
    return False

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        n = int(line)
        print("true" if is_prime(n) else "false")
`,
    javascript: `const fs = require('fs');

function isPrime(n) {
    // TODO: Write your primality test here
    return false;
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const n = Number(input);
    console.log(isPrime(n) ? "true" : "false");
}
`,
    java: `import java.util.*;

public class Solution {
    public static boolean isPrime(long n) {
        // TODO: Write your primality test here
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLong()) {
            long n = sc.nextLong();
            System.out.println(isPrime(n) ? "true" : "false");
        }
    }
}
`
  },

  // 3. Valid Palindrome
  "challenge-palindrome": {
    python: `import sys
import re

def is_palindrome(s):
    # TODO: Write your palindrome validation logic here
    return False

if __name__ == "__main__":
    s = sys.stdin.read().rstrip('\\r\\n')
    print("true" if is_palindrome(s) else "false")
`,
    javascript: `const fs = require('fs');

function isPalindrome(s) {
    // TODO: Write your palindrome validation logic here
    return false;
}

const input = fs.readFileSync(0, 'utf-8').replace(/[\\r\\n]+$/, '');
console.log(isPalindrome(input) ? "true" : "false");
`,
    java: `import java.util.*;

public class Solution {
    public static boolean isPalindrome(String s) {
        // TODO: Write your palindrome validation logic here
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";
        System.out.println(isPalindrome(s) ? "true" : "false");
    }
}
`
  },

  // 4. Reverse Words in a String
  "challenge-reverse-words": {
    python: `import sys

def reverse_words(s):
    # TODO: Write your logic to reverse the words in s
    return ""

if __name__ == "__main__":
    s = sys.stdin.read().strip()
    print(reverse_words(s))
`,
    javascript: `const fs = require('fs');

function reverseWords(s) {
    // TODO: Write your logic to reverse the words in s
    return "";
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(reverseWords(input));
`,
    java: `import java.util.*;

public class Solution {
    public static String reverseWords(String s) {
        // TODO: Write your logic to reverse the words in s
        return "";
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine().trim() : "";
        System.out.println(reverseWords(s));
    }
}
`
  },

  // 5. SQL Highest Scoring Students
  "challenge-sql-grades": {
    sql: `-- Write your SQL query below:
-- Select name, department, score for students with score >= 85
-- ordered by score DESC

`
  },

  // 6. Binary Search
  "challenge-bs-1-basic": {
    python: `import sys

def search(nums, target):
    # TODO: Write your binary search solution here (O(log n))
    return -1

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 2:
        nums = [int(x) for x in lines[0].split()]
        target = int(lines[1])
        print(search(nums, target))
`,
    javascript: `const fs = require('fs');

function search(nums, target) {
    // TODO: Write your binary search solution here (O(log n))
    return -1;
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
    const nums = lines[0].trim().split(/\\s+/).map(Number);
    const target = Number(lines[1].trim());
    console.log(search(nums, target));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int search(int[] nums, int target) {
        // TODO: Write your binary search solution here (O(log n))
        return -1;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        if (!sc.hasNextInt()) return;
        int target = sc.nextInt();
        System.out.println(search(nums, target));
    }
}
`
  },

  // 7. Search Insert Position
  "challenge-bs-2-insert-position": {
    python: `import sys

def search_insert(nums, target):
    # TODO: Write your solution here
    return 0

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 2:
        nums = [int(x) for x in lines[0].split()]
        target = int(lines[1])
        print(search_insert(nums, target))
`,
    javascript: `const fs = require('fs');

function searchInsert(nums, target) {
    // TODO: Write your solution here
    return 0;
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
    const nums = lines[0].trim().split(/\\s+/).map(Number);
    const target = Number(lines[1].trim());
    console.log(searchInsert(nums, target));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int searchInsert(int[] nums, int target) {
        // TODO: Write your solution here
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        if (!sc.hasNextInt()) return;
        int target = sc.nextInt();
        System.out.println(searchInsert(nums, target));
    }
}
`
  },

  // 8. Find First and Last Position of Element
  "challenge-bs-3-first-last-position": {
    python: `import sys

def find_range(nums, target):
    # TODO: Return starting and ending position as "start end" or "-1 -1"
    return "-1 -1"

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 2:
        nums = [int(x) for x in lines[0].split()]
        target = int(lines[1])
        print(find_range(nums, target))
`,
    javascript: `const fs = require('fs');

function findRange(nums, target) {
    // TODO: Return starting and ending position as "start end" or "-1 -1"
    return "-1 -1";
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
    const nums = lines[0].trim().split(/\\s+/).map(Number);
    const target = Number(lines[1].trim());
    console.log(findRange(nums, target));
}
`,
    java: `import java.util.*;

public class Solution {
    public static String findRange(int[] nums, int target) {
        // TODO: Return starting and ending position as "start end" or "-1 -1"
        return "-1 -1";
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        if (!sc.hasNextInt()) return;
        int target = sc.nextInt();
        System.out.println(findRange(nums, target));
    }
}
`
  },

  // 9. Find Minimum in Rotated Sorted Array
  "challenge-bs-4-rotated-min": {
    python: `import sys

def find_min(nums):
    # TODO: Return minimum element in O(log n) time
    return 0

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        nums = [int(x) for x in line.split()]
        print(find_min(nums))
`,
    javascript: `const fs = require('fs');

function findMin(nums) {
    // TODO: Return minimum element in O(log n) time
    return 0;
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const nums = input.split(/\\s+/).map(Number);
    console.log(findMin(nums));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int findMin(int[] nums) {
        // TODO: Return minimum element in O(log n) time
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        System.out.println(findMin(nums));
    }
}
`
  },

  // 10. Peak Index in Mountain Array
  "challenge-bs-5-mountain-peak": {
    python: `import sys

def peak_index_in_mountain_array(arr):
    # TODO: Find peak index in mountain array in O(log n) time
    return 0

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        arr = [int(x) for x in line.split()]
        print(peak_index_in_mountain_array(arr))
`,
    javascript: `const fs = require('fs');

function peakIndexInMountainArray(arr) {
    // TODO: Find peak index in mountain array in O(log n) time
    return 0;
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const arr = input.split(/\\s+/).map(Number);
    console.log(peakIndexInMountainArray(arr));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int peakIndexInMountainArray(int[] arr) {
        // TODO: Find peak index in mountain array in O(log n) time
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] arr = new int[parts.length];
        for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i]);
        System.out.println(peakIndexInMountainArray(arr));
    }
}
`
  },

  // 11. Integer Sqrt
  "challenge-bs-6-sqrt": {
    python: `import sys

def my_sqrt(x):
    # TODO: Compute and return the integer square root of x in O(log x) time
    return 0

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        x = int(line)
        print(my_sqrt(x))
`,
    javascript: `const fs = require('fs');

function mySqrt(x) {
    // TODO: Compute and return the integer square root of x in O(log x) time
    return 0;
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const x = Number(input);
    console.log(mySqrt(x));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int mySqrt(int x) {
        // TODO: Compute and return the integer square root of x in O(log x) time
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int x = sc.nextInt();
            System.out.println(mySqrt(x));
        }
    }
}
`
  },

  // 12. Maximum Subarray (Kadane)
  "challenge-arr-1-max-subarray": {
    python: `import sys

def max_sub_array(nums):
    # TODO: Find contiguous subarray with largest sum (Kadane's algorithm)
    return 0

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        nums = [int(x) for x in line.split()]
        print(max_sub_array(nums))
`,
    javascript: `const fs = require('fs');

function maxSubArray(nums) {
    // TODO: Find contiguous subarray with largest sum (Kadane's algorithm)
    return 0;
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const nums = input.split(/\\s+/).map(Number);
    console.log(maxSubArray(nums));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int maxSubArray(int[] nums) {
        // TODO: Find contiguous subarray with largest sum (Kadane's algorithm)
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        System.out.println(maxSubArray(nums));
    }
}
`
  },

  // 13. Best Time to Buy and Sell Stock
  "challenge-arr-2-stock-profit": {
    python: `import sys

def max_profit(prices):
    # TODO: Calculate maximum profit achievable from a single buy and sell
    return 0

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        prices = [int(x) for x in line.split()]
        print(max_profit(prices))
`,
    javascript: `const fs = require('fs');

function maxProfit(prices) {
    // TODO: Calculate maximum profit achievable from a single buy and sell
    return 0;
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const prices = input.split(/\\s+/).map(Number);
    console.log(maxProfit(prices));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int maxProfit(int[] prices) {
        // TODO: Calculate maximum profit achievable from a single buy and sell
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] prices = new int[parts.length];
        for (int i = 0; i < parts.length; i++) prices[i] = Integer.parseInt(parts[i]);
        System.out.println(maxProfit(prices));
    }
}
`
  },

  // 14. Contains Duplicate
  "challenge-arr-3-contains-duplicate": {
    python: `import sys

def contains_duplicate(nums):
    # TODO: Return True if any value appears at least twice, False otherwise
    return False

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        nums = [int(x) for x in line.split()]
        print("true" if contains_duplicate(nums) else "false")
`,
    javascript: `const fs = require('fs');

function containsDuplicate(nums) {
    // TODO: Return true if any value appears at least twice, false otherwise
    return false;
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const nums = input.split(/\\s+/).map(Number);
    console.log(containsDuplicate(nums) ? "true" : "false");
}
`,
    java: `import java.util.*;

public class Solution {
    public static boolean containsDuplicate(int[] nums) {
        // TODO: Return true if any value appears at least twice, false otherwise
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        System.out.println(containsDuplicate(nums) ? "true" : "false");
    }
}
`
  },

  // 15. Move Zeroes
  "challenge-arr-4-move-zeroes": {
    python: `import sys

def move_zeroes(nums):
    # TODO: Move all 0's to the end while maintaining the relative order of non-zeros in-place
    pass

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        nums = [int(x) for x in line.split()]
        move_zeroes(nums)
        print(" ".join(str(x) for x in nums))
`,
    javascript: `const fs = require('fs');

function moveZeroes(nums) {
    // TODO: Move all 0's to the end while maintaining the relative order of non-zeros in-place
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const nums = input.split(/\\s+/).map(Number);
    moveZeroes(nums);
    console.log(nums.join(' '));
}
`,
    java: `import java.util.*;

public class Solution {
    public static void moveZeroes(int[] nums) {
        // TODO: Move all 0's to the end while maintaining the relative order of non-zeros in-place
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        moveZeroes(nums);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < nums.length; i++) {
            sb.append(nums[i]);
            if (i < nums.length - 1) sb.append(" ");
        }
        System.out.println(sb.toString());
    }
}
`
  },

  // 16. Rotate Array
  "challenge-arr-5-rotate-array": {
    python: `import sys

def rotate(nums, k):
    # TODO: Rotate the array to the right by k steps in-place
    pass

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 2:
        nums = [int(x) for x in lines[0].split()]
        k = int(lines[1])
        rotate(nums, k)
        print(" ".join(str(x) for x in nums))
`,
    javascript: `const fs = require('fs');

function rotate(nums, k) {
    // TODO: Rotate the array to the right by k steps in-place
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
    const nums = lines[0].trim().split(/\\s+/).map(Number);
    const k = Number(lines[1].trim());
    rotate(nums, k);
    console.log(nums.join(' '));
}
`,
    java: `import java.util.*;

public class Solution {
    public static void rotate(int[] nums, int k) {
        // TODO: Rotate the array to the right by k steps in-place
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        if (!sc.hasNextInt()) return;
        int k = sc.nextInt();
        rotate(nums, k);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < nums.length; i++) {
            sb.append(nums[i]);
            if (i < nums.length - 1) sb.append(" ");
        }
        System.out.println(sb.toString());
    }
}
`
  },

  // 17. Majority Element
  "challenge-arr-6-majority-element": {
    python: `import sys

def majority_element(nums):
    # TODO: Find element appearing more than ⌊n / 2⌋ times (Boyer-Moore voting)
    return 0

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        nums = [int(x) for x in line.split()]
        print(majority_element(nums))
`,
    javascript: `const fs = require('fs');

function majorityElement(nums) {
    // TODO: Find element appearing more than ⌊n / 2⌋ times (Boyer-Moore voting)
    return 0;
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const nums = input.split(/\\s+/).map(Number);
    console.log(majorityElement(nums));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int majorityElement(int[] nums) {
        // TODO: Find element appearing more than ⌊n / 2⌋ times (Boyer-Moore voting)
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        System.out.println(majorityElement(nums));
    }
}
`
  },

  // 18. Merge Sorted Array
  "challenge-arr-7-merge-sorted": {
    python: `import sys

def merge(nums1, m, nums2, n):
    # TODO: Merge nums2 into nums1 as one sorted array in-place
    pass

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 4:
        nums1 = [int(x) for x in lines[0].split()]
        m = int(lines[1])
        nums2 = [int(x) for x in lines[2].split()] if lines[2].strip() else []
        n = int(lines[3])
        merge(nums1, m, nums2, n)
        print(" ".join(str(x) for x in nums1))
`,
    javascript: `const fs = require('fs');

function merge(nums1, m, nums2, n) {
    // TODO: Merge nums2 into nums1 as one sorted array in-place
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 4) {
    const nums1 = lines[0].trim().split(/\\s+/).map(Number);
    const m = Number(lines[1].trim());
    const nums2 = lines[2].trim() ? lines[2].trim().split(/\\s+/).map(Number) : [];
    const n = Number(lines[3].trim());
    merge(nums1, m, nums2, n);
    console.log(nums1.join(' '));
}
`,
    java: `import java.util.*;

public class Solution {
    public static void merge(int[] nums1, int m, int[] nums2, int n) {
        // TODO: Merge nums2 into nums1 as one sorted array in-place
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] p1 = sc.nextLine().trim().split("\\\\s+");
        int[] nums1 = new int[p1.length];
        for (int i = 0; i < p1.length; i++) nums1[i] = Integer.parseInt(p1[i]);
        int m = sc.nextInt();
        sc.nextLine();
        String line3 = sc.hasNextLine() ? sc.nextLine().trim() : "";
        int[] nums2 = line3.isEmpty() ? new int[0] : Arrays.stream(line3.split("\\\\s+")).mapToInt(Integer::parseInt).toArray();
        int n = sc.hasNextInt() ? sc.nextInt() : 0;
        merge(nums1, m, nums2, n);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < nums1.length; i++) {
            sb.append(nums1[i]);
            if (i < nums1.length - 1) sb.append(" ");
        }
        System.out.println(sb.toString());
    }
}
`
  },

  // 19. Product of Array Except Self
  "challenge-arr-8-product-except-self": {
    python: `import sys

def product_except_self(nums):
    # TODO: Return array where output[i] is product of all elements except nums[i] in O(n) without division
    return []

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        nums = [int(x) for x in line.split()]
        print(" ".join(str(x) for x in product_except_self(nums)))
`,
    javascript: `const fs = require('fs');

function productExceptSelf(nums) {
    // TODO: Return array where output[i] is product of all elements except nums[i] in O(n) without division
    return [];
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const nums = input.split(/\\s+/).map(Number);
    console.log(productExceptSelf(nums).join(' '));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int[] productExceptSelf(int[] nums) {
        // TODO: Return array where output[i] is product of all elements except nums[i] in O(n) without division
        return new int[0];
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        int[] res = productExceptSelf(nums);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < res.length; i++) {
            sb.append(res[i]);
            if (i < res.length - 1) sb.append(" ");
        }
        System.out.println(sb.toString());
    }
}
`
  },

  // 20. Valid Parentheses
  "challenge-stk-1-valid-parentheses": {
    python: `import sys

def is_valid(s):
    # TODO: Use stack to determine if the input brackets are valid
    return False

if __name__ == "__main__":
    s = sys.stdin.read().strip()
    print("true" if is_valid(s) else "false")
`,
    javascript: `const fs = require('fs');

function isValid(s) {
    // TODO: Use stack to determine if the input brackets are valid
    return false;
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(isValid(input) ? "true" : "false");
`,
    java: `import java.util.*;

public class Solution {
    public static boolean isValid(String s) {
        // TODO: Use stack to determine if the input brackets are valid
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine().trim() : "";
        System.out.println(isValid(s) ? "true" : "false");
    }
}
`
  },

  // 21. Evaluate Reverse Polish Notation
  "challenge-stk-2-eval-rpn": {
    python: `import sys

def eval_rpn(tokens):
    # TODO: Evaluate arithmetic expression in Reverse Polish Notation using stack
    return 0

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        tokens = line.split()
        print(eval_rpn(tokens))
`,
    javascript: `const fs = require('fs');

function evalRPN(tokens) {
    // TODO: Evaluate arithmetic expression in Reverse Polish Notation using stack
    return 0;
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const tokens = input.split(/\\s+/);
    console.log(evalRPN(tokens));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int evalRPN(String[] tokens) {
        // TODO: Evaluate arithmetic expression in Reverse Polish Notation using stack
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] tokens = sc.nextLine().trim().split("\\\\s+");
        System.out.println(evalRPN(tokens));
    }
}
`
  },

  // 22. Daily Temperatures
  "challenge-stk-3-daily-temperatures": {
    python: `import sys

def daily_temperatures(temperatures):
    # TODO: Use monotonic stack to calculate days until a warmer temperature
    return []

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        temps = [int(x) for x in line.split()]
        print(" ".join(str(x) for x in daily_temperatures(temps)))
`,
    javascript: `const fs = require('fs');

function dailyTemperatures(temperatures) {
    // TODO: Use monotonic stack to calculate days until a warmer temperature
    return [];
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const temps = input.split(/\\s+/).map(Number);
    console.log(dailyTemperatures(temps).join(' '));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int[] dailyTemperatures(int[] temperatures) {
        // TODO: Use monotonic stack to calculate days until a warmer temperature
        return new int[0];
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] temps = new int[parts.length];
        for (int i = 0; i < parts.length; i++) temps[i] = Integer.parseInt(parts[i]);
        int[] res = dailyTemperatures(temps);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < res.length; i++) {
            sb.append(res[i]);
            if (i < res.length - 1) sb.append(" ");
        }
        System.out.println(sb.toString());
    }
}
`
  },

  // 23. Next Greater Element
  "challenge-stk-6-next-greater": {
    python: `import sys

def next_greater_elements(nums):
    # TODO: Return next greater element for each number using stack
    return []

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        nums = [int(x) for x in line.split()]
        print(" ".join(str(x) for x in next_greater_elements(nums)))
`,
    javascript: `const fs = require('fs');

function nextGreaterElements(nums) {
    // TODO: Return next greater element for each number using stack
    return [];
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const nums = input.split(/\\s+/).map(Number);
    console.log(nextGreaterElements(nums).join(' '));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int[] nextGreaterElements(int[] nums) {
        // TODO: Return next greater element for each number using stack
        return new int[0];
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        int[] res = nextGreaterElements(nums);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < res.length; i++) {
            sb.append(res[i]);
            if (i < res.length - 1) sb.append(" ");
        }
        System.out.println(sb.toString());
    }
}
`
  },

  // 24. Simplify Unix Path
  "challenge-lifo-4-simplify-path": {
    python: `import sys

def simplify_path(path):
    # TODO: Simplify Unix file path using LIFO stack
    return "/"

if __name__ == "__main__":
    path = sys.stdin.read().strip()
    print(simplify_path(path))
`,
    javascript: `const fs = require('fs');

function simplifyPath(path) {
    // TODO: Simplify Unix file path using LIFO stack
    return "/";
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(simplifyPath(input));
`,
    java: `import java.util.*;

public class Solution {
    public static String simplifyPath(String path) {
        // TODO: Simplify Unix file path using LIFO stack
        return "/";
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String path = sc.hasNextLine() ? sc.nextLine().trim() : "";
        System.out.println(simplifyPath(path));
    }
}
`
  },

  // 25. Min Stack
  "challenge-lifo-5-min-stack": {
    python: `import sys

class MinStack:
    def __init__(self):
        # TODO: Initialize stack data structures
        pass

    def push(self, val: int) -> None:
        # TODO: Push element val onto stack
        pass

    def pop(self) -> None:
        # TODO: Remove element on top of stack
        pass

    def top(self) -> int:
        # TODO: Get top element
        return 0

    def get_min(self) -> int:
        # TODO: Retrieve minimum element in stack
        return 0

def run_min_stack(ops, vals):
    ms = MinStack()
    out = []
    for op, val in zip(ops, vals):
        if op == "push":
            ms.push(val)
        elif op == "pop":
            ms.pop()
        elif op == "top":
            out.append(str(ms.top()))
        elif op == "getMin":
            out.append(str(ms.get_min()))
    return " ".join(out)

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 2:
        ops = lines[0].split()
        vals = [int(x) if x != "null" else 0 for x in lines[1].split()]
        print(run_min_stack(ops, vals))
`,
    javascript: `const fs = require('fs');

class MinStack {
    constructor() {
        // TODO: Initialize stack data structures
    }

    push(val) {
        // TODO: Push element val onto stack
    }

    pop() {
        // TODO: Remove element on top of stack
    }

    top() {
        // TODO: Get top element
        return 0;
    }

    getMin() {
        // TODO: Retrieve minimum element in stack
        return 0;
    }
}

function runMinStack(ops, vals) {
    const ms = new MinStack();
    const out = [];
    for (let i = 0; i < ops.length; i++) {
        if (ops[i] === "push") ms.push(vals[i]);
        else if (ops[i] === "pop") ms.pop();
        else if (ops[i] === "top") out.push(ms.top());
        else if (ops[i] === "getMin") out.push(ms.getMin());
    }
    return out.join(' ');
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
    const ops = lines[0].trim().split(/\\s+/);
    const vals = lines[1].trim().split(/\\s+/).map(x => x === "null" ? 0 : Number(x));
    console.log(runMinStack(ops, vals));
}
`,
    java: `import java.util.*;

class MinStack {
    // TODO: Declare internal stacks for values and minimums

    public MinStack() {
        // TODO: Initialize internal data structures
    }

    public void push(int val) {
        // TODO: Push element onto stack
    }

    public void pop() {
        // TODO: Remove element on top of stack
    }

    public int top() {
        // TODO: Return top element
        return 0;
    }

    public int getMin() {
        // TODO: Retrieve minimum element in stack
        return 0;
    }
}

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] ops = sc.nextLine().trim().split("\\\\s+");
        if (!sc.hasNextLine()) return;
        String[] valStrs = sc.nextLine().trim().split("\\\\s+");
        int[] vals = new int[valStrs.length];
        for (int i = 0; i < valStrs.length; i++) {
            vals[i] = valStrs[i].equals("null") ? 0 : Integer.parseInt(valStrs[i]);
        }

        MinStack ms = new MinStack();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < ops.length; i++) {
            if (ops[i].equals("push")) ms.push(vals[i]);
            else if (ops[i].equals("pop")) ms.pop();
            else if (ops[i].equals("top")) out.add(String.valueOf(ms.top()));
            else if (ops[i].equals("getMin")) out.add(String.valueOf(ms.getMin()));
        }
        System.out.println(String.join(" ", out));
    }
}
`
  },

  // 26. Shortest Path in Unweighted Grid (BFS)
  "challenge-bfs-1-grid-path": {
    python: `import sys
from collections import deque

def shortest_path_grid(grid):
    # TODO: Find shortest path from top-left to bottom-right using 8-directional BFS
    return -1

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        grid = [[int(x) for x in line.split()] for line in lines if line.strip()]
        print(shortest_path_grid(grid))
`,
    javascript: `const fs = require('fs');

function shortestPathGrid(grid) {
    // TODO: Find shortest path from top-left to bottom-right using 8-directional BFS
    return -1;
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length > 0) {
    const grid = lines.filter(l => l.trim()).map(l => l.trim().split(/\\s+/).map(Number));
    console.log(shortestPathGrid(grid));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int shortestPathGrid(int[][] grid) {
        // TODO: Find shortest path from top-left to bottom-right using 8-directional BFS
        return -1;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<int[]> rows = new ArrayList<>();
        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim();
            if (line.isEmpty()) continue;
            String[] parts = line.split("\\\\s+");
            int[] row = new int[parts.length];
            for (int i = 0; i < parts.length; i++) row[i] = Integer.parseInt(parts[i]);
            rows.add(row);
        }
        int[][] grid = rows.toArray(new int[0][]);
        System.out.println(shortestPathGrid(grid));
    }
}
`
  },

  // 27. Level Order Traversal (BFS)
  "challenge-bfs-2-level-order": {
    python: `import sys
from collections import deque
import json

def level_order(nodes):
    # TODO: Return level-order traversal of the tree nodes as list of lists
    return []

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        nodes = line.split()
        res = level_order(nodes)
        print(json.dumps(res))
`,
    javascript: `const fs = require('fs');

function levelOrder(nodes) {
    // TODO: Return level-order traversal of the tree nodes as array of arrays
    return [];
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const nodes = input.split(/\\s+/);
    console.log(JSON.stringify(levelOrder(nodes)));
}
`,
    java: `import java.util.*;

public class Solution {
    public static String levelOrder(String[] nodes) {
        // TODO: Return level-order traversal formatted as JSON string
        return "[]";
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] nodes = sc.nextLine().trim().split("\\\\s+");
        System.out.println(levelOrder(nodes));
    }
}
`
  },

  // 28. Rotting Oranges (BFS)
  "challenge-bfs-3-rotten-oranges": {
    python: `import sys
from collections import deque

def oranges_rotting(grid):
    # TODO: Multi-source BFS to calculate minimum minutes until no fresh orange remains
    return -1

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        grid = [[int(x) for x in line.split()] for line in lines if line.strip()]
        print(oranges_rotting(grid))
`,
    javascript: `const fs = require('fs');

function orangesRotting(grid) {
    // TODO: Multi-source BFS to calculate minimum minutes until no fresh orange remains
    return -1;
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length > 0) {
    const grid = lines.filter(l => l.trim()).map(l => l.trim().split(/\\s+/).map(Number));
    console.log(orangesRotting(grid));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int orangesRotting(int[][] grid) {
        // TODO: Multi-source BFS to calculate minimum minutes until no fresh orange remains
        return -1;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<int[]> rows = new ArrayList<>();
        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim();
            if (line.isEmpty()) continue;
            String[] parts = line.split("\\\\s+");
            int[] row = new int[parts.length];
            for (int i = 0; i < parts.length; i++) row[i] = Integer.parseInt(parts[i]);
            rows.add(row);
        }
        int[][] grid = rows.toArray(new int[0][]);
        System.out.println(orangesRotting(grid));
    }
}
`
  },

  // 29. Word Ladder (BFS)
  "challenge-bfs-4-word-ladder-dist": {
    python: `import sys
from collections import deque

def ladder_length(begin_word, end_word, word_list):
    # TODO: Return length of shortest transformation sequence from begin_word to end_word using BFS
    return 0

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 3:
        begin = lines[0].strip()
        end = lines[1].strip()
        words = lines[2].strip().split()
        print(ladder_length(begin, end, words))
`,
    javascript: `const fs = require('fs');

function ladderLength(beginWord, endWord, wordList) {
    // TODO: Return length of shortest transformation sequence from beginWord to endWord using BFS
    return 0;
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 3) {
    const begin = lines[0].trim();
    const end = lines[1].trim();
    const words = lines[2].trim().split(/\\s+/);
    console.log(ladderLength(begin, end, words));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int ladderLength(String beginWord, String endWord, List<String> wordList) {
        // TODO: Return length of shortest transformation sequence from beginWord to endWord using BFS
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String begin = sc.nextLine().trim();
        if (!sc.hasNextLine()) return;
        String end = sc.nextLine().trim();
        if (!sc.hasNextLine()) return;
        List<String> words = Arrays.asList(sc.nextLine().trim().split("\\\\s+"));
        System.out.println(ladderLength(begin, end, words));
    }
}
`
  },

  // 30. Number of Islands (DFS)
  "challenge-dfs-1-islands": {
    python: `import sys

def num_islands(grid):
    # TODO: Count connected components of '1's (islands) using DFS
    return 0

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        grid = [list(line.strip().replace(" ", "")) for line in lines if line.strip()]
        print(num_islands(grid))
`,
    javascript: `const fs = require('fs');

function numIslands(grid) {
    // TODO: Count connected components of '1's (islands) using DFS
    return 0;
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length > 0) {
    const grid = lines.filter(l => l.trim()).map(l => l.trim().replace(/\\s+/g, '').split(''));
    console.log(numIslands(grid));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int numIslands(char[][] grid) {
        // TODO: Count connected components of '1's (islands) using DFS
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<char[]> rows = new ArrayList<>();
        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim().replace(" ", "");
            if (line.isEmpty()) continue;
            rows.add(line.toCharArray());
        }
        char[][] grid = rows.toArray(new char[0][]);
        System.out.println(numIslands(grid));
    }
}
`
  },

  // 31. Flood Fill (DFS)
  "challenge-dfs-2-flood-fill": {
    python: `import sys

def flood_fill(image, sr, sc, color):
    # TODO: Perform flood fill from pixel (sr, sc) with new color using DFS
    return image

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        # First lines are rows of image, last line has sr, sc, color
        params = [int(x) for x in lines[-1].split()]
        sr, sc_coord, color = params[0], params[1], params[2]
        image = [[int(x) for x in l.split()] for l in lines[:-1] if l.strip()]
        res = flood_fill(image, sr, sc_coord, color)
        for row in res:
            print(" ".join(str(x) for x in row))
`,
    javascript: `const fs = require('fs');

function floodFill(image, sr, sc, color) {
    // TODO: Perform flood fill from pixel (sr, sc) with new color using DFS
    return image;
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n').filter(l => l.trim());
if (lines.length >= 2) {
    const params = lines[lines.length - 1].trim().split(/\\s+/).map(Number);
    const [sr, sc, color] = params;
    const image = lines.slice(0, -1).map(l => l.trim().split(/\\s+/).map(Number));
    const res = floodFill(image, sr, sc, color);
    res.forEach(row => console.log(row.join(' ')));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int[][] floodFill(int[][] image, int sr, int sc, int color) {
        // TODO: Perform flood fill from pixel (sr, sc) with new color using DFS
        return image;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<int[]> rows = new ArrayList<>();
        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim();
            if (line.isEmpty()) continue;
            String[] parts = line.split("\\\\s+");
            int[] row = new int[parts.length];
            for (int i = 0; i < parts.length; i++) row[i] = Integer.parseInt(parts[i]);
            rows.add(row);
        }
        int[] params = rows.remove(rows.size() - 1);
        int sr = params[0], scCoord = params[1], color = params[2];
        int[][] image = rows.toArray(new int[0][]);
        int[][] res = floodFill(image, sr, scCoord, color);
        for (int[] row : res) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < row.length; i++) {
                sb.append(row[i]);
                if (i < row.length - 1) sb.append(" ");
            }
            System.out.println(sb.toString());
        }
    }
}
`
  },

  // 32. Maximum Depth of Binary Tree (DFS)
  "challenge-dfs-3-max-depth": {
    python: `import sys

def max_depth(nodes):
    # TODO: Compute maximum depth of binary tree using recursive DFS
    return 0

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        nodes = line.split()
        print(max_depth(nodes))
`,
    javascript: `const fs = require('fs');

function maxDepth(nodes) {
    // TODO: Compute maximum depth of binary tree using recursive DFS
    return 0;
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const nodes = input.split(/\\s+/);
    console.log(maxDepth(nodes));
}
`,
    java: `import java.util.*;

public class Solution {
    public static int maxDepth(String[] nodes) {
        // TODO: Compute maximum depth of binary tree using recursive DFS
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] nodes = sc.nextLine().trim().split("\\\\s+");
        System.out.println(maxDepth(nodes));
    }
}
`
  },

  // 33. Path Sum (DFS)
  "challenge-dfs-4-path-sum": {
    python: `import sys

def has_path_sum(nodes, target_sum):
    # TODO: Return True if tree has a root-to-leaf path summing to target_sum
    return False

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 2:
        nodes = lines[0].split()
        target = int(lines[1])
        print("true" if has_path_sum(nodes, target) else "false")
`,
    javascript: `const fs = require('fs');

function hasPathSum(nodes, targetSum) {
    // TODO: Return true if tree has a root-to-leaf path summing to targetSum
    return false;
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
    const nodes = lines[0].trim().split(/\\s+/);
    const target = Number(lines[1].trim());
    console.log(hasPathSum(nodes, target) ? "true" : "false");
}
`,
    java: `import java.util.*;

public class Solution {
    public static boolean hasPathSum(String[] nodes, int targetSum) {
        // TODO: Return true if tree has a root-to-leaf path summing to targetSum
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] nodes = sc.nextLine().trim().split("\\\\s+");
        if (!sc.hasNextInt()) return;
        int target = sc.nextInt();
        System.out.println(hasPathSum(nodes, target) ? "true" : "false");
    }
}
`
  },

  // 34. Target Sum Subsets (Backtracking DFS)
  "challenge-dfs-5-target-sum-subsets": {
    python: `import sys
import json

def target_sum_subsets(nums, target):
    # TODO: Use backtracking DFS to find all unique combinations of nums that sum to target
    return []

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 2:
        nums = [int(x) for x in lines[0].split()]
        target = int(lines[1])
        res = target_sum_subsets(nums, target)
        print(json.dumps(res))
`,
    javascript: `const fs = require('fs');

function targetSumSubsets(nums, target) {
    // TODO: Use backtracking DFS to find all unique combinations of nums that sum to target
    return [];
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
    const nums = lines[0].trim().split(/\\s+/).map(Number);
    const target = Number(lines[1].trim());
    console.log(JSON.stringify(targetSumSubsets(nums, target)));
}
`,
    java: `import java.util.*;

public class Solution {
    public static String targetSumSubsets(int[] nums, int target) {
        // TODO: Use backtracking DFS to find all unique combinations of nums that sum to target
        return "[]";
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        if (!sc.hasNextInt()) return;
        int target = sc.nextInt();
        System.out.println(targetSumSubsets(nums, target));
    }
}
`
  },

  // 35. Python Word Frequency Counter
  "challenge-py-1-word-frequency": {
    python: `import sys
import json

def count_frequencies(text):
    # TODO: Clean punctuation, lowercase words, and count word frequencies
    return {}

if __name__ == "__main__":
    text = sys.stdin.read().strip()
    if text:
        print(json.dumps(count_frequencies(text)))
`
  }
};

export const WEB_STARTERS: Record<string, { javascriptStarterCode: string }> = {
  "challenge-web-counter": {
    javascriptStarterCode: `// TODO: Implement interactive counter
// 1. Maintain the current count state variable
// 2. Add event listeners for #incBtn, #decBtn, and #resetBtn
// 3. Update #counterValue text and color classes (.positive, .negative, .zero)

let count = 0;
const valEl = document.getElementById('counterValue');

function updateDisplay() {
  // Write display update logic
}
`
  },
  "challenge-web-form-val": {
    javascriptStarterCode: `// TODO: Implement client-side form validation
// 1. Listen for form submit on #regForm
// 2. Validate email (must contain '@' and '.')
// 3. Validate password (length >= 8)
// 4. Validate terms checkbox is checked
// 5. Display error messages in #emailErr, #passErr or reveal #successMsg

const form = document.getElementById('regForm');
const email = document.getElementById('email');
const pass = document.getElementById('password');
const terms = document.getElementById('terms');

form.onsubmit = (e) => {
  e.preventDefault();
  // Write your validation logic here
};
`
  },
  "challenge-web-navbar": {
    javascriptStarterCode: `// Responsive Navigation Bar
// TODO: Add interactive mobile menu toggle or event listeners if required
const ctaBtn = document.getElementById('ctaBtn');
if (ctaBtn) {
  ctaBtn.addEventListener('click', () => {
    // Action when CTA button is clicked
  });
}
`
  },
  "challenge-web-todo": {
    javascriptStarterCode: `// TODO: Implement Todo List functionality
// 1. Add new todo item to #taskList when #addBtn is clicked or Enter is pressed
// 2. Toggle 'done' class when a list item is clicked
// 3. Remove the list item when the delete (.del) button is clicked

const input = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const list = document.getElementById('taskList');

// Write your event handlers here
`
  }
};

export async function applyUpdates() {
  console.log("=== APPLYING INCOMPLETE STARTER CODE TO DATABASE ===");
  let updatedCount = 0;

  for (const [id, starter] of Object.entries(INCOMPLETE_STARTER_CODES)) {
    const starterJson = JSON.stringify(starter);
    const [result]: any = await pool.query(
      "UPDATE coding_challenges SET starterCode = ? WHERE id = ?",
      [starterJson, id]
    );
    if (result.affectedRows > 0) {
      updatedCount++;
      console.log(`✅ [${id}] Updated starterCode in MySQL`);
    } else {
      console.log(`⚠️ [${id}] Challenge not found in DB`);
    }
  }

  for (const [id, starter] of Object.entries(WEB_STARTERS)) {
    const [result]: any = await pool.query(
      "UPDATE coding_challenges SET javascriptStarterCode = ? WHERE id = ?",
      [starter.javascriptStarterCode, id]
    );
    if (result.affectedRows > 0) {
      updatedCount++;
      console.log(`✅ [${id}] Updated web javascriptStarterCode in MySQL`);
    } else {
      console.log(`⚠️ [${id}] Web challenge not found in DB`);
    }
  }

  console.log(`\n🎉 Total challenges updated in MySQL: ${updatedCount}`);
}

// Self-run when executed directly
if (process.argv[1]?.includes("applyStarterCodeUpdates")) {
  applyUpdates().then(() => process.exit(0)).catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}

