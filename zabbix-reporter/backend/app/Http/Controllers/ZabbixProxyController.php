<?php

namespace App\Http\Controllers;

use App\Services\ZabbixClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZabbixProxyController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'method' => ['required', 'string'],
            'params' => ['sometimes', 'array'],
            'url' => ['sometimes', 'string', 'url'],
        ]);

        $method = $validated['method'];
        $params = $validated['params'] ?? [];

        // 메서드 화이트리스트 검증
        if (! in_array($method, config('zabbix.allowed_methods'), true)) {
            return response()->json([
                'error' => ['code' => 'METHOD_NOT_ALLOWED', 'message' => "허용되지 않은 메서드: {$method}"],
            ], 403);
        }

        // 대상 Zabbix URL: 요청값(운영자가 UI에서 입력) 우선, 없으면 서버 설정.
        // 운영자 본인이 배포·접속하는 도구 특성상 요청 URL을 허용하되, 비허용 시 config로 강제.
        $targetUrl = config('zabbix.allow_request_url')
            ? ($validated['url'] ?? config('zabbix.url'))
            : config('zabbix.url');

        if (! $targetUrl) {
            return response()->json([
                'error' => ['code' => 'NOT_CONFIGURED', 'message' => 'Zabbix API URL이 설정되지 않았습니다.'],
            ], 500);
        }

        $client = new ZabbixClient(
            url: $targetUrl,
            token: config('zabbix.token'),
            timeout: (int) config('zabbix.timeout'),
        );

        // 요청별 토큰(헤더) 우선, 없으면 서버 보관 토큰.
        $result = $client->call($method, $params, $request->bearerToken());

        return response()->json($result);
    }
}
