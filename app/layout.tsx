import PwaRegister from "./pwa-register";
import GlobalSupportChat from "./global-support-chat";
import "./globals.css";

export const metadata={
  title:"Pousada Moriah | Praia Grande",
  description:"Pousada e hostel em Praia Grande"
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR">
    <body>
      <PwaRegister/>
      <GlobalSupportChat/>
      {children}
    </body>
  </html>;
}
