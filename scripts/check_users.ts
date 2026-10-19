import { config } from 'dotenv';
config({ path: '.env.local' });
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';
import { User } from '../src/lib/models';
import mongoose from 'mongoose';

async function run() {
  try {
    await db();
    const mentor = await User.findOne({ email: 'mentor@britinstitute.co.uk' });
    if (mentor) {
      const mentorPwd = process.env.SEED_MENTOR_PASSWORD || 'BritMentor@2026Demo';
      console.log('Mentor password match with', mentorPwd, ':', await bcrypt.compare(mentorPwd, mentor.passwordHash));
      console.log('Mentor placeholder match:', await bcrypt.compare('REPLACE_WITH_A_STRONG_PASSWORD', mentor.passwordHash));
      console.log('Mentor failedLogins:', mentor.failedLogins, 'lockedUntil:', mentor.lockedUntil);
    }
    const learner = await User.findOne({ email: 'learner@example.com' });
    if (learner) {
      const learnerPwd = process.env.SEED_LEARNER_PASSWORD || 'BritLearner@2026Demo';
      console.log('Learner password match with', learnerPwd, ':', await bcrypt.compare(learnerPwd, learner.passwordHash));
      console.log('Learner placeholder match:', await bcrypt.compare('REPLACE_WITH_A_STRONG_PASSWORD', learner.passwordHash));
      console.log('Learner failedLogins:', learner.failedLogins, 'lockedUntil:', learner.lockedUntil);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
