# PRD: Zabbix Report Exporter — Laravel + Vue.js + Docker 재구축

**Author:** leejaegyung | **Status:** Draft | **Date:** 2026-06-30

---

## 1. Summary

현재 운영 중인 Zabbix Report Exporter는 단일 HTML 파일(`zabbix7.0.html`, `zabbix8.0.html`)에 React 18 + Babel Standalone + Tailwind을 인라인으로 담아 Zabbix 서버 웹 루트(`/usr/share/zabbix/`)에 직접 업로드해 구동하는 구조다. 동작은 안정적이지만 빌드 파이프라인 없이 1,600줄 단일 파일을 직접 편집해야 하고, 브라우저가 Zabbix API를 직접 호출(`api_jsonrpc.php` 상대경로)하므로 호스팅 위치가 Zabbix 서버에 강하게 묶여 있으며 API 토큰이 클라이언트 `localStorage`에 노출된다.

본 프로젝트는 **기능과 디자인을 100% 그대로 유지**하면서, 프런트엔드를 빌드 가능한 Vue.js SPA로, 백엔드를 Zabbix API 프록시 역할의 Laravel로 재구축하고, 전체를 Docker로 패키징한다. PDF는 기존과 동일하게 **클라이언트(브라우저)에서 생성**하며, Zabbix 버전(6.0 legacy auth vs 7.0+ Bearer)을 자동 감지하는 인증 로직을 유지·이전한다. 결과적으로 유지보수성(컴포넌트 분리·테스트·버전관리), 보안(토큰 서버 보관·CORS 해소), 배포 일관성(Docker)을 확보하면서 사용자 경험은 변하지 않는다.

---

## 2. Contacts

| Role | Name | Responsibility |
|------|------|----------------|
| PM / Owner | leejaegyung | 의사결정, 범위 승인, 수용 검증 |
| Engineering Lead | Claude (구현 담당) | 아키텍처·구현·테스트 |
| Design | (기존 산출물 승계) | 기존 UI 100% 유지, 신규 디자인 없음 |
| QA | leejaegyung | 회귀 검증(기존 HTML 대비 픽셀/기능 동등성) |

---

## 3. Background

**트리거**
- 단일 HTML 파일 방식은 빌드/모듈/테스트가 없어 기능 추가·디버깅 비용이 높다(파일당 ~1,600줄, 두 버전 간 769라인 diff를 수동 동기화).
- 브라우저→Zabbix 직접 호출 구조라 앱을 Zabbix 서버 외부에 호스팅하면 CORS로 막히고, API 토큰이 클라이언트에 평문 저장된다.
- 사내 모니터링 프로젝트(Laravel/Vue/Go, MVP 마감 2026-07-17)와 기술 스택을 정렬할 필요가 있다.

**기존 자산 / 선행 작업**
- `zabbix7.0.html` (1,544줄), `zabbix8.0.html` (1,637줄): 기능적으로 거의 동일, 라벨·레이아웃 미세 차이만 존재.
- `zabbix off/`: 폐쇄망(온프레미스)용 라이브러리 로컬 사본(react, react-dom, babel, tailwind, html2canvas, jspdf) + 적용 가이드.
- 핵심 기능 인벤토리(아래 §7에서 스토리화):
  - Zabbix JSON-RPC 호출: `host.get`, `problem.get`, `trigger.get`, `item.get`, `history.get`.
  - 4개 조회 모드: 전체 대시보드 / 호스트 / 문제 / 아이템.
  - **인프라 7대 스마트 분석**: 가동률(SLA), 요주의 서버(알람 최다), 스토리지, CPU Top5, 메모리 Top5, 사용량 급증 감지, 네트워크 트래픽 Top5.
  - 필터: 호스트 상태/그룹, 문제 심각도/호스트/그룹, 아이템 호스트.
  - 고급 설정: 커스텀 로고(base64), 워터마크, 그래프 크기(small/medium/large) — `localStorage` 영속.
  - 설정 프로필 JSON 내보내기/불러오기.
  - 화면 표시 설정(섹션·개별 분석 카드 토글, PDF 포함 여부).
  - 클라이언트 PDF 생성(html2canvas scale 1.5 → jsPDF A4 세로, 페이지 분할).
  - 에러 바운더리, 커스텀 alert/confirm 모달, 토큰 발급 도움말 모달, 한국어 UI.
  - **버전 자동감지 인증**: Bearer 헤더 우선 시도 → `-32602` + auth 오류 시 body `auth` 필드(레거시)로 자동 폴백.

