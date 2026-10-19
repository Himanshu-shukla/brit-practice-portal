import {NextRequest} from 'next/server';
import {wrap,fail,response,requireRole} from '@/lib/http';
import {uploadDrive,deleteDrive} from '@/lib/drive';
import {Media} from '@/lib/models';
import {db} from '@/lib/db';
import {randomUUID} from 'crypto';
export const runtime='nodejs';
const MAX=5*1024*1024;
function sniff(b:Buffer){
 if(b.length>8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(b.length>3&&b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
 if(b.length>12&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')return 'image/webp';
 if(b.length>6&&['GIF87a','GIF89a'].includes(b.subarray(0,6).toString()))return 'image/gif';
 return null;
}
export const POST=wrap(async(req:NextRequest)=>{
 const u=await requireRole(req,['mentor','admin','integration']);if(!u)return fail('Forbidden',403);
 const data=await req.formData();const file=data.get('file');if(!(file instanceof File))return fail('file required',422);
 if(file.size>MAX||file.size===0)return fail('Image must be 1 byte to 5 MB',413);
 const buffer=Buffer.from(await file.arrayBuffer());const mime=sniff(buffer);
 if(!mime)return fail('Only real PNG/JPEG/WebP/GIF images accepted',422);
 const extension:Record<string,string>={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
 const name=`brit-question-${randomUUID()}.${extension[mime]}`;
 const id=await uploadDrive(buffer,name,mime);
 try{await db();const item=await Media.create({driveId:id,name,mimeType:mime,size:file.size,uploadedBy:u.id});
  return response({mediaId:String(item._id),url:`/api/v1/media/${item._id}`},201);
 }catch(e){await deleteDrive(id).catch(()=>{});throw e;}
});
