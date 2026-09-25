import RoulettePage from "./roulette-page";

export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<{preview?:string}>}){
  const query=await searchParams;
  return <RoulettePage settingsId="main" preview={query.preview==="1"}/>;
}
