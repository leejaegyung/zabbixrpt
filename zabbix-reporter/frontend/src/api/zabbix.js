// Zabbix API 호출 래퍼 — 기존 callZabbixApi를 대체.
// 클라이언트는 인증 방식(Bearer/legacy)을 모른다. Laravel 프록시(/api/zabbix)가 버전 자동감지·인증을 처리한다.

const PROXY_URL = '/api/zabbix'

export class ZabbixApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ZabbixApiError'
    this.code = code
  }
}

/**
 * Zabbix JSON-RPC 메서드를 프록시 경유로 호출한다.
 * @param {string} method  예: 'host.get'
 * @param {object} params  JSON-RPC params
 * @param {{url?: string, token?: string}} conn  대상 Zabbix URL과 토큰(요청별 전달)
 * @returns {Promise<any>} 정규화된 result
 * @throws {ZabbixApiError} 정규화된 에러(code/message)
 */
export async function callZabbixApi(method, params = {}, conn = {}) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (conn.token) headers.Authorization = `Bearer ${conn.token}`

  const body = { method, params }
  if (conn.url) body.url = conn.url

  let response
  try {
    response = await fetch(PROXY_URL, { method: 'POST', headers, body: JSON.stringify(body) })
  } catch (e) {
    throw new ZabbixApiError('NETWORK_OR_CORS_ERROR', '프록시 서버에 연결할 수 없습니다.')
  }

  let payload
  try {
    payload = await response.json()
  } catch (e) {
    throw new ZabbixApiError('NOT_JSON', '서버 응답을 해석할 수 없습니다.')
  }

  if (!response.ok || payload.error) {
    const err = payload.error || {}
    throw new ZabbixApiError(err.code || `HTTP_${response.status}`, err.message || '요청 실패')
  }

  return payload.result
}
