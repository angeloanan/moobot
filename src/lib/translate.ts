const PROJECT_ID = 'moobot-357812'

// Imports the Google Cloud client library
import { v2 } from '@google-cloud/translate'
const { Translate } = v2

// Instantiates a client
export const TranslateClient = new Translate({ projectId: PROJECT_ID })
