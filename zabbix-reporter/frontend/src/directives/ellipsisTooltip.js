// 잘린(말줄임) 텍스트에만 마우스 오버 시 즉시 뜨는 커스텀 툴팁.
// 네이티브 title은 지연/스타일 불가라, 실제 오버플로우가 있을 때만 동작하도록 처리한다.
//
// 사용:  <span class="truncate" v-ellipsis-tooltip>{{ text }}</span>
//        <span class="truncate" v-ellipsis-tooltip="fullText">{{ short }}</span>  // 표시 텍스트를 명시

let tipEl = null

const hideTip = () => {
  if (tipEl) {
    tipEl.remove()
    tipEl = null
  }
}

const isOverflowing = (el) => el.scrollWidth > el.clientWidth + 1

const showTip = (el, text) => {
  if (!text || !isOverflowing(el)) return
  hideTip()

  tipEl = document.createElement('div')
  tipEl.textContent = text
  Object.assign(tipEl.style, {
    position: 'fixed',
    zIndex: '9999',
    maxWidth: '360px',
    padding: '6px 10px',
    borderRadius: '6px',
    background: 'rgba(17, 17, 17, 0.96)',
    color: '#fff',
    fontSize: '12px',
    lineHeight: '1.4',
    fontWeight: '500',
    whiteSpace: 'normal',
    wordBreak: 'break-all',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 80ms ease-out',
  })
  document.body.appendChild(tipEl)

  const rect = el.getBoundingClientRect()
  const tipRect = tipEl.getBoundingClientRect()
  // 대상 위쪽 가운데 정렬, 화면 밖으로 나가지 않게 보정.
  let left = rect.left + rect.width / 2 - tipRect.width / 2
  left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8))
  let top = rect.top - tipRect.height - 8
  if (top < 8) top = rect.bottom + 8 // 위 공간 부족 시 아래로

  tipEl.style.left = `${left}px`
  tipEl.style.top = `${top}px`
  requestAnimationFrame(() => {
    if (tipEl) tipEl.style.opacity = '1'
  })
}

export const ellipsisTooltip = {
  mounted(el, binding) {
    el._ellipsisTip = {
      enter: () => showTip(el, binding.value || el.textContent.trim()),
      leave: hideTip,
    }
    el.addEventListener('mouseenter', el._ellipsisTip.enter)
    el.addEventListener('mouseleave', el._ellipsisTip.leave)
  },
  updated(el, binding) {
    // 바인딩 값이 바뀌면 다음 hover에서 최신 텍스트를 쓰도록 핸들러 갱신.
    if (el._ellipsisTip) {
      el.removeEventListener('mouseenter', el._ellipsisTip.enter)
      el._ellipsisTip.enter = () => showTip(el, binding.value || el.textContent.trim())
      el.addEventListener('mouseenter', el._ellipsisTip.enter)
    }
  },
  unmounted(el) {
    if (el._ellipsisTip) {
      el.removeEventListener('mouseenter', el._ellipsisTip.enter)
      el.removeEventListener('mouseleave', el._ellipsisTip.leave)
      delete el._ellipsisTip
    }
    hideTip()
  },
}
