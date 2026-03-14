# Next.js 16 개발 지침

이 문서는 Claude Code에서 Next.js 16 프로젝트를 개발할 때 따라야 할 핵심 규칙과 가이드라인을 제공합니다.

**최소 요구사항**: Node.js 20.9+, TypeScript 5.1+

## 🚀 필수 규칙 (엄격 준수)

### App Router 아키텍처

```typescript
// ✅ 올바른 방법: App Router 사용
app/
├── layout.tsx          // 루트 레이아웃
├── page.tsx           // 메인 페이지
├── loading.tsx        // 로딩 UI
├── error.tsx          // 에러 UI
├── not-found.tsx      // 404 페이지
└── dashboard/
    ├── layout.tsx     // 대시보드 레이아웃
    └── page.tsx       // 대시보드 페이지

// ❌ 금지: Pages Router 사용
pages/
├── index.tsx
└── dashboard.tsx
```

### Server Components 우선 설계

```typescript
// 🚀 필수: 기본적으로 모든 컴포넌트는 Server Components
export default async function UserDashboard() {
  // 서버에서 데이터 가져오기
  const user = await getUser()

  return (
    <div>
      <h1>{user.name}님의 대시보드</h1>
      {/* 클라이언트 컴포넌트가 필요한 경우에만 분리 */}
      <InteractiveChart data={user.analytics} />
    </div>
  )
}

// ✅ 클라이언트 컴포넌트는 최소한으로 사용
'use client'

import { useState } from 'react'

export function InteractiveChart({ data }: { data: Analytics[] }) {
  const [selectedRange, setSelectedRange] = useState('week')
  // 상호작용 로직만 클라이언트에서 처리
  return <Chart data={data} range={selectedRange} />
}
```

### 🔄 async request APIs 처리

```typescript
// 🔄 Next.js 16 방식
import { cookies, headers } from 'next/headers'

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // 🚀 필수: async request APIs 올바른 처리
  const { id } = await params
  const query = await searchParams
  const cookieStore = await cookies()
  const headersList = await headers()

  const user = await getUser(id)

  return <UserProfile user={user} />
}

// ❌ 금지: 동기식 접근 (deprecated)
export default function Page({ params }: { params: { id: string } }) {
  const user = getUser(params.id) // 에러 발생
  return <UserProfile user={user} />
}
```

### Typed Routes 활용

```typescript
// 🚀 필수: Typed Routes로 타입 안전성 보장
import Link from 'next/link'

// next.config.ts에서 experimental.typedRoutes: true 설정 필요
export function Navigation() {
  return (
    <nav>
      {/* ✅ 타입 안전한 링크 */}
      <Link href="/dashboard/users/123">사용자 상세</Link>
      <Link href={{
        pathname: '/products/[id]',
        params: { id: 'abc' }
      }}>제품 상세</Link>

      {/* ❌ 컴파일 에러: 존재하지 않는 경로 */}
      <Link href="/nonexistent-route">잘못된 링크</Link>
    </nav>
  )
}
```

## ✅ 권장 사항 (성능 최적화)

### Streaming과 Suspense 활용

```typescript
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <div>
      <h1>대시보드</h1>

      {/* ✅ 빠른 컨텐츠는 즉시 렌더링 */}
      <QuickStats />

      {/* ✅ 느린 컨텐츠는 Suspense로 감싸기 */}
      <Suspense fallback={<SkeletonChart />}>
        <SlowChart />
      </Suspense>

      <Suspense fallback={<SkeletonTable />}>
        <SlowDataTable />
      </Suspense>
    </div>
  )
}

async function SlowChart() {
  // 무거운 데이터 처리
  await new Promise(resolve => setTimeout(resolve, 2000))
  const data = await getComplexAnalytics()

  return <Chart data={data} />
}
```

### 🔄 after() API 활용

```typescript
import { after } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  // 즉시 응답 반환
  const result = await processUserData(body);

  // 🔄 비블로킹 작업은 after()로 처리
  after(async () => {
    await sendAnalytics(result);
    await updateCache(result.id);
    await sendNotification(result.userId);
  });

  return Response.json({ success: true, id: result.id });
}
```

