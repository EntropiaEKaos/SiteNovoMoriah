"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/admin-auth";
import {closeStaffPresence,openStaffPresence} from "../../../lib/staff-presence";

export type PresenceResult={
  ok:boolean;
  onDuty?:boolean;
  onDutySince?:string|null;
  message:string;
  code?:string;
};

function errorCode(error:unknown){
  if(!error||typeof error!=="object")return "";
  if("code" in error)return String((error as {code?:unknown}).code||"");
  return "";
}

function presenceFailure(error:unknown):PresenceResult{
  const code=errorCode(error);

  if(code==="P2021"||code==="P2022"){
    return {
      ok:false,
      code,
      message:"O controle de turnos deste ambiente aguarda a migration do banco. O restante do admin continua disponível."
    };
  }

  if(["P1001","P1002","P1017"].includes(code)){
    return {
      ok:false,
      code,
      message:"O banco está temporariamente indisponível. Tente iniciar o turno novamente em instantes."
    };
  }

  console.error("STAFF_PRESENCE_ACTION_FAILED",error);
  return {
    ok:false,
    code:code||"UNKNOWN",
    message:"Não foi possível alterar o turno agora. Nenhuma alteração foi considerada concluída."
  };
}

export async function setPresence(mode:"START"|"END"):Promise<PresenceResult>{
  const session=await requireAdmin();

  try{
    const user=mode==="START"
      ?await openStaffPresence(session.userId)
      :await closeStaffPresence(session.userId,"MANUAL");

    revalidatePath("/admin","layout");
    revalidatePath("/admin/presenca");

    return {
      ok:true,
      onDuty:Boolean(user?.onDuty),
      onDutySince:user?.onDutySince?.toISOString()||null,
      message:mode==="START"?"Turno iniciado.":"Turno encerrado."
    };
  }catch(error){
    return presenceFailure(error);
  }
}

// Backward-compatible actions for any older form still referencing them.
export async function startPresence(){
  return setPresence("START");
}

export async function endPresence(){
  return setPresence("END");
}
