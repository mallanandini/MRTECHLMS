/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * INTERNAL REFERENCE SOLUTIONS:
 * Kept exclusively on the backend server for test automation and validation.
 * NEVER exported to frontend bundles or student GET API responses.
 */

export const REFERENCE_SOLUTIONS: Record<string, { python: string; javascript?: string; java?: string }> = {
  // Two Sum
  "challenge-two-sum": {
    python: `import sys

def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        comp = target - num
        if comp in seen:
            return f"{seen[comp]} {i}"
        seen[num] = i
    return ""

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 2:
        nums = [int(x) for x in lines[0].split()]
        target = int(lines[1])
        res = two_sum(nums, target)
        if res:
            print(res)
`
  },

  // Binary Search
  "challenge-bs-1-basic": {
    python: `import sys

def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if len(lines) >= 2:
        nums = [int(x) for x in lines[0].split()]
        target = int(lines[1])
        print(search(nums, target))
`
  },

  // Maximum Subarray (Kadane)
  "challenge-arr-1-max-subarray": {
    python: `import sys

def max_sub_array(nums):
    max_sum = cur_sum = nums[0]
    for x in nums[1:]:
        cur_sum = max(x, cur_sum + x)
        max_sum = max(max_sum, cur_sum)
    return max_sum

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        nums = [int(x) for x in line.split()]
        print(max_sub_array(nums))
`
  },

  // Valid Parentheses (Stack)
  "challenge-stk-1-valid-parentheses": {
    python: `import sys

def is_valid(s):
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack

if __name__ == "__main__":
    s = sys.stdin.read().strip()
    print("true" if is_valid(s) else "false")
`
  },

  // Shortest Path in Unweighted Grid (BFS)
  "challenge-bfs-1-grid-path": {
    python: `import sys
from collections import deque

def shortest_path_grid(grid):
    n = len(grid)
    if grid[0][0] != 0 or grid[n-1][n-1] != 0:
        return -1
    if n == 1:
        return 1

    queue = deque([(0, 0, 1)])
    visited = set([(0, 0)])

    while queue:
        r, c, dist = queue.popleft()
        if r == n - 1 and c == n - 1:
            return dist

        for dr, dc in [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and grid[nr][nc] == 0 and (nr, nc) not in visited:
                visited.add((nr, nc))
                queue.append((nr, nc, dist + 1))
    return -1

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        grid = [[int(x) for x in line.split()] for line in lines if line.strip()]
        print(shortest_path_grid(grid))
`
  },

  // Number of Islands (DFS)
  "challenge-dfs-1-islands": {
    python: `import sys

def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != '1':
            return
        grid[r][c] = '0'
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)
    return count

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        grid = [list(line.strip().replace(" ", "")) for line in lines if line.strip()]
        print(num_islands(grid))
`
  }
};
