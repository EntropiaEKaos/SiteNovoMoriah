import {NextRequest,NextResponse} from "next/server";
import {readMediaObject,validateMediaKey} from "../../../../lib/media-storage";

export const runtime="nodejs";

export async function GET(req:NextRequest){
  try{
    const key=validateMediaKey(String(req.nextUrl.searchParams.get("key")||""));
    const media=await readMediaObject(key);

    return new NextResponse(Buffer.from(media.bytes),{
      status:200,
      headers:{
        "content-type":media.mimeType,
        "cache-control":"public, max-age=31536000, immutable",
        ...(media.etag?{"etag":media.etag}:{}),
        ...(media.lastModified?{"last-modified":media.lastModified.toUTCString()}:{})
      }
    });
  }catch(error){
    console.error("MEDIA_DELIVERY_FAILED",error);
    return NextResponse.json({error:"Mídia indisponível."},{status:404});
  }
}
