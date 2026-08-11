import { QueryProvider } from "@/components/query-provider";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const newspaperIcon = "https://imgur.com/pcDsMoB.png";

export const metadata: Metadata = {
	title: "Blooom",
	description: "Top tech news",
	icons: {
		icon: newspaperIcon,
		apple: newspaperIcon,
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={cn("font-sans", inter.variable)}>
			<body
				className={`${geistSans.variable} ${geistSans.className} ${geistMono.variable} antialiased`}
			>
				<QueryProvider>{children}</QueryProvider>
			</body>
		</html>
	);
}
