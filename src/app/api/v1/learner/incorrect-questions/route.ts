import { wrap, fail, response, requireRole, pageQuery } from '@/lib/http';
import { QuestionProgress, DailyTest, TestAttempt } from '@/lib/models';
import { db } from '@/lib/db';
import { publicQuestion, objectId } from '@/lib/quiz';

export const GET = wrap(async (req) => {
  const u = await requireRole(req, ['learner', 'mentor', 'admin']);
  if (!u) return fail('Unauthorized', 401);
  await db();

  const { page, size, skip, params } = pageQuery(req);
  const subject = params.get('subject');
  const topic = params.get('topic');
  const status = params.get('status') || 'pending';

  // Return questions answered correctly in submitted assessments
  if (status === 'correct') {
    const pipeline: any[] = [
      { $match: { learnerId: objectId(u.id), status: 'submitted' } },
      { $unwind: '$answers' },
      { $match: { 'answers.isCorrect': true } },
      { $lookup: { from: DailyTest.collection.name, localField: 'testId', foreignField: '_id', as: 'test' } },
      { $unwind: '$test' },
      { $unwind: '$test.items' },
      { $match: { $expr: { $eq: ['$test.items.questionId', '$answers.questionId'] } } },
    ];

    const m: any = {};
    if (subject) m['test.items.snapshot.subject'] = subject;
    if (topic) m['test.items.snapshot.topics'] = topic;
    if (Object.keys(m).length) pipeline.push({ $match: m });

    pipeline.push({
      $group: {
        _id: '$answers.questionId',
        testId: { $first: '$testId' },
        item: { $first: '$test.items' },
        selectedOptionKeys: { $first: '$answers.selectedOptionKeys' },
        submittedAt: { $first: '$submittedAt' },
      },
    });

    pipeline.push({ $sort: { submittedAt: -1, _id: -1 } });
    pipeline.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: size }],
        count: [{ $count: 'total' }],
      },
    });

    const [out] = await TestAttempt.aggregate(pipeline);
    return response({
      items: (out?.data || []).map((x: any) => ({
        ...publicQuestion(x.item),
        testId: String(x.testId),
        needsRevision: false,
        isCorrect: true,
        userSelectedKeys: x.selectedOptionKeys || [],
        correctOptionKeys: x.item.snapshot.correctOptionKeys,
        explanation: x.item.snapshot.explanation,
      })),
      total: out?.count[0]?.total || 0,
      page,
      pageSize: size,
    });
  }

  // Otherwise query mistake / revision progress
  const filter: any = { learnerId: objectId(u.id), everIncorrect: true };
  if (status === 'pending') filter.needsRevision = true;
  if (status === 'resolved') filter.needsRevision = false;

  const pipeline: any[] = [
    { $match: filter },
    { $lookup: { from: DailyTest.collection.name, localField: 'sourceTestId', foreignField: '_id', as: 'test' } },
    { $unwind: '$test' },
    { $unwind: '$test.items' },
    { $match: { $expr: { $eq: ['$test.items.questionId', '$questionId'] } } },
  ];

  const m: any = {};
  if (subject) m['test.items.snapshot.subject'] = subject;
  if (topic) m['test.items.snapshot.topics'] = topic;
  if (Object.keys(m).length) pipeline.push({ $match: m });

  pipeline.push({ $sort: { lastAttemptAt: -1, _id: -1 } });
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: size }],
      count: [{ $count: 'total' }],
    },
  });

  const [out] = await QuestionProgress.aggregate(pipeline);
  return response({
    items: (out?.data || []).map((x: any) => ({
      ...publicQuestion(x.test.items),
      testId: String(x.sourceTestId),
      needsRevision: x.needsRevision,
      revisionCount: x.revisionCount,
    })),
    total: out?.count[0]?.total || 0,
    page,
    pageSize: size,
  });
});
