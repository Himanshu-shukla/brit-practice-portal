import {config} from 'dotenv';config({path:'.env.local'});
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {db} from '../src/lib/db';import {User,Question,DailyTest} from '../src/lib/models';
async function main(){
 const email=process.env.SEED_MENTOR_EMAIL,password=process.env.SEED_MENTOR_PASSWORD;
 if(!email||!password||password.length<10)throw new Error('Configure SEED_MENTOR_EMAIL and strong SEED_MENTOR_PASSWORD in .env.local');
 await db();
 const mentorHash = await bcrypt.hash(password, 12);
 const mentor = await User.findOneAndUpdate(
   { email: email.toLowerCase() },
   {
     $set: { passwordHash: mentorHash, password: mentorHash, failedLogins: 0, lockedUntil: undefined, isActive: true },
     $setOnInsert: { name: 'BRIT Mentor', email: email.toLowerCase(), username: 'mentor', role: 'mentor', batchId: 'all' }
   },
   { new: true, upsert: true }
 );
 console.log('Mentor ready:', mentor.email);
 const learnerEmail = process.env.SEED_LEARNER_EMAIL, learnerPwd = process.env.SEED_LEARNER_PASSWORD;
 if (learnerEmail && learnerPwd && learnerPwd.length >= 10) {
   const learnerHash = await bcrypt.hash(learnerPwd, 12);
   await User.findOneAndUpdate(
     { email: learnerEmail.toLowerCase() },
     {
       $set: { passwordHash: learnerHash, password: learnerHash, failedLogins: 0, lockedUntil: undefined, isActive: true },
       $setOnInsert: { name: 'Demo Learner', email: learnerEmail.toLowerCase(), username: 'learner', role: 'learner', batchId: 'batch-1' }
     },
     { upsert: true }
   );
   console.log('Learner ready:', learnerEmail);
 }
 const exists=await Question.exists({externalId:'DEMO-EXCEL-001'});
 if(!exists){const q=await Question.create({externalId:'DEMO-EXCEL-001',type:'single_choice',subject:'excel',topics:['pivot_tables'],tags:['excel/pivot_tables','aggregation'],difficulty:'easy',questionText:'Which PivotTable summarization adds all numeric sales values?',mediaIds:[],options:[{key:'A',text:'Count'},{key:'B',text:'Sum'},{key:'C',text:'Average'},{key:'D',text:'Max'}],correctOptionKeys:['B'],explanation:'Sum adds all numeric values; place Sales in Values and select Sum.',status:'published',createdBy:mentor._id});
 const {todayUK,releaseDate}=await import('../src/lib/quiz');const date=todayUK();
 await DailyTest.create({title:'Demo — Excel Pivot Table',testDate:date,releaseAt:releaseDate(date),batchId:'all',status:'published',createdBy:mentor._id,items:[{questionId:q._id,snapshot:{type:q.type,subject:q.subject,topics:q.topics,tags:q.tags,difficulty:q.difficulty,questionText:q.questionText,mediaIds:q.mediaIds,options:q.options,correctOptionKeys:q.correctOptionKeys,explanation:q.explanation,version:q.version}}]});
 console.log('Created example published question and test for today');}
 await mongoose.disconnect();
}
main().catch(e=>{console.error(e);process.exit(1)});
