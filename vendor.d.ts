declare namespace NodeJS {
  interface ProcessEnv {
    BOT_TOKEN: string

    DATABASE_URL: string

    REDIS_HOST: string
    REDIS_PORT: string
    REDIS_PASSWORD: string

    INFLUX_HOST: string
    INFLUX_TOKEN: string
    INFLUX_ORG: string
    INFLUX_BUCKET: string

    /**
     * Only true if the content of this === 'true'
     */
    ENGLISH_SERVER?: 'true' | string
  }
}
