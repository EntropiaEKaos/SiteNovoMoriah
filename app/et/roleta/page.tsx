import {prisma} from "../../../lib/prisma";
import RouletteGame from "./roulette-game";
import styles from "./roleta.module.css";

export const dynamic="force-dynamic";

export default async function RoulettePage(){
  const now=new Date();
  const [settings,prizes]=await Promise.all([
    prisma.rouletteSettings.findUnique({where:{id:"main"}}),
    prisma.roulettePrize.findMany({where:{active:true},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]})
  ]);

  const available=prizes.filter(prize=>prize.quantityTotal===null||prize.awardedCount<prize.quantityTotal);
  const open=Boolean(
    settings?.active&&
    (!settings.activeFrom||settings.activeFrom<=now)&&
    (!settings.activeUntil||settings.activeUntil>now)&&
    available.length
  );

  if(!settings||!open){
    return <main className={styles.shell}><section className={styles.card}>
      <header className={styles.header}><span>MORIAH • EXPERIÊNCIA</span><h1>Roleta da Sorte</h1><p>A campanha está sendo preparada. Volte em breve.</p></header>
    </section></main>;
  }

  return <RouletteGame
    settings={{
      title:settings.title,
      subtitle:settings.subtitle,
      introText:settings.introText,
      googleReviewUrl:settings.googleReviewUrl,
      googleReviewLabel:settings.googleReviewLabel,
      termsText:settings.termsText
    }}
    initialPrizes={available.map(prize=>({
      id:prize.id,
      name:prize.name,
      description:prize.description,
      color:prize.color,
      textColor:prize.textColor,
      weight:Math.max(1,prize.weight)
    }))}
  />;
}
