import { applyMiddleware } from '@wistro/ui'
import { Server as SocketIOServer } from 'socket.io'
import bodyParser from 'body-parser'
import { randomUUID } from 'crypto'
import express, { Request, Response } from 'express'
import http from 'http'
import { Config, WorkflowStep } from './config.types'
import { Event, EventManager } from './event-manager'
import { workflowsEndpoint } from './workflows-endpoint'

export const createServer = async (config: Config, workflowSteps: WorkflowStep[], eventManager: EventManager) => {
  const app = express()
  const server = http.createServer(app)
  const io = new SocketIOServer(server)

  console.log('[API] Registering routes', config.api.paths)

  const asyncHandler = (emits: string) => {
    return async (req: Request, res: Response) => {
      const traceId = randomUUID()
      const event: Event<unknown> = {
        traceId,
        type: emits,
        data: req.body,
      }

      console.log('[API] Request received', event)

      try {
        await eventManager.emit(event)
        res.send({ success: true, eventType: emits, traceId })
      } catch (error) {
        console.error('[API] Error emitting event', error)
        res.status(500).send({ error: 'Internal server error' })
      }
    }
  }

  app.use(bodyParser.json())

  for (const path in config.api.paths) {
    const { method, emits } = config.api.paths[path]

    console.log('[API] Registering route', { method, path, emits })

    if (method === 'POST') {
      app.post(path, asyncHandler(emits))
    } else if (method === 'GET') {
      app.get(path, asyncHandler(emits))
    } else {
      throw new Error(`Unsupported method: ${method}`)
    }
  }

  workflowsEndpoint(config, workflowSteps, app)
  await applyMiddleware(app)

  console.log('[API] Server listening on port', config.port)

  server.listen(config.port)

  return { server, socketServer: io }
}
