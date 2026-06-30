# Ubuntu 배포 가이드

이 문서는 `zabbix-reporter`를 Ubuntu 서버에 Docker Compose로 설치하고, 같은 서버 또는 같은 네트워크의 Zabbix와 함께 사용하는 방법을 설명합니다.

## 1. 구성 개요

현재 Docker 구성은 다음과 같습니다.

| 서비스 | 역할 | 내부 포트 |
|---|---|---|
| `app` | Laravel 백엔드 API, Zabbix API 프록시 | `9000` |
| `web` | Vue 프론트엔드 빌드 결과를 Nginx로 서빙 | `80` |

외부에서는 기본적으로 다음 주소로 접속합니다.

```text
http://서버IP:8080
```

Zabbix 웹이 이미 `80` 또는 `443` 포트를 사용하고 있을 가능성이 높으므로, 리포터는 기본 포트 `8080`을 사용하는 것을 권장합니다.

## 2. Ubuntu에 Docker 설치

Docker 공식 Ubuntu 설치 절차를 기준으로 설치합니다.

공식 문서:

```text
https://docs.docker.com/engine/install/ubuntu/
```

기존에 Ubuntu 기본 저장소 버전의 Docker가 설치되어 있다면 먼저 제거합니다.

```bash
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  sudo apt-get remove -y $pkg
done
```

Docker 공식 APT 저장소를 추가합니다.

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
```

Docker Engine과 Compose 플러그인을 설치합니다.

```bash
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker

docker --version
docker compose version
```

현재 사용자로 Docker 명령을 실행하려면 다음 명령을 실행한 뒤 로그아웃 후 다시 로그인합니다.

```bash
sudo usermod -aG docker $USER
```

## 3. 배포 방식 선택

배포 방식은 두 가지가 있습니다.

| 방식 | 설명 | 추천 상황 |
|---|---|---|
| Docker Context 원격 배포 | Windows PC의 소스를 Docker가 원격 Ubuntu 서버로 보내서 서버에서 이미지 빌드 및 실행 | 소스 폴더를 서버에 직접 복사하고 싶지 않을 때 |
| 파일 업로드 후 서버에서 실행 | `scp` 또는 Git으로 소스를 서버에 복사한 뒤 서버에서 `docker compose up` 실행 | 서버에 소스를 남기고 운영하고 싶을 때 |

소스 파일을 서버에 직접 복사하지 않고 바로 Docker로 배포하려면 `3-1` 방식을 사용합니다.

서버에 소스를 배치해서 관리하려면 `3-2` 방식으로 진행합니다.

## 3-1. Docker Context로 원격 서버에 바로 배포

이 방식은 Windows PC에서 명령을 실행하지만, 실제 이미지는 Ubuntu 서버의 Docker 엔진에서 빌드되고 컨테이너도 Ubuntu 서버에서 실행됩니다.

전제 조건:

- Ubuntu 서버에 Docker가 설치되어 있어야 합니다.
- Windows PC에서 `root@192.168.1.132`로 SSH 접속이 가능해야 합니다.
- Windows PC에 Docker CLI 또는 Docker Desktop이 설치되어 있어야 합니다.

Windows PowerShell에서 실행합니다.

```powershell
cd "C:\Users\leejk\OneDrive\바탕 화면\개인 프로잭트\자빅스 pdf\zabbix-reporter"
```

원격 Docker Context를 생성합니다.

```powershell
docker context create zabbix-server --docker "host=ssh://root@192.168.1.132"
```

원격 서버 Docker 연결을 확인합니다.

```powershell
docker --context zabbix-server ps
```

`.env` 파일이 없다면 로컬 프로젝트 폴더에서 생성합니다.

```powershell
copy .env.example .env
notepad .env
```

`.env` 예시:

```env
WEB_PORT=8080

APP_KEY=base64:여기에_생성한_키
APP_ENV=production
APP_DEBUG=false

ZABBIX_API_URL=http://192.168.1.132/zabbix/api_jsonrpc.php
ZABBIX_API_TOKEN=
ZABBIX_ALLOW_REQUEST_URL=true
```

원격 Ubuntu 서버에 빌드 및 실행합니다.

```powershell
docker --context zabbix-server compose up -d --build
```

상태 확인:

```powershell
docker --context zabbix-server compose ps
```

로그 확인:

```powershell
docker --context zabbix-server compose logs -f
```

접속:

```text
http://192.168.1.132:8080
```

주의:

- 이 방식은 서버의 `/opt/zabbix-reporter`에 소스 폴더를 복사하지 않습니다.
- Docker 이미지와 컨테이너는 Ubuntu 서버에 생성됩니다.
- 이후 재배포도 Windows PC의 프로젝트 폴더에서 같은 명령을 실행합니다.

## 3-2. 프로젝트 업로드 후 서버에서 실행

서버의 `/opt/zabbix-reporter` 경로에 프로젝트를 배치하는 것을 권장합니다.

```bash
sudo mkdir -p /opt/zabbix-reporter
sudo chown -R $USER:$USER /opt/zabbix-reporter
```

Git 저장소를 사용하는 경우:

```bash
cd /opt
git clone <저장소주소> zabbix-reporter
cd /opt/zabbix-reporter
```

압축 파일로 전달하는 경우에는 이 `zabbix-reporter` 폴더 전체를 `/opt/zabbix-reporter`에 복사합니다.

## 4. 환경 변수 설정

프로젝트 루트에서 `.env.example`을 복사합니다.

```bash
cd /opt/zabbix-reporter
cp .env.example .env
```

`.env` 파일을 수정합니다.

```env
WEB_PORT=8080

