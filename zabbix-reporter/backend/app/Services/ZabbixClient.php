<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Zabbix JSON-RPC 클라이언트 — 버전 자동감지 인증.
 *
 *  1) Authorization: Bearer {token} 헤더로 1차 호출 (Zabbix 7.0+/8.0)
 *  2) 1차가 인증 관련 JSON-RPC 오류면 body의 auth 필드(legacy)로 재시도 (Zabbix ≤6.0)
 *
 * 반환값은 항상 정규화된 형태:
 *   성공: ['result' => mixed]
 *   실패: ['error' => ['code' => string|int, 'message' => string]]
 */
class ZabbixClient
{
    public function __construct(
        private readonly string $url,
        private readonly string $token,
        private readonly int $timeout = 30,
    ) {}

    /**
     * @return array{result?: mixed, error?: array{code: string|int, message: string}}
     */
    public function call(string $method, array $params, ?string $token = null): array
    {
        $token = $token ?: $this->token;

        if ($token === '') {
            return $this->error('NO_TOKEN', 'API 토큰이 설정되지 않았습니다.');
        }

        // 1차: Bearer 헤더 (Zabbix 7.0+/8.0)
        $bearer = $this->attempt($method, $params, $token, legacy: false);

        if ($bearer['transport'] !== null) {
            return $bearer['transport']; // 전송 계층 오류 — 폴백 무의미
        }
        if (! isset($bearer['payload']['error'])) {
            return ['result' => $bearer['payload']['result'] ?? null];
        }

        // 1차가 인증 오류 → legacy auth 폴백 (Zabbix ≤6.0)
        if ($this->isAuthError($bearer['payload']['error'])) {
            $legacy = $this->attempt($method, $params, $token, legacy: true);

            if ($legacy['transport'] !== null) {
                return $legacy['transport'];
            }
            if (! isset($legacy['payload']['error'])) {
                return ['result' => $legacy['payload']['result'] ?? null];
            }

            return $this->normalizeJsonRpcError($legacy['payload']['error']);
        }

        return $this->normalizeJsonRpcError($bearer['payload']['error']);
    }

    /**
     * 단일 HTTP 시도. 전송 계층 오류는 정규화해 transport에 담고, 그 외엔 payload(JSON)를 담는다.
     *
     * @return array{ok: bool, payload: ?array, transport: ?array}
     */
    private function attempt(string $method, array $params, string $token, bool $legacy): array
    {
        $body = [
            'jsonrpc' => '2.0',
            'method' => $method,
            'params' => $params,
            'id' => random_int(1, 100000),
        ];

        $request = Http::timeout($this->timeout)
            ->acceptJson()
            ->withHeaders(['Content-Type' => 'application/json-rpc']);

        if ($legacy) {
            $body['auth'] = $token; // 레거시: body에 auth
        } else {
            $request = $request->withToken($token); // Authorization: Bearer
        }

        try {
            $response = $request->post($this->url, $body);
        } catch (ConnectionException $e) {
            return ['ok' => false, 'payload' => null,
                'transport' => $this->error('NETWORK_OR_CORS_ERROR', '프록시가 Zabbix 서버에 연결할 수 없습니다.')];
        }

        if ($response->status() === 404) {
            return ['ok' => false, 'payload' => null,
                'transport' => $this->error('HTTP_404', 'Zabbix API URL을 찾을 수 없습니다 (404). api_jsonrpc.php 경로를 확인하세요.')];
        }
        if (in_array($response->status(), [401, 403], true)) {
            return ['ok' => false, 'payload' => null,
                'transport' => $this->error('HTTP_401', '접근이 거부되었습니다 (401/403).')];
        }

        $payload = $response->json();
        if (! is_array($payload)) {
            return ['ok' => false, 'payload' => null,
                'transport' => $this->error('NOT_JSON', 'Zabbix 응답을 JSON으로 해석할 수 없습니다.')];
        }

        return ['ok' => true, 'payload' => $payload, 'transport' => null];
    }

    /**
     * Zabbix JSON-RPC 오류가 인증/세션/토큰 관련인지 판별 (버전별 메시지 차이 흡수).
     */
    private function isAuthError(array $error): bool
    {
        $haystack = strtolower(trim(($error['data'] ?? '').' '.($error['message'] ?? '')));

        foreach (['auth', 'session', 'token', 'not authori', 'permission', 're-login', 'reauthenticate', 'logged in'] as $needle) {
            if (str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Zabbix JSON-RPC 오류를 클라이언트 친화적 코드/메시지로 정규화.
     */
    private function normalizeJsonRpcError(array $error): array
    {
        if ($this->isAuthError($error)) {
            return $this->error('AUTH_EXPIRED', 'API 토큰이 만료되었거나 유효하지 않습니다. 새 토큰을 발급해 주세요.');
        }

        return $this->error(
            $error['code'] ?? 'ZABBIX_ERROR',
            $error['data'] ?? $error['message'] ?? 'Zabbix API 오류가 발생했습니다.',
        );
    }

    /**
     * @return array{error: array{code: string|int, message: string}}
     */
    private function error(string|int $code, string $message): array
    {
        return ['error' => ['code' => $code, 'message' => $message]];
    }
}
