# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 명령어

```bash
npm run dev           # 개발 서버 (Turbopack 기본)
npm run build         # 프로덕션 빌드
npm run lint          # ESLint 검사
npm run lint:fix      # ESLint 자동 수정
npm run format        # Prettier 포맷팅
npm run format:check  # Prettier 포맷 검사
npm run type-check    # TypeScript 타입 체크 (tsc --noEmit)
npm run check-all     # 타입 체크 + 린트 + 포맷 검사 통합 실행
```

shadcn/ui 컴포넌트 추가:

```bash
npx shadcn@latest add [component-name]
```

## 아키텍처 개요

**Next.js App Router + Supabase** 스타터 킷. 인증 흐름이 핵심 구조.

### Supabase 클라이언트 패턴

두 가지 클라이언트를 상황에 맞게 사용:

- `lib/supabase/client.ts` → 클라이언트 컴포넌트용 (`createBrowserClient`)
- `lib/supabase/server.ts` → 서버 컴포넌트 / Server Actions용 (`createServerClient`, async)
- `lib/supabase/proxy.ts` → 요청마다 세션 갱신하는 프록시 미들웨어 (Next.js 15.3+ 방식, `middleware.ts` 대신 사용)

두 클라이언트 모두 `Database` 제네릭 타입(`types/database.types.ts`)을 적용. **전역 변수로 저장 금지** — 매 요청마다 새로 생성.

### 인증 흐름

- 비인증 사용자 → `proxy.ts`가 `/auth/login`으로 리다이렉트 (`/`, `/auth/*` 경로 제외)
- 이메일 OTP 확인 → `app/auth/confirm/route.ts`
- 보호된 페이지: `app/protected/` (서버에서 `supabase.auth.getClaims()`로 검증)

### 라우트 구조

```
app/
├── page.tsx              # 공개 홈
├── auth/                 # 인증 관련 (login, sign-up, confirm, forgot-password, update-password, error)
└── protected/            # 인증 필요 페이지
```

## 코드 컨벤션

### 컴포넌트

- Server Component 우선 (`'use client'` 최소화)
- 파일명: `kebab-case.tsx`, 컴포넌트명: `PascalCase`
- `@/` 경로 별칭 사용 (상대 경로 금지)
- 파일 크기 300줄 이하 유지

### 스타일링

- TailwindCSS + shadcn/ui (`new-york` 스타일) 조합
- 클래스 조합에 `cn()` 함수 사용 (`lib/utils.ts`)
- 시맨틱 CSS 변수 사용 (`bg-background`, `text-foreground` 등), 하드코딩 색상 금지
- 인라인 스타일 금지

### 폼 처리 (계획 중인 패턴)

`docs/guides/forms-react-hook-form.md` 참고:

- React Hook Form + Zod + Server Actions 조합
- 서버-클라이언트 이중 검증 필수
- `useActionState` (React 19)로 서버 액션 상태 관리

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

`lib/utils.ts`의 `hasEnvVars`로 환경변수 설정 여부 확인 (미설정 시 프록시 세션 체크 건너뜀).

## 참고 문서

`docs/guides/` 디렉토리에 상세 가이드 있음:

- `nextjs.md` — Next.js 15/16 규칙 (async params/searchParams, `'use cache'`, proxy.ts 등)
- `component-patterns.md` — Server/Client 경계, CVA 변형, 컴파운드 컴포넌트 패턴
- `styling-guide.md` — Tailwind 클래스 순서, 다크모드, 색상 시스템
- `project-structure.md` — 폴더 구조, 네이밍, import 순서 규칙
- `forms-react-hook-form.md` — 폼 아키텍처, 다단계 폼, 자동저장 패턴
