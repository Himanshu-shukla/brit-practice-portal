import {NextRequest} from 'next/server';
import {parse as parseCSV} from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import {wrap,fail,response,requireRole} from '@/lib/http';
import {questionSchema} from '@/lib/validators';
import {Question} from '@/lib/models';
import {db} from '@/lib/db';
import {ensureMedia} from '@/lib/quiz';
export const runtime='nodejs';
function transform(row:Record<string,any>){
 const f=(name:string)=>String(row[name]??'').trim();
 const split=(s:string)=>s.split(/[,;]+/).map(x=>x.trim()).filter(Boolean);
 const opts=['A','B','C','D','E','F','G','H'].filter(x=>f('option'+x)).map(key=>({key,text:f('option'+key),...(f('option'+key+'MediaId')?{mediaId:f('option'+key+'MediaId')}:{} )}));
 return {type:f('type')||'single_choice',subject:f('subject').toLowerCase(),topics:split(f('topics')).map(x=>x.toLowerCase()),
 tags:split(f('tags')),difficulty:f('difficulty')||'intermediate',questionText:f('questionText'),
 mediaIds:split(f('mediaIds')),options:opts,correctOptionKeys:split(f('correctOptionKeys')).map(x=>x.toUpperCase()),
 explanation:f('explanation'),status:f('status')||'published',...(f('externalId')?{externalId:f('externalId')}:{} )};
}
export const POST=wrap(async(req:NextRequest)=>{
 const user=await requireRole(req,['mentor','admin']);if(!user)return fail('Forbidden',403);
 const form=await req.formData();const file=form.get('file');if(!(file instanceof File))return fail('File required');
 if(file.size>2*1024*1024)return fail('Maximum import file size 2 MB',413);
 const raw=Buffer.from(await file.arrayBuffer());let rows:Record<string,any>[]=[];
 try{
 if(file.name.toLowerCase().endsWith('.csv'))rows=parseCSV(raw.toString('utf8'),{columns:true,skip_empty_lines:true,bom:true});
 else if(file.name.toLowerCase().endsWith('.xlsx')){
  const book=new ExcelJS.Workbook();await book.xlsx.load(raw as any);const sheet=book.worksheets[0];if(!sheet)throw new Error('No sheet');
  const headers=(sheet.getRow(1).values as any[]).slice(1).map(String);
  sheet.eachRow((row,i)=>{if(i===1)return;const obj:Record<string,any>={};headers.forEach((h,j)=>{const cell=row.getCell(j+1).value;
    obj[h]=typeof cell==='object'&&cell!==null&&'text' in cell?(cell as any).text:typeof cell==='object'&&cell!==null&&'result' in cell?(cell as any).result:cell??'';});rows.push(obj);});
 }else if(file.name.toLowerCase().endsWith('.json')){const parsed=JSON.parse(raw.toString('utf8'));
  if(!Array.isArray(parsed))throw new Error('JSON must be an array');rows=parsed;
 }else return fail('Use .json, .csv or .xlsx',422);
 }catch{return fail('Cannot parse file; check template and content',422);}
 if(rows.length<1||rows.length>200)return fail('Import supports 1 to 200 questions per file',422);
 const prepared=rows.map((r,i)=>({index:i+1,parsed:questionSchema.safeParse(file.name.endsWith('.json')?r:transform(r))}));
 const errors:any[]=prepared.filter(r=>!r.parsed.success).map(r=>({row:r.index,message:!r.parsed.success?r.parsed.error.issues.map(x=>`${x.path.join('.')}: ${x.message}`).join('; '):''}));
 if(errors.length)return response({imported:0,failed:errors.length,errors},422);
 await db();let imported=0;
 for(const row of prepared){if(!row.parsed.success)continue;const data=row.parsed.data;
  try{await ensureMedia([...new Set([...data.mediaIds,...data.options.map(x=>x.mediaId).filter(Boolean) as string[]])]);
   if(data.externalId)await Question.findOneAndUpdate({externalId:data.externalId},{$setOnInsert:{...data,createdBy:user.id}},{upsert:true,new:true});
   else await Question.create({...data,createdBy:user.id});imported++;
  }catch(e:any){errors.push({row:row.index,message:e?.code===11000?'Duplicate external ID':'Question import failed (check image IDs)'});}
 }
 return response({imported,failed:errors.length,errors});
});
