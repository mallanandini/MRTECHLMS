// test-assessment-backend.mjs
import assert from "assert";

const BASE = "http://localhost:3000";

async function runTests() {
  console.log("=== Starting Standalone Assessment Backend Verification Suite ===");

  // 1. Admin Login
  console.log("\n1. Admin Login...");
  const adminLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@lms.com", password: "admin123" })
  });
  assert.strictEqual(adminLoginRes.status, 200, "Admin login should succeed");
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;
  assert.ok(adminToken, "Admin token must exist");
  console.log("✓ Admin authenticated");

  // 2. Student Login
  console.log("\n2. Student Login...");
  const studentLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@lms.com", password: "student123" })
  });
  assert.strictEqual(studentLoginRes.status, 200, "Student login should succeed");
  const studentData = await studentLoginRes.json();
  const studentToken = studentData.token;
  const studentId = studentData.user.id;
  assert.ok(studentToken, "Student token must exist");
  console.log(`✓ Student authenticated (ID: ${studentId})`);

  // 3. List Assessments
  console.log("\n3. List Admin Assessments...");
  const listRes = await fetch(`${BASE}/api/admin/assessments`, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert.strictEqual(listRes.status, 200, "Should list assessments");
  const assessmentsList = await listRes.json();
  assert.ok(Array.isArray(assessmentsList), "Assessments must be an array");
  console.log(`✓ Retrieved ${assessmentsList.length} assessments`);

  // 4. Create Standalone Assessment (Draft)
  console.log("\n4. Create Standalone Assessment...");
  const testTitle = `Test Technical Assessment ${Date.now()}`;
  const createRes = await fetch(`${BASE}/api/admin/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: testTitle,
      shortDescription: "Comprehensive test for backend verification",
      description: "Detailed description of algorithms and data structures test",
      instructions: "Read every question carefully before answering.",
      category: "Computer Science",
      difficulty: "medium",
      assessmentType: "technical",
      durationMinutes: 20,
      passingScore: 70,
      maxAttempts: 1,
      questionNavigation: "free",
      randomizeQuestions: false,
      randomizeOptions: false,
      revealAnswers: true,
      status: "draft"
    })
  });
  assert.strictEqual(createRes.status, 201, "Assessment creation should return 201");
  const createdAssessment = await createRes.json();
  const assessmentId = createdAssessment.id;
  assert.ok(assessmentId, "Created assessment must have an ID");
  assert.strictEqual(createdAssessment.type, "standalone");
  assert.strictEqual(createdAssessment.status, "draft");
  console.log(`✓ Created assessment: ${createdAssessment.title} (ID: ${assessmentId})`);

  // 5. Get Assessment Details
  console.log("\n5. Get Assessment Details...");
  const getRes = await fetch(`${BASE}/api/admin/assessments/${assessmentId}`, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert.strictEqual(getRes.status, 200);
  const details = await getRes.json();
  assert.strictEqual(details.assessment.id, assessmentId);
  assert.strictEqual(details.questions.length, 0);
  console.log("✓ Retrieved assessment details with 0 questions initially");

  // 6. Update Assessment
  console.log("\n6. Update Assessment...");
  const updateRes = await fetch(`${BASE}/api/admin/assessments/${assessmentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      shortDescription: "Updated short description for automated test",
      durationMinutes: 25
    })
  });
  assert.strictEqual(updateRes.status, 200);
  const updatedAssessment = await updateRes.json();
  assert.strictEqual(updatedAssessment.durationMinutes, 25);
  console.log("✓ Updated duration to 25 minutes");

  // 7. Add MCQ Question 1
  console.log("\n7. Add MCQ Question...");
  const addQ1Res = await fetch(`${BASE}/api/admin/assessments/${assessmentId}/questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      questionText: "Which data structure follows the LIFO principle?",
      type: "mcq_single",
      options: ["Queue", "Stack", "Binary Tree", "Hash Map"],
      correctAnswers: ["Stack"],
      points: 10,
      negativePoints: 0,
      explanation: "A Stack removes the most recently added item first (LIFO).",
      difficulty: "easy",
      order: 1
    })
  });
  assert.strictEqual(addQ1Res.status, 201);
  const q1 = await addQ1Res.json();
  assert.ok(q1.id);
  assert.strictEqual(q1.questionText, "Which data structure follows the LIFO principle?");
  console.log(`✓ Added question 1: ${q1.id}`);

  // 8. Update Question
  console.log("\n8. Update Question...");
  const updateQRes = await fetch(`${BASE}/api/admin/assessment-questions/${q1.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      points: 15
    })
  });
  assert.strictEqual(updateQRes.status, 200);
  const updatedQ = await updateQRes.json();
  assert.strictEqual(updatedQ.points, 15);
  console.log("✓ Question points updated to 15");

  // 9. Duplicate Question
  console.log("\n9. Duplicate Question...");
  const dupRes = await fetch(`${BASE}/api/admin/assessment-questions/${q1.id}/duplicate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert.strictEqual(dupRes.status, 201);
  const duplicatedQ = await dupRes.json();
  assert.ok(duplicatedQ.id);
  assert.ok(duplicatedQ.questionText.includes("(Copy)"));
  console.log(`✓ Duplicated question: ${duplicatedQ.id}`);

  // 10. Reorder Questions
  console.log("\n10. Reorder Questions...");
  const reorderRes = await fetch(`${BASE}/api/admin/assessments/${assessmentId}/reorder-questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      questionIds: [duplicatedQ.id, q1.id]
    })
  });
  assert.strictEqual(reorderRes.status, 200);
  const reordered = await reorderRes.json();
  assert.strictEqual(reordered.questions[0].id, duplicatedQ.id);
  assert.strictEqual(reordered.questions[1].id, q1.id);
  console.log("✓ Reordered questions successfully");

  // Delete the duplicate question so we can test clean state
  await fetch(`${BASE}/api/admin/assessment-questions/${duplicatedQ.id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${adminToken}` }
  });

  // 11. Download Excel Template
  console.log("\n11. Download Excel Template...");
  const templateRes = await fetch(`${BASE}/api/admin/assessments/template`, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert.strictEqual(templateRes.status, 200);
  const templateBuffer = await templateRes.arrayBuffer();
  assert.ok(templateBuffer.byteLength > 100, "Template Excel file must not be empty");
  console.log(`✓ Downloaded template (${templateBuffer.byteLength} bytes)`);

  // 12. Excel Import: Test Validation Breakdown with Valid & Invalid Rows
  console.log("\n12. Bulk Question Import with Validation...");
  const importRes = await fetch(`${BASE}/api/admin/assessments/${assessmentId}/import-questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      rows: [
        {
          "Question": "What is the time complexity of searching in a balanced BST?",
          "Option 1": "O(1)",
          "Option 2": "O(log n)",
          "Option 3": "O(n)",
          "Option 4": "O(n log n)",
          "Correct Option": "Option 2",
          "Points": 10,
          "Difficulty": "medium",
          "Explanation": "Searching in a balanced BST halves the search space each step."
        },
        {
          "Question": "Which sorting algorithm has a worst-case time complexity of O(n log n)?",
          "Option 1": "QuickSort",
          "Option 2": "BubbleSort",
          "Option 3": "MergeSort",
          "Option 4": "InsertionSort",
          "Correct Option": "MergeSort",
          "Points": 10,
          "Difficulty": "medium",
          "Explanation": "MergeSort always divides and merges in O(n log n) time."
        },
        // Invalid Row: Missing question
        {
          "Question": "",
          "Option 1": "A",
          "Option 2": "B",
          "Correct Option": "Option 1"
        },
        // Invalid Row: Non-matching correct option
        {
          "Question": "What is the capital of France?",
          "Option 1": "London",
          "Option 2": "Berlin",
          "Correct Option": "Option 9"
        }
      ]
    })
  });
  assert.strictEqual(importRes.status, 200);
  const importResult = await importRes.json();
  assert.strictEqual(importResult.totalRows, 4, "Total rows must be 4");
  assert.strictEqual(importResult.validCount, 2, "Valid count must be 2");
  assert.strictEqual(importResult.invalidCount, 2, "Invalid count must be 2");
  assert.strictEqual(importResult.errors.length, 2, "Errors count must be 2");
  console.log(`✓ Bulk import validated: 2 valid inserted, 2 invalid rejected with reasons`);

  // 13. Question Bank Search & Clone
  console.log("\n13. Question Bank Search & Clone...");
  const qBankRes = await fetch(`${BASE}/api/admin/question-bank?search=BST`, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert.strictEqual(qBankRes.status, 200);
  const bankQuestions = await qBankRes.json();
  assert.ok(bankQuestions.length > 0, "Question bank should find matching BST question");
  console.log(`✓ Question bank search found ${bankQuestions.length} matches`);

  // 14. Publish Validation Checklist
  console.log("\n14. Publish Validation Checklist...");
  // Test publish success on our well-formed assessment
  const pubRes = await fetch(`${BASE}/api/admin/assessments/${assessmentId}/publish`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert.strictEqual(pubRes.status, 200, "Publishing valid assessment should succeed");
  const pubData = await pubRes.json();
  assert.strictEqual(pubData.assessment.status, "published");
  console.log("✓ Assessment successfully published!");

  // 15. Student Assignment & Bulk Assignment
  console.log("\n15. Student Assignment & Bulk Assignment...");
  const assignRes = await fetch(`${BASE}/api/admin/assessments/${assessmentId}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      studentId: studentId,
      dueDate: "2026-12-31"
    })
  });
  assert.strictEqual(assignRes.status, 201, "Assignment should return 201");
  console.log("✓ Assigned student successfully");

  // Verify duplicate assign handling
  const dupAssignRes = await fetch(`${BASE}/api/admin/assessments/${assessmentId}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    },
    body: JSON.stringify({ studentId: studentId })
  });
  assert.strictEqual(dupAssignRes.status, 200, "Duplicate assign returns 200 existing");
  console.log("✓ Duplicate assignment gracefully handled");

  // Get assigned students
  const studentsListRes = await fetch(`${BASE}/api/admin/assessments/${assessmentId}/students`, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert.strictEqual(studentsListRes.status, 200);
  const studentsList = await studentsListRes.json();
  const assignedStudent = studentsList.find(s => s.id === studentId);
  assert.ok(assignedStudent, "Student must be in the list");
  assert.strictEqual(assignedStudent.isAssigned, true);
  console.log("✓ Student shows as assigned in Admin student list");

  // 16. Student Portal: Assigned Assessment Listing
  console.log("\n16. Student Portal Assessment Listing...");
  const studentAssessmentsRes = await fetch(`${BASE}/api/student/assessments`, {
    headers: { "Authorization": `Bearer ${studentToken}` }
  });
  assert.strictEqual(studentAssessmentsRes.status, 200);
  const studentAssessments = await studentAssessmentsRes.json();
  const myAssignedTest = studentAssessments.find(a => a.id === assessmentId);
  assert.ok(myAssignedTest, "Assigned standalone test must appear in student assessments");
  assert.strictEqual(myAssignedTest.isStandalone, true);
  console.log("✓ Assigned test appears in student assessments list");

  // 17. Security & Answer Key Sanitization
  console.log("\n17. Access Control & Answer Sanitization...");
  const takeRes = await fetch(`${BASE}/api/assessments/${assessmentId}`, {
    headers: { "Authorization": `Bearer ${studentToken}` }
  });
  assert.strictEqual(takeRes.status, 200);
  const takeData = await takeRes.json();
  assert.ok(takeData.questions.length >= 3);
  for (const q of takeData.questions) {
    assert.strictEqual(q.correctAnswers, undefined, "correctAnswers MUST NOT be leaked to student");
  }
  console.log("✓ Security verified: correctAnswers stripped from student payload");

  // 18. Student Submits Assessment
  console.log("\n18. Student Submits Assessment...");
  const qStack = takeData.questions.find(q => q.questionText.includes("LIFO"));
  const qBST = takeData.questions.find(q => q.questionText.includes("BST"));
  const qMerge = takeData.questions.find(q => q.questionText.includes("MergeSort"));

  const answersPayload = {};
  if (qStack) answersPayload[qStack.id] = ["Stack"]; // Correct
  if (qBST) answersPayload[qBST.id] = ["O(log n)"]; // Correct
  if (qMerge) answersPayload[qMerge.id] = ["MergeSort"]; // Correct

  const submitRes = await fetch(`${BASE}/api/assessments/${assessmentId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      answers: answersPayload,
      timeTakenSeconds: 120
    })
  });
  assert.strictEqual(submitRes.status, 200);
  const submitData = await submitRes.json();
  assert.strictEqual(submitData.passed, true);
  assert.ok(submitData.score > 0);
  console.log(`✓ Student scored ${submitData.score}/${submitData.totalPoints} (Passed: ${submitData.passed})`);

  // 19. Enforce maxAttempts
  console.log("\n19. Enforce maxAttempts (1 attempt allowed)...");
  const secondSubmitRes = await fetch(`${BASE}/api/assessments/${assessmentId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      answers: answersPayload,
      timeTakenSeconds: 60
    })
  });
  assert.strictEqual(secondSubmitRes.status, 400, "Second attempt must be rejected when maxAttempts is 1");
  console.log("✓ maxAttempts strictly enforced with 400 error");

  // 20. Admin Results & Analytics
  console.log("\n20. Admin Results & Analytics...");
  const resultsRes = await fetch(`${BASE}/api/admin/assessments/${assessmentId}/results`, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert.strictEqual(resultsRes.status, 200);
  const resultsData = await resultsRes.json();
  assert.strictEqual(resultsData.totalAssigned, 1);
  assert.strictEqual(resultsData.totalSubmissions, 1);
  assert.strictEqual(resultsData.passedCount, 1);
  assert.strictEqual(resultsData.failedCount, 0);
  assert.strictEqual(resultsData.passRate, 100);
  assert.ok(resultsData.submissions.length === 1);
  console.log("✓ Admin results analytics verified with 100% pass rate and correct metrics");

  // 21. Safe Deletion Prevention
  console.log("\n21. Safe Deletion Prevention (with active submissions)...");
  const delRes = await fetch(`${BASE}/api/admin/assessments/${assessmentId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert.strictEqual(delRes.status, 400, "Should reject deletion because submissions exist");
  console.log("✓ Safe deletion prevented: Submissions protected");

  // 22. Archive Assessment
  console.log("\n22. Archive Assessment...");
  const archRes = await fetch(`${BASE}/api/admin/assessments/${assessmentId}/archive`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert.strictEqual(archRes.status, 200);
  const archData = await archRes.json();
  assert.strictEqual(archData.assessment.status, "archived");
  console.log("✓ Assessment successfully archived");

  console.log("\n==================================================================");
  console.log("🎉 ALL 22 BACKEND ASSESSMENT TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("==================================================================");
}

runTests().catch(err => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
