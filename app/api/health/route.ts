import {NextResponse} from "next/server";
import {prisma} from "../../../lib/prisma";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    await prisma.$queryRaw`SELECT 1 AS "ok"`;

    return NextResponse.json({
      ok:true,
      service:"moriah-cms",
      database:"up",
      time:new Date().toISOString()
    },{
      headers:{"Cache-Control":"no-store"}
    });
  }catch(error){
    console.error("HEALTHCHECK_FAILED",error);

    return NextResponse.json({
      ok:false,
      service:"moriah-cms",
      database:"down",
      time:new Date().toISOString()
    },{
      status:503,
      headers:{"Cache-Control":"no-store"}
    });
  }
}
