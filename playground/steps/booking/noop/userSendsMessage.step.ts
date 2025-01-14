import { NoopConfig } from 'wistro'

export const config: NoopConfig = {
  type: 'noop',
  name: 'User Sends Message',
  virtualEmits: ['/api/dbz/search-upgrades'],
  virtualSubscribes: ['dbz.message-sent'],
  flows: ['booking'],
}
