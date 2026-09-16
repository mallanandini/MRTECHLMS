/**
 * Automated Verification Script: Two-Portal Architecture (Student & Admin)
 * Tests:
 * 1. Student login, Admin login, Trainer blocked (403), Public student registration blocked (403)
 * 2. Admin registration API (/api/auth/admin-register)
 * 3. Role segregation (Student blocked from admin endpoints)
 * 4. Admin-controlled course access (Student with 0 courses gets 403 on course player/lessons/progress)
 * 5. Common features always accessible to student with 0 courses (Coding practice, blogs, profile, preferences)
 * 6. Admin Grant and Revoke access flow (Access granted -> 200, Access revoked -> 403)
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 TESTING TWO-PORTAL ARCHITECTURE & ACCESS CONTROLS');
  console.log('====================================================\n');

  // TEST 1: Authentication & Portals Isolation
  console.log('--- TEST GROUP 1: Authentication & Portal Isolation ---');

  // 1.1 Student Login
  const studentRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@lms.com', password: 'student123' })
  });
  const studentData = await studentRes.json();
  assert(studentRes.status === 200 && studentData.token && studentData.user.role === 'student',
    'Student login succeeds with role "student"');
  const studentToken = studentData.token;

  // 1.2 Student trying to log into Admin Portal
  const studentIntoAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@lms.com', password: 'student123', portal: 'admin' })
  });
  assert(studentIntoAdminRes.status === 403,
    'Student logging into Admin portal is rejected with 403 Forbidden');

  // 1.3 Admin Login
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@lms.com', password: 'admin123' })
  });
  const adminData = await adminRes.json();
  assert(adminRes.status === 200 && adminData.token && adminData.user.role === 'admin',
    'Admin login succeeds with role "admin"');
  const adminToken = adminData.token;

  // 1.4 Admin trying to log into Student Portal
  const adminIntoStudentRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@lms.com', password: 'admin123', portal: 'student' })
  });
  assert(adminIntoStudentRes.status === 403,
    'Admin logging into Student portal is rejected with 403 Forbidden');

  // 1.5 Trainer Login is Disabled
  const trainerRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'trainer@lms.com', password: 'trainer123' })
  });
  assert(trainerRes.status === 403,
    'Trainer login is strictly disabled and rejected with 403 Forbidden');

  // 1.6 Public Student Registration is Disabled
  const publicRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Hacker', email: 'hacker@test.com', password: 'password123' })
  });
  assert(publicRegRes.status === 403,
    'Public registration is strictly disabled and rejected with 403 Forbidden');

  // 1.7 Admin Registration API (/api/auth/admin-register)
  const uniqueAdminEmail = `newadmin_${Date.now()}@lms.com`;
  const adminRegRes = await fetch(`${BASE_URL}/api/auth/admin-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Newly Created Administrator',
      email: uniqueAdminEmail,
      password: 'adminsecret123'
    })
  });
  const adminRegData = await adminRegRes.json();
  assert(adminRegRes.status === 201 && adminRegData.token && adminRegData.user.role === 'admin',
    'Admin registration succeeds with 201 Created and generates admin token');

  // Duplicate Admin Registration
  const dupAdminRegRes = await fetch(`${BASE_URL}/api/auth/admin-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Admin',
      email: uniqueAdminEmail,
      password: 'adminsecret123'
    })
  });
  assert(dupAdminRegRes.status === 409,
    'Duplicate admin registration rejected with 409 Conflict');

  // Short password validation
  const shortPassRes = await fetch(`${BASE_URL}/api/auth/admin-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Admin Short',
      email: `short_${Date.now()}@lms.com`,
      password: '123'
    })
  });
  assert(shortPassRes.status === 400,
    'Admin registration with short password rejected with 400 Bad Request');

  console.log('\n--- TEST GROUP 2: Role Segregation & Admin Protection ---');

  // 2.1 Student cannot view Admin User Directory
  const studentAdminUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  assert(studentAdminUsersRes.status === 403,
    'Student attempting to fetch /api/admin/users is blocked with 403 Forbidden');

  // 2.2 Student cannot access Admin Dashboard stats
  const studentAdminDashRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  assert(studentAdminDashRes.status === 403,
    'Student attempting to fetch /api/admin/dashboard is blocked with 403 Forbidden');

  // 2.3 Admin can access Admin User Directory
  const adminUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminUsersRes.status === 200,
    'Admin successfully accesses /api/admin/users with 200 OK');

  console.log('\n--- TEST GROUP 3: Admin-Controlled Course Access vs Common Features ---');

  // Fetch actual courses from MySQL
  const allCoursesRes = await fetch(`${BASE_URL}/api/courses`);
  const allCourses = await allCoursesRes.json();
  assert(allCourses.length > 0, `Catalog has published courses (found ${allCourses.length})`);
  const testCourse = allCourses[0];
  const testCourseId = testCourse.id;

  // 3.1 Admin provisions a new Student with ZERO assigned courses
  const zeroStudentEmail = `zero_student_${Date.now()}@lms.com`;
  const createStudentRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Student Zero Course',
      email: zeroStudentEmail,
      password: 'password123',
      role: 'student',
      status: 'active'
    })
  });
  const createdStudent = await createStudentRes.json();
  assert(createStudentRes.status === 201 && createdStudent.id,
    'Admin successfully provisions a new student with 0 courses');

  // 3.2 Login as the zero-course student
  const zeroLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: zeroStudentEmail, password: 'password123' })
  });
  const zeroLoginData = await zeroLoginRes.json();
  const zeroToken = zeroLoginData.token;
  assert(zeroLoginRes.status === 200 && zeroToken,
    'Zero-course student logs in successfully');

  // 3.3 Verify Student Dashboard stats has 0 courseProgress items
  const zeroDashRes = await fetch(`${BASE_URL}/api/student/dashboard`, {
    headers: { 'Authorization': `Bearer ${zeroToken}` }
  });
  const zeroDashData = await zeroDashRes.json();
  assert(zeroDashRes.status === 200 && zeroDashData.courseProgress?.length === 0,
    'Student Dashboard reports 0 enrolled courses (triggers empty state)');

  // 3.4 Student with 0 courses tries to open course details -> MUST BE 403
  const zeroCourseRes = await fetch(`${BASE_URL}/api/courses/${testCourseId}`, {
    headers: { 'Authorization': `Bearer ${zeroToken}` }
  });
  assert(zeroCourseRes.status === 403,
    `Student with 0 assigned courses gets 403 Forbidden fetching unassigned course ${testCourseId}`);

  // 3.5 Student with 0 courses tries to fetch course progress -> MUST BE 403
  const zeroProgressRes = await fetch(`${BASE_URL}/api/student/courses/${testCourseId}/progress`, {
    headers: { 'Authorization': `Bearer ${zeroToken}` }
  });
  assert(zeroProgressRes.status === 403,
    'Student with 0 assigned courses gets 403 Forbidden fetching unassigned course progress');

  // 3.6 Student with 0 courses tries to self-enroll -> MUST BE 403
  const zeroEnrollRes = await fetch(`${BASE_URL}/api/student/courses/${testCourseId}/enroll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${zeroToken}`
    }
  });
  assert(zeroEnrollRes.status === 403,
    'Self-enrollment endpoint strictly rejects student with 403 Forbidden');

  // 3.7 COMMON FEATURES ALWAYS AVAILABLE: Coding Practice
  const codingRes = await fetch(`${BASE_URL}/api/coding/challenges`, {
    headers: { 'Authorization': `Bearer ${zeroToken}` }
  });
  assert(codingRes.status === 200,
    'Coding practice challenges are freely available (200 OK) to student with 0 courses');

  // 3.8 COMMON FEATURES ALWAYS AVAILABLE: Run Code Sandbox
  const runCodeRes = await fetch(`${BASE_URL}/api/coding/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${zeroToken}`
    },
    body: JSON.stringify({
      code: 'console.log("Hello from zero course student");',
      language: 'javascript'
    })
  });
  assert(runCodeRes.status === 200,
    'Code execution sandbox runs successfully (200 OK) for student with 0 courses');

  // 3.9 COMMON FEATURES ALWAYS AVAILABLE: Tech Blogs
  const blogsRes = await fetch(`${BASE_URL}/api/blogs`, {
    headers: { 'Authorization': `Bearer ${zeroToken}` }
  });
  assert(blogsRes.status === 200,
    'Blog community is freely accessible (200 OK) to student with 0 courses');

  // 3.10 COMMON FEATURES ALWAYS AVAILABLE: User Preferences & Theme
  const prefRes = await fetch(`${BASE_URL}/api/user/preferences`, {
    headers: { 'Authorization': `Bearer ${zeroToken}` }
  });
  assert(prefRes.status === 200,
    'Theme preferences API is accessible (200 OK) to student with 0 courses');

  const updatePrefRes = await fetch(`${BASE_URL}/api/user/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${zeroToken}`
    },
    body: JSON.stringify({
      theme: 'emerald-green',
      mode: 'dark'
    })
  });
  assert(updatePrefRes.status === 200,
    'Theme preference update succeeds (200 OK) for student with 0 courses');

  console.log('\n--- TEST GROUP 4: Admin Grant & Revoke Course Access Flow ---');

  // 4.1 Admin grants course access to zero_student
  const grantCourseRes = await fetch(`${BASE_URL}/api/admin/users/${createdStudent.id}/enrollments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ courseId: testCourseId })
  });
  assert(grantCourseRes.status === 201,
    `Admin successfully grants access to course ${testCourseId}`);

  // 4.2 Student can now access course details
  const grantedCourseRes = await fetch(`${BASE_URL}/api/courses/${testCourseId}`, {
    headers: { 'Authorization': `Bearer ${zeroToken}` }
  });
  const grantedCourseData = await grantedCourseRes.json();
  assert(grantedCourseRes.status === 200 && grantedCourseData.course && Array.isArray(grantedCourseData.lessons),
    `Student can now fetch course ${testCourseId} details with 200 OK after Admin grant`);

  const testLesson = grantedCourseData.lessons[0];
  if (testLesson) {
    // 4.3 Student can now record lesson progress
    const grantedLessonRes = await fetch(`${BASE_URL}/api/student/lessons/${testLesson.id}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${zeroToken}`
      },
      body: JSON.stringify({ completed: true })
    });
    assert(grantedLessonRes.status === 200 || grantedLessonRes.status === 201,
      `Student can now record lesson progress for ${testLesson.id} with 200/201 OK`);

    // 4.4 Admin revokes course access
    const revokeCourseRes = await fetch(`${BASE_URL}/api/admin/users/${createdStudent.id}/enrollments/${testCourseId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(revokeCourseRes.status === 200,
      `Admin successfully revokes access to course ${testCourseId}`);

    // 4.5 Student access is IMMEDIATELY blocked again (403)
    const revokedCourseRes = await fetch(`${BASE_URL}/api/courses/${testCourseId}`, {
      headers: { 'Authorization': `Bearer ${zeroToken}` }
    });
    assert(revokedCourseRes.status === 403,
      `Student access to course ${testCourseId} is immediately blocked with 403 Forbidden after Admin revoke`);

    // 4.6 Student lesson progress is IMMEDIATELY blocked again (403)
    const revokedLessonRes = await fetch(`${BASE_URL}/api/student/lessons/${testLesson.id}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${zeroToken}`
      },
      body: JSON.stringify({ completed: true })
    });
    assert(revokedLessonRes.status === 403,
      `Student lesson progress for ${testLesson.id} is immediately blocked with 403 Forbidden after Admin revoke`);
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
