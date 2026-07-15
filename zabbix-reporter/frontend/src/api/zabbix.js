const PROXY_URL = '/api/zabbix'

export class ZabbixApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ZabbixApiError'
    this.code = code
  }
}

const validationMessage = (payload) => {
  if (!payload?.errors) return ''

  return Object.values(payload.errors)
    .flat()
    .filter(Boolean)
    .join('\n')
}

// URL·토큰은 서버 프록시가 .env 설정으로 처리하므로 요청 본문/헤더에 싣지 않는다.
export async function callZabbixApi(method, params = {}) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const body = { method, params }

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
    throw new ZabbixApiError('NOT_JSON', '서버 응답을 JSON으로 해석할 수 없습니다.')
  }

  if (!response.ok || payload.error) {
    const err = payload.error || {}
    const message = err.message || validationMessage(payload) || payload.message || '요청 실패'

    throw new ZabbixApiError(err.code || `HTTP_${response.status}`, message)
  }

  return payload.result
}