**제약 / 가정**
- 다수 배포 환경이 **인터넷 차단 폐쇄망**. 모든 의존성은 이미지/번들에 동봉되어야 하며 런타임 외부 CDN 의존 금지.
- 디자인·기능 변경 불가(픽셀/동작 동등성이 수용 기준). 신규 기능은 비목표.
- PDF는 서버가 아닌 **클라이언트에서 생성**(보안·폐쇄망·헤드리스 브라우저 운영비용 회피).
- Zabbix 6.0 / 7.0 / 8.0 인증 차이를 모두 수용해야 한다.

---

## 4. Objective

1. **기능·디자인 동등성**: 기존 두 HTML 앱의 모든 기능·레이아웃·문구를 단일 Vue 앱으로 통합하고, 회귀 체크리스트 100% 통과(육안 비교 시 사용자 식별 가능한 차이 0건).
2. **유지보수성 향상**: Vite 빌드 + 컴포넌트 분리 + 단위 테스트 도입으로, 기존 단일 파일 수동 편집을 제거(컴포넌트 모듈화, 핵심 로직 테스트 커버리지 ≥ 70%).
3. **보안·배포 개선**: Zabbix API 토큰을 Laravel 서버 세션/`.env`에 보관하고 브라우저는 Laravel 프록시만 호출(브라우저↔Zabbix 직접 호출·토큰 클라이언트 평문 저장 제거). `docker compose up` 한 번으로 폐쇄망 포함 어디서나 기동.

**Non-Goals (명시적 범위 외)**
- 새로운 리포트 유형·차트·분석 항목 추가.
- UI 리디자인, 다국어(한국어 외) 지원.
- 서버사이드 PDF 렌더링, 스케줄링/이메일 발송, 멀티테넌시.
- Zabbix 6.0 미만 버전 지원, 사용자 인증/RBAC 시스템 신규 구축.
- 데이터 영속 DB(리포트 이력 저장) — 본 범위에서는 무상태 프록시.

---

## 5. Market Segments

| Segment | Size | Priority | Notes |
|---------|------|----------|-------|
| 사내/고객사 Zabbix 운영팀(폐쇄망) | 소수·고가치 | P0 | 주 사용처. 온프레미스·인터넷 차단. |
| Zabbix 7.0/8.0 신규 도입처 | 중 | P0 | Bearer 토큰 인증. |
| Zabbix 6.0 레거시 운영처 | 중 | P1 | legacy `auth` 폴백 필요. |
| MSP/리셀러(고객 리포트 납품) | 소 | P2 | 로고·워터마크 브랜딩 활용. |

---

## 6. Value Propositions

| User Type | Job-to-be-Done | Pain Relieved | Gain Created |
|-----------|----------------|---------------|--------------|
| Zabbix 운영자 | 주간/월간 인프라 리포트를 PDF로 만들어 보고 | 수기 캡처·편집의 반복 노동 | 클릭 몇 번으로 표준 PDF 생성 |
| 폐쇄망 관리자 | 인터넷 없이 사내에 배포·구동 | CDN 의존·환경별 설정 차이 | Docker 이미지 하나로 일관 배포 |
| 보안 담당자 | API 토큰 노출 최소화 | 토큰 클라이언트 평문 저장 | 토큰 서버 보관, 프록시 경유 |
| 유지보수 개발자 | 기능 추가·버그 수정 | 1,600줄 단일 파일·빌드 부재 | 모듈·테스트·버전관리된 코드베이스 |
| 보고서 수신자(관리자) | 한눈에 인프라 상태 파악 | 원시 데이터 해석 부담 | 7대 스마트 분석 요약 |

---

## 7. Solution

