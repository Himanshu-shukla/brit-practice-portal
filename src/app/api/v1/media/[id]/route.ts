import {NextRequest} from 'next/server';
import {Readable} from 'stream';
import {wrap,fail,requireRole,idOK} from '@/lib/http';
import {db} from '@/lib/db';
import {Media,DailyTest} from '@/lib/models';
import {downloadDrive} from '@/lib/drive';
export const runtime='nodejs';
export const GET=wrap(async(req:NextRequest,ctx)=>{
 const user=await requireRole(req,['learner','mentor','admin']);if(!user)return fail('Unauthorized',401);
 const {id}=await ctx.params;if(!idOK(id))return fail('Invalid media ID');await db();
 const m=await Media.findById(id);if(!m)return fail('Media not found',404);
 if(user.role==='learner'){
  const available=await DailyTest.exists({status:'published',releaseAt:{$lte:new Date()},batchId:{$in:['all',user.batchId]},
   $or:[{'items.snapshot.mediaIds':id},{'items.snapshot.options.mediaId':id}]});
  if(!available)return fail('Media not available',403);
 }
 const stream=await downloadDrive(m.driveId);
 return new Response(Readable.toWeb(stream) as unknown as ReadableStream,{headers:{'Content-Type':m.mimeType||'application/octet-stream',
  'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});
});
