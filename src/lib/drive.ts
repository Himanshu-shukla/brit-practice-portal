import { google } from 'googleapis';
import { Readable } from 'stream';
function client(){
 const {GOOGLE_CLIENT_ID:id,GOOGLE_CLIENT_SECRET:secret,GOOGLE_REFRESH_TOKEN:refresh}=process.env;
 if(!id||!secret||!refresh)throw new Error('Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN');
 const auth=new google.auth.OAuth2(id,secret);auth.setCredentials({refresh_token:refresh});
 return google.drive({version:'v3',auth});
}
export async function uploadDrive(buffer:Buffer,name:string,mimeType:string){
 const folder=process.env.GOOGLE_DRIVE_FOLDER_ID;if(!folder)throw new Error('GOOGLE_DRIVE_FOLDER_ID missing');
 const result=await client().files.create({requestBody:{name,parents:[folder]},media:{mimeType,body:Readable.from(buffer)},
 fields:'id,name,mimeType',supportsAllDrives:true});if(!result.data.id)throw new Error('Drive did not return file ID');return result.data.id;
}
export async function downloadDrive(id:string){const r=await client().files.get({fileId:id,alt:'media',supportsAllDrives:true},{responseType:'stream'});
 return r.data as Readable;}
export async function deleteDrive(id:string){await client().files.delete({fileId:id,supportsAllDrives:true});}
