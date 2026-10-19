import { z } from 'zod';
export const key=z.string().regex(/^[A-H]$/);
export const questionSchema=z.object({
 type:z.enum(['single_choice','multiple_choice','true_false']).default('single_choice'),
 subject:z.string().trim().min(1).max(60).regex(/^[a-z0-9_-]+$/),
 topics:z.array(z.string().regex(/^[a-z0-9_-]+$/)).min(1).max(10),
 tags:z.array(z.string().max(80)).max(20).default([]),
 difficulty:z.enum(['easy','intermediate','advanced']).default('intermediate'),
 questionText:z.string().trim().min(5).max(10000),
 mediaIds:z.array(z.string()).max(6).default([]),
 options:z.array(z.object({key,text:z.string().max(1000).min(1),mediaId:z.string().optional()})).min(2).max(8),
 correctOptionKeys:z.array(key).min(1).max(8),
 explanation:z.string().trim().min(2).max(15000),
 externalId:z.string().trim().max(150).optional(),
 status:z.enum(['draft','published','archived']).default('draft')
}).superRefine((q,ctx)=>{
 const keys=q.options.map(o=>o.key);
 if(new Set(keys).size!==keys.length)ctx.addIssue({code:'custom',message:'Option keys must be unique'});
 if(q.correctOptionKeys.some(k=>!keys.includes(k)))ctx.addIssue({code:'custom',message:'Correct key not present in options'});
 if(new Set(q.correctOptionKeys).size!==q.correctOptionKeys.length)ctx.addIssue({code:'custom',message:'Correct keys must be unique'});
 if(q.type!=='multiple_choice'&&q.correctOptionKeys.length!==1)ctx.addIssue({code:'custom',message:'Single choice must have exactly one correct answer'});
 if(q.type==='true_false'&&(keys.length!==2))ctx.addIssue({code:'custom',message:'True/false needs two options'});
});
export const dailyTestSchema=z.object({title:z.string().min(4).max(160),testDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
 batchId:z.string().trim().min(1).max(80).default('all'),questionIds:z.array(z.string()).min(1).max(100),
 status:z.enum(['draft','published','archived']).default('draft')});
export const answersSchema=z.object({answers:z.array(z.object({questionId:z.string(),selectedOptionKeys:z.array(key).max(8)})).max(100)});
export const revisionSchema=z.object({questionId:z.string(),selectedOptionKeys:z.array(key).max(8)});
