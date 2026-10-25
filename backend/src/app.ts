import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import dailyLogRouter from './routes/dailyLog.js'
import analyticsRouter from './routes/analytics.js'
import goalsRouter from './routes/goals.js'
import challengeRouter from './routes/challenge.js'
import checkinsRouter from './routes/checkins.js'
import remindersRouter from './routes/reminders.js'
import insightsRouter from './routes/insights.js'
import experimentsRouter from './routes/experiments.js'
import authRouter from './routes/auth.js'
import { AuthenticationError, sessionContext } from './lib/authContext.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173', credentials: true }))
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.get('origin')
    const allowed = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
    if (origin && origin !== allowed) return response.status(403).json({ message: 'Request origin is not allowed.' })
  }
  next()
})
app.use(cookieParser())
app.use(express.json())
app.use((request, response, next) => {
  const started = performance.now()
  response.on('finish', () => {
    console.info(JSON.stringify({ event: 'request', method: request.method, path: request.path, status: response.statusCode, durationMs: Math.round(performance.now() - started) }))
  })
  next()
})
app.use(sessionContext)

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    frontendOrigin: process.env.FRONTEND_ORIGIN
  })
})
app.use('/api', authRouter)
app.use('/api', dailyLogRouter)
app.use('/api', analyticsRouter)
app.use('/api', goalsRouter)
app.use('/api', challengeRouter)
app.use('/api', checkinsRouter)
app.use('/api', remindersRouter)
app.use('/api', insightsRouter)
app.use('/api', experimentsRouter)

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof AuthenticationError) return response.status(401).json({ message: error.message })
  console.error(error)
  response.status(500).json({ message: 'Unable to complete that request. Please try again.' })
})

export default app