### 🆕 Cache Components ("use cache" 디렉티브)

프로젝트 `next.config.ts`에 `cacheComponents: true`가 설정되어 있어 사용 가능.
Next.js 16에서는 기본적으로 모든 동적 코드가 request time에 실행되며, 캐싱은 명시적으로 선언해야 합니다.

```typescript
// ✅ 캐시할 컴포넌트에 명시적으로 선언
'use cache'

export default async function ProductList() {
  const products = await getProducts()
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// ✅ cacheLife()로 캐시 수명 제어
'use cache'

import { cacheLife, cacheTag } from 'next/cache'

export async function getProductData(id: string) {
  cacheLife('hours') // 캐시 수명 설정
  cacheTag(`product-${id}`, 'products') // 태그 기반 무효화

  const data = await fetch(`/api/products/${id}`)
  return data.json()
}
```

### 캐싱 API (Next.js 16 업데이트)

```typescript
// ✅ 세밀한 캐시 제어
export async function getProductData(id: string) {
  const data = await fetch(`/api/products/${id}`, {
    next: {
      revalidate: 3600, // 1시간 캐시
      tags: [`product-${id}`, "products"], // 태그 기반 무효화
    },
  });

  return data.json();
}

// 캐시 무효화 (Next.js 16 변경 사항)
import { revalidateTag } from "next/cache";

// ⚠️ Breaking Change: 두 번째 인수 필수 (SWR 동작)
revalidateTag("products", "max");

// ✅ Server Action에서는 updateTag() 사용 (즉시 반영, read-your-writes 보장)
import { updateTag, refresh } from "next/cache";

export async function updateProduct(id: string, data: ProductData) {
  "use server";

  await updateDatabase(id, data);

  // updateTag: Server Actions 전용, 즉시 반영
  updateTag(`product-${id}`);
  updateTag("products");

  // refresh: 미캐시 데이터 갱신
  refresh();
}
```

### Turbopack (Next.js 16 기본 번들러)

Next.js 16에서 Turbopack이 **기본 번들러**가 됩니다. 별도 설정 없이 자동 적용.

```bash
# 기본: Turbopack 사용 (설정 불필요)
next dev
next build

# Webpack으로 되돌리려면 --webpack 플래그 사용
next dev --webpack
next build --webpack
```

```typescript
// next.config.ts - Turbopack 설정은 최상위 turbopack 키 사용
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true, // Cache Components 활성화
  reactCompiler: true, // React Compiler stable (자동 메모이제이션)

  // Turbopack 설정 (최상위 키, experimental.turbo 아님)
  turbopack: {
    rules: {
      // CSS 모듈 최적화
      "*.module.css": {
        loaders: ["css-loader"],
        as: "css",
      },
    },
  },

  experimental: {
    // Filesystem caching (beta)
    turbopackFileSystemCacheForDev: true,
    // 🔄 패키지 import 최적화
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons", "date-fns", "lodash-es"],
  },
};

export default nextConfig;
```

### 🆕 React Compiler (stable)

```bash
# 별도 설치 필요
npm install babel-plugin-react-compiler@latest
```

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  reactCompiler: true, // stable, 자동 메모이제이션 — useMemo/useCallback 불필요
  cacheComponents: true,
};
```

### 🆕 Navigation Hooks (15.3에서 도입)

```typescript
// ✅ onNavigate: Link 컴포넌트 prop으로 SPA 네비게이션 제어
import Link from 'next/link'

export function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      onNavigate={(e) => {
        // 네비게이션 전 작업 수행
        console.log(`${href}로 이동`)
      }}
    >
      {label}
    </Link>
  )
}

// ✅ useLinkStatus: 네비게이션 중 pending 상태 훅
'use client'

import { useLinkStatus } from 'next/link'

