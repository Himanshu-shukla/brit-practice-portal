import mongoose, { Schema, model, models } from 'mongoose';

const option = new Schema({key:{type:String,required:true},text:{type:String,required:true},mediaId:String},{_id:false});
const questionData = {
  type:{type:String,enum:['single_choice','multiple_choice','true_false'],required:true},
  subject:{type:String,required:true,index:true}, topics:{type:[String],default:[]},tags:{type:[String],default:[]},
  difficulty:{type:String,enum:['easy','intermediate','advanced'],required:true},
  questionText:{type:String,required:true},mediaIds:{type:[String],default:[]},
  options:{type:[option],required:true},correctOptionKeys:{type:[String],required:true},
  explanation:{type:String,required:true},version:{type:Number,default:1},
};
const question = new Schema({...questionData,status:{type:String,enum:['draft','published','archived'],default:'draft'},
 externalId:{type:String},createdBy:{type:Schema.Types.ObjectId,ref:'User',required:true}}, {timestamps:true});
question.index({externalId:1},{unique:true,sparse:true});
question.index({subject:1,topics:1,status:1});

const snapshot = new Schema(questionData,{_id:false});
const test = new Schema({title:{type:String,required:true},testDate:{type:String,required:true,index:true},
 releaseAt:{type:Date,required:true},status:{type:String,enum:['draft','published','archived'],default:'draft'},
 batchId:{type:String,required:true,default:'all'},
 items:{type:[new Schema({questionId:{type:Schema.Types.ObjectId,ref:'Question',required:true},snapshot:{type:snapshot,required:true}},{_id:false})],default:[]},
 createdBy:{type:Schema.Types.ObjectId,ref:'User',required:true}},{timestamps:true});
test.index({testDate:1,status:1,batchId:1});

const user = new Schema({
  name: { type: String, required: true },
  email: { type: String, lowercase: true, trim: true },
  username: { type: String, trim: true },
  password: { type: String },
  passwordHash: { type: String },
  role: { type: String, enum: ['learner', 'student', 'mentor', 'teacher', 'admin', 'superadmin'], default: 'learner' },
  batchId: { type: String, default: 'batch-1' },
  enrolledCourse: { type: Schema.Types.ObjectId },
  isActive: { type: Boolean, default: true },
  failedLogins: { type: Number, default: 0 },
  lockedUntil: Date
}, { timestamps: true, strict: false });
user.index({ email: 1 }, { unique: true, sparse: true });
user.index({ username: 1 }, { unique: true, sparse: true });

const answer = new Schema({questionId:{type:Schema.Types.ObjectId,required:true},
 selectedOptionKeys:{type:[String],default:[]},isCorrect:Boolean},{_id:false});
const attempt = new Schema({learnerId:{type:Schema.Types.ObjectId,ref:'User',required:true},
 testId:{type:Schema.Types.ObjectId,ref:'DailyTest',required:true},
 status:{type:String,enum:['in_progress','submitted'],default:'in_progress'},
 answers:{type:[answer],default:[]},correctCount:{type:Number,default:0},score:{type:Number,default:0},
 submittedAt:Date},{timestamps:true});
attempt.index({learnerId:1,testId:1},{unique:true});

const progress = new Schema({learnerId:{type:Schema.Types.ObjectId,required:true},questionId:{type:Schema.Types.ObjectId,required:true},
 sourceTestId:{type:Schema.Types.ObjectId,required:true},needsRevision:{type:Boolean,default:true},
 everIncorrect:{type:Boolean,default:true},lastCorrect:{type:Boolean,default:false},revisionCount:{type:Number,default:0},
 lastAttemptAt:{type:Date,default:Date.now}},{timestamps:true});
progress.index({learnerId:1,questionId:1},{unique:true});
progress.index({learnerId:1,needsRevision:1,updatedAt:-1});

const revision = new Schema({learnerId:{type:Schema.Types.ObjectId,required:true},questionId:{type:Schema.Types.ObjectId,required:true},
 sourceTestId:{type:Schema.Types.ObjectId,required:true}, selectedOptionKeys:{type:[String],default:[]},
 isCorrect:{type:Boolean,required:true}},{timestamps:true});
revision.index({learnerId:1,createdAt:-1});

const media = new Schema({driveId:{type:String,required:true,unique:true},name:String,mimeType:String,
 size:Number,uploadedBy:{type:Schema.Types.ObjectId,required:true}},{timestamps:true});

export const User = models.User || model('User',user);
export const Question = models.Question || model('Question',question);
export const DailyTest = models.DailyTest || model('DailyTest',test);
export const TestAttempt = models.TestAttempt || model('TestAttempt',attempt);
export const QuestionProgress = models.QuestionProgress || model('QuestionProgress',progress);
export const RevisionAttempt = models.RevisionAttempt || model('RevisionAttempt',revision);
export const Media = models.Media || model('Media',media);
