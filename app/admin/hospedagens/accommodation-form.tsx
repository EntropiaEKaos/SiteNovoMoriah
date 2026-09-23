import MediaMultiPicker from "../components/media-multi-picker";
import MediaPicker from "../components/media-picker";

const AMENITIES=[
  ["WIFI","Wi‑Fi"],
  ["AIR_CONDITIONING","Ar-condicionado"],
  ["TV","TV"],
  ["MINIBAR","Frigobar"],
  ["PRIVATE_BATHROOM","Banheiro privativo"],
  ["BREAKFAST","Café da manhã"],
  ["PARKING","Estacionamento"],
  ["BALCONY","Varanda"],
  ["SEA_VIEW","Vista para o mar"],
  ["ACCESSIBLE","Acessível"],
  ["PET_FRIENDLY","Aceita pets"],
  ["LINENS","Roupa de cama"],
  ["TOWELS","Toalhas"]
] as const;

type RoomFormValue={
  id?:string;
  name?:string;
  description?:string;
  type?:string;
  priceCents?:number|null;
  capacity?:number;
  active?:boolean;
  featured?:boolean;
  coverImage?:string|null;
  galleryImages?:string[];
  internalCode?:string|null;
  roomNumber?:string|null;
  floor?:string|null;
  maxAdults?:number;
  maxChildren?:number;
  beds?:string|null;
  bathrooms?:number;
  areaSqm?:number|null;
  amenities?:string[];
  rules?:string|null;
  checkInTime?:string;
  checkOutTime?:string;
  internalNotes?:string|null;
};

export default function AccommodationForm({
  action,
  media,
  room
}:{
  action:(formData:FormData)=>void|Promise<void>;
  media:{id:string;url:string;alt:string|null}[];
  room?:RoomFormValue;
}){
  const active=room?.active??true;
  const amenities=new Set(room?.amenities||[]);

  return <form action={action} className="adminStack">
    {room?.id&&<input type="hidden" name="id" value={room.id}/>}

    <section className="adminSectionCard">
      <h2>Identificação</h2>
      <p>Dados operacionais e comerciais que identificam a unidade.</p>
      <div className="adminFormGrid cols3">
        <label className="span2">Nome comercial
          <input name="name" required maxLength={120} defaultValue={room?.name||""} placeholder="Ex.: Suíte Casal 01"/>
        </label>
        <label>Código interno
          <input name="internalCode" maxLength={40} defaultValue={room?.internalCode||""} placeholder="SUITE-01"/>
        </label>
        <label>Número / unidade
          <input name="roomNumber" maxLength={40} defaultValue={room?.roomNumber||""} placeholder="101"/>
        </label>
        <label>Andar / localização
          <input name="floor" maxLength={40} defaultValue={room?.floor||""} placeholder="Térreo"/>
        </label>
        <label>Tipo
          <select name="type" defaultValue={room?.type||"QUARTO"}>
            <option value="QUARTO">Quarto</option>
            <option value="SUITE">Suíte</option>
            <option value="FAMILIA">Família</option>
            <option value="HOSTEL">Hostel / dormitório</option>
            <option value="GRUPO">Grupo</option>
            <option value="POUSADA">Hospedagem</option>
          </select>
        </label>
        <label className="span2">Descrição pública
          <textarea name="description" required maxLength={4000} defaultValue={room?.description||""} rows={5} placeholder="Descreva a experiência, espaço e diferenciais."/>
        </label>
      </div>
    </section>

    <section className="adminSectionCard">
      <h2>Capacidade & tarifa</h2>
      <p>Esses valores alimentam disponibilidade, reserva e comunicação comercial.</p>
      <div className="adminFormGrid cols3">
        <label>Capacidade total
          <input name="capacity" type="number" min="1" max="50" defaultValue={room?.capacity??2} required/>
        </label>
        <label>Máx. adultos
          <input name="maxAdults" type="number" min="1" max="50" defaultValue={room?.maxAdults??2} required/>
        </label>
        <label>Máx. crianças
          <input name="maxChildren" type="number" min="0" max="30" defaultValue={room?.maxChildren??0} required/>
        </label>
        <label>Diária base
          <input name="price" inputMode="decimal" defaultValue={room?.priceCents==null?"":(room.priceCents/100).toFixed(2)} placeholder="R$ 0,00"/>
        </label>
        <label>Banheiros
          <input name="bathrooms" type="number" min="0" max="10" defaultValue={room?.bathrooms??1}/>
        </label>
        <label>Área aproximada (m²)
          <input name="areaSqm" inputMode="decimal" defaultValue={room?.areaSqm??""} placeholder="Ex.: 22"/>
        </label>
        <label className="span2">Camas / configuração
          <input name="beds" maxLength={300} defaultValue={room?.beds||""} placeholder="Ex.: 1 cama queen + 1 sofá-cama"/>
        </label>
      </div>
    </section>

    <section className="adminSectionCard">
      <h2>Comodidades</h2>
      <p>Selecione o que está disponível nesta hospedagem.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8}}>
        {AMENITIES.map(([value,label])=><label key={value} style={{display:"flex",alignItems:"center",gap:8,padding:10,border:"1px solid #e3ded2",background:"#faf9f5"}}>
          <input type="checkbox" name="amenities" value={value} defaultChecked={amenities.has(value)}/>
          <span>{label}</span>
        </label>)}
      </div>
    </section>

    <section className="adminSectionCard">
      <h2>Operação</h2>
      <p>Horários, regras e observações para a equipe.</p>
      <div className="adminFormGrid">
        <label>Check-in
          <input name="checkInTime" type="time" defaultValue={room?.checkInTime||"14:00"}/>
        </label>
        <label>Check-out
          <input name="checkOutTime" type="time" defaultValue={room?.checkOutTime||"12:00"}/>
        </label>
        <label className="span2">Regras para hóspedes
          <textarea name="rules" maxLength={3000} defaultValue={room?.rules||""} rows={4} placeholder="Silêncio, pets, fumantes, visitantes, horários..."/>
        </label>
        <label className="span2">Observações internas
          <textarea name="internalNotes" maxLength={3000} defaultValue={room?.internalNotes||""} rows={4} placeholder="Informações apenas para a equipe."/>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:8}}>
          <input name="active" type="checkbox" defaultChecked={active}/> Disponível para venda
        </label>
        <label style={{display:"flex",alignItems:"center",gap:8}}>
          <input name="featured" type="checkbox" defaultChecked={room?.featured??false}/> Destacar no site
        </label>
      </div>
    </section>

    <section className="adminSectionCard">
      <h2>Imagem principal</h2>
      <p>Escolha a foto de capa da hospedagem.</p>
      <MediaPicker name="coverImage" media={media} defaultValue={room?.coverImage||""}/>
    </section>

    <section className="adminSectionCard">
      <h2>Galeria do quarto</h2>
      <p>Selecione até 20 imagens da biblioteca.</p>
      <MediaMultiPicker name="galleryImages" media={media} defaultValues={room?.galleryImages||[]}/>
    </section>

    <button className="adminPrimaryAction" style={{border:0,fontSize:13,padding:"15px 22px"}}>
      {room?.id?"Salvar alterações":"Criar hospedagem"}
    </button>
  </form>;
}
