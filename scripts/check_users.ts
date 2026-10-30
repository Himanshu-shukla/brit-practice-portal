import { config } from 'dotenv';
config({ path: '.env.local' });
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';
import { User } from '../src/lib/models';
import mongoose from 'mongoose';

async function run() {
  try {
    await db();
    const mentors = await User.find({ role: { $in: ['teacher', 'superadmin', 'mentor', 'admin'] } })
      .select('name username email role isActive')
      .lean();
    console.log(`\nMentors/Instructors in DB (${mentors.length}):`);
    for (const m of mentors) {
      console.log(`- ${m.name} | Username: "${m.username}" | Role: ${m.role} | Active: ${m.isActive}`);
    }

    const totalLearners = await User.countDocuments({ role: { $in: ['learner', 'student'] } });
    console.log(`\nTotal learners/students in DB: ${totalLearners}`);

    const sampleLearners = await User.find({ role: { $in: ['learner', 'student'] } })
      .select('name username email role isActive')
      .limit(5)
      .lean();
    console.log('Sample learners:');
    for (const l of sampleLearners) {
      console.log(`- ${l.name} | Username: "${l.username}" | Email: ${l.email || 'N/A'}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