### 아키텍처 개요

```
[브라우저: Vue 3 SPA (Vite 번들)]
   │  ├─ UI/상태/필터/뷰 설정 (기존 React 로직 1:1 포팅)
   │  └─ PDF 생성: html2canvas + jsPDF (클라이언트, 기존과 동일)
   │  HTTP (동일 출처)
   ▼
[Laravel: API 프록시]
   │  ├─ POST /api/zabbix  → JSON-RPC 페이로드 중계
   │  ├─ 버전 자동감지 인증(Bearer → legacy auth 폴백) 서버측 수행
   │  ├─ 토큰은 .env / 서버 세션 보관 (클라이언트 미노출)
   │  └─ CORS·에러 정규화
   │  HTTP
   ▼
[Zabbix Server: api_jsonrpc.php]

[Docker Compose] nginx + php-fpm(Laravel) + 정적 Vue 빌드 (+ 의존성 전부 동봉, 폐쇄망 대응)
```

설계 원칙: 프록시는 **얇게(thin)** 유지 — 기존 클라이언트가 보내던 JSON-RPC 메서드/파라미터를 그대로 전달하고, 차이는 인증 헤더/폴백 처리에 한정한다. 분석·집계·렌더링 로직은 클라이언트에 그대로 둔다(동등성 보장 + 서버 단순화).

---

### User Stories (P0 — Must Have)

#### US-1. Zabbix 데이터 조회 (4개 모드)
As a Zabbix 운영자, I want 전체 대시보드/호스트/문제/아이템을 조회, so that 리포트에 넣을 데이터를 가져온다.

Acceptance Criteria:
- [ ] "전체 갱신"은 `host.get`, `problem.get`(+`trigger.get` 그룹 매핑), `item.get`+`history.get`을 기존과 동일 파라미터로 호출한다.
- [ ] 호스트/문제/아이템 개별 조회 버튼이 각각 동작한다.
- [ ] 기간(시작/종료 datetime-local)이 `time_from`/`time_till`(epoch)로 변환되며, 미지정 시 problem은 `recent:true`.
- [ ] item은 `value_type` 0(float)/3(uint)만, `monitored:true`, item limit 300 / history limit 1000을 유지한다.
```gherkin
Scenario: 전체 대시보드 갱신
  Given 유효한 토큰과 기간이 설정됨
  When "전체 갱신"을 클릭
  Then 호스트·문제·아이템 데이터가 로드되고 모든 항목이 기본 선택된다
```

#### US-2. 버전 자동감지 인증 (프록시 경유)
As a 운영자, I want Zabbix 6.0/7.0/8.0 어디서든 토큰만 넣으면 인증, so that 버전을 신경 쓰지 않는다.

Acceptance Criteria:
- [ ] Laravel 프록시가 1차로 `Authorization: Bearer {token}` 헤더로 호출한다(7.0+).
- [ ] 응답이 `error.code === -32602` && auth 관련 메시지면 body `auth` 필드(legacy)로 자동 재시도한다(≤6.0).
- [ ] 클라이언트는 인증 방식을 알 필요 없이 정규화된 `result`/`error`만 받는다.
- [ ] 토큰은 서버에 보관되고 브라우저 응답·`localStorage`에 평문 저장되지 않는다.
```gherkin
Scenario: 레거시 폴백
  Given Zabbix 6.0 서버
  When Bearer 호출이 -32602 auth 오류 반환
  Then 프록시가 legacy auth로 재시도하여 성공 결과를 반환
```

#### US-3. 인프라 7대 스마트 분석
As a 관리자, I want 가동률·요주의 서버·스토리지·CPU/메모리 Top5·사용량 급증·네트워크 Top5 요약, so that 인프라 상태를 한눈에 본다.

Acceptance Criteria:
- [ ] 7개 분석 카드의 계산식·정렬·표시 수치가 기존 HTML과 동일하다(평균값 헬퍼 로직 동일).
- [ ] 각 카드를 개별 토글할 수 있고, 전부 off면 분석 섹션이 렌더되지 않는다.
- [ ] 선택 기간 기반으로 계산된다.

