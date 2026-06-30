<?php

return [
    // Zabbix api_jsonrpc.php 전체 URL
    'url' => env('ZABBIX_API_URL', ''),

    // (선택) 서버 보관 API 토큰. 비우면 요청별 토큰 전달 모드.
    'token' => env('ZABBIX_API_TOKEN', ''),

    // 클라이언트(UI)가 보낸 대상 URL을 허용할지. false면 항상 config('zabbix.url') 사용.
    'allow_request_url' => env('ZABBIX_ALLOW_REQUEST_URL', true),

    // 프록시 허용 JSON-RPC 메서드 화이트리스트
    'allowed_methods' => [
        'host.get',
        'problem.get',
        'trigger.get',
        'item.get',
        'history.get',
    ],

    // 요청 타임아웃(초)
    'timeout' => env('ZABBIX_API_TIMEOUT', 30),
];
