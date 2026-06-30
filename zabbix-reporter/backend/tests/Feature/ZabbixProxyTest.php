<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ZabbixProxyTest extends TestCase
{
    private const URL = 'http://zabbix.test/api_jsonrpc.php';

    protected function setUp(): void
    {
        parent::setUp();
        config(['zabbix.url' => self::URL, 'zabbix.token' => 'SERVERTOKEN']);
    }

    public function test_health_endpoint(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson(['app' => 'zabbix-reporter', 'status' => 'ok']);
    }

    public function test_method_must_be_whitelisted(): void
    {
        $this->postJson('/api/zabbix', ['method' => 'user.login', 'params' => []])
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'METHOD_NOT_ALLOWED');
    }

    public function test_missing_method_fails_validation(): void
    {
        $this->postJson('/api/zabbix', ['params' => []])->assertStatus(422);
    }

    public function test_proxies_whitelisted_method_with_server_token(): void
    {
        Http::fake([self::URL => Http::response(['jsonrpc' => '2.0', 'result' => ['ok'], 'id' => 1])]);

        $this->postJson('/api/zabbix', ['method' => 'host.get', 'params' => ['output' => 'extend']])
            ->assertOk()
            ->assertJson(['result' => ['ok']]);

        // 클라이언트가 토큰을 보내지 않았으므로 서버 보관 토큰 사용
        Http::assertSent(fn (Request $req) => ($req->header('Authorization')[0] ?? null) === 'Bearer SERVERTOKEN');
    }

    public function test_returns_error_when_url_not_configured(): void
    {
        config(['zabbix.url' => '']);

        $this->postJson('/api/zabbix', ['method' => 'host.get', 'params' => []])
            ->assertStatus(500)
            ->assertJsonPath('error.code', 'NOT_CONFIGURED');
    }

    public function test_request_url_targets_that_zabbix_server(): void
    {
        $other = 'http://other-zabbix.test/api_jsonrpc.php';
        Http::fake([$other => Http::response(['result' => ['ok'], 'id' => 1])]);

        $this->postJson('/api/zabbix', ['method' => 'host.get', 'params' => [], 'url' => $other])
            ->assertOk()
            ->assertJson(['result' => ['ok']]);

        Http::assertSent(fn (Request $req) => $req->url() === $other);
    }

    public function test_request_bearer_token_overrides_server_token(): void
    {
        Http::fake([self::URL => Http::response(['result' => ['ok'], 'id' => 1])]);

        $this->withHeaders(['Authorization' => 'Bearer USERTOKEN'])
            ->postJson('/api/zabbix', ['method' => 'item.get', 'params' => []])
            ->assertOk();

        Http::assertSent(fn (Request $req) => ($req->header('Authorization')[0] ?? null) === 'Bearer USERTOKEN');
    }
}
