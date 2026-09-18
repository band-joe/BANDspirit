'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, Wrench, GitBranch } from 'lucide-react';

const docs = [
  {
    title: 'Fachliche Dokumentation',
    description: 'Fachliche Anforderungen, Geschäftsprozesse und Domänenmodell',
    href: '/dokumentation/fachlich',
    icon: BookOpen,
  },
  {
    title: 'Technische Dokumentation',
    description: 'Architektur, Datenmodell, Infrastruktur und Deployment',
    href: '/dokumentation/technisch',
    icon: Wrench,
  },
  {
    title: 'Context-Versionen',
    description: 'Änderungsprotokoll und Versionsverlauf ab V.1.0.0',
    href: '/dokumentation/context-versionen',
    icon: GitBranch,
  },
];

export default function DokumentationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dokumentation</h1>
        <p className="text-muted-foreground">BANDspirit Organisations- & Administrationssystem — Version V.2.0</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((doc) => (
          <Link key={doc.href} href={doc.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <doc.icon className="h-5 w-5 text-primary" />
                  {doc.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{doc.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
