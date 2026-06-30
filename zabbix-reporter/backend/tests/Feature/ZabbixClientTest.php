<?php

namespace Tests\Feature;

use App\Services\ZabbixClient;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ZabbixClientTest extends TestCase
{
    private const URL = 'http://zabbix.test/api_jsonrpc.php';

    private function client(string $token = 'TOKEN123'): ZabbixClient
    {
        return new ZabbixClient(self::URL, $token, 5);
    }

    /** Zabbix 7.0/8.0 — Bearer 헤더로 1차 성공, 폴백 없음. */
    public function test_bearer_auth_succeeds_on_first_attempt(): void
    {
        Http::fake([self::URL => Http::response(['jsonrpc' => '2.0', 'result' => [['hostid' => '1']], 'id' => 1])]);

        $res = $this->client()->call('host.get', ['output' => 'extend']);

        $this->assertSame([['hostid' => '1']], $res['result']);

        Http::assertSentCount(1);
        Http::assertSent(function (Request $req) {
            $this->assertSame('Bearer TOKEN123', $req->header('Authorization')[0] ?? null);
            $this->assertArrayNotHasKey('auth', $req->data()); // Bearer 모드는 body에 auth 없음
            return true;
        });
    }

    /** Zabbix ≤6.0 — Bearer 1차가 인증 오류 → legacy auth(body)로 폴백 성공. */
    public function test_falls_back_to_legacy_auth_on_auth_error(): void
    {
        Http::fake([
            self::URL => Http::sequence()
                ->push(['jsonrpc' => '2.0', 'error' => ['code' => -32602, 'message' => 'Invalid params.', 'data' => 'Not authorised.'], 'id' => 1])
                ->push(['jsonrpc' => '2.0', 'result' => [['hostid' => '9']], 'id' => 2]),
        ]);

        $res = $this->client()->call('host.get', []);

        $this->assertSame([['hostid' => '9']], $res['result']);
        Http::assertSentCount(2);

        // 두 번째(폴백) 요청은 body에 auth 포함
        $sent = [];
        Http::assertSent(function (Request $req) use (&$sent) {
            $sent[] = $req->data();
            return true;
        });
        $this->assertArrayNotHasKey('auth', $sent[0]);          // 1차 Bearer
        $this->assertSame('TOKEN123', $sent[1]['auth'] ?? null); // 2차 legacy
    }

    /** 인증과 무관한 JSON-RPC 오류는 폴백하지 않고 정규화해 반환. */
    public function test_non_auth_error_does_not_trigger_fallback(): void
    {
        Http::fake([self::URL => Http::response(['jsonrpc' => '2.0', 'error' => ['code' => -32500, 'message' => 'Application error.', 'data' => 'Something broke'], 'id' => 1])]);

        $res = $this->client()->call('host.get', []);

        Http::assertSentCount(1); // 폴백 없음
        $this->assertSame(-32500, $res['error']['code']);
        $this->assertStringContainsString('Something broke', $res['error']['message']);
    }

    /** 두 시도 모두 인증 오류면 AUTH_EXPIRED로 정규화. */
    public function test_both_attempts_auth_error_returns_auth_expired(): void
    {
        Http::fake([
            self::URL => Http::sequence()
                ->push(['error' => ['code' => -32602, 'data' => 'session terminated']])
                ->push(['error' => ['code' => -32602, 'data' => 're-login']]),
        ]);

        $res = $this->client()->call('host.get', []);

        Http::assertSentCount(2);
        $this->assertSame('AUTH_EXPIRED', $res['error']['code']);
    }

    /** 연결 실패 → NETWORK_OR_CORS_ERROR (폴백 안 함). */
    public function test_connection_failure_is_normalized(): void
    {
        Http::fake(fn () => throw new \Illuminate\Http\Client\ConnectionException('refused'));

        $res = $this->client()->call('host.get', []);

        $this->assertSame('NETWORK_OR_CORS_ERROR', $res['error']['code']);
    }

    /** HTTP 404 → HTTP_404. */
    public function test_http_404_is_normalized(): void
    {
        Http::fake([self::URL => Http::response('Not Found', 404)]);

        $res = $this->client()->call('host.get', []);

        $this->assertSame('HTTP_404', $res['error']['code']);
    }

    /** 빈 토큰 → NO_TOKEN, 호출 안 함. */
    public function test_empty_token_returns_no_token_error(): void
    {
        Http::fake();

        $res = $this->client('')->call('host.get', []);

        $this->assertSame('NO_TOKEN', $res['error']['code']);
        Http::assertNothingSent();
    }
}
