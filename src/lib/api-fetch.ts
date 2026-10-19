export async function api<T=any>(url:string,opts?:RequestInit):Promise<T>{
 const res=await fetch(url,{credentials:'include',cache:'no-store',...opts,headers:{...(opts?.body instanceof FormData?{}:{'Content-Type':'application/json'}),...opts?.headers}});
 let data:any;try{data=await res.json();}catch{data={error:'Unexpected response from server'};}
 if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);return data as T;
}
export function post<T=any>(url:string,data:unknown){return api<T>(url,{method:'POST',body:JSON.stringify(data)});}
