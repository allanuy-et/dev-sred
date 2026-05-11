import express, { type NextFunction, type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import authRouter from './routes/auth.js'
import labourRouter from './routes/labour.js'
import dashboardRouter from './routes/dashboard.js'
import employeesRouter from './routes/employees.js'
import projectsRouter from './routes/projects.js'
import expensesRouter from './routes/expenses.js'
import searchRouter from './routes/search.js'
import reportsRouter from './routes/reports.js'
import aiRouter from './routes/ai.js'
import preferencesRouter from './routes/preferences.js'

const app = express()
const PORT = Number(process.env.PORT ?? 4000)

app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())
app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  })
)

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() })
})

app.use('/auth', authRouter)
app.use('/labour', labourRouter)
app.use('/dashboard', dashboardRouter)
app.use('/employees', employeesRouter)
app.use('/projects', projectsRouter)
app.use('/expenses', expensesRouter)
app.use('/search', searchRouter)
app.use('/reports', reportsRouter)
app.use('/ai', aiRouter)
app.use('/preferences', preferencesRouter)

// Central error handler — keeps individual handlers thin. Logs server-side,
// returns a generic 500 to clients so we don't leak internals.
// Note: Express identifies error-handling middleware by the 4-argument
// signature, so `_req` and `_next` are load-bearing even though we don't use
// them. Renaming with leading underscores marks them as intentionally unused.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api] unhandled error:', err)
  if (res.headersSent) return
  res.status(500).json({ error: 'Internal server error' })
})

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`)
  })
}

export default app
