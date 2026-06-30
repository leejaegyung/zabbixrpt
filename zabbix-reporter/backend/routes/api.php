<?php

use App\Http\Controllers\ZabbixProxyController;
use Illuminate\Support\Facades\Route;

// 스캐폴드 헬스 체크 (Phase 0 배선 검증)
Route::get('/health', fn () => response()->json([
    'app' => 'zabbix-reporter',
    'status' => 'ok',
]));

// Zabbix JSON-RPC 프록시 (실제 인증 폴백 로직은 Phase 1에서 구현)
Route::post('/zabbix', [ZabbixProxyController::class, 'handle']);
