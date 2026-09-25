import "server-only";
import {createSign} from "node:crypto";

type ServiceAccount={
  project_id:string;
  client_email:string;
  private_key:string;
};

let cachedToken:{value:string;expiresAt:number}|null=null;

function b64url(value:string){
  return Buffer.from(value).toString("base64url");
}

function serviceAccount():ServiceAccount{
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON ausente.");
  const parsed=JSON.parse(raw) as Partial<ServiceAccount>;
  if(!parsed.project_id||!parsed.client_email||!parsed.private_key){
    throw new Error("Service account Firebase inválida.");
  }
  return parsed as ServiceAccount;
}

async function accessToken(){
  if(cachedToken&&cachedToken.expiresAt>Date.now()+60_000)return cachedToken.value;

  const sa=serviceAccount();
  const now=Math.floor(Date.now()/1000);
  const header=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const payload=b64url(JSON.stringify({
    iss:sa.client_email,
    scope:"https://www.googleapis.com/auth/firebase.messaging",
    aud:"https://oauth2.googleapis.com/token",
    iat:now,
    exp:now+3600
  }));
  const unsigned=header+"."+payload;
  const signer=createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion=unsigned+"."+signer.sign(sa.private_key).toString("base64url");

  const response=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({
      grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  if(!response.ok)throw new Error("Falha ao autenticar Firebase: "+response.status);

  const data=await response.json() as {access_token?:string;expires_in?:number};
  if(!data.access_token)throw new Error("Firebase não retornou access_token.");
  cachedToken={value:data.access_token,expiresAt:Date.now()+(data.expires_in||3600)*1000};
  return data.access_token;
}

export async function sendAdminPush(input:{
  tokens:string[];
  title:string;
  body:string;
  url?:string|null;
}){
  const sa=serviceAccount();
  const token=await accessToken();
  const unique=[...new Set(input.tokens.filter(Boolean))];
  const results:{token:string;ok:boolean;status:number;detail?:string}[]=[];

  for(const deviceToken of unique){
    const response=await fetch(
      "https://fcm.googleapis.com/v1/projects/"+encodeURIComponent(sa.project_id)+"/messages:send",
      {
        method:"POST",
        headers:{
          authorization:"Bearer "+token,
          "content-type":"application/json"
        },
        body:JSON.stringify({
          message:{
            token:deviceToken,
            notification:{title:input.title,body:input.body},
            data:{url:input.url||"/admin"},
            webpush:{
              fcm_options:{link:input.url||"/admin"},
              notification:{
                icon:"/icon.svg",
                badge:"/icon.svg",
                requireInteraction:false
              }
            }
          }
        })
      }
    );

    const detail=response.ok?"":(await response.text()).slice(0,700);
    results.push({token:deviceToken,ok:response.ok,status:response.status,detail:detail||undefined});
  }

  return {
    sent:results.filter(x=>x.ok).length,
    failed:results.filter(x=>!x.ok).length,
    results
  };
}
