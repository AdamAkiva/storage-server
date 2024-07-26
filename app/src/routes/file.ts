import { uploadFile, uploadSecureFile } from '../controllers/index.js';
import { Router } from '../utils/index.js';

/**********************************************************************************/

export default Router().post('/', uploadFile).post('/secure', uploadSecureFile);
