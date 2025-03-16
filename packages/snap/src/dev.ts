// packages/snap/src/dev.ts
import { createServer, createStepHandlers, createEventManager, globalLogger, createStateAdapter, loadConfig } from '@motiadev/core'
import { generateLockedData } from './generate-locked-data'
import path from 'path'
import { FileStateAdapter } from '@motiadev/core/dist/src/state/adapters/default-state-adapter'
import { createDevWatchers } from './dev-watchers'
import { stateEndpoints } from './dev/state-endpoints'

// Plugins will be auto-discovered by the plugin manager

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' },
})

export const dev = async (port: number, isVerbose: boolean): Promise<void> => {
  const baseDir = process.cwd()
  const lockedData = await generateLockedData(baseDir)
  const eventManager = createEventManager()
  const state = createStateAdapter({
    adapter: 'default',
    filePath: path.join(baseDir, '.motia'),
  })
  await (state as FileStateAdapter).init()

  // Load configuration from config.yml or config.json
  const motiaConfig = loadConfig(baseDir)
  
  const config = { isVerbose }
  const motiaServer = await createServer(lockedData, eventManager, state, config, motiaConfig)
  
  // Plugins are auto-discovered by the plugin manager
  const motiaEventManager = createStepHandlers(lockedData, eventManager, state)
  const watcher = createDevWatchers(lockedData, motiaServer, motiaEventManager, motiaServer.cronManager)

  watcher.init()

  stateEndpoints(motiaServer, state)
  motiaServer.server.listen(port)
  console.log('🚀 Server ready and listening on port', port)
  console.log(`🔗 Open http://localhost:${port}/ to open workbench 🛠️`)

  const { applyMiddleware } = process.env.__MOTIA_DEV_MODE__
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@motiadev/workbench/middleware')
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@motiadev/workbench/dist/middleware')
  await applyMiddleware(motiaServer.app)

  // 6) Gracefully shut down on SIGTERM
  process.on('SIGTERM', async () => {
    globalLogger.info('🛑 Shutting down...')
    motiaServer.server.close()
    await watcher.stop()
    process.exit(0)
  })
}
