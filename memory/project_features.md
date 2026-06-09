---
name: project-features
description: Features implementadas e planejadas para o fortsecure-crm
metadata:
  type: project
---

## Features implementadas (2026-06-09)

**Battlecards Dinâmicos** — Tab nova em `/knowledge`
- Componente: `src/components/battlecards/BattlecardsSection.tsx`
- Migration: `supabase/migrations/20260609100000_add_battlecards.sql`
- Tabela: `battlecards` com campos: competitor_name, logo_emoji, color, our_strengths, their_strengths, objections (JSONB array de {question, answer}), tags
- Admin pode criar/editar/deletar; vendedores só visualizam
- Exibe vantagens vs concorrente e objeções com como rebater

**Onboarding Guiado** — Widget flutuante global
- Componente: `src/components/onboarding/OnboardingChecklist.tsx`
- Integrado no `AppShell` — aparece em todas as páginas
- Estado salvo em localStorage: `onboarding_{userId}` e `onboarding_dismissed_{userId}`
- Auto-detecta conclusão de steps via queries Supabase (customers, opportunities, activities, profile)
- 5 steps: perfil, cliente, pipeline, atividade, knowledge base
- Animação de celebração ao completar tudo

## Features discutidas / a implementar

**GoTo Integration para gravação + transcrição:**
- Já existe estrutura iniciada: `supabase/functions/goto-meetings/index.ts` e `src/components/integrations/GoToMeetingsList.tsx`
- GoTo não tem transcrição nativa — precisa de pipeline: GoTo API → download recording → Whisper AI → Claude para resumo
- **Why:** Feature complexa, deixada para iteração futura

**Why:** Battlecards ajudam vendedores durante calls de competição; Onboarding reduz curva de entrada de novos vendedores.
**How to apply:** Ao sugerir novos features, considerar que battlecards e onboarding já foram feitos.
