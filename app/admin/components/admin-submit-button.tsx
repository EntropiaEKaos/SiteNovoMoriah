"use client";

import {useFormStatus} from "react-dom";

type Props={
  label:string;
  pendingLabel?:string;
  className?:string;
};

export default function AdminSubmitButton({label,pendingLabel="Salvando...",className}:Props){
  const {pending}=useFormStatus();
  return <button type="submit" className={className} disabled={pending} aria-busy={pending}>
    {pending&&<span className="adminSubmitSpinner" aria-hidden="true"/>}
    <span>{pending?pendingLabel:label}</span>
  </button>;
}
