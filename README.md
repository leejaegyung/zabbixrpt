# Zabbix Report Exporter (Laravel + Vue + Docker)

기존 React 단일 HTML 앱(`zabbix7.0.html`, `zabbix8.0.html`)을 **기능·디자인 100% 유지**한 채
Laravel(API 프록시) + Vue 3 + Docker로 재구축한 버전.

설계·기획 문서: 상위 폴더 [`docs/`](../docs/00-개요-INDEX.md) 참고.

## 구조

```
zabbix-reporter/
├─ backend/    # Laravel 12 — Zabbix JSON-RPC 프록시 (버전 자동감지 인증)
├─ frontend/   # Vue 3 + Vite + Tailwind + Pinia — UI/분석/PDF(클라이언트)
├─ docker/     # nginx + php-fpm 설정
└─ docker-compose.yml
```

## 로컬 개발

```bash
# 백엔드
cd backend && cp .env.example .env && php artisan key:generate && php artisan serve   # :8000

# 프런트엔드 (별도 터미널)
cd frontend && npm install && npm run dev    # :5173 (/api → :8000 프록시)
```

## 환경변수 (backend/.env)

| 변수 | 설명 |
|------|------|
| `ZABBIX_API_URL` | Zabbix `api_jsonrpc.php` 전체 URL |
| `ZABBIX_API_TOKEN` | (선택) 서버 보관 API 토큰 |

## 빌드 / 배포 (Docker, 폐쇄망)

```bash
# (선택) APP_KEY·Zabbix 대상 지정
cp .env.example .env   # APP_KEY, ZABBIX_API_URL 등 편집

docker compose up -d --build    # web(nginx) :8080 → app(php-fpm/Laravel) → Zabbix
```

- 접속: `http://localhost:8080` (포트는 `WEB_PORT`로 변경 가능)
- `web` 컨테이너가 Vue 정적 빌드를 서빙하고 `/api` 요청을 `app`(Laravel)으로 프록시한다.
- 모든 의존성(npm/composer 패키지, html2canvas·jsPDF)은 이미지 빌드 시점에 동봉되어 **런타임 외부 네트워크가 불필요**하다.

| compose 환경변수 | 설명 | 기본 |
|---|---|---|
| `WEB_PORT` | 외부 노출 포트 | 8080 |
| `APP_KEY` | Laravel 키 (`php artisan key:generate --show`) | 미지정 시 임시 생성 |
| `ZABBIX_API_URL` | 서버 고정 대상 (UI 입력이 있으면 요청별로 덮어씀) | 빈 값 |
| `ZABBIX_API_TOKEN` | 서버 보관 토큰 | 빈 값 |
| `ZABBIX_ALLOW_REQUEST_URL` | UI 입력 URL 허용 여부 | true |

## 테스트

```bash
cd frontend && npm test     # Vitest — 분석/포맷 핵심 로직
cd backend && php artisan test   # Pest/PHPUnit — 프록시 인증 폴백
```