#### US-4. 클라이언트 PDF 생성
As a 운영자, I want 화면을 A4 PDF로 내보내기, so that 보고서로 제출한다.

Acceptance Criteria:
- [ ] html2canvas(scale 1.5, backgroundColor #ffffff, windowWidth 1000) → jsPDF A4 세로, 페이지 분할 방식 유지.
- [ ] 라이브러리는 번들에 포함(런타임 CDN 의존 없음). 미로딩 시 내보내기 버튼 비활성 + 안내.
- [ ] 데이터 0건 또는 로딩 중에는 버튼 비활성.
- [ ] "PDF에 분석 포함" 토글과 섹션 표시 설정이 출력물에 반영된다.

#### US-5. 필터링 & 페이지네이션
As a 운영자, I want 상태/그룹/심각도/호스트로 필터, so that 필요한 항목만 리포트에 담는다.

Acceptance Criteria:
- [ ] 호스트(상태/그룹), 문제(심각도 다중/호스트/그룹), 아이템(호스트) 필터가 동일하게 동작.
- [ ] 테이블 10건/페이지, 그리드는 그래프 크기별(small 8 / medium 6 / large 3) 유지.
- [ ] 데이터·필터 변경 시 페이지 1로 리셋.

#### US-6. 폐쇄망 Docker 배포
As a 폐쇄망 관리자, I want `docker compose up`으로 전체 스택 기동, so that 인터넷 없이 운영한다.

Acceptance Criteria:
- [ ] 이미지 빌드에 모든 의존성(npm/composer 패키지, JS 라이브러리) 포함, 런타임 외부 네트워크 불필요.
- [ ] `ZABBIX_API_URL`, `ZABBIX_API_TOKEN`(선택) 등 환경변수로 설정.
- [ ] nginx + php-fpm + 정적 Vue 빌드가 단일 compose로 기동.
- [ ] 빌드/실행 절차가 README에 문서화.

### User Stories (P1 — Should Have)

#### US-7. 고급 설정(로고·워터마크·그래프 크기) 영속
As a MSP 담당자, I want 로고/워터마크/그래프 크기 설정 저장, so that 브랜딩된 리포트를 반복 생성한다.
- [ ] 커스텀 로고(이미지 업로드→base64), 워터마크 텍스트, 그래프 크기 설정 유지.
- [ ] 비민감 표시 설정은 `localStorage` 영속(단, 토큰은 제외).
- [ ] 적용 전 draft → 저장 시 반영(기존 동작 동일).

#### US-8. 설정 프로필 JSON 내보내기/불러오기
As a 운영자, I want 표시·분석·뷰 설정을 JSON으로 내보내고 불러오기, so that 환경 간 설정을 공유한다.
- [ ] 내보내기 시 표시 설정 일체를 JSON 파일로 다운로드.
- [ ] 불러오기 시 동일 키들을 복원(토큰 등 민감정보 제외 정책 확인).

#### US-9. 에러/도움말 UX 동등성
As a 사용자, I want 명확한 오류 안내와 토큰 발급 도움말, so that 스스로 문제를 해결한다.
- [ ] 네트워크/CORS/404/401·인증오류별 한국어 안내 문구 유지(프록시 오류를 동일 카테고리로 정규화).
- [ ] 에러 바운더리, 커스텀 alert/confirm 모달, 토큰 발급 도움말 모달 유지.

### User Stories (P2 — Nice to Have)
- [ ] 7.0/8.0 라벨 미세 차이를 설정 토글/단일 UI로 통합(기능 영향 없음).
- [ ] 프록시 응답 캐싱(동일 기간 재조회 시).

---

### Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| 동등성 | 기존 HTML 대비 사용자 식별 가능한 기능/레이아웃 차이 0건(회귀 체크리스트 통과) |
| Performance | 대시보드 갱신 후 렌더 < 2s(데이터 100호스트/100문제/300아이템 기준, 네트워크 제외); PDF 생성 기존 대비 동등 이하 |
| 보안 | API 토큰 서버 보관, 브라우저 미노출, HTTPS 권장, 프록시는 허용 메서드 화이트리스트 검토 |
| 폐쇄망 | 런타임 외부 CDN/패키지 다운로드 0; 모든 자산 이미지 동봉 |
| 호환성 | Zabbix 6.0(legacy) / 7.0 / 8.0(Bearer); 최신 Chromium 계열 브라우저 |
| 유지보수 | 핵심 로직(인증 폴백, 분석 계산, 시간 변환) 단위 테스트 커버리지 ≥ 70% |
| 접근성 | 기존 수준 유지(키보드 포커스·대비), 신규 저하 없음 |
| i18n | 한국어 UI 문구 1:1 유지 |

### Dependencies

| Dependency | Owner | Status | ETA |
|------------|-------|--------|-----|
| Zabbix 테스트 서버(6.0/7.0/8.0) 접근 | leejaegyung | 미정 | 착수 전 필요 |
| html2canvas / jsPDF 번들 동봉 | Eng | 자산 보유(`zabbix off/`) | 즉시 |
| Docker 빌드 환경 | Eng | 가용 | 즉시 |
| 기존 HTML 회귀 기준(스크린샷/체크리스트) | QA | 작성 필요 | 착수 시 |

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 프록시 도입으로 인증/에러 흐름 미세 차이 발생 | 중 | 높음 | 에러 코드 정규화 테이블 작성, 3개 버전 통합 테스트 |
| html2canvas 렌더가 SPA 라우팅/스타일과 미묘하게 달라짐 | 중 | 높음 | 동일 DOM/CSS 보장, 기존 산출물과 PDF 픽셀 비교 |
| 폐쇄망에서 빌드 의존성 누락 | 중 | 높음 | 멀티스테이지 빌드로 의존성 동봉, 오프라인 빌드 검증 |
| 토큰 서버 보관 방식과 멀티유저 기대 충돌 | 낮음 | 중 | 무상태 프록시 + 요청별 토큰 전달 옵션 설계 검토 |
| 기능 동등성 범위 해석 차이 | 중 | 중 | 착수 전 회귀 체크리스트 합의(서명) |

---

## 8. Release

| Milestone | Date | Status |
|-----------|------|--------|
| M0 회귀 체크리스트·아키텍처 합의 | 2026-07-03 | Planned |
| M1 Laravel 프록시 + 버전 자동감지 인증(3버전 통과) | 2026-07-08 | Planned |
| M2 Vue SPA 기능 포팅(조회·필터·분석·설정) | 2026-07-14 | Planned |
| M3 클라이언트 PDF + 동등성 회귀 검증 | 2026-07-16 | Planned |
| M4 Docker 패키징 + 폐쇄망 오프라인 빌드 검증 + 문서 | 2026-07-17 | Planned |

> 모니터링 프로젝트 MVP 마감(2026-07-17)에 정렬.

**Success Metrics:**
| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| 회귀 체크리스트 통과율 | N/A | 100% | M3 |
| 토큰 클라이언트 노출 | 평문 `localStorage` | 0(서버 보관) | M1 |
| 지원 Zabbix 버전 인증 통과 | 수동/혼재 | 6.0·7.0·8.0 자동 | M1 |
| 핵심 로직 테스트 커버리지 | 0% | ≥ 70% | M3 |
| 폐쇄망 무외부의존 기동 | 부분(수동 라이브러리) | `docker compose up` 단일 | M4 |
| 코드베이스 형태 | 단일 HTML 2개(수동 동기화) | 모듈화 단일 Vue 앱 | M2 |

---

## Go/No-Go Gate

- [ ] 기능·디자인 동등성 회귀 체크리스트 100% (필수)
- [ ] Zabbix 6.0/7.0/8.0 인증 자동감지 통과 (필수)
- [ ] 클라이언트 PDF 출력이 기존과 동등 (필수)
- [ ] 폐쇄망에서 외부 네트워크 없이 `docker compose up` 기동 (필수)
- [ ] API 토큰이 클라이언트에 노출되지 않음 (필수)

위 5개 필수 항목 전부 충족 시 Go. 하나라도 미충족 시 No-Go(또는 범위 재조정).