APP_KEY=base64:여기에_생성한_키
APP_ENV=production
APP_DEBUG=false

ZABBIX_API_URL=http://서버IP/zabbix/api_jsonrpc.php
ZABBIX_API_TOKEN=
ZABBIX_ALLOW_REQUEST_URL=true
```

`APP_KEY`는 다음 명령으로 생성할 수 있습니다.

```bash
echo "base64:$(openssl rand -base64 32)"
```

출력된 값을 `.env`의 `APP_KEY`에 넣습니다.

## 5. Zabbix API URL 설정

Docker 컨테이너 안에서 `localhost`는 Ubuntu 서버가 아니라 컨테이너 자기 자신입니다.

따라서 Zabbix가 같은 서버에 설치되어 있어도 `localhost` 대신 서버 IP 또는 접근 가능한 호스트명을 사용하는 것이 안전합니다.

예시:

```env
ZABBIX_API_URL=http://192.168.0.10/zabbix/api_jsonrpc.php
```

Zabbix가 HTTPS로 서비스 중이라면 다음처럼 설정합니다.

```env
ZABBIX_API_URL=https://zabbix.example.com/zabbix/api_jsonrpc.php
```

`ZABBIX_API_TOKEN`은 선택값입니다.

- 비워두면 화면에서 입력한 인증 정보 또는 요청별 토큰을 사용할 수 있습니다.
- 서버에서 고정 토큰을 사용하려면 Zabbix API 토큰을 넣습니다.

## 6. 방화벽 설정

Ubuntu에서 `ufw`를 사용한다면 리포터 접속 포트 `8080`을 허용합니다.

```bash
sudo ufw allow 8080/tcp
sudo ufw status
```

`ufw`가 비활성화되어 있다면 별도 설정이 필요 없을 수 있습니다.

접속 구조 예시:

```text
Zabbix 웹:       http://서버IP/zabbix
Zabbix Reporter: http://서버IP:8080
```

## 7. Docker Compose 실행

프로젝트 루트에서 실행합니다.

```bash
cd /opt/zabbix-reporter
docker compose up -d --build
```

컨테이너 상태 확인:

```bash
docker compose ps
```

로그 확인:

```bash
docker compose logs -f
```

서비스 접속:

```text
http://서버IP:8080
```

백엔드 헬스 체크:

```bash
curl http://localhost:8080/up
```

`200` 응답이 나오면 Nginx에서 Laravel 백엔드까지 정상 연결된 상태입니다.

## 8. 운영 명령어

재시작:

```bash
docker compose restart
```

소스 업데이트 후 재빌드:

```bash
docker compose up -d --build
```

중지:

```bash
docker compose down
```

서비스별 로그:

```bash
docker compose logs -f app
docker compose logs -f web
```

## 9. 권장 운영 구조

Zabbix와 같은 Ubuntu 서버에서 사용할 경우 다음 구성을 권장합니다.

```text
Ubuntu Server
├─ Zabbix Server / Zabbix Web
│  └─ http://서버IP/zabbix
└─ Docker Compose
   ├─ zabbix-reporter-app  Laravel API
   └─ zabbix-reporter-web  Vue + Nginx
      └─ http://서버IP:8080
```

도메인과 SSL을 붙이는 경우에는 앞단에 Nginx 또는 Apache reverse proxy를 두는 방식이 좋습니다.

예시:

```text
https://zabbix.example.com  -> 기존 Zabbix
https://report.example.com  -> Zabbix Reporter
```

## 10. 문제 해결

### 컨테이너가 실행되지 않을 때

```bash
docker compose ps
docker compose logs -f
```

### 웹 접속이 되지 않을 때

방화벽과 포트 매핑을 확인합니다.

```bash
sudo ufw status
docker compose ps
```

`0.0.0.0:8080->80/tcp`가 보이면 Docker 포트 매핑은 정상입니다.

### Zabbix API 연결이 실패할 때

컨테이너 내부에서 Zabbix API 주소에 접근 가능한지 확인합니다.

```bash
docker compose exec app sh
```

컨테이너 안에서:

```bash
php -r "echo file_get_contents('http://서버IP/zabbix/api_jsonrpc.php');"
```

응답이 없으면 다음을 확인합니다.

- `ZABBIX_API_URL`이 `localhost`로 되어 있지 않은지
- Zabbix 웹 서버가 외부 또는 Docker 컨테이너에서 접근 가능한지
- Ubuntu 방화벽 또는 보안 장비가 접근을 막고 있지 않은지
- HTTPS 사용 시 인증서 문제가 없는지
