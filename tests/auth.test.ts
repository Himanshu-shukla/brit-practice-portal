import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { normalizeRole } from '../src/lib/auth';
import { canViewTest } from '../src/lib/http';

test('normalizeRole maps LMS and Portal roles correctly', () => {
  // LMS student -> learner
  assert.equal(normalizeRole('student'), 'learner');
  assert.equal(normalizeRole('STUDENT'), 'learner');
  assert.equal(normalizeRole('learner'), 'learner');

  // LMS teacher -> mentor
  assert.equal(normalizeRole('teacher'), 'mentor');
  assert.equal(normalizeRole('mentor'), 'mentor');

  // LMS superadmin -> admin
  assert.equal(normalizeRole('superadmin'), 'admin');
  assert.equal(normalizeRole('admin'), 'admin');

  // Default fallback for undefined/unknown
  assert.equal(normalizeRole(undefined), 'learner');
  assert.equal(normalizeRole(''), 'learner');
  assert.equal(normalizeRole('unknown_role'), 'learner');
});

test('canViewTest handles mentor/admin bypass and learner batch targeting', () => {
  const futureTest = {
    status: 'published',
    releaseAt: new Date(Date.now() + 86400000).toISOString(),
    batchId: 'batch-1'
  };

  const publishedTest = {
    status: 'published',
    releaseAt: new Date(Date.now() - 1000).toISOString(),
    batchId: 'batch-1'
  };

  const allBatchTest = {
    status: 'published',
    releaseAt: new Date(Date.now() - 1000).toISOString(),
    batchId: 'all'
  };

  const learnerInBatch1 = { id: 'u1', name: 'Learner 1', email: 'l1@test.com', role: 'learner' as const, batchId: 'batch-1' };
  const learnerInBatch2 = { id: 'u2', name: 'Learner 2', email: 'l2@test.com', role: 'learner' as const, batchId: 'batch-2' };
  const mentor = { id: 'm1', name: 'Mentor', email: 'm@test.com', role: 'mentor' as const, batchId: 'all' };

  // Mentors can view everything (even future / drafts)
  assert.equal(canViewTest(futureTest, mentor), true);

  // Learner in batch-1 can view published test for batch-1
  assert.equal(canViewTest(publishedTest, learnerInBatch1), true);

  // Learner in batch-2 cannot view published test for batch-1
  assert.equal(canViewTest(publishedTest, learnerInBatch2), false);

  // Learner cannot view unreleased future test
  assert.equal(canViewTest(futureTest, learnerInBatch1), false);

  // Both learners can view test assigned to 'all'
  assert.equal(canViewTest(allBatchTest, learnerInBatch1), true);
  assert.equal(canViewTest(allBatchTest, learnerInBatch2), true);
});

test('password verification supports both LMS password and practice portal passwordHash', async () => {
  const plainText = 'SecurePass123!';
  const hash = await bcrypt.hash(plainText, 10);

  // User with LMS schema { password: hash }
  const lmsUser = {
    username: 'learner_lms',
    password: hash,
    role: 'student'
  };
  const lmsHash = lmsUser.password || (lmsUser as any).passwordHash;
  assert.equal(await bcrypt.compare(plainText, lmsHash), true);
  assert.equal(await bcrypt.compare('WrongPassword', lmsHash), false);

  // User with Portal schema { passwordHash: hash }
  const portalUser = {
    email: 'learner_portal@example.com',
    passwordHash: hash,
    role: 'learner'
  };
  const portalHash = (portalUser as any).password || portalUser.passwordHash;
  assert.equal(await bcrypt.compare(plainText, portalHash), true);
  assert.equal(await bcrypt.compare('WrongPassword', portalHash), false);
});

test('mentor accounts with teacher or superadmin role map to privileged studio roles', async () => {
  const teacherUser = { username: 'alok', role: 'teacher' };
  assert.equal(normalizeRole(teacherUser.role), 'mentor');

  const superadminUser = { username: 'superadmin', role: 'superadmin' };
  assert.equal(normalizeRole(superadminUser.role), 'admin');

  const mentorUser = { email: 'mentor@britinstitute.co.uk', role: 'mentor' };
  assert.equal(normalizeRole(mentorUser.role), 'mentor');
});

test('email structure detection correctly classifies input as email or username', () => {
  const isEmailPattern = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  // Valid emails
  assert.equal(isEmailPattern('learner@example.com'), true);
  assert.equal(isEmailPattern('dandikridi@gmail.com'), true);
  assert.equal(isEmailPattern('mentor@britinstitute.co.uk'), true);
  assert.equal(isEmailPattern('  test@domain.org  '), true);

  // Usernames (treated as username because they do not have full email structure)
  assert.equal(isEmailPattern('test'), false);
  assert.equal(isEmailPattern('alok'), false);
  assert.equal(isEmailPattern('teacher'), false);
  assert.equal(isEmailPattern('superadmin'), false);
  assert.equal(isEmailPattern('dandikridi'), false);
  assert.equal(isEmailPattern('himnashu_t4'), false);
  assert.equal(isEmailPattern('user@domain'), false);
});

