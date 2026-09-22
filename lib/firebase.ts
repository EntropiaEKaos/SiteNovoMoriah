import {getApps,initializeApp,type FirebaseApp} from "firebase/app";
export type PublicFirebaseConfig={apiKey?:string|null;authDomain?:string|null;projectId?:string|null;storageBucket?:string|null;messagingSenderId?:string|null;appId?:string|null;vapidKey?:string|null};
let runtimeConfig:PublicFirebaseConfig|null=null;
export async function loadFirebaseConfig():Promise<PublicFirebaseConfig|null>{if(runtimeConfig)return runtimeConfig;try{const res=await fetch("/api/public-config",{cache:"no-store"});if(!res.ok)return null;const data=await res.json();if(!data?.configured)return null;runtimeConfig=data.config;return runtimeConfig}catch{return null}}
export async function getFirebaseApp():Promise<FirebaseApp|null>{const config=await loadFirebaseConfig();if(!config)return null;const {vapidKey,...appConfig}=config;return getApps()[0]??initializeApp(appConfig)}
export async function getFirebaseVapidKey(){return (await loadFirebaseConfig())?.vapidKey||null}