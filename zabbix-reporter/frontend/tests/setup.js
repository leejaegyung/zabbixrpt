// 테스트 전역 설정: 앱에서 전역 등록하는 커스텀 디렉티브를 test-utils에도 등록해
// "Failed to resolve directive" 경고를 없앤다. (jsdom 없이도 마운트만 통과하면 됨)
import { config } from '@vue/test-utils'
import { ellipsisTooltip } from '../src/directives/ellipsisTooltip.js'

config.global.directives = {
  ...config.global.directives,
  'ellipsis-tooltip': ellipsisTooltip,
}