export function LoadingLink({ href, children }: { href: string; children: React.ReactNode }) {
  const { pending } = useLinkStatus()

  return (
    <Link href={href}>
      {pending ? <Spinner /> : children}
    </Link>
  )
}
```

### 🆕 React 19.2 신규 기능

```typescript
// ✅ View Transitions: 페이지 전환 애니메이션
import { ViewTransition } from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition>
      {children}
    </ViewTransition>
  )
}

// ✅ useEffectEvent: Effect 내 비반응 로직 분리
'use client'

import { useEffect, useEffectEvent } from 'react'

function ChatRoom({ roomId, onMessage }: { roomId: string; onMessage: (msg: string) => void }) {
  // onMessage가 변경되어도 Effect 재실행 안 됨
  const handleMessage = useEffectEvent(onMessage)

  useEffect(() => {
    const connection = createConnection(roomId)
    connection.on('message', handleMessage)
    return () => connection.disconnect()
  }, [roomId]) // onMessage 의존성 불필요
}

// ✅ Activity: 숨겨진 UI 상태 유지
import { Activity } from 'react'

export function TabPanel({ activeTab }: { activeTab: string }) {
  return (
    <>
      <Activity mode={activeTab === 'home' ? 'visible' : 'hidden'}>
        <HomeTab />
      </Activity>
      <Activity mode={activeTab === 'profile' ? 'visible' : 'hidden'}>
        <ProfileTab />
      </Activity>
    </>
  )
}
```

## ⚠️ Breaking Changes 대응

### proxy.ts로 마이그레이션 (middleware.ts deprecated)

Next.js 16에서 `middleware.ts`는 Edge runtime 전용으로 deprecated 됩니다. Node.js runtime 미들웨어는 `proxy.ts`로 이름을 변경해야 합니다.

```typescript
// ✅ proxy.ts (Next.js 16 방식)
import { NextRequest, NextResponse } from "next/server";

// 기본 export, 함수명은 proxy
export default function proxy(request: NextRequest) {
  // Node.js API 사용 가능
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

// ❌ 구버전 middleware.ts (deprecated)
// export const config = { runtime: 'nodejs', ... }
// export function middleware(request: NextRequest) { ... }
```

### React 19 호환성

```typescript
// ✅ useFormStatus 훅
'use client'

import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? '제출 중...' : '제출'}
    </button>
  )
}

// ✅ Server Actions와 form 통합
export async function createUser(formData: FormData) {
  'use server'

  const name = formData.get('name') as string
  const email = formData.get('email') as string

  await saveUser({ name, email })
  redirect('/users')
}

export default function UserForm() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <input name="email" type="email" required />
      <SubmitButton />
    </form>
  )
}
```

### 🔄 unauthorized/forbidden API

```typescript
// app/api/admin/route.ts
import { unauthorized, forbidden } from "next/server";

export async function GET(request: Request) {
  const session = await getSession(request);

  if (!session) {
    return unauthorized();
  }

  if (!session.user.isAdmin) {
    return forbidden();
  }

  const data = await getAdminData();
  return Response.json(data);
}
```

### Parallel Routes: default.js 필수

```typescript
// ⚠️ Breaking Change: 모든 slot에 default.js 필수 (없으면 빌드 실패)
app/
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── @analytics/
│   │   ├── page.tsx
│   │   └── default.js  // 🚀 필수! 없으면 빌드 실패
│   └── @notifications/
│       ├── page.tsx
│       └── default.js  // 🚀 필수! 없으면 빌드 실패
```

### 제거된 기능

| 기능                                         | 대체 방법                    |
| -------------------------------------------- | ---------------------------- |
| AMP 지원                                     | 완전 제거, HTML/CSS로 최적화 |
| `serverRuntimeConfig`, `publicRuntimeConfig` | 환경변수(`.env`) 사용        |
| `images.domains`                             | `images.remotePatterns` 사용 |
| `next build` 자동 linting                    | `npm run lint`를 별도로 실행 |

```typescript
// ❌ 제거됨
const nextConfig = {
  serverRuntimeConfig: { mySecret: "secret" },
  publicRuntimeConfig: { staticFolder: "/static" },
  images: { domains: ["example.com"] },
};

