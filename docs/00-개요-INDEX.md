# Zabbix Report Exporter 재구축 — 문서 인덱스

기존 React 단일 HTML 앱(`zabbix7.0.html`, `zabbix8.0.html`)을 **Laravel(API 프록시) + Vue.js 3 + Docker** 기반으로,
**기능·디자인 100% 유지**한 채 재구축한다. 작업은 Plan → Build → Verify (기획 → 개발 → 검증) 순서로 진행한다.

## 핵심 결정 (확정)

| 항목 | 결정 | 비고 |
|------|------|------|
| 백엔드 역할 | **Laravel = 얇은 JSON-RPC 프록시** | Vue → Laravel → Zabbix. CORS 해소, 토큰 서버 보관 |
| 버전 통합 | **단일 앱 + 자동감지 인증** | Bearer 우선 → `-32602` auth 오류 시 legacy `auth` 폴백 |
| PDF 생성 | **클라이언트 유지** | html2canvas(scale 1.5) → jsPDF A4 세로, 번들 동봉 |
| 분석 로직 | **클라이언트 유지** | 인프라 7대 스마트 분석 1:1 포팅 |
| 배포 | **Docker Compose** | nginx + php-fpm + 정적 Vue 빌드, 폐쇄망 의존성 동봉 |

## 문서 구성 (단계별)

| 단계 | 문서 | 상태 |
|------|------|------|
| 기획 | [01-기획-PRD.md](./01-기획-PRD.md) — 제품 요구사항, 9개 사용자 스토리, Go/No-Go | ✅ 완료 |
| 개발 | [02-아키텍처-설계.md](./02-아키텍처-설계.md) — 기술 설계, 디렉터리, 프록시/컴포넌트/Docker | ✅ 완료 |
| 개발 | [03-개발-작업분해.md](./03-개발-작업분해.md) — WBS (Phase 0~4 **전부 구현 완료**) | ✅ 완료 |
| 검증 | [04-검증-회귀체크리스트.md](./04-검증-회귀체크리스트.md) — 코드/Docker 검증 완료, 육안·실Zabbix 회귀 잔여 | 🟡 진행 |

## 구현 현황 (2026-06-30)

코드: [`../zabbix-reporter/`](../zabbix-reporter/) — backend(Laravel 12) + frontend(Vue 3) + docker.
- **Phase 0~4 전부 구현 완료**. 테스트 **PHPUnit 14 + Vitest 30 통과**.
- `docker compose up`으로 web(nginx:8090) + app(php-fpm) 구동, E2E·폐쇄망 런타임 검증 완료.
- 잔여(검증 단계): 실 브라우저 + 실 Zabbix(6.0/7.0/8.0)에서 육안 디자인·PDF 동등성, 3버전 인증 회귀.

## 진행 워크플로우

```
[기획] PRD 확정 ──▶ [개발] 아키텍처 설계 ──▶ [개발] 작업분해(WBS) ──▶ 구현 ──▶ [검증] 회귀 체크리스트 ──▶ Go/No-Go
                                                                  ▲                          │
                                                                  └──────── 미통과 시 보정 ◀──┘
```

## 기존 자산 분석 요약 (실측)

- `zabbix7.0.html` (1,544줄): Zabbix ≤6.0~7.0 — 레거시 인증(`auth`를 body에).
- `zabbix8.0.html` (1,637줄): Zabbix 7.0+/8.0 — `Authorization: Bearer` 헤더 + ErrorBoundary + 향상된 에러 핸들링 + 상대경로 API URL 기본값.
- 두 파일 diff 769라인 = 대부분 인증 방식 + 에러 처리 + 라벨/들여쓰기. 기능 본질 동일 → 단일 앱 통합 타당.
- 사용 Zabbix API: `host.get`, `problem.get`, `trigger.get`, `item.get`, `history.get`.
