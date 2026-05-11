import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

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

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`)
  })
}

export default app
