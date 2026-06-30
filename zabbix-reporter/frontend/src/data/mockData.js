// 테스트용 가상 데이터 — 기존 zabbix.html의 loadMockData 생성 로직 1:1 이전.

const genHistory = (base, variance, trend = 0, count = 30) => {
  const arr = []
  const now = Math.floor(Date.now() / 1000)
  for (let i = count; i >= 0; i--)
    arr.push({ clock: now - i * 86400, value: base + (Math.random() * variance - variance / 2) + (count - i) * trend })
  return arr
}

export const buildMockHosts = () => [
  { hostid: '1', name: 'Zabbix Server', host: 'Zabbix server', status: '0', available: '1', hostgroups: [{ name: 'Zabbix servers' }], interfaces: [{ ip: '127.0.0.1', type: '1', available: '1' }] },
  { hostid: '2', name: 'Web Server 01', host: 'web-prod-01', status: '0', available: '1', hostgroups: [{ name: 'Linux servers' }, { name: 'Web' }], interfaces: [{ ip: '192.168.1.10', type: '1', available: '1' }] },
  { hostid: '3', name: 'WORKSTATION', host: 'workstation-01', status: '0', available: '2', hostgroups: [{ name: 'Windows servers' }], interfaces: [{ ip: '192.168.1.120', type: '1', available: '2', error: 'Agent timeout' }] },
  { hostid: '4', name: 'DB Server 01', host: 'db-prod-01', status: '0', available: '1', hostgroups: [{ name: 'Database' }], interfaces: [{ ip: '10.0.0.5', type: '1', available: '1' }] },
  ...Array.from({ length: 12 }).map((_, i) => ({ hostid: `10${i}`, name: `Dummy Host ${i}`, host: `dummy-${i}`, status: '0', available: '1', hostgroups: [{ name: 'Dummy Group' }], interfaces: [{ ip: `10.0.0.${i}`, type: '1', available: '1' }] })),
]

export const buildMockProblems = () => [
  { eventid: '1', name: 'High CPU utilization (over 90% for 5m)', severity: '4', clock: Math.floor(Date.now() / 1000) - 3600, hosts: [{ name: 'Web Server 01' }], groups: [{ name: 'Linux servers' }] },
  { eventid: '2', name: 'Service is down', severity: '5', clock: Math.floor(Date.now() / 1000) - 1800, hosts: [{ name: 'DB Server 01' }], groups: [{ name: 'DB' }] },
  { eventid: '3', name: 'Zabbix agent not reachable', severity: '3', clock: Math.floor(Date.now() / 1000) - 7200, hosts: [{ name: 'WORKSTATION' }], groups: [{ name: 'Windows servers' }] },
  { eventid: '4', name: 'Disk space is critically low', severity: '4', clock: Math.floor(Date.now() / 1000) - 86000, hosts: [{ name: 'Web Server 01' }], groups: [{ name: 'Linux servers' }] },
  { eventid: '5', name: 'High memory utilization', severity: '3', clock: Math.floor(Date.now() / 1000) - 10000, hosts: [{ name: 'DB Server 01' }], groups: [{ name: 'DB' }] },
  ...Array.from({ length: 10 }).map((_, i) => ({ eventid: `20${i}`, name: `Minor issue ${i}`, severity: '2', clock: Math.floor(Date.now() / 1000) - 20000, hosts: [{ name: `Dummy Host ${i}` }], groups: [{ name: 'Dummy Group' }] })),
]

export const buildMockItems = () => [
  { itemid: '101', hosts: [{ name: 'Web Server 01' }], name: 'CPU utilization', lastvalue: '85.4', units: '%', lastclock: Math.floor(Date.now() / 1000), isMock: true, history: genHistory(40, 10, 1.5) },
  { itemid: '1012', hosts: [{ name: 'DB Server 01' }], name: 'CPU utilization', lastvalue: '92.1', units: '%', lastclock: Math.floor(Date.now() / 1000), isMock: true, history: genHistory(90, 5) },
  { itemid: '102', hosts: [{ name: 'Web Server 01' }], name: 'Memory Usage', lastvalue: '65.2', units: '%', lastclock: Math.floor(Date.now() / 1000), isMock: true, history: genHistory(65, 5) },
  { itemid: '1022', hosts: [{ name: 'DB Server 01' }], name: 'Memory utilization', lastvalue: '89.5', units: '%', lastclock: Math.floor(Date.now() / 1000), isMock: true, history: genHistory(89, 2) },
  { itemid: '105', hosts: [{ name: 'File Server' }], name: '/data: Space utilization', lastvalue: '76.5', units: '%', lastclock: Math.floor(Date.now() / 1000), isMock: true, history: genHistory(60, 1, 0.55) },
  { itemid: '106', hosts: [{ name: 'Web Server 01' }], name: '/: Space utilization', lastvalue: '42.1', units: '%', lastclock: Math.floor(Date.now() / 1000), isMock: true, history: genHistory(42, 2, 0) },
  { itemid: '108', hosts: [{ name: 'Web Server 01' }], name: 'Interface eth0: Bits received', lastvalue: '12428800', units: 'bps', lastclock: Math.floor(Date.now() / 1000), isMock: true, history: genHistory(10000000, 2000000) },
  { itemid: '109', hosts: [{ name: 'DB Server 01' }], name: 'Interface eth1: Bits sent', lastvalue: '804857600', units: 'bps', lastclock: Math.floor(Date.now() / 1000), isMock: true, history: genHistory(800000000, 50000000) },
  ...Array.from({ length: 5 }).map((_, i) => ({ itemid: `30${i}`, hosts: [{ name: 'Dummy Server' }], name: `Metric ${i}`, lastvalue: '50', units: '%', lastclock: Math.floor(Date.now() / 1000), isMock: true, history: [] })),
]
