import './globals.css';
import type { Metadata } from 'next';
export const metadata:Metadata={title:'BRIT Practice Portal',description:'Daily assessments and revision — BRIT Institute'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
