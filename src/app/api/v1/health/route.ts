import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
export const runtime='nodejs';
export async function GET(){
 try{const connection=await db();await connection.connection.db?.admin().ping();
 return NextResponse.json({status:'ok',database:'connected'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'unavailable'},{status:503});}
}
