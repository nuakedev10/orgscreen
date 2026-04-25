'use client';
import Link from 'next/link';
import { ArrowLeft, Mail, Code, MapPin, Sparkles, User } from 'lucide-react';
import BrandMark from '@/components/BrandMark';

const team = [
  {
    name: 'Nuake Tsekpo',
    role: 'Founder · Builder · Hackathon Lead',
    location: 'Kigali, Rwanda',
    email: 'silogrp1@gmail.com',
    bio:
      "Nuake is the builder behind OrgScreen. A student at the African Leadership University, " +
      "he's drawn to messy real-world problems where AI can take a heavy lift off human shoulders — " +
      "in this case, the hours recruiters lose to triaging the same 200 résumés over and over. " +
      "Outside of building, he's a curious generalist: equal parts product designer, full-stack tinkerer, " +
      "and storyteller for ideas that don't get heard often enough on the continent.",
    links: [
      { label: 'Email', href: 'mailto:silogrp1@gmail.com', icon: <Mail size={14} /> },
      { label: 'GitHub', href: 'https://github.com/nuakedev10', icon: <Code size={14} /> }
    ]
  }
];

export default function TeamPage() {
  return (
    <>
      <nav className="nav">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <span className="brand-mark">
            <BrandMark size={18} />
          </span>
          <span className="brand-wordmark">OrgScreen</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/results/all">
            <button className="btn-ghost">Results</button>
          </Link>
          <Link href="/setup">
            <button className="btn-primary" style={{ padding: '10px 18px', fontSize: '14px' }}>
              New Organization
            </button>
          </Link>
        </div>
      </nav>

      <main style={{ minHeight: '100vh', padding: '40px 24px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--muted)',
            textDecoration: 'none',
            marginBottom: '28px'
          }}
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        <div style={{ marginBottom: '36px' }}>
          <span className="pill pill-gold" style={{ marginBottom: '12px' }}>
            <Sparkles size={12} /> The team
          </span>
          <h1 style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1.15, marginTop: '12px' }}>
            The humans behind OrgScreen.
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15.5px', marginTop: '10px', maxWidth: '620px', lineHeight: 1.6 }}>
            Small team. Big bet. We believe AI hiring tools should be shaped by the
            cultures they're hiring into — not imported wholesale from somewhere else.
          </p>
        </div>

        <div className="adinkra-rule">Founders &amp; collaborators</div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}
        >
          {team.map(member => (
            <article
              key={member.name}
              className="card-white"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                padding: '24px'
              }}
            >
              {/* Image placeholder */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background:
                    'linear-gradient(135deg, var(--primary-soft) 0%, rgba(216,165,42,0.18) 100%)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label={`Photo of ${member.name} (placeholder)`}
              >
                <User size={64} color="var(--primary)" strokeWidth={1.4} />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    background: 'rgba(255,255,255,0.85)',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}
                >
                  Photo coming soon
                </span>
              </div>

              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                  {member.name}
                </h2>
                <p style={{ color: 'var(--primary)', fontSize: '13.5px', fontWeight: 600 }}>
                  {member.role}
                </p>
                <p
                  style={{
                    color: 'var(--muted)',
                    fontSize: '13px',
                    marginTop: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <MapPin size={12} /> {member.location}
                </p>
              </div>

              <p style={{ color: 'var(--ink)', fontSize: '14.5px', lineHeight: 1.65 }}>
                {member.bio}
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginTop: '4px'
                }}
              >
                {member.links.map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      textDecoration: 'none',
                      padding: '7px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '999px',
                      background: 'var(--surface-soft)'
                    }}
                  >
                    {link.icon} {link.label}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div
          style={{
            marginTop: '48px',
            padding: '24px',
            border: '1px dashed var(--border)',
            borderRadius: '14px',
            textAlign: 'center',
            background: 'var(--surface-soft)'
          }}
        >
          <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>
            Want to build with us?
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '14px' }}>
            We're a small group looking for collaborators on the African AI hiring stack.
          </p>
          <a
            href="mailto:silogrp1@gmail.com"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none'
            }}
          >
            <Mail size={14} /> silogrp1@gmail.com
          </a>
        </div>
      </main>
    </>
  );
}
