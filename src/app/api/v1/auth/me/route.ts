import {actor} from '@/lib/auth';
import {fail,response,wrap} from '@/lib/http';
export const GET=wrap(async()=>{const a=await actor();return a?response({user:a}):fail('Unauthorized',401);});
