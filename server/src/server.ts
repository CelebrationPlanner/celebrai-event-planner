import { createApp } from './app.ts'
import { loadEnv } from './config/env.ts'

const env = loadEnv()

createApp(env).listen(env.PORT, () => {
  console.log(`CelebrAI API listening on port ${env.PORT}`)
})
