import "server-only";
import {randomBytes,scrypt as scryptCallback,timingSafeEqual} from "node:crypto";
import {promisify} from "node:util";
const scrypt=promisify(scryptCallback);
const KEY_BYTES=64;
export async function hashAdminPassword(password:string){
  if(password.length<12)throw new Error("A senha administrativa precisa ter pelo menos 12 caracteres.");
  const salt=randomBytes(16).toString("hex");
  const derived=(await scrypt(password,salt,KEY_BYTES)) as Buffer;
  return "scrypt$"+salt+"$"+derived.toString("hex");
}
export async function verifyAdminPassword(password:string,stored:string){
  const [algorithm,salt,hex]=stored.split("$");
  if(algorithm!=="scrypt"||!salt||!hex)return false;
  const expected=Buffer.from(hex,"hex");
  if(expected.length!==KEY_BYTES)return false;
  const actual=(await scrypt(password,salt,KEY_BYTES)) as Buffer;
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
