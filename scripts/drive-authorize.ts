import {config} from 'dotenv';config({path:'.env.local'});
import {google} from 'googleapis';
import http from 'http';
const id=process.env.GOOGLE_CLIENT_ID,secret=process.env.GOOGLE_CLIENT_SECRET;
if(!id||!secret)throw new Error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local');
const callback='http://localhost:8765/callback';
const client=new google.auth.OAuth2(id,secret,callback);
const url=client.generateAuthUrl({access_type:'offline',prompt:'consent',scope:['https://www.googleapis.com/auth/drive']});
console.log('1. Add this redirect URI to Google Cloud OAuth client:',callback);
console.log('2. Open this URL in your browser:\n',url);
const server=http.createServer(async(req,res)=>{
 try{const u=new URL(req.url||'/',callback);const code=u.searchParams.get('code');if(!code){res.writeHead(400);res.end('Missing code');return;}
 const {tokens}=await client.getToken(code);if(!tokens.refresh_token)throw new Error('No refresh token returned; revoke prior consent and retry with prompt=consent');
 console.log('\nCOPY TO .env.local (treat like a password):\nGOOGLE_REFRESH_TOKEN='+tokens.refresh_token+'\n');
 res.writeHead(200,{'Content-Type':'text/plain'});res.end('Authorized. Copy refresh token from terminal and close this page.');server.close();
 }catch(e){console.error(e);res.writeHead(500);res.end('Authorization failed; see terminal');server.close();}
});
server.listen(8765,()=>console.log('Waiting for Google OAuth redirect on port 8765...'));