// ✅ 올바른 방법
// .env 파일에서 환경변수 관리
// NEXT_PUBLIC_API_URL=https://api.example.com (공개)
// DB_PASSWORD=secret (서버 전용)

const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "example.com", pathname: "/images/**" }],
  },
};
```

## 🔄 New Features 활용

### Route Groups 고급 패턴

```typescript
// ✅ Route Groups로 레이아웃 분리
app/
├── (marketing)/
│   ├── layout.tsx     // 마케팅 레이아웃
│   ├── page.tsx       // 홈페이지
│   └── about/
│       └── page.tsx   // 소개 페이지
├── (dashboard)/
│   ├── layout.tsx     // 대시보드 레이아웃
│   └── analytics/
│       └── page.tsx   // 분석 페이지
└── (auth)/
    ├── login/
    │   └── page.tsx
    └── register/
        └── page.tsx

// (marketing)/layout.tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="marketing-layout">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  )
}
```

### Parallel Routes 활용

```typescript
// ✅ Parallel Routes로 동시 렌더링 (모든 slot에 default.js 필수)
app/
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── @analytics/
│   │   ├── page.tsx
│   │   └── default.js  // 필수
│   └── @notifications/
│       ├── page.tsx
│       └── default.js  // 필수

// dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  notifications,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  notifications: React.ReactNode
}) {
  return (
    <div className="dashboard-grid">
      <main>{children}</main>
      <aside className="analytics-panel">
        <Suspense fallback={<AnalyticsSkeleton />}>
          {analytics}
        </Suspense>
      </aside>
      <div className="notifications-panel">
        <Suspense fallback={<NotificationsSkeleton />}>
          {notifications}
        </Suspense>
      </div>
    </div>
  )
}
```

### Intercepting Routes

```typescript
// ✅ Intercepting Routes로 모달 구현
app/
├── gallery/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx    // 전체 페이지 보기
└── @modal/
    └── (.)gallery/
        └── [id]/
            └── page.tsx // 모달 보기

// @modal/(.)gallery/[id]/page.tsx
import { Modal } from '@/components/modal'

export default async function PhotoModal({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const photo = await getPhoto(id)

  return (
    <Modal>
      <img src={photo.url} alt={photo.title} />
    </Modal>
  )
}
```

## ❌ 금지 사항

### Pages Router 사용 금지

```typescript
// ❌ 절대 금지: Pages Router 패턴
pages/
├── _app.tsx
├── _document.tsx
├── index.tsx
└── api/
    └── users.ts

// ❌ 금지: getServerSideProps, getStaticProps 사용
export async function getServerSideProps() {
  // 이 방식은 사용하지 마세요
}
```

### 안티패턴 방지

```typescript
// ❌ 금지: 불필요한 'use client' 사용
'use client'

export default function SimpleComponent({ title }: { title: string }) {
  // 상태나 이벤트 핸들러가 없는데 'use client' 사용
  return <h1>{title}</h1>
}

// ✅ 올바른 방법: Server Component로 유지
export default function SimpleComponent({ title }: { title: string }) {
  return <h1>{title}</h1>
}

// ❌ 금지: 클라이언트에서 서버 함수 직접 호출
'use client'

import { getUser } from '@/lib/database' // 서버 전용 함수

export function UserProfile() {
  const user = getUser() // 에러 발생
  return <div>{user.name}</div>
}

// ✅ 올바른 방법: 서버에서 데이터 전달
export default async function UserPage() {
  const user = await getUser()
  return <UserProfile user={user} />
}

function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>
}
```

## 코드 품질 체크리스트

개발 완료 후 다음 명령어들을 반드시 실행하세요:

```bash
# 🚀 필수: 린트 검사 (Next.js 16에서 next build가 자동 lint 실행 안 함)
npm run lint

# 🚀 필수: 빌드 테스트 (Turbopack 기본 사용)
npm run build
```

이 지침을 따라 Next.js 16의 모든 기능을 최대한 활용하여 현대적이고 성능 최적화된 애플리케이션을 개발하세요.
