export const siteLocales=["pt","en","es"] as const;
export type SiteLocale=(typeof siteLocales)[number];
export const defaultSiteLocale:SiteLocale="pt";

export const i18nCatalog={
  pt:{
    nav:{stay:"Hospedagem",structure:"Estrutura",events:"Eventos",contact:"Contato",book:"Ver disponibilidade",reserve:"Reservar",explore:"EXPLORE",contactTitle:"CONTATO",directFooter:"RESERVA DIRETA • PRAIA GRANDE"},
    common:{direct:"Reserva direta • atendimento da própria pousada",whatsappLabel:"Fale no WhatsApp",whatsappMessage:"Olá! Vim pelo site da Moriah e gostaria de atendimento.",loading:"Carregando…",success:"Salvo com sucesso.",error:"Não foi possível concluir a ação."},
    roulette:{continue:"Continuar para a roleta",optionalReview:"A avaliação é opcional e não altera sua chance nem o prêmio.",spin:"GIRAR A ROLETA"}
  },
  en:{
    nav:{stay:"Stay",structure:"Amenities",events:"Events",contact:"Contact",book:"Check availability",reserve:"Book",explore:"EXPLORE",contactTitle:"CONTACT",directFooter:"DIRECT BOOKING • PRAIA GRANDE"},
    common:{direct:"Direct booking • service by our own team",whatsappLabel:"Chat on WhatsApp",whatsappMessage:"Hi! I came from the Moriah website and would like assistance.",loading:"Loading…",success:"Saved successfully.",error:"We couldn't complete the action."},
    roulette:{continue:"Continue to the wheel",optionalReview:"The review is optional and does not affect your chance or prize.",spin:"SPIN THE WHEEL"}
  },
  es:{
    nav:{stay:"Hospedaje",structure:"Estructura",events:"Eventos",contact:"Contacto",book:"Ver disponibilidad",reserve:"Reservar",explore:"EXPLORAR",contactTitle:"CONTACTO",directFooter:"RESERVA DIRECTA • PRAIA GRANDE"},
    common:{direct:"Reserva directa • atención del propio alojamiento",whatsappLabel:"Hablar por WhatsApp",whatsappMessage:"¡Hola! Vengo del sitio de Moriah y quisiera atención.",loading:"Cargando…",success:"Guardado correctamente.",error:"No fue posible completar la acción."},
    roulette:{continue:"Continuar a la ruleta",optionalReview:"La evaluación es opcional y no altera tu oportunidad ni el premio.",spin:"GIRAR LA RULETA"}
  }
} as const;

export function getI18n(locale:SiteLocale){
  return i18nCatalog[locale];
}
