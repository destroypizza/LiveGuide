import "./globals.css";

export const metadata = {
  title: "Live Control (MVP)",
  description: "Interactive live control queue MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}

