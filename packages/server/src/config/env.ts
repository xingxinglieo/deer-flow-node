import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
config({ path: [path.resolve(__filename, '../../../.env'), path.resolve(__filename, '../../../../../.env')] });