import {NextRequest} from "next/server";
import {POST as canonicalPost} from "../../../etc/roleta/play/route";

export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
  return canonicalPost(req);
}
