import "./globals.css";
import AppProvider from "../components/AppProvider";
import Shell from "../components/Shell";

export const metadata = {
  title: "ChainForge — Blockchain Explorer & Wallet",
  description: "Mine blocks, explore the chain, manage ECC wallets and send signed ForgeCoin transactions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
