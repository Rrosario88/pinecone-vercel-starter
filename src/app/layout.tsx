export const metadata = {
  title: "PDF RAG - Pinecone AI Assistant",
  description: "Intelligent PDF document analysis powered by Pinecone and OpenAI",
};

import "../global.css";
import { ThemeProvider } from '@/context/ThemeContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
