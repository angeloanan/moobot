import { InfluxDB } from '@influxdata/influxdb-client'

const influxHost = process.env.INFLUX_HOST || 'localhost'
const influxToken = process.env.INFLUX_TOKEN
const influxOrg = process.env.INFLUX_ORG || 'default'
const influxBucket = process.env.INFLUX_BUCKET || 'default'

const influx = new InfluxDB({
  url: influxHost,
  token: influxToken
})

export const InfluxWriteAPI = influx.getWriteApi(influxOrg, influxBucket, 'ms')
export const InfluxMetricsWriteAPI = influx.getWriteApi(influxOrg, 'metrics')
export const InfluxQueryAPI = influx.getQueryApi(influxOrg)
